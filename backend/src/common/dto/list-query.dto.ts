import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export function normalizeListQuery(
  query?: ListQueryDto,
  defaults: { limit?: number; maxLimit?: number } = {}
) {
  const defaultLimit = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 100;
  const limit = Math.min(query?.limit ?? defaultLimit, maxLimit);
  const offset = query?.offset ?? 0;

  return {
    limit,
    offset,
    take: limit,
    skip: offset
  };
}
