import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateTaskAttachmentDto {
  @IsString()
  name!: string;

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
  storageProvider?: string;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsString()
  kind!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
