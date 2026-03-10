import fs from 'node:fs/promises';
import path from 'path';
import vm from 'node:vm';
import { PrismaClient, type Prisma } from '@prisma/client';
import ts from 'typescript';

const prisma = new PrismaClient();

const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9:_-]+/g, '_');
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

type CompatNotification = {
  id: string;
  type: 'all' | 'proposal' | 'invite' | 'live' | 'earnings' | 'system';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  priority: 'high' | 'normal' | 'low';
  meta: { seller: string; campaign: string };
  cta: string;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractInitializer(source: string, constName: string) {
  const signature = new RegExp(`const\\s+${constName}\\b`);
  const match = signature.exec(source);
  if (!match) {
    throw new Error(`Unable to locate const ${constName}`);
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

function extractHookFallback(source: string, key: string) {
  const pattern = new RegExp(
    `useCreatorCompat(?:State|Value)(?:<[^)]*>)?\\(\\s*["'\`]${escapeRegExp(key)}["'\`]\\s*,`,
    'm'
  );
  const match = pattern.exec(source);
  if (!match) {
    throw new Error(`Unable to locate compatibility seed for ${key}`);
  }

  let index = match.index + match[0].length;
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
        return source.slice(start, index).trim();
      }
      depthParen -= 1;
      continue;
    }
    if (ch === '[') depthBracket += 1;
    if (ch === ']') depthBracket -= 1;
    if (ch === '{') depthBrace += 1;
    if (ch === '}') depthBrace -= 1;
  }

  throw new Error(`Unable to parse compatibility seed for ${key}`);
}

