import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const repoRoot = path.resolve(process.cwd(), '..');
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

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
    isoNowPlus: (ms: number) => new Date(Date.now() + ms).toISOString()
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

async function upsertGlobalModule(app: string, key: string, payload: unknown) {
  const id = `frontend_state_module_${sanitize(app)}_${sanitize(key)}_global`;
  await prisma.appRecord.upsert({
    where: { id },
    update: {
      domain: 'frontend_state_module',
      entityType: app,
      entityId: key,
      payload: asJson(payload)
    },
    create: {
      id,
      domain: 'frontend_state_module',
      entityType: app,
      entityId: key,
      payload: asJson(payload)
    }
  });
}

async function main() {
  const creatorDir = path.join(repoRoot, 'frontend', 'src', 'pages', 'creator');

  const adzDashboard = await loadSeedMap(path.join(creatorDir, 'AdzDashboard.tsx'), [
    'SAMPLE_VIDEO',
    'DEMO_ADS'
  ]);
  const adzManager = await loadSeedMap(path.join(creatorDir, 'AdzManager.tsx'), [
    'SAMPLE_VIDEO',
    'DEMO_ADS'
  ]);
  const adzMarketplace = await loadSeedMap(path.join(creatorDir, 'AdzMarketplace.tsx'), [
    'SAMPLE_VIDEO',
    'DEMO_ADS'
  ]);
  const dealzMarketplace = await loadSeedMap(path.join(creatorDir, 'DealzMarketplace2.tsx'), [
    'SUPPLIERS',
    'CREATORS',
    'DEALZ_SEED'
  ]);
  const liveDashboard = await loadSeedMap(path.join(creatorDir, 'LiveDashboard2.tsx'), [
    'SAMPLE_VIDEO_1',
    'SAMPLE_VIDEO_2',
    'suppliersSeed',
    'campaignsSeed',
    'hostsSeed',
    'sessionsSeed'
  ]);

  await upsertGlobalModule('creatorfront', 'creator.adzDashboard.ads', adzDashboard.DEMO_ADS);
  await upsertGlobalModule('creatorfront', 'creator.adzManager.ads', adzManager.DEMO_ADS);
  await upsertGlobalModule('creatorfront', 'creator.adzMarketplace.ads', adzMarketplace.DEMO_ADS);
  await upsertGlobalModule(
    'creatorfront',
    'creator.dealzMarketplace.suppliers',
    dealzMarketplace.SUPPLIERS
  );
  await upsertGlobalModule(
    'creatorfront',
    'creator.dealzMarketplace.creators',
    dealzMarketplace.CREATORS
  );
  await upsertGlobalModule(
    'creatorfront',
    'creator.dealzMarketplace.deals',
    dealzMarketplace.DEALZ_SEED
  );
  await upsertGlobalModule(
    'creatorfront',
    'creator.liveDashboard.suppliers',
    liveDashboard.suppliersSeed
  );
  await upsertGlobalModule(
    'creatorfront',
    'creator.liveDashboard.campaigns',
    liveDashboard.campaignsSeed
  );
  await upsertGlobalModule('creatorfront', 'creator.liveDashboard.hosts', liveDashboard.hostsSeed);
  await upsertGlobalModule(
    'creatorfront',
    'creator.liveDashboard.sessions',
    liveDashboard.sessionsSeed
  );

  console.log(
    `Imported creator compatibility seeds: ${(adzDashboard.DEMO_ADS as unknown[]).length} adz dashboard ads, ${(adzManager.DEMO_ADS as unknown[]).length} adz manager ads, ${(adzMarketplace.DEMO_ADS as unknown[]).length} adz marketplace ads, ${(dealzMarketplace.DEALZ_SEED as unknown[]).length} dealz records, ${(liveDashboard.sessionsSeed as unknown[]).length} live sessions.`
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
