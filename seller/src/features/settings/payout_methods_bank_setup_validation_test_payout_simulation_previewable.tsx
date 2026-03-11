import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Banknote,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Lock,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Payout Methods (Previewable)
 * Route: /settings/payout-methods
 * Core:
 * - Bank and payout setup
 * Super premium:
 * - Validation checks
 * - Test payout simulation
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type MethodKind = "bank" | "provider";
type PayoutMethod = {
  id: string;
  kind: MethodKind;
  provider: string;
  label: string;
  country: string;
  currency: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  masked: string;
};
type KycState = "Verified" | "Pending" | "Not started";
type PayoutSchedule = "Daily" | "Weekly" | "Manual";
type MethodsTab = "All" | "Bank" | "Provider";
type ValidationStatus = "Pass" | "Warn" | "Fail";
type ValidationCheck = { key: string; label: string; status: ValidationStatus; detail: string };
type TestRunStatus = "Queued" | "Processing" | "Completed";
type TestRunLog = { at: string; text: string };
type TestRun = {
  id: string;
  createdAt: string;
  mode: "Sandbox" | "Live";
  status: TestRunStatus;
  currency: string;
  amount: number;
  methodLabel: string;
  log: TestRunLog[];
};
type AddForm = {
  holderName: string;
  country: string;
  currency: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  routingNumber: string;
  provider: string;
  email: string;
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(amount: number | string, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "orange" | "danger" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }) {
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-xl border px-2 py-1 text-[11px] font-extrabold transition",
        active ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function buildMethods(): PayoutMethod[] {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "PM-1103",
      kind: "provider",
      provider: "Payoneer",
      label: "Payoneer (USD)",
      country: "US",
      currency: "USD",
      status: "Verified",
      isDefault: true,
      createdAt: ago(780),
      lastUsedAt: ago(64),
      masked: "payout@payoneer",
    },
    {
      id: "PM-1102",
      kind: "bank",
      provider: "Bank",
      label: "Stanbic Bank (UGX)",
      country: "UG",
      currency: "UGX",
      status: "Pending verification",
      isDefault: false,
      createdAt: ago(260),
      lastUsedAt: null,
      masked: "**** 0821",
    },
    {
      id: "PM-1101",
      kind: "bank",
      provider: "Bank",
      label: "Bank of China (CNY)",
      country: "CN",
      currency: "CNY",
      status: "Verified",
      isDefault: false,
      createdAt: ago(2200),
      lastUsedAt: ago(980),
      masked: "**** 4490",
    },
  ];
}

function statusTone(status: string) {
  const s = String(status || "").toLowerCase();
  if (s.includes("verified")) return "green";
  if (s.includes("pending")) return "orange";
  if (s.includes("needs") || s.includes("failed")) return "danger";
  return "slate";
}

function methodIcon(kind: MethodKind) {
  if (kind === "bank") return Banknote;
  return CreditCard;
}

function normalizeCountry(v) {
  return String(v || "").toUpperCase().slice(0, 2);
}

function validateBankForm(form: AddForm) {
  const issues: string[] = [];
  const country = normalizeCountry(form.country);

  if (!form.holderName?.trim()) issues.push("Account holder name is required.");
  if (!country) issues.push("Country is required.");
  if (!form.currency) issues.push("Currency is required.");
  if (!form.bankName?.trim()) issues.push("Bank name is required.");

  const acct = String(form.accountNumber || "").replace(/\s+/g, "");
  if (!acct) issues.push("Account number is required.");

  // Lightweight pattern checks
  if (form.iban?.trim()) {
    const iban = form.iban.replace(/\s+/g, "");
    if (iban.length < 12) issues.push("IBAN looks too short.");
  }

  if (form.swift?.trim()) {
    const swift = form.swift.replace(/\s+/g, "");
    if (swift.length < 8) issues.push("SWIFT code looks too short.");
  }

  if (country === "US" && !String(form.routingNumber || "").trim()) {
    issues.push("Routing number is required for US banks.");
  }

  return issues;
}

