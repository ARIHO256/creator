import bcrypt from 'bcrypt';
import { PrismaClient, type Prisma, type UserRole } from '@prisma/client';
import sellerfrontSeedModule from '../../sellerfront/src/mocks/seed.ts';
import type { MockDB } from '../../sellerfront/src/mocks/types.ts';

const prisma = new PrismaClient();
const { seedMockDb } = sellerfrontSeedModule as {
  seedMockDb: () => MockDB;
};

const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';

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
