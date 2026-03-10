import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const repoRoot = path.resolve(process.cwd(), '..');
const featuresRoot = path.join(repoRoot, 'seller', 'src', 'features');
const FEATURE_DOMAIN = 'seller_feature_mock_seed';
const MODULE_DOMAIN = 'frontend_state_module';
const APP = 'sellerfront';

type CaptureMap = Record<string, unknown>;
type ManualResolver = (capture: CaptureMap) => unknown;
type RecordWriter = Pick<PrismaClient, 'appRecord'> | Prisma.TransactionClient;
type FileSummary = {
  file: string;
  deletedArchiveRecords: number;
  archived: string[];
  modules: string[];
};

const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const toSerializable = (value: unknown): Prisma.InputJsonValue | null => {
  if (value === null) return null;
  if (value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value as Prisma.InputJsonValue;
  }
  if (value instanceof Date) {
    return value.toISOString() as Prisma.InputJsonValue;
  }
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item)) as Prisma.InputJsonValue;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, toSerializable(item)] as const)
      .filter(([, item]) => item !== null);
    return Object.fromEntries(entries) as Prisma.InputJsonValue;
  }
  return null;
};
const asJson = (value: unknown) => toSerializable(value);
const STORE_PROFILE_LINES = {
  'category-dc-fast-chargers': [
    { id: 'marketplace-evmart', name: 'EVmart', type: 'Marketplace' },
    { id: 'family-chargers', name: 'EV Chargers & Accessories', type: 'Product Family' },
    { id: 'category-dc-fast-chargers', name: 'DC Fast Chargers', type: 'Category' }
  ],
  'category-desktops': [
    { id: 'marketplace-gadgetmart', name: 'GadgetMart', type: 'Marketplace' },
    { id: 'family-computers', name: 'Laptops & Computers', type: 'Product Family' },
    { id: 'category-desktops', name: 'Desktops', type: 'Category' }
  ],
  'category-women-shoes': [
    { id: 'marketplace-stylemart', name: 'StyleMart', type: 'Marketplace' },
    { id: 'family-fashion-women', name: "Women's Fashion", type: 'Product Family' },
    { id: 'category-women-shoes', name: 'Shoes & Heels', type: 'Category' }
  ]
} satisfies Record<string, Array<{ id: string; name: string; type: string }>>;

function buildCatalogLine(nodeId: keyof typeof STORE_PROFILE_LINES, status: 'active' | 'suspended' = 'active') {
  return {
    id: `${nodeId}-seeded`,
    nodeId,
    path: STORE_PROFILE_LINES[nodeId],
    status
  };
}

