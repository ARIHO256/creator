import bcrypt from 'bcrypt';
import { PrismaClient, type Prisma, type UserRole } from '@prisma/client';
import sellerfrontSeedModule from '../../sellerfront/src/mocks/seed.ts';
import type { MockDB } from '../../sellerfront/src/mocks/types.ts';
import catalogTaxonomyModule from '../../sellerfront/src/mocks/catalogTaxonomy.ts';
import providerListingWizardModule from '../../sellerfront/src/mock/provider/listingWizard.ts';
import {
  createDefaultOnboardingState,
  prepareSubmittedOnboarding,
  sellerSlugToHandle,
  type OnboardingState
} from '../src/modules/workflow/onboarding-state.ts';

const prisma = new PrismaClient();
const { seedMockDb } = sellerfrontSeedModule as {
  seedMockDb: () => MockDB;
};
const { CATALOG_TAXONOMY } = catalogTaxonomyModule as {
  CATALOG_TAXONOMY: FrontendTaxonomyNode[];
};
const { providerListingWizardContent } = providerListingWizardModule as {
  providerListingWizardContent: {
    baseLines: Array<{ nodeId: string; status: string }>;
  };
};

const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const SELLERFRONT_TAXONOMY_TREE_SLUG = 'sellerfront-catalog-taxonomy';
const SELLERFRONT_TAXONOMY_TREE_ID = 'taxonomy_tree_sellerfront_catalog';

type Snapshot = MockDB;

const toUserRole = (role: string): UserRole => {
  switch (String(role).toLowerCase()) {
    case 'seller':
      return 'SELLER';
    case 'provider':
      return 'PROVIDER';
    default:
      return 'CREATOR';
  }
};

const assignedRolesFor = (role: string): UserRole[] => {
  const normalized = String(role).toLowerCase();
  if (normalized === 'provider') {
    return ['PROVIDER', 'SELLER'];
  }
  if (normalized === 'seller') {
    return ['SELLER'];
  }
  return ['CREATOR'];
};

const sellerKindFor = (role: string) =>
  String(role).toLowerCase() === 'provider' ? 'PROVIDER' : 'SELLER';

const listingStatusFor = (status?: string) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
      return 'ACTIVE';
    case 'in review':
      return 'IN_REVIEW';
    case 'paused':
      return 'PAUSED';
    case 'archived':
      return 'ARCHIVED';
    default:
      return 'DRAFT';
  }
};

const orderStatusFor = (status?: string) => {
  switch (String(status || '').toLowerCase()) {
    case 'new':
      return 'NEW';
    case 'confirmed':
      return 'CONFIRMED';
    case 'packed':
      return 'PACKED';
    case 'shipped':
      return 'SHIPPED';
    case 'delivered':
      return 'DELIVERED';
    case 'on hold':
      return 'ON_HOLD';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'NEW';
  }
};

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const MOCK_ONBOARDING_SOURCE = 'sellerfront_mock_import';

type FrontendTaxonomyNode = {
  id: string;
  type: string;
  name: string;
  description?: string;
  children?: FrontendTaxonomyNode[];
};

