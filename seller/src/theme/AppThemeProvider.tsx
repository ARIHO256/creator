import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "../theme";
import {
  ThemeModeContext,
  THEME_MODE_STORAGE_KEY,
  applyResolvedThemeToDocument,
  getSystemPreference,
  getThemeModeMediaQuery,
  readThemeModeFromStorage,
  resolveThemeMode,
  type ThemeMode,
  type ResolvedThemeMode,
} from "./themeMode";

type Props = {
  children: React.ReactNode;
};

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return readThemeModeFromStorage(window.localStorage);
}

function getInitialSystemMode(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light";
  return getSystemPreference(window);
}

export function AppThemeProvider({ children }: Props) {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);
  const [systemMode, setSystemMode] =
    useState<ResolvedThemeMode>(getInitialSystemMode);

  const resolvedMode = useMemo(
    () => resolveThemeMode(mode, systemMode === "dark"),
    [mode, systemMode]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia(getThemeModeMediaQuery());
    const updateSystemMode = () => {
      setSystemMode(media.matches ? "dark" : "light");
    };

    updateSystemMode();
    if (mode !== "system") return;

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateSystemMode);
      return () => media.removeEventListener("change", updateSystemMode);
    }

    media.addListener(updateSystemMode);
    return () => media.removeListener(updateSystemMode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyResolvedThemeToDocument(resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_MODE_STORAGE_KEY) return;
      setMode(readThemeModeFromStorage(window.localStorage));
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => {
      const currentResolvedMode = resolveThemeMode(
        currentMode,
        systemMode === "dark"
      );
      return currentResolvedMode === "dark" ? "light" : "dark";
    });
  }, [systemMode]);

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedMode,
      setMode,
      toggleMode,
    }),
    [mode, resolvedMode, toggleMode]
  );

  const muiTheme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
