import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { SellerfrontService } from './sellerfront.service.js';

@Controller('sellerfront')
@Roles('SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class SellerfrontController {
  constructor(private readonly sellerfrontService: SellerfrontService) {}

  @Get('mock-db')
  mockDb() {
    return this.sellerfrontService.getMockDb();
  }

  @Put('mock-db')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  updateMockDb(@CurrentUser() user: RequestUser, @Body() payload: Record<string, unknown>) {
    return this.sellerfrontService.updateMockDb(user.sub, payload);
  }

  @Post('mock-db/reset')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  resetMockDb(@CurrentUser() user: RequestUser) {
    return this.sellerfrontService.resetMockDb(user.sub);
  }
}
