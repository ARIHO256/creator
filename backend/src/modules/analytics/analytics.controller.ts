import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  overview(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getOverview(user.sub, user.role);
  }

  @Get('page')
  page(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getPage(user.sub, user.role);
  }

  @Patch('page')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updatePage(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.analyticsService.updatePage(user.sub, user.role, body);
  }
}
