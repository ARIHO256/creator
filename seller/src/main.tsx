import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./components/ui/ToastProvider";
import { LocalizationProvider } from "./localization/LocalizationProvider";
import { AppThemeProvider } from "./theme/AppThemeProvider";
import { bootstrapSellerFrontendState, initSellerStorageSync } from "./lib/frontendState";
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

void bootstrapSellerFrontendState()
  .catch(() => undefined)
  .finally(() => {
    initSellerStorageSync({
      localPrefixes: [
        "session",
        "theme",
        "ev_",
        "evz_",
        "evzone_",
        "seller.",
        "seller_",
        "provider_",
        "serviceListing.",
        "shipping_",
        "catalog_",
        "passkeys",
        "onboarding_status_",
        "mldz_",
        "channels_",
        "signup.",
      ],
      sessionPrefixes: [
        "seller_",
        "catalog_",
        "mldz_",
      ],
    });
    renderApp();
  });
