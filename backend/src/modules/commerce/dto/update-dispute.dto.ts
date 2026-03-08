import { PartialType } from '@nestjs/mapped-types';
import { CreateDisputeDto } from './create-dispute.dto.js';

export class UpdateDisputeDto extends PartialType(CreateDisputeDto) {}
