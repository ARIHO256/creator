import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateMarketplaceListingDto } from './dto/create-marketplace-listing.dto.js';
import { MarketplaceService } from './marketplace.service.js';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('feed')
  getFeed() {
    return this.marketplaceService.getMarketplaceFeed();
  }

  @Public()
  @Get('sellers')
  sellers() {
    return this.marketplaceService.listSellers();
  }

  @Get('opportunities')
  opportunities() {
    return this.marketplaceService.listOpportunities();
  }

  @Get('listings')
  listings() {
    return this.marketplaceService.listListings();
  }

  @Post('listings')
  createListing(@CurrentUser() user: RequestUser, @Body() payload: CreateMarketplaceListingDto) {
    return this.marketplaceService.createListing(user.sub, payload);
  }
}
