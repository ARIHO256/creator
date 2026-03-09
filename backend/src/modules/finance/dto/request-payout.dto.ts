import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class RequestPayoutDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
