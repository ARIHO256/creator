import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class FollowToggleDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  follow?: boolean;
}
