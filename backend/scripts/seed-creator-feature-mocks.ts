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

function extractFunctionBlock(source: string, functionName: string) {
  const signature = new RegExp(`function\\s+${functionName}\\b`);
  const match = signature.exec(source);
  if (!match) {
    throw new Error(`Unable to locate function ${functionName}`);
  }

  let index = match.index;
  while (index < source.length && source[index] !== '{') {
    index += 1;
  }
  if (source[index] !== '{') {
    throw new Error(`Unable to locate body for function ${functionName}`);
  }

  const bodyStart = index;
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
    if (ch === '{') depthBrace += 1;
    if (ch === '}') {
      depthBrace -= 1;
      if (depthBrace === 0) {
        return source.slice(match.index, index + 1).trim();
      }
    }
  }

  throw new Error(`Unable to parse function ${functionName}`);
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

function evaluateTsProgram(
  declarations: string[],
  expression: string,
  context: Record<string, unknown>
) {
  const transpiled = ts.transpileModule(
    `${declarations.join('\n')}\nmodule.exports = (${expression});`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React
      }
    }
  );

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

async function upsertGlobalStorageEntry(
  app: string,
  storageType: 'local' | 'session',
  key: string,
  value: string
) {
  const id = `frontend_state_storage_${sanitize(app)}_${storageType}_${sanitize(key)}_global`;
  await prisma.appRecord.upsert({
    where: { id },
    update: {
      domain: 'frontend_state_storage',
      entityType: `${app}:${storageType}`,
      entityId: key,
      payload: asJson({ value })
    },
    create: {
      id,
      domain: 'frontend_state_storage',
      entityType: `${app}:${storageType}`,
      entityId: key,
      payload: asJson({ value })
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
  const assetLibraryModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'AssetLibraryPage.tsx')
  );
  const liveStudioModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'LiveStudioPage.tsx')
  );
  const reviewsModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'Reviews2.tsx')
  );
  const onboardingWizardModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'CreatorOnboardingWizardPage.tsx')
  );
  const rolesModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'Roles Permissions_Creator.tsx')
  );
  const liveBuilderModule = await import(
    path.join(creatorRoot, 'pages', 'creator', 'LiveBuilder2.tsx')
  );
  const creatorCompatSeedsModule = await import(
    path.join(creatorRoot, 'data', 'creatorCompatSeeds.ts')
  );

  const contracts = contractsModule.CONTRACTS as unknown[];
  const rawNotifications = notificationsModule.DEMO_NOTIFICATIONS as Array<Record<string, unknown>>;
  const promo = promoModule.DEMO_PROMO;
  const proposalStatus = proposalModule.PROPOSAL_ROOM_INITIAL_STATUS;
  const proposalTerms = proposalModule.PROPOSAL_ROOM_BASE_TERMS;
  const proposalMessages = proposalModule.PROPOSAL_ROOM_INITIAL_MESSAGES as unknown[];
  const awaitingApproval = awaitingApprovalModule.seedSubmissions() as unknown[];
  const assetLibraryCreators = assetLibraryModule.ASSET_LIBRARY_CREATORS as unknown[];
  const assetLibrarySuppliers = assetLibraryModule.ASSET_LIBRARY_SUPPLIERS as unknown[];
  const assetLibraryCampaigns = assetLibraryModule.ASSET_LIBRARY_CAMPAIGNS as unknown[];
  const assetLibraryDeliverables = assetLibraryModule.ASSET_LIBRARY_DELIVERABLES as unknown[];
  const assetLibraryAssets = assetLibraryModule.ASSET_LIBRARY_SEED_ASSETS as unknown[];
  const liveStudioProducts = liveStudioModule.LIVE_STUDIO_PRODUCTS as unknown[];
  const liveStudioCohosts = liveStudioModule.LIVE_STUDIO_COHOSTS as unknown[];
  const liveStudioAttachments = liveStudioModule.LIVE_STUDIO_ATTACHMENTS as unknown[];
  const liveStudioScenes = liveStudioModule.LIVE_STUDIO_SCENES as unknown[];
  const liveStudioRunOfShow = liveStudioModule.LIVE_STUDIO_RUN_OF_SHOW as unknown[];
  const liveStudioScriptCues = liveStudioModule.LIVE_STUDIO_SCRIPT_CUES as unknown[];
  const liveStudioCommerceGoal = liveStudioModule.LIVE_STUDIO_COMMERCE_GOAL as unknown;
  const liveStudioSalesEvents = liveStudioModule.LIVE_STUDIO_SALES_EVENTS as unknown[];
  const liveStudioQaItems = liveStudioModule.LIVE_STUDIO_QA_ITEMS as unknown[];
  const liveStudioViewers = liveStudioModule.LIVE_STUDIO_VIEWERS as unknown[];
  const liveStudioAiPrompts = liveStudioModule.LIVE_STUDIO_AI_PROMPTS as unknown[];
  const liveStudioChatMessages = liveStudioModule.LIVE_STUDIO_CHAT_MESSAGES as unknown[];
  const reviewRecords = reviewsModule.seedReviewRecords() as unknown[];
  const onboardingWizardForm = onboardingWizardModule.seedCreatorOnboardingWizardForm() as Record<string, unknown>;
  const roleRecords = rolesModule.seedRoleRecords() as unknown[];
  const roleMembers = rolesModule.seedRoleMembers() as unknown[];
  const roleInvites = rolesModule.seedRoleInvites() as unknown[];
  const roleAudit = rolesModule.seedRoleAudit() as unknown[];
  const liveBuilderSuppliers = liveBuilderModule.suppliersSeed as unknown[];
  const liveBuilderCampaigns = liveBuilderModule.campaignsSeed as unknown[];
  const liveBuilderHosts = liveBuilderModule.hostsSeed as unknown[];
  const liveBuilderAssets = liveBuilderModule.assetsSeed as unknown[];
  const liveBuilderCatalog = liveBuilderModule.catalogSeed as unknown[];
  const liveBuilderDraftPayload = {
    ts: Date.now(),
    step: 'setup',
    draft: liveBuilderModule.defaultDraft('ls_seed_20418'),
    externalAssets: {},
    activeFeaturedItemId: null,
    activeFeaturedItemKey: null,
    giveawayUi: {
      giveawayPanelOpen: false,
      giveawayAddMode: 'featured',
      giveawayLinkedItemId: '',
      giveawayQuantity: '1',
      customGiveaway: {
        presetId: '',
        quantity: '1'
      }
    }
  };
  const audienceNotificationsConfig = creatorCompatSeedsModule.buildAudienceNotificationConfig();
  const audienceNotificationsTemplatePacks =
    creatorCompatSeedsModule.audienceNotificationTemplatePacks;
  const audienceNotificationsChannels = creatorCompatSeedsModule.audienceNotificationChannels;
  const audienceNotificationsReminders = creatorCompatSeedsModule.audienceNotificationReminders;
  const safetyModerationSession = creatorCompatSeedsModule.buildSafetyModerationSession();
  const safetyModerationDestinations = creatorCompatSeedsModule.safetyModerationDestinations;
  const safetyModerationMessages = creatorCompatSeedsModule.buildSafetyModerationMessages();
  const safetyModerationKeywordRules = creatorCompatSeedsModule.safetyModerationKeywordRules;
  const safetyModerationControls = creatorCompatSeedsModule.safetyModerationControls;
  const awaitingAdminApprovalOnboarding =
    creatorCompatSeedsModule.creatorAwaitingApprovalOnboarding;
  const awaitingAdminApprovalReview =
    creatorCompatSeedsModule.buildCreatorAwaitingApprovalReviewState();
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
  const onboardingV2Source = await fs.readFile(
    path.join(pagesRoot, 'creator_onboarding_v_2.tsx'),
    'utf8'
  );
  const settingsSafetySource = await fs.readFile(
    path.join(pagesRoot, 'CreatorSettingsSafetyPage.tsx'),
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
  const onboardingDefaultForm = evaluateTsProgram(
    [extractFunctionBlock(onboardingV2Source, 'defaultForm')],
    'defaultForm()',
    {}
  );
  const settingsDefaultForm = evaluateTsProgram(
    [
      extractFunctionBlock(settingsSafetySource, 'nowLabel'),
      extractFunctionBlock(settingsSafetySource, 'defaultSettings'),
      extractFunctionBlock(settingsSafetySource, 'defaultForm')
    ],
    'defaultForm()',
    {}
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
    ['creator.assetLibrary.creators', assetLibraryCreators],
    ['creator.assetLibrary.suppliers', assetLibrarySuppliers],
    ['creator.assetLibrary.campaigns', assetLibraryCampaigns],
    ['creator.assetLibrary.deliverables', assetLibraryDeliverables],
    ['creator.assetLibrary.assets', assetLibraryAssets],
    ['creator.liveStudio.products', liveStudioProducts],
    ['creator.liveStudio.cohosts', liveStudioCohosts],
    ['creator.liveStudio.attachments', liveStudioAttachments],
    ['creator.liveStudio.scenes', liveStudioScenes],
    ['creator.liveStudio.runOfShow', liveStudioRunOfShow],
    ['creator.liveStudio.scriptCues', liveStudioScriptCues],
    ['creator.liveStudio.commerceGoal', liveStudioCommerceGoal],
    ['creator.liveStudio.salesEvents', liveStudioSalesEvents],
    ['creator.liveStudio.qaItems', liveStudioQaItems],
    ['creator.liveStudio.viewers', liveStudioViewers],
    ['creator.liveStudio.aiPrompts', liveStudioAiPrompts],
    ['creator.liveStudio.chatMessages', liveStudioChatMessages],
    ['creator.audienceNotifications.config', audienceNotificationsConfig],
    ['creator.audienceNotifications.templatePacks', audienceNotificationsTemplatePacks],
    ['creator.audienceNotifications.channels', audienceNotificationsChannels],
    ['creator.audienceNotifications.reminders', audienceNotificationsReminders],
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
    ['creator.safetyModeration.session', safetyModerationSession],
    ['creator.safetyModeration.destinations', safetyModerationDestinations],
    ['creator.safetyModeration.messages', safetyModerationMessages],
    ['creator.safetyModeration.keywordRules', safetyModerationKeywordRules],
    ['creator.safetyModeration.controls', safetyModerationControls],
    ['creator.streamPlatforms.profile', streamProfile],
    ['creator.streamPlatforms.destinations', streamDestinations],
    ['creator.awaitingAdminApprovalPremium.onboarding', awaitingAdminApprovalOnboarding],
    ['creator.awaitingAdminApprovalPremium.review', awaitingAdminApprovalReview],
    ['creator.reviews.records', reviewRecords],
    ['creator.onboardingWizard.form', onboardingWizardForm],
    ['creator.onboardingWizard.stepIndex', 0],
    ['creator.roles.records', roleRecords],
    ['creator.roles.members', roleMembers],
    ['creator.roles.invites', roleInvites],
    ['creator.roles.audit', roleAudit],
    ['creator.roles.activeRole', 'owner'],
    ['creator.liveBuilder.suppliers', liveBuilderSuppliers],
    ['creator.liveBuilder.campaigns', liveBuilderCampaigns],
    ['creator.liveBuilder.hosts', liveBuilderHosts],
    ['creator.liveBuilder.assets', liveBuilderAssets],
    ['creator.liveBuilder.catalog', liveBuilderCatalog],
    ['creator.subscription.plan', 'basic'],
    ['creator.subscription.cycle', 'monthly']
  ];

  for (const [key, payload] of modules) {
    await upsertGlobalModule('creatorfront', key, payload);
  }

  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_onboarding_v2_4',
    JSON.stringify(onboardingDefaultForm)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_onboarding_v2_3',
    JSON.stringify(onboardingDefaultForm)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_settings_safety_v1',
    JSON.stringify(settingsDefaultForm)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_subscription_plan_v1',
    'basic'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_subscription_cycle_v1',
    'monthly'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'evzone_payout_method',
    'bank'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'evzone_payout_details',
    'Standard Chartered **** 6789'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz:roles:v1',
    JSON.stringify(roleRecords)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'userRole',
    'owner'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz:liveSessionReviews:v1',
    JSON.stringify(reviewRecords)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creatorOnb.name',
    String(onboardingWizardForm.name || 'Ronald Isabirye')
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creatorOnb.id',
    String(onboardingWizardForm.handle || '@ronald.creates')
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creatorOnb.niche',
    Array.isArray(onboardingWizardForm.categories)
      ? onboardingWizardForm.categories.join(', ')
      : 'Beauty & Skincare, Tech & Gadgets'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creatorOnb.status',
    'Submitted'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'signup.role',
    'creator'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_id',
    'CR-20418'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_name',
    'Amina Kato'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creator.id',
    'CR-20418'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creator.name',
    'Amina Kato'
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'creator_live_draft',
    JSON.stringify(liveBuilderDraftPayload)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz:liveBuilder:draft:v1',
    JSON.stringify(liveBuilderDraftPayload)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'session',
    'creator_live_draft',
    JSON.stringify(liveBuilderDraftPayload)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'session',
    'mldz:liveBuilder:draft:v1',
    JSON.stringify(liveBuilderDraftPayload)
  );
  await upsertGlobalStorageEntry(
    'creatorfront',
    'local',
    'mldz_creator_approval_status',
    String(awaitingAdminApprovalReview.status)
  );

  console.log(
    [
      'Seeded creator feature mocks:',
      `contracts=${contracts.length}`,
      `notifications=${notifications.length}`,
      'promo=1',
      `proposalMessages=${proposalMessages.length}`,
      `awaitingApproval=${awaitingApproval.length}`,
      `assetLibraryAssets=${Array.isArray(assetLibraryAssets) ? assetLibraryAssets.length : 0}`,
      `audienceTemplatePacks=${Array.isArray(audienceNotificationsTemplatePacks) ? audienceNotificationsTemplatePacks.length : 0}`,
      `linkHubItems=${Array.isArray(linkHubItems) ? linkHubItems.length : 0}`,
      `liveAlertsChannels=${Array.isArray(liveAlertsChannels) ? liveAlertsChannels.length : 0}`,
      `liveStudioMessages=${Array.isArray(liveStudioChatMessages) ? liveStudioChatMessages.length : 0}`,
      `reviews=${Array.isArray(reviewRecords) ? reviewRecords.length : 0}`,
      `postLiveClips=${Array.isArray(postLiveClips) ? postLiveClips.length : 0}`,
      `roles=${Array.isArray(roleRecords) ? roleRecords.length : 0}`,
      `safetyMessages=${Array.isArray(safetyModerationMessages) ? safetyModerationMessages.length : 0}`,
      `streamDestinations=${Array.isArray(streamDestinations) ? streamDestinations.length : 0}`,
      `liveBuilderCatalog=${Array.isArray(liveBuilderCatalog) ? liveBuilderCatalog.length : 0}`,
      `onboardingStorageKeys=22`
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
