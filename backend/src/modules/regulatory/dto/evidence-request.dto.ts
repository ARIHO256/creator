import { IsArray, IsOptional, IsString } from 'class-validator';

export class EvidenceRequestDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  deskId?: string;

  @IsOptional()
  @IsArray()
  complianceItemIds?: string[];
}
