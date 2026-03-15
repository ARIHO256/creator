import { SetMetadata } from '@nestjs/common';

export const CACHE_POLICY_KEY = 'cache:policy';

export type CachePolicyOptions = {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  visibility?: 'public' | 'private';
  immutable?: boolean;
  vary?: string[];
};

export const CachePolicy = (options: CachePolicyOptions) =>
  SetMetadata(CACHE_POLICY_KEY, options);
