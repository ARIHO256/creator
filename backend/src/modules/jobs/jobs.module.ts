import { Global, Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { JobsWorker } from './jobs.worker.js';

@Global()
@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsWorker],
  exports: [JobsService, JobsWorker]
})
export class JobsModule {}
