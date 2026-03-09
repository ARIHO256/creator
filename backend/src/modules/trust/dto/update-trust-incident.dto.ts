import { IsDateString, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTrustIncidentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  impact?: string;

  @IsOptional()
  @IsString()
  @IsIn(['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'POSTMORTEM'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['minor', 'major', 'critical'])
  severity?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @IsOptional()
  @IsObject()
  updates?: Record<string, unknown>;
}
