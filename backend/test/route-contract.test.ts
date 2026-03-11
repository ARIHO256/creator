import assert from 'node:assert/strict';
import test from 'node:test';
import { requireAuth } from '../src/legacy/lib/auth.js';
import { Router } from '../src/legacy/lib/router.js';
import { registerAdzRoutes } from '../src/legacy/routes/adz.routes.js';
import { registerAuthRoutes } from '../src/legacy/routes/auth.routes.js';
import { registerCollaborationRoutes } from '../src/legacy/routes/collaboration.routes.js';
import { registerDashboardRoutes } from '../src/legacy/routes/dashboard.routes.js';
import { registerDiscoveryRoutes } from '../src/legacy/routes/discovery.routes.js';
import { registerFinanceRoutes } from '../src/legacy/routes/finance.routes.js';
import { registerLiveRoutes } from '../src/legacy/routes/live.routes.js';
import { registerReviewsRoutes } from '../src/legacy/routes/reviews.routes.js';
import { registerSettingsRoutes } from '../src/legacy/routes/settings.routes.js';
import { registerWorkflowRoutes } from '../src/legacy/routes/workflow.routes.js';

function createStore() {
  const db = { meta: { updatedAt: new Date().toISOString() } };
  return {
    load: () => db,
    snapshot: () => structuredClone(db),
    update: (mutator: (value: Record<string, any>) => unknown) => structuredClone(mutator(db)),
    whenIdle: async () => undefined
  };
}

test('Creator App route contract includes the Live Studio default resolver and roles security endpoint', () => {
  const store = createStore();
  const router = new Router({ store, authenticate: requireAuth(store as any) });

  registerDashboardRoutes(router);
  registerAuthRoutes(router, { sessionTtlDays: 30 });
  registerDiscoveryRoutes(router);
  registerCollaborationRoutes(router);
  registerLiveRoutes(router);
  registerAdzRoutes(router);
  registerFinanceRoutes(router);
  registerSettingsRoutes(router);
  registerReviewsRoutes(router);
  registerWorkflowRoutes(router);

  const routes = router.describe();

  assert.ok(routes.some((route) => route.method === 'GET' && route.path === '/api/live/studio/default'));
  assert.ok(routes.some((route) => route.method === 'PATCH' && route.path === '/api/roles/security'));
  assert.ok(routes.length > 70);
});
