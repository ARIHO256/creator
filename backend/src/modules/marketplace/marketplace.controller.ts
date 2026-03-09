import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';
import { MarketplaceService } from './marketplace.service.js';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('feed')
  getFeed(@Query() query: ListQueryDto) {
    return this.marketplaceService.getMarketplaceFeed(query);
  }

  @Public()
  @Get('sellers')
  sellers(@Query() query: ListQueryDto) {
    return this.marketplaceService.listSellers(query);
  }

  @Get('opportunities')
  opportunities(@Query() query: ListQueryDto) {
    return this.marketplaceService.listOpportunities(query);
  }

  @Get('listings')
  listings(@Query() query: ListQueryDto) {
    return this.marketplaceService.listListings(query);
  }

  @Post('listings')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createListing(@CurrentUser() user: RequestUser, @Body() payload: CreateMarketplaceListingDto) {
    return this.marketplaceService.createListing(user.sub, payload);
  }
}
