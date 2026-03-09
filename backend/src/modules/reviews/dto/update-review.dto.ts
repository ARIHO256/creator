import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { CreateReviewDto } from './create-review.dto.js';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
  @IsOptional()
  @IsString()
  @IsIn(['PUBLISHED', 'HIDDEN', 'FLAGGED'])
  status?: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsDateString()
  flaggedAt?: string;
}
