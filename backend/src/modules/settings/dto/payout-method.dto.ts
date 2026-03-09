import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PayoutMethodDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(40)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
