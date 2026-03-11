import { PrismaClient, type Prisma } from '@prisma/client';
import type { MockDB } from '../../seller/src/mocks/types.ts';

const prisma = new PrismaClient();
const PAGE_DOMAIN = 'sellerfront_page_content';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');

type Role = 'seller' | 'provider';
type PageKey =
  | 'dashboard'
  | 'messages'
  | 'notifications'
  | 'analytics'
  | 'helpSupport'
  | 'compliance'
  | 'listings'
  | 'listingWizard'
  | 'orders';

function pageRecordId(pageKey: string, role: string) {
  return `sellerfront_page_${sanitize(pageKey)}_${sanitize(role)}`;
}

async function loadSnapshot() {
  const [seedRecord, liveRecord] = await Promise.all([
    prisma.appRecord.findUnique({ where: { id: SELLERFRONT_SEED_RECORD_ID } }),
    prisma.appRecord.findUnique({ where: { id: SELLERFRONT_LIVE_RECORD_ID } })
  ]);

  const payload = (seedRecord?.payload || liveRecord?.payload) as MockDB | null;
  if (!payload?.pageContent) {
    throw new Error(
      'Sellerfront mock DB snapshot is missing. Recreate the seller snapshot before running seller:seed-src-mock.'
    );
  }

  return payload;
}

async function main() {
  const snapshot = await loadSnapshot();
  const pageContent = snapshot.pageContent as Record<PageKey, Record<Role, unknown>>;
  const pageKeys = Object.keys(pageContent) as PageKey[];

  let refreshed = 0;

  for (const pageKey of pageKeys) {
    for (const role of ['seller', 'provider'] as const) {
      const payload = pageContent[pageKey]?.[role];
      if (!payload) continue;

      await prisma.appRecord.upsert({
        where: { id: pageRecordId(pageKey, role) },
        update: {
          domain: PAGE_DOMAIN,
          entityType: pageKey,
          entityId: role,
          payload: asJson(payload)
        },
        create: {
          id: pageRecordId(pageKey, role),
          domain: PAGE_DOMAIN,
          entityType: pageKey,
          entityId: role,
          payload: asJson(payload)
        }
      });

      refreshed += 1;
      console.log(`refreshed ${pageKey}/${role}`);
    }
  }

  const count = await prisma.appRecord.count({ where: { domain: PAGE_DOMAIN } });
  console.log(`\nSeller src/mock has been removed. Refreshed ${refreshed} DB-backed page-content records from sellerfront snapshot.`);
  console.log(`Current ${PAGE_DOMAIN} count: ${count}`);
}

main()
  .catch((error) => {
    console.error('\nReseeding seller page-content from snapshot failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
