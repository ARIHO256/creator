import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async metricsEndpoint() {
    return this.metrics.getMetrics();
  }
}
