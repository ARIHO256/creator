import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { RealtimeModule } from '../../platform/realtime/realtime.module.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';

@Module({
  imports: [AuditModule, RealtimeModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService]
})
export class CommunicationsModule {}
