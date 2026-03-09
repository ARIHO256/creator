import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseDto } from './create-warehouse.dto.js';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}
