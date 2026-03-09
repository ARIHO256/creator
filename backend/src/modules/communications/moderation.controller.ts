import { Body, Controller, Get, Patch, Post, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { ModerationActionDto } from './dto/moderation-action.dto.js';
import { ModerationFlagDto } from './dto/moderation-flag.dto.js';
import { ModerationFlagsQueryDto } from './dto/moderation-flags-query.dto.js';
import { ModerationService } from './moderation.service.js';

@Controller('support/moderation')
@Roles('SUPPORT', 'ADMIN')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('flags')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  createFlag(@CurrentUser() user: RequestUser, @Body() body: ModerationFlagDto) {
    return this.moderation.createFlag(user.sub, body);
  }

  @Get('flags')
  flags(@Query() query: ModerationFlagsQueryDto) {
    return this.moderation.flags(query);
  }

  @Get('flags/:id')
  flag(@Param('id') id: string) {
    return this.moderation.flag(id);
  }

  @Patch('flags/:id')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateFlag(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ModerationActionDto) {
    return this.moderation.updateFlag(user.sub, id, body);
  }
}
