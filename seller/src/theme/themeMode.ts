import { createContext, useContext } from "react";
import { getThemeTokens } from "./tokens";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedThemeMode = "light" | "dark";

export const THEME_MODE_STORAGE_KEY = "theme_mode";
const LEGACY_THEME_MODE_STORAGE_KEY = "evzone_supplierhub_theme_mode_v1";
const SYSTEM_DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function parseThemeMode(raw: string | null): ThemeMode | null {
  if (!raw) return null;
  if (isThemeMode(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return isThemeMode(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function resolveThemeMode(
  mode: ThemeMode,
  prefersDark: boolean
): ResolvedThemeMode {
  if (mode === "system") {
    return prefersDark ? "dark" : "light";
  }
  return mode;
}

export function getSystemPreference(win: Window = window): ResolvedThemeMode {
  return win.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function readThemeModeFromStorage(storage: Storage): ThemeMode {
  const storedMode = parseThemeMode(storage.getItem(THEME_MODE_STORAGE_KEY));
  if (storedMode) return storedMode;

  const legacyStoredMode = parseThemeMode(
    storage.getItem(LEGACY_THEME_MODE_STORAGE_KEY)
  );
  if (legacyStoredMode === "light" || legacyStoredMode === "dark") {
    return legacyStoredMode;
  }

  return "system";
}

export function applyResolvedThemeToDocument(
  resolvedMode: ResolvedThemeMode,
  root: HTMLElement = document.documentElement
) {
  const tokens = getThemeTokens(resolvedMode);
  root.classList.toggle("dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;
  root.setAttribute("data-shell-theme", resolvedMode);
  Object.entries(tokens.cssVars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

export const ThemeModeContext = createContext<ThemeModeContextValue | null>(
  null
);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within AppThemeProvider");
  }
  return context;
}

export function getThemeModeMediaQuery() {
  return SYSTEM_DARK_MEDIA_QUERY;
}
