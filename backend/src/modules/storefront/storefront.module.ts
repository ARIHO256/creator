import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { SearchModule } from '../search/search.module.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { StorefrontController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';

@Module({
  imports: [SellersModule, TaxonomyModule, SearchModule],
  controllers: [StorefrontController],
  providers: [StorefrontService]
})
export class StorefrontModule {}
