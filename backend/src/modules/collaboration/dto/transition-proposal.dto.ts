import { IsIn, IsString } from 'class-validator';

export class TransitionProposalDto {
  @IsString()
  @IsIn(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'DECLINED', 'WITHDRAWN'])
  status!: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'DECLINED' | 'WITHDRAWN';
}
