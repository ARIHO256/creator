import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { CommerceController } from './commerce.controller.js';
import { CommerceService } from './commerce.service.js';

@Module({
  imports: [TaxonomyModule, SellersModule],
  controllers: [CommerceController],
  providers: [CommerceService]
})
export class CommerceModule {}
