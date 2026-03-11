import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { SellerfrontService } from './sellerfront.service.js';

@Controller('sellerfront')
@Roles('SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class SellerfrontController {
  constructor(private readonly sellerfrontService: SellerfrontService) {}

  @Get('mock-db')
  @Public()
  mockDb() {
    return this.sellerfrontService.getMockDb();
  }

  @Get('bootstrap')
  @Public()
  bootstrap(@CurrentUser() user: RequestUser | undefined) {
    return this.sellerfrontService.getBootstrap(user?.sub ?? null);
  }

  @Get('page-content')
  @Public()
  pageContent(
    @Query('pageKey') pageKey: string,
    @Query('role') role: string,
    @CurrentUser() user: RequestUser | undefined
  ) {
    return this.sellerfrontService.getPageContent(pageKey, role, user?.sub ?? null);
  }

  @Put('page-content')
  @Public()
  @RateLimit({ limit: 240, windowMs: 60_000 })
  putPageContent(
    @CurrentUser() user: RequestUser | undefined,
    @Body() body: { pageKey: string; role: string; payload: unknown }
  ) {
    return this.sellerfrontService.upsertPageContent(
      user?.sub ?? null,
      body.pageKey,
      body.role,
      body.payload
    );
  }

  @Get('module')
  @Public()
  module(@Query('key') key: string) {
    return this.sellerfrontService.getModule(key);
  }

  @Put('module')
  @Public()
  @RateLimit({ limit: 240, windowMs: 60_000 })
  putModule(
    @CurrentUser() user: RequestUser | undefined,
    @Body() body: { key: string; payload: unknown }
  ) {
    return this.sellerfrontService.upsertModule(user?.sub ?? null, body.key, body.payload);
  }

  @Get('storage')
  @Public()
  storage(@Query('type') type: 'local' | 'session', @CurrentUser() user: RequestUser | undefined) {
    return this.sellerfrontService.getStorage(type, user?.sub ?? null);
  }

  @Put('storage')
  @Public()
  @RateLimit({ limit: 240, windowMs: 60_000 })
  putStorage(
    @CurrentUser() user: RequestUser | undefined,
    @Body() body: { type: 'local' | 'session'; entries: Record<string, string | null> }
  ) {
    return this.sellerfrontService.upsertStorageEntries(user?.sub ?? null, body.type, body.entries || {});
  }

  @Put('mock-db')
  @Public()
  @RateLimit({ limit: 120, windowMs: 60_000 })
  updateMockDb(@CurrentUser() user: RequestUser | undefined, @Body() payload: Record<string, unknown>) {
    return this.sellerfrontService.updateMockDb(user?.sub ?? null, payload);
  }

  @Post('mock-db/reset')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  resetMockDb(@CurrentUser() user: RequestUser) {
    return this.sellerfrontService.resetMockDb(user.sub);
  }
}
