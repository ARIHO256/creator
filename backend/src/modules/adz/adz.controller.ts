import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AdzService } from './adz.service.js';

@Controller()
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class AdzController {
  constructor(private readonly service: AdzService) {}

  @Get('adz/builder-config') builderConfig() { return this.service.builderConfig(); }
  @Get('adz/builder/:id') builder(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.builder(id, user.sub); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('adz/builder/save') saveBuilder(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.saveBuilder(user.sub, body); }
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('adz/builder/:id/publish') publishBuilder(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.publishBuilder(user.sub, id, body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('adz/validate-schedule') validateSchedule(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.validateSchedule(user.sub, body); }

  @Get('adz/campaigns') campaigns(@CurrentUser() user: RequestUser) { return this.service.campaigns(user.sub); }
  @Get('adz/campaigns/:id') campaign(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.campaign(user.sub, id); }
  @Get('adz/marketplace') marketplace(@CurrentUser() user: RequestUser) { return this.service.marketplace(user.sub); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('adz/campaigns') createCampaign(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.createCampaign(user.sub, body); }
  @RateLimit({ limit: 40, windowMs: 60_000 })
  @Patch('adz/campaigns/:id') updateCampaign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateCampaign(user.sub, id, body); }
  @Get('adz/campaigns/:id/performance') performance(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.performance(user.sub, id); }
  @Get('promo-ads/:id') promoAd(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.promoAd(user.sub, id); }

  @Get('links') links(@CurrentUser() user: RequestUser) { return this.service.links(user.sub); }
  @Get('links/:id') link(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.link(user.sub, id); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('links') createLink(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.createLink(user.sub, body); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Patch('links/:id') updateLink(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateLink(user.sub, id, body); }
}
