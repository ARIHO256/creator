import { PrismaClient, type Prisma } from '@prisma/client';
import {
  PROVIDER_SERVICE_TAXONOMY,
  PROVIDER_SERVICE_TAXONOMY_TREE_ID,
  PROVIDER_SERVICE_TAXONOMY_TREE_NAME,
  PROVIDER_SERVICE_TAXONOMY_TREE_SLUG
} from '../src/modules/taxonomy/provider-service-taxonomy.ts';

const prisma = new PrismaClient();

type SeedNode = (typeof PROVIDER_SERVICE_TAXONOMY)[number];
type FlatNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: 'MARKETPLACE' | 'FAMILY' | 'CATEGORY' | 'SUBCATEGORY';
  description: string | null;
  path: string;
  depth: number;
  sortOrder: number;
  metadata: Prisma.InputJsonValue;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'node';

const kindFor = (type: string): FlatNode['kind'] => {
  switch (type) {
    case 'Service Marketplace':
      return 'MARKETPLACE';
    case 'Service Family':
      return 'FAMILY';
    case 'Service Category':
      return 'CATEGORY';
    case 'Service':
      return 'SUBCATEGORY';
    default:
      return 'CATEGORY';
  }
};

function flatten(
  nodes: SeedNode[],
  parentId: string | null = null,
  parentPath = '',
  depth = 0
): FlatNode[] {
  return nodes.flatMap((node, index) => {
    const slug = slugify(node.name);
    const path = parentPath ? `${parentPath}/${slug}` : `/${slug}`;
    const current: FlatNode = {
      id: node.id,
      parentId,
      name: node.name,
      slug,
      kind: kindFor(node.type),
      description: node.description || null,
      path,
      depth,
      sortOrder: index,
      metadata: (node.metadata || {}) as Prisma.InputJsonValue
    };
    return [current, ...flatten(node.children as SeedNode[], node.id, path, depth + 1)];
  });
}

async function main() {
  const nodes = flatten(PROVIDER_SERVICE_TAXONOMY as SeedNode[]);
  const desiredIds = new Set(nodes.map((node) => node.id));

  await prisma.taxonomyTree.upsert({
    where: { id: PROVIDER_SERVICE_TAXONOMY_TREE_ID },
    update: {
      slug: PROVIDER_SERVICE_TAXONOMY_TREE_SLUG,
      name: PROVIDER_SERVICE_TAXONOMY_TREE_NAME,
      description: 'Provider service taxonomy used by provider onboarding.',
      status: 'ACTIVE'
    },
    create: {
      id: PROVIDER_SERVICE_TAXONOMY_TREE_ID,
      slug: PROVIDER_SERVICE_TAXONOMY_TREE_SLUG,
      name: PROVIDER_SERVICE_TAXONOMY_TREE_NAME,
      description: 'Provider service taxonomy used by provider onboarding.',
      status: 'ACTIVE'
    }
  });

  const existing = await prisma.taxonomyNode.findMany({
    where: { treeId: PROVIDER_SERVICE_TAXONOMY_TREE_ID },
    select: { id: true }
  });
  const staleIds = existing.map((entry) => entry.id).filter((id) => !desiredIds.has(id));

  if (staleIds.length > 0) {
    await prisma.storefrontTaxonomyLink.deleteMany({
      where: { taxonomyNodeId: { in: staleIds } }
    });
    await prisma.sellerTaxonomyCoverage.deleteMany({
      where: { taxonomyNodeId: { in: staleIds } }
    });
    await prisma.taxonomyNode.deleteMany({
      where: { id: { in: staleIds } }
    });
  }

  for (const node of nodes) {
    await prisma.taxonomyNode.upsert({
      where: { id: node.id },
      update: {
        treeId: PROVIDER_SERVICE_TAXONOMY_TREE_ID,
        parentId: node.parentId,
        name: node.name,
        slug: node.slug,
        kind: node.kind,
        description: node.description,
        path: node.path,
        depth: node.depth,
        sortOrder: node.sortOrder,
        isActive: true,
        metadata: node.metadata
      },
      create: {
        id: node.id,
        treeId: PROVIDER_SERVICE_TAXONOMY_TREE_ID,
        parentId: node.parentId,
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
  }

  const count = await prisma.taxonomyNode.count({
    where: { treeId: PROVIDER_SERVICE_TAXONOMY_TREE_ID }
  });

  console.log(
    `Imported provider service taxonomy: tree=${PROVIDER_SERVICE_TAXONOMY_TREE_SLUG} nodes=${count} deleted=${staleIds.length}.`
  );
}

main()
  .catch((error) => {
    console.error('\nImporting provider service taxonomy failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
