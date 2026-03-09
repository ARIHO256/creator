import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const COMPLIANCE_ITEM_TYPES = ['DOC', 'QUEUE', 'RULE'] as const;
export const COMPLIANCE_ITEM_STATUSES = [
  'pending',
  'active',
  'resolved',
  'rejected',
  'PENDING',
  'ACTIVE',
  'RESOLVED',
  'REJECTED'
] as const;

export class CreateComplianceItemDto {
  @IsIn(COMPLIANCE_ITEM_TYPES)
  itemType!: (typeof COMPLIANCE_ITEM_TYPES)[number];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(COMPLIANCE_ITEM_STATUSES)
  status?: (typeof COMPLIANCE_ITEM_STATUSES)[number];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
