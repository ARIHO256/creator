import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CompleteUploadSessionDto } from './dto/complete-upload-session.dto.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto.js';
import { UploadMediaFileDto } from './dto/upload-media-file.dto.js';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('assets')
  list(@CurrentUser() user: RequestUser) {
    return this.mediaService.list(user.sub);
  }

  @Get('workspace')
  workspace(@CurrentUser() user: RequestUser) {
    return this.mediaService.workspace(user.sub);
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

  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('files')
  uploadFile(@CurrentUser() user: RequestUser, @Body() payload: UploadMediaFileDto) {
    return this.mediaService.uploadFile(user.sub, payload);
  }

  @Post('assets')
  create(@CurrentUser() user: RequestUser, @Body() payload: CreateMediaAssetDto) {
    return this.mediaService.create(user.sub, payload);
  }

  @Get('assets/:id/content')
  async content(@CurrentUser() user: RequestUser, @Param('id') id: string, @Res() reply: FastifyReply) {
    const { asset, stream } = await this.mediaService.openAssetContent(user.sub, id);
    reply.header('Content-Type', asset.mimeType ?? 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="${asset.name}"`);
    return reply.send(stream);
  }

  @Public()
  @Get('public/:id')
  async publicContent(@Param('id') id: string, @Res() reply: FastifyReply) {
    const { asset, stream } = await this.mediaService.openPublicAssetContent(id);
    reply.header('Content-Type', asset.mimeType ?? 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="${asset.name}"`);
    return reply.send(stream);
  }

  @Patch('assets/:id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateMediaAssetDto) {
    return this.mediaService.update(user.sub, id, payload);
  }

  @Delete('assets/:id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.mediaService.remove(user.sub, id);
  }
}
