import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMediaAssetDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @IsUrl()
  url?: string;
}
