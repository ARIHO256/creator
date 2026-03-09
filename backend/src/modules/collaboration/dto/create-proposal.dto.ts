import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProposalDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  creatorId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'])
  status?: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
