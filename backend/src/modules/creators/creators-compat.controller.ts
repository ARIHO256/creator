import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CreatorsService } from './creators.service.js';

@Controller()
export class CreatorsCompatController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Public()
  @Get('public-profile/:handle')
  getPublicProfile(@Param('handle') handle: string) {
    return this.creatorsService.getPublicProfile(handle);
  }
}