const manualResolvers: Record<string, Record<string, ManualResolver>> = {
  'settings/teams_roles_supplier_custom_roles_permission_builder_previewable.tsx': {
    seedMembers(capture) {
      const seedRoles = capture.seedRoles;
      const seedMembers = capture.seedMembers;
      if (typeof seedRoles !== 'function' || typeof seedMembers !== 'function') {
        throw new Error('Missing seedRoles/seedMembers in teams roles file.');
      }
      const roles = (seedRoles as () => Array<{ id: string; template: string }>)();
      const byName: Record<string, string> = {};
      roles.forEach((role) => {
        byName[role.template] = role.id;
      });
      return (seedMembers as (roleIds: Record<string, string>) => unknown)({
        owner: byName.OWNER || 'role_owner',
        admin: byName.ADMIN || 'role_admin',
        ops: byName.OPS || 'role_ops',
        sales: byName.SALES || 'role_sales',
        finance: byName.FINANCE || 'role_finance',
        viewer: byName.VIEWER || 'role_viewer'
      });
    }
  },
  'settings/supplier_hub_profile_storefront_previewable.tsx': {
    seed() {
      return {
        identity: {
          displayName: 'EV World Store',
          legalName: 'EV World (Wuxi) Business Technology Co., Ltd.',
          handle: 'evworld',
          email: 'support@evzonecharging.com',
          phone: '+86 177 6831 9897',
          website: 'https://www.evzonecharging.com',
          category: 'EV Charging Stations'
        },
        branding: {
          tagline: 'Premium EV charging and accessories',
          description:
            'We design and supply EV charging solutions, accessories, and installation services. We prioritize quality, safety, and reliable delivery timelines.',
          primary: '#03CD8C',
          accent: '#F77F00',
          logoName: 'logo.png',
          coverName: 'cover.jpg'
        },
        addresses: [
          {
            id: 'ADDR-1',
            label: 'Registered office',
            type: 'Office',
            line1: 'Room 265, No. 3 Gaolang East Road',
            city: 'Wuxi',
            region: 'Jiangsu',
            country: 'China',
            isDefault: true
          },
          {
            id: 'ADDR-2',
            label: 'Kampala correspondence',
            type: 'Office',
            line1: 'Millennium House, Nsambya Road 472',
            city: 'Kampala',
            region: 'Central',
            country: 'Uganda',
            isDefault: false
          }
        ],
        stores: [
          { id: 'STORE-1', name: 'Main Store', handle: 'evworld', region: 'Global', status: 'Active' },
          { id: 'STORE-2', name: 'China Hub', handle: 'evworld-cn', region: 'China', status: 'Planned' }
        ],
        regions: ['UG', 'KE', 'TZ', 'RW'],
        supportHours: 'Mon-Fri 09:00-17:00 (EAT)',
        socials: {
          facebook: '',
          instagram: '',
          twitter: '',
          youtube: '',
          linkedin: '',
          tiktok: ''
        },
        customSocials: [],
        productLines: [
          buildCatalogLine('category-dc-fast-chargers', 'active'),
          buildCatalogLine('category-desktops', 'active'),
          buildCatalogLine('category-women-shoes', 'suspended')
        ].filter(Boolean)
      };
    }
  },
  'provider/provider_bookings_booking_detail_previewable.tsx': {
    seedBookings(capture) {
      const seedBookings = capture.seedBookings;
      if (typeof seedBookings !== 'function') {
        throw new Error('Missing seedBookings in provider bookings file.');
      }
      return (seedBookings as (nowMs: number) => unknown)(Date.now());
    }
  },
  'ops/ops_shipping_profiles_premium.tsx': {
    seedProfiles(capture) {
      const seedWarehouses = capture.seedWarehouses;
      const seedProfiles = capture.seedProfiles;
      if (typeof seedWarehouses !== 'function' || typeof seedProfiles !== 'function') {
        throw new Error('Missing seedWarehouses/seedProfiles in ops shipping file.');
      }
      const warehouses = (seedWarehouses as () => Array<{ id: string }>)();
      return (seedProfiles as (warehouses: Array<{ id: string }>) => unknown)(warehouses);
    }
  },
  'settings/settings_integrations_connected_apps_api_keys_webhook_health.tsx': {
    seedWebhookLogs(capture) {
      const seedWebhooks = capture.seedWebhooks;
      const seedWebhookLogs = capture.seedWebhookLogs;
      if (typeof seedWebhooks !== 'function' || typeof seedWebhookLogs !== 'function') {
        throw new Error('Missing seedWebhooks/seedWebhookLogs in integrations settings file.');
      }
      const endpoints = (seedWebhooks as () => unknown[])();
      return (seedWebhookLogs as (endpoints: unknown[]) => unknown)(endpoints);
    }
  }
};

