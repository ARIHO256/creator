import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsObject()
  perms?: Record<string, boolean>;
}
