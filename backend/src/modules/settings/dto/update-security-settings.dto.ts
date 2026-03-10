import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class SecuritySessionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  device?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ip?: string;

  @IsOptional()
  @IsString()
  lastActiveAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateSecuritySettingsDto {
  @IsOptional()
  @IsBoolean()
  twoFactor?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  twoFactorMethod?: string;

  @IsOptional()
  @IsObject()
  twoFactorConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SecuritySessionDto)
  sessions?: SecuritySessionDto[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  passkeys?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  trustedDevices?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  alerts?: Record<string, unknown>[];
}
