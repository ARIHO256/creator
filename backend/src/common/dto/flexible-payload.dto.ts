import { IsObject } from 'class-validator';

export class FlexiblePayloadDto {
  @IsObject()
  payload!: Record<string, unknown>;
}
