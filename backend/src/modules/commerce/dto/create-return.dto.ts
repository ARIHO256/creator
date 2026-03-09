import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateReturnDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED', 'REJECTED', 'CANCELLED'])
  status?: 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'REFUNDED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
