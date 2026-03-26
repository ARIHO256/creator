import { IsObject, IsOptional } from 'class-validator';

export class FlexiblePayloadDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
