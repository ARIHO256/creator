import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { PrismaClient, type Prisma } from '@prisma/client';
import sellerfrontSeedModule from '../../seller/src/mocks/seed.ts';
import type { MockDB } from '../../seller/src/mocks/types.ts';

const prisma = new PrismaClient();
const repoRoot = path.resolve(process.cwd(), '..');
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const asJson = (value: unknown) => value as Prisma.InputJsonValue;
const SELLERFRONT_LIVE_RECORD_ID = 'sellerfront_mockdb_live';
const SELLERFRONT_SEED_RECORD_ID = 'sellerfront_mockdb_seed';
const { seedMockDb } = sellerfrontSeedModule as { seedMockDb: () => MockDB };

function extractConstInitializer(source: string, constName: string) {
  const signature = new RegExp(`(?:export\\s+)?const\\s+${constName}\\b`);
  const match = signature.exec(source);
  if (!match) {
    throw new Error(`Unable to locate constant ${constName}`);
  }

  let index = match.index + match[0].length;
  while (index < source.length && source[index] !== '=') {
    index += 1;
  }
  if (source[index] !== '=') {
    throw new Error(`Unable to locate initializer for ${constName}`);
  }
  index += 1;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const start = index;
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (; index < source.length; index += 1) {
    const ch = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inSingle) {
      if (ch === "'") inSingle = false;
      continue;
    }

    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }

    if (inTemplate) {
      if (ch === '`') {
        inTemplate = false;
        continue;
      }
      if (ch === '$' && source[index + 1] === '{') {
        depthBrace += 1;
        index += 1;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }

    if (ch === '(') depthParen += 1;
    if (ch === ')') depthParen -= 1;
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket -= 1;
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace -= 1;

    if (ch === ';' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      return source.slice(start, index).trim();
    }
  }

  throw new Error(`Unable to parse initializer for ${constName}`);
}

function evaluateExpression(expression: string, context: Record<string, unknown>) {
  return vm.runInNewContext(`(${expression})`, context, { timeout: 1000 });
}

async function loadSeedMap(filePath: string, constNames: string[]) {
  const source = await fs.readFile(filePath, 'utf8');
  const context: Record<string, unknown> = {
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    Set,
    Map,
    console,
    isoNowPlus: (ms: number) => new Date(Date.now() + ms).toISOString(),
    computeEndDate: (startYMD: string, durationDays: number) => {
      const [y, m, d] = String(startYMD)
        .split('-')
        .map((v) => Number(v));
      const start = new Date(y, Math.max((m || 1) - 1, 0), d || 1);
      start.setDate(start.getDate() + Math.max(Number(durationDays || 1) - 1, 0));
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },
    calcDiscountedPrice: (price: number, mode: string, value: number) => {
      const base = Number(price || 0);
      const amount = Number(value || 0);
      if (mode === 'percent') return Math.max(0, Math.round(base * (1 - amount / 100) * 100) / 100);
      if (mode === 'amount') return Math.max(0, Math.round((base - amount) * 100) / 100);
      if (mode === 'final') return Math.max(0, amount);
      return base;
    },
    formatDiscount: (mode: string, value: number, currency = 'USD') => {
      const amount = Number(value || 0);
      if (mode === 'percent') return `${amount}% off`;
      if (mode === 'amount') return `${currency} ${amount} off`;
      if (mode === 'final') return `Final: ${currency} ${amount}`;
      return `${amount}`;
    }
  };

  const values: Record<string, unknown> = {};
  for (const constName of constNames) {
    const expression = extractConstInitializer(source, constName);
    const value = evaluateExpression(expression, { ...context, ...values });
    context[constName] = value;
    values[constName] = value;
  }

  return values;
}

