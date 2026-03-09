import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { DeliveryAckDto } from './dto/delivery-ack.dto.js';
import { DeliveryPendingQueryDto } from './dto/delivery-pending-query.dto.js';
import { RealtimeDeliveryService } from './realtime-delivery.service.js';

@Controller('realtime')
export class RealtimeDeliveryController {
  constructor(private readonly delivery: RealtimeDeliveryService) {}

  @Get('pending')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  pending(@CurrentUser() user: RequestUser, @Query() query: DeliveryPendingQueryDto) {
    return this.delivery.pending(user.sub, query.limit);
  }

  @Post('ack')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  ack(@CurrentUser() user: RequestUser, @Body() body: DeliveryAckDto) {
    return this.delivery.ack(user.sub, body.eventId);
  }
}
