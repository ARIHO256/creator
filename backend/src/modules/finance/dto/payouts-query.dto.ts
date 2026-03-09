import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class PayoutsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
