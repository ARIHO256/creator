import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class SellerOrdersQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  channel?: string;
}
