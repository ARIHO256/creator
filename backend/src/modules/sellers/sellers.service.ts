import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma, SellerKind, UserRole } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { serializePrivateSeller, serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { CreateSellerListingDto } from './dto/create-seller-listing.dto.js';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto.js';
import { UpdateSellerListingDto } from './dto/update-seller-listing.dto.js';

@Injectable()
export class SellersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.ensureSellerProfile(userId);
    return serializePrivateSeller(profile);
  }

  async updateMyProfile(userId: string, payload: UpdateSellerProfileDto) {
    const current = await this.ensureSellerProfile(userId);
    const handle = payload.handle ? await this.ensureUniqueHandle(payload.handle, current.id) : undefined;

    const updated = await this.prisma.seller.update({
      where: { id: current.id },
      data: {
        ...payload,
        handle,
        categories: payload.categories ? JSON.stringify(payload.categories) : undefined,
        languages: payload.languages ? JSON.stringify(payload.languages) : undefined
      }
    });

    return serializePrivateSeller(updated);
  }

  async getPublicProfile(handle: string) {
    const profile = await this.prisma.seller.findUnique({ where: { handle } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }
    return serializePublicSeller(profile);
  }

  async listMyListings(userId: string, query?: ListQueryDto) {
    const profile = await this.ensureSellerProfile(userId);
    const { skip, take } = normalizeListQuery(query);
    return this.prisma.marketplaceListing.findMany({
      where: { sellerId: profile.id },
      skip,
      take,
      include: { deal: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createListing(userId: string, payload: CreateSellerListingDto) {
    const profile = await this.ensureSellerProfile(userId);
    if (payload.taxonomyNodeId) {
      await this.assertTaxonomyNodeAllowed(payload.taxonomyNodeId);
      await this.ensureCoverageForListing(profile.id, payload.taxonomyNodeId);
    }
    const listing = await this.prisma.marketplaceListing.create({
      data: {
        userId,
        sellerId: profile.id,
        dealId: payload.dealId,
        title: payload.title,
        description: payload.description,
        kind: payload.kind,
        category: payload.category,
        sku: payload.sku,
        marketplace: payload.marketplace,
        price: payload.price,
        currency: payload.currency ?? 'USD',
        inventoryCount: payload.inventoryCount ?? 0,
        status: (payload.status ?? 'DRAFT') as ListingStatus,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });

    if (payload.taxonomyNodeId) {
      const node = await this.prisma.taxonomyNode.findUnique({
        where: { id: payload.taxonomyNodeId }
      });
      if (!node) {
        throw new NotFoundException('Taxonomy node not found');
      }

      const pathSnapshot = await this.buildPathSnapshot(node.id);
      const pathSnapshotJson = pathSnapshot as unknown as Prisma.InputJsonValue;

      await this.prisma.listingTaxonomyLink.create({
        data: {
          listingId: listing.id,
          taxonomyNodeId: node.id,
          isPrimary: true,
          pathSnapshot: pathSnapshotJson
        }
      });
    }

    return listing;
  }

  async updateListing(userId: string, id: string, payload: UpdateSellerListingDto) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!listing || listing.userId !== userId) {
      throw new NotFoundException('Seller listing not found');
    }

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...payload,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });

    if (payload.taxonomyNodeId) {
      await this.assertTaxonomyNodeAllowed(payload.taxonomyNodeId);
      await this.ensureCoverageForListing(listing.sellerId ?? listing.seller?.id ?? '', payload.taxonomyNodeId);
      const node = await this.prisma.taxonomyNode.findUnique({
        where: { id: payload.taxonomyNodeId }
      });
      if (!node) {
        throw new NotFoundException('Taxonomy node not found');
      }

      const pathSnapshot = await this.buildPathSnapshot(node.id);
      const pathSnapshotJson = pathSnapshot as unknown as Prisma.InputJsonValue;

      await this.prisma.$transaction([
        this.prisma.listingTaxonomyLink.updateMany({
          where: { listingId: listing.id, isPrimary: true, taxonomyNodeId: { not: node.id } },
          data: { isPrimary: false }
        }),
        this.prisma.listingTaxonomyLink.upsert({
          where: { listingId_taxonomyNodeId: { listingId: listing.id, taxonomyNodeId: node.id } },
          update: { isPrimary: true, pathSnapshot: pathSnapshotJson },
          create: {
            listingId: listing.id,
            taxonomyNodeId: node.id,
            isPrimary: true,
            pathSnapshot: pathSnapshotJson
          }
        })
      ]);
    }

    return updated;
  }

  async listOrders(userId: string, query?: ListQueryDto) {
    const profile = await this.ensureSellerProfile(userId);
    const { skip, take } = normalizeListQuery(query);
    return this.prisma.order.findMany({
      where: { sellerId: profile.id },
      skip,
      take,
      include: {
        items: true,
        buyer: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getOrder(userId: string, id: string) {
    const profile = await this.ensureSellerProfile(userId);
    const order = await this.prisma.order.findFirst({
      where: { id, sellerId: profile.id },
      include: {
        items: {
          include: {
            listing: true
          }
        },
        transactions: true
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async listTransactions(userId: string, query?: ListQueryDto) {
    const profile = await this.ensureSellerProfile(userId);
    const { skip, take } = normalizeListQuery(query);
    return this.prisma.transaction.findMany({
      where: {
        OR: [{ userId }, { sellerId: profile.id }]
      },
      skip,
      take,
      include: {
        order: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async ensureSellerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        roleAssignments: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeRole = user.role;
    const assignedRoles = new Set(user.roleAssignments.map((assignment) => assignment.role));
    const isPrivileged = activeRole === UserRole.ADMIN || activeRole === UserRole.SUPPORT;
    const requiresSellerWorkspace = activeRole === UserRole.SELLER || activeRole === UserRole.PROVIDER;

    if (!isPrivileged && (!requiresSellerWorkspace || !assignedRoles.has(activeRole))) {
      throw new ForbiddenException('Seller workspace is not enabled for the active role');
    }

    if (user.sellerProfile) {
      if (activeRole === UserRole.PROVIDER && user.sellerProfile.kind !== SellerKind.PROVIDER) {
        throw new ForbiddenException('Provider workspace is not enabled for this user');
      }
      if (activeRole === UserRole.SELLER && user.sellerProfile.kind === SellerKind.PROVIDER) {
        throw new ForbiddenException('Seller workspace is not enabled for this user');
      }
      return user.sellerProfile;
    }

    const handle = await this.ensureUniqueHandle(user.email?.split('@')[0] || `seller-${user.id}`);
    const kind = activeRole === UserRole.PROVIDER ? SellerKind.PROVIDER : SellerKind.SELLER;
    return this.prisma.seller.create({
      data: {
        userId,
        handle,
        name: user.email ?? `Seller ${user.id}`,
        displayName: user.email ?? `Seller ${user.id}`,
        storefrontName: user.email ?? `Seller ${user.id}`,
        type: kind === SellerKind.PROVIDER ? 'Provider' : 'Seller',
        kind
      }
    });
  }

  private async buildPathSnapshot(nodeId: string) {
    const path: Array<{ id: string; name: string; type: string }> = [];
    let current = await this.prisma.taxonomyNode.findUnique({ where: { id: nodeId } });

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
        type: this.kindToType(current.kind)
      });

      if (!current.parentId) {
        break;
      }

      current = await this.prisma.taxonomyNode.findUnique({ where: { id: current.parentId } });
    }

    return path;
  }

  private kindToType(kind: string) {
    switch (kind) {
      case 'MARKETPLACE':
        return 'Marketplace';
      case 'FAMILY':
        return 'Product Family';
      case 'CATEGORY':
        return 'Category';
      case 'SUBCATEGORY':
        return 'Sub-Category';
      case 'LINE':
        return 'Line';
      default:
        return 'Category';
    }
  }

  private async assertTaxonomyNodeAllowed(nodeId: string) {
    const activeTree = await this.prisma.taxonomyTree.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' }
    });
    if (!activeTree) {
      throw new NotFoundException('Active taxonomy tree not found');
    }
    const node = await this.prisma.taxonomyNode.findFirst({
      where: { id: nodeId, isActive: true }
    });
    if (!node || node.treeId !== activeTree.id) {
      throw new NotFoundException('Taxonomy node not found');
    }
  }

  private async ensureCoverageForListing(sellerId: string, nodeId: string) {
    if (!sellerId) {
      return;
    }
    await this.prisma.sellerTaxonomyCoverage.upsert({
      where: { sellerId_taxonomyNodeId: { sellerId, taxonomyNodeId: nodeId } },
      update: { status: 'ACTIVE', removedAt: null },
      create: { sellerId, taxonomyNodeId: nodeId, status: 'ACTIVE' }
    });
  }

  private async ensureUniqueHandle(value: string, currentId?: string) {
    const base = String(value || 'seller')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'seller';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.seller.findUnique({ where: { handle: candidate } });
      if (!existing || existing.id === currentId) {
        return candidate;
      }
    }

    return `${base}-${Date.now()}`;
  }
}
