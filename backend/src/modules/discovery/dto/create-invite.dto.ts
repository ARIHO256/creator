import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  recipientUserId?: string;

  @IsOptional()
  @IsString()
  creatorHandle?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  campaignTitle?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseFee?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commissionPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fitScore?: number;

  @IsOptional()
  @IsString()
  fitReason?: string;

  @IsOptional()
  @IsString()
  messageShort?: string;

  @IsOptional()
  @IsString()
  supplierDescription?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierRating?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
