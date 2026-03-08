import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSellerListingDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  marketplace?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  inventoryCount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'IN_REVIEW', 'ACTIVE', 'PAUSED', 'ARCHIVED'])
  status?: 'DRAFT' | 'IN_REVIEW' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
