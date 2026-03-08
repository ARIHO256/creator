import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { TaxonomyController } from './taxonomy.controller.js';
import { TaxonomyService } from './taxonomy.service.js';

@Module({
  imports: [SellersModule],
  controllers: [TaxonomyController],
  providers: [TaxonomyService],
  exports: [TaxonomyService]
})
export class TaxonomyModule {}
