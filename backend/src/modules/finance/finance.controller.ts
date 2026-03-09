import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto.js';
import { PayoutActionDto } from './dto/payout-action.dto.js';
import { PayoutsQueryDto } from './dto/payouts-query.dto.js';
import { RequestPayoutDto } from './dto/request-payout.dto.js';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto.js';
import { CreateSettlementBatchDto } from './dto/create-settlement-batch.dto.js';
import { SettlementQueryDto } from './dto/settlement-query.dto.js';
import { ReconcileSettlementDto } from './dto/reconcile-settlement.dto.js';
import { FinanceService } from './finance.service.js';

@Controller()
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly service: FinanceService) {}

  @Get('earnings/summary') earningsSummary(@CurrentUser() user: RequestUser) { return this.service.earningsSummary(user.sub); }
  @Get('earnings/payouts') payouts(@CurrentUser() user: RequestUser) { return this.service.payouts(user.sub); }
  @Post('earnings/payouts/request')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  requestPayout(@CurrentUser() user: RequestUser, @Body() body: RequestPayoutDto) { return this.service.requestPayout(user.sub, body); }
  @Roles('SUPPORT', 'ADMIN')
  @Get('finance/payouts')
  payoutRequests(@Query() query: PayoutsQueryDto) { return this.service.payoutRequests(query); }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/payouts/:id/approve')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  approvePayout(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: PayoutActionDto) {
    return this.service.approvePayout(user.sub, id, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/payouts/:id/reject')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  rejectPayout(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: PayoutActionDto) {
    return this.service.rejectPayout(user.sub, id, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/payouts/:id/cancel')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  cancelPayout(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: PayoutActionDto) {
    return this.service.cancelPayout(user.sub, id, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/adjustments')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createAdjustment(@CurrentUser() user: RequestUser, @Body() body: CreateAdjustmentDto) {
    return this.service.createAdjustment(user.sub, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Get('finance/settlements')
  settlementBatches(@Query() query: SettlementQueryDto) {
    return this.service.settlementBatches(query);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Get('finance/settlements/:id')
  settlementBatch(@Param('id') id: string) {
    return this.service.settlementBatch(id);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/settlements')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  createSettlement(@CurrentUser() user: RequestUser, @Body() body: CreateSettlementBatchDto) {
    return this.service.createSettlementBatch(user.sub, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('finance/settlements/:id/reconcile')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  reconcileSettlement(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ReconcileSettlementDto) {
    return this.service.reconcileSettlement(user.sub, id, body);
  }
  @Get('analytics/overview') analyticsOverview(@CurrentUser() user: RequestUser) { return this.service.analyticsOverview(user.sub); }
  @Get('subscription') subscription(@CurrentUser() user: RequestUser) { return this.service.subscription(user.sub); }
  @Patch('subscription')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  updateSubscription(@CurrentUser() user: RequestUser, @Body() body: UpdateSubscriptionDto) { return this.service.updateSubscription(user.sub, body); }
}
