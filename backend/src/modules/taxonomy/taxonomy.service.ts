import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../platform/prisma/prisma.service.js';
import { SellersService } from '../sellers/sellers.service.js';
import { CreateTaxonomyCoverageDto } from './dto/create-taxonomy-coverage.dto.js';
import { CreateTaxonomyNodeDto } from './dto/create-taxonomy-node.dto.js';
import { CreateTaxonomyTreeDto } from './dto/create-taxonomy-tree.dto.js';
import { UpdateTaxonomyCoverageDto } from './dto/update-taxonomy-coverage.dto.js';
import { UpdateTaxonomyNodeDto } from './dto/update-taxonomy-node.dto.js';
import { UpdateTaxonomyTreeDto } from './dto/update-taxonomy-tree.dto.js';
import {
  PROVIDER_SERVICE_TAXONOMY,
  PROVIDER_SERVICE_TAXONOMY_TREE_ID,
  PROVIDER_SERVICE_TAXONOMY_TREE_NAME,
  PROVIDER_SERVICE_TAXONOMY_TREE_SLUG
} from './provider-service-taxonomy.js';
import {
  SELLER_CATALOG_TAXONOMY,
  SELLER_CATALOG_TAXONOMY_TREE_ID,
  SELLER_CATALOG_TAXONOMY_TREE_NAME,
  SELLER_CATALOG_TAXONOMY_TREE_SLUG
} from './seller-catalog-taxonomy.js';

type TaxonomyNodeView = {
  id: string;
  treeId: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: string;
  type: string;
  description: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  metadata: Prisma.JsonValue | null;
  children: TaxonomyNodeView[];
};

type SeedTaxonomyNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  children: SeedTaxonomyNode[];
};

type FlatSeedTaxonomyNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: 'MARKETPLACE' | 'FAMILY' | 'CATEGORY' | 'SUBCATEGORY' | 'LINE';
  description: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  metadata: Prisma.InputJsonValue;
};

