import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateTaxonomyNodeDto {
  @IsString()
  treeId!: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

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
  @IsObject()
  metadata?: Record<string, unknown>;
}
