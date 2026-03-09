import { Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime.publisher.js';
import { RealtimeService } from './realtime.service.js';

@Module({
  providers: [RealtimeService, RealtimePublisher],
  exports: [RealtimeService, RealtimePublisher]
})
export class RealtimeModule {}
