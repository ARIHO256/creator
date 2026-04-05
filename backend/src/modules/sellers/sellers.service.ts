import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma, SellerKind, UserRole } from '@prisma/client';
import { ListQueryDto, normalizeListQuery } from '../../common/dto/list-query.dto.js';
import { serializePrivateSeller, serializePublicSeller } from '../../common/serializers/seller.serializer.js';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SearchService } from '../search/search.service.js';
import { CreateSellerListingDto } from './dto/create-seller-listing.dto.js';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto.js';
import { UpdateSellerListingDto } from './dto/update-seller-listing.dto.js';

@Injectable()
export class SellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService
  ) {}

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
    await this.prisma.marketplaceListing.updateMany({
      where: { userId, sellerId: null },
      data: { sellerId: profile.id }
    });
    await this.ensureCoverageSeedListings(userId, profile.id);
    const { skip, take } = normalizeListQuery(query);
    return this.prisma.marketplaceListing.findMany({
      where: {
        OR: [{ sellerId: profile.id }, { userId }]
      },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async createListing(userId: string, payload: CreateSellerListingDto) {
    const profile = await this.ensureSellerProfile(userId);
    const nextStatus = this.normalizeListingStatus(payload.status);
    const nextMetadata = this.normalizeListingMetadata(payload.metadata, nextStatus);
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
        status: nextStatus,
        metadata: nextMetadata as Prisma.InputJsonValue | undefined
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

    await this.searchService.enqueueListingIndex(listing.id);
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

    const nextStatus = payload.status ? this.normalizeListingStatus(payload.status) : undefined;
    const nextMetadata = this.normalizeListingMetadata(payload.metadata, nextStatus);

    const updated = await this.prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...payload,
        status: nextStatus,
        metadata: nextMetadata as Prisma.InputJsonValue | undefined
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

    await this.searchService.enqueueListingIndex(updated.id);
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
        OR: [
          { userId },
          { sellerId: profile.id }
        ]
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

  private async ensureCoverageSeedListings(userId: string, sellerId: string) {
    const coverage = await this.prisma.sellerTaxonomyCoverage.findMany({
      where: {
        sellerId,
        status: { in: ['ACTIVE', 'SUSPENDED'] }
      },
      include: {
        taxonomyNode: {
          select: {
            id: true,
            name: true,
            path: true,
            kind: true,
            isActive: true
          }
        }
      }
    });

    const activeNodes = coverage
      .map((entry) => entry.taxonomyNode)
      .filter((node): node is NonNullable<typeof node> => Boolean(node?.isActive));
    if (activeNodes.length === 0) {
      return;
    }

    const lineNodes = activeNodes.filter((node) => node.kind === 'LINE');
    const baseNodes = lineNodes.length > 0 ? lineNodes : activeNodes;
    const candidateNodes = baseNodes.filter((node) => {
      if (lineNodes.length > 0) {
        return true;
      }
      return !baseNodes.some(
        (other) => other.id !== node.id && String(other.path || '').startsWith(`${node.path}/`)
      );
    });

    const nodeIds = candidateNodes.map((node) => node.id);
    if (nodeIds.length === 0) {
      return;
    }

    const existing = await this.prisma.listingTaxonomyLink.findMany({
      where: {
        taxonomyNodeId: { in: nodeIds },
        listing: {
          OR: [{ sellerId }, { userId }]
        }
      },
      select: {
        taxonomyNodeId: true
      }
    });
    const existingNodeIds = new Set(existing.map((entry) => entry.taxonomyNodeId));

    for (const node of candidateNodes) {
      if (existingNodeIds.has(node.id)) {
        continue;
      }

      const pathSnapshot = await this.buildPathSnapshot(node.id);
      const marketplace =
        pathSnapshot.find((segment) => segment.type === 'Marketplace')?.name || 'EVmart';
      const category =
        [...pathSnapshot]
          .reverse()
          .find((segment) => ['Line', 'Sub-Category', 'Category'].includes(segment.type))?.name ||
        node.name;
      const slugSeed = String(node.path || node.name || node.id).split('/').pop() || node.id;
      const sku = `${this.toSkuToken(slugSeed)}-${sellerId.slice(-6).toUpperCase()}`;
      const metadata = {
        autogenerated: true,
        generatedFrom: 'seller_taxonomy_coverage',
        coverageNodeId: node.id,
        displayStatus: 'Draft',
        kind: 'Product',
        marketplace,
        category,
        taxonomyNodeId: node.id,
        taxonomyPath: pathSnapshot
      } as Prisma.InputJsonValue;

      const listing = await this.prisma.marketplaceListing.create({
        data: {
          userId,
          sellerId,
          title: `${node.name}`,
          description: `Autogenerated draft for ${node.name}`,
          kind: 'PRODUCT',
          category,
          sku,
          marketplace,
          price: 0,
          currency: 'USD',
          inventoryCount: 0,
          status: ListingStatus.DRAFT,
          metadata
        }
      });

      await this.prisma.listingTaxonomyLink.create({
        data: {
          listingId: listing.id,
          taxonomyNodeId: node.id,
          isPrimary: true,
          pathSnapshot: pathSnapshot as unknown as Prisma.InputJsonValue
        }
      });
      await this.searchService.enqueueListingIndex(listing.id);
    }
  }

  private toSkuToken(value: string) {
    const token = String(value || 'LISTING')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return token || 'LISTING';
  }

  private normalizeListingStatus(status?: string): ListingStatus {
    const normalized = String(status || 'DRAFT').trim().toUpperCase();
    if (normalized === 'IN_REVIEW') {
      return ListingStatus.ACTIVE;
    }
    return normalized as ListingStatus;
  }

  private normalizeListingMetadata(
    metadata: Record<string, unknown> | undefined,
    status?: ListingStatus
  ): Record<string, unknown> | undefined {
    if (!metadata && !status) {
      return metadata;
    }

    const next =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...metadata }
        : {};

    if (status) {
      next.displayStatus =
        status === ListingStatus.ACTIVE
          ? 'Live'
          : status === ListingStatus.PAUSED
            ? 'Paused'
            : status === ListingStatus.ARCHIVED
              ? 'Rejected'
              : 'Draft';
    }

    return next;
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
