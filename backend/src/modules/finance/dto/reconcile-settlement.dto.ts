import { IsOptional, IsString } from 'class-validator';

export class ReconcileSettlementDto {
  @IsOptional()
  @IsString()
  note?: string;
}
