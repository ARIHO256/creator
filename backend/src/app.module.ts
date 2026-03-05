import { Module } from '@nestjs/common';
import { LegacyApiBootstrap } from './platform/legacy-api.bootstrap.js';
import { PrismaAppStateStore } from './platform/app-state.store.js';
import { PrismaService } from './platform/prisma.service.js';

@Module({
  providers: [PrismaService, PrismaAppStateStore, LegacyApiBootstrap]
})
export class AppModule {}
