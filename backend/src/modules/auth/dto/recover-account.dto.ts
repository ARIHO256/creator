import { IsOptional, IsString } from 'class-validator';

export class RecoverAccountDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
