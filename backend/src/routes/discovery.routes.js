import { created, ok } from "../lib/http.js";
import { ensure, pushAudit, applySearch, applyFilter, paginate } from "../lib/utils.js";

function sellerResponse(seller, authProfile) {
  return {
    ...seller,
    isFollowing: Boolean(authProfile?.followingSellerIds?.includes(seller.id))
  };
}

function normalizeToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function findSeller(db, sellerId, sellerName) {
  return (
    db.sellers.find((entry) => entry.id === sellerId) ||
    db.sellers.find((entry) => normalizeToken(entry.name) === normalizeToken(sellerName)) ||
    null
  );
}

function findOpportunityProposal(db, userId, opportunity) {
  const opportunityToken = normalizeToken(opportunity.title || opportunity.summary || opportunity.seller);
  return (
    db.proposals.find(
      (proposal) =>
        proposal.userId === userId &&
        proposal.sellerId === opportunity.sellerId &&
        normalizeToken(proposal.campaign) === opportunityToken
    ) ||
    db.proposals.find((proposal) => proposal.userId === userId && proposal.sellerId === opportunity.sellerId) ||
    null
  );
}

function findOpportunityInvite(db, userId, opportunity) {
  const opportunityToken = normalizeToken(opportunity.title || opportunity.summary || opportunity.seller);
  return (
    db.invites.find(
      (invite) =>
        invite.userId === userId &&
        invite.sellerId === opportunity.sellerId &&
        normalizeToken(invite.campaign) === opportunityToken
    ) ||
    db.invites.find((invite) => invite.userId === userId && invite.sellerId === opportunity.sellerId) ||
    null
  );
}

function normalizeOpportunityStatus(value) {
  const raw = normalizeToken(value);
  if (["open", "creator wanted", "creator_wanted"].includes(raw)) return "Open";
  if (["invite only", "invite_only"].includes(raw)) return "Invite only";
  if (["closed", "ended", "archived"].includes(raw)) return "Closed";
  return "Open";
}

function normalizeOpportunitySaveIds(profile) {
  return new Set(safeArray(profile?.savedOpportunityIds));
}


function buildInviteRecord(db, invite) {
  const seller = findSeller(db, invite.sellerId, invite.seller);
  const category = invite.category || seller?.categories?.[0] || "General";
  const baseFee = Number(invite.baseFee || 0);
  const commissionPct = Number(invite.commissionPct || 0);
  const estimatedValue = Number(invite.estimatedValue || baseFee || 0);

  return {
    ...invite,
    seller: String(invite.seller || seller?.name || "Unknown seller"),
    sellerInitials: String(invite.sellerInitials || seller?.initials || "MD"),
    sellerDescription: String(invite.sellerDescription || seller?.tagline || "Trusted supplier collaboration request."),
    sellerRating: Number(invite.sellerRating || seller?.rating || 0),
    sellerBadge: String(invite.sellerBadge || seller?.badge || ""),
    category,
    region: String(invite.region || seller?.region || "Global"),
    baseFee,
    commissionPct,
    estimatedValue,
    currency: String(invite.currency || "USD"),
    messageShort: String(
      invite.messageShort ||
        `Supplier invite for ${invite.campaign || "a new collaboration"} focused on ${category.toLowerCase()}.`
    ),
    link: `/invites?inviteId=${encodeURIComponent(invite.id)}`
  };
}

function buildOpportunityRecord(db, opportunity, auth) {
  const seller = findSeller(db, opportunity.sellerId, opportunity.seller);
  const proposal = findOpportunityProposal(db, auth.user.id, opportunity);
  const invite = findOpportunityInvite(db, auth.user.id, opportunity);
  const savedOpportunityIds = normalizeOpportunitySaveIds(auth.profile);
  const sellerRelationship = seller?.relationship || "none";
  const collaborationStatus = sellerRelationship !== "none" ? "Collaborating" : invite ? "Invited" : "Not invited";

  return {
    ...opportunity,
    title: String(opportunity.title || opportunity.summary || opportunity.seller || "Untitled opportunity"),
    seller: String(opportunity.seller || seller?.name || "Unknown seller"),
    sellerInitials: String(opportunity.sellerInitials || seller?.initials || "MD"),
    supplierType: String(opportunity.supplierType || seller?.type || "Seller"),
    sellerRating: Number(seller?.rating || 0),
    sellerBadge: String(seller?.badge || ""),
    collaborationStatus,
    opportunityStatus: normalizeOpportunityStatus(opportunity.status),
    trustBadges: safeArray(seller?.trustBadges),
    isFollowing: Boolean(auth.profile?.followingSellerIds?.includes(opportunity.sellerId)),
    isSaved: savedOpportunityIds.has(opportunity.id),
    latestProposalId: proposal?.id || null,
    latestProposalStatus: proposal?.status || null,
    inviteId: invite?.id || null,
    inviteStatus: invite?.status || null,
    openToCollabs: Boolean(seller?.openToCollabs ?? true),
    inviteOnly: Boolean(seller?.inviteOnly ?? false)
  };
}

