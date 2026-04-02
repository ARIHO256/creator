import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5172,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4010",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setupTests.ts",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            if (id.includes("/src/features/shell/")) return "app-shell";
            return undefined;
          }
          if (
            id.includes("react-router-dom") ||
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("@mui/") ||
            id.includes("@emotion/")
          ) {
            return "framework";
          }
          if (id.includes("recharts")) return "charts";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("jspdf") || id.includes("qrcode")) return "docs-media";
          return undefined;
        },
      },
    },
  },
});
