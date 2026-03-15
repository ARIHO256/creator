import { IsArray, IsOptional } from 'class-validator';

export class UpdateMessageTemplatesDto {
  @IsOptional()
  @IsArray()
  templates?: unknown[];
}
