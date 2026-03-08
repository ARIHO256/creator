import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CommunicationsService } from './communications.service.js';

@Controller()
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('messages') messages(@CurrentUser() user: RequestUser) { return this.service.messages(user.sub); }
  @Get('messages/:threadId') thread(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string) { return this.service.messageThread(user.sub, threadId); }
  @Post('messages/:threadId/reply') reply(@CurrentUser() user: RequestUser, @Param('threadId') threadId: string, @Body() body: { text: string; lang?: string }) { return this.service.sendMessage(user.sub, threadId, body); }
  @Get('help-support/content') helpSupport(@CurrentUser() user: RequestUser) { return this.service.helpSupport(user.sub); }
  @Post('help-support/tickets') createTicket(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createTicket(user.sub, body); }
  @Get('system-status') systemStatus(@CurrentUser() user: RequestUser) { return this.service.systemStatus(user.sub); }
}
