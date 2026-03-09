import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary.dto.js';
import { SellerOrdersQueryDto } from './dto/seller-orders-query.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { CommerceService } from './commerce.service.js';

@Controller('expressmart')
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class ExpressmartController {
  constructor(private readonly service: CommerceService) {}

  @Get('summary')
  summary(@CurrentUser() user: RequestUser, @Query() query: DashboardSummaryQueryDto) {
    return this.service.dashboardSummary(user.sub, { ...query, channels: 'ExpressMart' });
  }

  @Get('orders')
  orders(@CurrentUser() user: RequestUser, @Query() query: SellerOrdersQueryDto) {
    return this.service.orders(user.sub, { ...query, channel: 'ExpressMart' });
  }

  @Get('orders/:id')
  order(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.orderDetail(user.sub, id, 'ExpressMart');
  }

  @Patch('orders/:id')
  updateOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: UpdateOrderDto
  ) {
    return this.service.updateOrder(user.sub, id, payload, 'ExpressMart');
  }

  @Get('returns')
  returns(@CurrentUser() user: RequestUser) {
    return this.service.returns(user.sub, { channel: 'ExpressMart' });
  }

  @Get('disputes')
  disputes(@CurrentUser() user: RequestUser) {
    return this.service.disputes(user.sub, { channel: 'ExpressMart' });
  }
}
