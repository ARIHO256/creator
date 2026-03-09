import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateUploadDto } from './dto/create-upload.dto.js';
import { UpdateAccountApprovalDto } from './dto/update-account-approval.dto.js';
import { UpdateAccountApprovalDecisionDto } from './dto/update-account-approval-decision.dto.js';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto.js';
import { WorkflowService } from './workflow.service.js';

@Controller()
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('uploads') uploads(@CurrentUser() user: RequestUser) { return this.service.uploads(user.sub); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('uploads') createUpload(@CurrentUser() user: RequestUser, @Body() body: CreateUploadDto) { return this.service.createUpload(user.sub, body); }

  @Get('onboarding') onboarding(@CurrentUser() user: RequestUser) { return this.service.onboarding(user.sub); }
  @Get('onboarding/slug-availability/:slug') slugAvailability(@CurrentUser() user: RequestUser, @Param('slug') slug: string) { return this.service.slugAvailability(user.sub, slug); }
  @Patch('onboarding')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  patchOnboarding(@CurrentUser() user: RequestUser, @Body() body: UpdateOnboardingDto) { return this.service.patchOnboarding(user.sub, body); }
  @Post('onboarding/reset')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  resetOnboarding(@CurrentUser() user: RequestUser) { return this.service.resetOnboarding(user.sub); }
  @Post('onboarding/submit')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  submitOnboarding(@CurrentUser() user: RequestUser, @Body() body: UpdateOnboardingDto) { return this.service.submitOnboarding(user.sub, body); }

  @Get('account-approval') accountApproval(@CurrentUser() user: RequestUser) { return this.service.accountApproval(user.sub); }
  @Patch('account-approval')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  patchAccountApproval(@CurrentUser() user: RequestUser, @Body() body: UpdateAccountApprovalDto) { return this.service.patchAccountApproval(user.sub, body); }
  @Post('account-approval/refresh')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  refreshAccountApproval(@CurrentUser() user: RequestUser) { return this.service.refreshAccountApproval(user.sub); }
  @Post('account-approval/resubmit')
  @RateLimit({ limit: 6, windowMs: 60_000 })
  resubmitAccountApproval(@CurrentUser() user: RequestUser, @Body() body: UpdateAccountApprovalDto) { return this.service.resubmitAccountApproval(user.sub, body); }
  @Post('account-approval/dev-approve')
  @RateLimit({ limit: 4, windowMs: 60_000 })
  devApprove(@CurrentUser() user: RequestUser) { return this.service.devApprove(user.sub); }
  @Post('account-approval/decision')
  @Roles('SUPPORT', 'ADMIN')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  decide(@CurrentUser() user: RequestUser, @Body() body: UpdateAccountApprovalDecisionDto) {
    return this.service.recordAccountApprovalDecision(user.sub, body);
  }

  @Get('content-approvals') contentApprovals(@CurrentUser() user: RequestUser) { return this.service.contentApprovals(user.sub); }
  @Get('content-approvals/:id') contentApproval(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.contentApproval(user.sub, id); }
  @Post('content-approvals')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createContentApproval(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) { return this.service.createContentApproval(user.sub, body); }
  @Patch('content-approvals/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  patchContentApproval(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.patchContentApproval(user.sub, id, body); }
  @Post('content-approvals/:id/nudge')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  nudge(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.nudge(user.sub, id); }
  @Post('content-approvals/:id/withdraw')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  withdraw(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.withdraw(user.sub, id); }
  @Post('content-approvals/:id/resubmit')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  resubmit(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.resubmit(user.sub, id, body); }
}
