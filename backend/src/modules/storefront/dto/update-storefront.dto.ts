import { IsArray, IsBoolean, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateStorefrontDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  heroMediaUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taxonomyNodeIds?: string[];

  @IsOptional()
  @IsString()
  primaryTaxonomyNodeId?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
