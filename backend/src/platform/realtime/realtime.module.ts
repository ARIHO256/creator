import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime.publisher.js';
import { RealtimeService } from './realtime.service.js';
import { RealtimeStreamService } from './realtime.stream.service.js';
import { RealtimeSubscriber } from './realtime.subscriber.js';
import { RealtimeStreamController } from './realtime.stream.controller.js';

@Global()
@Module({
  controllers: [RealtimeStreamController],
  providers: [RealtimeService, RealtimePublisher, RealtimeStreamService, RealtimeSubscriber],
  exports: [RealtimeService, RealtimePublisher, RealtimeStreamService]
})
export class RealtimeModule {}
