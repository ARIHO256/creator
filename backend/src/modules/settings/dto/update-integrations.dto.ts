import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateIntegrationsDto {
  @IsOptional()
  @IsArray()
  integrations?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  webhooks?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
