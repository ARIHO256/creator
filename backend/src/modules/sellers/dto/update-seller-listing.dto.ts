import { PartialType } from '@nestjs/mapped-types';
import { CreateSellerListingDto } from './create-seller-listing.dto.js';

export class UpdateSellerListingDto extends PartialType(CreateSellerListingDto) {}
