import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import appConfig from './config/app.config.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PrismaModule } from './platform/prisma/prisma.module.js';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    JwtModule.register({}),
    PrismaModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    SellersModule,
    ProfilesModule,
    CommerceModule,
    CommunicationsModule,
    WholesaleModule,
    ProviderModule,
    RegulatoryModule,
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