async function upsertSellerfrontModule(key: string, payload: unknown) {
  await prisma.appRecord.upsert({
    where: { id: `sellerfront_module_${sanitize(key)}` },
    update: {
      domain: 'sellerfront_module',
      entityType: 'module_state',
      entityId: key,
      payload: asJson(payload)
    },
    create: {
      id: `sellerfront_module_${sanitize(key)}`,
      domain: 'sellerfront_module',
      entityType: 'module_state',
      entityId: key,
      payload: asJson(payload)
    }
  });
}

function ensureSnapshot(payload: unknown): MockDB {
  if (payload && typeof payload === 'object') {
    const snapshot = payload as MockDB;
    return {
      ...seedMockDb(),
      ...snapshot,
      modules: { ...(snapshot.modules || {}) }
    };
  }
  return seedMockDb();
}

async function mergeSnapshotModules(
  recordId: string,
  entityId: 'seed' | 'live',
  importedModules: Record<string, unknown>
) {
  const existing = await prisma.appRecord.findUnique({
    where: { id: recordId }
  });
  const snapshot = ensureSnapshot(existing?.payload);
  const mergedModules =
    recordId === SELLERFRONT_LIVE_RECORD_ID
      ? { ...importedModules, ...(snapshot.modules || {}) }
      : { ...(snapshot.modules || {}), ...importedModules };

  const next: MockDB = {
    ...snapshot,
    modules: mergedModules
  };

  await prisma.appRecord.upsert({
    where: { id: recordId },
    update: {
      domain: 'sellerfront',
      entityType: 'mock_db',
      entityId,
      payload: asJson(next)
    },
    create: {
      id: recordId,
      domain: 'sellerfront',
      entityType: 'mock_db',
      entityId,
      payload: asJson(next)
    }
  });
}

