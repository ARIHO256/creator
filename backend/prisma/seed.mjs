import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildSeedData } from '../src/legacy/seed/buildSeedData.js';

const prisma = new PrismaClient();

function toTier(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'GOLD') return 'GOLD';
  if (normalized === 'SILVER') return 'SILVER';
  return 'BRONZE';
}

function toApprovalStatus(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'AWAITING_APPROVAL' || normalized === 'UNDERREVIEW' || normalized === 'UNDER_REVIEW') {
    return 'AWAITING_APPROVAL';
  }
  return 'NEEDS_ONBOARDING';
}

function toOpportunityStatus(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'open') return 'OPEN';
  if (normalized === 'invite_only' || normalized === 'invite-only') return 'INVITE_ONLY';
  return 'CLOSED';
}

function toDealStatus(value) {
  const normalized = String(value || '').toLowerCase();
  if (['active', 'live', 'running'].includes(normalized)) return 'ACTIVE';
  if (['completed', 'done', 'closed'].includes(normalized)) return 'COMPLETED';
  if (['paused', 'on_hold', 'on-hold'].includes(normalized)) return 'PAUSED';
  if (['archived'].includes(normalized)) return 'ARCHIVED';
  return 'DRAFT';
}

function toListingStatus(value) {
  const normalized = String(value || '').toLowerCase();
  if (['active', 'live', 'scheduled', 'pending_approval', 'pending-approval'].includes(normalized)) return 'ACTIVE';
  if (['paused', 'on_hold', 'on-hold'].includes(normalized)) return 'PAUSED';
  return 'ARCHIVED';
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildReviewDashboardPayload(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return { score: 0, trends: [] };

  const avgScore =
    reviews.reduce((sum, review) => sum + Number(review.score || review.overallRating || 0), 0) / reviews.length;

  const trends = reviews.map((review) => ({
    id: review.id,
    sessionId: review.sessionId,
    score: Number(review.score || review.overallRating || 0),
    createdAt: review.createdAt
  }));

  return {
    score: Math.round(avgScore * 10) / 10,
    trends
  };
}

async function main() {
  const seed = buildSeedData();
  const seedUser = seed.users?.[0];
  const seedProfile = seed.creatorProfiles?.[0];
  const onboardingProfile = seed.onboardingWorkflows?.[0]?.form?.profile ?? {};

  if (!seedUser || !seedProfile) {
    throw new Error('Seed data missing required user/profile records.');
  }

  await prisma.mediaAsset.deleteMany();
  await prisma.appRecord.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const creator = await prisma.user.create({
    data: {
      id: seedUser.id,
      email: seedUser.email ?? 'creator@mylivedealz.com',
      phone: onboardingProfile.phone ?? null,
      passwordHash,
      role: 'CREATOR',
      approvalStatus: toApprovalStatus(seedUser.approvalStatus),
      onboardingCompleted: Boolean(seedUser.onboardingCompleted),
      creatorProfile: {
        create: {
          id: seedProfile.id,
          name: seedProfile.name,
          handle: seedProfile.handle,
          tier: toTier(seedProfile.tier),
          tagline: seedProfile.tagline ?? null,
          bio: seedProfile.bio ?? null,
          categories: JSON.stringify(seedProfile.categories ?? []),
          regions: JSON.stringify(seedProfile.regions ?? []),
          languages: JSON.stringify(seedProfile.languages ?? []),
          followers: Number(seedProfile.followers ?? 0),
          rating: Number(seedProfile.rating ?? 0),
          totalSalesDriven: Number(seedProfile.totalSalesDriven ?? 0),
          isKycVerified: Boolean(seedProfile.isKycVerified)
        }
      }
    }
  });

  const sellerRows = (seed.sellers || []).map((seller) => ({
    id: seller.id,
    name: seller.name,
    type: seller.type || 'Seller',
    category: Array.isArray(seller.categories) && seller.categories[0] ? seller.categories[0] : seller.category || null,
    region: seller.region || null,
    rating: Number(seller.rating || 0),
    isVerified: Number(seller.rating || 0) >= 4.7
  }));

  if (sellerRows.length) {
    await prisma.seller.createMany({ data: sellerRows });
  }

  const validSellerIds = new Set(sellerRows.map((seller) => seller.id));
  const opportunityRows = (seed.opportunities || [])
    .filter((opportunity) => validSellerIds.has(opportunity.sellerId))
    .map((opportunity) => ({
      id: opportunity.id,
      sellerId: opportunity.sellerId,
      title: opportunity.title,
      description: opportunity.summary || opportunity.description || null,
      payBand: opportunity.payBand || null,
      status: toOpportunityStatus(opportunity.status)
    }));

  if (opportunityRows.length) {
    await prisma.opportunity.createMany({ data: opportunityRows });
  }

  const contractByCampaignId = new Map(
    (seed.contracts || []).map((contract) => [contract.campaignId, contract])
  );
  const sellerById = new Map((seed.sellers || []).map((seller) => [seller.id, seller]));

  const campaignDeals = (seed.campaigns || []).map((campaign) => {
    const contract = contractByCampaignId.get(campaign.id);
    const seller = sellerById.get(campaign.sellerId);
    return {
      id: campaign.id,
      userId: creator.id,
      title: campaign.title,
      description: [campaign.type, campaign.note].filter(Boolean).join(' - ') || null,
      category: Array.isArray(seller?.categories) && seller.categories[0] ? seller.categories[0] : seller?.category || null,
      price: asNumber(campaign.value),
      currency: 'USD',
      status: toDealStatus(campaign.status),
      startAt: toDate(contract?.startDate),
      endAt: toDate(contract?.endDate)
    };
  });

  const adzDeals = (seed.adzCampaigns || []).map((campaign) => ({
    id: `deal_${campaign.id}`,
    userId: creator.id,
    title: campaign.campaignName,
    description: campaign.campaignSubtitle || null,
    category: campaign.supplier?.category || null,
    price: asNumber(campaign.offers?.[0]?.price),
    currency: campaign.compensation?.currency || 'USD',
    status: toDealStatus(campaign.status),
    startAt: toDate(campaign.startISO),
    endAt: toDate(campaign.endISO)
  }));

  const dealRows = [...campaignDeals, ...adzDeals];
  if (dealRows.length) {
    await prisma.deal.createMany({ data: dealRows });
  }

  const dealIds = new Set(dealRows.map((deal) => deal.id));
  const adzById = new Map((seed.adzCampaigns || []).map((campaign) => [campaign.id, campaign]));
  const marketplaceRows = (seed.links || []).map((link) => {
    const campaignId = link.campaign?.id;
    const mappedDealId =
      campaignId && dealIds.has(campaignId)
        ? campaignId
        : campaignId && dealIds.has(`deal_${campaignId}`)
          ? `deal_${campaignId}`
          : null;

    const adz = campaignId ? adzById.get(campaignId) : null;
    const inferredPrice = asNumber(adz?.offers?.[0]?.price);
    return {
      id: link.id,
      userId: creator.id,
      dealId: mappedDealId,
      title: link.title,
      description: [link.subtitle, link.note].filter(Boolean).join(' - ') || null,
      price: inferredPrice,
      currency: link.metrics?.currency || 'USD',
      status: toListingStatus(link.status)
    };
  });

  if (marketplaceRows.length) {
    await prisma.marketplaceListing.createMany({ data: marketplaceRows });
  }

  const analyticsRows = [];
  for (const campaign of seed.analytics?.campaigns || []) {
    analyticsRows.push({
      userId: creator.id,
      eventType: 'IMPRESSION',
      value: Math.max(0, Math.round(Number(campaign.engagements || 0))),
      meta: JSON.stringify({ source: 'campaign', id: campaign.id, name: campaign.name, seller: campaign.seller })
    });
    analyticsRows.push({
      userId: creator.id,
      eventType: 'PURCHASE',
      value: Math.max(0, Math.round(Number(campaign.sales || 0))),
      meta: JSON.stringify({ source: 'campaign', id: campaign.id, name: campaign.name, seller: campaign.seller })
    });
  }
  for (const link of seed.links || []) {
    analyticsRows.push({
      userId: creator.id,
      eventType: 'CLICK',
      value: Math.max(0, Math.round(Number(link.metrics?.clicks || 0))),
      meta: JSON.stringify({ source: 'link', id: link.id, title: link.title })
    });
    analyticsRows.push({
      userId: creator.id,
      eventType: 'PURCHASE',
      value: Math.max(0, Math.round(Number(link.metrics?.purchases || 0))),
      meta: JSON.stringify({ source: 'link', id: link.id, title: link.title })
    });
  }
  for (const replay of seed.replays || []) {
    analyticsRows.push({
      userId: creator.id,
      eventType: 'VIEW',
      value: Math.max(0, Math.round(Number(replay.views || 0))),
      meta: JSON.stringify({ source: 'replay', id: replay.id, sessionId: replay.sessionId })
    });
  }

  if (analyticsRows.length) {
    await prisma.analyticsEvent.createMany({ data: analyticsRows });
  }

  const mediaRows = [];
  for (const asset of seed.assets || []) {
    mediaRows.push({
      id: `media_${asset.id}`,
      userId: creator.id,
      name: asset.title || asset.id,
      kind: asset.mediaType || 'file',
      url: asset.previewUrl || null
    });
  }
  for (const upload of seed.uploads || []) {
    mediaRows.push({
      id: `media_${upload.id}`,
      userId: creator.id,
      name: upload.name || upload.fileName || upload.id,
      kind: upload.kind || 'file',
      url: upload.url || null
    });
  }
  for (const replay of seed.replays || []) {
    mediaRows.push({
      id: `media_cover_${replay.id}`,
      userId: creator.id,
      name: `${replay.title} cover`,
      kind: 'image',
      url: replay.coverUrl || null
    });
  }
  for (const campaign of seed.adzCampaigns || []) {
    if (campaign.heroImageUrl) {
      mediaRows.push({
        id: `media_hero_${campaign.id}`,
        userId: creator.id,
        name: `${campaign.campaignName} hero`,
        kind: 'image',
        url: campaign.heroImageUrl
      });
    }
  }

  if (mediaRows.length) {
    await prisma.mediaAsset.createMany({ data: mediaRows });
  }

  const appRecordRows = [];
  const pushRecord = (domain, entityType, entityId, payload, userId = creator.id) => {
    appRecordRows.push({ userId, domain, entityType, entityId, payload });
  };

  pushRecord(
    'dashboard',
    'bootstrap',
    'default',
    {
      featureFlags: {
        liveStudio: true,
        adzBuilder: true,
        creatorTools: true
      },
      navBadges: {
        notifications: (seed.notifications || []).filter((notification) => !notification.read).length
      }
    }
  );
  pushRecord(
    'dashboard',
    'feed',
    'home',
    {
      hero: {
        title: `Welcome back, ${seedProfile.name}`,
        subtitle: seedProfile.tagline
      },
      quickStats: [
        { label: 'Active campaigns', value: (seed.campaigns || []).filter((campaign) => campaign.status === 'active').length },
        { label: 'Open opportunities', value: (seed.opportunities || []).filter((opportunity) => toOpportunityStatus(opportunity.status) === 'OPEN').length },
        { label: 'Pending invites', value: (seed.invites || []).filter((invite) => String(invite.status || '').toLowerCase() === 'pending').length }
      ]
    }
  );
  pushRecord(
    'dashboard',
    'my_day',
    'today',
    {
      agenda: (seed.liveSessions || []).slice(0, 4).map((session) => ({
        id: session.id,
        title: session.title,
        startsAt: session.startISO,
        status: session.status
      })),
      tasks: (seed.tasks || []).slice(0, 6)
    }
  );
  pushRecord(
    'dashboard',
    'landing',
    'public',
    { title: 'MyLiveDealz Creator', subtitle: 'Run live shopping, pitches, and payouts' },
    null
  );

  for (const sellerId of seedProfile.followingSellerIds || []) {
    pushRecord('discovery', 'followed_seller', sellerId, { sellerId, followedAt: seed.meta?.seededAt || new Date().toISOString() });
  }
  for (const opportunityId of seedProfile.savedOpportunityIds || []) {
    pushRecord('discovery', 'saved_opportunity', opportunityId, { opportunityId, savedAt: seed.meta?.seededAt || new Date().toISOString() });
  }
  for (const invite of seed.invites || []) {
    pushRecord('discovery', 'invite', invite.id, invite);
  }
  for (const campaign of seed.campaigns || []) {
    pushRecord('discovery', 'campaign_board', campaign.id, campaign);
  }
  for (const link of seed.links || []) {
    pushRecord('discovery', 'dealz_marketplace', link.id, link);
  }

  for (const campaign of seed.campaigns || []) pushRecord('collaboration', 'campaign', campaign.id, campaign);
  for (const proposal of seed.proposals || []) pushRecord('collaboration', 'proposal', proposal.id, proposal);
  for (const contract of seed.contracts || []) pushRecord('collaboration', 'contract', contract.id, contract);
  for (const task of seed.tasks || []) pushRecord('collaboration', 'task', task.id, task);
  for (const asset of seed.assets || []) pushRecord('collaboration', 'asset', asset.id, asset);

  for (const session of seed.liveSessions || []) {
    pushRecord('live', 'session', session.id, session);
    pushRecord('live', 'studio', session.id, {
      mode: 'builder',
      sessionId: session.id,
      status: session.status,
      scenes: session.scenes || [],
      moments: []
    });
  }
  for (const replay of seed.replays || []) pushRecord('live', 'replay', replay.sessionId || replay.id, replay);
  for (const giveaway of seed.campaignGiveaways || []) {
    const campaignId = giveaway.campaignId || giveaway.id || `giveaway_${Math.random().toString(36).slice(2, 8)}`;
    pushRecord('live', 'campaign_giveaway', campaignId, giveaway);
  }
  const toolKeyToEntityId = {
    audienceNotifications: 'audience-notifications',
    liveAlerts: 'live-alerts',
    overlays: 'overlays',
    postLive: 'post-live',
    streaming: 'streaming',
    safety: 'safety'
  };
  for (const [key, payload] of Object.entries(seed.toolConfigs || {})) {
    const entityId = toolKeyToEntityId[key] || key;
    pushRecord('live', 'tool_config', entityId, payload);
  }

  for (const campaign of seed.adzCampaigns || []) {
    pushRecord('adz', 'campaign', campaign.id, campaign);
    pushRecord('adz', 'performance', campaign.id, campaign.performance || { clicks: 0, purchases: 0, earnings: 0 });
    pushRecord('adz', 'marketplace', campaign.id, {
      id: campaign.id,
      title: campaign.campaignName,
      subtitle: campaign.campaignSubtitle,
      supplier: campaign.supplier,
      status: campaign.status
    });
  }
  for (const link of seed.links || []) pushRecord('adz', 'link', link.id, link);
  if ((seed.adzCampaigns || []).length) {
    const firstAdz = seed.adzCampaigns[0];
    pushRecord('adz', 'promo_ad', firstAdz.id, firstAdz);
  }

  pushRecord('finance', 'earnings_summary', 'main', seed.earnings?.summary || { available: 0, pending: 0, lifetime: 0 });
  for (const payout of seed.payouts || []) pushRecord('finance', 'payout', payout.id, payout);
  pushRecord(
    'finance',
    'analytics_overview',
    'main',
    {
      rank: seed.analytics?.rank?.currentTier || 'Bronze',
      score: Number(seed.analytics?.rank?.progressPercent || 0),
      benchmarks: seed.analytics?.benchmarks || {}
    }
  );
  pushRecord('finance', 'subscription', 'main', seed.subscription || { plan: 'basic', cycle: 'monthly' });

  pushRecord('settings', 'profile', 'main', seed.settings || {});
  for (const notification of seed.notifications || []) pushRecord('settings', 'notification', notification.id, notification);
  for (const role of seed.roles || []) pushRecord('settings', 'role', role.id, role);
  for (const member of seed.members || []) {
    pushRecord('settings', 'member', member.id, member);
    if (String(member.status || '').toLowerCase() === 'invited') {
      pushRecord('settings', 'role_invite', `invite_${member.id}`, member);
    }
  }
  for (const device of seed.settings?.settings?.devices || []) pushRecord('settings', 'device', device.id, device);
  pushRecord('settings', 'roles_security', 'main', seed.workspaceSecurity || {});
  for (const session of seed.crew?.sessions || []) pushRecord('settings', 'crew_session', session.sessionId, session);
  for (const log of seed.auditLogs || []) pushRecord('settings', 'audit_log', log.id, log);
  pushRecord('settings', 'payout_verification', 'main', seed.settings?.payout?.verification || { verified: false });

  for (const upload of seed.uploads || []) pushRecord('workflow', 'upload', upload.id, upload);
  pushRecord('workflow', 'onboarding', 'main', seed.onboardingWorkflows?.[0] || { status: 'draft' });
  pushRecord('workflow', 'account_approval', 'main', seed.accountApprovals?.[0] || { status: 'pending' });
  for (const submission of seed.contentApprovals || []) pushRecord('workflow', 'content_approval', submission.id, submission);

  pushRecord('reviews', 'dashboard', 'main', buildReviewDashboardPayload(seed.reviews || []));
  for (const review of seed.reviews || []) pushRecord('reviews', 'live_review', review.id, review);

  // Persist the entire frontend/backoffice mock seed 1:1 for full data parity and direct SQL access.
  // This keeps every top-level section from buildSeedData available in MySQL.
  pushRecord('frontend_seed', 'snapshot', 'buildSeedData', seed);
  for (const [section, payload] of Object.entries(seed)) {
    pushRecord('frontend_seed', 'section', section, payload);
  }

  if (appRecordRows.length) {
    await prisma.appRecord.createMany({ data: appRecordRows });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete. Login: creator@mylivedealz.com / Password123!');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
