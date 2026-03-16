import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value) {
  return readString(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slug(value) {
  return readString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatYmd(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function formatHm(value, fallback) {
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toISOString().slice(11, 16);
}

function diffDays(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return 7;
  const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
  return diff >= 1 ? diff : 7;
}

function inferCampaignName(campaign, sellerName) {
  const title = readString(campaign.title);
  if (title && title.toLowerCase() !== 'untitled campaign') {
    return title;
  }
  return sellerName ? `${sellerName} Growth Launch` : 'Supplier Growth Launch';
}

function inferCampaignType(name) {
  const normalized = readString(name).toLowerCase();
  if (normalized.includes('live')) return 'Live Sessionz';
  if (normalized.includes('flash') || normalized.includes('deal')) return 'Live + Shoppables.';
  if (normalized.includes('launch') || normalized.includes('hub') || normalized.includes('charger')) {
    return 'Shoppable Adz';
  }
  return 'Live + Shoppables.';
}

function inferRegion(name) {
  const normalized = readString(name).toLowerCase();
  if (normalized.includes('global')) return 'Global';
  if (normalized.includes('kampala') || normalized.includes('uganda') || normalized.includes('faith')) {
    return 'East Africa';
  }
  return 'East Africa';
}

function inferPromoType(name) {
  const normalized = readString(name).toLowerCase();
  if (normalized.includes('launch')) return 'Coupon';
  if (normalized.includes('free shipping')) return 'FreeShipping';
  if (normalized.includes('gift')) return 'Gift';
  return 'Discount';
}

function inferPromoArrangement(promoType) {
  if (promoType === 'Coupon') return 'CouponCode';
  if (promoType === 'FreeShipping') return 'Threshold';
  if (promoType === 'Gift') return 'FreeGift';
  return 'PercentOff';
}

function inferCreatorUsage(campaign) {
  if (campaign.creatorId) return 'I will use a Creator';
  return 'I am NOT SURE yet';
}

function inferApprovalStatus(campaign) {
  const status = readString(campaign.status).toUpperCase();
  if (status === 'ACTIVE' || status === 'COMPLETED') return 'Approved';
  if (status === 'CANCELLED') return 'Rejected';
  return 'NotSubmitted';
}

function inferStage(campaign) {
  const status = readString(campaign.status).toUpperCase();
  if (status === 'CANCELLED') return 'Terminated';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'ACTIVE') {
    const endAt = parseDate(campaign.endAt);
    return endAt && endAt.getTime() < Date.now() ? 'Completed' : 'Execution';
  }
  return 'Draft';
}

function inferHealth(stage) {
  if (stage === 'Execution') return 'on-track';
  if (stage === 'Completed') return 'on-track';
  if (stage === 'Terminated') return 'stalled';
  return 'stalled';
}

function inferNextAction(stage, creatorUsageDecision, approvalStatus) {
  if (approvalStatus === 'Pending') return 'Await Admin approval';
  if (stage === 'Execution') {
    return creatorUsageDecision === 'I will use a Creator'
      ? 'Track creator deliverables'
      : 'Monitor campaign performance';
  }
  if (stage === 'Completed') return 'Review results and export recap';
  if (stage === 'Terminated') return 'Campaign ended';
  if (creatorUsageDecision === 'I will use a Creator') return 'Complete setup and invite creators';
  if (creatorUsageDecision === 'I am NOT SURE yet') return 'Complete setup and choose creator plan';
  return 'Complete setup';
}

function inferLastActivity(stage, approvalStatus) {
  if (approvalStatus === 'Pending') return 'Submitted for Admin approval';
  if (stage === 'Execution') return 'Campaign running in workspace';
  if (stage === 'Completed') return 'Campaign completed';
  if (stage === 'Terminated') return 'Campaign closed';
  return 'Draft saved';
}

function buildDefaultItems(campaignName, budget, currency) {
  const baseName = inferCampaignType(campaignName) === 'Shoppable Adz'
    ? `${campaignName} hero creative`
    : `${campaignName} featured offer`;
  const safeBudget = Number.isFinite(Number(budget)) ? Number(budget) : 0;
  const firstPrice = safeBudget > 0 ? Math.max(10, Math.round(safeBudget * 0.35)) : 99;
  const secondPrice = safeBudget > 0 ? Math.max(8, Math.round(safeBudget * 0.2)) : 59;

  return [
    {
      id: `item-${slug(campaignName) || 'campaign'}-1`,
      title: titleCase(baseName),
      sku: `CMP-${(slug(campaignName) || 'campaign').slice(0, 8).toUpperCase()}-1`,
      price: firstPrice,
      currency,
      quantity: 1,
    },
    {
      id: `item-${slug(campaignName) || 'campaign'}-2`,
      title: titleCase(`${campaignName} support bundle`),
      sku: `CMP-${(slug(campaignName) || 'campaign').slice(0, 8).toUpperCase()}-2`,
      price: secondPrice,
      currency,
      quantity: 1,
    },
  ];
}

function mergeCampaignMetadata(campaign, sellerName, creatorName) {
  const current = asRecord(campaign.metadata);
  const name = readString(current.name) || inferCampaignName(campaign, sellerName);
  const type = readString(current.type) || inferCampaignType(name);
  const region = readString(current.region) || inferRegion(name);
  const currency = readString(current.currency) || readString(campaign.currency) || 'USD';
  const estValue =
    Number.isFinite(Number(current.estValue)) && Number(current.estValue) > 0
      ? Number(current.estValue)
      : Number.isFinite(Number(campaign.budget))
        ? Number(campaign.budget)
        : 1000;
  const creatorUsageDecision = readString(current.creatorUsageDecision) || inferCreatorUsage(campaign);
  const approvalStatus = readString(current.approvalStatus) || inferApprovalStatus(campaign);
  const stage = readString(current.stage) || inferStage(campaign);
  const promoType = readString(current.promoType) || inferPromoType(name);
  const promoArrangement = readString(current.promoArrangement) || inferPromoArrangement(promoType);
  const collabMode =
    readString(current.collabMode) ||
    (creatorUsageDecision === 'I will use a Creator' ? 'Open for Collabs' : 'Supplier-led');
  const approvalMode =
    readString(current.approvalMode) ||
    (creatorUsageDecision === 'I will use a Creator' ? 'Manual' : 'Auto');
  const nextAction = readString(current.nextAction) || inferNextAction(stage, creatorUsageDecision, approvalStatus);
  const lastActivity = readString(current.lastActivity) || inferLastActivity(stage, approvalStatus);
  const items = Array.isArray(current.items) && current.items.length
    ? current.items
    : buildDefaultItems(name, estValue, currency);
  const startDate = readString(current.startDate) || formatYmd(campaign.startAt);
  const endDate = readString(current.endDate) || formatYmd(campaign.endAt);
  const durationDays =
    Number.isFinite(Number(current.durationDays)) && Number(current.durationDays) > 0
      ? Number(current.durationDays)
      : diffDays(campaign.startAt, campaign.endAt);
  const startTime = readString(current.startTime) || formatHm(campaign.startAt, '09:00');
  const endTime = readString(current.endTime) || formatHm(campaign.endAt, '21:00');
  const internalReference = readString(current.internalReference) || `CMP-${String(campaign.id).slice(-6).toUpperCase()}`;
  const promoCode =
    readString(current.promoCode) ||
    (promoType === 'Coupon' ? `${slug(name).replace(/-/g, '').slice(0, 10).toUpperCase()}10` : '');

  return {
    ...current,
    id: readString(current.id) || String(campaign.id),
    name,
    type,
    region,
    currency,
    estValue,
    internalReference,
    commerceMode: readString(current.commerceMode) || 'Retail',
    bundleMode: readString(current.bundleMode) || 'Single item',
    startDate,
    durationDays,
    startTime,
    endDate,
    endTime,
    timezone: readString(current.timezone) || 'Africa/Kampala',
    flashWindows: readString(current.flashWindows) || '',
    marketRegions: Array.isArray(current.marketRegions) && current.marketRegions.length ? current.marketRegions : [region],
    shippingConstraints:
      Array.isArray(current.shippingConstraints) && current.shippingConstraints.length
        ? current.shippingConstraints
        : [],
    contentLanguages:
      Array.isArray(current.contentLanguages) && current.contentLanguages.length
        ? current.contentLanguages
        : ['English'],
    promoType,
    promoArrangement,
    promoCode,
    shippingThreshold:
      Number.isFinite(Number(current.shippingThreshold)) && Number(current.shippingThreshold) >= 0
        ? Number(current.shippingThreshold)
        : 0,
    giftNote: readString(current.giftNote) || '',
    offerScope: readString(current.offerScope) || 'Products',
    defaultDiscountMode: readString(current.defaultDiscountMode) || 'percent',
    defaultDiscountValue:
      Number.isFinite(Number(current.defaultDiscountValue)) && Number(current.defaultDiscountValue) > 0
        ? Number(current.defaultDiscountValue)
        : 10,
    items,
    hasGiveaways: Boolean(current.hasGiveaways),
    giveaways: Array.isArray(current.giveaways) ? current.giveaways : [],
    regulatedDocsConfirmed: current.regulatedDocsConfirmed === true,
    regulatedDisclaimersAccepted: current.regulatedDisclaimersAccepted === true,
    regulatedDeskNotes: readString(current.regulatedDeskNotes) || '',
    creatorUsageDecision,
    collabMode,
    approvalMode,
    allowMultiCreators: current.allowMultiCreators !== false,
    notes:
      readString(current.notes) ||
      `Backfilled workspace details for ${name}${creatorName ? ` with ${creatorName}` : ''}.`,
    internalOwner: readString(current.internalOwner) || sellerName || 'Supplier Manager',
    approvalStatus,
    pendingAdminApproval:
      typeof current.pendingAdminApproval === 'boolean'
        ? current.pendingAdminApproval
        : approvalStatus === 'Pending',
    pendingSupplierApproval:
      typeof current.pendingSupplierApproval === 'boolean' ? current.pendingSupplierApproval : false,
    stage,
    nextAction,
    lastActivity,
    lastActivityAt:
      Number.isFinite(Number(current.lastActivityAt)) && Number(current.lastActivityAt) > 0
        ? Number(current.lastActivityAt)
        : parseDate(campaign.updatedAt)?.getTime() ?? Date.now(),
    health: readString(current.health) || inferHealth(stage),
    creatorsCount:
      Number.isFinite(Number(current.creatorsCount))
        ? Number(current.creatorsCount)
        : creatorUsageDecision === 'I will use a Creator'
          ? 1
          : 0,
    proposalsCount: Number.isFinite(Number(current.proposalsCount)) ? Number(current.proposalsCount) : 0,
    pitchesCount: Number.isFinite(Number(current.pitchesCount)) ? Number(current.pitchesCount) : 0,
    contractCount: Number.isFinite(Number(current.contractCount)) ? Number(current.contractCount) : 0,
    invitesSent: Number.isFinite(Number(current.invitesSent)) ? Number(current.invitesSent) : 0,
    invitesAccepted: Number.isFinite(Number(current.invitesAccepted)) ? Number(current.invitesAccepted) : 0,
    renegotiation: current.renegotiation === true,
    adminRejected: current.adminRejected === true,
    creatorRejected: current.creatorRejected === true,
    queuedStageAfterApproval: readString(current.queuedStageAfterApproval) || (stage === 'Draft' ? 'Collabs' : ''),
    queuedNextActionAfterApproval:
      readString(current.queuedNextActionAfterApproval) ||
      (creatorUsageDecision === 'I will use a Creator'
        ? 'Open creator sourcing and briefs'
        : 'Prepare launch assets'),
    submissionSnapshot:
      current.submissionSnapshot && typeof current.submissionSnapshot === 'object'
        ? current.submissionSnapshot
        : {
            builderStep: 1,
            builder: {
              campaignId: String(campaign.id),
              name,
              type,
              region,
              currency,
              estValue,
              startDate,
              endDate,
              durationDays,
              promoType,
              promoArrangement,
              creatorUsageDecision,
            },
          },
  };
}

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      seller: true,
      creator: {
        include: {
          creatorProfile: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  let updated = 0;

  for (const campaign of campaigns) {
    const current = asRecord(campaign.metadata);
    const needsBackfill = [
      current.name,
      current.type,
      current.region,
      current.stage,
      current.approvalStatus,
      current.creatorUsageDecision,
      current.nextAction,
    ].some((value) => !readString(value));

    if (!needsBackfill) {
      continue;
    }

    const sellerName = readString(campaign.seller?.displayName) || readString(campaign.seller?.name) || 'Supplier Manager';
    const creatorName =
      readString(campaign.creator?.creatorProfile?.name) ||
      readString(campaign.creator?.creatorProfile?.handle) ||
      readString(campaign.creator?.email);
    const nextMetadata = mergeCampaignMetadata(campaign, sellerName, creatorName);
    const nextTitle =
      readString(campaign.title).toLowerCase() === 'untitled campaign' || !readString(campaign.title)
        ? nextMetadata.name
        : campaign.title;
    const nextDescription =
      readString(campaign.description) ||
      `${nextMetadata.type} campaign for ${nextMetadata.region} with ${Array.isArray(nextMetadata.items) ? nextMetadata.items.length : 0} planned item(s).`;
    const nextStartAt = parseDate(campaign.startAt) || parseDate(`${nextMetadata.startDate}T09:00:00.000Z`) || new Date();
    const nextEndAt =
      parseDate(campaign.endAt) ||
      parseDate(`${nextMetadata.endDate}T21:00:00.000Z`) ||
      new Date(nextStartAt.getTime() + nextMetadata.durationDays * 86400000);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        title: nextTitle,
        description: nextDescription,
        budget: Number.isFinite(Number(campaign.budget)) ? campaign.budget : nextMetadata.estValue,
        currency: readString(campaign.currency) || nextMetadata.currency,
        startAt: nextStartAt,
        endAt: nextEndAt,
        metadata: nextMetadata,
      },
    });

    updated += 1;
  }

  console.log(`Backfilled workspace metadata for ${updated} campaign(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
