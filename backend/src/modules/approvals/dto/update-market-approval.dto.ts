import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMarketApprovalDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';

  @IsOptional()
  @IsString()
  decisionReason?: string;
}
