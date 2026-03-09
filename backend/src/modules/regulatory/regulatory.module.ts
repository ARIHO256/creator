import { Module } from '@nestjs/common';
import { RegulatoryController } from './regulatory.controller.js';
import { RegulatoryService } from './regulatory.service.js';

@Module({
  controllers: [RegulatoryController],
  providers: [RegulatoryService]
})
export class RegulatoryModule {}
