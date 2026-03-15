import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpdateFinanceInvoiceDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
