import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CommunicationsService } from './communications.service.js';

@Controller()
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('messages') messages(@CurrentUser() user: RequestUser) { return this.service.messages(user.sub); }
  @Get('messages/:threadId') thread(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string) { return this.service.messageThread(user.sub, threadId); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Post('messages/:threadId/reply') reply(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string, @Body() body: SendMessageDto) { return this.service.sendMessage(user.sub, threadId, body); }
  @RateLimit({ limit: 60, windowMs: 60_000 })
  @Patch('messages/:threadId/read') markRead(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string) { return this.service.markThreadRead(user.sub, threadId); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('messages/read-all') readAll(@CurrentUser() user: RequestUser) { return this.service.markAllRead(user.sub); }
  @Get('help-support/content') helpSupport(@CurrentUser() user: RequestUser) { return this.service.helpSupport(user.sub); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('help-support/tickets') createTicket(@CurrentUser() user: RequestUser, @Body() body: CreateSupportTicketDto) { return this.service.createTicket(user.sub, body); }
  @Get('system-status') systemStatus(@CurrentUser() user: RequestUser) { return this.service.systemStatus(user.sub); }
}
