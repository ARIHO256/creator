import { useEffect, useReducer } from "react";
import type {
  CollaborationCampaignRecord,
  ContractRecord,
  CreatorNotification,
  InviteRecord,
  OpportunityRecord,
  ProposalRecord,
  PublicSellerRecord,
  ReviewRecord
} from "../lib/creatorApi";
import { creatorApi } from "../lib/creatorApi";
import type { PageId } from "../layouts/CreatorShellLayout";

type BadgeCounts = Partial<Record<PageId, number>>;

const POLL_INTERVAL_MS = 60_000;
const SOFT_TTL_MS = 15_000;

let badgeCounts: BadgeCounts = {};
let lastSyncAt = 0;
let syncPromise: Promise<BadgeCounts> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUnread(notification: CreatorNotification) {
  return !notification.read && !notification.readAt;
}

function notificationText(notification: CreatorNotification) {
  return `${notification.type || ""} ${notification.kind || ""} ${notification.title || ""} ${notification.message || ""}`.toLowerCase();
}

function countUnreadNotificationsByKeywords(notifications: CreatorNotification[], keywords: string[]) {
  return notifications.filter((entry) => {
    if (!isUnread(entry)) return false;
    const text = notificationText(entry);
    return keywords.some((keyword) => text.includes(keyword));
  }).length;
}

function isOpenOpportunity(record: OpportunityRecord) {
  const status = normalizeStatus(record.status);
  if (["CLOSED", "ARCHIVED", "EXPIRED", "TERMINATED", "CANCELLED", "REJECTED"].includes(status)) {
    return false;
  }
  const collaborationStatus = normalizeStatus(record.collaborationStatus);
  if (["COLLABORATING", "ACCEPTED", "COMPLETED"].includes(collaborationStatus)) {
    return false;
  }
  return true;
}

function isActionableInvite(record: InviteRecord) {
  const status = normalizeStatus(record.status);
  return !["ACCEPTED", "DECLINED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status);
}

function isActionableProposal(record: ProposalRecord) {
  const status = normalizeStatus(record.status);
  return !["ACCEPTED", "APPROVED", "DECLINED", "REJECTED", "EXPIRED", "COMPLETED", "CANCELLED"].includes(status);
}

function isActionableContract(record: ContractRecord) {
  const status = normalizeStatus(record.status);
  return ["ACTIVE", "APPROVED", "RUNNING", "IN_PROGRESS", "PENDING", "DRAFT", "UPCOMING"].includes(status);
}

function isActionableCampaign(record: CollaborationCampaignRecord) {
  const status = normalizeStatus(record.status);
  return !["COMPLETED", "FINISHED", "TERMINATED", "CANCELLED", "REJECTED", "ARCHIVED"].includes(status);
}

function countActiveMySellers(records: PublicSellerRecord[]) {
  return records.filter((seller) => {
    const metadata = isRecord(seller.metadata) ? seller.metadata : {};
    const activeContracts = safeNumber(metadata.activeContracts);
    if (activeContracts > 0) return true;
    const relationship = normalizeStatus(metadata.relationship);
    return relationship.includes("ACTIVE");
  }).length;
}

function isReviewNeedingAction(record: ReviewRecord) {
  if (record.requiresResponse === true) return true;
  const status = normalizeStatus(record.status);
  return ["NEW", "OPEN", "PENDING", "NEEDS_RESPONSE", "UNRESOLVED"].includes(status);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function sameCounts(a: BadgeCounts, b: BadgeCounts) {
  const keys = new Set<PageId>([...Object.keys(a), ...Object.keys(b)] as PageId[]);
  for (const key of keys) {
    if (safeNumber(a[key]) !== safeNumber(b[key])) return false;
  }
  return true;
}

function clampToBadge(value: unknown) {
  const next = Math.max(0, Math.floor(safeNumber(value)));
  return next;
}

function setBadgeCounts(next: BadgeCounts) {
  if (sameCounts(badgeCounts, next)) return;
  badgeCounts = next;
  emit();
}

async function syncNavigationBadges(force = false): Promise<BadgeCounts> {
  const now = Date.now();
  if (!force && now - lastSyncAt < SOFT_TTL_MS) {
    return badgeCounts;
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const [
      opportunitiesResult,
      invitesResult,
      proposalsResult,
      contractsResult,
      campaignsResult,
      mySellersResult,
      notificationsResult,
      reviewsResult
    ] = await Promise.allSettled([
      creatorApi.opportunities(),
      creatorApi.invites(),
      creatorApi.proposals(),
      creatorApi.contracts(),
      creatorApi.campaigns(),
      creatorApi.mySellers(),
      creatorApi.notifications(),
      creatorApi.reviews({ scope: "received", limit: 250 })
    ]);

    const opportunities = opportunitiesResult.status === "fulfilled" ? opportunitiesResult.value : [];
    const invites = invitesResult.status === "fulfilled" ? invitesResult.value : [];
    const proposals = proposalsResult.status === "fulfilled" ? proposalsResult.value : [];
    const contracts = contractsResult.status === "fulfilled" ? contractsResult.value : [];
    const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];
    const mySellers = mySellersResult.status === "fulfilled" ? mySellersResult.value : [];
    const notifications = notificationsResult.status === "fulfilled" ? notificationsResult.value : [];
    const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value : [];

    const unreadSellerNotifs = countUnreadNotificationsByKeywords(notifications, ["supplier", "seller", "directory", "brand"]);
    const unreadReviewNotifs = countUnreadNotificationsByKeywords(notifications, ["review", "rating", "feedback"]);

    const opportunitiesCount = opportunities.filter(isOpenOpportunity).length;
    const invitesCount = invites.filter(isActionableInvite).length;
    const proposalsCount = proposals.filter(isActionableProposal).length;
    const contractsCount = contracts.filter(isActionableContract).length;
    const campaignsCount = campaigns.filter(isActionableCampaign).length;
    const sellersCount = unreadSellerNotifs;
    const mySellersCount = countActiveMySellers(mySellers);
    const reviewsCount = Math.max(reviews.filter(isReviewNeedingAction).length, unreadReviewNotifs);

    const nextCounts: BadgeCounts = {
      opportunities: clampToBadge(opportunitiesCount),
      sellers: clampToBadge(sellersCount),
      "my-sellers": clampToBadge(mySellersCount),
      invites: clampToBadge(invitesCount),
      "creator-campaigns": clampToBadge(campaignsCount),
      proposals: clampToBadge(proposalsCount),
      contracts: clampToBadge(contractsCount),
      reviews: clampToBadge(reviewsCount)
    };

    lastSyncAt = Date.now();
    setBadgeCounts(nextCounts);
    return nextCounts;
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

function startPolling() {
  if (typeof window === "undefined") return;
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void syncNavigationBadges(true);
  }, POLL_INTERVAL_MS);
  window.addEventListener("focus", onWindowFocus);
}

function stopPolling() {
  if (typeof window === "undefined") return;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  window.removeEventListener("focus", onWindowFocus);
}

function onWindowFocus() {
  void syncNavigationBadges(true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    startPolling();
    void syncNavigationBadges();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPolling();
    }
  };
}

export function refreshNavigationBadges(force = false) {
  return syncNavigationBadges(force);
}

export function useNavigationBadges() {
  const [, forceRender] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    return subscribe(() => forceRender());
  }, []);
}

export function getNavBadge(page: PageId): number | undefined {
  const count = badgeCounts[page];
  return count && count > 0 ? count : undefined;
}