type ImportedTaxonomyNode = {
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

const resolveUserId = (userIdMap: Map<string, string>, userId?: string | null) =>
  userId ? (userIdMap.get(userId) ?? userId) : null;
const requireResolvedUserId = (
  userIdMap: Map<string, string>,
  userId: string | undefined | null,
  context: string
) => {
  const resolved = resolveUserId(userIdMap, userId);
  if (!resolved) {
    throw new Error(`Unable to resolve user id for ${context}`);
  }

  return resolved;
};

const taxonomyKindFor = (type?: string): ImportedTaxonomyNode['kind'] => {
  const normalized = String(type || '')
    .trim()
    .toLowerCase();
  if (normalized === 'marketplace') return 'MARKETPLACE';
  if (normalized === 'product family' || normalized === 'service family' || normalized === 'family')
    return 'FAMILY';
  if (normalized === 'sub-category' || normalized === 'subcategory') return 'SUBCATEGORY';
  if (normalized === 'line') return 'LINE';
  return 'CATEGORY';
};

const mergeTaxonomyRoots = (...collections: FrontendTaxonomyNode[][]) => {
  const map = new Map<string, FrontendTaxonomyNode>();

  const mergeNode = (node: FrontendTaxonomyNode): FrontendTaxonomyNode => {
    const existing = map.get(node.id);
    const children = Array.isArray(node.children) ? node.children.map(mergeNode) : [];
    if (!existing) {
      const next: FrontendTaxonomyNode = {
        id: node.id,
        type: node.type,
        name: node.name,
        description: node.description,
        children
      };
      map.set(node.id, next);
      return next;
    }

    const childMap = new Map<string, FrontendTaxonomyNode>();
    [...(existing.children || []), ...children].forEach((child) => {
      childMap.set(child.id, child);
    });

    existing.type = existing.type || node.type;
    existing.name = existing.name || node.name;
    existing.description = existing.description || node.description;
    existing.children = Array.from(childMap.values());
    return existing;
  };

  collections.flat().forEach((node) => {
    mergeNode(node);
  });

  return Array.from(map.values());
};

const flattenTaxonomy = (roots: FrontendTaxonomyNode[]) => {
  const nodes: ImportedTaxonomyNode[] = [];
  const seen = new Set<string>();

  const visit = (
    node: FrontendTaxonomyNode,
    parentId: string | null,
    parentPath: string,
    depth: number,
    sortOrder: number
  ) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);

    const slug = sanitizeId(node.id.toLowerCase());
    const path = `${parentPath}/${slug}`;
    nodes.push({
      id: node.id,
      parentId,
      name: node.name,
      slug,
      kind: taxonomyKindFor(node.type),
      description: node.description || null,
      path,
      depth,
      sortOrder,
      metadata: {
        source: 'sellerfront',
        sourceType: node.type,
        frontendId: node.id
      } as Prisma.InputJsonValue
    });

    (node.children || []).forEach((child, index) => visit(child, node.id, path, depth + 1, index));
  };

  roots.forEach((root, index) => visit(root, null, '', 0, index));
  return nodes;
};

const buildPathSnapshot = (
  nodeId: string,
  nodeMap: Map<string, ImportedTaxonomyNode>
): Prisma.InputJsonValue => {
  const path: Array<{ id: string; name: string; slug: string; kind: string; path: string }> = [];
  let current = nodeMap.get(nodeId);
  const guard = new Set<string>();

  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift({
      id: current.id,
      name: current.name,
      slug: current.slug,
      kind: current.kind,
      path: current.path
    });
    current = current.parentId ? nodeMap.get(current.parentId) ?? null : null;
  }

  return path as Prisma.InputJsonValue;
};

const buildTaxonomyNodes = (snapshot: Snapshot) => {
  const sellerTaxonomy = snapshot.pageContent.listingWizard.seller.taxonomy as FrontendTaxonomyNode[];
  const providerTaxonomy = snapshot.pageContent.listingWizard.provider.taxonomy as FrontendTaxonomyNode[];
  const roots = mergeTaxonomyRoots(CATALOG_TAXONOMY as FrontendTaxonomyNode[], sellerTaxonomy, providerTaxonomy);
  const nodes = flattenTaxonomy(roots);
  return {
    nodes,
    nodeMap: new Map(nodes.map((node) => [node.id, node]))
  };
};

const buildTaxonomySelections = (
  lines: Array<{ nodeId: string; status: string }>,
  nodeMap: Map<string, ImportedTaxonomyNode>
) =>
  lines
    .map((line) => {
      const node = nodeMap.get(line.nodeId);
      if (!node) return null;
      const pathNodes = buildPathSnapshot(line.nodeId, nodeMap) as Array<{
        id: string;
        name: string;
        slug: string;
        kind: string;
        path: string;
      }>;
      return {
        nodeId: line.nodeId,
        label: node.name,
        slug: node.slug,
        status: line.status,
        path: pathNodes.map((entry) => entry.name),
        pathNodes: pathNodes.map((entry) => ({
          id: entry.id,
          name: entry.name,
          type: entry.kind
        }))
      };
    })
    .filter((selection): selection is NonNullable<typeof selection> => Boolean(selection));

