import { IsOptional, IsString } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto.js';

export class CatalogPresetQueryDto extends ListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
