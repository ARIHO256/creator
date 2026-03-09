import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateProviderQuoteDto } from './dto/create-provider-quote.dto.js';
import { ProviderService } from './provider.service.js';

@Controller('provider')
@Roles('PROVIDER', 'ADMIN')
export class ProviderController {
  constructor(private readonly service: ProviderService) {}

  @Get('service-command') serviceCommand(@CurrentUser() user: RequestUser) { return this.service.serviceCommand(user.sub); }
  @Get('quotes') quotes(@CurrentUser() user: RequestUser) { return this.service.quotes(user.sub); }
  @Get('quotes/:id') quote(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.quote(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('quotes') createQuote(@CurrentUser() user: RequestUser, @Body() body: CreateProviderQuoteDto) { return this.service.createQuote(user.sub, body); }
  @Get('joint-quotes') jointQuotes(@CurrentUser() user: RequestUser) { return this.service.jointQuotes(user.sub); }
  @Get('consultations') consultations(@CurrentUser() user: RequestUser) { return this.service.consultations(user.sub); }
  @Get('bookings') bookings(@CurrentUser() user: RequestUser) { return this.service.bookings(user.sub); }
  @Get('bookings/:id') booking(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.booking(user.sub, id); }
  @Get('portfolio') portfolio(@CurrentUser() user: RequestUser) { return this.service.portfolio(user.sub); }
  @Get('reviews') reviews(@CurrentUser() user: RequestUser) { return this.service.reviews(user.sub); }
  @Get('disputes') disputes(@CurrentUser() user: RequestUser) { return this.service.disputes(user.sub); }
}
