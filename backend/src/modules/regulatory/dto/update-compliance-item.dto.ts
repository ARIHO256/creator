import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { COMPLIANCE_ITEM_STATUSES } from './create-compliance-item.dto.js';

export class UpdateComplianceItemDto {
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
