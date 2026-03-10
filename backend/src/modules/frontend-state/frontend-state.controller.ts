import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { FrontendStateService } from './frontend-state.service.js';

@Controller('frontend-state')
@Roles('CREATOR', 'SELLER', 'PROVIDER', 'ADMIN', 'SUPPORT')
export class FrontendStateController {
  constructor(private readonly frontendStateService: FrontendStateService) {}

  @Get(':app/bootstrap')
  bootstrap(@Param('app') app: string, @CurrentUser() user: RequestUser) {
    return this.frontendStateService.getBootstrap(app, user.sub);
  }

  @Get(':app/module')
  getModule(@Param('app') app: string, @Query('key') key: string, @CurrentUser() user: RequestUser) {
    return this.frontendStateService.getModule(app, key, user.sub);
  }

  @Put(':app/module')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  putModule(
    @Param('app') app: string,
    @Body() body: { key: string; payload: unknown },
    @CurrentUser() user: RequestUser
  ) {
    return this.frontendStateService.upsertModule(app, body.key, body.payload, user.sub);
  }

  @Put(':app/modules')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  putModules(
    @Param('app') app: string,
    @Body() body: { modules: Record<string, unknown> },
    @CurrentUser() user: RequestUser
  ) {
    return this.frontendStateService.upsertModules(app, body.modules || {}, user.sub);
  }

  @Get(':app/storage')
  getStorage(
    @Param('app') app: string,
    @Query('type') type: 'local' | 'session',
    @CurrentUser() user: RequestUser
  ) {
    return this.frontendStateService.getStorage(app, type, user.sub);
  }

  @Put(':app/storage')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  putStorage(
    @Param('app') app: string,
    @Body() body: { type: 'local' | 'session'; entries: Record<string, string | null> },
    @CurrentUser() user: RequestUser
  ) {
    return this.frontendStateService.upsertStorageEntries(
      app,
      body.type,
      body.entries || {},
      user.sub
    );
  }
}
