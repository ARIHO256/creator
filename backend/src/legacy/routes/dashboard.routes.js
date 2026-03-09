import { ok } from "../lib/http.js";
import { nowIso, summarizeNavBadges } from "../lib/utils.js";

function findProfile(db, userId) {
  return db.creatorProfiles.find((entry) => entry.userId === userId) || null;
}

function findSeller(db, sellerId) {
  return db.sellers.find((entry) => entry.id === sellerId) || null;
}

function buildLandingContent(db) {
  const profile = db.creatorProfiles[0] || null;
  const sellers = Array.isArray(db.sellers) ? db.sellers : [];
  const campaigns = Array.isArray(db.campaigns) ? db.campaigns : [];
  const reviews = Array.isArray(db.reviews) ? db.reviews : [];

  return {
    hero: {
      eyebrow: "Creator commerce workspace",
      title: "Run live shopping, pitches, dealz, and payouts from one creator operating system.",
      subtitle:
        "MyLiveDealz gives creators one place to pitch suppliers, host conversion-ready lives, publish replays and Shoppable Adz, and track the money behind every collaboration.",
      primaryCta: { label: "Enter creator workspace", href: "/auth" },
      secondaryCta: { label: "See creator profile", href: profile ? `/profile-public?handle=${encodeURIComponent(profile.handle)}` : "/profile-public" }
    },
    stats: [
      {
        id: "landing_stat_creatorsales",
        label: "Sales already driven",
        value: `$${Number(profile?.totalSalesDriven || 0).toLocaleString()}`,
        detail: "Across active creator collaborations"
      },
      {
        id: "landing_stat_lives",
        label: "Live sessions in workspace",
        value: String((db.liveSessions || []).length),
        detail: "Scheduled, in-progress, and draft live workflows"
      },
      {
        id: "landing_stat_brands",
        label: "Suppliers available",
        value: String(sellers.length),
        detail: "Sellers and providers ready for creator pitches"
      },
      {
        id: "landing_stat_reviews",
        label: "Creator trust score",
        value: `${Number(profile?.rating || 0).toFixed(1)} / 5`,
        detail: `${reviews.length} internal review signals`
      }
    ],
    features: [
      {
        id: "feature_pipeline",
        tag: "Pipeline",
        title: "Pitch-to-contract workflow",
        description: "Move from opportunity discovery to negotiations, contracts, tasks, assets, and delivery without leaving the workspace."
      },
      {
        id: "feature_live",
        tag: "Live",
        title: "Live sessions with builder, studio, and replay",
        description: "Create sessions, assign crew, configure live support tools, and publish replays with backend-tracked runtime state."
      },
      {
        id: "feature_adz",
        tag: "Adz",
        title: "Shoppable Adz and tracked links",
        description: "Launch builder-driven Shoppable Adz campaigns and follow real clicks, purchases, and earnings by campaign."
      },
      {
        id: "feature_money",
        tag: "Money",
        title: "Clear earnings and payout control",
        description: "See available, pending, and projected earnings, then request payouts and audit payout history from the same finance layer."
      }
    ],
    workflow: [
      {
        id: "workflow_1",
        title: "Discover and pitch",
        description: "Browse opportunities, follow suppliers, and send creator pitches into the negotiation room."
      },
      {
        id: "workflow_2",
        title: "Prepare delivery",
        description: "Convert approved work into contracts, task boards, asset requests, and live or ad builder drafts."
      },
      {
        id: "workflow_3",
        title: "Go live or publish adz",
        description: "Run the session, activate support tools, publish replays, or execute Shoppable Adz campaigns."
      },
      {
        id: "workflow_4",
        title: "Measure and get paid",
        description: "Track analytics, marketplace performance, link conversions, and payout outcomes from backend records."
      }
    ],
    featuredBrands: sellers.slice(0, 4).map((seller) => ({
      id: seller.id,
      name: seller.name,
      category: seller.categories?.[0] || seller.type || "Supplier",
      badge: seller.badge || "Trusted supplier"
    })),
    stories: campaigns.slice(0, 3).map((campaign) => ({
      id: campaign.id,
      title: campaign.title,
      seller: campaign.seller,
      value: Number(campaign.value || 0),
      stage: campaign.stage,
      note: campaign.note
    })),
    faq: [
      {
        id: "faq_1",
        question: "Can creators create campaigns directly from the creator workspace?",
        answer: "Creators can view campaigns and pitch into them, but supplier-owned campaign creation stays on the supplier side of the product."
      },
      {
        id: "faq_2",
        question: "Does the live workflow keep draft and runtime state on the backend?",
        answer: "Yes. Live Builder, Live Studio, replay publishing, crew tools, alerts, overlays, and stream settings are now persisted through the backend APIs."
      },
      {
        id: "faq_3",
        question: "What happens after a pitch is accepted?",
        answer: "The creator continues inside proposals, contracts, tasks, assets, live runtime, or Adz execution, with analytics and payouts closing the loop."
      }
    ],
    lastUpdatedAt: nowIso()
  };
}

