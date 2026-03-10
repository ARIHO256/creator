import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, SellerKind, type Prisma } from '@prisma/client';
import sellerDashboardModule from '../../seller/src/mock/seller/dashboard.ts';
import providerDashboardModule from '../../seller/src/mock/provider/dashboard.ts';
import sellerAnalyticsModule from '../../seller/src/mock/seller/analytics.ts';
import providerAnalyticsModule from '../../seller/src/mock/provider/analytics.ts';
import sellerMessagesModule from '../../seller/src/mock/seller/messages.ts';
import providerMessagesModule from '../../seller/src/mock/provider/messages.ts';
import sellerNotificationsModule from '../../seller/src/mock/seller/notifications.ts';
import providerNotificationsModule from '../../seller/src/mock/provider/notifications.ts';
import sellerHelpSupportModule from '../../seller/src/mock/seller/helpSupport.ts';
import providerHelpSupportModule from '../../seller/src/mock/provider/helpSupport.ts';
import sellerComplianceModule from '../../seller/src/mock/seller/compliance.ts';
import providerComplianceModule from '../../seller/src/mock/provider/compliance.ts';
import sellerListingsModule from '../../seller/src/mock/seller/listings.ts';
import providerListingsModule from '../../seller/src/mock/provider/listings.ts';
import sellerListingWizardModule from '../../seller/src/mock/seller/listingWizard.ts';
import providerListingWizardModule from '../../seller/src/mock/provider/listingWizard.ts';
import sellerOrdersModule from '../../seller/src/mock/seller/orders.ts';
import providerOrdersModule from '../../seller/src/mock/provider/orders.ts';
import type {
  AnalyticsContent,
  ComplianceContent,
  DashboardContent,
  HelpSupportContent,
  ListingWizardContent,
  ListingsContent,
  MessagesContent,
  NotificationsContent,
  OrdersContent
} from '../../seller/src/mock/shared/types.ts';

const prisma = new PrismaClient();
const SOURCE = 'seller_src_mock_seed';
const LEGACY_DUMMY_SOURCE = 'sellerfront_mock_import';
const PAGE_DOMAIN = 'sellerfront_page_content';
const TREE_ID = 'taxonomy_tree_sellerfront_catalog';
const TREE_SLUG = 'sellerfront-catalog-taxonomy';
const SELLER_EMAIL = 'seller@demo.evzone';
const PROVIDER_EMAIL = 'provider@demo.evzone';
const { sellerDashboardContent } = sellerDashboardModule as { sellerDashboardContent: DashboardContent };
const { providerDashboardContent } = providerDashboardModule as { providerDashboardContent: DashboardContent };
const { sellerAnalyticsContent } = sellerAnalyticsModule as { sellerAnalyticsContent: AnalyticsContent };
const { providerAnalyticsContent } = providerAnalyticsModule as { providerAnalyticsContent: AnalyticsContent };
const { sellerMessagesContent } = sellerMessagesModule as { sellerMessagesContent: MessagesContent };
const { providerMessagesContent } = providerMessagesModule as { providerMessagesContent: MessagesContent };
const { sellerNotificationsContent } = sellerNotificationsModule as { sellerNotificationsContent: NotificationsContent };
const { providerNotificationsContent } = providerNotificationsModule as { providerNotificationsContent: NotificationsContent };
const { sellerHelpSupportContent } = sellerHelpSupportModule as { sellerHelpSupportContent: HelpSupportContent };
const { providerHelpSupportContent } = providerHelpSupportModule as { providerHelpSupportContent: HelpSupportContent };
const { sellerComplianceContent } = sellerComplianceModule as { sellerComplianceContent: ComplianceContent };
const { providerComplianceContent } = providerComplianceModule as { providerComplianceContent: ComplianceContent };
const { sellerListingsContent } = sellerListingsModule as { sellerListingsContent: ListingsContent };
const { providerListingsContent } = providerListingsModule as { providerListingsContent: ListingsContent };
const { sellerListingWizardContent } = sellerListingWizardModule as { sellerListingWizardContent: ListingWizardContent };
const { providerListingWizardContent } = providerListingWizardModule as { providerListingWizardContent: ListingWizardContent };
const { sellerOrdersContent } = sellerOrdersModule as { sellerOrdersContent: OrdersContent };
const { providerOrdersContent } = providerOrdersModule as { providerOrdersContent: OrdersContent };

type Role = 'seller' | 'provider';
type PageKey =
  | 'dashboard'
  | 'analytics'
  | 'messages'
  | 'notifications'
  | 'helpSupport'
  | 'compliance'
  | 'listings'
  | 'listingWizard'
  | 'orders';
