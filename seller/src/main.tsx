import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/ToastProvider";
import { LocalizationProvider } from "./localization/LocalizationProvider";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import "./styles/theme.css";
import "./index.css";

const shouldEnableMocks =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_MOCKS === "1" ||
  String(import.meta.env.VITE_USE_MOCKS || "").toLowerCase() === "true";

if (shouldEnableMocks) {
  // Load mock modules lazily so production and first paint do not pay this cost.
  void import("./mocks").then(({ initMocks }) => {
    initMocks();
  });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

const root = createRoot(container);
root.render(
  <AppThemeProvider>
    <BrowserRouter>
      <LocalizationProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LocalizationProvider>
    </BrowserRouter>
  </AppThemeProvider>
);
