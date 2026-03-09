import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { REGULATORY_DESK_STATUSES } from './create-regulatory-desk.dto.js';

export class UpdateRegulatoryDeskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(REGULATORY_DESK_STATUSES)
  status?: (typeof REGULATORY_DESK_STATUSES)[number];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
