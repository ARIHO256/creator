import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsString()
  title!: string;

  @IsString()
  assetType!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
