import { IsArray } from 'class-validator';
import { CatalogTemplateImportItemDto } from './catalog-templates-import.dto.js';

export class CatalogTemplateValidateDto {
  @IsArray()
  templates!: CatalogTemplateImportItemDto[];
}
