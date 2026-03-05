import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('assets')
  list(@CurrentUser() user: RequestUser) {
    return this.mediaService.list(user.sub);
  }

  @Post('assets')
  create(@CurrentUser() user: RequestUser, @Body() payload: CreateMediaAssetDto) {
    return this.mediaService.create(user.sub, payload);
  }
}
