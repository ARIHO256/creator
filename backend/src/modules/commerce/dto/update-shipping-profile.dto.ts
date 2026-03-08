import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingProfileDto } from './create-shipping-profile.dto.js';

export class UpdateShippingProfileDto extends PartialType(CreateShippingProfileDto) {}
