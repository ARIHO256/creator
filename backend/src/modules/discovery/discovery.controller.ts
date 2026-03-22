import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CachePolicy } from '../../common/decorators/cache-policy.decorator.js';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DiscoveryService } from './discovery.service.js';
import { CreateInviteDto } from './dto/create-invite.dto.js';
import { FollowToggleDto } from './dto/follow-toggle.dto.js';
import { RespondInviteDto } from './dto/respond-invite.dto.js';
import { SaveOpportunityDto } from './dto/save-opportunity.dto.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @CachePolicy({ maxAge: 30, sMaxAge: 120, staleWhileRevalidate: 60, staleIfError: 300 })
  @Get('sellers')
  sellers(@Query() query: ListQueryDto) {
    return this.discoveryService.sellers(query);
  }

  @Post('sellers/:id/follow')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  followSeller(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: FollowToggleDto) {
    return this.discoveryService.followSeller(user.sub, id, body.follow ?? true);
  }

  @Get('my-sellers')
  mySellers(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.mySellers(user.sub, query);
  }

  @Get('creators')
  creators(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.creators(user.sub, query);
  }

  @Get('creators/:id/profile')
  creatorProfile(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.creatorProfile(user.sub, id);
  }

  @Post('creators/:id/follow')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  followCreator(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: FollowToggleDto) {
    return this.discoveryService.followCreator(user.sub, id, body.follow ?? true);
  }

  @Get('my-creators')
  myCreators(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.myCreators(user.sub, query);
  }

  @Get('my-creators/workspace')
  myCreatorsWorkspace(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.myCreatorsWorkspace(user.sub, query);
  }

  @Get('opportunities')
  opportunities(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.opportunities(user.sub, query);
  }

  @Get('opportunities/:id')
  opportunity(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.opportunity(user.sub, id);
  }

  @Post('opportunities/:id/save')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  saveOpportunity(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: SaveOpportunityDto) {
    return this.discoveryService.saveOpportunity(user.sub, id, body.save ?? true);
  }

  @Get('campaign-board')
  campaignBoard(@CurrentUser() user: RequestUser) {
    return this.discoveryService.campaignBoard(user.sub);
  }

  @Get('dealz-marketplace')
  dealzMarketplace(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.dealzMarketplace(user.sub, query);
  }

  @Get('invites')
  invites(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.invites(user.sub, query);
  }

  @Post('invites')
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createInvite(@CurrentUser() user: RequestUser, @Body() body: CreateInviteDto) {
    return this.discoveryService.createInvite(user.sub, body);
  }

  @Post('invites/:id/respond')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  respondInvite(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: RespondInviteDto) {
    return this.discoveryService.respondInvite(user.sub, id, body.status);
  }

  @Get('search')
  search(@CurrentUser() user: RequestUser, @Query() query: SearchQueryDto) {
    return this.discoveryService.search(user.sub, query);
  }
}
