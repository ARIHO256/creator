import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/ToastProvider";
import { LocalizationProvider } from "./localization/LocalizationProvider";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import "./styles/theme.css";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

const root = createRoot(container);

const renderApp = () => {
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
};

void import("./mocks")
  .then(async ({ initMocks }) => {
    await initMocks();
  })
  .catch(() => {
    // Seller boot should still proceed with any cached compatibility state.
  })
  .finally(() => {
    renderApp();
  });