type PagePayload =
  | DashboardContent
  | AnalyticsContent
  | MessagesContent
  | NotificationsContent
  | HelpSupportContent
  | ComplianceContent
  | ListingsContent
  | ListingWizardContent
  | OrdersContent;
type DatasetEntry = {
  file: string;
  role: Role;
  pageKey: PageKey;
  payload: PagePayload;
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
type RoleContext = {
  role: Role;
  email: string;
  userId: string;
  sellerId: string;
  storefrontId: string;
};
type FileLog = {
  file: string;
  deleted: Record<string, number>;
  inserted: Record<string, number>;
  notes: string[];
};

const datasets: DatasetEntry[] = [
  { file: 'seller/dashboard.ts', role: 'seller', pageKey: 'dashboard', payload: sellerDashboardContent },
  { file: 'provider/dashboard.ts', role: 'provider', pageKey: 'dashboard', payload: providerDashboardContent },
  { file: 'seller/analytics.ts', role: 'seller', pageKey: 'analytics', payload: sellerAnalyticsContent },
  { file: 'provider/analytics.ts', role: 'provider', pageKey: 'analytics', payload: providerAnalyticsContent },
  { file: 'seller/messages.ts', role: 'seller', pageKey: 'messages', payload: sellerMessagesContent },
  { file: 'provider/messages.ts', role: 'provider', pageKey: 'messages', payload: providerMessagesContent },
  { file: 'seller/notifications.ts', role: 'seller', pageKey: 'notifications', payload: sellerNotificationsContent },
  { file: 'provider/notifications.ts', role: 'provider', pageKey: 'notifications', payload: providerNotificationsContent },
  { file: 'seller/helpSupport.ts', role: 'seller', pageKey: 'helpSupport', payload: sellerHelpSupportContent },
  { file: 'provider/helpSupport.ts', role: 'provider', pageKey: 'helpSupport', payload: providerHelpSupportContent },
  { file: 'seller/compliance.ts', role: 'seller', pageKey: 'compliance', payload: sellerComplianceContent },
  { file: 'provider/compliance.ts', role: 'provider', pageKey: 'compliance', payload: providerComplianceContent },
  { file: 'seller/listings.ts', role: 'seller', pageKey: 'listings', payload: sellerListingsContent },
  { file: 'provider/listings.ts', role: 'provider', pageKey: 'listings', payload: providerListingsContent },
  { file: 'seller/listingWizard.ts', role: 'seller', pageKey: 'listingWizard', payload: sellerListingWizardContent },
  { file: 'provider/listingWizard.ts', role: 'provider', pageKey: 'listingWizard', payload: providerListingWizardContent },
  { file: 'seller/orders.ts', role: 'seller', pageKey: 'orders', payload: sellerOrdersContent },
  { file: 'provider/orders.ts', role: 'provider', pageKey: 'orders', payload: providerOrdersContent }
];

const dataFileSet = new Set(datasets.map((entry) => entry.file));
const expectedFiles = new Set([...dataFileSet, 'shared/pageContent.ts', 'shared/types.ts']);

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
}

function appRecordId(pageKey: PageKey, role: Role) {
  return `sellerfront_page_${sanitizeId(pageKey)}_${sanitizeId(role)}`;
}

function pageLog(fileLogs: Map<string, FileLog>, file: string) {
  if (!fileLogs.has(file)) {
    fileLogs.set(file, {
      file,
      deleted: {},
      inserted: {},
      notes: []
    });
  }
  return fileLogs.get(file)!;
}

function addCount(target: Record<string, number>, key: string, value: number) {
  target[key] = (target[key] || 0) + value;
}

function noteDelete(fileLogs: Map<string, FileLog>, file: string, key: string, count: number) {
  if (count <= 0) return;
  addCount(pageLog(fileLogs, file).deleted, key, count);
}

function noteInsert(fileLogs: Map<string, FileLog>, file: string, key: string, count: number) {
  if (count <= 0) return;
  addCount(pageLog(fileLogs, file).inserted, key, count);
}

function noteInfo(fileLogs: Map<string, FileLog>, file: string, message: string) {
  pageLog(fileLogs, file).notes.push(message);
}

function parseDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseScheduledLabel(value: string | undefined | null) {
  if (!value) return null;
  const text = String(value).trim();
  const now = new Date();
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const relative = text.match(/^(Today|Tomorrow),\s*(\d{1,2}):(\d{2})$/i);
  if (relative) {
    const base = new Date();
    if (relative[1].toLowerCase() === 'tomorrow') {
      base.setDate(base.getDate() + 1);
    }
    base.setHours(Number(relative[2]), Number(relative[3]), 0, 0);
    return base;
  }

  const monthDay = text.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{1,2}):(\d{2})$/);
  if (monthDay) {
    const candidate = new Date(`${monthDay[1]} ${monthDay[2]} ${now.getFullYear()} ${monthDay[3]}:${monthDay[4]}:00`);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  return null;
}

