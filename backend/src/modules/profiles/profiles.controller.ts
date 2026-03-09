import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ProfilesService } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Public()
  @Get('public')
  listPublic(@Query('limit') limit?: string) {
    return this.profilesService.listPublicProfiles(limit ? Number(limit) : 20);
  }
}
