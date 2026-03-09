import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class SellerListingsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  marketplace?: string;
}
