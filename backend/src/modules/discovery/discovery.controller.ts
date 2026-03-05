import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DiscoveryService } from './discovery.service.js';

@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('sellers')
  sellers() {
    return this.discoveryService.sellers();
  }

  @Post('sellers/:id/follow')
  followSeller(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { follow?: boolean }) {
    return this.discoveryService.followSeller(user.sub, id, body.follow ?? true);
  }

  @Get('my-sellers')
  mySellers(@CurrentUser() user: RequestUser) {
    return this.discoveryService.mySellers(user.sub);
  }

  @Get('opportunities')
  opportunities() {
    return this.discoveryService.opportunities();
  }

  @Get('opportunities/:id')
  opportunity(@Param('id') id: string) {
    return this.discoveryService.opportunity(id);
  }

  @Post('opportunities/:id/save')
  saveOpportunity(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { save?: boolean }) {
    return this.discoveryService.saveOpportunity(user.sub, id, body.save ?? true);
  }

  @Get('campaign-board')
  campaignBoard(@CurrentUser() user: RequestUser) {
    return this.discoveryService.campaignBoard(user.sub);
  }

  @Get('dealz-marketplace')
  dealzMarketplace(@CurrentUser() user: RequestUser) {
    return this.discoveryService.dealzMarketplace(user.sub);
  }

  @Get('invites')
  invites(@CurrentUser() user: RequestUser) {
    return this.discoveryService.invites(user.sub);
  }

  @Post('invites/:id/respond')
  respondInvite(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: { status: string }) {
    return this.discoveryService.respondInvite(user.sub, id, body.status);
  }
}