function mapProposalOrigin(origin) {
  return normalizeToken(origin) === "creator" ? "creator-pitch" : "seller-invite";
}

function mapProposalStatusToBoardStage(status) {
  const raw = normalizeToken(status);
  if (["draft", "sent to brand", "sent_to_brand", "sent", "submitted"].includes(raw)) return "pitches_sent";
  if (["in negotiation", "in_negotiation", "negotiating", "countered"].includes(raw)) return "negotiating";
  if (["accepted", "active", "signed"].includes(raw)) return "active_contracts";
  if (["completed", "done"].includes(raw)) return "completed";
  if (["declined", "terminated", "archived"].includes(raw)) return "terminated";
  return "pitches_sent";
}

function mapInviteStatusToBoardStage(status) {
  const raw = normalizeToken(status);
  if (["accepted"].includes(raw)) return "active_contracts";
  if (["negotiating", "countered"].includes(raw)) return "negotiating";
  if (["declined", "terminated"].includes(raw)) return "terminated";
  return "leads";
}

function rankBoardStage(stage) {
  switch (stage) {
    case "leads":
      return 0;
    case "pitches_sent":
      return 1;
    case "negotiating":
      return 2;
    case "active_contracts":
      return 3;
    case "completed":
      return 4;
    case "terminated":
      return 5;
    default:
      return 99;
  }
}

