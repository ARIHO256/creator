import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DiscoveryService } from './discovery.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('sellers')
  sellers(@Query() query: ListQueryDto) {
    return this.discoveryService.sellers(query);
  }

  @Post('sellers/:id/follow')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  followSeller(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { follow?: boolean }) {
    return this.discoveryService.followSeller(user.sub, id, body.follow ?? true);
  }

  @Get('my-sellers')
  mySellers(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.mySellers(user.sub, query);
  }

  @Post('creators/:id/follow')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  followCreator(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { follow?: boolean }) {
    return this.discoveryService.followCreator(user.sub, id, body.follow ?? true);
  }

  @Get('my-creators')
  myCreators(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) {
    return this.discoveryService.myCreators(user.sub, query);
  }

  @Get('opportunities')
  opportunities(@Query() query: ListQueryDto) {
    return this.discoveryService.opportunities(query);
  }

  @Get('opportunities/:id')
  opportunity(@Param('id') id: string) {
    return this.discoveryService.opportunity(id);
  }

  @Post('opportunities/:id/save')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  saveOpportunity(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { save?: boolean }) {
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

  @Post('invites/:id/respond')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  respondInvite(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.discoveryService.respondInvite(user.sub, id, body.status);
  }

  @Get('search')
  search(@CurrentUser() user: RequestUser, @Query() query: SearchQueryDto) {
    return this.discoveryService.search(user.sub, query);
  }
}
