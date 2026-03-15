import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service.js';
import { PublicReadCacheService } from './public-read-cache.service.js';

@Global()
@Module({
  providers: [CacheService, PublicReadCacheService],
  exports: [CacheService, PublicReadCacheService]
})
export class CacheModule {}
