import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Max, Min } from 'class-validator';

const BACKGROUND_JOB_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'] as const;

export class ListBackgroundJobsDto {
  @IsOptional()
  @IsString()
  queue?: string;

  @IsOptional()
  @IsIn(BACKGROUND_JOB_STATUSES)
  status?: (typeof BACKGROUND_JOB_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  take?: number;
}
