import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { TaxonomyService } from '../taxonomy/taxonomy.service.js';
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

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AppRecordsService,
    private readonly taxonomyService: TaxonomyService,
    private readonly sellersService: SellersService
  ) {}

  async dashboard(userId: string) {
    return this.records
      .getByEntityId('seller_workspace', 'dashboard', 'main', userId)
      .then((record) => record.payload)
      .catch(async () => {
        const [listingCount, orderCount] = await Promise.all([
          this.prisma.marketplaceListing.count({ where: { userId } }),
          this.prisma.order.count({ where: { seller: { userId } } })
        ]);

        return {
          quickActions: [
            { key: 'new-listing', label: 'New Listing', to: '/listings/new' },
            { key: 'orders', label: 'Orders', to: '/orders' }
          ],
          hero: {
            name: 'Seller Workspace',
            sub: 'Unified seller operations and growth command center.',
            ctaLabel: 'Open Listings',
            ctaTo: '/listings',
            chipWhenMLDZ: 'LiveDealz enabled',
            chipWhenNoMLDZ: 'Core commerce'
          },
          featured: {
            title: 'Operations Snapshot',
            sub: `${listingCount} listings and ${orderCount} tracked orders`,
            ctaLabel: 'Open Ops',
            ctaTo: '/ops'
          },
          bases: {
            revenueBase: 100,
            ordersBase: 100,
            trustBase: 100
          }
        };
      });
  }

  async listings(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { updatedAt: 'desc' }
    });

    if (listings.length > 0) {
      return listings;
    }

    return this.records
      .getByEntityId('seller_workspace', 'listings', 'main', userId)
      .then((record) => this.sliceRows(record.payload, skip, take))
      .catch(() => ({ rows: [] }));
  }

  async listingDetail(userId: string, id: string) {
    const listing = await this.prisma.marketplaceListing.findFirst({ where: { id, userId } });
    if (listing) {
      return listing;
    }

    const content = await this.listings(userId);
    const rows = Array.isArray((content as any).rows) ? (content as any).rows : [];
    const found = rows.find((row: any) => row.id === id);
    if (!found) {
      throw new NotFoundException('Listing not found');
    }
    return found;
  }

  async listingWizard(userId: string) {
    const fallback = await this.records
      .getByEntityId('seller_workspace', 'listing_wizard', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ taxonomy: [], baseLines: [], copy: {} }));

    const taxonomy = await this.taxonomyService.listingWizardTaxonomy();
    if (taxonomy.length === 0) {
      return fallback;
    }

    let baseLines: unknown = (fallback as Record<string, unknown>).baseLines ?? [];
    try {
      baseLines = await this.taxonomyService.listingWizardLines(userId);
    } catch {
      baseLines = (fallback as Record<string, unknown>).baseLines ?? [];
    }
    return {
      ...(fallback as Record<string, unknown>),
      taxonomy,
      baseLines
    };
  }

  async orders(userId: string, query?: ListQueryDto) {
    const { skip, take } = normalizeListQuery(query);
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const orders = seller
      ? await this.prisma.order.findMany({
          where: { sellerId: seller.id },
          skip,
          take,
          include: { items: true },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    if (orders.length > 0) {
      return { orders };
    }

    return this.records
      .getByEntityId('seller_workspace', 'orders', 'main', userId)
      .then((record) => this.sliceRows(record.payload, skip, take, 'orders'))
      .catch(() => ({ orders: [], returns: [], disputes: [] }));
  }

  async orderDetail(userId: string, id: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const order = seller
      ? await this.prisma.order.findFirst({
          where: { id, sellerId: seller.id },
          include: { items: true, transactions: true }
        })
      : null;

    if (order) {
      return order;
    }

    const ordersPayload = await this.orders(userId);
    const rows = Array.isArray((ordersPayload as any).orders) ? (ordersPayload as any).orders : [];
    const found = rows.find((row: any) => row.id === id);
    if (!found) {
      throw new NotFoundException('Order not found');
    }
    return found;
  }

  async returns(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (seller) {
      const returns = await this.prisma.sellerReturn.findMany({
        where: { sellerId: seller.id },
        orderBy: { requestedAt: 'desc' }
      });
      if (returns.length > 0) {
        return returns;
      }
    }

    const payload = await this.orders(userId);
    return (payload as any).returns ?? [];
  }

  async disputes(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (seller) {
      const disputes = await this.prisma.sellerDispute.findMany({
        where: { sellerId: seller.id },
        orderBy: { openedAt: 'desc' }
      });
      if (disputes.length > 0) {
        return disputes;
      }
    }

    const payload = await this.orders(userId);
    return (payload as any).disputes ?? [];
  }

  async inventory(userId: string) {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { userId },
      include: { inventorySlots: { include: { warehouse: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    if (listings.length > 0) {
      return { rows: listings };
    }

    return this.records
      .getByEntityId('seller_workspace', 'inventory', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ rows: [] }));
  }

  async shippingProfiles(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const profiles = seller
      ? await this.prisma.shippingProfile.findMany({
          where: { sellerId: seller.id },
          include: { rates: true },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        })
      : [];

    if (profiles.length > 0) {
      return { profiles };
    }

    return this.records
      .getByEntityId('seller_workspace', 'shipping_profiles', 'main', userId)
      .then((r) => r.payload)
      .catch(() => ({ profiles: [] }));
  }

  async warehouses(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const warehouses = seller
      ? await this.prisma.sellerWarehouse.findMany({
          where: { sellerId: seller.id },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }]
        })
      : [];

    if (warehouses.length > 0) {
      return { warehouses };
    }

    return this.records
      .getByEntityId('seller_workspace', 'warehouses', 'main', userId)
      .then((r) => r.payload)
      .catch(() => ({ warehouses: [] }));
  }

  async exports(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const jobs = seller
      ? await this.prisma.sellerExportJob.findMany({
          where: { sellerId: seller.id },
          orderBy: { requestedAt: 'desc' }
        })
      : [];

    if (jobs.length > 0) {
      return { jobs };
    }

    return this.records
      .getByEntityId('seller_workspace', 'exports', 'main', userId)
      .then((r) => r.payload)
      .catch(() => ({ jobs: [] }));
  }

  async documents(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const documents = seller
      ? await this.prisma.sellerDocument.findMany({
          where: { sellerId: seller.id },
          orderBy: { uploadedAt: 'desc' }
        })
      : [];

    if (documents.length > 0) {
      return { documents };
    }

    return this.records
      .getByEntityId('seller_workspace', 'documents', 'main', userId)
      .then((r) => r.payload)
      .catch(() => ({ documents: [] }));
  }

  async financeWallets(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'finance_wallets', 'main', userId).then((r) => r.payload).catch(() => ({ wallets: [] }));
  }

  async financeHolds(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'finance_holds', 'main', userId).then((r) => r.payload).catch(() => ({ holds: [] }));
  }

  async financeInvoices(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'finance_invoices', 'main', userId).then((r) => r.payload).catch(() => ({ invoices: [] }));
  }

  async financeStatements(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'finance_statements', 'main', userId).then((r) => r.payload).catch(() => ({ statements: [] }));
  }

  async financeTaxReports(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'finance_tax_reports', 'main', userId).then((r) => r.payload).catch(() => ({ reports: [] }));
  }

  async createWarehouse(userId: string, payload: CreateWarehouseDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.isDefault) {
      await this.prisma.sellerWarehouse.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.sellerWarehouse.create({
      data: {
        sellerId: seller.id,
        name: payload.name,
        code: payload.code,
        type: payload.type ?? 'WAREHOUSE',
        status: payload.status ?? 'ACTIVE',
        isDefault: payload.isDefault ?? false,
        address: payload.address as Prisma.InputJsonValue | undefined,
        contact: payload.contact as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateWarehouse(userId: string, id: string, payload: UpdateWarehouseDto) {
    const seller = await this.ensureSeller(userId);
    const warehouse = await this.prisma.sellerWarehouse.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    if (payload.isDefault) {
      await this.prisma.sellerWarehouse.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.sellerWarehouse.update({
      where: { id: warehouse.id },
      data: {
        name: payload.name ?? undefined,
        code: payload.code ?? undefined,
        type: payload.type ?? undefined,
        status: payload.status ?? undefined,
        isDefault: payload.isDefault ?? undefined,
        address: payload.address as Prisma.InputJsonValue | undefined,
        contact: payload.contact as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createShippingProfile(userId: string, payload: CreateShippingProfileDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.isDefault) {
      await this.prisma.shippingProfile.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.shippingProfile.create({
      data: {
        sellerId: seller.id,
        name: payload.name,
        description: payload.description,
        status: payload.status ?? 'ACTIVE',
        carrier: payload.carrier,
        serviceLevel: payload.serviceLevel,
        handlingTimeDays: payload.handlingTimeDays,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        isDefault: payload.isDefault ?? false,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateShippingProfile(userId: string, id: string, payload: UpdateShippingProfileDto) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    if (payload.isDefault) {
      await this.prisma.shippingProfile.updateMany({
        where: { sellerId: seller.id },
        data: { isDefault: false }
      });
    }

    return this.prisma.shippingProfile.update({
      where: { id: profile.id },
      data: {
        name: payload.name ?? undefined,
        description: payload.description ?? undefined,
        status: payload.status ?? undefined,
        carrier: payload.carrier ?? undefined,
        serviceLevel: payload.serviceLevel ?? undefined,
        handlingTimeDays: payload.handlingTimeDays ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        isDefault: payload.isDefault ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createShippingRate(userId: string, profileId: string, payload: CreateShippingRateDto) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id: profileId, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    return this.prisma.shippingRate.create({
      data: {
        profileId: profile.id,
        name: payload.name,
        rateType: payload.rateType ?? 'FLAT',
        minWeight: payload.minWeight,
        maxWeight: payload.maxWeight,
        minOrderValue: payload.minOrderValue,
        maxOrderValue: payload.maxOrderValue,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        etaDays: payload.etaDays,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateShippingRate(
    userId: string,
    profileId: string,
    rateId: string,
    payload: UpdateShippingRateDto
  ) {
    const seller = await this.ensureSeller(userId);
    const profile = await this.prisma.shippingProfile.findFirst({
      where: { id: profileId, sellerId: seller.id }
    });
    if (!profile) {
      throw new NotFoundException('Shipping profile not found');
    }

    const rate = await this.prisma.shippingRate.findFirst({
      where: { id: rateId, profileId: profile.id }
    });
    if (!rate) {
      throw new NotFoundException('Shipping rate not found');
    }

    return this.prisma.shippingRate.update({
      where: { id: rate.id },
      data: {
        name: payload.name ?? undefined,
        rateType: payload.rateType ?? undefined,
        minWeight: payload.minWeight ?? undefined,
        maxWeight: payload.maxWeight ?? undefined,
        minOrderValue: payload.minOrderValue ?? undefined,
        maxOrderValue: payload.maxOrderValue ?? undefined,
        price: payload.price ?? undefined,
        currency: payload.currency ?? undefined,
        etaDays: payload.etaDays ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createInventoryAdjustment(userId: string, payload: CreateInventoryAdjustmentDto) {
    const seller = await this.ensureSeller(userId);
    const listing = await this.prisma.marketplaceListing.findFirst({
      where: { id: payload.listingId, sellerId: seller.id }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const warehouse = await this.resolveWarehouse(seller.id, payload.warehouseId);
    if (!warehouse) {
      throw new BadRequestException('Warehouse is required for inventory adjustments');
    }

    const slotKey = {
      listingId_warehouseId: {
        listingId: listing.id,
        warehouseId: warehouse.id
      }
    };

    const [slot, adjustment] = await this.prisma.$transaction([
      this.prisma.listingInventorySlot.upsert({
        where: slotKey,
        update: {
          onHand: { increment: payload.delta }
        },
        create: {
          listingId: listing.id,
          warehouseId: warehouse.id,
          onHand: payload.delta,
          reserved: 0,
          safetyStock: 0
        }
      }),
      this.prisma.inventoryAdjustment.create({
        data: {
          listingId: listing.id,
          warehouseId: warehouse.id,
          createdByUserId: userId,
          delta: payload.delta,
          reason: payload.reason,
          metadata: payload.metadata as Prisma.InputJsonValue | undefined
        }
      }),
      this.prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { inventoryCount: { increment: payload.delta } }
      })
    ]);

    return { slot, adjustment };
  }

  async createDocument(userId: string, payload: CreateDocumentDto) {
    const seller = await this.ensureSeller(userId);
    if (payload.listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: { id: payload.listingId, sellerId: seller.id }
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
    }

    return this.prisma.sellerDocument.create({
      data: {
        sellerId: seller.id,
        listingId: payload.listingId,
        type: payload.type,
        channel: payload.channel,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        fileName: payload.fileName,
        url: payload.url,
        status: payload.status ?? 'UPLOADED',
        uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : new Date(),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateDocument(userId: string, id: string, payload: UpdateDocumentDto) {
    const seller = await this.ensureSeller(userId);
    const document = await this.prisma.sellerDocument.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (payload.listingId) {
      const listing = await this.prisma.marketplaceListing.findFirst({
        where: { id: payload.listingId, sellerId: seller.id }
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
    }

    return this.prisma.sellerDocument.update({
      where: { id: document.id },
      data: {
        type: payload.type ?? undefined,
        channel: payload.channel ?? undefined,
        regions: payload.regions as Prisma.InputJsonValue | undefined,
        fileName: payload.fileName ?? undefined,
        url: payload.url ?? undefined,
        status: payload.status ?? undefined,
        uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : undefined,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        listingId: payload.listingId ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createExportJob(userId: string, payload: CreateExportJobDto) {
    const seller = await this.ensureSeller(userId);
    return this.prisma.sellerExportJob.create({
      data: {
        sellerId: seller.id,
        type: payload.type,
        format: payload.format ?? 'CSV',
        status: 'QUEUED',
        filters: payload.filters as Prisma.InputJsonValue | undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async createReturn(userId: string, payload: CreateReturnDto) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: payload.orderId, sellerId: seller.id }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.sellerReturn.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'REQUESTED',
        reason: payload.reason,
        notes: payload.notes,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateReturn(userId: string, id: string, payload: UpdateReturnDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerReturn.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Return not found');
    }

    return this.prisma.sellerReturn.update({
      where: { id: existing.id },
      data: {
        status: payload.status ?? undefined,
        reason: payload.reason ?? undefined,
        notes: payload.notes ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        approvedAt: payload.status === 'APPROVED' ? new Date() : undefined,
        receivedAt: payload.status === 'RECEIVED' ? new Date() : undefined,
        refundedAt: payload.status === 'REFUNDED' ? new Date() : undefined
      }
    });
  }

  async createDispute(userId: string, payload: CreateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const order = await this.prisma.order.findFirst({
      where: { id: payload.orderId, sellerId: seller.id }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.sellerDispute.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        status: payload.status ?? 'OPEN',
        reason: payload.reason,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateDispute(userId: string, id: string, payload: UpdateDisputeDto) {
    const seller = await this.ensureSeller(userId);
    const existing = await this.prisma.sellerDispute.findFirst({
      where: { id, sellerId: seller.id }
    });
    if (!existing) {
      throw new NotFoundException('Dispute not found');
    }

    return this.prisma.sellerDispute.update({
      where: { id: existing.id },
      data: {
        status: payload.status ?? undefined,
        reason: payload.reason ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        resolvedAt: payload.status && ['RESOLVED', 'REJECTED'].includes(payload.status) ? new Date() : undefined
      }
    });
  }

  private sliceRows(payload: unknown, skip: number, take: number, key = 'rows') {
    const content = payload as Record<string, unknown>;
    const rows = Array.isArray(content[key] as unknown[]) ? ([...(content[key] as unknown[])] as unknown[]) : [];

    return {
      ...content,
      [key]: rows.slice(skip, skip + take)
    };
  }

  private async ensureSeller(userId: string) {
    return this.sellersService.ensureSellerProfile(userId);
  }

  private async resolveWarehouse(sellerId: string, warehouseId?: string) {
    if (warehouseId) {
      return this.prisma.sellerWarehouse.findFirst({
        where: { id: warehouseId, sellerId }
      });
    }

    return this.prisma.sellerWarehouse.findFirst({
      where: { sellerId, isDefault: true }
    });
  }
}