const buildWorkflowSeedPayload = (
  snapshot: Snapshot,
  role: 'seller' | 'provider',
  userIdMap: Map<string, string>,
  nodeMap: Map<string, ImportedTaxonomyNode>
) => {
  const user = snapshot.users.find((entry) => entry.role === role);
  if (!user) return null;
  const userId = resolveUserId(userIdMap, user.id);
  if (!userId) return null;

  const address = user.addresses?.[0];
  const listings = snapshot.listings.filter((listing) => listing.sellerId === user.id);
  const marketplaces = Array.from(
    new Set(listings.map((listing) => String(listing.marketplace || '').trim()).filter(Boolean))
  );
  const lines =
    role === 'provider'
      ? snapshot.pageContent.listingWizard.provider.baseLines
      : snapshot.pageContent.listingWizard.seller.baseLines;
  const taxonomySelections = buildTaxonomySelections(lines, nodeMap);
  const primarySelection =
    taxonomySelections.find((selection) => selection.status === 'active') ?? taxonomySelections[0] ?? null;
  const sellerHandle = sellerSlugToHandle(
    user.email.split('@')[0] || user.name || `${role}-store`
  );
  const docs = snapshot.pageContent.compliance[role].docs.map((doc, index) => ({
    id: String(doc.id ?? `${role}-doc-${index + 1}`),
    type: String(doc.type ?? 'document'),
    name: String(doc.fileName || doc.type || `Document ${index + 1}`),
    file: doc.fileName || undefined,
    fileUrl: doc.fileName ? `mock://${doc.fileName}` : undefined,
    status: String(doc.status ?? 'submitted'),
    expiry: doc.expiresAt || undefined,
    uploadedAt: doc.uploadedAt || snapshot.seededAt,
    notes: [doc.channel, ...(Array.isArray(doc.regions) ? doc.regions : [])].filter(Boolean).join(' · ')
  }));
  const locale = String(user.preferences?.locale || 'en').toUpperCase();
  const currency = String(user.preferences?.currency || 'USD').toUpperCase();
  const providerServices =
    role === 'provider'
      ? Array.from(new Set(taxonomySelections.map((selection) => selection.label)))
      : [];
  const bookingModes =
    role === 'provider'
      ? Array.from(
          new Set(
            [
              marketplaces.includes('ServiceMart') ? 'On-site' : null,
              marketplaces.includes('Consultations') ? 'Remote' : null,
              'Scheduled'
            ].filter((value): value is string => Boolean(value))
          )
        )
      : [];
  const now = snapshot.seededAt;

  const onboarding: OnboardingState = {
    ...createDefaultOnboardingState(role === 'provider' ? 'PROVIDER' : 'SELLER'),
    owner: user.name,
    status: 'in_progress',
    storeName: role === 'provider' ? `${user.name} Services` : `${user.name} Store`,
    storeSlug: sellerHandle,
    email: user.email,
    phone: user.phone || '',
    website: `https://${sellerHandle}.demo.evzone`,
    about:
      listings[0]?.description ||
      (role === 'provider'
        ? `${user.name} imported from sellerfront provider onboarding mocks.`
        : `${user.name} imported from sellerfront seller onboarding mocks.`),
    brandColor: role === 'provider' ? '#F77F00' : '#03CD8C',
    support: {
      whatsapp: user.phone || '',
      email: user.email,
      phone: user.phone || ''
    },
    shipFrom: {
      country: address?.country || 'UG',
      province: '',
      city: address?.city || 'Kampala',
      address1: address?.line1 || '',
      address2: '',
      postalCode: ''
    },
    channels: marketplaces,
    languages: [locale],
    taxonomySelection: primarySelection,
    taxonomySelections,
    docs: {
      list:
        docs.length > 0
          ? docs
          : [
              {
                id: `${role}-doc-seed`,
                type: role === 'provider' ? 'Service Provider License' : 'Business Registration',
                name: role === 'provider' ? 'service-license.pdf' : 'business-registration.pdf',
                fileUrl: `mock://${role}-doc-seed`,
                status: 'Approved',
                uploadedAt: now
              }
            ]
    },
    shipping: {
      profileId: role === 'provider' ? 'provider-service-default' : 'seller-shipping-default',
      expressReady: role !== 'provider',
      handlingTimeDays: role === 'provider' ? 1 : 3
    },
    policies: {
      returnsDays: role === 'provider' ? 0 : 7,
      warrantyDays: 30,
      termsUrl: `https://${sellerHandle}.demo.evzone/terms`,
      privacyUrl: `https://${sellerHandle}.demo.evzone/privacy`,
      policyNotes: role === 'provider' ? 'Service appointments are confirmed after availability review.' : ''
    },
    payout: {
      method: 'bank_transfer',
      currency,
      rhythm: 'weekly',
      thresholdAmount: role === 'provider' ? 50 : 100,
      bankName: 'Demo Bank',
      bankCountry: address?.country || 'UG',
      bankBranch: 'Main Branch',
      accountName: user.name,
      accountNo: role === 'provider' ? '001234567890' : '009876543210',
      swiftBic: 'DEMOUGKA',
      iban: '',
      mobileProvider: 'MTN',
      mobileCountryCode: '+256',
      mobileNo: (user.phone || '').replace(/^\+256/, ''),
      mobileIdType: 'NIN',
      mobileIdNumber: role === 'provider' ? 'CM1234567890' : 'CM0987654321',
      alipayRegion: '',
      alipayLogin: '',
      wechatRegion: '',
      wechatId: '',
      otherMethod: '',
      otherProvider: '',
      otherCountry: '',
      otherNotes: '',
      notificationsEmail: user.email,
      notificationsWhatsApp: user.phone || '',
      confirmDetails: true,
      otherDetails: '',
      otherDescription: ''
    },
    tax: {
      taxpayerType: role === 'provider' ? 'SOLE_PROPRIETOR' : 'BUSINESS',
      legalName: user.name,
      taxCountry: address?.country || 'UG',
      taxId: role === 'provider' ? 'PVDR-TAX-001' : 'SELL-TAX-001',
      vatNumber: '',
      legalAddress: address?.line1 || '',
      contact: user.name,
      contactEmail: user.email,
      contactSameAsOwner: true
    },
    acceptance: {
      sellerTerms: true,
      contentPolicy: true,
      dataProcessing: true
    },
    verification: {
      emailVerified: true,
      phoneVerified: Boolean(user.phone),
      verificationPhone: user.phone || '',
      verificationEmail: user.email,
      kycStatus: 'APPROVED',
      otpStatus: 'VERIFIED',
      kycReference: `${role.toUpperCase()}-KYC-SEED`
    },
    steps: [
      {
        id: 'profile',
        title: 'Profile',
        status: 'completed',
        required: true,
        completedAt: now
      },
      {
        id: 'coverage',
        title: role === 'provider' ? 'Service lines' : 'Catalog coverage',
        status: 'completed',
        required: true,
        completedAt: now
      },
      {
        id: 'documents',
        title: 'Verification documents',
        status: 'completed',
        required: true,
        completedAt: now
      },
      {
        id: 'review',
        title: 'Review',
        status: 'completed',
        required: true,
        completedAt: now
      }
    ],
    providerServices,
    bookingModes,
    metadata: {
      source: MOCK_ONBOARDING_SOURCE,
      importedAt: now,
      seedRole: role
    },
    submittedAt: null,
    updatedAt: now
  };

  const submitted = prepareSubmittedOnboarding(onboarding);
  return {
    userId,
    onboarding: submitted,
    accountApproval: {
      status: 'pending',
      progressPercent: 15,
      submittedAt: submitted.submittedAt,
      reviewNotes: '',
      requiredActions: [],
      documents: (submitted.docs.list as Array<Record<string, unknown>>).map((doc, index) => ({
        id: String(doc.id ?? `doc-${index + 1}`),
        type: String(doc.type ?? 'document'),
        status: String(doc.status ?? 'submitted'),
        note: typeof doc.notes === 'string' ? doc.notes : undefined
      })),
      metadata: {
        source: MOCK_ONBOARDING_SOURCE,
        uiStatus: 'Submitted',
        profileType: submitted.profileType,
        submissionSnapshot: {
          owner: submitted.owner,
          storeName: submitted.storeName,
          storeSlug: submitted.storeSlug,
          email: submitted.email,
          phone: submitted.phone,
          channels: submitted.channels,
          languages: submitted.languages,
          taxonomySelections: submitted.taxonomySelections,
          submittedAt: submitted.submittedAt,
          updatedAt: submitted.updatedAt
        }
      }
    }
  };
};