function mapLiveSessionCard(session, db) {
  const seller = findSeller(db, session.sellerId);
  const goal = session.studio?.commerceGoal || {};
  return {
    id: session.id,
    title: session.title,
    seller: session.seller,
    campaign: session.campaign,
    sellerId: session.sellerId,
    category: seller?.categories?.[0] || "General",
    status: session.status,
    scheduledFor: session.scheduledFor,
    timeLabel: session.time,
    location: session.location,
    role: session.role,
    viewers: Number(goal.cartCount || 0),
    targetUnits: Number(goal.targetUnits || 0),
    soldUnits: Number(goal.soldUnits || 0),
    route: `/live-studio?sessionId=${encodeURIComponent(session.id)}`
  };
}

function mapReplayCard(replay, db) {
  const session = db.liveSessions.find((entry) => entry.id === replay.sessionId) || null;
  return {
    id: replay.id,
    sessionId: replay.sessionId,
    title: replay.title,
    seller: session?.seller || "MyLiveDealz",
    campaign: session?.campaign || replay.title,
    views: Number(replay.views || 0),
    sales: Number(replay.sales || 0),
    published: Boolean(replay.published),
    updatedAt: replay.updatedAt || replay.publishedAt || replay.date,
    route: `/post-live?sessionId=${encodeURIComponent(replay.sessionId)}`
  };
}

