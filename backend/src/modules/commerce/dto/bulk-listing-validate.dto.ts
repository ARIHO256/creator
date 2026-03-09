import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkListingValidateDto {
  @IsString()
  uploadSessionId!: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsObject()
  mapping?: Record<string, unknown>;
}
