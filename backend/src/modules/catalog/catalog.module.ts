import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { SellersModule } from '../sellers/sellers.module.js';

@Module({
  imports: [SellersModule],
  controllers: [CatalogController],
  providers: [CatalogService]
})
export class CatalogModule {}
