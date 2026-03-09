import { IsOptional, IsString } from 'class-validator';

export class CreateTaxonomyTreeDto {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
