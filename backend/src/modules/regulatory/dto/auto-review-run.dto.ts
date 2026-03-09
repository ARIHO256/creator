import { IsOptional, IsString } from 'class-validator';

export class AutoReviewRunDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  deskId?: string;
}
