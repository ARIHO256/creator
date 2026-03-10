import fs from 'fs/promises';
import path from 'path';
import vm from 'vm';
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const repoRoot = path.resolve(process.cwd(), '..');
const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

function extractFunctionDeclaration(source: string, functionName: string) {
  const signature = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\(`);
  const match = signature.exec(source);
  if (!match) {
    throw new Error(`Unable to locate function ${functionName}`);
  }

  let index = match.index;
  while (index < source.length && source[index] !== '{') {
    index += 1;
  }

  if (source[index] !== '{') {
    throw new Error(`Unable to locate function body for ${functionName}`);
  }

  let depth = 0;
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

    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;

    if (depth === 0) {
      return source.slice(match.index, index + 1);
    }
  }

  throw new Error(`Unable to parse function ${functionName}`);
}

async function evaluateSeedFunction(filePath: string, functionName: string) {
  const source = await fs.readFile(filePath, 'utf8');
  const functionSource = extractFunctionDeclaration(source, functionName);
  return vm.runInNewContext(
    `(() => { ${functionSource}; return ${functionName}(); })()`,
    {
      Date,
      Math,
      Number,
      String,
      Array,
      Object,
      JSON,
      Set,
      Map,
      console,
    },
    { timeout: 1000 }
  );
}

async function seedModule(app: string, key: string, payload: unknown) {
  const id = `frontend_state_module_${sanitize(app)}_${sanitize(key)}_global`;
  await prisma.appRecord.upsert({
    where: { id },
    update: {
      domain: 'frontend_state_module',
      entityType: app,
      entityId: key,
      payload: asJson(payload),
    },
    create: {
      id,
      domain: 'frontend_state_module',
      entityType: app,
      entityId: key,
      payload: asJson(payload),
    },
  });
}

async function main() {
  const financeDir = path.join(repoRoot, 'seller', 'src', 'features', 'finance');
  const modules = {
    'finance.home': await evaluateSeedFunction(path.join(financeDir, 'finance_home.tsx'), 'seedFinance'),
    'finance.invoices': await evaluateSeedFunction(path.join(financeDir, 'finance_invoices_previewable.tsx'), 'seedInvoices'),
    'finance.statements': await evaluateSeedFunction(path.join(financeDir, 'finance_statements_previewable.tsx'), 'seedStatements'),
    'finance.taxReports': await evaluateSeedFunction(path.join(financeDir, 'finance_tax_reports_previewable.tsx'), 'seedReports'),
    'finance.payoutHolds': await evaluateSeedFunction(
      path.join(financeDir, 'finance_payout_holds_previewable (1).tsx'),
      'seedHolds'
    ),
  } as const;

  for (const [key, value] of Object.entries(modules)) {
    await seedModule('sellerfront', key, value);
  }

  console.log(
    `Imported sellerfront finance seeds: home=${Object.keys((modules['finance.home'] as Record<string, unknown>) || {}).length} ` +
      `invoices=${Array.isArray(modules['finance.invoices']) ? modules['finance.invoices'].length : 0} ` +
      `statements=${Array.isArray(modules['finance.statements']) ? modules['finance.statements'].length : 0} ` +
      `taxReports=${Array.isArray(modules['finance.taxReports']) ? modules['finance.taxReports'].length : 0} ` +
      `payoutHolds=${Array.isArray(modules['finance.payoutHolds']) ? modules['finance.payoutHolds'].length : 0}.`
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
