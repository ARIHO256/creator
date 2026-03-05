import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CollaborationService } from './collaboration.service.js';

@Controller()
export class CollaborationController {
  constructor(private readonly service: CollaborationService) {}

  @Get('campaigns') campaigns(@CurrentUser() user: RequestUser) { return this.service.campaigns(user.sub); }
  @Get('proposals') proposals(@CurrentUser() user: RequestUser) { return this.service.proposals(user.sub); }
  @Post('proposals') createProposal(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createProposal(user.sub, body); }
  @Get('proposals/:id') proposal(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.proposal(user.sub, id); }
  @Patch('proposals/:id') updateProposal(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateProposal(user.sub, id, body); }
  @Post('proposals/:id/messages') proposalMessage(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.proposalMessage(user.sub, id, body); }
  @Post('proposals/:id/transition') proposalTransition(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.proposalTransition(user.sub, id, body); }

  @Get('contracts') contracts(@CurrentUser() user: RequestUser) { return this.service.contracts(user.sub); }
  @Get('contracts/:id') contract(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.contract(user.sub, id); }
  @Post('contracts/:id/terminate-request') terminateContract(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.terminateContract(user.sub, id, body); }

  @Get('tasks') tasks(@CurrentUser() user: RequestUser) { return this.service.tasks(user.sub); }
  @Get('tasks/:id') task(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.task(user.sub, id); }
  @Post('tasks') createTask(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createTask(user.sub, body); }
  @Patch('tasks/:id') updateTask(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.updateTask(user.sub, id, body); }
  @Post('tasks/:id/comments') taskComment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.taskComment(user.sub, id, body); }
  @Post('tasks/:id/attachments') taskAttachment(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.taskAttachment(user.sub, id, body); }

  @Get('assets') assets(@CurrentUser() user: RequestUser) { return this.service.assets(user.sub); }
  @Get('assets/:id') asset(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.asset(user.sub, id); }
  @Post('assets') createAsset(@CurrentUser() user: RequestUser, @Body() body: any) { return this.service.createAsset(user.sub, body); }
  @Patch('assets/:id/review') reviewAsset(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: any) { return this.service.reviewAsset(user.sub, id, body); }
}
