import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendPayoutCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  method?: string;
}