async function upsertWorkflowSeedRecord(
  userId: string,
  recordType: 'onboarding' | 'account_approval',
  payload: Prisma.InputJsonValue
) {
  const existing = await prisma.workflowRecord.findUnique({
    where: {
      userId_recordType_recordKey: {
        userId,
        recordType,
        recordKey: 'main'
      }
    }
  });
  const existingPayload =
    existing?.payload && typeof existing.payload === 'object' && !Array.isArray(existing.payload)
      ? (existing.payload as Record<string, unknown>)
      : null;
  const existingMetadata =
    existingPayload?.metadata && typeof existingPayload.metadata === 'object' && !Array.isArray(existingPayload.metadata)
      ? (existingPayload.metadata as Record<string, unknown>)
      : null;
  const existingSource = typeof existingMetadata?.source === 'string' ? existingMetadata.source : '';

  if (existing && existingSource && existingSource !== MOCK_ONBOARDING_SOURCE) {
    return;
  }

  await prisma.workflowRecord.upsert({
    where: {
      userId_recordType_recordKey: {
        userId,
        recordType,
        recordKey: 'main'
      }
    },
    update: {
      payload
    },
    create: {
      userId,
      recordType,
      recordKey: 'main',
      payload
    }
  });
}

async function upsertWorkflowSeeds(snapshot: Snapshot, userIdMap: Map<string, string>) {
  const { nodeMap } = buildTaxonomyNodes(snapshot);

  for (const role of ['seller', 'provider'] as const) {
    const seed = buildWorkflowSeedPayload(snapshot, role, userIdMap, nodeMap);
    if (!seed) continue;
    await upsertWorkflowSeedRecord(
      seed.userId,
      'onboarding',
      seed.onboarding as unknown as Prisma.InputJsonValue
    );
    await upsertWorkflowSeedRecord(
      seed.userId,
      'account_approval',
      seed.accountApproval as Prisma.InputJsonValue
    );
  }
}

