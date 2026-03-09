import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateCatalogPresetDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  templateIds?: string[];

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
