import { Controller, Get, Headers } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { RealtimeStreamService } from './realtime.stream.service.js';
import type { FastifyReply } from 'fastify';
import { Res } from '@nestjs/common';

@Controller()
export class RealtimeStreamController {
  constructor(private readonly streamService: RealtimeStreamService) {}

  @Get('realtime/stream')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  stream(
    @CurrentUser() user: RequestUser,
    @Headers('last-event-id') lastEventId: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    this.streamService.open(user.sub, reply, lastEventId);
  }
}
