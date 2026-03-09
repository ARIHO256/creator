import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { SellersController } from './sellers.controller.js';
import { SellersService } from './sellers.service.js';

@Module({
  imports: [SearchModule],
  controllers: [SellersController],
  providers: [SellersService],
  exports: [SellersService]
})
export class SellersModule {}
