import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTaxonomyNodeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['MARKETPLACE', 'FAMILY', 'CATEGORY', 'SUBCATEGORY', 'LINE'])
  kind?: 'MARKETPLACE' | 'FAMILY' | 'CATEGORY' | 'SUBCATEGORY' | 'LINE';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
