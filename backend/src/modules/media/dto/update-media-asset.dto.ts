import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateMediaAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