function stripImportsAndExports(source: string) {
  const importRegex = /^\s*import\s+(.+?)\s+from\s+['"][^'"]+['"];?\s*$/gm;
  const bareImportRegex = /^\s*import\s+['"][^'"]+['"];?\s*$/gm;

  const withImportStubs = source.replace(importRegex, (_match, specifiers: string) => {
    const declarations: string[] = [];
    const trimmed = specifiers.trim();

    if (trimmed.startsWith('type ')) {
      return '';
    }

    const parts: string[] = [];
    const braceStart = trimmed.indexOf('{');

    if (braceStart >= 0) {
      const beforeBrace = trimmed.slice(0, braceStart).trim().replace(/,$/, '').trim();
      const braceEnd = trimmed.lastIndexOf('}');
      if (beforeBrace) {
        parts.push(beforeBrace);
      }
      if (braceEnd > braceStart) {
        parts.push(trimmed.slice(braceStart, braceEnd + 1));
        const afterBrace = trimmed.slice(braceEnd + 1).trim().replace(/^,/, '').trim();
        if (afterBrace) {
          parts.push(afterBrace);
        }
      } else {
        parts.push(trimmed.slice(braceStart));
      }
    } else {
      parts.push(trimmed);
    }

    for (const part of parts) {
      if (!part || part.startsWith('type ')) continue;
      if (part.startsWith('{') && part.endsWith('}')) {
        const names = part
          .slice(1, -1)
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
        for (const name of names) {
          if (name.startsWith('type ')) continue;
          const local = name.split(/\s+as\s+/i).pop()?.trim();
          if (local) declarations.push(`const ${local} = __stub;`);
        }
        continue;
      }
      if (part.startsWith('* as ')) {
        const local = part.slice(5).trim();
        if (local) declarations.push(`const ${local} = __stub;`);
        continue;
      }
      const local = part.split(/\s+as\s+/i).pop()?.trim();
      if (local) declarations.push(`const ${local} = __stub;`);
    }

    return declarations.join('\n');
  });

  return withImportStubs
    .replace(bareImportRegex, '')
    .replace(/^\s*export\s+default\s+function/gm, 'function')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+function/gm, 'function')
    .replace(/^\s*export\s+const/gm, 'const')
    .replace(/^\s*export\s+class/gm, 'class')
    .replace(/^\s*export\s+(type|interface|enum)\b/gm, '$1')
    .replace(/^\s*export\s*\{[\s\S]*?\};?\s*$/gm, '');
}

function candidateIdentifiers(source: string) {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bfunction\s+([A-Za-z0-9_]+)\s*\(/g)) {
    const name = match[1];
    if (name.startsWith('seed') || name.startsWith('SEED_') || name.startsWith('FALLBACK_')) {
      names.add(name);
    }
  }
  for (const match of source.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*=/g)) {
    const name = match[1];
    if (name.startsWith('seed') || name.startsWith('SEED_') || name.startsWith('FALLBACK_')) {
      names.add(name);
    }
  }
  return [...names];
}

function captureIdentifiers(source: string) {
  const names = new Set<string>(candidateIdentifiers(source));
  for (const match of source.matchAll(/\bfunction\s+([A-Za-z0-9_]+)\s*\(/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/\bconst\s+([A-Za-z0-9_]+)\s*=/g)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/\bclass\s+([A-Za-z0-9_]+)\b/g)) {
    names.add(match[1]);
  }
  return [...names];
}

function createRequireStub() {
  const stubFn = () => undefined;
  const proxy = new Proxy(stubFn, {
    get: () => proxy,
    apply: () => undefined
  });
  return () => proxy;
}

async function evaluateFile(filePath: string, names: string[]) {
  const source = await fs.readFile(filePath, 'utf8');
  const transformedSource =
    stripImportsAndExports(source) +
    `\nmodule.exports.__capture = {\n${names
      .map((name) => `  ${JSON.stringify(name)}: typeof ${name} !== 'undefined' ? ${name} : undefined`)
      .join(',\n')}\n};\n`;

  const transpiled = ts.transpileModule(transformedSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React
    },
    fileName: filePath
  });

  const context = vm.createContext({
    module: { exports: {} as Record<string, unknown> },
    exports: {},
    require: createRequireStub(),
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    Symbol,
    Set,
    Map,
    Promise,
    window: {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined
      },
      location: { search: '' },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval
    },
    localStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    },
    __stub: createRequireStub()(),
    navigator: { clipboard: { writeText: () => undefined } },
    URLSearchParams,
    Buffer
  });

  const script = new vm.Script(transpiled.outputText, { filename: filePath });
  script.runInContext(context, { timeout: 2000 });

  return (context.module as { exports?: { __capture?: CaptureMap } }).exports?.__capture ?? {};
}

function evaluateIdentifier(
  file: string,
  name: string,
  capture: CaptureMap
) {
  const manual = manualResolvers[file]?.[name];
  if (manual) {
    return manual(capture);
  }

  const value = capture[name];
  if (typeof value === 'function') {
    if ((value as Function).length !== 0) {
      throw new Error(`Seed ${name} in ${file} requires arguments and has no manual resolver.`);
    }
    return (value as () => unknown)();
  }
  return value;
}

