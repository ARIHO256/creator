import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateTaxDto {
  @IsOptional()
  @IsArray()
  profiles?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  reports?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
