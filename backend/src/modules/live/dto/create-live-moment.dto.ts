import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class CreateLiveMomentDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
