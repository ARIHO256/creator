import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewAssetDto {
  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'])
  status?: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
