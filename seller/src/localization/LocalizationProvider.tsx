import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import dictionaries from "./dictionaries";
import { sellerBackendApi } from "../lib/backendApi";
import {
  LANGUAGE_OPTIONS,
  CURRENCY_OPTIONS,
  LANGUAGE_DIRECTION_MAP,
  getCurrencyInfo,
  type CurrencyOption,
  type LanguageOption,
} from "./config";

const LOCAL_STORAGE_LANG_KEY = "ev_lang";
const LOCAL_STORAGE_CUR_KEY = "ev_cur";
type TranslateParams = Record<string, string | number | null | undefined>;

type FormatCurrencyOptions = {
  fromCurrency?: string;
  skipConversion?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type LocalizationContextValue = {
  language: string;
  currency: string;
  setLanguage: (next: string) => void;
  setCurrency: (next: string) => void;
  t: (text: string, params?: TranslateParams) => string;
  formatCurrency: (amount: number | string, options?: FormatCurrencyOptions) => string;
  convertCurrency: (amount: number | string, fromCode?: string, toCode?: string) => number;
  getCurrencySymbol: (code?: string | null) => string;
  languageOptions: LanguageOption[];
  currencyOptions: CurrencyOption[];
  currentCurrency?: CurrencyOption;
  currentLanguage?: LanguageOption;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

function normalizeLanguage(code?: string | null) {
  if (!code) return "en";
  const match = LANGUAGE_OPTIONS.find((option) => option.code === code);
  if (match) return match.code;
  const short = code.split("-")[0];
  return LANGUAGE_OPTIONS.find((option) => option.code.startsWith(short))?.code || "en";
}

function normalizeCurrency(code?: string | null) {
  if (!code) return "USD";
  return getCurrencyInfo(code)?.code || "USD";
}

const currencyRateMap = CURRENCY_OPTIONS.reduce<Record<string, number>>((acc, currency) => {
  acc[currency.code] = currency.rateToUsd;
  return acc;
}, {});

function interpolate(template: string, params: TranslateParams = {}) {
  if (!template) return "";
  return template.replace(/\{([^}]+)\}/g, (_, token) => {
    const value = params[token.trim()];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState(() => normalizeLanguage("en"));
  const [currency, setCurrencyState] = useState(() => normalizeCurrency("USD"));

  useEffect(() => {
    let active = true;
    void sellerBackendApi
      .getPreferences()
      .then((payload) => {
        if (!active) return;
        setLanguageState(normalizeLanguage(String(payload.locale || navigator.language || "en")));
        setCurrencyState(normalizeCurrency(String(payload.currency || "USD")));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    // Keep the source language stable for global translation while preserving UI direction.
    document.documentElement.lang = "en";
    document.documentElement.dataset.uiLang = language;
    document.documentElement.dir = LANGUAGE_DIRECTION_MAP[language] || "ltr";
  }, [language]);

  const setLanguage = useCallback((next: string) => {
    const normalized = normalizeLanguage(next);
    setLanguageState(normalized);
    void sellerBackendApi.patchPreferences({ locale: normalized }).catch(() => undefined);
    void sellerBackendApi.patchUiState({ locale: normalized }).catch(() => undefined);
  }, []);

  const setCurrency = useCallback((next: string) => {
    const normalized = normalizeCurrency(next);
    setCurrencyState(normalized);
    void sellerBackendApi.patchPreferences({ currency: normalized }).catch(() => undefined);
    void sellerBackendApi.patchUiState({ currency: normalized }).catch(() => undefined);
  }, []);

  const translate = useCallback(
    (text: string, params?: TranslateParams) => {
      if (!text) return "";
      const dict = dictionaries[language] || {};
      const fallback = dictionaries.en || {};
      const template = dict[text] ?? fallback[text] ?? text;
      return interpolate(template, params);
    },
    [language]
  );

  const convertCurrency = useCallback((amount: number | string, fromCode?: string, toCode?: string) => {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return 0;
    }
    const from = currencyRateMap[fromCode || currency] ?? currencyRateMap[currency];
    const to = currencyRateMap[toCode || currency] ?? currencyRateMap[currency];
    if (!from || !to) return Number(amount);
    const numericAmount = Number(amount);
    const usdValue = numericAmount / from;
    return usdValue * to;
  }, [currency]);

  const formatCurrency = useCallback(
    (amount: number | string, options: FormatCurrencyOptions = {}) => {
      const {
        fromCurrency = currency,
        skipConversion = false,
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
      } = options;
      if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
        return "";
      }
      const targetCurrency = currency;
      const numericAmount = Number(amount);
      const value = skipConversion ? numericAmount : convertCurrency(numericAmount, fromCurrency, targetCurrency);
      try {
        const formatter = new Intl.NumberFormat(language, {
          style: "currency",
          currency: targetCurrency,
          minimumFractionDigits,
          maximumFractionDigits,
        });
        return formatter.format(value);
      } catch {
        return `${getCurrencyInfo(targetCurrency)?.symbol || ""}${value.toFixed(2)}`;
      }
    },
    [convertCurrency, currency, language]
  );

  const getCurrencySymbol = useCallback((code?: string | null) => getCurrencyInfo(code)?.symbol || "", []);

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      currency,
      setLanguage,
      setCurrency,
      t: translate,
      formatCurrency,
      convertCurrency,
      getCurrencySymbol,
      languageOptions: LANGUAGE_OPTIONS,
      currencyOptions: CURRENCY_OPTIONS,
      currentCurrency: getCurrencyInfo(currency),
      currentLanguage: LANGUAGE_OPTIONS.find((option) => option.code === language),
    }),
    [currency, formatCurrency, getCurrencySymbol, language, setCurrency, setLanguage, translate, convertCurrency]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
}
