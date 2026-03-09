import { Module } from '@nestjs/common';
import { CacheModule } from '../../platform/cache/cache.module.js';
import { PrismaModule } from '../../platform/prisma/prisma.module.js';
import { SellersModule } from '../sellers/sellers.module.js';
import { OpsController } from './ops.controller.js';
import { OpsService } from './ops.service.js';

@Module({
  imports: [CacheModule, PrismaModule, SellersModule],
  controllers: [OpsController],
  providers: [OpsService]
})
export class OpsModule {}
