import { IsIn, IsOptional, IsString } from 'class-validator';

export class RespondReviewDto {
  @IsString()
  reviewId!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsString()
  @IsIn(['PUBLISHED', 'FLAGGED'])
  status?: 'PUBLISHED' | 'FLAGGED';
}
