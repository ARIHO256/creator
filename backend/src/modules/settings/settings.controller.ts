import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateInviteDto } from './dto/create-invite.dto.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { SendPayoutCodeDto } from './dto/send-payout-code.dto.js';
import { UpdateCrewSessionDto } from './dto/update-crew-session.dto.js';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto.js';
import { UpdateKycDto } from './dto/update-kyc.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto.js';
import { UpdatePayoutMethodsDto } from './dto/update-payout-methods.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UpdateRolesSecurityDto } from './dto/update-roles-security.dto.js';
import { UpdateSavedViewsDto } from './dto/update-saved-views.dto.js';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { UpdateTaxDto } from './dto/update-tax.dto.js';
import { VerifyPayoutDto } from './dto/verify-payout.dto.js';
import { SettingsService } from './settings.service.js';

@Controller()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('settings') settings(@CurrentUser() user: RequestUser) { return this.service.settings(user.sub); }
  @Patch('settings')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateSettings(@CurrentUser() user: RequestUser, @Body() body: UpdateSettingsDto) { return this.service.updateSettings(user.sub, body); }
  @Get('settings/preferences') preferences(@CurrentUser() user: RequestUser) { return this.service.preferences(user.sub, user.role); }
  @Patch('settings/preferences')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updatePreferences(@CurrentUser() user: RequestUser, @Body() body: UpdatePreferencesDto) { return this.service.updatePreferences(user.sub, user.role, body); }
  @Get('settings/ui-state') uiState(@CurrentUser() user: RequestUser) { return this.service.uiState(user.sub, user.role); }
  @Patch('settings/ui-state')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateUiState(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.service.updateUiState(user.sub, user.role, body);
  }
  @Get('settings/payout-methods') payoutMethods(@CurrentUser() user: RequestUser) { return this.service.payoutMethods(user.sub); }
  @Patch('settings/payout-methods')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updatePayoutMethods(@CurrentUser() user: RequestUser, @Body() body: UpdatePayoutMethodsDto) { return this.service.updatePayoutMethods(user.sub, body); }
  @Get('settings/security') securitySettings(@CurrentUser() user: RequestUser) { return this.service.securitySettings(user.sub); }
  @Patch('settings/security')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateSecuritySettings(@CurrentUser() user: RequestUser, @Body() body: UpdateSecuritySettingsDto) { return this.service.updateSecuritySettings(user.sub, body); }
  @Get('settings/integrations') integrations(@CurrentUser() user: RequestUser) { return this.service.integrations(user.sub); }
  @Patch('settings/integrations')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateIntegrations(@CurrentUser() user: RequestUser, @Body() body: UpdateIntegrationsDto) { return this.service.updateIntegrations(user.sub, body); }
  @Get('settings/tax') tax(@CurrentUser() user: RequestUser) { return this.service.tax(user.sub); }
  @Patch('settings/tax')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateTax(@CurrentUser() user: RequestUser, @Body() body: UpdateTaxDto) { return this.service.updateTax(user.sub, body); }
  @Get('settings/kyc') kyc(@CurrentUser() user: RequestUser) { return this.service.kyc(user.sub); }
  @Patch('settings/kyc')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  updateKyc(@CurrentUser() user: RequestUser, @Body() body: UpdateKycDto) { return this.service.updateKyc(user.sub, body); }
  @Get('settings/saved-views') savedViews(@CurrentUser() user: RequestUser) { return this.service.savedViews(user.sub, user.role); }
  @Patch('settings/saved-views')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateSavedViews(@CurrentUser() user: RequestUser, @Body() body: UpdateSavedViewsDto) { return this.service.updateSavedViews(user.sub, user.role, body); }
  @Get('settings/help') help(@CurrentUser() user: RequestUser) { return this.service.help(user.sub); }
  @Get('settings/status-center') statusCenter(@CurrentUser() user: RequestUser) { return this.service.statusCenter(user.sub); }
  @Get('settings/notification-preferences') notificationPreferences(@CurrentUser() user: RequestUser) { return this.service.notificationPreferences(user.sub, user.role); }
  @Patch('settings/notification-preferences')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateNotificationPreferences(@CurrentUser() user: RequestUser, @Body() body: UpdateNotificationPreferencesDto) { return this.service.updateNotificationPreferences(user.sub, user.role, body); }
  @Post('settings/payout/send-code')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  sendPayoutCode(@CurrentUser() user: RequestUser, @Body() body: SendPayoutCodeDto) { return this.service.sendPayoutCode(user.sub, body); }
  @Post('settings/payout/verify')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  verifyPayout(@CurrentUser() user: RequestUser, @Body() body: VerifyPayoutDto) { return this.service.verifyPayout(user.sub, body); }
  @Delete('settings/devices/:id')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  signOutDevice(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.signOutDevice(user.sub, id); }
  @Post('settings/devices/sign-out-all')
  @RateLimit({ limit: 4, windowMs: 60_000 })
  signOutAll(@CurrentUser() user: RequestUser) { return this.service.signOutAll(user.sub); }

  @Get('notifications') notifications(@CurrentUser() user: RequestUser) { return this.service.notifications(user.sub, user.role); }
  @Patch('notifications/:id/read')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  notificationRead(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.notificationRead(user.sub, user.role, id); }
  @Patch('notifications/:id/unread')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  notificationUnread(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.notificationUnread(user.sub, user.role, id); }
  @Post('notifications/read-all')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  notificationReadAll(@CurrentUser() user: RequestUser) { return this.service.notificationReadAll(user.sub, user.role); }

  @Get('roles') roles(@CurrentUser() user: RequestUser) { return this.service.roles(user.sub); }
  @Patch('roles/security')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  security(@CurrentUser() user: RequestUser, @Body() body: UpdateRolesSecurityDto) { return this.service.security(user.sub, body); }
  @Post('roles')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  createRole(@CurrentUser() user: RequestUser, @Body() body: CreateRoleDto) { return this.service.createRole(user.sub, body); }
  @Patch('roles/:id')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  updateRole(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateRoleDto) { return this.service.updateRole(user.sub, id, body); }
  @Delete('roles/:id')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  deleteRole(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.deleteRole(user.sub, id); }
  @Post('roles/invites')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  createInvite(@CurrentUser() user: RequestUser, @Body() body: CreateInviteDto) { return this.service.createInvite(user.sub, body); }
  @Patch('roles/members/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  updateMember(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateMemberDto) { return this.service.updateMember(user.sub, id, body); }
  @Delete('roles/members/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  deleteMember(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.deleteMember(user.sub, id); }

  @Get('crew') crew(@CurrentUser() user: RequestUser) { return this.service.crew(user.sub); }
  @Patch('crew/sessions/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
  crewSession(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateCrewSessionDto) { return this.service.crewSession(user.sub, id, body); }
  @Get('audit-logs') auditLogs(@CurrentUser() user: RequestUser) { return this.service.auditLogs(user.sub); }
}
