import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { LiveService } from './live.service.js';

@Controller()
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Get('live/builder/:id') builder(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.builder(id, user.sub); }
  @Post('live/builder/save') saveBuilder(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.saveBuilder(user.sub, body); }
  @Post('live/builder/:id/publish') publishBuilder(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.publishBuilder(user.sub, id, body); }
  @Get('live/campaigns/:campaignId/giveaways') campaignGiveaways(@Param('campaignId') campaignId: string) { return this.service.campaignGiveaways(campaignId); }

  @Get('live/sessions') sessions(@CurrentUser() user: RequestUser) { return this.service.sessions(user.sub); }
  @Get('live/sessions/:id') session(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.session(user.sub, id); }
  @Post('live/sessions') createSession(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createSession(user.sub, body); }
  @Patch('live/sessions/:id') updateSession(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateSession(user.sub, id, body); }

  @Get('live/studio/default') studioDefault(@CurrentUser() user: RequestUser) { return this.service.studio(user.sub, 'default'); }
  @Get('live/studio/:id') studio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.studio(user.sub, id); }
  @Post('live/studio/:id/start') startStudio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.startStudio(user.sub, id); }
  @Post('live/studio/:id/end') endStudio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.endStudio(user.sub, id); }
  @Post('live/studio/:id/moments') addMoment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.addMoment(user.sub, id, body); }

  @Get('live/replays') replays(@CurrentUser() user: RequestUser) { return this.service.replays(user.sub); }
  @Get('live/replays/:id') replay(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.replay(user.sub, id); }
  @Get('live/replays/by-session/:sessionId') replayBySession(@CurrentUser() user: RequestUser, @Param('sessionId') sessionId: string) { return this.service.replayBySession(user.sub, sessionId); }
  @Patch('live/replays/:id') updateReplay(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateReplay(user.sub, id, body); }
  @Post('live/replays/:id/publish') publishReplay(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.publishReplay(user.sub, id, body); }

  @Get('live/reviews') reviews(@CurrentUser() user: RequestUser) { return this.service.reviews(user.sub); }

  @Get('tools/audience-notifications') toolAudience(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'audience-notifications'); }
  @Get('tools/live-alerts') toolAlerts(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'live-alerts'); }
  @Get('tools/overlays') toolOverlays(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'overlays'); }
  @Get('tools/post-live') toolPostLive(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'post-live'); }
  @Get('tools/streaming') toolStreaming(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'streaming'); }
  @Get('tools/safety') toolSafety(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'safety'); }

  @Patch('tools/audience-notifications') patchAudience(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'audience-notifications', body); }
  @Patch('tools/live-alerts') patchAlerts(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'live-alerts', body); }
  @Patch('tools/overlays') patchOverlays(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'overlays', body); }
  @Patch('tools/post-live') patchPostLive(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'post-live', body); }
  @Patch('tools/streaming') patchStreaming(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'streaming', body); }
  @Patch('tools/safety') patchSafety(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.toolPatch(user.sub, 'safety', body); }
}
