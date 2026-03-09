import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime.publisher.js';
import { RealtimeService } from './realtime.service.js';
import { RealtimeStreamService } from './realtime.stream.service.js';
import { RealtimeSubscriber } from './realtime.subscriber.js';
import { RealtimeStreamController } from './realtime.stream.controller.js';
import { RealtimeDeliveryService } from './realtime-delivery.service.js';
import { RealtimeDeliveryController } from './realtime-delivery.controller.js';
import { RealtimeDeliveryScheduler } from './realtime-delivery.scheduler.js';

@Global()
@Module({
  controllers: [RealtimeStreamController, RealtimeDeliveryController],
  providers: [
    RealtimeService,
    RealtimePublisher,
    RealtimeStreamService,
    RealtimeSubscriber,
    RealtimeDeliveryService,
    RealtimeDeliveryScheduler
  ],
  exports: [RealtimeService, RealtimePublisher, RealtimeStreamService, RealtimeDeliveryService]
})
export class RealtimeModule {}
