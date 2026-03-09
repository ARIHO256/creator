import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

export const WHOLESALE_QUOTE_STATUSES = [
  'draft',
  'ready_for_review',
  'sent',
  'negotiating',
  'accepted',
  'declined',
  'expired'
] as const;

export class WholesaleQuoteLineItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WholesaleApprovalRequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  requester?: string;

  @IsOptional()
  @IsString()
  approver?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  at?: string;

  @IsOptional()
  @IsString()
  decidedAt?: string;
}

export class CreateWholesaleQuoteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  rfqId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  buyer!: string;

  @IsOptional()
  @IsString()
  buyerType?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  paymentRail?: string;

  @IsOptional()
  @IsString()
  incotermCode?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  nextFollowUpAt?: string;

  @IsOptional()
  @IsIn(WHOLESALE_QUOTE_STATUSES)
  status?: (typeof WHOLESALE_QUOTE_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  winChance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WholesaleQuoteLineItemDto)
  lines!: WholesaleQuoteLineItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WholesaleApprovalRequestDto)
  approvalRequest?: WholesaleApprovalRequestDto;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  approvalThresholdPct?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
