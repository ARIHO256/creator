import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { WholesaleService } from './wholesale.service.js';

@Controller('wholesale')
@Roles('SELLER', 'ADMIN')
export class WholesaleController {
  constructor(private readonly service: WholesaleService) {}

  @Get() home(@CurrentUser() user: RequestUser) { return this.service.home(user.sub); }
  @Get('price-lists') priceLists(@CurrentUser() user: RequestUser) { return this.service.priceLists(user.sub); }
  @Get('rfqs') rfqs(@CurrentUser() user: RequestUser) { return this.service.rfqs(user.sub); }
  @Get('quotes') quotes(@CurrentUser() user: RequestUser) { return this.service.quotes(user.sub); }
  @Get('quotes/:id') quote(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.quote(user.sub, id); }
  @Post('quotes') createQuote(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createQuote(user.sub, body); }
  @Get('incoterms') incoterms(@CurrentUser() user: RequestUser) { return this.service.incoterms(user.sub); }
}
