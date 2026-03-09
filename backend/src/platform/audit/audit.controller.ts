import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';
import { ListAuditEventsDto } from './dto/list-audit-events.dto.js';

@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('audit/events')
  @Roles('ADMIN', 'SUPPORT')
  list(@Query() query: ListAuditEventsDto) {
    return this.audit.list(query);
  }
}
