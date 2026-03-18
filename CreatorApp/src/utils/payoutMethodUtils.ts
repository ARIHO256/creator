import React from "react";
import type { PayoutMethodRecord } from "../lib/creatorApi";

export type PayoutMethodType = "bank" | "mobile" | "wallet";

export interface PayoutMethodDisplay {
  name: string;
  detail: string;
  icon: string;
}

const STORAGE_KEY_METHOD = "evzone_payout_method";
const STORAGE_KEY_DETAILS = "evzone_payout_details";

function safeGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function normalizePayoutMethodType(value?: string | null): PayoutMethodType {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("mobile")) return "mobile";
  if (
    normalized.includes("wallet") ||
    normalized.includes("paypal") ||
    normalized.includes("provider")
  ) {
    return "wallet";
  }
  return "bank";
}

export function getPayoutMethod(): PayoutMethodType {
  const method = safeGet(STORAGE_KEY_METHOD) as PayoutMethodType | null;
  return method || "bank";
}

export function getPayoutDetails(): string {
  return safeGet(STORAGE_KEY_DETAILS) || "Standard Chartered **** 6789";
}

export function buildPayoutMethodDisplay(method: PayoutMethodType, details: string): PayoutMethodDisplay {
  return {
    name:
      method === "mobile"
        ? "Mobile Money"
        : method === "wallet"
          ? "PayPal / Others"
          : "Bank Account",
    detail: details,
    icon: method === "mobile" ? "📱" : method === "wallet" ? "💳" : "🏦"
  };
}

export function getPayoutMethodDisplay(): PayoutMethodDisplay {
  return buildPayoutMethodDisplay(getPayoutMethod(), getPayoutDetails());
}

export function getPayoutMethodDisplayFromApi(record?: PayoutMethodRecord | null): PayoutMethodDisplay {
  if (!record) {
    return getPayoutMethodDisplay();
  }

  const method = normalizePayoutMethodType(record.type || record.kind);
  const detail =
    record.label ||
    record.masked ||
    String((record.details as { masked?: string } | undefined)?.masked || "") ||
    getPayoutDetails();

  return buildPayoutMethodDisplay(method, detail);
}

export function buildPayoutMethodsPayload(method: PayoutMethodType, details: string) {
  return {
    methods: [
      {
        id: `creator-${method}`,
        type: method === "bank" ? "bank" : method === "mobile" ? "mobile_money" : "wallet",
        kind: method === "bank" ? "bank" : "provider",
        provider:
          method === "bank" ? "Bank" : method === "mobile" ? "Mobile Money" : "Digital Wallet",
        label: details,
        currency: "USD",
        status: "Pending verification",
        isDefault: true,
        details: {
          masked: details
        }
      }
    ]
  };
}

export function savePayoutMethod(method: PayoutMethodType, details: string): void {
  safeSet(STORAGE_KEY_METHOD, method);
  safeSet(STORAGE_KEY_DETAILS, details);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("payoutMethodChanged", {
        detail: { method, details }
      })
    );
  }
}

export function usePayoutMethod(callback?: () => void): PayoutMethodDisplay {
  const [display, setDisplay] = React.useState<PayoutMethodDisplay>(getPayoutMethodDisplay());

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleChange = () => {
      setDisplay(getPayoutMethodDisplay());
      callback?.();
    };

    window.addEventListener("payoutMethodChanged", handleChange);
    window.addEventListener("storage", handleChange);

    return () => {
      window.removeEventListener("payoutMethodChanged", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [callback]);

  return display;
}
