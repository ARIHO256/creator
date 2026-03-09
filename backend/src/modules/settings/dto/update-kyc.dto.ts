import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateKycDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsArray()
  documents?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
