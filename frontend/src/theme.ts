
import { createTheme, Theme } from "@mui/material/styles";

// Create theme function that accepts mode
export const createAppTheme = (mode: "light" | "dark"): Theme => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#f77f00" // evz-orange
      },
      secondary: {
        main: "#03cd8c" // evz-teal
      },
      background: {
        default: mode === "dark" ? "#0f172a" : "#f2f2f2", // slate-900 : evz-light
        paper: mode === "dark" ? "#1e293b" : "#ffffff" // slate-800 : white
      },
      text: {
        primary: mode === "dark" ? "#f1f5f9" : "#0f172a", // slate-100 : slate-900
        secondary: mode === "dark" ? "#cbd5e1" : "#475569" // slate-300 : slate-600
      }
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: [
        "system-ui",
        "-apple-system",
        "BlinkMacSystemFont",
        '"Segoe UI"',
        "sans-serif"
      ].join(","),
      fontSize: 16, // Base font size for Material-UI components
      button: {
        textTransform: "none"
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff", // slate-800 : white
            color: mode === "dark" ? "#f1f5f9" : "#0f172a" // slate-100 : slate-900
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            transition: "all 0.2s ease"
          }
        }
      }
    }
  });
};

// Default export for backward compatibility (light theme)
const theme = createAppTheme("light");
export default theme;
