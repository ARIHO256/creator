import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { LiveService } from './live.service.js';

@Controller()
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Get('live/builder/:id') builder(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.builder(id, user.sub); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('live/builder/save') saveBuilder(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.saveBuilder(user.sub, body); }
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('live/builder/:id/publish') publishBuilder(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.publishBuilder(user.sub, id, body); }
  @Get('live/campaigns/:campaignId/giveaways') campaignGiveaways(@CurrentUser() user: RequestUser, @Param('campaignId') campaignId: string) { return this.service.campaignGiveaways(user.sub, campaignId); }

  @Get('live/sessions') sessions(@CurrentUser() user: RequestUser) { return this.service.sessions(user.sub); }
  @Get('live/sessions/:id') session(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.session(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('live/sessions') createSession(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.createSession(user.sub, body); }
  @RateLimit({ limit: 40, windowMs: 60_000 })
  @Patch('live/sessions/:id') updateSession(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateSession(user.sub, id, body); }

  @Get('live/studio/default') studioDefault(@CurrentUser() user: RequestUser) { return this.service.studio(user.sub, 'default'); }
  @Get('live/studio/:id') studio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.studio(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('live/studio/:id/start') startStudio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.startStudio(user.sub, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('live/studio/:id/end') endStudio(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.endStudio(user.sub, id); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Post('live/studio/:id/moments') addMoment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.addMoment(user.sub, id, body); }

  @Get('live/replays') replays(@CurrentUser() user: RequestUser) { return this.service.replays(user.sub); }
  @Get('live/replays/:id') replay(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.replay(user.sub, id); }
  @Get('live/replays/by-session/:sessionId') replayBySession(@CurrentUser() user: RequestUser, @Param('sessionId') sessionId: string) { return this.service.replayBySession(user.sub, sessionId); }
  @RateLimit({ limit: 40, windowMs: 60_000 })
  @Patch('live/replays/:id') updateReplay(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.updateReplay(user.sub, id, body); }
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('live/replays/:id/publish') publishReplay(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.publishReplay(user.sub, id, body); }

  @Get('live/reviews') reviews(@CurrentUser() user: RequestUser) { return this.service.reviews(user.sub); }

  @Get('tools/audience-notifications') toolAudience(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'audience-notifications'); }
  @Get('tools/live-alerts') toolAlerts(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'live-alerts'); }
  @Get('tools/overlays') toolOverlays(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'overlays'); }
  @Get('tools/post-live') toolPostLive(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'post-live'); }
  @Get('tools/streaming') toolStreaming(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'streaming'); }
  @Get('tools/safety') toolSafety(@CurrentUser() user: RequestUser) { return this.service.toolGet(user.sub, 'safety'); }

  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/audience-notifications') patchAudience(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'audience-notifications', body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/live-alerts') patchAlerts(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'live-alerts', body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/overlays') patchOverlays(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'overlays', body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/post-live') patchPostLive(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'post-live', body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/streaming') patchStreaming(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'streaming', body); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('tools/safety') patchSafety(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.toolPatch(user.sub, 'safety', body); }
}
