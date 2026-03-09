import { IsOptional, IsString } from 'class-validator';

export class BulkListingCommitDto {
  @IsString()
  uploadSessionId!: string;

  @IsOptional()
  @IsString()
  validateJobId?: string;
}