function evaluateTsExpression(expression: string, context: Record<string, unknown>) {
  const transpiled = ts.transpileModule(`module.exports = (${expression});`, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React
    }
  });

  const sandbox = {
    module: { exports: undefined as unknown },
    exports: {},
    Date,
    Math,
    JSON,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Set,
    Map,
    useMemo: (factory: () => unknown) => factory(),
    ...context
  };

  vm.runInNewContext(transpiled.outputText, sandbox, { timeout: 2000 });
  return (sandbox.module as { exports: unknown }).exports;
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
  const repoRoot = path.resolve(process.cwd(), '..');
  const creatorRoot = path.join(repoRoot, 'creator', 'src');
  const pagesRoot = path.join(creatorRoot, 'pages', 'creator');

  const contractsModule = await import(path.join(creatorRoot, 'data', 'mockContracts.ts'));
  const notificationsModule = await import(path.join(creatorRoot, 'pages', 'creator', 'NotificationsPage.tsx'));
  const promoModule = await import(path.join(creatorRoot, 'pages', 'creator', 'PromoAdDetailPage.tsx'));
  const proposalModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'ProposalNegotiationRoomPage.tsx')
  );
  const awaitingApprovalModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'creator_awaiting_approval.tsx')
  );

  const contracts = contractsModule.CONTRACTS as unknown[];
  const rawNotifications = notificationsModule.DEMO_NOTIFICATIONS as Array<Record<string, unknown>>;
  const promo = promoModule.DEMO_PROMO;
  const proposalStatus = proposalModule.PROPOSAL_ROOM_INITIAL_STATUS;
  const proposalTerms = proposalModule.PROPOSAL_ROOM_BASE_TERMS;
  const proposalMessages = proposalModule.PROPOSAL_ROOM_INITIAL_MESSAGES as unknown[];
  const awaitingApproval = awaitingApprovalModule.seedSubmissions() as unknown[];
  const creatorLinkHubSource = await fs.readFile(
    path.join(pagesRoot, 'CreatorLinkHub.tsx'),
    'utf8'
  );
  const liveAlertsSource = await fs.readFile(
    path.join(pagesRoot, 'LiveAlertsManager.tsx'),
    'utf8'
  );
  const postLiveSource = await fs.readFile(
    path.join(pagesRoot, 'PostLivePublisher.tsx'),
    'utf8'
  );
  const overlaysSource = await fs.readFile(
    path.join(pagesRoot, 'OverlaysCTAsPro.tsx'),
    'utf8'
  );
  const streamToPlatformsSource = await fs.readFile(
    path.join(pagesRoot, 'StreamToPlatforms.tsx'),
    'utf8'
  );

  const linkHubItems = evaluateTsExpression(extractInitializer(creatorLinkHubSource, 'defaultItems'), {});
  const linkHubPinnedIds = evaluateTsExpression(
    extractHookFallback(creatorLinkHubSource, 'creator.linkHub.pinnedIds'),
    {}
  );

  const liveAlertsSession = evaluateTsExpression(
    extractInitializer(liveAlertsSource, 'defaultSession'),
    {}
  );
  const liveAlertsChannels = evaluateTsExpression(
    extractInitializer(liveAlertsSource, 'defaultChannels'),
    {}
  );
  const liveAlertsTemplateSeeds = evaluateTsExpression(
    extractInitializer(liveAlertsSource, 'defaultTemplateSeeds'),
    {}
  );
  const liveAlertsEnabledDest = evaluateTsExpression(
    extractHookFallback(liveAlertsSource, 'creator.liveAlerts.enabledDest'),
    {}
  );
  const liveAlertsLastSent = evaluateTsExpression(
    extractHookFallback(liveAlertsSource, 'creator.liveAlerts.lastSent'),
    {}
  );

  const postLiveSession = evaluateTsExpression(
    extractInitializer(postLiveSource, 'defaultSession'),
    { sessionId: 'LS-20418' }
  );
  const postLiveClips = evaluateTsExpression(
    extractHookFallback(postLiveSource, 'creator.postLive.clips'),
    {}
  );
  const postLiveChannels = evaluateTsExpression(
    extractInitializer(postLiveSource, 'defaultChannels'),
    {}
  );
  const postLiveEnabledChannels = evaluateTsExpression(
    extractHookFallback(postLiveSource, 'creator.postLive.enabledChannels'),
    {}
  );

  const overlaysSession = evaluateTsExpression(extractInitializer(overlaysSource, 'defaultSession'), {});
  const overlaysProducts = evaluateTsExpression(
    extractInitializer(overlaysSource, 'defaultProducts'),
    {}
  );

  const streamProfile = evaluateTsExpression(
    extractHookFallback(streamToPlatformsSource, 'creator.streamPlatforms.profile'),
    {}
  );
  const streamDestinations = evaluateTsExpression(
    extractHookFallback(streamToPlatformsSource, 'creator.streamPlatforms.destinations'),
    { DEFAULT_TITLE: 'GlowUp Hub: Autumn Beauty Flash Live' }
  );

  const notifications: CompatNotification[] = rawNotifications.map((entry, index) => {
    const rawType = String(entry.type || '').toLowerCase();
    const type =
      rawType === 'proposal' || rawType === 'invite' || rawType === 'live'
        ? rawType
        : rawType === 'earnings' || rawType === 'payout'
          ? 'earnings'
          : 'system';

    return {
      id: String(entry.id || `notification_${index + 1}`),
      type,
      title: String(entry.title || 'Notification'),
      message: String(entry.message || 'You have a new notification.'),
      time: String(entry.time || 'Just now'),
      unread: Boolean(entry.unread),
      priority:
        entry.priority === 'high' ? 'high' : entry.priority === 'low' ? 'low' : 'normal',
      meta: {
        seller: String((entry.meta as { seller?: string } | undefined)?.seller || 'MyLiveDealz'),
        campaign: String(
          (entry.meta as { campaign?: string } | undefined)?.campaign || 'Workspace'
        )
      },
      cta: String(entry.cta || 'Open')
    };
  });

  const modules: Array<[string, unknown]> = [
    ['creator.contracts.items', contracts],
    ['creator.notifications.items', notifications],
    ['creator.promoAdDetail.promo', promo],
    ['creator.proposalRoom.status', proposalStatus],
    ['creator.proposalRoom.terms', proposalTerms],
    ['creator.proposalRoom.messages', proposalMessages],
    ['creator.proposalRoom.appliedSuggestions', []],
    ['creator.awaitingApproval.submissions', awaitingApproval],
    ['creator.linkHub.items', linkHubItems],
    ['creator.linkHub.pinnedIds', linkHubPinnedIds],
    ['creator.liveAlerts.session', liveAlertsSession],
    ['creator.liveAlerts.channels', liveAlertsChannels],
    ['creator.liveAlerts.templateSeeds', liveAlertsTemplateSeeds],
    ['creator.liveAlerts.enabledDest', liveAlertsEnabledDest],
    ['creator.liveAlerts.lastSent', liveAlertsLastSent],
    ['creator.postLive.session', postLiveSession],
    ['creator.postLive.clips', postLiveClips],
    ['creator.postLive.channels', postLiveChannels],
    ['creator.postLive.enabledChannels', postLiveEnabledChannels],
    ['creator.overlays.session', overlaysSession],
    ['creator.overlays.products', overlaysProducts],
    ['creator.streamPlatforms.profile', streamProfile],
    ['creator.streamPlatforms.destinations', streamDestinations]
  ];

  for (const [key, payload] of modules) {
    await upsertGlobalModule('creatorfront', key, payload);
  }

  console.log(
    [
      'Seeded creator feature mocks:',
      `contracts=${contracts.length}`,
      `notifications=${notifications.length}`,
      'promo=1',
      `proposalMessages=${proposalMessages.length}`,
      `awaitingApproval=${awaitingApproval.length}`,
      `linkHubItems=${Array.isArray(linkHubItems) ? linkHubItems.length : 0}`,
      `liveAlertsChannels=${Array.isArray(liveAlertsChannels) ? liveAlertsChannels.length : 0}`,
      `postLiveClips=${Array.isArray(postLiveClips) ? postLiveClips.length : 0}`,
      `streamDestinations=${Array.isArray(streamDestinations) ? streamDestinations.length : 0}`
    ].join(' ')
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
