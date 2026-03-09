import { PartialType } from '@nestjs/mapped-types';
import { CreateCatalogPresetDto } from './create-catalog-preset.dto.js';

export class UpdateCatalogPresetDto extends PartialType(CreateCatalogPresetDto) {}
