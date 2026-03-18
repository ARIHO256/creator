// Utility functions for payout method management
export type PayoutMethodType = "bank" | "mobile" | "wallet";

export interface PayoutMethodDisplay {
    name: string;
    detail: string;
    icon: string;
}

const STORAGE_KEY_METHOD = "evzone_payout_method";
const STORAGE_KEY_DETAILS = "evzone_payout_details";

/**
 * Get the current payout method from localStorage
 */
export function getPayoutMethod(): PayoutMethodType {
    const method = localStorage.getItem(STORAGE_KEY_METHOD) as PayoutMethodType;
    return method || "bank";
}

/**
 * Get the current payout details from localStorage
 */
export function getPayoutDetails(): string {
    return localStorage.getItem(STORAGE_KEY_DETAILS) || "Standard Chartered **** 6789";
}

/**
 * Get the display information for the current payout method
 */
export function getPayoutMethodDisplay(): PayoutMethodDisplay {
    const method = getPayoutMethod();
    const details = getPayoutDetails();

    return {
        name: method === "mobile" ? "Mobile Money" :
            method === "wallet" ? "PayPal / Others" :
                "Bank Account",
        detail: details,
        icon: method === "mobile" ? "📱" :
            method === "wallet" ? "💳" :
                "🏦"
    };
}

/**
 * Save payout method and details to localStorage and dispatch event
 */
export function savePayoutMethod(method: PayoutMethodType, details: string): void {
    localStorage.setItem(STORAGE_KEY_METHOD, method);
    localStorage.setItem(STORAGE_KEY_DETAILS, details);

    // Dispatch custom event to notify all components
    window.dispatchEvent(new CustomEvent('payoutMethodChanged', {
        detail: { method, details }
    }));
}

/**
 * Hook to listen for payout method changes
 * Returns the current payout method display information
 */
export function usePayoutMethod(callback?: () => void): PayoutMethodDisplay {
    const [display, setDisplay] = React.useState<PayoutMethodDisplay>(getPayoutMethodDisplay());

    React.useEffect(() => {
        const handleChange = () => {
            setDisplay(getPayoutMethodDisplay());
            callback?.();
        };

        // Listen for custom event (same tab)
        window.addEventListener('payoutMethodChanged', handleChange);
        // Listen for storage event (cross-tab)
        window.addEventListener('storage', handleChange);

        return () => {
            window.removeEventListener('payoutMethodChanged', handleChange);
            window.removeEventListener('storage', handleChange);
        };
    }, [callback]);

    return display;
}

// For non-React usage
import React from 'react';
