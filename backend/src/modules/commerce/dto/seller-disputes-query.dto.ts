import { IsOptional, IsString } from 'class-validator';

export class SellerDisputesQueryDto {
  @IsOptional()
  @IsString()
  channel?: string;
}
