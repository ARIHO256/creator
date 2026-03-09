import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateCrewSessionDto {
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  assignments?: Array<Record<string, unknown>>;
}
