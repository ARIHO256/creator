import { IsOptional, IsString } from 'class-validator';

export class CreateTaskAttachmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  kind!: string;
}