async function upsertUser(
  snapshot: Snapshot,
  user: Snapshot['users'][number],
  userIdMap: Map<string, string>
) {
  const passwordHash = await bcrypt.hash(user.password || 'demo1234', 12);
  const role = toUserRole(user.role);
  const assignedRoles = assignedRolesFor(user.role);
  const existingById = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, phone: true }
  });
  const existingByEmail = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, email: true, phone: true }
  });
  const existingByPhone = user.phone
    ? await prisma.user.findUnique({
        where: { phone: user.phone },
        select: { id: true, email: true, phone: true }
      })
    : null;
  const targetUserId = existingById?.id ?? existingByEmail?.id ?? user.id;
  const safePhone =
    existingByPhone && existingByPhone.id !== targetUserId ? null : (user.phone ?? null);
  userIdMap.set(user.id, targetUserId);

  await prisma.user.upsert({
    where: { id: targetUserId },
    update: {
      email: user.email,
      phone: safePhone,
      passwordHash,
      role,
      approvalStatus: 'APPROVED',
      onboardingCompleted: true
    },
    create: {
      id: targetUserId,
      email: user.email,
      phone: safePhone,
      passwordHash,
      role,
      approvalStatus: 'APPROVED',
      onboardingCompleted: true
    }
  });

  await prisma.userRoleAssignment.createMany({
    data: assignedRoles.map((assignedRole) => ({
      userId: targetUserId,
      role: assignedRole
    })),
    skipDuplicates: true
  });

  if (user.role === 'seller' || user.role === 'provider') {
    const listings = snapshot.listings.filter((listing) => listing.sellerId === user.id);
    const primaryListing = listings[0];
    const categories = Array.from(
      new Set(listings.map((listing) => String(listing.category || '').trim()).filter(Boolean))
    );

    await prisma.seller.upsert({
      where: { id: targetUserId },
      update: {
        userId: targetUserId,
        handle:
          user.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') || sanitizeId(targetUserId.toLowerCase()),
        name: user.name,
        displayName: user.name,
        storefrontName: `${user.name} Store`,
        type: user.role === 'provider' ? 'Provider' : 'Seller',
        kind: sellerKindFor(user.role),
        category: primaryListing?.category || null,
        categories: categories.length ? JSON.stringify(categories) : null,
        region: user.addresses?.[0]?.country || null,
        description: primaryListing?.description || `${user.name} imported from sellerfront mocks.`,
        languages: JSON.stringify([String(user.preferences?.locale || 'en').toUpperCase()]),
        isVerified: true
      },
      create: {
        id: targetUserId,
        userId: targetUserId,
        handle:
          user.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') || sanitizeId(targetUserId.toLowerCase()),
        name: user.name,
        displayName: user.name,
        storefrontName: `${user.name} Store`,
        type: user.role === 'provider' ? 'Provider' : 'Seller',
        kind: sellerKindFor(user.role),
        category: primaryListing?.category || null,
        categories: categories.length ? JSON.stringify(categories) : null,
        region: user.addresses?.[0]?.country || null,
        description: primaryListing?.description || `${user.name} imported from sellerfront mocks.`,
        languages: JSON.stringify([String(user.preferences?.locale || 'en').toUpperCase()]),
        isVerified: true
      }
    });
  }

  return targetUserId;
}

