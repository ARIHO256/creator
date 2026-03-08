import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTaxonomyCoverageDto {
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'SUSPENDED', 'REMOVED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
