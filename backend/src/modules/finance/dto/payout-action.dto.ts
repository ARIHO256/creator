import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayoutActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