async function main() {
  const sellerDir = path.join(repoRoot, 'seller', 'src', 'features', 'livedealz');

  const adzDashboard = await loadSeedMap(path.join(sellerDir, 'adz', 'SupplierAdzDashboardPage.tsx'), [
    'SAMPLE_VIDEO',
    'DEMO_ADS'
  ]);
  const adzManager = await loadSeedMap(path.join(sellerDir, 'adz', 'SupplierAdzManagerPage.tsx'), [
    'SAMPLE_VIDEO',
    'DEMO_ADS'
  ]);
  const adzMarketplace = await loadSeedMap(
    path.join(sellerDir, 'adz', 'SupplierAdzMarketplacePage.tsx'),
    ['SAMPLE_VIDEO', 'DEMO_ADS']
  );
  const dealzMarketplace = await loadSeedMap(
    path.join(sellerDir, 'overview', 'SupplierDealzMarketplaceLegacy.tsx'),
    ['SUPPLIERS', 'CREATORS', 'DEALZ_SEED']
  );
  const assetLibrary = await loadSeedMap(
    path.join(sellerDir, 'deliverables', 'SupplierAssetLibraryPage.tsx'),
    ['creators', 'suppliers', 'campaigns', 'deliverables', 'seedAssets']
  );
  const linksHub = await loadSeedMap(
    path.join(sellerDir, 'deliverables', 'SupplierLinksHubPage.tsx'),
    ['INITIAL_ITEMS']
  );
  const liveSchedule = await loadSeedMap(
    path.join(sellerDir, 'live', 'SupplierLiveSchedulePage.tsx'),
    ['AI_SLOTS', 'SESSIONS']
  );
  const liveDashboard = await loadSeedMap(
    path.join(sellerDir, 'live', 'SupplierLiveDashboardPage.tsx'),
    ['suppliersSeed', 'campaignsSeed', 'hostsSeed', 'SAMPLE_VIDEO_1', 'sessionsSeed']
  );
  const taskBoard = await loadSeedMap(
    path.join(sellerDir, 'deliverables', 'SupplierTaskBoardPage.tsx'),
    ['CONTRACTS']
  );
  const myCreators = await loadSeedMap(
    path.join(sellerDir, 'collabs', 'SupplierMyCreatorsPage.tsx'),
    ['INITIAL_MY_CREATORS']
  );
  const campaignsBoard = await loadSeedMap(
    path.join(sellerDir, 'collabs', 'SupplierCampaignsBoardPage.tsx'),
    ['INITIAL_CAMPAIGNS']
  );
  const contractsPage = await loadSeedMap(
    path.join(sellerDir, 'collabs', 'SupplierContractsPage.tsx'),
    ['MOCK_CONTRACTS']
  );
  const importedModules: Record<string, unknown> = {
    'supplier.adzDashboard.ads': adzDashboard.DEMO_ADS,
    'supplier.adzManager.ads': adzManager.DEMO_ADS,
    'supplier.adzMarketplace.ads': adzMarketplace.DEMO_ADS,
    'supplier.adzMarketplace.cart': {},
    'supplier.dealzMarketplace.deals': dealzMarketplace.DEALZ_SEED,
    'supplier.dealzMarketplace.cart': {},
    'supplier.dealzMarketplace.liveCart': {},
    'supplier.assetLibrary.creators': assetLibrary.creators,
    'supplier.assetLibrary.suppliers': assetLibrary.suppliers,
    'supplier.assetLibrary.campaigns': assetLibrary.campaigns,
    'supplier.assetLibrary.deliverables': assetLibrary.deliverables,
    'supplier.assetLibrary.assets': assetLibrary.seedAssets,
    'supplier.linksHub.items': linksHub.INITIAL_ITEMS,
    'supplier.linksHub.pinnedIds': ['LIVE-102', 'SHOP-311'],
    'supplier.linksHub.reviewNotes': {
      'LIVE-102':
        'Please verify UTM campaign, ensure WhatsApp caption includes the correct CTA, and confirm region variants.'
    },
    'supplier.liveSchedule.aiSlots': liveSchedule.AI_SLOTS,
    'supplier.liveSchedule.sessions': liveSchedule.SESSIONS,
    'supplier.liveDashboard.suppliers': liveDashboard.suppliersSeed,
    'supplier.liveDashboard.campaigns': liveDashboard.campaignsSeed,
    'supplier.liveDashboard.hosts': liveDashboard.hostsSeed,
    'supplier.liveDashboard.sessions': liveDashboard.sessionsSeed,
    'supplier.taskBoard.contracts': taskBoard.CONTRACTS,
    'supplier.myCreators.items': myCreators.INITIAL_MY_CREATORS,
    'supplier.myCreators.campaignOptions': [
      { id: 'CAMP-11', name: 'Beauty Flash Dealz' },
      { id: 'CAMP-07', name: 'Tech Friday Mega' },
      { id: 'CAMP-21', name: 'GlowUp Serum Promo' },
      { id: 'CAMP-33', name: 'Repair Booking Offer' }
    ],
    'supplier.campaignsBoard.campaigns': campaignsBoard.INITIAL_CAMPAIGNS,
    'supplier.campaignsBoard.savedIds': [],
    'supplier.campaignsBoard.batchSelection': [],
    'supplier.contracts.items': contractsPage.MOCK_CONTRACTS
  };

  for (const [key, payload] of Object.entries(importedModules)) {
    await upsertSellerfrontModule(key, payload);
  }

  await mergeSnapshotModules(SELLERFRONT_SEED_RECORD_ID, 'seed', importedModules);
  await mergeSnapshotModules(SELLERFRONT_LIVE_RECORD_ID, 'live', importedModules);

  console.log(
    `Imported sellerfront compatibility seeds: ${
      (adzDashboard.DEMO_ADS as unknown[]).length
    } dashboard ads, ${(dealzMarketplace.DEALZ_SEED as unknown[]).length} dealz, ${
      (assetLibrary.seedAssets as unknown[]).length
    } assets, ${(liveDashboard.sessionsSeed as unknown[]).length} live dashboard sessions, ${
      (contractsPage.MOCK_CONTRACTS as unknown[]).length
    } contracts.`
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
