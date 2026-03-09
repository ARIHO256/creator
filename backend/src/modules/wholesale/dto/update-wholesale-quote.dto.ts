import { PartialType } from '@nestjs/mapped-types';
import { CreateWholesaleQuoteDto } from './create-wholesale-quote.dto.js';

export class UpdateWholesaleQuoteDto extends PartialType(CreateWholesaleQuoteDto) {}
