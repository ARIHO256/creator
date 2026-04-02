export type LanguageOption = {
  code: string;
  label: string;
};

export type CurrencyOption = {
  code: string;
  symbol: string;
  rateToUsd: number;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Русский" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "tr", label: "Türkçe" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "th", label: "ไทย" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "zh", label: "中文" },
  { code: "hi", label: "हिन्दी" },
  { code: "da", label: "Dansk" },
  { code: "sv", label: "Svenska" },
  { code: "no", label: "Norsk" },
  { code: "nl", label: "Nederlands" },
  { code: "fi", label: "Suomi" },
  { code: "lg", label: "Luganda" }
];

export const LANGUAGE_DIRECTION_MAP: Record<string, "ltr" | "rtl"> = {
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", symbol: "$", rateToUsd: 1 },
  { code: "UGX", symbol: "USh", rateToUsd: 1 / 3800 },
  { code: "KES", symbol: "KSh", rateToUsd: 1 / 150 },
  { code: "TZS", symbol: "TSh", rateToUsd: 1 / 2550 },
  { code: "RWF", symbol: "RF", rateToUsd: 1 / 1350 },
  { code: "NGN", symbol: "₦", rateToUsd: 1 / 1500 },
  { code: "ZAR", symbol: "R", rateToUsd: 1 / 19 },
  { code: "AED", symbol: "AED", rateToUsd: 1 / 3.6725 },
  { code: "EUR", symbol: "€", rateToUsd: 1.08 },
  { code: "GBP", symbol: "£", rateToUsd: 1.26 },
  { code: "CNY", symbol: "¥", rateToUsd: 1 / 7.2 },
  { code: "JPY", symbol: "¥", rateToUsd: 1 / 150 },
  { code: "KRW", symbol: "₩", rateToUsd: 1 / 1350 },
  { code: "INR", symbol: "₹", rateToUsd: 1 / 83 },
  { code: "IDR", symbol: "Rp", rateToUsd: 1 / 15500 },
  { code: "VND", symbol: "₫", rateToUsd: 1 / 25000 },
  { code: "THB", symbol: "฿", rateToUsd: 1 / 36 },
  { code: "TRY", symbol: "₺", rateToUsd: 1 / 32 },
  { code: "SEK", symbol: "kr", rateToUsd: 1 / 10.5 },
  { code: "NOK", symbol: "kr", rateToUsd: 1 / 10.8 },
  { code: "DKK", symbol: "kr", rateToUsd: 1 / 6.9 },
  { code: "CHF", symbol: "CHF", rateToUsd: 1.1 },
  { code: "CAD", symbol: "$", rateToUsd: 1 / 1.36 },
  { code: "AUD", symbol: "$", rateToUsd: 1 / 1.52 }
];

export const getCurrencyInfo = (code: string | null | undefined) =>
  CURRENCY_OPTIONS.find((c) => c.code === code);
