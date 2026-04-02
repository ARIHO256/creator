import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { getThemeTokens } from "./theme/tokens";

export function createAppTheme(mode: PaletteMode) {
  const tokens = getThemeTokens(mode);
  const fontFamily =
    '"Söhne", "Soehne", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

  return createTheme({
    typography: {
      fontFamily,
      button: {
        fontFamily,
        fontWeight: 600,
      },
    },
    palette: {
      mode: tokens.palette.mode,
      primary: { main: tokens.palette.primary },
      secondary: { main: tokens.palette.secondary },
      error: { main: tokens.palette.error },
      warning: { main: tokens.palette.warning },
      info: { main: tokens.palette.info },
      success: { main: tokens.palette.success },
      background: {
        default: tokens.palette.backgroundDefault,
        paper: tokens.palette.backgroundPaper,
      },
      text: {
        primary: tokens.palette.textPrimary,
        secondary: tokens.palette.textSecondary,
      },
      divider: tokens.palette.divider,
      action: {
        hover: tokens.palette.actionHover,
        selected: tokens.palette.actionSelected,
      },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": {
            "--app-font-sans": fontFamily,
          },
          html: {
            fontFamily,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            textRendering: "optimizeLegibility",
          },
          body: {
            fontFamily,
            backgroundColor: tokens.palette.backgroundDefault,
            color: tokens.palette.textPrimary,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            borderColor: tokens.palette.divider,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            border: `1px solid ${tokens.palette.divider}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            borderColor: tokens.palette.divider,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            border: `1px solid ${tokens.palette.divider}`,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            border: `1px solid ${tokens.palette.divider}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: tokens.palette.divider,
          },
          head: {
            backgroundColor: tokens.palette.mode === "dark" ? "#111B2E" : "#F8FAFC",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: tokens.palette.backgroundPaper,
            color: tokens.palette.textPrimary,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.palette.divider,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: tokens.palette.textSecondary,
            },
          },
          input: {
            color: tokens.palette.textPrimary,
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: tokens.palette.textSecondary,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: tokens.palette.mode === "dark" ? "#1E293B" : "#0F172A",
            color: "#F8FAFC",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 700, borderRadius: 12, fontFamily },
        },
      },
    },
  });
}
