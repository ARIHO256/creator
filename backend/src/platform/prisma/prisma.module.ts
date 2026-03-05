import { Global, Module } from '@nestjs/common';
import { AppRecordsService } from '../app-records.service.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService, AppRecordsService],
  exports: [PrismaService, AppRecordsService]
})
export class PrismaModule {}
