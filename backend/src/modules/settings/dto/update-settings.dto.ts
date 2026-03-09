import { IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  notifications?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  security?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  payout?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  profile?: Record<string, unknown>;
}
