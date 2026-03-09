import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ListingTaxonomyPathNodeDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  type!: string;
}

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

  @IsOptional()
  @IsString()
  taxonomyNodeId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingTaxonomyPathNodeDto)
  taxonomyPathNodes?: ListingTaxonomyPathNodeDto[];
}