function listingStatusFor(status?: string) {
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
}

function orderStatusFor(status?: string) {
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
}

function bookingStatusFor(stage?: string) {
  switch (String(stage || '').toLowerCase()) {
    case 'requested':
      return 'requested';
    case 'confirmed':
      return 'confirmed';
    case 'in progress':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'canceled':
      return 'canceled';
    default:
      return 'requested';
  }
}

function taxonomyKindFor(type?: string): ImportedTaxonomyNode['kind'] {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'marketplace') return 'MARKETPLACE';
  if (normalized === 'product family' || normalized === 'service family' || normalized === 'family') return 'FAMILY';
  if (normalized === 'sub-category' || normalized === 'subcategory') return 'SUBCATEGORY';
  if (normalized === 'line') return 'LINE';
  return 'CATEGORY';
}

function flattenTaxonomy(
  roots: ListingWizardContent['taxonomy'],
  role: Role
) {
  const nodes: ImportedTaxonomyNode[] = [];
  const seen = new Set<string>();

  const visit = (
    node: ListingWizardContent['taxonomy'][number],
    parentId: string | null,
    parentPath: string,
    depth: number,
    sortOrder: number
  ) => {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    const slug = sanitizeId(node.id.toLowerCase());
    const currentPath = `${parentPath}/${slug}`;
    nodes.push({
      id: node.id,
      parentId,
      name: node.name,
      slug,
      kind: taxonomyKindFor(node.type),
      description: node.description || null,
      path: currentPath,
      depth,
      sortOrder,
      metadata: {
        source: SOURCE,
        role,
        sourceType: node.type
      } as Prisma.InputJsonValue
    });
    (node.children || []).forEach((child, index) => visit(child, node.id, currentPath, depth + 1, index));
  };

  roots.forEach((root, index) => visit(root, null, '', 0, index));
  return nodes;
}

function buildPathSnapshot(nodeId: string, nodeMap: Map<string, ImportedTaxonomyNode>) {
  const path: Array<{ id: string; name: string; slug: string; kind: string; path: string }> = [];
  let current = nodeMap.get(nodeId) ?? null;
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
}

async function collectMockFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMockFiles(root, absolute)));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

async function ensureMockFilesCovered(mockRoot: string) {
  const discovered = await collectMockFiles(mockRoot);
  const unexpected = discovered.filter((file) => !expectedFiles.has(file));
  const missing = [...expectedFiles].filter((file) => !discovered.includes(file));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `seller/src/mock coverage mismatch. Unexpected: ${unexpected.join(', ') || 'none'}; Missing: ${missing.join(', ') || 'none'}`
    );
  }
  return discovered;
}

async function ensureRoleContext(tx: Prisma.TransactionClient, role: Role, email: string): Promise<RoleContext> {
  const user = await tx.user.findFirst({
    where: { email },
    select: { id: true, email: true }
  });
  if (!user?.email) {
    throw new Error(`Required dummy user not found for role ${role}: ${email}`);
  }

  const handle = sanitizeId(email.split('@')[0].toLowerCase());
  const seller = await tx.seller.upsert({
    where: { userId: user.id },
    update: {
      handle,
      kind: role === 'provider' ? SellerKind.PROVIDER : SellerKind.SELLER
    },
    create: {
      userId: user.id,
      handle,
      name: role === 'provider' ? 'ProviderPro Services' : 'SellerSeller Store',
      displayName: role === 'provider' ? 'ProviderPro' : 'SellerSeller',
      storefrontName: role === 'provider' ? 'ProviderPro Services' : 'SellerSeller Store',
      kind: role === 'provider' ? SellerKind.PROVIDER : SellerKind.SELLER
    }
  });

  const storefront = await tx.storefront.upsert({
    where: { sellerId: seller.id },
    update: {
      slug: handle,
      name: seller.storefrontName || seller.displayName || seller.name
    },
    create: {
      sellerId: seller.id,
      slug: handle,
      name: seller.storefrontName || seller.displayName || seller.name,
      isPublished: false
    }
  });

  return {
    role,
    email,
    userId: user.id,
    sellerId: seller.id,
    storefrontId: storefront.id
  };
}

