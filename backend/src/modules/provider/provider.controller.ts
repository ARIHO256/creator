import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { FlexiblePayloadValidationPipe } from '../../common/pipes/flexible-payload-validation.pipe.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateProviderBookingRequestDto } from './dto/create-provider-booking-request.dto.js';
import { CreateProviderConsultationRequestDto } from './dto/create-provider-consultation-request.dto.js';
import { CreateProviderQuoteDto } from './dto/create-provider-quote.dto.js';
import { ProviderTransitionDto } from './dto/provider-transition.dto.js';
import { ProviderFulfillmentTransitionDto } from './dto/provider-fulfillment-transition.dto.js';
import { UpdateProviderPortfolioDto } from './dto/update-provider-portfolio.dto.js';
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
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('quotes/:id/transition')
  transitionQuote(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ProviderTransitionDto) {
    return this.service.transitionQuote(user.sub, id, body);
  }
  @Get('joint-quotes') jointQuotes(@CurrentUser() user: RequestUser) { return this.service.jointQuotes(user.sub); }
  @Get('joint-quotes/:id') jointQuote(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.jointQuote(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('joint-quotes') createJointQuote(@CurrentUser() user: RequestUser, @Body() body: CreateProviderQuoteDto) { return this.service.createJointQuote(user.sub, body); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('joint-quotes/:id')
  updateJointQuote(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: CreateProviderQuoteDto) {
    return this.service.updateJointQuote(user.sub, id, body);
  }
  @Get('consultations') consultations(@CurrentUser() user: RequestUser) { return this.service.consultations(user.sub); }
  @Roles('SELLER', 'PROVIDER', 'CREATOR', 'ADMIN')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('consultations')
  requestConsultation(@CurrentUser() user: RequestUser, @Body() body: CreateProviderConsultationRequestDto) {
    return this.service.requestConsultation(user, body);
  }
  @Get('bookings') bookings(@CurrentUser() user: RequestUser) { return this.service.bookings(user.sub); }
  @Roles('SELLER', 'PROVIDER', 'CREATOR', 'ADMIN')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('bookings')
  requestBooking(@CurrentUser() user: RequestUser, @Body() body: CreateProviderBookingRequestDto) {
    return this.service.requestBooking(user, body);
  }
  @Get('bookings/:id') booking(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.booking(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('bookings/:id/transition')
  transitionBooking(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ProviderTransitionDto) {
    return this.service.transitionBooking(user.sub, id, body);
  }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('fulfillments/:id/transition')
  transitionFulfillment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ProviderFulfillmentTransitionDto
  ) {
    return this.service.transitionFulfillment(user.sub, id, body);
  }
  @Get('portfolio') portfolio(@CurrentUser() user: RequestUser) { return this.service.portfolio(user.sub); }
  @Patch('portfolio')
  updatePortfolio(@CurrentUser() user: RequestUser, @Body(new FlexiblePayloadValidationPipe(UpdateProviderPortfolioDto)) body: UpdateProviderPortfolioDto) {
    return this.service.updatePortfolio(user.sub, body.payload);
  }
  @Get('quote-templates') quoteTemplates(@CurrentUser() user: RequestUser) { return this.service.quoteTemplates(user.sub); }
  @Get('reviews') reviews(@CurrentUser() user: RequestUser) { return this.service.reviews(user.sub); }
  @Get('disputes') disputes(@CurrentUser() user: RequestUser) { return this.service.disputes(user.sub); }
}
