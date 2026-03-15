import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpsertAdzCampaignDto extends FlexiblePayloadDto {
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
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMarketplace?: boolean;

  @IsOptional()
  @IsString()
  startISO?: string;

  @IsOptional()
  @IsString()
  startsAtISO?: string;

  @IsOptional()
  @IsString()
  endISO?: string;

  @IsOptional()
  @IsString()
  endsAtISO?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
