import { IsIn, IsOptional, IsString } from 'class-validator';

export class ModerationActionDto {
  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'RESOLVED', 'ESCALATED'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
