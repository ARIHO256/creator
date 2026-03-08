import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { RegulatoryService } from './regulatory.service.js';

@Controller()
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class RegulatoryController {
  constructor(private readonly service: RegulatoryService) {}

  @Get('compliance') compliance(@CurrentUser() user: RequestUser) { return this.service.compliance(user.sub); }
  @Get('regulatory/desks') desks(@CurrentUser() user: RequestUser) { return this.service.desks(user.sub); }
  @Get('regulatory/desks/:slug') desk(@CurrentUser() user: RequestUser, @Param('slug') slug: string) { return this.service.desk(user.sub, slug); }
}
