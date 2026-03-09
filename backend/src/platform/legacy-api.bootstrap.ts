import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { FastifyInstance, FastifyReply, FastifyRequest, HTTPMethods } from 'fastify';
import { requireAuth } from '../legacy/lib/auth.js';
import { Router } from '../legacy/lib/router.js';
import { registerAdzRoutes } from '../legacy/routes/adz.routes.js';
import { registerAuthRoutes } from '../legacy/routes/auth.routes.js';
import { registerCollaborationRoutes } from '../legacy/routes/collaboration.routes.js';
import { registerDashboardRoutes } from '../legacy/routes/dashboard.routes.js';
import { registerDiscoveryRoutes } from '../legacy/routes/discovery.routes.js';
import { registerFinanceRoutes } from '../legacy/routes/finance.routes.js';
import { registerLiveRoutes } from '../legacy/routes/live.routes.js';
import { registerReviewsRoutes } from '../legacy/routes/reviews.routes.js';
import { registerSettingsRoutes } from '../legacy/routes/settings.routes.js';
import { registerWorkflowRoutes } from '../legacy/routes/workflow.routes.js';
import { PrismaAppStateStore } from './app-state.store.js';

const ALL_METHODS: HTTPMethods[] = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'];

@Injectable()
export class LegacyApiBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegacyApiBootstrap.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly store: PrismaAppStateStore
  ) {}

  async onApplicationBootstrap() {
    await this.store.init();

    const router = new Router({
      store: this.store,
      authenticate: requireAuth(this.store)
    });

    registerDashboardRoutes(router);
    registerAuthRoutes(router, { sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? '30') });
    registerDiscoveryRoutes(router);
    registerCollaborationRoutes(router);
    registerLiveRoutes(router);
    registerAdzRoutes(router);
    registerFinanceRoutes(router);
    registerSettingsRoutes(router);
    registerReviewsRoutes(router);
    registerWorkflowRoutes(router);

    const fastify = this.httpAdapterHost.httpAdapter.getInstance<FastifyInstance>();
    const handler = async (request: FastifyRequest, reply: FastifyReply) => {
      (request.raw as any)._cachedJsonPromise = Promise.resolve(request.body ?? {});
      reply.hijack();
      await router.handle(request.raw as any, reply.raw as any);
    };

    fastify.route({ method: ALL_METHODS, url: '/health', handler });
    fastify.route({ method: ALL_METHODS, url: '/api', handler });
    fastify.route({ method: ALL_METHODS, url: '/api/*', handler });

    this.logger.log(`Mounted ${router.describe().length} Creator App routes through NestJS + Fastify.`);
  }
}
