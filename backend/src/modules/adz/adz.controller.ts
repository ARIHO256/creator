import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AdzService } from './adz.service.js';

@Controller()
export class AdzController {
  constructor(private readonly service: AdzService) {}

  @Get('adz/builder/:id') builder(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.builder(id, user.sub); }
  @Post('adz/builder/save') saveBuilder(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.saveBuilder(user.sub, body); }
  @Post('adz/builder/:id/publish') publishBuilder(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.publishBuilder(user.sub, id, body); }

  @Get('adz/campaigns') campaigns(@CurrentUser() user: RequestUser) { return this.service.campaigns(user.sub); }
  @Get('adz/campaigns/:id') campaign(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.campaign(user.sub, id); }
  @Get('adz/marketplace') marketplace(@CurrentUser() user: RequestUser) { return this.service.marketplace(user.sub); }
  @Post('adz/campaigns') createCampaign(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createCampaign(user.sub, body); }
  @Patch('adz/campaigns/:id') updateCampaign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateCampaign(user.sub, id, body); }
  @Get('adz/campaigns/:id/performance') performance(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.performance(user.sub, id); }
  @Get('promo-ads/:id') promoAd(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.promoAd(user.sub, id); }

  @Get('links') links(@CurrentUser() user: RequestUser) { return this.service.links(user.sub); }
  @Get('links/:id') link(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.link(user.sub, id); }
  @Post('links') createLink(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createLink(user.sub, body); }
  @Patch('links/:id') updateLink(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateLink(user.sub, id, body); }
}
