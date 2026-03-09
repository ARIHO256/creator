import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { FinanceService } from './finance.service.js';

@Controller()
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly service: FinanceService) {}

  @Get('earnings/summary') earningsSummary(@CurrentUser() user: RequestUser) { return this.service.earningsSummary(user.sub); }
  @Get('earnings/payouts') payouts(@CurrentUser() user: RequestUser) { return this.service.payouts(user.sub); }
  @Post('earnings/payouts/request')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  requestPayout(@CurrentUser() user: RequestUser, @Body() body: RequestPayoutDto) { return this.service.requestPayout(user.sub, body); }
  @Get('analytics/overview') analyticsOverview(@CurrentUser() user: RequestUser) { return this.service.analyticsOverview(user.sub); }
  @Get('subscription') subscription(@CurrentUser() user: RequestUser) { return this.service.subscription(user.sub); }
  @Patch('subscription')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  updateSubscription(@CurrentUser() user: RequestUser, @Body() body: UpdateSubscriptionDto) { return this.service.updateSubscription(user.sub, body); }
}
