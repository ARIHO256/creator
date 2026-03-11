import { Module } from '@nestjs/common';
import { SellerfrontController } from './sellerfront.controller.js';
import { SellerfrontService } from './sellerfront.service.js';

@Module({
  controllers: [SellerfrontController],
  providers: [SellerfrontService]
})
export class SellerfrontModule {}
