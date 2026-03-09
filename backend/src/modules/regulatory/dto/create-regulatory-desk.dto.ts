import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const REGULATORY_DESK_STATUSES = [
  'pending',
  'active',
  'closed',
  'archived',
  'PENDING',
  'ACTIVE',
  'CLOSED',
  'ARCHIVED'
] as const;

export class CreateRegulatoryDeskDto {
  @IsOptional()
  @IsString()
  slug?: string;

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
