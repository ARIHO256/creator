import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { FlexiblePayloadValidationPipe } from '../../common/pipes/flexible-payload-validation.pipe.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AnalyticsService } from './analytics.service.js';
import { UpdateAnalyticsPageDto } from './dto/update-analytics-page.dto.js';

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

  @Get('rank-detail')
  rankDetail(
    @CurrentUser() user: RequestUser,
    @Query('range') range?: string,
    @Query('category') category?: string
  ) {
    return this.analyticsService.getRankDetail(user.sub, user.role, { range, category });
  }

  @Patch('page')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updatePage(@CurrentUser() user: RequestUser, @Body(new FlexiblePayloadValidationPipe(UpdateAnalyticsPageDto)) body: UpdateAnalyticsPageDto) {
    return this.analyticsService.updatePage(user.sub, user.role, body.payload);
  }
}
