import { Global, Module } from '@nestjs/common';
import { PrismaService, ReadPrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService, ReadPrismaService],
  exports: [PrismaService, ReadPrismaService]
})
export class PrismaModule {}
