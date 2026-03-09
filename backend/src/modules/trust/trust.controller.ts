import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateTrustContentDto } from './dto/create-trust-content.dto.js';
import { CreateTrustIncidentDto } from './dto/create-trust-incident.dto.js';
import { UpdateTrustContentDto } from './dto/update-trust-content.dto.js';
import { UpdateTrustIncidentDto } from './dto/update-trust-incident.dto.js';
import { TrustService } from './trust.service.js';

@Controller()
export class TrustController {
  constructor(private readonly service: TrustService) {}

  @Public()
  @Get('trust/content')
  content() {
    return this.service.content();
  }

  @Public()
  @Get('trust/incidents')
  incidents() {
    return this.service.incidents();
  }

  @Roles('ADMIN', 'SUPPORT')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('trust/content')
  createContent(@Body() body: CreateTrustContentDto) {
    return this.service.createContent(body);
  }

  @Roles('ADMIN', 'SUPPORT')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('trust/content/:id')
  updateContent(@Param('id') id: string, @Body() body: UpdateTrustContentDto) {
    return this.service.updateContent(id, body);
  }

  @Roles('ADMIN', 'SUPPORT')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('trust/incidents')
  createIncident(@Body() body: CreateTrustIncidentDto) {
    return this.service.createIncident(body);
  }

  @Roles('ADMIN', 'SUPPORT')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('trust/incidents/:id')
  updateIncident(@Param('id') id: string, @Body() body: UpdateTrustIncidentDto) {
    return this.service.updateIncident(id, body);
  }
}
