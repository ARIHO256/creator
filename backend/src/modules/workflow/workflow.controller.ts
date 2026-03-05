import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { WorkflowService } from './workflow.service.js';

@Controller()
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('uploads') uploads(@CurrentUser() user: RequestUser) { return this.service.uploads(user.sub); }
  @Post('uploads') createUpload(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createUpload(user.sub, body); }

  @Get('onboarding') onboarding(@CurrentUser() user: RequestUser) { return this.service.onboarding(user.sub); }
  @Patch('onboarding') patchOnboarding(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.patchOnboarding(user.sub, body); }
  @Post('onboarding/reset') resetOnboarding(@CurrentUser() user: RequestUser) { return this.service.resetOnboarding(user.sub); }
  @Post('onboarding/submit') submitOnboarding(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.submitOnboarding(user.sub, body); }

  @Get('account-approval') accountApproval(@CurrentUser() user: RequestUser) { return this.service.accountApproval(user.sub); }
  @Patch('account-approval') patchAccountApproval(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.patchAccountApproval(user.sub, body); }
  @Post('account-approval/refresh') refreshAccountApproval(@CurrentUser() user: RequestUser) { return this.service.refreshAccountApproval(user.sub); }
  @Post('account-approval/resubmit') resubmitAccountApproval(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.resubmitAccountApproval(user.sub, body); }
  @Post('account-approval/dev-approve') devApprove(@CurrentUser() user: RequestUser) { return this.service.devApprove(user.sub); }

  @Get('content-approvals') contentApprovals(@CurrentUser() user: RequestUser) { return this.service.contentApprovals(user.sub); }
  @Get('content-approvals/:id') contentApproval(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.contentApproval(user.sub, id); }
  @Post('content-approvals') createContentApproval(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createContentApproval(user.sub, body); }
  @Patch('content-approvals/:id') patchContentApproval(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.patchContentApproval(user.sub, id, body); }
  @Post('content-approvals/:id/nudge') nudge(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.nudge(user.sub, id); }
  @Post('content-approvals/:id/withdraw') withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.withdraw(user.sub, id); }
  @Post('content-approvals/:id/resubmit') resubmit(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.resubmit(user.sub, id, body); }
}
