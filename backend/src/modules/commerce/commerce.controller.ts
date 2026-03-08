import { Controller, Get, Param, Query } from '@nestjs/common';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CommerceService } from './commerce.service.js';

@Controller('seller')
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  @Get('dashboard') dashboard(@CurrentUser() user: RequestUser) { return this.service.dashboard(user.sub); }
  @Get('listings') listings(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) { return this.service.listings(user.sub, query); }
  @Get('listings/:id') listing(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.listingDetail(user.sub, id); }
  @Get('listing-wizard') listingWizard(@CurrentUser() user: RequestUser) { return this.service.listingWizard(user.sub); }
  @Get('orders') orders(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) { return this.service.orders(user.sub, query); }
  @Get('orders/:id') order(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.orderDetail(user.sub, id); }
  @Get('returns') returns(@CurrentUser() user: RequestUser) { return this.service.returns(user.sub); }
  @Get('disputes') disputes(@CurrentUser() user: RequestUser) { return this.service.disputes(user.sub); }
  @Get('inventory') inventory(@CurrentUser() user: RequestUser) { return this.service.inventory(user.sub); }
  @Get('shipping-profiles') shippingProfiles(@CurrentUser() user: RequestUser) { return this.service.shippingProfiles(user.sub); }
  @Get('warehouses') warehouses(@CurrentUser() user: RequestUser) { return this.service.warehouses(user.sub); }
  @Get('exports') exports(@CurrentUser() user: RequestUser) { return this.service.exports(user.sub); }
  @Get('documents') documents(@CurrentUser() user: RequestUser) { return this.service.documents(user.sub); }
  @Get('finance/wallets') wallets(@CurrentUser() user: RequestUser) { return this.service.financeWallets(user.sub); }
  @Get('finance/holds') holds(@CurrentUser() user: RequestUser) { return this.service.financeHolds(user.sub); }
  @Get('finance/invoices') invoices(@CurrentUser() user: RequestUser) { return this.service.financeInvoices(user.sub); }
  @Get('finance/statements') statements(@CurrentUser() user: RequestUser) { return this.service.financeStatements(user.sub); }
  @Get('finance/tax-reports') taxReports(@CurrentUser() user: RequestUser) { return this.service.financeTaxReports(user.sub); }
}
