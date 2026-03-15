import { IsArray, IsObject, IsOptional } from 'class-validator';
import { FlexiblePayloadDto } from '../../../common/dto/flexible-payload.dto.js';

export class UpdateProviderPortfolioDto extends FlexiblePayloadDto {
  @IsOptional()
  @IsArray()
  items?: unknown[];

  @IsOptional()
  @IsArray()
  caseStudies?: unknown[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
