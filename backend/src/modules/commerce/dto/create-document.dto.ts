import { IsArray, IsDateString, IsIn, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsString()
  @IsIn(['UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'MISSING'])
  status?: 'UPLOADED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'MISSING';

  @IsOptional()
  @IsDateString()
  uploadedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
