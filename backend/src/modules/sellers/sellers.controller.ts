import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateSellerListingDto } from './dto/create-seller-listing.dto.js';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto.js';
import { UpdateSellerListingDto } from './dto/update-seller-listing.dto.js';
import { SellersService } from './sellers.service.js';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('me/profile')
  me(@CurrentUser() user: RequestUser) {
    return this.sellersService.getMyProfile(user.sub);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Patch('me/profile')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateMe(@CurrentUser() user: RequestUser, @Body() payload: UpdateSellerProfileDto) {
    return this.sellersService.updateMyProfile(user.sub, payload);
  }

  @Public()
  @Get('public/:handle')
  publicProfile(@Param('handle') handle: string) {
    return this.sellersService.getPublicProfile(handle);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('me/listings')
  listings(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.sellersService.listMyListings(user.sub, query);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Post('me/listings')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createListing(@CurrentUser() user: RequestUser, @Body() payload: CreateSellerListingDto) {
    return this.sellersService.createListing(user.sub, payload);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Patch('me/listings/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateListing(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateSellerListingDto) {
    return this.sellersService.updateListing(user.sub, id, payload);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('me/orders')
  orders(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.sellersService.listOrders(user.sub, query);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('me/orders/:id')
  order(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.sellersService.getOrder(user.sub, id);
  }

  @Roles('SELLER', 'PROVIDER', 'ADMIN')
  @Get('me/transactions')
  transactions(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.sellersService.listTransactions(user.sub, query);
  }
}
