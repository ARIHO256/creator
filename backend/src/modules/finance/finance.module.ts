import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { SellersModule } from '../sellers/sellers.module.js';
import { FinanceController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';

@Module({
  imports: [SellersModule, AuditModule, JobsModule],
  controllers: [FinanceController],
  providers: [FinanceService]
})
export class FinanceModule {}
