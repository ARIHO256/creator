import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateRolesSecurityDto {
  @IsOptional()
  @IsBoolean()
  require2FA?: boolean;

  @IsOptional()
  @IsBoolean()
  allowExternalInvites?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  supplierGuestExpiryHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  inviteDomainAllowlist?: string[];

  @IsOptional()
  @IsBoolean()
  requireApprovalForPayouts?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  payoutApprovalThresholdUsd?: number;

  @IsOptional()
  @IsBoolean()
  restrictSensitiveExports?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeoutMins?: number;
}
