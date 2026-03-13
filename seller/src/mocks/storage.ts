export const MOCK_DB_KEY = "__EVZONE_MOCK_DB__";

export const readStorage = <T>(fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(MOCK_DB_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeStorage = <T>(value: T) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

export const clearStorage = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(MOCK_DB_KEY);
  } catch {
    // ignore storage errors
  }
};
