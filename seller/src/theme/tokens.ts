import type { PaletteMode } from "@mui/material";
import type { ResolvedThemeMode } from "./themeMode";

export type ThemePaletteTokens = {
  mode: PaletteMode;
  primary: string;
  secondary: string;
  backgroundDefault: string;
  backgroundPaper: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  actionHover: string;
  actionSelected: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type ThemeTokens = {
  palette: ThemePaletteTokens;
  cssVars: Record<string, string>;
};

export const THEME_TOKENS: Record<ResolvedThemeMode, ThemeTokens> = {
  light: {
    palette: {
      mode: "light",
      primary: "#03CD8C",
      secondary: "#F77F00",
      backgroundDefault: "#F6F8FB",
      backgroundPaper: "#FFFFFF",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
      divider: "#D9E1EA",
      actionHover: "rgba(15, 23, 42, 0.06)",
      actionSelected: "rgba(15, 23, 42, 0.12)",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#0284C7",
    },
    cssVars: {
      "--background": "210 33% 98%",
      "--foreground": "222 47% 11%",
      "--card": "0 0% 100%",
      "--card-foreground": "222 47% 11%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "222 47% 11%",
      "--muted": "210 40% 96%",
      "--muted-foreground": "215 16% 47%",
      "--border": "214 32% 90%",
      "--input": "214 32% 90%",
      "--ring": "153 97% 41%",
      "--primary": "153 97% 41%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "31 100% 48%",
      "--secondary-foreground": "0 0% 100%",
      "--accent": "210 40% 96%",
      "--accent-foreground": "222 47% 11%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 100%",
      "--bg-default": "#F6F8FB",
      "--bg-paper": "#FFFFFF",
      "--surface-1": "#FFFFFF",
      "--surface-2": "#F8FAFC",
      "--surface-3": "#EEF2F7",
      "--text-primary": "#0F172A",
      "--text-secondary": "#475569",
      "--text-muted": "#64748B",
      "--border-color": "#D9E1EA",
      "--border-strong": "#CBD5E1",
      "--hover-bg": "rgba(15, 23, 42, 0.06)",
      "--selected-bg": "rgba(15, 23, 42, 0.12)",
      "--overlay": "rgba(2, 8, 20, 0.45)",
      "--success-soft": "rgba(16, 185, 129, 0.12)",
      "--warning-soft": "rgba(245, 158, 11, 0.12)",
      "--error-soft": "rgba(239, 68, 68, 0.12)",
      "--info-soft": "rgba(2, 132, 199, 0.12)",
      "--ev-green": "#03CD8C",
      "--ev-orange": "#F77F00",
      "--ev-grey-light": "#F2F2F2",
      "--ev-ink": "#111827",
      "--bg": "#F6F8FB",
      "--card2": "rgba(15, 23, 42, 0.05)",
      "--stroke": "rgba(15, 23, 42, 0.14)",
      "--text": "#0F172A",
      "--legacy-muted": "rgba(15, 23, 42, 0.72)",
      "--surface": "rgba(255, 255, 255, 0.86)",
      "--surface2": "rgba(255, 255, 255, 0.92)",
      "--hover": "rgba(15, 23, 42, 0.06)",
      "--divider": "rgba(15, 23, 42, 0.14)",
      "--page-gradient-base": "linear-gradient(180deg, #F7FAF9 0%, #F6F8FB 45%, #F7FAF9 100%)",
    },
  },
  dark: {
    palette: {
      mode: "dark",
      primary: "#03CD8C",
      secondary: "#F77F00",
      backgroundDefault: "#0B1220",
      backgroundPaper: "#0F172A",
      textPrimary: "#E2E8F0",
      textSecondary: "#94A3B8",
      divider: "#334155",
      actionHover: "rgba(226, 232, 240, 0.08)",
      actionSelected: "rgba(226, 232, 240, 0.16)",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      info: "#38BDF8",
    },
    cssVars: {
      "--background": "222 47% 9%",
      "--foreground": "213 31% 91%",
      "--card": "222 47% 11%",
      "--card-foreground": "213 31% 91%",
      "--popover": "222 47% 11%",
      "--popover-foreground": "213 31% 91%",
      "--muted": "217 33% 17%",
      "--muted-foreground": "215 20% 65%",
      "--border": "215 28% 25%",
      "--input": "215 28% 25%",
      "--ring": "153 97% 41%",
      "--primary": "153 97% 41%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "31 100% 48%",
      "--secondary-foreground": "0 0% 100%",
      "--accent": "217 33% 17%",
      "--accent-foreground": "213 31% 91%",
      "--destructive": "0 63% 31%",
      "--destructive-foreground": "213 31% 91%",
      "--bg-default": "#0B1220",
      "--bg-paper": "#0F172A",
      "--surface-1": "#0F172A",
      "--surface-2": "#111B2E",
      "--surface-3": "#1A2740",
      "--text-primary": "#E2E8F0",
      "--text-secondary": "#94A3B8",
      "--text-muted": "#94A3B8",
      "--border-color": "#334155",
      "--border-strong": "#475569",
      "--hover-bg": "rgba(226, 232, 240, 0.08)",
      "--selected-bg": "rgba(226, 232, 240, 0.16)",
      "--overlay": "rgba(2, 8, 20, 0.62)",
      "--success-soft": "rgba(16, 185, 129, 0.2)",
      "--warning-soft": "rgba(245, 158, 11, 0.2)",
      "--error-soft": "rgba(239, 68, 68, 0.2)",
      "--info-soft": "rgba(56, 189, 248, 0.2)",
      "--ev-green": "#03CD8C",
      "--ev-orange": "#F77F00",
      "--ev-grey-light": "#1A2740",
      "--ev-ink": "#E2E8F0",
      "--bg": "#0B1220",
      "--card2": "rgba(15, 23, 42, 0.84)",
      "--stroke": "rgba(148, 163, 184, 0.36)",
      "--text": "#E2E8F0",
      "--legacy-muted": "rgba(148, 163, 184, 0.92)",
      "--surface": "rgba(15, 23, 42, 0.76)",
      "--surface2": "rgba(15, 23, 42, 0.88)",
      "--hover": "rgba(226, 232, 240, 0.08)",
      "--divider": "rgba(148, 163, 184, 0.3)",
      "--page-gradient-base": "linear-gradient(180deg, #050B17 0%, #081122 45%, #050B17 100%)",
    },
  },
};

export function getThemeTokens(mode: ResolvedThemeMode): ThemeTokens {
  return THEME_TOKENS[mode];
}
