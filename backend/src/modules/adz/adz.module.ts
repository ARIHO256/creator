import { Module } from '@nestjs/common';
import { AdzController } from './adz.controller.js';
import { AdzService } from './adz.service.js';

@Module({
  controllers: [AdzController],
  providers: [AdzService]
})
export class AdzModule {}