function buildCampaignBoardRows(db, auth) {
  const userId = auth.user.id;
  const rows = [];
  const seen = new Set();

  function addRow(row) {
    const dedupeKey = `${row.sellerId || "seller_unknown"}::${normalizeToken(row.title)}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push(row);
  }

  db.campaigns
    .filter((campaign) => campaign.ownerUserId === userId)
    .forEach((campaign) => {
      const proposal =
        db.proposals.find(
          (entry) => entry.userId === userId && entry.sellerId === campaign.sellerId && normalizeToken(entry.campaign) === normalizeToken(campaign.title)
        ) || db.proposals.find((entry) => entry.userId === userId && entry.sellerId === campaign.sellerId) || null;
      const contract = db.contracts.find((entry) => entry.userId === userId && entry.campaignId === campaign.id) || null;
      const liveSessions = db.liveSessions.filter((entry) => entry.userId === userId && (entry.campaignId === campaign.id || entry.sellerId === campaign.sellerId));
      const adCampaigns = db.adzCampaigns.filter((entry) => entry.userId === userId && (entry.campaignId === campaign.id || entry.sellerId === campaign.sellerId));
      const latestLiveSession = [...liveSessions].sort((left, right) => String(right.scheduledFor || "").localeCompare(String(left.scheduledFor || "")))[0] || null;
      const latestAdCampaign = [...adCampaigns].sort((left, right) => String(right.startISO || "").localeCompare(String(left.startISO || "")))[0] || null;

      addRow({
        id: campaign.id,
        source: "campaign",
        sellerId: campaign.sellerId,
        title: campaign.title,
        seller: campaign.seller,
        type: campaign.type,
        stage: String(campaign.stage || "pitches_sent"),
        origin: proposal ? mapProposalOrigin(proposal.origin) : "creator-pitch",
        estValue: Number(campaign.value || proposal?.estimatedValue || contract?.value || 0),
        currency: String(contract?.currency || proposal?.currency || adCampaigns[0]?.compensation?.currency || "USD"),
        region: String(proposal?.region || ""),
        nextAction: String(campaign.note || proposal?.lastActivity || contract?.status || "Open campaign"),
        promoCount: adCampaigns.length,
        liveCount: liveSessions.length,
        health: String(contract?.health || (campaign.status === "completed" ? "on-track" : campaign.status === "in_review" ? "at-risk" : "on-track")),
        lastActivity: String(proposal?.lastActivity || campaign.note || contract?.timeline?.[0]?.what || "No recent activity"),
        proposalId: proposal?.id || null,
        contractId: contract?.id || null,
        latestLiveSessionId: latestLiveSession?.id || null,
        latestAdCampaignId: latestAdCampaign?.id || null,
        sellerBadge: String(findSeller(db, campaign.sellerId, campaign.seller)?.badge || ""),
        status: String(campaign.status || "active")
      });
    });

  db.proposals
    .filter((proposal) => proposal.userId === userId)
    .forEach((proposal) => {
      const stage = mapProposalStatusToBoardStage(proposal.status);
      const contract = db.contracts.find((entry) => entry.userId === userId && entry.proposalId === proposal.id) || null;
      addRow({
        id: `proposal_board_${proposal.id}`,
        source: "proposal",
        sellerId: proposal.sellerId,
        title: proposal.campaign,
        seller: proposal.brand,
        type: proposal.offerType,
        stage,
        origin: mapProposalOrigin(proposal.origin),
        estValue: Number(proposal.estimatedValue || proposal.baseFeeMax || proposal.baseFeeMin || 0),
        currency: String(proposal.currency || "USD"),
        region: proposal.region,
        nextAction: stage === "negotiating" ? "Continue negotiation" : stage === "terminated" ? "Campaign closed" : "Await seller response",
        promoCount: 0,
        liveCount: 0,
        health: stage === "terminated" ? "stalled" : stage === "negotiating" ? "at-risk" : "on-track",
        lastActivity: proposal.lastActivity,
        proposalId: proposal.id,
        contractId: contract?.id || null,
        latestLiveSessionId: null,
        latestAdCampaignId: null,
        sellerBadge: String(findSeller(db, proposal.sellerId, proposal.brand)?.badge || ""),
        status: proposal.status
      });
    });

  db.invites
    .filter((invite) => invite.userId === userId)
    .forEach((invite) => {
      const stage = mapInviteStatusToBoardStage(invite.status);
      addRow({
        id: `invite_board_${invite.id}`,
        source: "invite",
        sellerId: invite.sellerId,
        title: invite.campaign,
        seller: invite.seller,
        type: invite.type,
        stage,
        origin: "seller-invite",
        estValue: 0,
        currency: "USD",
        region: invite.region,
        nextAction: stage === "leads" ? "Send pitch" : stage === "negotiating" ? "Continue negotiation" : "Open invite",
        promoCount: 0,
        liveCount: 0,
        health: stage === "terminated" ? "stalled" : stage === "negotiating" ? "at-risk" : "on-track",
        lastActivity: invite.lastActivity,
        proposalId: null,
        contractId: null,
        latestLiveSessionId: null,
        latestAdCampaignId: null,
        sellerBadge: String(findSeller(db, invite.sellerId, invite.seller)?.badge || ""),
        status: invite.status
      });
    });

  rows.sort((left, right) => {
    const stageDelta = rankBoardStage(left.stage) - rankBoardStage(right.stage);
    if (stageDelta !== 0) return stageDelta;
    const valueDelta = Number(right.estValue || 0) - Number(left.estValue || 0);
    if (valueDelta !== 0) return valueDelta;
    return String(left.title).localeCompare(String(right.title));
  });

  return rows;
}

function buildDealzMarketplaceRows(db, auth) {
  const userId = auth.user.id;
  const grouped = new Map();

  function ensureGroup(key, seed) {
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        title: seed.title || "Untitled deal",
        subtitle: seed.subtitle || "",
        sellerId: seed.sellerId || null,
        sellerName: seed.sellerName || "Unknown seller",
        campaignId: seed.campaignId || null,
        kind: "live",
        liveSessions: [],
        adCampaigns: []
      });
    }
    return grouped.get(key);
  }

  db.liveSessions
    .filter((entry) => entry.userId === userId)
    .forEach((session) => {
      const key = session.campaignId || `live:${session.id}`;
      const group = ensureGroup(key, {
        title: session.campaign || session.title,
        subtitle: session.title,
        sellerId: session.sellerId,
        sellerName: session.seller,
        campaignId: session.campaignId || null
      });
      group.liveSessions.push(session);
    });

  db.adzCampaigns
    .filter((entry) => entry.userId === userId)
    .forEach((campaign) => {
      const key = campaign.campaignId || `adz:${campaign.id}`;
      const group = ensureGroup(key, {
        title: campaign.campaignName,
        subtitle: campaign.campaignSubtitle,
        sellerId: campaign.sellerId || null,
        sellerName: campaign.supplier?.name || "Unknown seller",
        campaignId: campaign.campaignId || null
      });
      group.adCampaigns.push(campaign);
    });

  return [...grouped.values()]
    .map((group) => {
      const live = [...group.liveSessions].sort((left, right) => String(right.scheduledFor || "").localeCompare(String(left.scheduledFor || "")))[0] || null;
      const ad = [...group.adCampaigns].sort((left, right) => String(right.startISO || "").localeCompare(String(left.startISO || "")))[0] || null;
      const clicks = group.adCampaigns.reduce((sum, entry) => sum + Number(entry.performance?.clicks || 0), 0);
      const purchases = group.adCampaigns.reduce((sum, entry) => sum + Number(entry.performance?.purchases || 0), 0);
      const earnings = group.adCampaigns.reduce((sum, entry) => sum + Number(entry.performance?.earnings || 0), 0);
      const replay = live ? db.replays.find((entry) => entry.sessionId === live.id) || null : null;
      const platforms = [...new Set([...(live?.simulcast || []), ...(ad?.platforms || [])])];
      const kind = live && ad ? "hybrid" : live ? "live" : "shoppable";
      const status = live?.status || ad?.status || "draft";

      return {
        id: group.id,
        kind,
        title: group.title,
        subtitle: group.subtitle || (kind === "hybrid" ? "Live session + Shoppable Ad" : kind === "live" ? "Live session" : "Shoppable Ad"),
        sellerId: group.sellerId,
        sellerName: group.sellerName,
        campaignId: group.campaignId,
        status,
        startsAtISO: live?.scheduledFor || ad?.startISO || null,
        endsAtISO: ad?.endISO || null,
        platforms,
        liveSessionId: live?.id || null,
        adCampaignId: ad?.id || null,
        liveCount: group.liveSessions.length,
        adCount: group.adCampaigns.length,
        productCount: Number(live?.productsCount || 0) + group.adCampaigns.reduce((sum, entry) => sum + safeArray(entry.offers).length, 0),
        performance: {
          clicks,
          purchases,
          earnings,
          conversionPct: clicks > 0 ? Number(((purchases / clicks) * 100).toFixed(1)) : 0,
          currency: ad?.compensation?.currency || "USD"
        },
        sellerBadge: String(findSeller(db, group.sellerId, group.sellerName)?.badge || ""),
        hasReplay: Boolean(replay),
        replayId: replay?.id || null
      };
    })
    .sort((left, right) => String(right.startsAtISO || "").localeCompare(String(left.startsAtISO || "")));
}

export function registerDiscoveryRoutes(router) {
  router.add("GET", "/api/sellers", { tag: "discovery", auth: true, description: "List suppliers and providers for discovery." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.sellers;
    items = applySearch(items, query.get("q"), ["name", "tagline", "brand", "region", "categories"]);
    items = applyFilter(items, query.get("region"), "region");
    items = query.get("openOnly") === "true" ? items.filter((seller) => seller.openToCollabs) : items;
    const page = paginate(items.map((seller) => sellerResponse(seller, auth.profile)), query);
    return ok(page.data, page.meta);
  });

  router.add("POST", "/api/sellers/:id/follow", { tag: "discovery", auth: true, description: "Follow or unfollow a seller." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    const follow = body.follow !== false;
    const response = store.update((db) => {
      const seller = db.sellers.find((entry) => entry.id === params.id);
      ensure(seller, "Seller not found.", "SELLER_NOT_FOUND", 404);
      const profile = db.creatorProfiles.find((entry) => entry.userId === auth.user.id);
      ensure(profile, "Creator profile not found.", "PROFILE_NOT_FOUND", 404);

      const current = new Set(profile.followingSellerIds || []);
      if (follow) current.add(seller.id);
      else current.delete(seller.id);
      profile.followingSellerIds = [...current];

      pushAudit(db, {
        actor: auth.user.email,
        action: follow ? "Followed seller" : "Unfollowed seller",
        detail: seller.name,
        severity: "info"
      });

      return sellerResponse(seller, profile);
    });

    return ok(response);
  });

  router.add("GET", "/api/my-sellers", { tag: "discovery", auth: true, description: "List currently linked or followed sellers." }, async ({ auth, query, store }) => {
    const db = store.load();
    const followingIds = new Set(auth.profile?.followingSellerIds || []);
    let items = db.sellers.filter((seller) => seller.relationship !== "none" || followingIds.has(seller.id));
    items = applySearch(items, query.get("q"), ["name", "tagline", "brand", "categories", "region"]);
    if (query.get("relationship")) {
      items = items.filter((seller) => seller.relationship === query.get("relationship"));
    }
    const page = paginate(items.map((seller) => sellerResponse(seller, auth.profile)), query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/opportunities", { tag: "discovery", auth: true, description: "List marketplace opportunities." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.opportunities.filter((opportunity) => opportunity.ownerUserId === auth.user.id);
    items = items.map((opportunity) => buildOpportunityRecord(db, opportunity, auth));
    items = applySearch(items, query.get("q"), ["title", "seller", "category", "summary", "tags"]);
    items = applyFilter(items, query.get("category"), "category");
    items = applyFilter(items, query.get("region"), "region");
    items = applyFilter(items, query.get("language"), "language");
    items = applyFilter(items, query.get("sellerId"), "sellerId");
    items = applyFilter(items, query.get("supplierType"), "supplierType");
    if (query.get("status")) {
      items = items.filter((opportunity) => normalizeOpportunityStatus(opportunity.opportunityStatus) === normalizeOpportunityStatus(query.get("status")));
    }
    if (query.get("currentOnly") === "true" || query.get("openOnly") === "true") {
      items = items.filter((opportunity) => opportunity.opportunityStatus === "Open");
    }
    if (query.get("minBudget")) {
      const minBudget = Number(query.get("minBudget"));
      items = items.filter((opportunity) => Number(opportunity.budgetMax || 0) >= minBudget);
    }
    if (query.get("maxBudget")) {
      const maxBudget = Number(query.get("maxBudget"));
      items = items.filter((opportunity) => Number(opportunity.budgetMin || 0) <= maxBudget);
    }
    if (query.get("commission")) {
      const commission = String(query.get("commission"));
      items = items.filter((opportunity) => {
        const pct = Number(opportunity.commission || 0);
        if (commission === "0-5") return pct >= 0 && pct <= 5;
        if (commission === "5-10") return pct > 5 && pct <= 10;
        if (commission === "10+") return pct > 10;
        return true;
      });
    }
    if (query.get("minRating")) {
      const minRating = Number(query.get("minRating"));
      items = items.filter((opportunity) => Number(opportunity.sellerRating || 0) >= minRating);
    }
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/opportunities/:id", { tag: "discovery", auth: true, description: "Get one opportunity." }, async ({ auth, params, store }) => {
    const db = store.load();
    const opportunity = db.opportunities.find((entry) => entry.id === params.id && entry.ownerUserId === auth.user.id);
    ensure(opportunity, "Opportunity not found.", "OPPORTUNITY_NOT_FOUND", 404);
    return ok(buildOpportunityRecord(db, opportunity, auth));
  });

  router.add("POST", "/api/opportunities/:id/save", { tag: "discovery", auth: true, description: "Save or unsave an opportunity." }, async ({ auth, params, readBody, store }) => {
    const body = (await readBody()) || {};
    const saved = body.saved !== false;
    const result = store.update((db) => {
      const opportunity = db.opportunities.find((entry) => entry.id === params.id && entry.ownerUserId === auth.user.id);
      ensure(opportunity, "Opportunity not found.", "OPPORTUNITY_NOT_FOUND", 404);
      const profile = db.creatorProfiles.find((entry) => entry.userId === auth.user.id);
      ensure(profile, "Creator profile not found.", "PROFILE_NOT_FOUND", 404);
      const current = new Set(profile.savedOpportunityIds || []);
      if (saved) current.add(opportunity.id);
      else current.delete(opportunity.id);
      profile.savedOpportunityIds = [...current];
      pushAudit(db, {
        actor: auth.user.email,
        action: saved ? "Saved opportunity" : "Removed saved opportunity",
        detail: opportunity.title || opportunity.seller,
        severity: "info"
      });
      return buildOpportunityRecord(db, opportunity, { ...auth, profile });
    });
    return ok(result);
  });

  router.add("GET", "/api/campaign-board", { tag: "discovery", auth: true, description: "Unified campaign pipeline rows for the creator board." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = buildCampaignBoardRows(db, auth);
    items = applySearch(items, query.get("q"), ["title", "seller", "type", "nextAction", "lastActivity"]);
    items = applyFilter(items, query.get("stage"), "stage");
    items = applyFilter(items, query.get("origin"), "origin");
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/dealz-marketplace", { tag: "discovery", auth: true, description: "Combined marketplace cards for live sessions and shoppable ad campaigns." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = buildDealzMarketplaceRows(db, auth);
    items = applySearch(items, query.get("q"), ["title", "subtitle", "sellerName", "platforms"]);
    items = applyFilter(items, query.get("kind"), "kind");
    if (query.get("status")) {
      items = items.filter((item) => normalizeToken(item.status) === normalizeToken(query.get("status")));
    }
    items = applyFilter(items, query.get("sellerId"), "sellerId");
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("GET", "/api/invites", { tag: "discovery", auth: true, description: "List seller invites for the creator." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.invites.filter((invite) => invite.userId === auth.user.id).map((invite) => buildInviteRecord(db, invite));
    items = applyFilter(items, query.get("status"), "status");
    items = applySearch(items, query.get("q"), ["seller", "campaign", "type", "fitReason", "sellerDescription", "messageShort"]);
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("POST", "/api/invites/:id/respond", { tag: "discovery", auth: true, description: "Respond to an invite." }, async ({ auth, params, readBody, store }) => {
    const body = await readBody();
    ensure(["accepted", "declined", "negotiating"].includes(body.decision), "Decision must be accepted, declined, or negotiating.");
    const result = store.update((db) => {
      const invite = db.invites.find((entry) => entry.id === params.id && entry.userId === auth.user.id);
      ensure(invite, "Invite not found.", "INVITE_NOT_FOUND", 404);
      invite.status = body.decision;
      invite.lastActivity = `${body.decision} - just now`;
      pushAudit(db, {
        actor: auth.user.email,
        action: "Invite response recorded",
        detail: `${invite.seller} -> ${body.decision}`,
        severity: "info"
      });
      return buildInviteRecord(db, invite);
    });
    return created(result);
  });

  router.add("GET", "/api/public-profile/:handle", { tag: "discovery", description: "Public creator profile." }, async ({ params, store }) => {
    const db = store.load();
    const profile = db.creatorProfiles.find((entry) => entry.handle === params.handle);
    ensure(profile, "Creator profile not found.", "PROFILE_NOT_FOUND", 404);

    const latestCampaigns = db.campaigns
      .filter((campaign) => campaign.ownerUserId === profile.userId)
      .slice(0, 3)
      .map((campaign) => ({
        ...campaign,
        proposalId: db.proposals.find((proposal) => proposal.userId === profile.userId && proposal.sellerId === campaign.sellerId)?.id || null,
        contractId: db.contracts.find((contract) => contract.userId === profile.userId && contract.campaignId === campaign.id)?.id || null
      }));

    const recentSessions = db.liveSessions
      .filter((session) => session.userId === profile.userId)
      .slice(0, 3)
      .map((session) => ({
        id: session.id,
        title: session.title,
        seller: session.seller,
        scheduledFor: session.scheduledFor,
        status: session.status,
        route: `/live-studio?sessionId=${encodeURIComponent(session.id)}`
      }));

    const recentReplays = db.replays
      .filter((replay) => db.liveSessions.some((session) => session.userId === profile.userId && session.id === replay.sessionId))
      .slice(0, 3)
      .map((replay) => ({
        id: replay.id,
        title: replay.title,
        published: replay.published,
        views: replay.views,
        sales: replay.sales,
        route: `/post-live?sessionId=${encodeURIComponent(replay.sessionId)}`
      }));

    return ok({
      ...profile,
      latestCampaigns,
      recentSessions,
      recentReplays,
      socials: [
        { id: "instagram", label: "Instagram", followers: 48000 },
        { id: "tiktok", label: "TikTok", followers: 62000 },
        { id: "youtube", label: "YouTube", followers: 18000 }
      ],
      reviews: db.reviews.filter((review) => review.userId === profile.userId)
    });
  });
}
