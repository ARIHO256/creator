import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TemplateAttrDto {
  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  options?: string;
}
