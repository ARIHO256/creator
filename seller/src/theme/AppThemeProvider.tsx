import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { sellerBackendApi } from "../lib/backendApi";
import { createAppTheme } from "../theme";
import {
  ThemeModeContext,
  applyResolvedThemeToDocument,
  getSystemPreference,
  getThemeModeMediaQuery,
  isThemeMode,
  resolveThemeMode,
  type ThemeMode,
  type ResolvedThemeMode,
} from "./themeMode";

type Props = {
  children: React.ReactNode;
};

function getInitialThemeMode(): ThemeMode {
  return "system";
}

function getInitialSystemMode(): ResolvedThemeMode {
  if (typeof window === "undefined") return "light";
  return getSystemPreference(window);
}

export function AppThemeProvider({ children }: Props) {
  const [mode, setMode] = useState<ThemeMode>(getInitialThemeMode);
  const [systemMode, setSystemMode] =
    useState<ResolvedThemeMode>(getInitialSystemMode);
  const [uiStateHydrated, setUiStateHydrated] = useState(false);

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
    let active = true;
    void sellerBackendApi
      .getUiState()
      .then((payload) => {
        if (!active || !payload || typeof payload !== "object") return;
        const appearance =
          payload.appearance && typeof payload.appearance === "object"
            ? (payload.appearance as Record<string, unknown>)
            : {};
        const backendMode = appearance.themeMode ?? payload.themeMode;
        if (isThemeMode(backendMode)) {
          setMode(backendMode);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setUiStateHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;
    void sellerBackendApi
      .patchUiState({ appearance: { themeMode: mode } })
      .catch(() => undefined);
  }, [mode, uiStateHydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    applyResolvedThemeToDocument(resolvedMode);
  }, [resolvedMode]);

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
