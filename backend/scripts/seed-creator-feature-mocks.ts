import path from 'path';
import { PrismaClient, type Prisma } from '@prisma/client';

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
    ['creator.awaitingApproval.submissions', awaitingApproval]
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
      `awaitingApproval=${awaitingApproval.length}`
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
