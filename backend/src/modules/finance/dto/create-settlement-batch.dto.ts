import { IsInt, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateSettlementBatchDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
