import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const REGULATORY_DESK_ITEM_STATUSES = [
  'open',
  'review',
  'resolved',
  'dismissed',
  'OPEN',
  'REVIEW',
  'RESOLVED',
  'DISMISSED'
] as const;

export class CreateRegulatoryDeskItemDto {
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
