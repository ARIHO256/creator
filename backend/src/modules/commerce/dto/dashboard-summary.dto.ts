import { IsOptional, IsString } from 'class-validator';

export class DashboardSummaryQueryDto {
  @IsOptional()
  @IsString()
  range?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  marketplaces?: string;

  @IsOptional()
  @IsString()
  warehouses?: string;

  @IsOptional()
  @IsString()
  channels?: string;
}
