import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class PatchScreenStateDto extends FlexiblePayloadDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  __resetToDefault?: boolean;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
