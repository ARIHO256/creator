/**
 * Formats a number with compact suffixes (M for Million, B for Billion, T for Trillion).
 * 
 * @param value - The number to format
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted string (e.g., 1.2M, 45.5M)
 */
export function formatCompactNumber(value: number, decimals = 1): string {
    if (value < 1_000_000) return value.toLocaleString();

    const suffixes = [
        { value: 1_000_000_000_000, suffix: "T" },
        { value: 1_000_000_000, suffix: "B" },
        { value: 1_000_000, suffix: "M" },
    ];

    for (const { value: divisor, suffix } of suffixes) {
        if (value >= divisor) {
            const formatted = (value / divisor).toFixed(decimals);
            // Remove trailing .0 if present
            return `${formatted.replace(/\.0$/, "")}${suffix}`;
        }
    }

    return value.toLocaleString();
}

/**
 * Formats a currency value, optionally using compact notation for mobile.
 * 
 * @param currency - Currency code (e.g., UGX, USD)
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrencyValue(
    currency: string,
    amount: number,
    options: {
        isMobile?: boolean;
        maximumFractionDigits?: number;
    } = {}
): string {
    const { isMobile = false, maximumFractionDigits = 0 } = options;

    if (isMobile && amount >= 1_000_000) {
        const compactValue = formatCompactNumber(amount, 1);
        return `${currency} ${compactValue}`;
    }

    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toLocaleString()}`;
    }
}
