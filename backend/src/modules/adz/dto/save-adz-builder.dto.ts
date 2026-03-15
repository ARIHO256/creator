import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class SaveAdzBuilderDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  adId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