function parseUseMockStateMappings(source: string) {
  const mappings: Array<{ key: string; expr: string }> = [];

  for (let index = 0; index < source.length; index += 1) {
    const start = source.indexOf('useMockState', index);
    if (start < 0) break;
    index = start + 'useMockState'.length - 1;

    let cursor = start + 'useMockState'.length;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

    if (source[cursor] === '<') {
      let depth = 1;
      cursor += 1;
      while (cursor < source.length && depth > 0) {
        const ch = source[cursor];
        if (ch === '<') depth += 1;
        if (ch === '>') depth -= 1;
        cursor += 1;
      }
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    }

    if (source[cursor] !== '(') {
      continue;
    }
    cursor += 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

    const quote = source[cursor];
    if (!['"', "'", '`'].includes(quote)) {
      continue;
    }
    cursor += 1;
    const keyStart = cursor;
    while (cursor < source.length && source[cursor] !== quote) cursor += 1;
    const key = source.slice(keyStart, cursor);
    cursor += 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== ',') {
      continue;
    }
    cursor += 1;
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

    const exprStart = cursor;
    let depthParen = 0;
    let depthBracket = 0;
    let depthBrace = 0;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let escaped = false;

    for (; cursor < source.length; cursor += 1) {
      const ch = source[cursor];
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
        if (ch === '`') inTemplate = false;
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
      if (ch === ')') {
        if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
          mappings.push({ key, expr: source.slice(exprStart, cursor).trim() });
          break;
        }
        depthParen -= 1;
        continue;
      }
      if (ch === '[') depthBracket += 1;
      if (ch === ']') depthBracket -= 1;
      if (ch === '{') depthBrace += 1;
      if (ch === '}') depthBrace -= 1;
    }
  }
  return mappings;
}