async function upsertListings(snapshot: Snapshot, userIdMap: Map<string, string>) {
  for (const listing of snapshot.listings) {
    const sellerId = requireResolvedUserId(userIdMap, listing.sellerId, `listing ${listing.id}`);
    const price =
      typeof listing.retailPrice === 'number'
        ? listing.retailPrice
        : typeof listing.compareAt === 'number'
          ? listing.compareAt
          : 0;

    await prisma.marketplaceListing.upsert({
      where: { id: listing.id },
      update: {
        userId: sellerId,
        sellerId,
        title: listing.title,
        description: listing.description || null,
        kind: listing.kind || null,
        category: listing.category || null,
        sku: listing.sku || listing.id,
        marketplace: listing.marketplace || null,
        price,
        currency: listing.currency || 'USD',
        inventoryCount: listing.stock || 0,
        status: listingStatusFor(listing.status),
        metadata: listing as unknown as Prisma.InputJsonValue
      },
      create: {
        id: listing.id,
        userId: sellerId,
        sellerId,
        title: listing.title,
        description: listing.description || null,
        kind: listing.kind || null,
        category: listing.category || null,
        sku: listing.sku || listing.id,
        marketplace: listing.marketplace || null,
        price,
        currency: listing.currency || 'USD',
        inventoryCount: listing.stock || 0,
        status: listingStatusFor(listing.status),
        metadata: listing as unknown as Prisma.InputJsonValue
      }
    });
  }
}

async function upsertOrders(snapshot: Snapshot, userIdMap: Map<string, string>) {
  const sellerUserId = requireResolvedUserId(
    userIdMap,
    snapshot.users.find((user) => user.role === 'seller')?.id,
    'seller orders'
  );
  for (const order of snapshot.orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {
        sellerId: sellerUserId,
        buyerUserId: resolveUserId(userIdMap, order.buyerId),
        channel: order.channel,
        currency: order.currency || 'USD',
        total: Number(order.total || 0),
        itemCount: Number(order.items || order.lineItems?.length || 0),
        status: orderStatusFor(order.status),
        warehouse: order.warehouse || null,
        metadata: order as unknown as Prisma.InputJsonValue
      },
      create: {
        id: order.id,
        sellerId: sellerUserId,
        buyerUserId: resolveUserId(userIdMap, order.buyerId),
        channel: order.channel,
        currency: order.currency || 'USD',
        total: Number(order.total || 0),
        itemCount: Number(order.items || order.lineItems?.length || 0),
        status: orderStatusFor(order.status),
        warehouse: order.warehouse || null,
        metadata: order as unknown as Prisma.InputJsonValue
      }
    });

    for (const [index, item] of (order.lineItems || []).entries()) {
      await prisma.orderItem.upsert({
        where: { id: `${order.id}::${index + 1}` },
        update: {
          orderId: order.id,
          sku: item.sku,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unit,
          currency: order.currency || 'USD'
        },
        create: {
          id: `${order.id}::${index + 1}`,
          orderId: order.id,
          sku: item.sku,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unit,
          currency: order.currency || 'USD'
        }
      });
    }
  }
}

async function upsertNotifications(snapshot: Snapshot, userIdMap: Map<string, string>) {
  for (const role of ['seller', 'provider'] as const) {
    const user = snapshot.users.find((entry) => entry.role === role);
    const content = snapshot.pageContent.notifications[role];
    if (!user || !content) continue;
    const userId = resolveUserId(userIdMap, user.id);
    if (!userId) continue;

    for (const item of content.items) {
      await prisma.notification.upsert({
        where: { id: `sellerfront:${role}:notification:${item.id}` },
        update: {
          userId,
          title: item.title,
          body: item.message,
          kind: item.category,
          readAt: item.unread ? null : new Date(item.createdAt),
          metadata: item as unknown as Prisma.InputJsonValue
        },
        create: {
          id: `sellerfront:${role}:notification:${item.id}`,
          userId,
          title: item.title,
          body: item.message,
          kind: item.category,
          readAt: item.unread ? null : new Date(item.createdAt),
          metadata: item as unknown as Prisma.InputJsonValue
        }
      });
    }
  }
}

async function upsertMessages(snapshot: Snapshot, userIdMap: Map<string, string>) {
  for (const role of ['seller', 'provider'] as const) {
    const user = snapshot.users.find((entry) => entry.role === role);
    const content = snapshot.pageContent.messages[role];
    if (!user || !content) continue;
    const userId = resolveUserId(userIdMap, user.id);
    if (!userId) continue;

    for (const thread of content.threads) {
      const threadId = `sellerfront:${role}:thread:${thread.id}`;
      await prisma.messageThread.upsert({
        where: { id: threadId },
        update: {
          userId,
          subject: thread.title,
          status: 'open',
          channel: thread.tags.join(','),
          priority: thread.priority || null,
          lastMessageAt: thread.lastAt ? new Date(thread.lastAt) : null,
          metadata: thread as unknown as Prisma.InputJsonValue
        },
        create: {
          id: threadId,
          userId,
          subject: thread.title,
          status: 'open',
          channel: thread.tags.join(','),
          priority: thread.priority || null,
          lastMessageAt: thread.lastAt ? new Date(thread.lastAt) : null,
          metadata: thread as unknown as Prisma.InputJsonValue
        }
      });
    }

    for (const message of content.messages) {
      const threadId = `sellerfront:${role}:thread:${message.threadId}`;
      await prisma.message.upsert({
        where: { id: `sellerfront:${role}:message:${message.id}` },
        update: {
          threadId,
          senderUserId: message.sender === 'me' ? userId : null,
          senderRole: message.sender,
          body: message.text,
          lang: message.lang,
          metadata: {
            attachments: message.attachments || []
          } as Prisma.InputJsonValue
        },
        create: {
          id: `sellerfront:${role}:message:${message.id}`,
          threadId,
          senderUserId: message.sender === 'me' ? userId : null,
          senderRole: message.sender,
          body: message.text,
          lang: message.lang,
          createdAt: new Date(message.at),
          metadata: {
            attachments: message.attachments || []
          } as Prisma.InputJsonValue
        }
      });
    }
  }
}

