import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreatorsService } from './creators.service.js';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto.js';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.creatorsService.getMyProfile(user.sub);
  }

  @Patch('me/profile')
  updateMyProfile(@CurrentUser() user: RequestUser, @Body() payload: UpdateCreatorProfileDto) {
    return this.creatorsService.updateMyProfile(user.sub, payload);
  }

  @Public()
  @Get('public/:handle')
  getPublicProfile(@Param('handle') handle: string) {
    return this.creatorsService.getPublicProfile(handle);
  }
}
