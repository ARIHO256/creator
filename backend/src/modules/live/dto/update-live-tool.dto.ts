import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpdateLiveToolDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  tab?: string;

  @IsOptional()
  @IsString()
  selectedPackId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
