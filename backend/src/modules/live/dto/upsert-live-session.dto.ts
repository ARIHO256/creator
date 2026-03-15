import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpsertLiveSessionDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  endedAt?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
