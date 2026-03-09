import { PartialType } from '@nestjs/mapped-types';
import { CreateReturnDto } from './create-return.dto.js';

export class UpdateReturnDto extends PartialType(CreateReturnDto) {}
