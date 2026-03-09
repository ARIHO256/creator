import { IsOptional, IsString } from 'class-validator';

export class SellerReturnsQueryDto {
  @IsOptional()
  @IsString()
  channel?: string;
}
