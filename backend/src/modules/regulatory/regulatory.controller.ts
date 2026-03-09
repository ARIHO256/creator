import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateComplianceItemDto } from './dto/create-compliance-item.dto.js';
import { CreateRegulatoryDeskDto } from './dto/create-regulatory-desk.dto.js';
import { CreateRegulatoryDeskItemDto } from './dto/create-regulatory-desk-item.dto.js';
import { UpdateComplianceItemDto } from './dto/update-compliance-item.dto.js';
import { UpdateRegulatoryDeskDto } from './dto/update-regulatory-desk.dto.js';
import { UpdateRegulatoryDeskItemDto } from './dto/update-regulatory-desk-item.dto.js';
import { RegulatoryService } from './regulatory.service.js';

@Controller()
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class RegulatoryController {
  constructor(private readonly service: RegulatoryService) {}

  @Get('compliance') compliance(@CurrentUser() user: RequestUser) { return this.service.compliance(user.sub); }
  @Post('compliance/items')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  createComplianceItem(@CurrentUser() user: RequestUser, @Body() body: CreateComplianceItemDto) {
    return this.service.createComplianceItem(user.sub, body);
  }
  @Patch('compliance/items/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateComplianceItem(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateComplianceItemDto) {
    return this.service.updateComplianceItem(user.sub, id, body);
  }
  @Get('regulatory/desks') desks(@CurrentUser() user: RequestUser) { return this.service.desks(user.sub); }
  @Post('regulatory/desks')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  createDesk(@CurrentUser() user: RequestUser, @Body() body: CreateRegulatoryDeskDto) {
    return this.service.createDesk(user.sub, body);
  }
  @Patch('regulatory/desks/:id')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateDesk(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: UpdateRegulatoryDeskDto) {
    return this.service.updateDesk(user.sub, id, body);
  }
  @Get('regulatory/desks/:slug') desk(@CurrentUser() user: RequestUser, @Param('slug') slug: string) { return this.service.desk(user.sub, slug); }
  @Post('regulatory/desks/:deskId/items')
  @RateLimit({ limit: 15, windowMs: 60_000 })
  createDeskItem(@CurrentUser() user: RequestUser, @Param('deskId') deskId: string, @Body() body: CreateRegulatoryDeskItemDto) {
    return this.service.createDeskItem(user.sub, deskId, body);
  }
  @Patch('regulatory/desks/:deskId/items/:itemId')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  updateDeskItem(
    @CurrentUser() user: RequestUser,
    @Param('deskId') deskId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateRegulatoryDeskItemDto
  ) {
    return this.service.updateDeskItem(user.sub, deskId, itemId, body);
  }
}
