import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpdateLiveStudioDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  layout?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
