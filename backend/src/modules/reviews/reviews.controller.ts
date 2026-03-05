import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { ReviewsService } from './reviews.service.js';

@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('reviews/dashboard')
  dashboard(@CurrentUser() user: RequestUser) {
    return this.service.dashboard(user.sub);
  }
}
