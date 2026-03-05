import { Controller, Get } from '@nestjs/common';
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
  @Get('routes')
  routes() {
    return this.dashboardService.routes();
  }

  @Public()
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

  @Get('dashboard/my-day')
  myDay(@CurrentUser() user: RequestUser) {
    return this.dashboardService.myDay(user.sub);
  }
}
