import { ok } from "../lib/http.js";
import { ensure, nowIso, slugify } from "../lib/utils.js";

const ALLOWED_TRANSACTION_INTENTS = new Set([
  "bought",
  "added_to_cart",
  "booked",
  "requested_quote",
  "just_watched"
]);

function resolveWorkspaceAccess(db, auth) {
  const normalizedEmail = String(auth?.user?.email || "").trim().toLowerCase();
  const currentMember = db.members.find((member) => String(member.email || "").trim().toLowerCase() === normalizedEmail) || null;
  const currentRole = currentMember ? db.roles.find((role) => role.id === currentMember.roleId) || null : null;
  return {
    currentMember,
    currentRole,
    effectivePermissions: currentRole?.perms || {}
  };
}

function canViewReviews(access) {
  return Boolean(access.currentMember && access.effectivePermissions["reviews.view"]);
}

function canViewWorkspaceReviews(access) {
  return Boolean(
    access.currentMember &&
      (
        String(access.currentMember.seat || "").toLowerCase() === "owner" ||
        access.effectivePermissions["admin.manage_team"] ||
        access.effectivePermissions["roles.manage"] ||
        access.effectivePermissions["admin.manage_roles"]
      )
  );
}

function toHandle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "@creator";
  if (raw.startsWith("@")) return raw;
  const normalized = slugify(raw).replace(/-/g, "");
  return `@${normalized || "creator"}`;
}

function normalizeCategoryRatings(overall, categoryRatings = {}, dimension = "") {
  const base = Number(overall || 0);
  const normalized = {
    presentation: Number(categoryRatings.presentation ?? base),
    helpfulness: Number(categoryRatings.helpfulness ?? base),
    productKnowledge: Number(categoryRatings.productKnowledge ?? base),
    interaction: Number(categoryRatings.interaction ?? base),
    trust: Number(categoryRatings.trust ?? base)
  };

  const token = String(dimension || "").trim().toLowerCase();
  if (token.includes("presentation")) normalized.presentation = base || normalized.presentation;
  if (token.includes("help")) normalized.helpfulness = base || normalized.helpfulness;
  if (token.includes("knowledge") || token.includes("product")) normalized.productKnowledge = base || normalized.productKnowledge;
  if (token.includes("interaction") || token.includes("audience")) normalized.interaction = base || normalized.interaction;
  if (token.includes("trust") || token.includes("clarity")) normalized.trust = base || normalized.trust;

  return normalized;
}

function normalizeReviewRecord(db, review, index) {
  const profile = db.creatorProfiles.find((entry) => entry.userId === review.userId) || null;
  const creatorName = String(review.creatorName || profile?.name || "Creator");
  const creatorId = String(review.creatorId || profile?.id || `creator_${index + 1}`);
  const creatorHandle = String(review.creatorHandle || (profile?.handle ? `@${profile.handle}` : toHandle(creatorName)));
  const overallRating = Number(review.overallRating ?? review.score ?? 0);
  const session = db.liveSessions.find((entry) => entry.id === review.sessionId) || null;
  const createdAt = String(review.createdAt || review.endedAt || session?.scheduledFor || nowIso());
  const endedAt = String(review.endedAt || session?.scheduledFor || createdAt);
  const transactionIntent = ALLOWED_TRANSACTION_INTENTS.has(String(review.transactionIntent || "")) ? String(review.transactionIntent) : null;
  const note = String(review.note || review.reviewText || "").trim();
  const dimension = String(review.dimension || "Overall experience");

  return {
    id: String(review.id || `review_${index + 1}`),
    userId: String(review.userId || profile?.userId || db.creatorProfiles[0]?.userId || ""),
    creatorId,
    creatorName,
    creatorHandle,
    memberId: review.memberId ? String(review.memberId) : undefined,
    sessionId: String(review.sessionId || session?.id || `session_${index + 1}`),
    sessionTitle: String(review.sessionTitle || session?.title || "Live session"),
    endedAt,
    overallRating,
    categoryRatings: normalizeCategoryRatings(overallRating, review.categoryRatings || {}, dimension),
    quickTags: Array.isArray(review.quickTags) ? review.quickTags.map((tag) => String(tag)) : [],
    issueTags: Array.isArray(review.issueTags) ? review.issueTags.map((tag) => String(tag)) : [],
    reviewText: String(review.reviewText || note),
    note,
    dimension,
    score: Number(review.score ?? overallRating),
    wouldJoinAgain: review.wouldJoinAgain === true || review.wouldJoinAgain === false ? review.wouldJoinAgain : null,
    transactionIntent,
    publicReview: Boolean(review.publicReview ?? true),
    anonymous: Boolean(review.anonymous),
    createdAt
  };
}