async function assertListingsSafe(tx: Prisma.TransactionClient, roleContext: RoleContext, ids: string[]) {
  const existing = await tx.marketplaceListing.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, sellerId: true, metadata: true }
  });
  for (const row of existing) {
    const source =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? String((row.metadata as Record<string, unknown>).source || '')
        : '';
    if (row.userId !== roleContext.userId || row.sellerId !== roleContext.sellerId) {
      if (source !== SOURCE && source !== LEGACY_DUMMY_SOURCE) {
        throw new Error(`Unsafe listing collision for ${row.id}; refusing to replace non-dummy record.`);
      }
    }
  }
}

async function assertOrdersSafe(tx: Prisma.TransactionClient, sellerContext: RoleContext, ids: string[]) {
  const existing = await tx.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, sellerId: true, metadata: true }
  });
  for (const row of existing) {
    const source =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? String((row.metadata as Record<string, unknown>).source || '')
        : '';
    if (row.sellerId !== sellerContext.sellerId && source !== SOURCE && source !== LEGACY_DUMMY_SOURCE) {
      throw new Error(`Unsafe order collision for ${row.id}; refusing to replace non-dummy record.`);
    }
  }
}

async function assertBookingsSafe(tx: Prisma.TransactionClient, providerContext: RoleContext, ids: string[]) {
  const existing = await tx.providerBooking.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, data: true }
  });
  for (const row of existing) {
    const source =
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? String((row.data as Record<string, unknown>).source || '')
        : '';
    if (row.userId !== providerContext.userId && source !== SOURCE && source !== LEGACY_DUMMY_SOURCE) {
      throw new Error(`Unsafe provider booking collision for ${row.id}; refusing to replace non-dummy record.`);
    }
  }
}

async function seedPageContent(tx: Prisma.TransactionClient, fileLogs: Map<string, FileLog>) {
  for (const entry of datasets) {
    const deleted = await tx.appRecord.deleteMany({
      where: { id: appRecordId(entry.pageKey, entry.role) }
    });
    noteDelete(fileLogs, entry.file, 'AppRecord', deleted.count);

    await tx.appRecord.create({
      data: {
        id: appRecordId(entry.pageKey, entry.role),
        domain: PAGE_DOMAIN,
        entityType: entry.pageKey,
        entityId: entry.role,
        payload: entry.payload as unknown as Prisma.InputJsonValue
      }
    });
    noteInsert(fileLogs, entry.file, 'AppRecord', 1);
  }

  noteInfo(fileLogs, 'shared/pageContent.ts', 'All page-content datasets were refreshed into AppRecord.');
  noteInfo(fileLogs, 'shared/types.ts', 'Type-only file inspected; no database rows required.');
}

