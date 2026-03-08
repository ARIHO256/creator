import { Module } from '@nestjs/common';
import { WholesaleController } from './wholesale.controller.js';
import { WholesaleService } from './wholesale.service.js';

@Module({
  controllers: [WholesaleController],
  providers: [WholesaleService]
})
export class WholesaleModule {}
