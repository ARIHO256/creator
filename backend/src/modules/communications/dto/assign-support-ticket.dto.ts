import { IsOptional, IsString } from 'class-validator';

export class AssignSupportTicketDto {
  @IsOptional()
  @IsString()
  assigneeUserId?: string;
}