async function seedNotifications(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: NotificationsContent } => entry.pageKey === 'notifications'
  );
  for (const entry of entries) {
    const ids = entry.payload.items.map((item) => `sellerfront:${entry.role}:notification:${item.id}`);
    const deleted = await tx.notification.deleteMany({
      where: { id: { in: ids } }
    });
    noteDelete(fileLogs, entry.file, 'Notification', deleted.count);

    if (entry.payload.items.length > 0) {
      await tx.notification.createMany({
        data: entry.payload.items.map((item) => ({
          id: `sellerfront:${entry.role}:notification:${item.id}`,
          userId: roleContexts[entry.role].userId,
          title: item.title,
          body: item.message,
          kind: item.category,
          readAt: item.unread ? null : parseDate(item.createdAt),
          metadata: {
            source: SOURCE,
            role: entry.role,
            route: item.route || null,
            actor: item.actor || null,
            priority: item.priority,
            raw: item
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'Notification', entry.payload.items.length);
  }
}

async function seedMessages(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: MessagesContent } => entry.pageKey === 'messages'
  );
  for (const entry of entries) {
    const threadIds = entry.payload.threads.map((thread) => `sellerfront:${entry.role}:thread:${thread.id}`);
    const messageIds = entry.payload.messages.map((message) => `sellerfront:${entry.role}:message:${message.id}`);

    const deletedMessages = await tx.message.deleteMany({
      where: { id: { in: messageIds } }
    });
    noteDelete(fileLogs, entry.file, 'Message', deletedMessages.count);
    const deletedThreads = await tx.messageThread.deleteMany({
      where: { id: { in: threadIds } }
    });
    noteDelete(fileLogs, entry.file, 'MessageThread', deletedThreads.count);

    if (entry.payload.threads.length > 0) {
      await tx.messageThread.createMany({
        data: entry.payload.threads.map((thread) => ({
          id: `sellerfront:${entry.role}:thread:${thread.id}`,
          userId: roleContexts[entry.role].userId,
          subject: thread.title,
          status: 'open',
          channel: thread.tags.join(','),
          priority: thread.priority || null,
          lastMessageAt: parseDate(thread.lastAt),
          metadata: {
            source: SOURCE,
            role: entry.role,
            customerLang: thread.customerLang,
            myLang: thread.myLang,
            unreadCount: thread.unreadCount,
            participants: thread.participants,
            lastMessage: thread.lastMessage,
            responseSlaDueAt: thread.responseSlaDueAt || null,
            templates: entry.payload.templates
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'MessageThread', entry.payload.threads.length);

    if (entry.payload.messages.length > 0) {
      await tx.message.createMany({
        data: entry.payload.messages.map((message) => ({
          id: `sellerfront:${entry.role}:message:${message.id}`,
          threadId: `sellerfront:${entry.role}:thread:${message.threadId}`,
          senderUserId: message.sender === 'me' ? roleContexts[entry.role].userId : null,
          senderRole: message.sender,
          body: message.text,
          lang: message.lang,
          createdAt: parseDate(message.at) || new Date(),
          metadata: {
            source: SOURCE,
            role: entry.role,
            attachments: message.attachments || []
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'Message', entry.payload.messages.length);
  }
}

async function seedHelpSupport(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: HelpSupportContent } => entry.pageKey === 'helpSupport'
  );
  for (const entry of entries) {
    const supportContentIds = [
      ...entry.payload.kb.map((item) => `sellerfront:${entry.role}:support:kb:${item.id}`),
      ...entry.payload.status.map((item) => `sellerfront:${entry.role}:support:status:${item.id}`),
      ...entry.payload.faq.map((_, index) => `sellerfront:${entry.role}:support:faq:${index + 1}`)
    ];
    const ticketIds = entry.payload.tickets.map((ticket) => `sellerfront:${entry.role}:ticket:${ticket.id}`);

    const deletedContent = await tx.supportContent.deleteMany({
      where: { id: { in: supportContentIds } }
    });
    noteDelete(fileLogs, entry.file, 'SupportContent', deletedContent.count);
    const deletedTickets = await tx.supportTicket.deleteMany({
      where: { id: { in: ticketIds } }
    });
    noteDelete(fileLogs, entry.file, 'SupportTicket', deletedTickets.count);

    const contentRows = [
      ...entry.payload.kb.map((item) => ({
        id: `sellerfront:${entry.role}:support:kb:${item.id}`,
        contentType: 'kb_article',
        title: item.title,
        body: item.url,
        status: 'published',
        metadata: {
          source: SOURCE,
          role: entry.role,
          category: item.cat,
          url: item.url
        } as Prisma.InputJsonValue
      })),
      ...entry.payload.status.map((item) => ({
        id: `sellerfront:${entry.role}:support:status:${item.id}`,
        contentType: 'system_status',
        title: item.name,
        body: item.state,
        status: item.state,
        metadata: {
          source: SOURCE,
          role: entry.role
        } as Prisma.InputJsonValue
      })),
      ...entry.payload.faq.map((item, index) => ({
        id: `sellerfront:${entry.role}:support:faq:${index + 1}`,
        contentType: 'faq',
        title: item.q,
        body: item.a,
        status: 'published',
        metadata: {
          source: SOURCE,
          role: entry.role
        } as Prisma.InputJsonValue
      }))
    ];

    if (contentRows.length > 0) {
      await tx.supportContent.createMany({ data: contentRows });
    }
    noteInsert(fileLogs, entry.file, 'SupportContent', contentRows.length);

    if (entry.payload.tickets.length > 0) {
      await tx.supportTicket.createMany({
        data: entry.payload.tickets.map((ticket) => ({
          id: `sellerfront:${entry.role}:ticket:${ticket.id}`,
          userId: roleContexts[entry.role].userId,
          status: ticket.status,
          marketplace: ticket.marketplace,
          category: ticket.category,
          subject: ticket.subject,
          severity: ticket.severity,
          ref: ticket.ref || null,
          createdAt: parseDate(ticket.createdAt) || new Date(),
          metadata: {
            source: SOURCE,
            role: entry.role,
            raw: ticket
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'SupportTicket', entry.payload.tickets.length);
  }
}

async function seedCompliance(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: ComplianceContent } => entry.pageKey === 'compliance'
  );
  for (const entry of entries) {
    const roleContext = roleContexts[entry.role];
    const deskSlug = `sellerfront-${entry.role}-compliance`;
    const complianceIds = [
      ...entry.payload.docs.map((doc) => `sellerfront:${entry.role}:compliance:doc:${doc.id}`),
      ...entry.payload.queue.map((item) => `sellerfront:${entry.role}:compliance:queue:${item.listingId}`)
    ];
    const existingDesk = await tx.regulatoryDesk.findUnique({
      where: { userId_slug: { userId: roleContext.userId, slug: deskSlug } },
      select: { id: true }
    });

    const deletedItems = await tx.regulatoryComplianceItem.deleteMany({
      where: { id: { in: complianceIds } }
    });
    noteDelete(fileLogs, entry.file, 'RegulatoryComplianceItem', deletedItems.count);
    if (existingDesk) {
      const deletedDeskItems = await tx.regulatoryDeskItem.deleteMany({
        where: { deskId: existingDesk.id }
      });
      noteDelete(fileLogs, entry.file, 'RegulatoryDeskItem', deletedDeskItems.count);
      const deletedDesk = await tx.regulatoryDesk.deleteMany({
        where: { id: existingDesk.id }
      });
      noteDelete(fileLogs, entry.file, 'RegulatoryDesk', deletedDesk.count);
    }

    if (entry.payload.docs.length > 0 || entry.payload.queue.length > 0) {
      await tx.regulatoryComplianceItem.createMany({
        data: [
          ...entry.payload.docs.map((doc) => ({
            id: `sellerfront:${entry.role}:compliance:doc:${doc.id}`,
            userId: roleContext.userId,
            itemType: 'document',
            title: doc.type,
            status: String(doc.status || 'Submitted'),
            metadata: {
              source: SOURCE,
              role: entry.role,
              raw: doc
            } as Prisma.InputJsonValue
          })),
          ...entry.payload.queue.map((item) => ({
            id: `sellerfront:${entry.role}:compliance:queue:${item.listingId}`,
            userId: roleContext.userId,
            itemType: 'queue',
            title: item.title,
            status: item.missing.length > 0 ? 'ActionRequired' : 'Ready',
            metadata: {
              source: SOURCE,
              role: entry.role,
              raw: item
            } as Prisma.InputJsonValue
          }))
        ]
      });
    }
    noteInsert(
      fileLogs,
      entry.file,
      'RegulatoryComplianceItem',
      entry.payload.docs.length + entry.payload.queue.length
    );

    const desk = await tx.regulatoryDesk.create({
      data: {
        id: `sellerfront:${entry.role}:compliance:desk`,
        userId: roleContext.userId,
        slug: deskSlug,
        title: `${entry.role} compliance mock desk`,
        status: 'active',
        metadata: {
          source: SOURCE,
          role: entry.role,
          primaryChannel: entry.payload.primaryChannel,
          defaultDocType: entry.payload.defaultDocType,
          heroSubtitle: entry.payload.heroSubtitle,
          channelOptions: entry.payload.channelOptions,
          autoDefault: entry.payload.autoDefault,
          autoRules: entry.payload.autoRules
        } as Prisma.InputJsonValue
      }
    });
    noteInsert(fileLogs, entry.file, 'RegulatoryDesk', 1);

    if (entry.payload.queue.length > 0) {
      await tx.regulatoryDeskItem.createMany({
        data: entry.payload.queue.map((item, index) => ({
          id: `sellerfront:${entry.role}:compliance:desk-item:${index + 1}`,
          deskId: desk.id,
          title: item.title,
          status: item.missing.length > 0 ? 'open' : 'ready',
          severity: item.missing.length > 0 ? 'medium' : 'low',
          metadata: {
            source: SOURCE,
            role: entry.role,
            raw: item
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'RegulatoryDeskItem', entry.payload.queue.length);

    noteInfo(
      fileLogs,
      entry.file,
      `Preserved ${entry.payload.autoRules.length} compliance auto-rules in RegulatoryDesk.metadata because RegulatoryAutoCheck is absent in the live database.`
    );
  }
}

async function seedListings(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: ListingsContent } => entry.pageKey === 'listings'
  );
  for (const entry of entries) {
    const roleContext = roleContexts[entry.role];
    const ids = entry.payload.rows.map((row) => row.id);
    await assertListingsSafe(tx, roleContext, ids);

    const deleted = await tx.marketplaceListing.deleteMany({
      where: {
        id: { in: ids },
        OR: [
          { userId: roleContext.userId },
          { sellerId: roleContext.sellerId }
        ]
      }
    });
    noteDelete(fileLogs, entry.file, 'MarketplaceListing', deleted.count);

    if (entry.payload.rows.length > 0) {
      await tx.marketplaceListing.createMany({
        data: entry.payload.rows.map((row) => ({
          id: row.id,
          userId: roleContext.userId,
          sellerId: roleContext.sellerId,
          title: row.title,
          description: row.description,
          kind: row.kind,
          category: row.category,
          sku: row.id,
          marketplace: row.marketplace,
          price: row.retailPrice,
          currency: row.currency,
          inventoryCount: row.stock,
          status: listingStatusFor(row.status),
          metadata: {
            source: SOURCE,
            role: entry.role,
            row
          } as Prisma.InputJsonValue
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'MarketplaceListing', entry.payload.rows.length);
  }
}

async function seedOrdersAndBookings(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const sellerEntry = datasets.find(
    (entry): entry is DatasetEntry & { payload: OrdersContent } => entry.file === 'seller/orders.ts'
  );
  const providerEntry = datasets.find(
    (entry): entry is DatasetEntry & { payload: OrdersContent } => entry.file === 'provider/orders.ts'
  );
  if (!sellerEntry || !providerEntry) {
    throw new Error('Order datasets missing from seller/src/mock.');
  }

  const sellerIds = (sellerEntry.payload.orders || []).map((row) => row.id);
  await assertOrdersSafe(tx, roleContexts.seller, sellerIds);
  const deletedOrderItems = await tx.orderItem.deleteMany({
    where: { orderId: { in: sellerIds } }
  });
  noteDelete(fileLogs, sellerEntry.file, 'OrderItem', deletedOrderItems.count);
  const deletedOrders = await tx.order.deleteMany({
    where: { id: { in: sellerIds }, sellerId: roleContexts.seller.sellerId }
  });
  noteDelete(fileLogs, sellerEntry.file, 'Order', deletedOrders.count);

  if ((sellerEntry.payload.orders || []).length > 0) {
    await tx.order.createMany({
      data: (sellerEntry.payload.orders || []).map((row) => ({
        id: row.id,
        sellerId: roleContexts.seller.sellerId,
        buyerUserId: null,
        channel: row.channel,
        currency: row.currency,
        total: row.total,
        itemCount: row.items,
        status: orderStatusFor(row.status),
        warehouse: row.warehouse,
        metadata: {
          source: SOURCE,
          role: 'seller',
          updatedAt: row.updatedAt,
          slaDueAt: row.slaDueAt,
          returns: sellerEntry.payload.returns || [],
          disputes: sellerEntry.payload.disputes || [],
          raw: row
        } as Prisma.InputJsonValue
      }))
    });
  }
  noteInsert(fileLogs, sellerEntry.file, 'Order', sellerEntry.payload.orders?.length || 0);

  const bookingIds = (providerEntry.payload.bookings || []).map((row) => row.id);
  await assertBookingsSafe(tx, roleContexts.provider, bookingIds);
  const deletedBookings = await tx.providerBooking.deleteMany({
    where: { id: { in: bookingIds }, userId: roleContexts.provider.userId }
  });
  noteDelete(fileLogs, providerEntry.file, 'ProviderBooking', deletedBookings.count);

  if ((providerEntry.payload.bookings || []).length > 0) {
    await tx.providerBooking.createMany({
      data: (providerEntry.payload.bookings || []).map((row) => ({
        id: row.id,
        userId: roleContexts.provider.userId,
        status: bookingStatusFor(row.stage),
        scheduledAt: parseScheduledLabel(row.scheduledFor),
        durationMinutes: null,
        amount: row.price,
        currency: row.currency,
        data: {
          source: SOURCE,
          role: 'provider',
          client: row.client,
          service: row.service,
          scheduledForLabel: row.scheduledFor,
          stage: row.stage,
          raw: row
        } as Prisma.InputJsonValue
      }))
    });
  }
  noteInsert(fileLogs, providerEntry.file, 'ProviderBooking', providerEntry.payload.bookings?.length || 0);
}

async function seedListingWizard(
  tx: Prisma.TransactionClient,
  roleContexts: Record<Role, RoleContext>,
  fileLogs: Map<string, FileLog>
) {
  const entries = datasets.filter(
    (entry): entry is DatasetEntry & { payload: ListingWizardContent } => entry.pageKey === 'listingWizard'
  );
  const allNodes = entries.flatMap((entry) => flattenTaxonomy(entry.payload.taxonomy, entry.role));
  const nodeMap = new Map(allNodes.map((node) => [node.id, node]));
  const nodeIds = [...nodeMap.keys()];

  const deletedStorefrontLinks = await tx.storefrontTaxonomyLink.deleteMany({
    where: {
      OR: [
        { storefrontId: roleContexts.seller.storefrontId },
        { storefrontId: roleContexts.provider.storefrontId }
      ]
    }
  });
  const deletedCoverage = await tx.sellerTaxonomyCoverage.deleteMany({
    where: {
      OR: [
        { sellerId: roleContexts.seller.sellerId },
        { sellerId: roleContexts.provider.sellerId }
      ]
    }
  });
  const deletedNodes = await tx.taxonomyNode.deleteMany({
    where: {
      OR: [
        { treeId: TREE_ID },
        { id: { in: nodeIds } }
      ]
    }
  });
  const deletedTree = await tx.taxonomyTree.deleteMany({
    where: { id: TREE_ID }
  });

  for (const entry of entries) {
    noteDelete(fileLogs, entry.file, 'StorefrontTaxonomyLink', deletedStorefrontLinks.count);
    noteDelete(fileLogs, entry.file, 'SellerTaxonomyCoverage', deletedCoverage.count);
    noteDelete(fileLogs, entry.file, 'TaxonomyNode', deletedNodes.count);
    noteDelete(fileLogs, entry.file, 'TaxonomyTree', deletedTree.count);
  }

  await tx.taxonomyTree.create({
    data: {
      id: TREE_ID,
      slug: TREE_SLUG,
      name: 'Seller src/mock taxonomy',
      description: 'Seeded from seller/src/mock listing wizard datasets.',
      status: 'ACTIVE'
    }
  });
  for (const entry of entries) {
    noteInsert(fileLogs, entry.file, 'TaxonomyTree', 1);
  }

  if (allNodes.length > 0) {
    await tx.taxonomyNode.createMany({
      data: allNodes.map((node) => ({
        id: node.id,
        treeId: TREE_ID,
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
      }))
    });
  }

  for (const entry of entries) {
    noteInsert(
      fileLogs,
      entry.file,
      'TaxonomyNode',
      flattenTaxonomy(entry.payload.taxonomy, entry.role).length
    );
  }

  for (const entry of entries) {
    const roleContext = roleContexts[entry.role];
    const coverageRows = entry.payload.baseLines.map((line, index) => ({
      sellerId: roleContext.sellerId,
      taxonomyNodeId: line.nodeId,
      status: line.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
      metadata: {
        source: SOURCE,
        role: entry.role
      } as Prisma.InputJsonValue,
      pathSnapshot: buildPathSnapshot(line.nodeId, nodeMap)
    }));
    if (coverageRows.length > 0) {
      await tx.sellerTaxonomyCoverage.createMany({ data: coverageRows });
      await tx.storefrontTaxonomyLink.createMany({
        data: entry.payload.baseLines.map((line, index) => ({
          storefrontId: roleContext.storefrontId,
          taxonomyNodeId: line.nodeId,
          isPrimary: index === 0,
          sortOrder: index,
          pathSnapshot: buildPathSnapshot(line.nodeId, nodeMap)
        }))
      });
    }
    noteInsert(fileLogs, entry.file, 'SellerTaxonomyCoverage', coverageRows.length);
    noteInsert(fileLogs, entry.file, 'StorefrontTaxonomyLink', coverageRows.length);
  }
}

async function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const mockRoot = path.join(repoRoot, 'seller', 'src', 'mock');
  const discoveredFiles = await ensureMockFilesCovered(mockRoot);
  const fileLogs = new Map<string, FileLog>();
  discoveredFiles.forEach((file) => pageLog(fileLogs, file));

  console.log(`Inspecting seller/src/mock: ${discoveredFiles.length} files discovered.`);
  discoveredFiles.forEach((file) => {
    console.log(`  - ${file}${dataFileSet.has(file) ? ' [dataset]' : ' [supporting]'}`);
  });

  await prisma.$transaction(async (tx) => {
    const roleContexts: Record<Role, RoleContext> = {
      seller: await ensureRoleContext(tx, 'seller', SELLER_EMAIL),
      provider: await ensureRoleContext(tx, 'provider', PROVIDER_EMAIL)
    };

    await seedPageContent(tx, fileLogs);
    await seedNotifications(tx, roleContexts, fileLogs);
    await seedMessages(tx, roleContexts, fileLogs);
    await seedHelpSupport(tx, roleContexts, fileLogs);
    await seedCompliance(tx, roleContexts, fileLogs);
    await seedListings(tx, roleContexts, fileLogs);
    await seedOrdersAndBookings(tx, roleContexts, fileLogs);
    await seedListingWizard(tx, roleContexts, fileLogs);
  });

  console.log('\nSeed summary');
  for (const log of [...fileLogs.values()].sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`\n${log.file}`);
    const deleted = Object.entries(log.deleted);
    const inserted = Object.entries(log.inserted);
    if (deleted.length === 0 && inserted.length === 0 && log.notes.length === 0) {
      console.log('  no direct data rows mapped');
      continue;
    }
    deleted.forEach(([key, count]) => console.log(`  deleted ${count} from ${key}`));
    inserted.forEach(([key, count]) => console.log(`  inserted ${count} into ${key}`));
    log.notes.forEach((message) => console.log(`  note: ${message}`));
  }

  console.log('\nRemoval command');
  console.log('rm -rf /home/achiever/Freelancer/CreatorApp/seller/src/mock');
}

main()
  .catch((error) => {
    console.error('\nSeeding seller/src/mock failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
