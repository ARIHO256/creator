import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EscalateSupportTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  level?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