function buildFeedResponse(db, auth) {
  const profile = findProfile(db, auth.user.id);
  const sessions = (db.liveSessions || []).filter((session) => session.userId === auth.user.id);
  const replays = (db.replays || []).filter((replay) => {
    const session = sessions.find((entry) => entry.id === replay.sessionId);
    return Boolean(session);
  });
  const notifications = (db.notifications || []).filter((item) => item.userId === auth.user.id);
  const tasks = (db.tasks || []).filter((task) => task.userId === auth.user.id);
  const proposals = (db.proposals || []).filter((proposal) => proposal.userId === auth.user.id);
  const campaigns = (db.campaigns || []).filter((campaign) => campaign.ownerUserId === auth.user.id);

  const liveNow = sessions
    .filter((session) => ["live", "scheduled"].includes(String(session.status || "").toLowerCase()))
    .sort((left, right) => String(left.scheduledFor || "").localeCompare(String(right.scheduledFor || "")))
    .slice(0, 3)
    .map((session) => mapLiveSessionCard(session, db));

  const upcoming = sessions
    .filter((session) => !["live"].includes(String(session.status || "").toLowerCase()))
    .sort((left, right) => String(left.scheduledFor || "").localeCompare(String(right.scheduledFor || "")))
    .slice(0, 4)
    .map((session) => mapLiveSessionCard(session, db));

  const featuredReplays = replays
    .slice()
    .sort((left, right) => String(right.updatedAt || right.date || "").localeCompare(String(left.updatedAt || left.date || "")))
    .slice(0, 3)
    .map((replay) => mapReplayCard(replay, db));

  const followedSellers = (profile?.followingSellerIds || []).map((sellerId) => {
    const seller = findSeller(db, sellerId);
    const nextSession = sessions
      .filter((session) => session.sellerId === sellerId)
      .sort((left, right) => String(left.scheduledFor || "").localeCompare(String(right.scheduledFor || "")))[0] || null;

    if (!seller) return null;
    return {
      id: seller.id,
      name: seller.name,
      type: seller.type,
      category: seller.categories?.[0] || seller.type,
      region: seller.region,
      fitScore: seller.fitScore,
      relationship: seller.relationship,
      status: nextSession ? `${nextSession.status} · ${nextSession.title}` : seller.collabStatus,
      isFollowing: true,
      route: `/my-sellers`
    };
  }).filter(Boolean);

  const openOpportunities = (db.opportunities || [])
    .filter((opportunity) => String(opportunity.status || "").toLowerCase() === "open")
    .slice(0, 4)
    .map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      seller: opportunity.seller,
      category: opportunity.category,
      payBand: opportunity.payBand,
      matchScore: opportunity.matchScore,
      route: `/opportunities`
    }));

  return {
    hero: {
      title: `Welcome back${profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}`,
      subtitle: "Run today’s pitches, live sessions, replays, and earnings from one backend-driven feed.",
      tier: profile?.tier || "Creator",
      categories: profile?.categories || []
    },
    quickStats: [
      { id: "feed_stat_campaigns", label: "Active campaigns", value: campaigns.filter((item) => item.status !== "completed").length, hint: "Creator pipeline in motion" },
      { id: "feed_stat_tasks", label: "Open tasks", value: tasks.filter((item) => item.column !== "done").length, hint: "Items still needing delivery" },
      { id: "feed_stat_unread", label: "Unread notifications", value: notifications.filter((item) => !item.read).length, hint: "New workflow events" },
      { id: "feed_stat_available", label: "Available earnings", value: `$${Number(db.earnings?.summary?.available || 0).toLocaleString()}`, hint: "Ready for payout request" }
    ],
    liveNow,
    upcoming,
    featuredReplays,
    followedSellers,
    openOpportunities,
    pipeline: {
      leads: (db.invites || []).filter((entry) => entry.userId === auth.user.id && entry.status === "pending").length,
      pitches: proposals.filter((proposal) => ["draft", "sent_to_brand"].includes(proposal.status)).length,
      negotiating: proposals.filter((proposal) => proposal.status === "in_negotiation").length,
      activeContracts: (db.contracts || []).filter((contract) => contract.userId === auth.user.id && ["active", "at_risk"].includes(contract.status)).length,
      publishedReplays: replays.filter((replay) => replay.published).length
    },
    recommendedActions: [
      { id: "feed_action_proposals", label: "Review active negotiations", target: "/proposals", context: `${proposals.filter((proposal) => proposal.status === "in_negotiation").length} proposal(s)` },
      { id: "feed_action_live", label: "Open upcoming live sessions", target: "/live-dashboard-2", context: `${upcoming.length} session(s)` },
      { id: "feed_action_money", label: "Check available balance", target: "/earnings", context: `$${Number(db.earnings?.summary?.available || 0).toLocaleString()}` }
    ],
    insights: [
      `Top category fit: ${profile?.categories?.[0] || "Beauty & Skincare"}`,
      `${featuredReplays.filter((item) => item.published).length} replay(s) already published for post-live distribution.`,
      `${followedSellers.length} supplier relationship(s) are available for faster pitching.`
    ],
    lastUpdatedAt: nowIso()
  };
}

