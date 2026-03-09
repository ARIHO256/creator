import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMarketApprovalDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  marketplace?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
