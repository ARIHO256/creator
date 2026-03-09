import { IsIn, IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class SettlementQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'RECONCILED', 'FAILED'])
  status?: string;
}
