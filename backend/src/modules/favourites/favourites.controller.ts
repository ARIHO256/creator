import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { FavouritesService } from './favourites.service.js';

@Controller('favourites')
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN')
export class FavouritesController {
  constructor(private readonly service: FavouritesService) {}

  @Get()
  listAll(@CurrentUser() user: RequestUser) {
    return this.service.listAll(user.sub);
  }

  @Get('listings')
  listListings(@CurrentUser() user: RequestUser) {
    return this.service.listListings(user.sub);
  }

  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('listings/:id')
  addListing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.addListing(user.sub, id);
  }

  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Delete('listings/:id')
  removeListing(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.removeListing(user.sub, id);
  }
}
