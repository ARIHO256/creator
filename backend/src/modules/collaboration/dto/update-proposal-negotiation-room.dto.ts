import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateProposalNegotiationRoomDto {
  @IsOptional()
  @IsString()
  @IsIn(['invite-accepted', 'open-collabs-pitch', 'direct'])
  entryContext?: 'invite-accepted' | 'open-collabs-pitch' | 'direct';

  @IsOptional()
  @IsString()
  @IsIn(['I will use a Creator', 'I will NOT use a Creator', 'I am NOT SURE yet'])
  creatorUsageDecision?: 'I will use a Creator' | 'I will NOT use a Creator' | 'I am NOT SURE yet';

  @IsOptional()
  @IsString()
  @IsIn(['Open for Collabs', 'Invite-only'])
  collabMode?: 'Open for Collabs' | 'Invite-only';

  @IsOptional()
  @IsString()
  @IsIn(['Manual', 'Auto'])
  approvalMode?: 'Manual' | 'Auto';

  @IsOptional()
  @IsString()
  @IsIn(['Draft', 'Negotiating', 'Final review', 'Contract created'])
  stage?: 'Draft' | 'Negotiating' | 'Final review' | 'Contract created';

  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}
