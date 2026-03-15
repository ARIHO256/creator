import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class SaveOpportunityDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  save?: boolean;
}
