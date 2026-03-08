import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateExportJobDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['CSV', 'PDF', 'XLSX'])
  format?: 'CSV' | 'PDF' | 'XLSX';

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
