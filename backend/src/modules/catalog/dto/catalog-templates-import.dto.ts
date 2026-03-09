import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateAttrDto } from './template-attr.dto.js';

export class CatalogTemplateImportItemDto {
  @IsString()
  name!: string;

  @IsString()
  kind!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateAttrDto)
  attrs?: TemplateAttrDto[];

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'ARCHIVED'])
  status?: 'ACTIVE' | 'ARCHIVED';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ImportCatalogTemplatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogTemplateImportItemDto)
  templates!: CatalogTemplateImportItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['UPSERT', 'CREATE_ONLY', 'UPDATE_ONLY'])
  mode?: 'UPSERT' | 'CREATE_ONLY' | 'UPDATE_ONLY';
}
