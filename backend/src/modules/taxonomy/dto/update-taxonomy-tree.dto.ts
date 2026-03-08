import { PartialType } from '@nestjs/mapped-types';
import { CreateTaxonomyTreeDto } from './create-taxonomy-tree.dto.js';

export class UpdateTaxonomyTreeDto extends PartialType(CreateTaxonomyTreeDto) {}