@Injectable()
export class TaxonomyService {
  private defaultTreesPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellersService: SellersService
  ) {}

  async listTrees() {
    await this.ensureDefaultTaxonomyTrees();
    return this.prisma.taxonomyTree.findMany({ orderBy: { name: 'asc' } });
  }

  async getTreeNodes(identifier: string, options?: { maxDepth?: number; includeInactive?: boolean }) {
    const tree = await this.resolveTree(identifier);
    const nodes = await this.prisma.taxonomyNode.findMany({
      where: {
        treeId: tree.id,
        isActive: options?.includeInactive ? undefined : true,
        depth: typeof options?.maxDepth === 'number' ? { lte: options.maxDepth } : undefined
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }]
    });

    return {
      tree,
      nodes: this.buildTree(nodes)
    };
  }

  async listNodeChildren(id: string) {
    const node = await this.prisma.taxonomyNode.findUnique({ where: { id } });
    if (!node) {
      throw new NotFoundException('Taxonomy node not found');
    }

    const children = await this.prisma.taxonomyNode.findMany({
      where: { parentId: id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    return children.map((child) => this.serializeNode(child));
  }

  async createTree(payload: CreateTaxonomyTreeDto) {
    const slug = await this.ensureUniqueTreeSlug(payload.slug);
    return this.prisma.taxonomyTree.create({
      data: {
        slug,
        name: payload.name,
        description: payload.description,
        status: payload.status ?? 'ACTIVE'
      }
    });
  }

  async updateTree(id: string, payload: UpdateTaxonomyTreeDto) {
    const existing = await this.prisma.taxonomyTree.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Taxonomy tree not found');
    }

    const slug = payload.slug ? await this.ensureUniqueTreeSlug(payload.slug, id) : undefined;
    return this.prisma.taxonomyTree.update({
      where: { id },
      data: {
        ...payload,
        slug
      }
    });
  }

  async createNode(payload: CreateTaxonomyNodeDto) {
    const tree = await this.prisma.taxonomyTree.findUnique({ where: { id: payload.treeId } });
    if (!tree) {
      throw new NotFoundException('Taxonomy tree not found');
    }

    const parent = payload.parentId
      ? await this.prisma.taxonomyNode.findUnique({ where: { id: payload.parentId } })
      : null;

    if (payload.parentId && !parent) {
      throw new NotFoundException('Parent taxonomy node not found');
    }

    if (parent && parent.treeId !== tree.id) {
      throw new BadRequestException('Parent node does not belong to the requested tree');
    }

    const slug = await this.ensureUniqueNodeSlug(tree.id, payload.slug ?? payload.name);
    const depth = parent ? parent.depth + 1 : 0;
    const path = parent ? `${parent.path}/${slug}` : `/${slug}`;

    return this.prisma.taxonomyNode.create({
      data: {
        treeId: tree.id,
        parentId: parent?.id ?? null,
        name: payload.name,
        slug,
        kind: payload.kind ?? 'CATEGORY',
        description: payload.description,
        path,
        depth,
        sortOrder: payload.sortOrder ?? 0,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async updateNode(id: string, payload: UpdateTaxonomyNodeDto) {
    const existing = await this.prisma.taxonomyNode.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Taxonomy node not found');
    }

    return this.prisma.taxonomyNode.update({
      where: { id },
      data: {
        name: payload.name ?? undefined,
        kind: payload.kind ?? undefined,
        description: payload.description ?? undefined,
        sortOrder: payload.sortOrder ?? undefined,
        isActive: payload.isActive ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }

  async listCoverage(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const coverage = await this.prisma.sellerTaxonomyCoverage.findMany({
      where: { sellerId: seller.id, status: { not: 'REMOVED' } },
      include: { taxonomyNode: true },
      orderBy: { addedAt: 'desc' }
    });

    return coverage.map((item) => ({
      ...item,
      taxonomyNode: this.serializeNode(item.taxonomyNode)
    }));
  }

  async addCoverage(userId: string, payload: CreateTaxonomyCoverageDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const node = await this.prisma.taxonomyNode.findUnique({ where: { id: payload.taxonomyNodeId } });
    if (!node) {
      throw new NotFoundException('Taxonomy node not found');
    }

    const status = payload.status ?? 'ACTIVE';
    const pathSnapshot = await this.buildPathSnapshot(node.id);

    return this.prisma.sellerTaxonomyCoverage.upsert({
      where: {
        sellerId_taxonomyNodeId: {
          sellerId: seller.id,
          taxonomyNodeId: node.id
        }
      },
      update: {
        status,
        notes: payload.notes,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        pathSnapshot,
        removedAt: status === 'REMOVED' ? new Date() : null
      },
      create: {
        sellerId: seller.id,
        taxonomyNodeId: node.id,
        status,
        notes: payload.notes,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        pathSnapshot
      }
    });
  }

  async updateCoverage(userId: string, id: string, payload: UpdateTaxonomyCoverageDto) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.sellerTaxonomyCoverage.findFirst({
      where: { id, sellerId: seller.id }
    });

    if (!existing) {
      throw new NotFoundException('Coverage record not found');
    }

    const status = payload.status ?? existing.status;
    return this.prisma.sellerTaxonomyCoverage.update({
      where: { id: existing.id },
      data: {
        status,
        notes: payload.notes ?? undefined,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
        removedAt: status === 'REMOVED' ? new Date() : null
      }
    });
  }

  async removeCoverage(userId: string, id: string) {
    return this.updateCoverage(userId, id, { status: 'REMOVED' });
  }

  async listingWizardTaxonomy() {
    await this.ensureDefaultTaxonomyTrees();
    const tree =
      (await this.prisma.taxonomyTree.findFirst({
        where: { slug: SELLER_CATALOG_TAXONOMY_TREE_SLUG }
      })) ??
      (await this.prisma.taxonomyTree.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      }));

    if (!tree) {
      return [];
    }

    const { nodes } = await this.getTreeNodes(tree.id);
    return nodes.map((node) => this.serializeListingNode(node));
  }

  async listingWizardLines(userId: string) {
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const coverage = await this.prisma.sellerTaxonomyCoverage.findMany({
      where: { sellerId: seller.id, status: { in: ['ACTIVE', 'SUSPENDED'] } }
    });

    return coverage.map((item) => ({
      nodeId: item.taxonomyNodeId,
      status: item.status === 'ACTIVE' ? 'active' : 'suspended'
    }));
  }

  async assertNodesExist(nodeIds: string[]) {
    await this.ensureDefaultTaxonomyTrees();
    if (nodeIds.length === 0) {
      return;
    }
    const nodes = await this.prisma.taxonomyNode.findMany({
      where: { id: { in: nodeIds }, isActive: true }
    });
    if (nodes.length !== nodeIds.length) {
      const found = new Set(nodes.map((node) => node.id));
      const missing = nodeIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Taxonomy node not found: ${missing.join(', ')}`);
    }
  }

  async assertNodesInActiveTree(nodeIds: string[]) {
    await this.ensureDefaultTaxonomyTrees();
    if (nodeIds.length === 0) {
      return;
    }
    const tree = await this.getActiveTree();
    return this.assertNodesInTree(tree.id, nodeIds);
  }

  async assertNodesInTree(treeIdentifier: string, nodeIds: string[]) {
    await this.ensureDefaultTaxonomyTrees();
    if (nodeIds.length === 0) {
      return;
    }
    const tree = await this.resolveTree(treeIdentifier);
    const nodes = await this.prisma.taxonomyNode.findMany({
      where: { id: { in: nodeIds }, isActive: true },
      select: { id: true, treeId: true }
    });
    if (nodes.length !== nodeIds.length) {
      const found = new Set(nodes.map((node) => node.id));
      const missing = nodeIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Taxonomy node not found: ${missing.join(', ')}`);
    }
    const mismatched = nodes.filter((node) => node.treeId !== tree.id);
    if (mismatched.length > 0) {
      throw new BadRequestException('Taxonomy node does not belong to the active taxonomy tree');
    }
  }

  async ensureCoverageForNodes(userId: string, nodeIds: string[]) {
    if (nodeIds.length === 0) {
      return;
    }
    await this.assertNodesInActiveTree(nodeIds);
    const seller = await this.sellersService.ensureSellerProfile(userId);
    await this.prisma.$transaction(
      nodeIds.map((nodeId) =>
        this.prisma.sellerTaxonomyCoverage.upsert({
          where: { sellerId_taxonomyNodeId: { sellerId: seller.id, taxonomyNodeId: nodeId } },
          update: { status: 'ACTIVE', removedAt: null },
          create: { sellerId: seller.id, taxonomyNodeId: nodeId, status: 'ACTIVE' }
        })
      )
    );
  }

  async syncSellerCoverage(userId: string, nodeIds: string[], treeIdentifier?: string) {
    if (treeIdentifier) {
      await this.assertNodesInTree(treeIdentifier, nodeIds);
    } else {
      await this.assertNodesInActiveTree(nodeIds);
    }
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const existing = await this.prisma.sellerTaxonomyCoverage.findMany({
      where: { sellerId: seller.id }
    });
    const existingMap = new Map(existing.map((entry) => [entry.taxonomyNodeId, entry]));
    const desired = new Set(nodeIds);

    const toRemove = existing.filter((entry) => !desired.has(entry.taxonomyNodeId));
    const toUpsert = nodeIds;
    const now = new Date();

    await this.prisma.$transaction([
      ...toUpsert.map((nodeId, index) => {
        const existingEntry = existingMap.get(nodeId);
        return this.prisma.sellerTaxonomyCoverage.upsert({
          where: {
            sellerId_taxonomyNodeId: {
              sellerId: seller.id,
              taxonomyNodeId: nodeId
            }
          },
          update: {
            status: 'ACTIVE',
            removedAt: null,
            pathSnapshot: existingEntry?.pathSnapshot ?? undefined
          },
          create: {
            sellerId: seller.id,
            taxonomyNodeId: nodeId,
            status: 'ACTIVE',
            pathSnapshot: undefined
          }
        });
      }),
      ...toRemove.map((entry) =>
        this.prisma.sellerTaxonomyCoverage.update({
          where: { id: entry.id },
          data: { status: 'REMOVED', removedAt: now }
        })
      )
    ]);

    const newlyCreated = await this.prisma.sellerTaxonomyCoverage.findMany({
      where: { sellerId: seller.id, pathSnapshot: null }
    });
    if (newlyCreated.length > 0) {
      await Promise.all(
        newlyCreated.map(async (entry) => {
          const pathSnapshot = await this.buildPathSnapshot(entry.taxonomyNodeId);
          await this.prisma.sellerTaxonomyCoverage.update({
            where: { id: entry.id },
            data: { pathSnapshot }
          });
        })
      );
    }
  }

  async syncStorefrontTaxonomy(
    userId: string,
    nodeIds: string[],
    primaryNodeId?: string,
    treeIdentifier?: string
  ) {
    if (primaryNodeId && !nodeIds.includes(primaryNodeId)) {
      throw new BadRequestException('Primary taxonomy node must be included in taxonomyNodeIds');
    }
    if (treeIdentifier) {
      await this.assertNodesInTree(treeIdentifier, nodeIds);
    } else {
      await this.assertNodesInActiveTree(nodeIds);
    }
    const seller = await this.sellersService.ensureSellerProfile(userId);
    const storefront =
      (await this.prisma.storefront.findUnique({ where: { sellerId: seller.id } })) ??
      (await this.prisma.storefront.create({
        data: {
          sellerId: seller.id,
          slug: await this.ensureUniqueStorefrontSlug(
            seller.handle ?? seller.storefrontName ?? seller.displayName ?? seller.name
          ),
          name: seller.storefrontName ?? seller.displayName ?? seller.name,
          isPublished: false
        }
      }));

    const existing = await this.prisma.storefrontTaxonomyLink.findMany({
      where: { storefrontId: storefront.id }
    });
    const existingMap = new Map(existing.map((entry) => [entry.taxonomyNodeId, entry]));
    const desired = new Set(nodeIds);
    const deletions = existing.filter((entry) => !desired.has(entry.taxonomyNodeId));

    await this.prisma.$transaction([
      ...nodeIds.map((nodeId, index) => {
        const isPrimary = primaryNodeId ? nodeId === primaryNodeId : index === 0;
        return this.prisma.storefrontTaxonomyLink.upsert({
          where: {
            storefrontId_taxonomyNodeId: {
              storefrontId: storefront.id,
              taxonomyNodeId: nodeId
            }
          },
          update: {
            isPrimary,
            sortOrder: index
          },
          create: {
            storefrontId: storefront.id,
            taxonomyNodeId: nodeId,
            isPrimary,
            sortOrder: index
          }
        });
      }),
      ...deletions.map((entry) =>
        this.prisma.storefrontTaxonomyLink.delete({ where: { id: entry.id } })
      )
    ]);

    const links = await this.prisma.storefrontTaxonomyLink.findMany({
      where: { storefrontId: storefront.id }
    });
    await Promise.all(
      links.map(async (link) => {
        if (link.pathSnapshot) {
          return;
        }
        const pathSnapshot = await this.buildPathSnapshot(link.taxonomyNodeId);
        await this.prisma.storefrontTaxonomyLink.update({
          where: { id: link.id },
          data: { pathSnapshot }
        });
      })
    );
  }

  private async getActiveTree() {
    await this.ensureDefaultTaxonomyTrees();
    const tree = await this.prisma.taxonomyTree.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' }
    });
    if (!tree) {
      throw new NotFoundException('Active taxonomy tree not found');
    }
    return tree;
  }

  private async resolveTree(identifier: string) {
    await this.ensureDefaultTaxonomyTrees();
    const tree = await this.prisma.taxonomyTree.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }] }
    });

    if (!tree) {
      throw new NotFoundException('Taxonomy tree not found');
    }

    return tree;
  }

  private buildTree(nodes: Array<{
    id: string;
    treeId: string;
    parentId: string | null;
    name: string;
    slug: string;
    kind: string;
    description: string | null;
    path: string;
    depth: number;
    sortOrder: number;
    isActive: boolean;
    metadata: Prisma.JsonValue | null;
  }>) {
    const byId = new Map<string, TaxonomyNodeView>();
    const roots: TaxonomyNodeView[] = [];

    nodes.forEach((node) => {
      byId.set(node.id, {
        id: node.id,
        treeId: node.treeId,
        parentId: node.parentId,
        name: node.name,
        slug: node.slug,
        kind: node.kind,
        type: this.kindToType(node.kind),
        description: node.description,
        path: node.path,
        depth: node.depth,
        sortOrder: node.sortOrder,
        isActive: node.isActive,
        metadata: node.metadata ?? null,
        children: []
      });
    });

    nodes.forEach((node) => {
      const current = byId.get(node.id);
      if (!current) {
        return;
      }

      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  private serializeNode(node: {
    id: string;
    treeId: string;
    parentId: string | null;
    name: string;
    slug: string;
    kind: string;
    description: string | null;
    path: string;
    depth: number;
    sortOrder: number;
    isActive: boolean;
    metadata: Prisma.JsonValue | null;
  }) {
    return {
      id: node.id,
      treeId: node.treeId,
      parentId: node.parentId,
      name: node.name,
      slug: node.slug,
      kind: node.kind,
      type: this.kindToType(node.kind),
      description: node.description,
      path: node.path,
      depth: node.depth,
      sortOrder: node.sortOrder,
      isActive: node.isActive,
      metadata: node.metadata ?? null
    };
  }

  private serializeListingNode(node: TaxonomyNodeView): {
    id: string;
    type: string;
    name: string;
    description: string | null;
    metadata: Prisma.JsonValue | null;
    children: Array<{
      id: string;
      type: string;
      name: string;
      description: string | null;
      metadata: Prisma.JsonValue | null;
      children: any[];
    }>;
  } {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      description: node.description,
      metadata: node.metadata ?? null,
      children: node.children.map((child) => this.serializeListingNode(child))
    };
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

  private async ensureUniqueTreeSlug(value: string, currentId?: string) {
    const base = this.normalizeSlug(value);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.taxonomyTree.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === currentId) {
        return candidate;
      }
    }

    return `${base}-${Date.now()}`;
  }

  private async ensureUniqueStorefrontSlug(value: string) {
    const base = this.normalizeSlug(value);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.storefront.findUnique({ where: { slug: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    return `${base}-${Date.now()}`;
  }

  private async ensureUniqueNodeSlug(treeId: string, value: string) {
    const base = this.normalizeSlug(value);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.prisma.taxonomyNode.findFirst({
        where: { treeId, slug: candidate }
      });
      if (!existing) {
        return candidate;
      }
    }

    return `${base}-${Date.now()}`;
  }

  private normalizeSlug(value: string) {
    return (
      String(value || 'taxonomy')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'taxonomy'
    );
  }

  private async ensureDefaultTaxonomyTrees() {
    if (this.defaultTreesPromise) {
      return this.defaultTreesPromise;
    }

    this.defaultTreesPromise = (async () => {
      await this.ensureSeededTree({
        treeId: SELLER_CATALOG_TAXONOMY_TREE_ID,
        slug: SELLER_CATALOG_TAXONOMY_TREE_SLUG,
        name: SELLER_CATALOG_TAXONOMY_TREE_NAME,
        description: 'Seller catalog taxonomy used by seller onboarding and listing workflows.',
        nodes: SELLER_CATALOG_TAXONOMY as SeedTaxonomyNode[]
      });
      await this.ensureSeededTree({
        treeId: PROVIDER_SERVICE_TAXONOMY_TREE_ID,
        slug: PROVIDER_SERVICE_TAXONOMY_TREE_SLUG,
        name: PROVIDER_SERVICE_TAXONOMY_TREE_NAME,
        description: 'Provider service taxonomy used by provider onboarding.',
        nodes: PROVIDER_SERVICE_TAXONOMY as SeedTaxonomyNode[]
      });
    })().catch((error) => {
      this.defaultTreesPromise = null;
      throw error;
    });

    return this.defaultTreesPromise;
  }

  private async ensureSeededTree(config: {
    treeId: string;
    slug: string;
    name: string;
    description: string;
    nodes: SeedTaxonomyNode[];
  }) {
    const treeBySlug = await this.prisma.taxonomyTree.findUnique({
      where: { slug: config.slug }
    });
    const treeById =
      treeBySlug?.id === config.treeId
        ? treeBySlug
        : await this.prisma.taxonomyTree.findUnique({
            where: { id: config.treeId }
          });

    const tree = treeBySlug
      ? await this.prisma.taxonomyTree.update({
          where: { id: treeBySlug.id },
          data: {
            name: config.name,
            description: config.description,
            status: 'ACTIVE'
          }
        })
      : treeById
        ? await this.prisma.taxonomyTree.update({
            where: { id: treeById.id },
            data: {
              slug: config.slug,
              name: config.name,
              description: config.description,
              status: 'ACTIVE'
            }
          })
        : await this.prisma.taxonomyTree.create({
            data: {
              id: config.treeId,
              slug: config.slug,
              name: config.name,
              description: config.description,
              status: 'ACTIVE'
            }
          });

    const flatNodes = this.flattenSeedNodes(config.nodes);
    const resolvedNodeIds = new Map<string, string>();
    for (const node of flatNodes) {
      const resolvedParentId = node.parentId ? resolvedNodeIds.get(node.parentId) ?? node.parentId : null;
      const existingByPath = await this.prisma.taxonomyNode.findUnique({
        where: {
          treeId_path: {
            treeId: tree.id,
            path: node.path
          }
        }
      });
      const existingById =
        existingByPath?.id === node.id
          ? existingByPath
          : await this.prisma.taxonomyNode.findUnique({
              where: { id: node.id }
            });

      const persisted = existingByPath
        ? await this.prisma.taxonomyNode.update({
            where: { id: existingByPath.id },
            data: {
              parentId: resolvedParentId,
              name: node.name,
              slug: node.slug,
              kind: node.kind,
              description: node.description,
              path: node.path,
              depth: node.depth,
              sortOrder: node.sortOrder,
              isActive: true,
              metadata: node.metadata
            }
          })
        : existingById
          ? await this.prisma.taxonomyNode.update({
              where: { id: existingById.id },
              data: {
                treeId: tree.id,
                parentId: resolvedParentId,
                name: node.name,
                slug: node.slug,
                kind: node.kind,
                description: node.description,
                path: node.path,
                depth: node.depth,
                sortOrder: node.sortOrder,
                isActive: true,
                metadata: node.metadata
              }
            })
          : await this.prisma.taxonomyNode.create({
              data: {
                id: node.id,
                treeId: tree.id,
                parentId: resolvedParentId,
                name: node.name,
                slug: node.slug,
                kind: node.kind,
                description: node.description,
                path: node.path,
                depth: node.depth,
                sortOrder: node.sortOrder,
                isActive: true,
                metadata: node.metadata
              }
            });

      resolvedNodeIds.set(node.id, persisted.id);
    }
  }

  private flattenSeedNodes(
    nodes: SeedTaxonomyNode[],
    parentId: string | null = null,
    parentPath = '',
    depth = 0
  ): FlatSeedTaxonomyNode[] {
    return nodes.flatMap((node, index) => {
      const slug = this.normalizeSlug(node.id || node.name);
      const path = parentPath ? `${parentPath}/${slug}` : `/${slug}`;
      const current: FlatSeedTaxonomyNode = {
        id: node.id,
        parentId,
        name: node.name,
        slug,
        kind: this.kindForSeedNode(node.type),
        description: node.description || null,
        path,
        depth,
        sortOrder: index,
        metadata: (node.metadata || {}) as Prisma.InputJsonValue
      };

      return [current, ...this.flattenSeedNodes(node.children || [], node.id, path, depth + 1)];
    });
  }

  private kindForSeedNode(type: string): FlatSeedTaxonomyNode['kind'] {
    switch (type) {
      case 'Marketplace':
      case 'Service Marketplace':
        return 'MARKETPLACE';
      case 'Product Family':
      case 'Service Family':
        return 'FAMILY';
      case 'Category':
      case 'Service Category':
        return 'CATEGORY';
      case 'Sub-Category':
      case 'Service':
        return 'SUBCATEGORY';
      case 'Line':
        return 'LINE';
      default:
        return 'CATEGORY';
    }
  }
}
