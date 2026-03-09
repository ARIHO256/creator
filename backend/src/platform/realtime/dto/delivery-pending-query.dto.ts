import { IsInt, IsOptional, Min } from 'class-validator';

export class DeliveryPendingQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
