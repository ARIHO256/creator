import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Custom middleware to handle SPA fallback
const spaFallback = () => {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Skip API routes, static assets, and HMR
        if (
          req.url?.startsWith('/api/') ||
          req.url?.startsWith('/src/') ||
          req.url?.startsWith('/node_modules/') ||
          req.url?.startsWith('/@') ||
          req.url?.includes('.') ||
          req.url === '/'
        ) {
          return next();
        }
        // For all other routes, serve index.html
        req.url = '/index.html';
        next();
      });
    },
  };
};

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
  },
});
