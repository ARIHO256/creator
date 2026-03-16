import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class SendTestNotificationDto {
  @IsOptional()
  @IsArray()
  channels?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
