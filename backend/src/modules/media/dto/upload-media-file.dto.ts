import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UploadMediaFileDto {
  @IsString()
  name!: string;

  @IsString()
  dataUrl!: string;

  @IsOptional()
  @IsString()
  kind?: string;

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
  visibility?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
