import { PartialType } from '@nestjs/mapped-types';
import { CreateProposalDto } from './create-proposal.dto.js';

export class UpdateProposalDto extends PartialType(CreateProposalDto) {}
