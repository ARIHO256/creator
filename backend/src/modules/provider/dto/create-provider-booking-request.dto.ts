import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateProviderBookingRequestDto {
  @IsOptional()
  @IsString()
  providerUserId?: string;

  @IsOptional()
  @IsString()
  providerHandle?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24 * 60)
  durationMinutes?: number;

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
