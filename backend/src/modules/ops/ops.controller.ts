import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { OpsSummaryQueryDto } from './dto/ops-summary-query.dto.js';
import { OpsService } from './ops.service.js';

@Controller('ops')
@Roles('SELLER', 'ADMIN')
export class OpsController {
  constructor(private readonly service: OpsService) {}

  @Get('overview')
  overview(@CurrentUser() user: RequestUser, @Query() query: OpsSummaryQueryDto) {
    return this.service.overview(user.sub, query);
  }

  @Get('overview-page')
  overviewPage(@CurrentUser() user: RequestUser) {
    return this.service.overviewPage(user.sub);
  }

  @Patch('overview-page')
  updateOverviewPage(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.service.updateOverviewPage(user.sub, body);
  }

  @Get('inventory')
  inventory(@CurrentUser() user: RequestUser) {
    return this.service.inventory(user.sub);
  }

  @Get('inventory-page')
  inventoryPage(@CurrentUser() user: RequestUser) {
    return this.service.inventoryPage(user.sub);
  }

  @Patch('inventory-page')
  updateInventoryPage(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.service.updateInventoryPage(user.sub, body);
  }

  @Get('shipping')
  shipping(@CurrentUser() user: RequestUser) {
    return this.service.shipping(user.sub);
  }

  @Get('warehouses')
  warehouses(@CurrentUser() user: RequestUser) {
    return this.service.warehouses(user.sub);
  }

  @Get('documents')
  documents(@CurrentUser() user: RequestUser) {
    return this.service.documents(user.sub);
  }

  @Get('exports')
  exports(@CurrentUser() user: RequestUser) {
    return this.service.exports(user.sub);
  }

  @Get('exceptions')
  exceptions(@CurrentUser() user: RequestUser) {
    return this.service.exceptions(user.sub);
  }

  @Get('compliance-page')
  compliancePage(@CurrentUser() user: RequestUser) {
    return this.service.compliancePage(user.sub);
  }

  @Patch('compliance-page')
  updateCompliancePage(@CurrentUser() user: RequestUser, @Body() body: Record<string, unknown>) {
    return this.service.updateCompliancePage(user.sub, body);
  }
}
