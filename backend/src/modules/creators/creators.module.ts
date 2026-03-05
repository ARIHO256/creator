import { Module } from '@nestjs/common';
import { CreatorsController } from './creators.controller.js';
import { CreatorsService } from './creators.service.js';
import { CreatorsCompatController } from './creators-compat.controller.js';

@Module({
  controllers: [CreatorsController, CreatorsCompatController],
  providers: [CreatorsService],
  exports: [CreatorsService]
})
export class CreatorsModule {}
