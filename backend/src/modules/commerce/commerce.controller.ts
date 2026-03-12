import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequestUser } from '../../common/types/request-user.type.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateExportJobDto } from './dto/create-export-job.dto.js';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto.js';
import { CreateReturnDto } from './dto/create-return.dto.js';
import { BulkListingCommitDto } from './dto/bulk-listing-commit.dto.js';
import { BulkListingValidateDto } from './dto/bulk-listing-validate.dto.js';
import { DashboardSummaryQueryDto } from './dto/dashboard-summary.dto.js';
import { SellerDisputesQueryDto } from './dto/seller-disputes-query.dto.js';
import { SellerListingsQueryDto } from './dto/seller-listings-query.dto.js';
import { SellerOrdersQueryDto } from './dto/seller-orders-query.dto.js';
import { SellerReturnsQueryDto } from './dto/seller-returns-query.dto.js';
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
@Roles('SELLER', 'ADMIN')
export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  @Get('dashboard') dashboard(@CurrentUser() user: RequestUser) { return this.service.dashboard(user.sub); }
  @Get('dashboard/summary') dashboardSummary(
    @CurrentUser() user: RequestUser,
    @Query() query: DashboardSummaryQueryDto
  ) {
    return this.service.dashboardSummary(user.sub, query);
  }
  @Get('listings') listings(@CurrentUser() user: RequestUser, @Query() query: SellerListingsQueryDto) { return this.service.listings(user.sub, query); }
  @Get('listings/:id') listing(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.listingDetail(user.sub, id); }
  @Get('listing-wizard') listingWizard(@CurrentUser() user: RequestUser) { return this.service.listingWizard(user.sub); }
  @Get('cart') cart(@CurrentUser() user: RequestUser) { return this.service.cart(user.sub); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('cart/items')
  addCartItem(
    @CurrentUser() user: RequestUser,
    @Body() body: { listingId?: string; qty?: number }
  ) {
    return this.service.addCartItem(user.sub, body);
  }
  @Get('orders') orders(@CurrentUser() user: RequestUser, @Query() query: SellerOrdersQueryDto) { return this.service.orders(user.sub, query); }
  @Get('orders/:id') order(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.orderDetail(user.sub, id); }
  @Get('orders/:id/print/invoice') printInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.printInvoice(user.sub, id); }
  @Get('orders/:id/print/packing-slip') printPackingSlip(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.printPackingSlip(user.sub, id); }
  @Get('orders/:id/print/sticker') printSticker(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.printSticker(user.sub, id); }
  @Get('returns') returns(@CurrentUser() user: RequestUser, @Query() query: SellerReturnsQueryDto) { return this.service.returns(user.sub, query); }
  @Get('disputes') disputes(@CurrentUser() user: RequestUser, @Query() query: SellerDisputesQueryDto) { return this.service.disputes(user.sub, query); }
  @Get('inventory') inventory(@CurrentUser() user: RequestUser) { return this.service.inventory(user.sub); }
  @Get('shipping-profiles') shippingProfiles(@CurrentUser() user: RequestUser) { return this.service.shippingProfiles(user.sub); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('shipping-profiles') createShippingProfile(@CurrentUser() user: RequestUser, @Body() payload: CreateShippingProfileDto) {
    return this.service.createShippingProfile(user.sub, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('shipping-profiles/:id') updateShippingProfile(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateShippingProfileDto) {
    return this.service.updateShippingProfile(user.sub, id, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('shipping-profiles/:id/rates') createShippingRate(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: CreateShippingRateDto) {
    return this.service.createShippingRate(user.sub, id, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('shipping-profiles/:profileId/rates/:rateId') updateShippingRate(
    @CurrentUser() user: RequestUser,
    @Param('profileId') profileId: string,
    @Param('rateId') rateId: string,
    @Body() payload: UpdateShippingRateDto
  ) {
    return this.service.updateShippingRate(user.sub, profileId, rateId, payload);
  }
  @Get('warehouses') warehouses(@CurrentUser() user: RequestUser) { return this.service.warehouses(user.sub); }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('warehouses') createWarehouse(@CurrentUser() user: RequestUser, @Body() payload: CreateWarehouseDto) {
    return this.service.createWarehouse(user.sub, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('warehouses/:id') updateWarehouse(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateWarehouseDto) {
    return this.service.updateWarehouse(user.sub, id, payload);
  }
  @Get('exports') exports(@CurrentUser() user: RequestUser) { return this.service.exports(user.sub); }
  @Get('exports/:id') exportJob(@CurrentUser() user: RequestUser, @Param('id') id: string) { return this.service.exportJob(user.sub, id); }
  @Get('exports/:id/download')
  async downloadExport(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('fileId') fileId: string | undefined,
    @Res() reply: FastifyReply
  ) {
    const { file, stream } = await this.service.exportDownload(user.sub, id, fileId);
    reply.header('Content-Type', file.mimeType ?? 'application/octet-stream');
    reply.header('Content-Disposition', `attachment; filename="${file.storageKey.split('/').pop()}"`);
    return reply.send(stream);
  }
  @RateLimit({ limit: 15, windowMs: 60_000 })
  @Post('exports') createExport(@CurrentUser() user: RequestUser, @Body() payload: CreateExportJobDto) {
    return this.service.createExportJob(user.sub, payload);
  }
  @Get('documents') documents(@CurrentUser() user: RequestUser) { return this.service.documents(user.sub); }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Post('documents') createDocument(@CurrentUser() user: RequestUser, @Body() payload: CreateDocumentDto) {
    return this.service.createDocument(user.sub, payload);
  }
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Patch('documents/:id') updateDocument(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateDocumentDto) {
    return this.service.updateDocument(user.sub, id, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('returns') createReturn(@CurrentUser() user: RequestUser, @Body() payload: CreateReturnDto) {
    return this.service.createReturn(user.sub, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('returns/:id') updateReturn(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateReturnDto) {
    return this.service.updateReturn(user.sub, id, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Post('disputes') createDispute(@CurrentUser() user: RequestUser, @Body() payload: CreateDisputeDto) {
    return this.service.createDispute(user.sub, payload);
  }
  @RateLimit({ limit: 30, windowMs: 60_000 })
  @Patch('disputes/:id') updateDispute(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: UpdateDisputeDto) {
    return this.service.updateDispute(user.sub, id, payload);
  }
  @RateLimit({ limit: 40, windowMs: 60_000 })
  @Post('inventory/adjustments') adjustInventory(@CurrentUser() user: RequestUser, @Body() payload: CreateInventoryAdjustmentDto) {
    return this.service.createInventoryAdjustment(user.sub, payload);
  }
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('listings/bulk/validate') validateListings(@CurrentUser() user: RequestUser, @Body() payload: BulkListingValidateDto) {
    return this.service.validateBulkListings(user.sub, payload);
  }
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Post('listings/bulk/commit') commitListings(@CurrentUser() user: RequestUser, @Body() payload: BulkListingCommitDto) {
    return this.service.commitBulkListings(user.sub, payload);
  }
  @Get('finance/home') financeHome(@CurrentUser() user: RequestUser) { return this.service.financeHome(user.sub); }
  @Get('finance/wallets') wallets(@CurrentUser() user: RequestUser) { return this.service.financeWallets(user.sub); }
  @Get('finance/holds') holds(@CurrentUser() user: RequestUser) { return this.service.financeHolds(user.sub); }
  @Get('finance/invoices') invoices(@CurrentUser() user: RequestUser) { return this.service.financeInvoices(user.sub); }
  @Get('finance/statements') statements(@CurrentUser() user: RequestUser) { return this.service.financeStatements(user.sub); }
  @Get('finance/tax-reports') taxReports(@CurrentUser() user: RequestUser) { return this.service.financeTaxReports(user.sub); }
  @Patch('finance/invoices/:id')
  updateInvoice(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.service.updateFinanceInvoice(user.sub, id, payload);
  }
  @Delete('finance/holds/:id') removeHold(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.removeFinanceHold(user.sub, id);
  }
}