function isRelevantSeedExpression(expr: string) {
  return /(?:\bseed[A-Za-z0-9_]*\b|\bSEED_[A-Za-z0-9_]+\b|\bFALLBACK_[A-Za-z0-9_]+\b|seeded\.|buildSowText\()/i.test(
    expr
  );
}

function resolveModulePayload(file: string, expr: string, evaluated: Record<string, unknown>) {
  const directCall = expr.match(/^([A-Za-z0-9_]+)\(\)$/);
  if (directCall) {
    return evaluated[directCall[1]];
  }

  const dotted = expr.match(/^([A-Za-z0-9_]+)((?:\.[A-Za-z0-9_]+)+)$/);
  if (dotted) {
    const root = evaluated[dotted[1]];
    return dotted[2]
      .slice(1)
      .split('.')
      .reduce<unknown>((acc, part) => {
        if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, root);
  }

  const indexedOptional = expr.match(/^([A-Za-z0-9_]+)\(\)\[0\]\?\.\s*([A-Za-z0-9_]+)$/);
  if (indexedOptional) {
    const root = evaluated[indexedOptional[1]];
    if (Array.isArray(root)) {
      return root[0] && typeof root[0] === 'object'
        ? (root[0] as Record<string, unknown>)[indexedOptional[2]]
        : undefined;
    }
  }

  if (evaluated[expr] !== undefined) {
    return evaluated[expr];
  }

  if (file === 'settings/teams_roles_supplier_custom_roles_permission_builder_previewable.tsx') {
    if (expr === 'seedMembers(roleIdMap)') return evaluated.seedMembers;
    if (expr === 'seedPolicies()') return evaluated.seedPolicies;
    if (expr === 'seededRoles') return evaluated.seedRoles;
    if (expr === '[]') return [];
  }

  if (file === 'provider/provider_bookings_booking_detail_previewable.tsx' && expr === 'seedBookings(Date.now())') {
    return evaluated.seedBookings;
  }

  if (
    file === 'provider/provider_joint_quote_collaboration_split_responsibilities_previewable.tsx' &&
    expr === 'buildSowText(seedQuote())'
  ) {
    const buildSowText = evaluated.buildSowText;
    const quote = evaluated.seedQuote;
    if (typeof buildSowText === 'function') {
      return (buildSowText as (value: unknown) => unknown)(quote);
    }
  }

  if (file === 'ops/ops_shipping_profiles_premium.tsx' && expr === 'seedProfiles(warehouses)') {
    return evaluated.seedProfiles;
  }

  return undefined;
}

async function collectFeatureFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFeatureFiles(root, absolute)));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(path.relative(root, absolute).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

async function upsertArchiveRecord(writer: RecordWriter, file: string, name: string, payload: unknown) {
  const id = `seller_feature_mock_seed_${sanitize(file)}_${sanitize(name)}`;
  await writer.appRecord.upsert({
    where: { id },
    update: {
      domain: FEATURE_DOMAIN,
      entityType: file,
      entityId: name,
      payload: asJson(payload)
    },
    create: {
      id,
      domain: FEATURE_DOMAIN,
      entityType: file,
      entityId: name,
      payload: asJson(payload)
    }
  });
}

async function upsertModuleRecord(writer: RecordWriter, key: string, payload: unknown) {
  const id = `frontend_state_module_${sanitize(APP)}_${sanitize(key)}_global`;
  await writer.appRecord.upsert({
    where: { id },
    update: {
      domain: MODULE_DOMAIN,
      entityType: APP,
      entityId: key,
      payload: asJson(payload)
    },
    create: {
      id,
      domain: MODULE_DOMAIN,
      entityType: APP,
      entityId: key,
      payload: asJson(payload)
    }
  });
}

async function main() {
  const files = await collectFeatureFiles(featuresRoot);
  const candidates = [] as Array<{
    file: string;
    absolute: string;
    source: string;
    archiveNames: string[];
    captureNames: string[];
    mappings: Array<{ key: string; expr: string }>;
  }>;

  for (const file of files) {
    const absolute = path.join(featuresRoot, file);
    const source = await fs.readFile(absolute, 'utf8');
    const archiveNames = candidateIdentifiers(source);
    const captureNames = captureIdentifiers(source);
    const mappings = parseUseMockStateMappings(source).filter((mapping) =>
      isRelevantSeedExpression(mapping.expr)
    );
    if (archiveNames.length === 0 && mappings.length === 0) {
      continue;
    }
    candidates.push({ file, absolute, source, archiveNames, captureNames, mappings });
  }

  console.log(`Inspecting seller feature mocks: ${candidates.length} files with seed data or module mappings.`);

  const summaries: FileSummary[] = [];

  for (const candidate of candidates) {
    const capture = await evaluateFile(candidate.absolute, candidate.captureNames);
    const evaluated: Record<string, unknown> = {};

    for (const name of candidate.archiveNames) {
      const value = evaluateIdentifier(candidate.file, name, capture);
      if (value === undefined) {
        continue;
      }
      evaluated[name] = value;
    }

    for (const mapping of candidate.mappings) {
      const directName = mapping.expr.match(/^([A-Za-z0-9_]+)(?:\(|\.|\[|$)/)?.[1];
      if (directName && capture[directName] !== undefined && evaluated[directName] === undefined) {
        evaluated[directName] = capture[directName];
      }
    }

    const summary: FileSummary = {
      file: candidate.file,
      deletedArchiveRecords: 0,
      archived: [],
      modules: []
    };

    await prisma.$transaction(async (tx) => {
      const deleteResult = await tx.appRecord.deleteMany({
        where: {
          domain: FEATURE_DOMAIN,
          entityType: candidate.file
        }
      });
      summary.deletedArchiveRecords = deleteResult.count;

      for (const [name, value] of Object.entries(evaluated)) {
        await upsertArchiveRecord(tx, candidate.file, name, value);
        summary.archived.push(name);
      }

      for (const mapping of candidate.mappings) {
        const payload = resolveModulePayload(candidate.file, mapping.expr, evaluated);
        if (payload === undefined) {
          continue;
        }
        await upsertModuleRecord(tx, mapping.key, payload);
        summary.modules.push(mapping.key);
      }
    });

    summaries.push(summary);
  }

  console.log('\nFeature seed summary');
  summaries.forEach((summary) => {
    console.log(`\n${summary.file}`);
    console.log(`  deleted archive records: ${summary.deletedArchiveRecords}`);
    console.log(`  archived: ${summary.archived.length ? summary.archived.join(', ') : 'none'}`);
    console.log(`  modules: ${summary.modules.length ? summary.modules.join(', ') : 'none'}`);
  });

  console.log(`\nArchived files: ${summaries.length}`);
}

main()
  .catch((error) => {
    console.error('\nSeeding seller feature mocks failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
