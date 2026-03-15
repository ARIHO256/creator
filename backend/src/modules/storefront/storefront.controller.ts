import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CachePolicy } from '../../common/decorators/cache-policy.decorator.js';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { UpdateStorefrontDto } from './dto/update-storefront.dto.js';
import { StorefrontService } from './storefront.service.js';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Roles('SELLER', 'ADMIN')
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.storefrontService.getMyStorefront(user.sub);
  }

  @Roles('SELLER', 'ADMIN')
  @Patch('me')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateMe(@CurrentUser() user: RequestUser, @Body() payload: UpdateStorefrontDto) {
    return this.storefrontService.updateMyStorefront(user.sub, payload);
  }

  @Public()
  @CachePolicy({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 120, staleIfError: 600 })
  @Get(':handle')
  publicStorefront(@Param('handle') handle: string) {
    return this.storefrontService.getPublicStorefront(handle);
  }

  @Public()
  @CachePolicy({ maxAge: 30, sMaxAge: 120, staleWhileRevalidate: 60, staleIfError: 300 })
  @Get(':handle/listings')
  publicListings(@Param('handle') handle: string, @Query() query: ListQueryDto) {
    return this.storefrontService.listStorefrontListings(handle, query);
  }
}
