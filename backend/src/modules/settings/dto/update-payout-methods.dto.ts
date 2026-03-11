import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { PayoutMethodDto } from './payout-method.dto.js';

export class UpdatePayoutMethodsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PayoutMethodDto)
  methods!: PayoutMethodDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
