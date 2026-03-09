import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service.js';

@Module({
  providers: [ExportsService],
  exports: [ExportsService]
})
export class ExportsModule {}
