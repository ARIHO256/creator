import { Controller, Get } from '@nestjs/common';
import { CachePolicy } from '../../common/decorators/cache-policy.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DashboardService } from './dashboard.service.js';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Public()
  @Get('health')
  health() {
    return this.dashboardService.health();
  }

  @Public()
  @Get('ready')
  ready() {
    return this.dashboardService.ready();
  }

  @Public()
  @Get('routes')
  routes() {
    return this.dashboardService.routes();
  }

  @Public()
  @CachePolicy({ maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 30, staleIfError: 300 })
  @Get('landing/content')
  landingContent() {
    return this.dashboardService.landingContent();
  }

  @Get('app/bootstrap')
  appBootstrap(@CurrentUser() user: RequestUser) {
    return this.dashboardService.appBootstrap(user.sub);
  }

  @Get('dashboard/feed')
  feed(@CurrentUser() user: RequestUser) {
    return this.dashboardService.feed(user.sub);
  }

  @Get('dashboard/live-feed')
  liveFeed(@CurrentUser() user: RequestUser) {
    return this.dashboardService.liveFeed(user.sub);
  }

  @Get('dashboard/seller-public-profile')
  sellerPublicProfile(@CurrentUser() user: RequestUser) {
    return this.dashboardService.sellerPublicProfile(user.sub);
  }

  @Get('dashboard/summary')
  summary(@CurrentUser() user: RequestUser) {
    return this.dashboardService.summary(user.sub);
  }

  @Get('dashboard/my-day')
  myDay(@CurrentUser() user: RequestUser) {
    return this.dashboardService.myDay(user.sub);
  }
}
