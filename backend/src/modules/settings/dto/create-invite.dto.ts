import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInviteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  roleId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  seat?: string;
}
