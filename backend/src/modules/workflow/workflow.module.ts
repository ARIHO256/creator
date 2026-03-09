import { Module } from '@nestjs/common';
import { TaxonomyModule } from '../taxonomy/taxonomy.module.js';
import { WorkflowController } from './workflow.controller.js';
import { WorkflowService } from './workflow.service.js';

@Module({
  imports: [TaxonomyModule],
  controllers: [WorkflowController],
  providers: [WorkflowService]
})
export class WorkflowModule {}
