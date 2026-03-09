import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CompleteUploadSessionDto {
  @IsString()
  completionToken!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(536870912)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  extension?: string;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsBoolean()
  createAsset?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
