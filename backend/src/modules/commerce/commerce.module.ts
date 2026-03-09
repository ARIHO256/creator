import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { CommerceController } from './commerce.controller.js';
import { CommerceService } from './commerce.service.js';
import { ExpressmartController } from './expressmart.controller.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [TaxonomyModule, SellersModule, JobsModule],
  controllers: [CommerceController, ExpressmartController],
  providers: [CommerceService]
})
export class CommerceModule {}
