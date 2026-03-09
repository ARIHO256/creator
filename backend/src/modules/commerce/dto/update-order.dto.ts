import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'NEW',
    'CONFIRMED',
    'PICKING',
    'PACKED',
    'OUT_FOR_DELIVERY',
    'SHIPPED',
    'DELIVERED',
    'FAILED',
    'ON_HOLD',
    'CANCELLED',
    'RETURN_REQUESTED',
    'RETURNED'
  ])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
