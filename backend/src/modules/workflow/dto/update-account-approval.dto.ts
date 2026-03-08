import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

const ACCOUNT_APPROVAL_STATUSES = ['pending', 'in_review', 'approved', 'rejected', 'resubmitted'] as const;

export class AccountApprovalDocumentDto {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AccountApprovalRequiredActionDto {
  @IsString()
  id!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class UpdateAccountApprovalDto {
  @IsOptional()
  @IsIn(ACCOUNT_APPROVAL_STATUSES)
  status?: (typeof ACCOUNT_APPROVAL_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @IsString()
  reviewer?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsString()
  submittedAt?: string;

  @IsOptional()
  @IsString()
  reviewedAt?: string;

  @IsOptional()
  @IsString()
  approvedAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountApprovalRequiredActionDto)
  requiredActions?: AccountApprovalRequiredActionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountApprovalDocumentDto)
  documents?: AccountApprovalDocumentDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
