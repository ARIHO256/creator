import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @IsIn(['WAREHOUSE', 'OFFICE', 'PICKUP'])
  type?: 'WAREHOUSE' | 'OFFICE' | 'PICKUP';

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
