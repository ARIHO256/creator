import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { REGULATORY_DESK_ITEM_STATUSES } from './create-regulatory-desk-item.dto.js';

export class UpdateRegulatoryDeskItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(REGULATORY_DESK_ITEM_STATUSES)
  status?: (typeof REGULATORY_DESK_ITEM_STATUSES)[number];

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
