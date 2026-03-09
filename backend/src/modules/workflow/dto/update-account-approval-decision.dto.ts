import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAccountApprovalDecisionDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsIn(['pending', 'approved', 'rejected', 'needs_changes'])
  status!: 'pending' | 'approved' | 'rejected' | 'needs_changes';

  @IsOptional()
  @IsString()
  reason?: string;
}
