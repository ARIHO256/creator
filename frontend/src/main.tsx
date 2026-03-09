
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ScrollToTop } from "./components/ScrollToTop";
import "./index.css";
import "./index.css";

// Component to wrap MUI ThemeProvider with dynamic theme
// Removed manual ThemedApp wrapper as AppThemeProvider is now integrated in App.tsx

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
