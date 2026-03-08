import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @IsString()
  listingId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsNumber()
  delta!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
