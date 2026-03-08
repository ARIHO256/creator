import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CompleteUploadSessionDto } from './dto/complete-upload-session.dto.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('assets')
  list(@CurrentUser() user: RequestUser) {
    return this.mediaService.list(user.sub);
  }

  @Get('upload-sessions')
  uploadSessions(@CurrentUser() user: RequestUser) {
    return this.mediaService.listUploadSessions(user.sub);
  }

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('upload-sessions')
  createUploadSession(@CurrentUser() user: RequestUser, @Body() payload: CreateUploadSessionDto) {
    return this.mediaService.createUploadSession(user.sub, payload);
  }

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('upload-sessions/:id/complete')
  completeUploadSession(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: CompleteUploadSessionDto
  ) {
    return this.mediaService.completeUploadSession(user.sub, id, payload);
  }

  @Post('assets')
  create(@CurrentUser() user: RequestUser, @Body() payload: CreateMediaAssetDto) {
    return this.mediaService.create(user.sub, payload);
  }
}
