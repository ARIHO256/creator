import { PartialType } from '@nestjs/mapped-types';
import { CreateShippingRateDto } from './create-shipping-rate.dto.js';

export class UpdateShippingRateDto extends PartialType(CreateShippingRateDto) {}
