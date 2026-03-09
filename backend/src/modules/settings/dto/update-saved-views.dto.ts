import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateSavedViewsDto {
  @IsOptional()
  @IsArray()
  views?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
