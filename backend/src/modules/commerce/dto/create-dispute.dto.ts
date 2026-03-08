import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'])
  status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
