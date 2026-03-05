import http from "node:http";
import { resolve } from "node:path";
import { JsonStore } from "./lib/store.js";
import { requireAuth } from "./lib/auth.js";
import { Router } from "./lib/router.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerDashboardRoutes } from "./routes/dashboard.routes.js";
import { registerDiscoveryRoutes } from "./routes/discovery.routes.js";
import { registerCollaborationRoutes } from "./routes/collaboration.routes.js";
import { registerLiveRoutes } from "./routes/live.routes.js";
import { registerAdzRoutes } from "./routes/adz.routes.js";
import { registerFinanceRoutes } from "./routes/finance.routes.js";
import { registerSettingsRoutes } from "./routes/settings.routes.js";
import { registerReviewsRoutes } from "./routes/reviews.routes.js";
import { registerWorkflowRoutes } from "./routes/workflow.routes.js";

const DEFAULT_PORT = Number(process.env.PORT || "4010");
const DEFAULT_HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_DB_FILE = process.env.MLDZ_DB_FILE || "./src/data/db.json";
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || "30");

export function createApp({ port = DEFAULT_PORT, host = DEFAULT_HOST, dbFile = DEFAULT_DB_FILE } = {}) {
  const store = new JsonStore(resolve(dbFile));
  const router = new Router({
    store,
    authenticate: requireAuth(store)
  });

  registerDashboardRoutes(router);
  registerAuthRoutes(router, { sessionTtlDays: SESSION_TTL_DAYS });
  registerDiscoveryRoutes(router);
  registerCollaborationRoutes(router);
  registerLiveRoutes(router);
  registerAdzRoutes(router);
  registerFinanceRoutes(router);
  registerSettingsRoutes(router);
  registerReviewsRoutes(router);
  registerWorkflowRoutes(router);

  const server = http.createServer((req, res) => router.handle(req, res));

  return {
    port,
    host,
    server,
    router,
    store,
    start() {
      return new Promise((resolveStart) => {
        server.listen(port, host, () => resolveStart({ port, host }));
      });
    },
    stop() {
      return new Promise((resolveStop, rejectStop) => {
        server.close((error) => {
          if (error) rejectStop(error);
          else resolveStop();
        });
      });
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.start().then(({ host, port }) => {
    console.log(`MyLiveDealz Creator backend listening on http://${host}:${port}`);
    console.log("Seed login: creator@mylivedealz.com / Password123!");
  });
}
