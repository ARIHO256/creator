import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import appConfig from './config/app.config.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { RequestTimeoutInterceptor } from './common/interceptors/request-timeout.interceptor.js';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor.js';
import { PrismaModule } from './platform/prisma/prisma.module.js';
import { CacheModule } from './platform/cache/cache.module.js';
import { MetricsModule } from './platform/metrics/metrics.module.js';
import { AuditModule } from './platform/audit/audit.module.js';
import { IdempotencyModule } from './platform/idempotency/idempotency.module.js';
import { RealtimeModule } from './platform/realtime/realtime.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CreatorsModule } from './modules/creators/creators.module.js';
import { SellersModule } from './modules/sellers/sellers.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js';
import { DealsModule } from './modules/deals/deals.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { CollaborationModule } from './modules/collaboration/collaboration.module.js';
import { LiveModule } from './modules/live/live.module.js';
import { AdzModule } from './modules/adz/adz.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { CommerceModule } from './modules/commerce/commerce.module.js';
import { CommunicationsModule } from './modules/communications/communications.module.js';
import { WholesaleModule } from './modules/wholesale/wholesale.module.js';
import { ProviderModule } from './modules/provider/provider.module.js';
import { RegulatoryModule } from './modules/regulatory/regulatory.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module.js';
import { StorefrontModule } from './modules/storefront/storefront.module.js';
import { FavouritesModule } from './modules/favourites/favourites.module.js';
import { OpsModule } from './modules/ops/ops.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { TrustModule } from './modules/trust/trust.module.js';
import { ApprovalsModule } from './modules/approvals/approvals.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    JwtModule.register({}),
    CacheModule,
    MetricsModule,
    AuditModule,
    RealtimeModule,
    IdempotencyModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    SellersModule,
    ProfilesModule,
    CommerceModule,
    CommunicationsModule,
    JobsModule,
    WholesaleModule,
    ProviderModule,
    RegulatoryModule,
    TaxonomyModule,
    StorefrontModule,
    FavouritesModule,
    OpsModule,
    CatalogModule,
    TrustModule,
    ApprovalsModule,
    DealsModule,
    MarketplaceModule,
    AnalyticsModule,
    MediaModule,
    DashboardModule,
    DiscoveryModule,
    CollaborationModule,
    LiveModule,
    AdzModule,
    FinanceModule,
    SettingsModule,
    WorkflowModule,
    ReviewsModule
  ],
  providers: [
    RequestTimeoutInterceptor,
    MetricsInterceptor,
    AuditInterceptor,
    IdempotencyInterceptor,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
