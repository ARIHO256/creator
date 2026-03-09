import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JobsService } from './jobs.service.js';
import { ListBackgroundJobsDto } from './dto/list-background-jobs.dto.js';

@Controller('jobs')
@Roles('ADMIN', 'SUPPORT')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(@Query() query: ListBackgroundJobsDto) {
    return this.jobsService.list(query);
  }

  @Get('metrics')
  metrics() {
    return this.jobsService.metrics();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.jobsService.get(id);
  }

  @Post(':id/requeue')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  requeue(@Param('id') id: string) {
    return this.jobsService.requeue(id);
  }
}
