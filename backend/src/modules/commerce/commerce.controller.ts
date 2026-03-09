import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../../common/dto/list-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateExportJobDto } from './dto/create-export-job.dto.js';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CreateReturnDto } from './dto/create-return.dto.js';
import { CreateShippingProfileDto } from './dto/create-shipping-profile.dto.js';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateDisputeDto } from './dto/update-dispute.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { UpdateReturnDto } from './dto/update-return.dto.js';
import { UpdateShippingProfileDto } from './dto/update-shipping-profile.dto.js';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';
import { CommerceService } from './commerce.service.js';

@Controller('seller')
@Roles('SELLER', 'PROVIDER', 'ADMIN')
export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  @Get('dashboard') dashboard(@CurrentUser() user: RequestUser) { return this.service.dashboard(user.sub); }
  @Get('listings') listings(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) { return this.service.listings(user.sub, query); }
  @Get('listings/:id') listing(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.listingDetail(user.sub, id); }
  @Get('listing-wizard') listingWizard(@CurrentUser() user: RequestUser) { return this.service.listingWizard(user.sub); }
  @Get('orders') orders(@CurrentUser() user: RequestUser, @Query() query: ListQueryDto) { return this.service.orders(user.sub, query); }
  @Get('orders/:id') order(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.orderDetail(user.sub, id); }
  @Get('returns') returns(@CurrentUser() user: RequestUser) { return this.service.returns(user.sub); }
  @Get('disputes') disputes(@CurrentUser() user: RequestUser) { return this.service.disputes(user.sub); }
  @Get('inventory') inventory(@CurrentUser() user: RequestUser) { return this.service.inventory(user.sub); }
  @Get('shipping-profiles') shippingProfiles(@CurrentUser() user: RequestUser) { return this.service.shippingProfiles(user.sub); }
  @Post('shipping-profiles') createShippingProfile(@CurrentUser() user: RequestUser, @Body() payload: CreateShippingProfileDto) {
    return this.service.createShippingProfile(user.sub, payload);
  }
  @Patch('shipping-profiles/:id') updateShippingProfile(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateShippingProfileDto) {
    return this.service.updateShippingProfile(user.sub, id, payload);
  }
  @Post('shipping-profiles/:id/rates') createShippingRate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: CreateShippingRateDto) {
    return this.service.createShippingRate(user.sub, id, payload);
  }
  @Patch('shipping-profiles/:profileId/rates/:rateId') updateShippingRate(
    @CurrentUser() user: RequestUser,
    @Param('profileId') profileId: string,
    @Param('rateId') rateId: string,
    @Body() payload: UpdateShippingRateDto
  ) {
    return this.service.updateShippingRate(user.sub, profileId, rateId, payload);
  }
  @Get('warehouses') warehouses(@CurrentUser() user: RequestUser) { return this.service.warehouses(user.sub); }
  @Post('warehouses') createWarehouse(@CurrentUser() user: RequestUser, @Body() payload: CreateWarehouseDto) {
    return this.service.createWarehouse(user.sub, payload);
  }
  @Patch('warehouses/:id') updateWarehouse(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateWarehouseDto) {
    return this.service.updateWarehouse(user.sub, id, payload);
  }
  @Get('exports') exports(@CurrentUser() user: RequestUser) { return this.service.exports(user.sub); }
  @Post('exports') createExport(@CurrentUser() user: RequestUser, @Body() payload: CreateExportJobDto) {
    return this.service.createExportJob(user.sub, payload);
  }
  @Get('documents') documents(@CurrentUser() user: RequestUser) { return this.service.documents(user.sub); }
  @Post('documents') createDocument(@CurrentUser() user: RequestUser, @Body() payload: CreateDocumentDto) {
    return this.service.createDocument(user.sub, payload);
  }
  @Patch('documents/:id') updateDocument(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateDocumentDto) {
    return this.service.updateDocument(user.sub, id, payload);
  }
  @Post('returns') createReturn(@CurrentUser() user: RequestUser, @Body() payload: CreateReturnDto) {
    return this.service.createReturn(user.sub, payload);
  }
  @Patch('returns/:id') updateReturn(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateReturnDto) {
    return this.service.updateReturn(user.sub, id, payload);
  }
  @Post('disputes') createDispute(@CurrentUser() user: RequestUser, @Body() payload: CreateDisputeDto) {
    return this.service.createDispute(user.sub, payload);
  }
  @Patch('disputes/:id') updateDispute(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateDisputeDto) {
    return this.service.updateDispute(user.sub, id, payload);
  }
  @Post('inventory/adjustments') adjustInventory(@CurrentUser() user: RequestUser, @Body() payload: CreateInventoryAdjustmentDto) {
    return this.service.createInventoryAdjustment(user.sub, payload);
  }
  @Get('finance/wallets') wallets(@CurrentUser() user: RequestUser) { return this.service.financeWallets(user.sub); }
  @Get('finance/holds') holds(@CurrentUser() user: RequestUser) { return this.service.financeHolds(user.sub); }
  @Get('finance/invoices') invoices(@CurrentUser() user: RequestUser) { return this.service.financeInvoices(user.sub); }
  @Get('finance/statements') statements(@CurrentUser() user: RequestUser) { return this.service.financeStatements(user.sub); }
  @Get('finance/tax-reports') taxReports(@CurrentUser() user: RequestUser) { return this.service.financeTaxReports(user.sub); }
}
