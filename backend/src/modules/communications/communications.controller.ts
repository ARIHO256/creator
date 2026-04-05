import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { AssignSupportTicketDto } from './dto/assign-support-ticket.dto.js';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto.js';
import { EscalateSupportTicketDto } from './dto/escalate-support-ticket.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto.js';
import { UpdateMessageTemplatesDto } from './dto/update-message-templates.dto.js';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto.js';
import { CommunicationsService } from './communications.service.js';

@Controller()
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('messages') messages(@CurrentUser() user: RequestUser) { return this.service.messages(user.sub, user.role); }
  @Get('messages/:threadId') thread(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string) { return this.service.messageThread(user.sub, user.role, threadId); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Post('messages/:threadId/reply') reply(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string, @Body() body: SendMessageDto) { return this.service.sendMessage(user.sub, user.role, threadId, body); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Patch('messages/:threadId/read') markRead(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string) { return this.service.markThreadRead(user.sub, user.role, threadId); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('messages/templates')
  updateTemplates(@CurrentUser() user: RequestUser, @Body() body: UpdateMessageTemplatesDto) {
    return this.service.updateTemplates(user.sub, user.role, body.templates ?? []);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('messages/read-all') readAll(@CurrentUser() user: RequestUser) { return this.service.markAllRead(user.sub, user.role); }
  @Get('help-support/content') helpSupport(@CurrentUser() user: RequestUser) { return this.service.helpSupport(user.sub, user.role); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('help-support/tickets') createTicket(@CurrentUser() user: RequestUser, @Body() body: CreateSupportTicketDto) { return this.service.createTicket(user.sub, user.role, body); }
  @Get('help-support/tickets/:id')
  supportTicket(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.supportTicket(user.sub, user.role, id); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('help-support/tickets/:id')
  updateOwnTicket(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateSupportTicketDto) {
    return this.service.updateOwnSupportTicket(user.sub, user.role, id, body);
  }
  @Get('system-status') systemStatus(@CurrentUser() user: RequestUser) { return this.service.systemStatus(user.sub); }

  @Roles('SUPPORT', 'ADMIN')
  @Get('support/tickets')
  supportTickets(@Query() query: SupportTicketQueryDto) { return this.service.supportTicketsForStaff(query); }
  @Roles('SUPPORT', 'ADMIN')
  @Get('support/tickets/:id')
  supportTicketStaff(@Param('id') id: string) { return this.service.supportTicketForStaff(id); }
  @Roles('SUPPORT', 'ADMIN')
  @Patch('support/tickets/:id')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateSupportTicket(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateSupportTicketDto) {
    return this.service.updateSupportTicket(user.sub, id, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('support/tickets/:id/assign')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  assignSupportTicket(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: AssignSupportTicketDto) {
    return this.service.assignSupportTicket(user.sub, id, body);
  }
  @Roles('SUPPORT', 'ADMIN')
  @Post('support/tickets/:id/escalate')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  escalateSupportTicket(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: EscalateSupportTicketDto) {
    return this.service.escalateSupportTicket(user.sub, id, body);
  }
}
