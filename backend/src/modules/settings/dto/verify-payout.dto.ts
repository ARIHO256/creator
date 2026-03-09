import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyPayoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;
}
