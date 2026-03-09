import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SearchService } from './search.service.js';
import { SearchListingsQueryDto } from './dto/search-listings-query.dto.js';
import { SearchStorefrontQueryDto } from './dto/search-storefront-query.dto.js';

@Controller('search')
@Roles('SELLER', 'PROVIDER', 'CREATOR', 'ADMIN')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('listings')
  listings(@Query() query: SearchListingsQueryDto) {
    return this.search.searchListings(query);
  }

  @Get('storefronts')
  storefronts(@Query() query: SearchStorefrontQueryDto) {
    return this.search.searchStorefronts(query);
  }

  @Post('reindex')
  @Roles('ADMIN')
  reindex(@Body() _body: Record<string, unknown>) {
    return this.search.reindexAll();
  }
}