async function upsertRelationships(snapshot: Snapshot, userIdMap: Map<string, string>) {
  const buyer = snapshot.users.find((user) => user.role === 'buyer');
  if (!buyer) return;
  const buyerUserId = resolveUserId(userIdMap, buyer.id);
  if (!buyerUserId) return;

  for (const sellerId of snapshot.follows.sellerIds) {
    const resolvedSellerId = resolveUserId(userIdMap, sellerId);
    if (!resolvedSellerId) continue;
    await prisma.sellerFollow.upsert({
      where: {
        userId_sellerId: {
          userId: buyerUserId,
          sellerId: resolvedSellerId
        }
      },
      update: {},
      create: {
        userId: buyerUserId,
        sellerId: resolvedSellerId
      }
    });
  }

  for (const listingId of snapshot.favorites.listingIds) {
    await prisma.listingFavorite.upsert({
      where: {
        userId_listingId: {
          userId: buyerUserId,
          listingId
        }
      },
      update: {},
      create: {
        userId: buyerUserId,
        listingId
      }
    });
  }
}

async function upsertTaxonomy(snapshot: Snapshot, userIdMap: Map<string, string>) {
  const sellerTaxonomy = snapshot.pageContent.listingWizard.seller.taxonomy as FrontendTaxonomyNode[];
  const providerTaxonomy = snapshot.pageContent.listingWizard.provider.taxonomy as FrontendTaxonomyNode[];
  const roots = mergeTaxonomyRoots(
    CATALOG_TAXONOMY as FrontendTaxonomyNode[],
    sellerTaxonomy,
    providerTaxonomy,
  );
  const nodes = flattenTaxonomy(roots);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  await prisma.taxonomyTree.upsert({
    where: { id: SELLERFRONT_TAXONOMY_TREE_ID },
    update: {
      slug: SELLERFRONT_TAXONOMY_TREE_SLUG,
      name: 'Sellerfront Catalog Taxonomy',
      description: 'Imported sellerfront seller/provider taxonomy tree.',
      status: 'ACTIVE'
    },
    create: {
      id: SELLERFRONT_TAXONOMY_TREE_ID,
      slug: SELLERFRONT_TAXONOMY_TREE_SLUG,
      name: 'Sellerfront Catalog Taxonomy',
      description: 'Imported sellerfront seller/provider taxonomy tree.',
      status: 'ACTIVE'
    }
  });

  for (const node of nodes) {
    await prisma.taxonomyNode.upsert({
      where: { id: node.id },
      update: {
        treeId: SELLERFRONT_TAXONOMY_TREE_ID,
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
        treeId: SELLERFRONT_TAXONOMY_TREE_ID,
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

  const roleConfigs = [
    {
      role: 'seller',
      baseLines: snapshot.pageContent.listingWizard.seller.baseLines,
    },
    {
      role: 'provider',
      baseLines: providerListingWizardContent.baseLines,
    }
  ] as const;

  for (const config of roleConfigs) {
    const mockUser = snapshot.users.find((user) => user.role === config.role);
    if (!mockUser) continue;
    const resolvedUserId = resolveUserId(userIdMap, mockUser.id);
    if (!resolvedUserId) continue;
    const seller = await prisma.seller.findUnique({ where: { id: resolvedUserId } });
    if (!seller) continue;

    const storefront =
      (await prisma.storefront.findUnique({ where: { sellerId: seller.id } })) ??
      (await prisma.storefront.create({
        data: {
          sellerId: seller.id,
          slug: `${seller.handle || sanitizeId(seller.id.toLowerCase())}-storefront`,
          name: seller.storefrontName || seller.displayName || seller.name,
          isPublished: false
        }
      }));

    for (const [index, line] of config.baseLines.entries()) {
      const status = line.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE';
      const pathSnapshot = buildPathSnapshot(line.nodeId, nodeMap);

      await prisma.sellerTaxonomyCoverage.upsert({
        where: {
          sellerId_taxonomyNodeId: {
            sellerId: seller.id,
            taxonomyNodeId: line.nodeId
          }
        },
        update: {
          status,
          removedAt: null,
          metadata: { source: 'sellerfront', role: config.role } as Prisma.InputJsonValue,
          pathSnapshot
        },
        create: {
          sellerId: seller.id,
          taxonomyNodeId: line.nodeId,
          status,
          metadata: { source: 'sellerfront', role: config.role } as Prisma.InputJsonValue,
          pathSnapshot
        }
      });

      await prisma.storefrontTaxonomyLink.upsert({
        where: {
          storefrontId_taxonomyNodeId: {
            storefrontId: storefront.id,
            taxonomyNodeId: line.nodeId
          }
        },
        update: {
          isPrimary: index === 0,
          sortOrder: index,
          pathSnapshot
        },
        create: {
          storefrontId: storefront.id,
          taxonomyNodeId: line.nodeId,
          isPrimary: index === 0,
          sortOrder: index,
          pathSnapshot
        }
      });
    }
  }
}

async function upsertPageContent(snapshot: Snapshot) {
  const pageContentEntries = Object.entries(snapshot.pageContent) as Array<
    [keyof Snapshot['pageContent'], Snapshot['pageContent'][keyof Snapshot['pageContent']]]
  >;

  for (const [pageKey, roleMap] of pageContentEntries) {
    for (const [role, payload] of Object.entries(roleMap)) {
      await prisma.appRecord.upsert({
        where: {
          id: `sellerfront_page_${sanitizeId(String(pageKey))}_${sanitizeId(role)}`
        },
        update: {
          domain: 'sellerfront_page_content',
          entityType: String(pageKey),
          entityId: role,
          payload: payload as Prisma.InputJsonValue
        },
        create: {
          id: `sellerfront_page_${sanitizeId(String(pageKey))}_${sanitizeId(role)}`,
          domain: 'sellerfront_page_content',
          entityType: String(pageKey),
          entityId: role,
          payload: payload as Prisma.InputJsonValue
        }
      });
    }
  }
}

async function upsertModuleState(snapshot: Snapshot) {
  for (const [key, payload] of Object.entries(snapshot.modules || {})) {
    await prisma.appRecord.upsert({
      where: { id: `sellerfront_module_${sanitizeId(key)}` },
      update: {
        domain: 'sellerfront_module',
        entityType: 'module_state',
        entityId: key,
        payload: payload as Prisma.InputJsonValue
      },
      create: {
        id: `sellerfront_module_${sanitizeId(key)}`,
        domain: 'sellerfront_module',
        entityType: 'module_state',
        entityId: key,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }
}

async function upsertSnapshotRecords(snapshot: Snapshot) {
  for (const recordId of [SELLERFRONT_SEED_RECORD_ID, SELLERFRONT_LIVE_RECORD_ID]) {
    const entityId = recordId === SELLERFRONT_SEED_RECORD_ID ? 'seed' : 'live';
    await prisma.appRecord.upsert({
      where: { id: recordId },
      update: {
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId,
        payload: snapshot as unknown as Prisma.InputJsonValue
      },
      create: {
        id: recordId,
        domain: 'sellerfront',
        entityType: 'mock_db',
        entityId,
        payload: snapshot as unknown as Prisma.InputJsonValue
      }
    });
  }
}

async function main() {
  const snapshot = seedMockDb();
  const userIdMap = new Map<string, string>();

  for (const user of snapshot.users) {
    await upsertUser(snapshot, user, userIdMap);
  }

  await upsertListings(snapshot, userIdMap);
  await upsertOrders(snapshot, userIdMap);
  await upsertNotifications(snapshot, userIdMap);
  await upsertMessages(snapshot, userIdMap);
  await upsertRelationships(snapshot, userIdMap);
  await upsertTaxonomy(snapshot, userIdMap);
  await upsertWorkflowSeeds(snapshot, userIdMap);
  await upsertPageContent(snapshot);
  await upsertModuleState(snapshot);
  await upsertSnapshotRecords(snapshot);

  console.log(
    `Imported sellerfront mocks: ${snapshot.users.length} users, ${snapshot.listings.length} listings, ${snapshot.orders.length} orders.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
