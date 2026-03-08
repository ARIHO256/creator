import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class CommerceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly records: AppRecordsService
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

  async listings(userId: string) {
    const listings = await this.prisma.marketplaceListing.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    if (listings.length > 0) {
      return listings;
    }

    return this.records
      .getByEntityId('seller_workspace', 'listings', 'main', userId)
      .then((record) => record.payload)
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
    return this.records
      .getByEntityId('seller_workspace', 'listing_wizard', 'main', userId)
      .then((record) => record.payload)
      .catch(() => ({ taxonomy: [], baseLines: [], copy: {} }));
  }

  async orders(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    const orders = seller
      ? await this.prisma.order.findMany({
          where: { sellerId: seller.id },
          include: { items: true },
          orderBy: { updatedAt: 'desc' }
        })
      : [];

    if (orders.length > 0) {
      return { orders };
    }

    return this.records
      .getByEntityId('seller_workspace', 'orders', 'main', userId)
      .then((record) => record.payload)
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
    const payload = await this.orders(userId);
    return (payload as any).returns ?? [];
  }

  async disputes(userId: string) {
    const payload = await this.orders(userId);
    return (payload as any).disputes ?? [];
  }

  async inventory(userId: string) {
    return this.records
      .getByEntityId('seller_workspace', 'inventory', 'main', userId)
      .then((record) => record.payload)
      .catch(async () => {
        const listings = await this.prisma.marketplaceListing.findMany({
          where: { userId },
          select: { id: true, title: true, inventoryCount: true, sku: true, status: true }
        });
        return { rows: listings };
      });
  }

  async shippingProfiles(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'shipping_profiles', 'main', userId).then((r) => r.payload).catch(() => ({ profiles: [] }));
  }

  async warehouses(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'warehouses', 'main', userId).then((r) => r.payload).catch(() => ({ warehouses: [] }));
  }

  async exports(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'exports', 'main', userId).then((r) => r.payload).catch(() => ({ jobs: [] }));
  }

  async documents(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'documents', 'main', userId).then((r) => r.payload).catch(() => ({ documents: [] }));
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
}
