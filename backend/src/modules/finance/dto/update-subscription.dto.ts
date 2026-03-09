import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  cycle?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