function buildValidation(methods: PayoutMethod[], kycState: KycState, payoutSchedule: PayoutSchedule): ValidationCheck[] {
  const verified = methods.filter((m) => m.status === "Verified");
  const defaultMethod = methods.find((m) => m.isDefault);

  const checks: ValidationCheck[] = [];

  const add = (key: string, label: string, status: ValidationStatus, detail: string) => {
    checks.push({ key, label, status, detail });
  };

  add(
    "kyc",
    "KYC / KYB",
    kycState === "Verified" ? "Pass" : kycState === "Pending" ? "Warn" : "Fail",
    kycState === "Verified" ? "Identity verified" : kycState === "Pending" ? "Documents pending" : "KYC not started"
  );

  add(
    "default",
    "Default payout method",
    defaultMethod ? (defaultMethod.status === "Verified" ? "Pass" : "Warn") : "Fail",
    defaultMethod
      ? `${defaultMethod.label} is default`
      : "Set a default payout method"
  );

  add(
    "verified_methods",
    "Verified payout methods",
    verified.length >= 1 ? "Pass" : "Fail",
    verified.length >= 1 ? `${verified.length} verified method(s)` : "Add and verify at least one method"
  );

  add(
    "schedule",
    "Payout schedule",
    payoutSchedule === "Manual" ? "Warn" : "Pass",
    payoutSchedule === "Manual" ? "Manual payouts may delay settlements" : `Schedule: ${payoutSchedule}`
  );

  add(
    "format",
    "Format checks",
    methods.some((m) => String(m.status).toLowerCase().includes("needs")) ? "Warn" : "Pass",
    "Bank fields and provider tokens look consistent"
  );

  add(
    "security",
    "Security posture",
    "Warn",
    "Enable 2FA to protect payouts and contracts"
  );

  return checks;
}

function checkTone(status: ValidationStatus) {
  if (status === "Pass") return "green";
  if (status === "Warn") return "orange";
  return "danger";
}

