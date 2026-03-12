import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateReviewReplyDto } from './dto/create-review-reply.dto.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('reviews/dashboard')
  dashboard(@CurrentUser() user: RequestUser) {
    return this.service.dashboard(user.sub, user.role);
  }

  @Get('reviews/summary')
  summary(@CurrentUser() user: RequestUser) {
    return this.service.summary(user.sub, user.role);
  }

  @Get('reviews')
  list(@CurrentUser() user: RequestUser, @Query('scope') scope?: 'received' | 'authored') {
    return this.service.list(user.sub, user.role, scope);
  }

  @Get('reviews/insights')
  insights(
    @CurrentUser() user: RequestUser,
    @Query('channel') channel?: string,
    @Query('marketplace') marketplace?: string,
    @Query('mldzSurface') mldzSurface?: string,
    @Query('roleTarget') roleTarget?: string,
    @Query('itemType') itemType?: string,
    @Query('minRating') minRating?: string,
    @Query('status') status?: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED',
    @Query('since') since?: string
  ) {
    const parsedMin = minRating ? Number(minRating) : undefined;
    return this.service.insights(user.sub, user.role, {
      channel,
      marketplace,
      mldzSurface,
      roleTarget,
      itemType,
      minRating: Number.isFinite(parsedMin) ? parsedMin : undefined,
      status,
      since
    });
  }

  @Post('reviews')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  create(@CurrentUser() user: RequestUser, @Body() payload: CreateReviewDto) {
    return this.service.create(user.sub, payload);
  }

  @Patch('reviews/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateReviewDto) {
    return this.service.update(user.sub, id, payload);
  }

  @Post('reviews/:id/replies')
  @RateLimit({ limit: 40, windowMs: 60_000 })
  reply(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() payload: CreateReviewReplyDto
  ) {
    return this.service.reply(user.sub, id, payload.body, payload.visibility);
  }
}
