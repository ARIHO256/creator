import { IsArray, IsObject, IsOptional } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpdateCrewSessionDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  assignments?: Array<Record<string, unknown>>;
}
