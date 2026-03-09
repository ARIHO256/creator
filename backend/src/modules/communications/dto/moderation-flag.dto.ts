import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ModerationFlagDto {
  @IsString()
  targetType!: string;

  @IsString()
  targetId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
