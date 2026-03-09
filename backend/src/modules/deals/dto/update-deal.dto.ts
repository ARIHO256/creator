import { PartialType } from '@nestjs/mapped-types';
import { CreateDealDto } from './create-deal.dto.js';

export class UpdateDealDto extends PartialType(CreateDealDto) {}
