import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';

@Module({
  imports: [SellersModule, TaxonomyModule],
  controllers: [StorefrontController],
  providers: [StorefrontService]
})
export class StorefrontModule {}