function avg(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function reviewMatchesSearch(review, searchTerm) {
  if (!searchTerm) return true;
  const needle = String(searchTerm).trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    review.creatorName,
    review.creatorHandle,
    review.sessionTitle,
    review.reviewText,
    review.note,
    review.dimension,
    ...(review.quickTags || []),
    ...(review.issueTags || []),
    review.transactionIntent || ""
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function applyReviewFilters(reviews, query) {
  let items = [...reviews];
  const scope = String(query.get("scope") || "all").trim().toLowerCase();
  const timeWindow = String(query.get("timeWindow") || "all").trim().toLowerCase();
  const minRating = Number(query.get("minRating") || 0);
  const searchTerm = query.get("q");

  if (scope === "public") {
    items = items.filter((review) => review.publicReview);
  } else if (scope === "private") {
    items = items.filter((review) => !review.publicReview);
  }

  if (Number.isFinite(minRating) && minRating > 0) {
    items = items.filter((review) => Number(review.overallRating || 0) >= minRating);
  }

  if (timeWindow !== "all") {
    const days = Number(timeWindow);
    if (Number.isFinite(days) && days > 0) {
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      items = items.filter((review) => {
        const createdAt = new Date(review.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= threshold;
      });
    }
  }

  if (searchTerm) {
    items = items.filter((review) => reviewMatchesSearch(review, searchTerm));
  }

  return items.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

function buildCreatorOptionMap(reviews, authProfileId, currentMemberName) {
  const map = new Map();
  reviews.forEach((review) => {
    const entry = map.get(review.creatorId) || {
      id: review.creatorId,
      name: review.creatorName,
      handle: review.creatorHandle,
      reviewCount: 0,
      avgRating: 0,
      isSelf: review.creatorId === authProfileId
    };
    entry.reviewCount += 1;
    entry.avgRating = 0;
    if (!entry.name && currentMemberName && review.creatorId === authProfileId) {
      entry.name = currentMemberName;
    }
    map.set(review.creatorId, entry);
  });

  map.forEach((entry, key) => {
    const creatorReviews = reviews.filter((review) => review.creatorId === key);
    entry.avgRating = Number(avg(creatorReviews.map((review) => review.overallRating)).toFixed(1));
    if (!entry.handle) entry.handle = toHandle(entry.name);
    if (!entry.name && entry.isSelf && currentMemberName) entry.name = currentMemberName;
  });

  if (authProfileId && !map.has(authProfileId)) {
    map.set(authProfileId, {
      id: authProfileId,
      name: currentMemberName || "Creator",
      handle: toHandle(currentMemberName || "Creator"),
      reviewCount: 0,
      avgRating: 0,
      isSelf: true
    });
  }

  return [...map.values()].sort((left, right) => {
    if (left.isSelf && !right.isSelf) return -1;
    if (!left.isSelf && right.isSelf) return 1;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

function buildSelectedCreatorSummary(selectedCreatorId, creators, reviews) {
  if (selectedCreatorId === "all") {
    return {
      id: "all",
      name: "Creator Team",
      handle: "workspace",
      reviewCount: reviews.length,
      avgRating: Number(avg(reviews.map((review) => review.overallRating)).toFixed(1)),
      isWorkspace: true
    };
  }

  const selected = creators.find((creator) => creator.id === selectedCreatorId) || null;
  return (
    selected || {
      id: selectedCreatorId,
      name: "Creator",
      handle: "@creator",
      reviewCount: reviews.length,
      avgRating: Number(avg(reviews.map((review) => review.overallRating)).toFixed(1)),
      isWorkspace: false
    }
  );
}

export function registerReviewsRoutes(router) {
  router.add("GET", "/api/reviews/dashboard", { tag: "reviews", auth: true, description: "Workspace-backed review dashboard data for the Reviews page." }, async ({ auth, query, store }) => {
    const db = store.load();
    const access = resolveWorkspaceAccess(db, auth);
    ensure(access.currentMember, "Workspace member not found.", "WORKSPACE_MEMBER_NOT_FOUND", 403);
    ensure(canViewReviews(access), "You do not have permission to view reviews.", "FORBIDDEN", 403);

    const normalizedReviews = (Array.isArray(db.reviews) ? db.reviews : []).map((review, index) => normalizeReviewRecord(db, review, index));
    const authProfileId = String(auth.profile?.id || db.creatorProfiles.find((entry) => entry.userId === auth.user.id)?.id || "");
    const workspaceView = canViewWorkspaceReviews(access);
    const creators = buildCreatorOptionMap(normalizedReviews, authProfileId, access.currentMember.name);

    let selectedCreatorId = String(query.get("creatorId") || "").trim();
    if (!selectedCreatorId) {
      selectedCreatorId = workspaceView ? "all" : authProfileId || creators[0]?.id || "all";
    }

    if (!workspaceView && selectedCreatorId !== authProfileId) {
      selectedCreatorId = authProfileId;
    }

    if (selectedCreatorId !== "all") {
      ensure(
        creators.some((creator) => creator.id === selectedCreatorId),
        "Selected creator reviews were not found.",
        "REVIEWS_CREATOR_NOT_FOUND",
        404
      );
    }

    const scopedReviews = selectedCreatorId === "all"
      ? normalizedReviews
      : normalizedReviews.filter((review) => review.creatorId === selectedCreatorId);
    const filteredReviews = applyReviewFilters(scopedReviews, query);

    return ok({
      canViewWorkspace: workspaceView,
      creators,
      selectedCreator: buildSelectedCreatorSummary(selectedCreatorId, creators, filteredReviews),
      reviews: filteredReviews,
      lastUpdatedAt: db.meta?.updatedAt || nowIso()
    });
  });
}
