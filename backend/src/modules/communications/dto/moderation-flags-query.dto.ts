import { IsIn, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class ModerationFlagsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'RESOLVED', 'DISMISSED'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity?: string;
}
