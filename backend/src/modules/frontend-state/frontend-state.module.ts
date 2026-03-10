import { Module } from '@nestjs/common';
import { FrontendStateController } from './frontend-state.controller.js';
import { FrontendStateService } from './frontend-state.service.js';

@Module({
  controllers: [FrontendStateController],
  providers: [FrontendStateService],
  exports: [FrontendStateService]
})
export class FrontendStateModule {}
