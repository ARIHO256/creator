import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  overview(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getOverview(user.sub);
  }
}