function buildMyDayResponse(db, auth) {
  const tasks = (db.tasks || [])
    .filter((task) => task.userId === auth.user.id)
    .slice()
    .sort((left, right) => String(left.dueAt || "").localeCompare(String(right.dueAt || "")));
  const sessions = (db.liveSessions || [])
    .filter((session) => session.userId === auth.user.id)
    .slice()
    .sort((left, right) => String(left.scheduledFor || "").localeCompare(String(right.scheduledFor || "")));
  const proposals = (db.proposals || []).filter((proposal) => proposal.userId === auth.user.id && !["declined", "archived"].includes(proposal.status));
  const profile = findProfile(db, auth.user.id);
  const todayTasks = tasks.filter((task) => String(task.dueLabel || "").toLowerCase() === "today" || String(task.dueAt || "").startsWith("2026-03-03"));
  const completedToday = tasks.filter((task) => task.column === "done" && (String(task.updatedAt || "").startsWith("2026-03-03") || String(task.dueLabel || "").toLowerCase() === "today")).length;
  const activeSessions = sessions.filter((session) => ["scheduled", "live", "draft"].includes(String(session.status || "").toLowerCase()));

  const agenda = [
    ...activeSessions.slice(0, 3).map((session) => ({
      id: `agenda_${session.id}`,
      kind: "live",
      title: session.title,
      subtitle: `${session.seller} · ${session.time}`,
      startsAtISO: session.scheduledFor,
      target: `/live-studio?sessionId=${encodeURIComponent(session.id)}`
    })),
    ...todayTasks.slice(0, 4).map((task) => ({
      id: `agenda_${task.id}`,
      kind: "task",
      title: task.title,
      subtitle: `${task.brand || task.supplier || "Campaign task"} · ${task.priority || "Normal"}`,
      startsAtISO: task.dueAt,
      target: "/task-board"
    }))
  ].sort((left, right) => String(left.startsAtISO || "").localeCompare(String(right.startsAtISO || "")));

  const reminders = [
    { label: "Review proposal negotiations", target: "/proposals", tone: "warning" },
    { label: "Check today’s live setup", target: "/live-dashboard-2", tone: "info" },
    { label: "Confirm payout readiness", target: "/request-payout", tone: "success" }
  ];

  return {
    hero: {
      title: `${profile?.name || "Creator"} · My Day`,
      subtitle: "Your operating cockpit for tasks, lives, negotiations, and cashflow.",
      focus: activeSessions[0]?.title || "No live currently scheduled"
    },
    kpis: [
      { id: "myday_kpi_tasks", label: "Tasks due today", value: todayTasks.length, hint: `${completedToday} completed`, target: "/task-board" },
      { id: "myday_kpi_live", label: "Upcoming live sessions", value: activeSessions.length, hint: "Builder and studio ready", target: "/live-dashboard-2" },
      { id: "myday_kpi_negotiations", label: "Open negotiations", value: proposals.filter((proposal) => proposal.status === "in_negotiation").length, hint: "Needs fast follow-up", target: "/proposals" },
      { id: "myday_kpi_money", label: "Available earnings", value: `$${Number(db.earnings?.summary?.available || 0).toLocaleString()}`, hint: "Finance snapshot", target: "/earnings" }
    ],
    agenda,
    tasks: tasks.slice(0, 6),
    sessions: activeSessions.slice(0, 4),
    proposals: proposals.slice(0, 4),
    earningsSnapshot: db.earnings?.summary,
    reminders,
    crewSummary: (db.crew?.sessions || []).slice(0, 2).map((entry) => ({
      sessionId: entry.sessionId,
      assignments: entry.assignments.length
    })),
    lastUpdatedAt: nowIso()
  };
}

export function registerDashboardRoutes(router) {
  router.add("GET", "/health", { tag: "system", description: "Health check." }, async () => {
    return ok({ status: "ok" });
  });

  router.add("GET", "/api/routes", { tag: "system", description: "List all registered routes." }, async ({ routes }) => {
    return ok(routes);
  });

  router.add("GET", "/api/landing/content", { tag: "dashboard", description: "Public landing content for the creator portal." }, async ({ store }) => {
    const db = store.load();
    return ok(buildLandingContent(db));
  });

  router.add("GET", "/api/app/bootstrap", { tag: "dashboard", auth: true, description: "Return auth, nav badges, and key feature flags." }, async ({ auth, store }) => {
    const db = store.load();
    return ok({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        approvalStatus: auth.user.approvalStatus,
        onboardingCompleted: auth.user.onboardingCompleted,
        currentRole: auth.user.currentRole
      },
      creatorProfile: auth.profile,
      navBadges: summarizeNavBadges(db, auth.user.id),
      featureFlags: {
        proUnlocked: db.subscription.plan !== "basic",
        canMultiStream: db.subscription.plan !== "basic",
        canUseOverlaysPro: db.subscription.plan !== "basic"
      }
    });
  });

  router.add("GET", "/api/dashboard/feed", { tag: "dashboard", auth: true, description: "Aggregated feed data for the LiveDealz home surface." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(buildFeedResponse(db, auth));
  });

  router.add("GET", "/api/dashboard/my-day", { tag: "dashboard", auth: true, description: "Daily command center data for My Day." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(buildMyDayResponse(db, auth));
  });
}
