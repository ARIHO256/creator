import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('settings') settings(@CurrentUser() user: RequestUser) { return this.service.settings(user.sub); }
  @Patch('settings') updateSettings(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.updateSettings(user.sub, body); }
  @Post('settings/payout/send-code') sendPayoutCode(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.sendPayoutCode(user.sub, body); }
  @Post('settings/payout/verify') verifyPayout(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.verifyPayout(user.sub, body); }
  @Delete('settings/devices/:id') signOutDevice(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.signOutDevice(user.sub, id); }
  @Post('settings/devices/sign-out-all') signOutAll(@CurrentUser() user: RequestUser) { return this.service.signOutAll(user.sub); }

  @Get('notifications') notifications(@CurrentUser() user: RequestUser) { return this.service.notifications(user.sub); }
  @Patch('notifications/:id/read') notificationRead(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.notificationRead(user.sub, id); }
  @Post('notifications/read-all') notificationReadAll(@CurrentUser() user: RequestUser) { return this.service.notificationReadAll(user.sub); }

  @Get('roles') roles(@CurrentUser() user: RequestUser) { return this.service.roles(user.sub); }
  @Patch('roles/security') security(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.security(user.sub, body); }
  @Post('roles') createRole(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createRole(user.sub, body); }
  @Patch('roles/:id') updateRole(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateRole(user.sub, id, body); }
  @Delete('roles/:id') deleteRole(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.deleteRole(user.sub, id); }
  @Post('roles/invites') createInvite(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createInvite(user.sub, body); }
  @Patch('roles/members/:id') updateMember(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateMember(user.sub, id, body); }

  @Get('crew') crew(@CurrentUser() user: RequestUser) { return this.service.crew(user.sub); }
  @Patch('crew/sessions/:id') crewSession(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.crewSession(user.sub, id, body); }
  @Get('audit-logs') auditLogs(@CurrentUser() user: RequestUser) { return this.service.auditLogs(user.sub); }
}
