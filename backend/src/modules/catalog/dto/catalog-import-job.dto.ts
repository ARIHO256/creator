import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { CatalogTemplateImportItemDto } from './catalog-templates-import.dto.js';

export class CatalogImportJobDto {
  @IsArray()
  templates!: CatalogTemplateImportItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['UPSERT', 'CREATE_ONLY', 'UPDATE_ONLY'])
  mode?: 'UPSERT' | 'CREATE_ONLY' | 'UPDATE_ONLY';

  @IsOptional()
  @IsString()
  source?: string;
}
