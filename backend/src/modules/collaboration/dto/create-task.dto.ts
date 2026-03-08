import { IsISO8601, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  assigneeUserId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'BLOCKED', 'COMPLETED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'BLOCKED' | 'COMPLETED';

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
