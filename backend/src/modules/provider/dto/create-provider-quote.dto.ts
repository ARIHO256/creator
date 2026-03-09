import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProviderQuoteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  buyer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
