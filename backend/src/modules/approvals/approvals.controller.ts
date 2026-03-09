import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { ApprovalsService } from './approvals.service.js';
import { CreateMarketApprovalDto } from './dto/create-market-approval.dto.js';
import { MarketApprovalsQueryDto } from './dto/market-approvals-query.dto.js';
import { UpdateMarketApprovalDto } from './dto/update-market-approval.dto.js';

@Controller()
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  @Roles('SUPPORT', 'ADMIN')
  @Get('market-approvals')
  list(@Query() query: MarketApprovalsQueryDto) {
    return this.service.list(query);
  }

  @Roles('SUPPORT', 'ADMIN')
  @Get('market-approvals/:id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('market-approvals')
  create(@CurrentUser() user: RequestUser, @Body() body: CreateMarketApprovalDto) {
    return this.service.create(user.sub, body);
  }

  @Roles('SUPPORT', 'ADMIN')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('market-approvals/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateMarketApprovalDto) {
    return this.service.update(user.sub, id, body);
  }
}
