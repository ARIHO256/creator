import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateUploadSessionDto {
  @IsString()
  name!: string;

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
  checksum?: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
