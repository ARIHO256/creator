import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  handle?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsArray()
  regions?: string[];

  @IsOptional()
  @IsArray()
  languages?: string[];

  @IsOptional()
  @IsNumber()
  followers?: number;

  @IsOptional()
  @IsBoolean()
  isKycVerified?: boolean;
}