export default function PayoutMethodsPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const hydratedRef = useRef(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getPayoutMethods();
        if (!active) return;
        const incoming = Array.isArray(payload.methods) ? payload.methods as Array<Record<string, unknown>> : [];
        setMethods(
          incoming.map((method) => ({
            id: String(method.id),
            kind: String(method.kind || method.type || "bank") === "provider" ? "provider" : "bank",
            provider: String(method.provider || method.bank || method.label || "Provider"),
            label: String(method.label || "Payout method"),
            country: String(method.country || "UG"),
            currency: String(method.currency || "USD"),
            status: String(method.status || "Verified"),
            isDefault: Boolean(method.isDefault),
            createdAt: String(method.createdAt || new Date().toISOString()),
            lastUsedAt: (method.lastUsedAt as string | null | undefined) ?? null,
            masked: String(method.masked || method.accountNumberMasked || method.details?.masked || "")
          }))
        );
        const metadata = (payload.metadata as Record<string, unknown> | undefined) ?? {};
        setKycState((metadata.kycState as KycState | undefined) ?? "Pending");
        setPayoutSchedule((metadata.payoutSchedule as PayoutSchedule | undefined) ?? "Weekly");
        setMinThreshold(Number(metadata.minThreshold ?? 50));
        hydratedRef.current = true;
      } catch {
        if (!active) return;
        pushToast({ title: "Payout methods unavailable", message: "Could not load payout methods.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  const defaultMethod = useMemo(() => methods.find((m) => m.isDefault) || null, [methods]);

  const [kycState, setKycState] = useState<KycState>("Pending");
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule>("Weekly");
  const [minThreshold, setMinThreshold] = useState(50);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void sellerBackendApi.patchPayoutMethods({
      methods: methods.map((method) => ({
        ...method,
        type: method.kind,
        details: { provider: method.provider, country: method.country, status: method.status, masked: method.masked, createdAt: method.createdAt, lastUsedAt: method.lastUsedAt }
      })),
      metadata: { kycState, payoutSchedule, minThreshold }
    });
  }, [methods, kycState, payoutSchedule, minThreshold]);

  const [tab, setTab] = useState<MethodsTab>("All");

  const visibleMethods = useMemo(() => {
    if (tab === "All") return methods;
    if (tab === "Bank") return methods.filter((m) => m.kind === "bank");
    return methods.filter((m) => m.kind === "provider");
  }, [methods, tab]);

  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<MethodKind>("bank");
  const [addStep, setAddStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AddForm>({
    holderName: "",
    country: "UG",
    currency: "UGX",
    bankName: "",
    accountNumber: "",
    iban: "",
    swift: "",
    routingNumber: "",
    provider: "Payoneer",
    email: "",
  });

  useEffect(() => {
    if (!addOpen) return;
    setAddStep(0);
  }, [addOpen]);

  const openAdd = (kind: MethodKind) => {
    setEditingId(null);
    setAddKind(kind);
    setAddForm((s) => ({
      ...s,
      country: kind === "bank" ? "UG" : "US",
      currency: kind === "bank" ? "UGX" : "USD",
    }));
    setAddOpen(true);
  };

  const openEdit = (m: PayoutMethod) => {
    setEditingId(m.id);
    setAddKind(m.kind);
    setAddForm({
      holderName: m.label.split(' (')[0] || "",
      country: m.country,
      currency: m.currency,
      bankName: m.kind === "bank" ? m.label.split(' (')[0] : "",
      accountNumber: "",
      iban: "",
      swift: "",
      routingNumber: "",
      provider: m.provider,
      email: m.kind === "provider" ? m.masked : "",
    });
    setAddOpen(true);
  };

  const removeMethod = (id) => {
    if (methods.find((m) => m.id === id)?.isDefault) {
      pushToast({
        title: "Cannot remove default",
        message: "Set another method as default first.",
        tone: "warning",
      });
      return;
    }
    setMethods((s) => s.filter((m) => m.id !== id));
    pushToast({ title: "Removed", message: "Payout method removed.", tone: "default" });
  };

  const setDefault = (id) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    const chosen = methods.find((m) => m.id === id);
    pushToast({ title: "Default updated", message: chosen ? chosen.label : "Default set", tone: "success" });
  };

  const submitAdd = () => {
    if (addKind === "bank") {
      const issues = validateBankForm(addForm);
      if (issues.length) {
        pushToast({
          title: "Fix required fields",
          message: issues[0],
          tone: "warning",
          action: { label: "See all", onClick: () => setAddStep(2) },
        });
        setAddStep(2);
        return;
      }

      const masked = addForm.accountNumber
        ? `**** ${String(addForm.accountNumber).replace(/\s+/g, "").slice(-4)}`
        : "****";
      const id = editingId || `PM-${Math.floor(1000 + Math.random() * 8999)}`;

      const newMethod: PayoutMethod = {
        id,
        kind: "bank",
        provider: "Bank",
        label: `${addForm.bankName || "Bank"} (${addForm.currency})`,
        country: normalizeCountry(addForm.country),
        currency: addForm.currency,
        status: editingId ? (methods.find(x => x.id === id)?.status || "Pending verification") : "Pending verification",
        isDefault: editingId ? (methods.find(x => x.id === id)?.isDefault || false) : false,
        createdAt: editingId ? (methods.find(x => x.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        lastUsedAt: editingId ? (methods.find(x => x.id === id)?.lastUsedAt || null) : null,
        masked,
      };

      setMethods((s) => editingId ? s.map((m) => (m.id === editingId ? newMethod : m)) : [newMethod, ...s]);

      setAddOpen(false);
      pushToast({ title: editingId ? "Bank updated" : "Bank added", message: editingId ? "Details saved successfully." : "Verification will run shortly.", tone: "success" });
      return;
    }

    // provider
    if (!String(addForm.email || "").trim()) {
      pushToast({ title: "Email required", message: "Enter a payout email.", tone: "warning" });
      return;
    }

    const id = editingId || `PM-${Math.floor(1000 + Math.random() * 8999)}`;
    const newMethod: PayoutMethod = {
      id,
      kind: "provider",
      provider: addForm.provider || "Provider",
      label: `${addForm.provider || "Provider"} (${addForm.currency || "USD"})`,
      country: normalizeCountry(addForm.country),
      currency: addForm.currency || "USD",
      status: editingId ? (methods.find(x => x.id === id)?.status || "Verified") : "Verified",
      isDefault: editingId ? (methods.find(x => x.id === id)?.isDefault || false) : !methods.some((m) => m.isDefault),
      createdAt: editingId ? (methods.find(x => x.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      lastUsedAt: editingId ? (methods.find(x => x.id === id)?.lastUsedAt || null) : null,
      masked: String(addForm.email).trim(),
    };

    setMethods((s) => editingId ? s.map((m) => (m.id === editingId ? newMethod : m)) : [newMethod, ...s]);

    setAddOpen(false);
    pushToast({ title: editingId ? "Provider updated" : "Provider linked", message: editingId ? "Details saved successfully." : "Payout provider added.", tone: "success" });
  };

  // Super premium
  const [validationRunAt, setValidationRunAt] = useState<string | null>(null);
  const [checks, setChecks] = useState<ValidationCheck[]>(() => buildValidation(methods, kycState, payoutSchedule));

  useEffect(() => {
    // keep checks in sync when core state changes
    setChecks(buildValidation(methods, kycState, payoutSchedule));
  }, [methods, kycState, payoutSchedule]);

  const runValidation = async () => {
    pushToast({ title: "Validation started", message: "Running checks...", tone: "default" });
    await new Promise((r) => setTimeout(r, 650));
    setValidationRunAt(new Date().toISOString());
    setChecks(buildValidation(methods, kycState, payoutSchedule));
    pushToast({ title: "Validation complete", message: "Review warnings and fix issues.", tone: "success" });
  };

  const [sandboxMode, setSandboxMode] = useState(true);
  const [testCurrency, setTestCurrency] = useState("USD");
  const [testAmount, setTestAmount] = useState(1);
  const [testMethodId, setTestMethodId] = useState<string>(() => (defaultMethod ? defaultMethod.id : methods[0]?.id || ""));

  useEffect(() => {
    if (!methods.find((m) => m.id === testMethodId)) {
      setTestMethodId(defaultMethod?.id || methods[0]?.id || "");
    }
  }, [methods, defaultMethod, testMethodId]);

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      // cleanup timers
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const startTestPayout = () => {
    const m = methods.find((x) => x.id === testMethodId);
    if (!m) {
      pushToast({ title: "Select a method", tone: "warning" });
      return;
    }
    if (m.status !== "Verified") {
      pushToast({ title: "Method not verified", message: "Verify this method before testing.", tone: "warning" });
      return;
    }
    const amount = Number(testAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushToast({ title: "Invalid amount", message: "Enter a valid amount.", tone: "warning" });
      return;
    }

    const run: TestRun = {
      id: makeId("TP"),
      createdAt: new Date().toISOString(),
      mode: sandboxMode ? "Sandbox" : "Live", // In production, live mode should be locked behind explicit confirmation
      status: "Queued",
      currency: testCurrency,
      amount,
      methodLabel: m.label,
      log: [{ at: new Date().toISOString(), text: "Queued" }],
    };

    setTestRuns((s) => [run, ...s].slice(0, 6));
    pushToast({ title: "Test payout queued", message: `${fmtMoney(amount, testCurrency)} to ${m.label}`, tone: "default" });

    const t1 = window.setTimeout(() => {
      setTestRuns((s) =>
        s.map((x) =>
          x.id === run.id
            ? {
              ...x,
              status: "Processing" as TestRunStatus,
              log: [...x.log, { at: new Date().toISOString(), text: "Processing" }],
            }
            : x
        )
      );
    }, 900);

    const t2 = window.setTimeout(() => {
      setTestRuns((s) =>
        s.map((x) =>
          x.id === run.id
            ? {
              ...x,
              status: "Completed" as TestRunStatus,
              log: [...x.log, { at: new Date().toISOString(), text: "Completed" }],
            }
            : x
        )
      );
      pushToast({ title: "Test payout completed", message: run.id, tone: "success", action: { label: "Copy ID", onClick: () => safeCopy(run.id) } });
    }, 1800);

    timersRef.current.push(t1, t2);
  };

  const kpi = useMemo(() => {
    const verified = methods.filter((m) => m.status === "Verified").length;
    const pending = methods.filter((m) => String(m.status).toLowerCase().includes("pending")).length;
    const issues = methods.filter((m) => String(m.status).toLowerCase().includes("needs")).length;
    return { verified, pending, issues };
  }, [methods]);

  const defaultMethodTone = useMemo(() => {
    if (!defaultMethod) return "orange";
    const s = String(defaultMethod.status).toLowerCase();
    if (s.includes("verified")) return "green";
    if (s.includes("pending")) return "orange";
    return "danger";
  }, [defaultMethod]);

  const kycTone = useMemo(() => {
    if (kycState === "Verified") return "green";
    if (kycState === "Pending") return "orange";
    return "slate";
  }, [kycState]);

  const methodsTone = useMemo(() => {
    if (kpi.issues > 0) return "danger";
    if (kpi.pending > 0) return "orange";
    if (kpi.verified > 0) return "green";
    return "slate";
  }, [kpi]);

  const scheduleTone = useMemo(() => {
    if (payoutSchedule === "Manual") return "orange";
    return "green";
  }, [payoutSchedule]);

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Payout Methods</div>
                <Badge tone="slate">/settings/payout-methods</Badge>
                <Badge tone="slate">Core</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Bank and payout setup, validation checks, and test payout simulation.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openAdd("bank")}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                Add bank
              </button>
              <button
                type="button"
                onClick={() => openAdd("provider")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <CreditCard className="h-4 w-4" />
                Link provider
              </button>
              <button
                type="button"
                onClick={runValidation}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Run validation
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className={cx("pl-[1px] pr-3 py-3", defaultMethodTone === "green" ? "border-emerald-200" : defaultMethodTone === "orange" ? "border-orange-200" : "border-rose-200")}>
            <div className="flex items-start gap-3">
              <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", defaultMethodTone === "green" ? "bg-emerald-50 text-emerald-700" : defaultMethodTone === "orange" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700")}>
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-600">Default method</div>
                <div className="mt-1 text-sm font-black text-slate-900">{defaultMethod ? defaultMethod.label : "Not set"}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">{defaultMethod ? defaultMethod.masked : "Add a payout method"}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className={cx("pl-[1px] pr-3 py-3", kycTone === "green" ? "border-emerald-200" : kycTone === "orange" ? "border-orange-200" : "border-slate-200/70")}>
            <div className="flex items-start gap-3">
              <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", kycTone === "green" ? "bg-emerald-50 text-emerald-700" : kycTone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-600">KYC state</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="text-lg font-black text-slate-900">{kycState}</div>
                  <Badge tone={kycState === "Verified" ? "green" : kycState === "Pending" ? "orange" : "danger"}>{kycState}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap justify-start gap-1.5">
                  {(["Verified", "Pending", "Not started"] as KycState[]).map((s) => (
                    <Chip key={s} active={kycState === s} onClick={() => setKycState(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className={cx("pl-[1px] pr-3 py-3", methodsTone === "green" ? "border-emerald-200" : methodsTone === "orange" ? "border-orange-200" : methodsTone === "danger" ? "border-rose-200" : "border-slate-200/70")}>
            <div className="flex items-start gap-3">
              <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", methodsTone === "green" ? "bg-emerald-50 text-emerald-700" : methodsTone === "orange" ? "bg-orange-50 text-orange-700" : methodsTone === "danger" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700")}>
                <CheckCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-600">Methods</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{methods.length}</div>
                <div className="mt-2 flex flex-wrap justify-start gap-1.5">
                  <Badge tone="green">Verified {kpi.verified}</Badge>
                  <Badge tone="orange">Pending {kpi.pending}</Badge>
                  {kpi.issues ? <Badge tone="danger">Issues {kpi.issues}</Badge> : <Badge tone="slate">Issues 0</Badge>}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className={cx("pl-[1px] pr-3 py-3", scheduleTone === "green" ? "border-emerald-200" : "border-orange-200")}>
            <div className="flex items-start gap-3">
              <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", scheduleTone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                <Send className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-600">Payout schedule</div>
                <div className="mt-1 text-lg font-black text-slate-900">{payoutSchedule}</div>
                <div className="mt-2 flex flex-wrap justify-start gap-1.5">
                  {(["Daily", "Weekly", "Manual"] as PayoutSchedule[]).map((s) => (
                    <Chip key={s} active={payoutSchedule === s} onClick={() => setPayoutSchedule(s)} tone={s === "Manual" ? "orange" : "green"}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Left: Methods + Preferences */}
          <div className="lg:col-span-8">
            <GlassCard className="overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-slate-900">Payout methods</div>
                  <Badge tone="slate">Core</Badge>
                  <span className="ml-auto flex flex-wrap gap-2">
                    {(
                      [
                        { k: "All", t: "All" },
                        { k: "Bank", t: "Bank accounts" },
                        { k: "Provider", t: "Providers" },
                      ] as Array<{ k: MethodsTab; t: string }>
                    ).map((x) => (
                      <Chip key={x.k} active={tab === x.k} onClick={() => setTab(x.k)}>
                        {x.t}
                      </Chip>
                    ))}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Set a default method and keep details correct for fast settlements.</div>
              </div>

              <div className="divide-y divide-slate-200/70">
                {visibleMethods.map((m) => {
                  const Ico = methodIcon(m.kind);
                  const isVerified = m.status === "Verified";
                  return (
                    <div key={m.id} className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", isVerified ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                          <Ico className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{m.label}</div>
                            {m.isDefault ? <Badge tone="green">Default</Badge> : <Badge tone="slate">Optional</Badge>}
                            <Badge tone={statusTone(m.status)}>{m.status}</Badge>
                            <Badge tone="slate">{m.currency}</Badge>
                            <Badge tone="slate">{m.country}</Badge>
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">Added {fmtTime(m.createdAt)}</span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-600">{m.masked}</div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(m.id);
                                pushToast({ title: "Copied", message: "Method ID copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy ID
                            </button>

                            {!m.isDefault ? (
                              <button
                                type="button"
                                onClick={() => setDefault(m.id)}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Check className="h-4 w-4" />
                                Set default
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Default method", message: "This method is already default.", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                              >
                                <CheckCheck className="h-4 w-4" />
                                Default
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openEdit(m)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => removeMethod(m.id)}
                              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>

                          {m.lastUsedAt ? (
                            <div className="mt-3 text-[11px] font-semibold text-slate-500">Last used {fmtTime(m.lastUsedAt)}</div>
                          ) : (
                            <div className="mt-3 text-[11px] font-semibold text-slate-500">Not used yet</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {visibleMethods.length === 0 ? (
                  <div className="p-6">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="flex items-start gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                          <Info className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900">No methods</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Add a bank or link a provider to enable payouts.</div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openAdd("bank")}
                              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Plus className="h-4 w-4" />
                              Add bank
                            </button>
                            <button
                              type="button"
                              onClick={() => openAdd("provider")}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <CreditCard className="h-4 w-4" />
                              Link provider
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard className="mt-4 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <Send className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">Payout preferences</div>
                    <Badge tone="slate">Core</Badge>
                    <span className="ml-auto"><Badge tone="slate">Applies to all methods</Badge></span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Schedule</div>
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={payoutSchedule}
                          onChange={(e) => setPayoutSchedule(e.target.value as PayoutSchedule)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                        >
                          {(
                            [
                              { v: "Daily", t: "Daily" },
                              { v: "Weekly", t: "Weekly" },
                              { v: "Manual", t: "Manual" },
                            ] as Array<{ v: PayoutSchedule; t: string }>
                          ).map((o) => (
                            <option key={o.v} value={o.v}>
                              {o.t}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none -ml-8 h-4 w-4 text-slate-400" />
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">Weekly payouts are common for settlement stability.</div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Minimum payout threshold</div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={String(minThreshold)}
                          onChange={(e) => setMinThreshold(Number(e.target.value))}
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                        <Badge tone="slate">USD</Badge>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">Premium: per-currency thresholds and split rules.</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Saved", message: "Preferences saved (wire to API).", tone: "success" })}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Save preferences
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Policy", message: "Wire payout policy notes and schedule SLAs.", tone: "default" })}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Info className="h-4 w-4" />
                      View policy
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right: Validation + Test payout */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Validation checks</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Super premium: proactive issues and safe fixes.</div>
                </div>
                <Badge tone="orange">Super premium</Badge>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Latest run</div>
                  <span className="ml-auto"><Badge tone="slate">{validationRunAt ? fmtTime(validationRunAt) : "Not run"}</Badge></span>
                </div>
                <div className="mt-3 space-y-2">
                  {checks.map((c) => (
                    <div key={c.key} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cx(
                            "grid h-11 w-11 place-items-center rounded-3xl",
                            c.status === "Pass" && "bg-emerald-50 text-emerald-700",
                            c.status === "Warn" && "bg-orange-50 text-orange-700",
                            c.status === "Fail" && "bg-rose-50 text-rose-700"
                          )}
                        >
                          {c.status === "Pass" ? <CheckCheck className="h-5 w-5" /> : c.status === "Warn" ? <AlertTriangle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900">{c.label}</div>
                            <span className="ml-auto"><Badge tone={checkTone(c.status)}>{c.status}</Badge></span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{c.detail}</div>
                          {c.key === "security" ? (
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Security", message: "Wire 2FA setup in /settings/security.", tone: "default" })}
                              className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                            >
                              <Lock className="h-4 w-4" />
                              Open security
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={runValidation}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <RefreshCw className="h-5 w-5" />
                  Run validation
                </button>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Premium idea</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Name match and bank reachability checks can reduce failed payouts.</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="mt-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Test payout simulation</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Super premium: validate routing before real payouts.</div>
                </div>
                <Badge tone="orange">Super premium</Badge>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Mode</div>
                    <span className="ml-auto"><Badge tone={sandboxMode ? "green" : "danger"}>{sandboxMode ? "Sandbox" : "Live"}</Badge></span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip active={sandboxMode} onClick={() => setSandboxMode(true)}>Sandbox</Chip>
                    <Chip active={!sandboxMode} onClick={() => setSandboxMode(false)} tone="orange">Live</Chip>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">In production, live mode should require explicit confirmation.</div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Currency</div>
                      <div className="relative mt-2">
                        <select
                          value={testCurrency}
                          onChange={(e) => setTestCurrency(e.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                        >
                          {["USD", "UGX", "CNY", "EUR"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Amount</div>
                      <input
                        value={String(testAmount)}
                        onChange={(e) => setTestAmount(Number(e.target.value))}
                        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Destination</div>
                      <div className="relative mt-2">
                        <select
                          value={testMethodId || ""}
                          onChange={(e) => setTestMethodId(e.target.value)}
                          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                        >
                          {methods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label} - {m.status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startTestPayout}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Send className="h-5 w-5" />
                    Run test payout
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Recent test runs</div>
                    <span className="ml-auto"><Badge tone="slate">{testRuns.length}</Badge></span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {testRuns.length === 0 ? (
                      <div className="text-xs font-semibold text-slate-500">No test payouts yet.</div>
                    ) : (
                      testRuns.map((r) => (
                        <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-black text-slate-900">{r.id}</div>
                            <Badge tone={r.status === "Completed" ? "green" : r.status === "Processing" ? "orange" : "slate"}>{r.status}</Badge>
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(r.createdAt)}</span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-600">{r.mode} - {fmtMoney(r.amount, r.currency)} - {r.methodLabel}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(r.id);
                                pushToast({ title: "Copied", message: "Test payout ID copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Logs", message: r.log.map((x) => x.text).join(" → "), tone: "default" })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Info className="h-4 w-4" />
                              View log
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Safety note</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Always test with small amounts. Live payouts should require a second confirmation and 2FA.</div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Add method drawer */}
      <Drawer
        open={addOpen}
        title={editingId ? (addKind === "bank" ? "Edit bank account" : "Edit payout provider") : (addKind === "bank" ? "Add bank account" : "Link payout provider")}
        subtitle={editingId ? "Update your payout method details." : (addKind === "bank" ? "Core setup with premium validation hints." : "Connect a provider for payouts.")}
        onClose={() => setAddOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {["Details", "Review", "Validation"].map((s, idx) => (
              <Chip
                key={s}
                active={addStep === idx}
                onClick={() => setAddStep(idx)}
                tone={idx === 2 ? "orange" : "green"}
              >
                {idx + 1}. {s}
              </Chip>
            ))}
            <span className="ml-auto"><Badge tone="slate">{addKind === "bank" ? "Bank" : "Provider"}</Badge></span>
          </div>

          {addStep === 0 ? (
            <GlassCard className="p-4">
              {addKind === "bank" ? (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Account holder name">
                      <input
                        value={addForm.holderName}
                        onChange={(e) => setAddForm((s) => ({ ...s, holderName: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Bank name">
                      <input
                        value={addForm.bankName}
                        onChange={(e) => setAddForm((s) => ({ ...s, bankName: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="e.g., Stanbic Bank"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Country">
                      <select
                        value={addForm.country}
                        onChange={(e) => setAddForm((s) => ({ ...s, country: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        {["UG", "KE", "NG", "US", "CN", "GB"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Currency">
                      <select
                        value={addForm.currency}
                        onChange={(e) => setAddForm((s) => ({ ...s, currency: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        {["UGX", "USD", "EUR", "CNY", "KES", "NGN"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Account number">
                      <input
                        value={addForm.accountNumber}
                        onChange={(e) => setAddForm((s) => ({ ...s, accountNumber: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="0000 0000 0000"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="IBAN (optional)">
                      <input
                        value={addForm.iban}
                        onChange={(e) => setAddForm((s) => ({ ...s, iban: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="IBAN"
                      />
                    </Field>
                    <Field label="SWIFT (optional)">
                      <input
                        value={addForm.swift}
                        onChange={(e) => setAddForm((s) => ({ ...s, swift: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="SWIFT"
                      />
                    </Field>
                    <Field label="Routing number (US only)">
                      <input
                        value={addForm.routingNumber}
                        onChange={(e) => setAddForm((s) => ({ ...s, routingNumber: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="Routing"
                      />
                    </Field>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Premium validation</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">We will validate format, name match, and bank reachability before payouts.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Provider">
                      <select
                        value={addForm.provider}
                        onChange={(e) => setAddForm((s) => ({ ...s, provider: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        {["Payoneer", "Wise", "Stripe", "Flutterwave"].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Payout email">
                      <input
                        value={addForm.email}
                        onChange={(e) => setAddForm((s) => ({ ...s, email: e.target.value }))}
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        placeholder="name@example.com"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Country">
                      <select
                        value={addForm.country}
                        onChange={(e) => setAddForm((s) => ({ ...s, country: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        {["US", "UG", "GB", "CN", "KE", "NG"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Currency">
                      <select
                        value={addForm.currency}
                        onChange={(e) => setAddForm((s) => ({ ...s, currency: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        {["USD", "EUR", "CNY", "UGX"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">Provider tokenization</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">In production, you will redirect to provider OAuth and store only a token.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddStep(1)}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <ChevronRight className="h-4 w-4" />
                  Continue
                </button>
              </div>
            </GlassCard>
          ) : null}

          {addStep === 1 ? (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Review</div>
                <span className="ml-auto"><Badge tone="slate">Confirm</Badge></span>
              </div>

              <div className="mt-3 grid gap-2">
                {addKind === "bank" ? (
                  <>
                    <ReviewRow label="Holder" value={addForm.holderName || "-"} />
                    <ReviewRow label="Bank" value={addForm.bankName || "-"} />
                    <ReviewRow label="Country" value={normalizeCountry(addForm.country) || "-"} />
                    <ReviewRow label="Currency" value={addForm.currency || "-"} />
                    <ReviewRow label="Account" value={addForm.accountNumber ? `**** ${String(addForm.accountNumber).replace(/\s+/g, "").slice(-4)}` : "-"} />
                  </>
                ) : (
                  <>
                    <ReviewRow label="Provider" value={addForm.provider || "-"} />
                    <ReviewRow label="Email" value={addForm.email || "-"} />
                    <ReviewRow label="Country" value={normalizeCountry(addForm.country) || "-"} />
                    <ReviewRow label="Currency" value={addForm.currency || "-"} />
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddStep(0)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setAddStep(2)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Validate
                </button>

                <button
                  type="button"
                  onClick={submitAdd}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  {editingId ? "Save changes" : "Add method"}
                </button>
              </div>
            </GlassCard>
          ) : null}

          {addStep === 2 ? (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Validation preview</div>
                <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
              </div>

              <div className="mt-3">
                {addKind === "bank" ? (
                  (() => {
                    const issues = validateBankForm(addForm);
                    if (!issues.length) {
                      return (
                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                              <CheckCheck className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-emerald-900">Looks good</div>
                              <div className="mt-1 text-xs font-semibold text-emerald-900/70">You can add this bank. Verification will run shortly.</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {issues.map((iss) => (
                          <div key={iss} className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="text-sm font-black text-orange-900">Fix needed</div>
                                <div className="mt-1 text-xs font-semibold text-orange-900/70">{iss}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                        <CheckCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-emerald-900">Provider connection ready</div>
                        <div className="mt-1 text-xs font-semibold text-emerald-900/70">In production, run OAuth and confirm the provider account details.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddStep(0)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Back to edit
                </button>

                <button
                  type="button"
                  onClick={submitAdd}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  {editingId ? "Save changes" : "Add method"}
                </button>
              </div>
            </GlassCard>
          ) : null}
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}
