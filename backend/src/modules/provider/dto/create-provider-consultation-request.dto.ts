import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateProviderConsultationRequestDto {
  @IsOptional()
  @IsString()
  providerUserId?: string;

  @IsOptional()
  @IsString()
  providerHandle?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
