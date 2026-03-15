import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';
import { JobsService } from '../../modules/jobs/jobs.service.js';

@Controller()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly jobsService: JobsService
  ) {}

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metricsEndpoint() {
    this.metrics.updateBackgroundJobs(await this.jobsService.metrics());
    return this.metrics.getMetrics();
  }
}
