import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { FlexiblePayloadValidationPipe } from '../../common/pipes/flexible-payload-validation.pipe.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CollaborationService } from './collaboration.service.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { CreateProposalMessageDto } from './dto/create-proposal-message.dto.js';
import { CreateProposalDto } from './dto/create-proposal.dto.js';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto.js';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { ReviewAssetDto } from './dto/review-asset.dto.js';
import { TerminateContractDto } from './dto/terminate-contract.dto.js';
import { TransitionProposalDto } from './dto/transition-proposal.dto.js';
import { UpdateDealzMarketplaceDto } from './dto/update-dealz-marketplace.dto.js';
import { UpdateProposalDto } from './dto/update-proposal.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { UpsertWorkspaceCampaignDto } from './dto/upsert-workspace-campaign.dto.js';

@Controller()
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class CollaborationController {
  constructor(private readonly service: CollaborationService) {}

  @Get('campaigns/workspace') campaignWorkspace(@CurrentUser() user: RequestUser) { return this.service.campaignWorkspace(user.sub); }
  @Get('campaigns/dealz-marketplace') dealzMarketplace(@CurrentUser() user: RequestUser) { return this.service.dealzMarketplace(user.sub); }
  @Patch('campaigns/dealz-marketplace')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateDealzMarketplace(@CurrentUser() user: RequestUser, @Body(new FlexiblePayloadValidationPipe(UpdateDealzMarketplaceDto)) body: UpdateDealzMarketplaceDto) {
    return this.service.updateDealzMarketplace(user.sub, body.payload);
  }
  @Get('campaigns/legacy-marketplace') legacyMarketplace(@CurrentUser() user: RequestUser) { return this.service.legacyMarketplace(user.sub); }
  @Patch('campaigns/legacy-marketplace')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateLegacyMarketplace(@CurrentUser() user: RequestUser, @Body(new FlexiblePayloadValidationPipe(UpdateDealzMarketplaceDto)) body: UpdateDealzMarketplaceDto) {
    return this.service.updateLegacyMarketplace(user.sub, body.payload);
  }
  @Get('campaigns') campaigns(@CurrentUser() user: RequestUser) { return this.service.campaigns(user.sub); }
  @Get('campaigns/:id') campaign(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.campaign(user.sub, id); }
  @Post('campaigns')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createCampaign(@CurrentUser() user: RequestUser, @Body(new FlexiblePayloadValidationPipe(UpsertWorkspaceCampaignDto)) body: UpsertWorkspaceCampaignDto) {
    return this.service.createCampaign(user.sub, body.payload);
  }
  @Patch('campaigns/:id')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateCampaign(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body(new FlexiblePayloadValidationPipe(UpsertWorkspaceCampaignDto)) body: UpsertWorkspaceCampaignDto) {
    return this.service.updateCampaign(user.sub, id, body.payload);
  }
  @Get('proposals') proposals(@CurrentUser() user: RequestUser) { return this.service.proposals(user.sub); }
  @Post('proposals')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createProposal(@CurrentUser() user: RequestUser, @Body() body: CreateProposalDto) { return this.service.createProposal(user.sub, body); }
  @Get('proposals/:id') proposal(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.proposal(user.sub, id); }
  @Patch('proposals/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateProposal(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateProposalDto) { return this.service.updateProposal(user.sub, id, body); }
  @Post('proposals/:id/messages')
  @RateLimit({ limit: 40, windowMs: 60_000 })
  proposalMessage(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: CreateProposalMessageDto) { return this.service.proposalMessage(user.sub, id, body); }
  @Post('proposals/:id/transition')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  proposalTransition(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: TransitionProposalDto) { return this.service.proposalTransition(user.sub, id, body); }

  @Get('contracts') contracts(@CurrentUser() user: RequestUser) { return this.service.contracts(user.sub); }
  @Get('contracts/:id') contract(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.contract(user.sub, id); }
  @Post('contracts/:id/terminate-request')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  terminateContract(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: TerminateContractDto) { return this.service.terminateContract(user.sub, id, body); }

  @Get('tasks') tasks(@CurrentUser() user: RequestUser) { return this.service.tasks(user.sub); }
  @Get('tasks/:id') task(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.task(user.sub, id); }
  @Post('tasks')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  createTask(@CurrentUser() user: RequestUser, @Body() body: CreateTaskDto) { return this.service.createTask(user.sub, body); }
  @Patch('tasks/:id')
  @RateLimit({ limit: 30, windowMs: 60_000 })
  updateTask(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateTaskDto) { return this.service.updateTask(user.sub, id, body); }
  @Post('tasks/:id/comments')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  taskComment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: CreateTaskCommentDto) { return this.service.taskComment(user.sub, id, body); }
  @Post('tasks/:id/attachments')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  taskAttachment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: CreateTaskAttachmentDto) { return this.service.taskAttachment(user.sub, id, body); }

  @Get('assets') assets(@CurrentUser() user: RequestUser) { return this.service.assets(user.sub); }
  @Get('assets/:id') asset(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.asset(user.sub, id); }
  @Post('assets')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  createAsset(@CurrentUser() user: RequestUser, @Body() body: CreateAssetDto) { return this.service.createAsset(user.sub, body); }
  @Patch('assets/:id/review')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  reviewAsset(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: ReviewAssetDto) { return this.service.reviewAsset(user.sub, id, body); }
}
