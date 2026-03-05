import { created, ok } from "../lib/http.js";
import { applySearch, ensure, id, nowIso, paginate, pushAudit, requireFields } from "../lib/utils.js";

function normalizeStatusToken(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "");
}

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

function canViewSubscription(access) {
  return Boolean(access.currentMember && access.effectivePermissions["subscription.view"]);
}

function canManageSubscription(access) {
  return Boolean(
    access.currentMember &&
      (
        access.effectivePermissions["roles.manage"] ||
        access.effectivePermissions["admin.manage_roles"] ||
        access.effectivePermissions["admin.manage_team"] ||
        String(access.currentMember.seat || "").toLowerCase() === "owner"
      )
  );
}

function ensureSubscriptionAccess(db, auth, { manage = false } = {}) {
  const access = resolveWorkspaceAccess(db, auth);
  ensure(access.currentMember, "Workspace member not found.", "WORKSPACE_MEMBER_NOT_FOUND", 403);
  ensure(canViewSubscription(access), "You do not have permission to view subscription details.", "FORBIDDEN", 403);
  if (manage) {
    ensure(canManageSubscription(access), "You do not have permission to manage the subscription.", "FORBIDDEN", 403);
  }
  return access;
}

function formatPayoutRecipient(settings = {}) {
  if (settings.detail) return String(settings.detail);

  const methodType = String(settings.methodType || "").toLowerCase();
  if (methodType === "mobile") {
    const provider = settings.mobile?.provider ? `${settings.mobile.provider} ` : "";
    const phone = settings.mobile?.numberMasked || settings.mobile?.phone || settings.mobile?.number;
    if (phone) return `${provider}${phone}`.trim();
  }

  if (methodType === "wallet") {
    return settings.wallet?.email || settings.wallet?.account || "Wallet payout";
  }

  const bankName = settings.bank?.bankName || settings.bank?.name;
  const accountName = settings.bank?.accountName;
  const accountNumber = settings.bank?.accountNumberMasked || settings.bank?.accountNumber;
  const parts = [bankName, accountName, accountNumber].filter(Boolean);
  if (parts.length) return parts.join(" • ");

  return "Primary payout account";
}

function buildEarningsResponse(db, auth) {
  ensure(db.earnings.userId === auth.user.id, "Earnings summary not found.", "EARNINGS_NOT_FOUND", 404);
  return {
    ...db.earnings,
    payoutMethod: {
      method: db.settings?.payout?.method || "Bank transfer",
      methodType: db.settings?.payout?.methodType || "bank",
      detail: formatPayoutRecipient(db.settings?.payout || {}),
      verificationStatus: db.settings?.payout?.verification?.status || "pending"
    },
    recentPayouts: db.payouts.filter((payout) => payout.userId === auth.user.id).slice(0, 5),
    lastUpdatedAt: db.earnings.lastUpdatedAt || nowIso()
  };
}

function buildAnalyticsResponse(db, auth) {
  ensure(db.analytics.userId === auth.user.id, "Analytics not found.", "ANALYTICS_NOT_FOUND", 404);
  return {
    ...db.analytics,
    lastUpdatedAt: db.analytics.lastUpdatedAt || nowIso()
  };
}

const SUBSCRIPTION_CATALOG = [
  {
    id: "basic",
    name: "Basic",
    emoji: "🟦",
    tagline: "Start strong with essential creator tools.",
    bestFor: "New creators testing workflows and building early momentum.",
    pricing: { monthly: 0, yearly: 0 },
    recommended: false,
    highlights: [
      "Core creator dashboard + essential studio tools",
      "Simple live setup with limited crew support",
      "Standard safety and moderation controls"
    ],
    includes: [
      "Creator profile and storefront basics",
      "Basic Live Sessionz scheduling",
      "Basic overlays (limited presets)",
      "Standard analytics snapshot",
      "Standard support"
    ],
    limits: {
      liveSessionz: "Up to 4 / month",
      shoppableAdz: "Up to 10 / month",
      livePlusShoppables: "Up to 2 / month",
      crewPerLive: "Up to 2",
      streamDestinations: "1 destination",
      storage: "1 GB",
      analyticsHistory: "30 days",
      notifications: "200 / month",
      seats: "1 seat"
    },
    caps: {
      liveSessionz: 4,
      shoppableAdz: 10,
      livePlusShoppables: 2,
      crewPerLive: 2,
      streamDestinations: 1,
      storageGb: 1,
      analyticsMonths: 1,
      notifications: 200,
      seats: 1
    }
  },
  {
    id: "pro",
    name: "Pro",
    emoji: "🟧",
    tagline: "Unlock the full creator toolset and grow faster.",
    bestFor: "Creators who run frequent lives, campaigns, and promotion at scale.",
    pricing: { monthly: 49, yearly: 490 },
    recommended: true,
    highlights: [
      "Unlimited Dealz across Live Sessionz, Shoppable Adz, and Live + Shoppables",
      "Unlimited crew members per live session",
      "Multi-platform streaming + Pro overlays + deeper analytics"
    ],
    includes: [
      "Unlimited Dealz + scheduling",
      "Multi-platform streaming",
      "Overlays & CTAs Pro (QR, timers, banners)",
      "Audience notifications + automation",
      "Post-live publisher (clips + repurposing)",
      "Advanced analytics + exports",
      "Priority support"
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "50 GB",
      analyticsHistory: "12 months",
      notifications: "Unlimited",
      seats: "Up to 5 seats"
    },
    caps: {
      liveSessionz: null,
      shoppableAdz: null,
      livePlusShoppables: null,
      crewPerLive: null,
      streamDestinations: null,
      storageGb: 50,
      analyticsMonths: 12,
      notifications: null,
      seats: 5
    }
  },
  {
    id: "enterprise",
    name: "Enterprise",
    emoji: "🏢",
    tagline: "Agency-grade governance, multi-seat, and custom enablement.",
    bestFor: "Agencies managing multiple creators, brand deals, and teams.",
    pricing: { monthly: 199, yearly: 1990 },
    recommended: false,
    highlights: [
      "Multi-creator roster, seats, and approval workflows",
      "Compliance controls, audit exports, and optional SSO",
      "Unlimited across all creator tools with agency support"
    ],
    includes: [
      "Everything in Pro",
      "Agency workspace + multi-seat management",
      "Roles & permissions + approvals",
      "Audit log exports + scheduled reports",
      "Optional API & webhooks",
      "Dedicated success manager + SLA options",
      "Central billing + invoice controls"
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "200 GB (customizable)",
      analyticsHistory: "24 months (customizable)",
      notifications: "Unlimited",
      seats: "Unlimited workspace seats"
    },
    caps: {
      liveSessionz: null,
      shoppableAdz: null,
      livePlusShoppables: null,
      crewPerLive: null,
      streamDestinations: null,
      storageGb: 200,
      analyticsMonths: 24,
      notifications: null,
      seats: null
    }
  }
];

const SUBSCRIPTION_COMPARISON_ROWS = [
  {
    category: "Core",
    feature: "Dealz (Live Sessionz)",
    basic: { value: "limited", note: "Up to 4 / month" },
    pro: { value: "included" },
    enterprise: { value: "included" }
  },
  {
    category: "Core",
    feature: "Dealz (Shoppable Adz)",
    basic: { value: "limited", note: "Up to 10 / month" },
    pro: { value: "included" },
    enterprise: { value: "included" }
  },
  {
    category: "Live Studio",
    feature: "Crew members per live",
    basic: { value: "limited", note: "Up to 2" },
    pro: { value: "included" },
    enterprise: { value: "included" }
  },
  {
    category: "Live Studio",
    feature: "Multi-platform streaming",
    basic: { value: "limited", note: "1 destination" },
    pro: { value: "included" },
    enterprise: { value: "included" }
  },
  {
    category: "Growth",
    feature: "Audience notifications",
    basic: { value: "limited", note: "200 / month" },
    pro: { value: "included" },
    enterprise: { value: "included" }
  },
  {
    category: "Growth",
    feature: "Advanced analytics + exports",
    basic: { value: "limited", note: "Snapshot only" },
    pro: { value: "included", note: "Exports + trends" },
    enterprise: { value: "included", note: "Scheduled reports" }
  },
  {
    category: "Collaboration",
    feature: "Seats / team access",
    basic: { value: "limited", note: "1 seat" },
    pro: { value: "limited", note: "Up to 5 seats" },
    enterprise: { value: "included", note: "Unlimited seats" }
  },
  {
    category: "Compliance",
    feature: "Roles, permissions, approvals",
    basic: { value: "not" },
    pro: { value: "limited", note: "Core roles" },
    enterprise: { value: "included" }
  },
  {
    category: "Compliance",
    feature: "Audit log exports",
    basic: { value: "not" },
    pro: { value: "limited", note: "Recent window" },
    enterprise: { value: "included" }
  },
  {
    category: "Support",
    feature: "Priority support",
    basic: { value: "limited", note: "72h" },
    pro: { value: "included", note: "24h" },
    enterprise: { value: "included", note: "Dedicated CSM" }
  }
];

const SUBSCRIPTION_FEATURE_SPOTLIGHTS = [
  {
    id: "multistream",
    title: "Multi-platform streaming",
    description: "Publish one live session to more destinations when your plan allows it.",
    route: "/Stream-platform",
    minPlan: "pro"
  },
  {
    id: "overlays",
    title: "Overlays & CTAs Pro",
    description: "Use QR codes, countdowns, banners, and stronger call-to-action layers.",
    route: "/overlays-ctas",
    minPlan: "pro"
  },
  {
    id: "automation",
    title: "Audience automation",
    description: "Schedule reminders and live alerts before, during, and after the session.",
    route: "/audience-notification",
    minPlan: "pro"
  },
  {
    id: "compliance",
    title: "Workspace governance",
    description: "Roles, approvals, and audit history become more important as your team grows.",
    route: "/roles-permissions",
    minPlan: "enterprise"
  }
];

function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount);
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "—");
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function shiftDate(dateValue, cycle, steps = 1) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return new Date();
  if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() - steps);
  } else {
    date.setMonth(date.getMonth() - steps);
  }
  return date;
}

function computeNextRenewal(cycle) {
  const renewal = new Date();
  if (cycle === "yearly") renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);
  return renewal.toISOString().slice(0, 10);
}

function bytesToLabel(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(value / (1024 * 1024)))} MB`;
}

function buildInvoiceHistory(subscription, planMeta, profile, settings) {
  if (!planMeta || (planMeta.pricing?.[subscription.cycle] || 0) === 0) return [];

  const cycle = subscription.cycle || "monthly";
  const amount = Number(planMeta.pricing?.[cycle] || 0);
  const currency = settings?.profile?.currency || settings?.payout?.currency || "USD";
  const renewalBase = subscription.renewsAt || computeNextRenewal(cycle);

  return [0, 1, 2].map((step) => {
    const invoiceDate = shiftDate(renewalBase, cycle, step + 1);
    return {
      id: `INV-${invoiceDate.getFullYear()}-${String(step + 1).padStart(4, "0")}`,
      issuedAt: invoiceDate.toISOString().slice(0, 10),
      amount,
      currency,
      amountLabel: formatCurrency(amount, currency),
      status: "Paid",
      description: `${planMeta.name} ${cycle} plan`,
      billedTo: settings?.billingEmail || settings?.profile?.email || profile?.name || "Workspace owner"
    };
  });
}

function buildSubscriptionUsage(db, auth, planMeta) {
  const liveSessionsUsed = db.liveSessions.filter((session) => session.userId === auth.user.id).length;
  const adzUsed = db.adzCampaigns.filter((campaign) => campaign.userId === auth.user.id).length;
  const linkedLivesUsed = db.liveSessions.filter((session) => session.userId === auth.user.id && session.featuredItems?.length).length;
  const storageBytes = db.uploads.filter((upload) => upload.userId === auth.user.id).reduce((sum, upload) => sum + Number(upload.size || 0), 0);
  const activeSeats = db.members.filter((member) => String(member.status || "").toLowerCase() === "active").length;
  const inviteSeats = db.members.filter((member) => String(member.status || "").toLowerCase() === "invited").length;
  const audienceNotificationsUsed = db.notifications.filter((entry) => entry.userId === auth.user.id).length;

  const entries = [
    {
      id: "live-sessionz",
      label: "Live Sessionz",
      used: liveSessionsUsed,
      usedLabel: `${liveSessionsUsed}`,
      limitLabel: planMeta.limits.liveSessionz,
      cap: planMeta.caps.liveSessionz,
      helper: "Count of live sessions created in the creator workspace."
    },
    {
      id: "shoppable-adz",
      label: "Shoppable Adz",
      used: adzUsed,
      usedLabel: `${adzUsed}`,
      limitLabel: planMeta.limits.shoppableAdz,
      cap: planMeta.caps.shoppableAdz,
      helper: "Published and draft ad campaigns in the current account."
    },
    {
      id: "live-plus-shoppables",
      label: "Live + Shoppables",
      used: linkedLivesUsed,
      usedLabel: `${linkedLivesUsed}`,
      limitLabel: planMeta.limits.livePlusShoppables,
      cap: planMeta.caps.livePlusShoppables,
      helper: "Live sessions already carrying linked items or campaign payloads."
    },
    {
      id: "storage",
      label: "Asset storage",
      used: storageBytes,
      usedLabel: bytesToLabel(storageBytes),
      limitLabel: planMeta.limits.storage,
      cap: planMeta.caps.storageGb ? planMeta.caps.storageGb * 1024 * 1024 * 1024 : null,
      helper: "Uploaded files and working assets associated with this creator workspace."
    },
    {
      id: "notifications",
      label: "Audience notifications",
      used: audienceNotificationsUsed,
      usedLabel: `${audienceNotificationsUsed}`,
      limitLabel: planMeta.limits.notifications,
      cap: planMeta.caps.notifications,
      helper: "Audience reminder and alert records currently associated with the account."
    },
    {
      id: "seats",
      label: "Workspace seats",
      used: activeSeats + inviteSeats,
      usedLabel: `${activeSeats} active • ${inviteSeats} invited`,
      limitLabel: planMeta.limits.seats,
      cap: planMeta.caps.seats,
      helper: "Team members plus invited workspace collaborators."
    }
  ];

  return entries.map((entry) => ({
    ...entry,
    utilizationPct: entry.cap && entry.cap > 0 ? Math.max(0, Math.min(100, Math.round((entry.used / entry.cap) * 100))) : null,
    remainingLabel:
      entry.cap && entry.cap > 0
        ? `${Math.max(0, entry.cap - entry.used)} remaining`
        : "Unlimited"
  }));
}

function buildSubscriptionResponse(db, auth) {
  ensure(db.subscription.userId === auth.user.id, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND", 404);
  const access = ensureSubscriptionAccess(db, auth);
  const current = db.subscription;
  const planMeta = SUBSCRIPTION_CATALOG.find((plan) => plan.id === current.plan) || SUBSCRIPTION_CATALOG[0];
  const paymentMethod = current.billingMethod || {
    type: current.plan === "basic" ? "free" : "card",
    label: current.plan === "basic" ? "Free plan — no billing card required" : "Visa ending in 4242",
    brand: current.plan === "basic" ? undefined : "Visa",
    last4: current.plan === "basic" ? undefined : "4242",
    holderName: auth.profile?.name || db.settings?.profile?.name || "Workspace Owner",
    expMonth: current.plan === "basic" ? undefined : 12,
    expYear: current.plan === "basic" ? undefined : 2028
  };
  const invoices = buildInvoiceHistory(current, planMeta, auth.profile, db.settings);
  const workspaceSummary = {
    activeSeats: db.members.filter((member) => String(member.status || "").toLowerCase() === "active").length,
    invitedSeats: db.members.filter((member) => String(member.status || "").toLowerCase() === "invited").length,
    seatLimitLabel: planMeta.limits.seats,
    canManageRoles: Boolean(access.effectivePermissions["roles.manage"] || access.effectivePermissions["admin.manage_roles"]),
    approvalsEnabled: planMeta.id !== "basic",
    auditExportsEnabled: planMeta.id === "enterprise"
  };

  return {
    ...current,
    planCatalog: SUBSCRIPTION_CATALOG,
    comparisonRows: SUBSCRIPTION_COMPARISON_ROWS,
    featureSpotlights: SUBSCRIPTION_FEATURE_SPOTLIGHTS,
    currentPlanMeta: planMeta,
    canManageBilling: canManageSubscription(access),
    billingEmail: current.billingEmail || db.settings?.profile?.email || auth.user.email,
    paymentMethod,
    workspaceSummary,
    usage: buildSubscriptionUsage(db, auth, planMeta),
    invoices,
    support: current.support || {
      contactEmail: "support@mylivedealz.com",
      salesEmail: "sales@mylivedealz.com",
      helpCenterUrl: "https://support.mylivedealz.com/hc",
      managerName: planMeta.id === "enterprise" ? "Success Team" : "Creator Support"
    },
    notes:
      current.notes || [
        "Subscriptions unlock creator tools like multi-platform streaming, pro overlays, and advanced analytics.",
        "Your creator rank is performance-based and is not changed by the subscription plan.",
        "Visibility of this page is still controlled from Roles & Permissions."
      ],
    lastUpdatedAt: current.updatedAt || nowIso(),
    renewalLabel: current.status === "active" ? formatDateLabel(current.renewsAt) : "—"
  };
}

export function registerFinanceRoutes(router) {
  router.add("GET", "/api/earnings/summary", { tag: "finance", auth: true, description: "Earnings overview, breakdowns, and forecast." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(buildEarningsResponse(db, auth));
  });

  router.add("GET", "/api/earnings/payouts", { tag: "finance", auth: true, description: "Payout history and scheduled payouts." }, async ({ auth, query, store }) => {
    const db = store.load();
    let items = db.payouts.filter((payout) => payout.userId === auth.user.id);
    items = applySearch(items, query.get("q"), ["reference", "method", "recipient", "status", "notes"]);

    if (query.get("status")) {
      const expected = normalizeStatusToken(query.get("status"));
      items = items.filter((payout) => normalizeStatusToken(payout.status) === expected);
    }

    items = [...items].sort((left, right) => String(right.date).localeCompare(String(left.date)));
    const page = paginate(items, query);
    return ok(page.data, page.meta);
  });

  router.add("POST", "/api/earnings/payouts/request", { tag: "finance", auth: true, description: "Create a payout request." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    requireFields(body, ["amount", "method"]);
    const amount = Number(body.amount);

    const payout = store.update((db) => {
      ensure(db.earnings.userId === auth.user.id, "Earnings summary not found.", "EARNINGS_NOT_FOUND", 404);
      ensure(amount > 0, "Payout amount must be greater than zero.");
      ensure(amount <= db.earnings.summary.available, "Payout amount exceeds available balance.", "INSUFFICIENT_BALANCE", 400);

      const currency = body.currency || db.earnings.summary.currency || "USD";
      const fee = Number(body.fee || 0);
      const recipient = body.recipient || formatPayoutRecipient(db.settings?.payout || {});
      const payout = {
        id: id("payout"),
        userId: auth.user.id,
        date: nowIso().slice(0, 10),
        requestedAt: nowIso(),
        amount,
        currency,
        status: "Requested",
        method: String(body.method),
        recipient,
        estimatedSettlement: body.estimatedSettlement || "Within 48 Hours",
        fee,
        netAmount: Math.max(0, amount - fee),
        notes: body.notes ? String(body.notes) : "Requested from creator finance workspace.",
        reference: `MLDZ-P-${Math.floor(Math.random() * 9000) + 1000}`
      };

      db.earnings.summary.available -= amount;
      db.earnings.summary.pending += amount;
      db.payouts.unshift(payout);
      pushAudit(db, { actor: auth.user.email, action: "Payout requested", detail: `${amount} ${currency}`, severity: "info" });
      return payout;
    });

    return created(payout);
  });

  router.add("GET", "/api/analytics/overview", { tag: "finance", auth: true, description: "Analytics rank and leaderboard overview." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(buildAnalyticsResponse(db, auth));
  });

  router.add("GET", "/api/subscription", { tag: "finance", auth: true, description: "Subscription plan, billing, usage, and comparison data." }, async ({ auth, store }) => {
    const db = store.load();
    return ok(buildSubscriptionResponse(db, auth));
  });

  router.add("PATCH", "/api/subscription", { tag: "finance", auth: true, description: "Change plan or billing cycle." }, async ({ auth, readBody, store }) => {
    const body = await readBody();
    const allowedPlans = ["basic", "pro", "enterprise"];
    const allowedCycles = ["monthly", "yearly"];
    if (body.plan !== undefined) ensure(allowedPlans.includes(body.plan), "Unknown subscription plan.");
    if (body.cycle !== undefined) ensure(allowedCycles.includes(body.cycle), "Unknown billing cycle.");

    store.update((db) => {
      ensureSubscriptionAccess(db, auth, { manage: true });
      ensure(db.subscription.userId === auth.user.id, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND", 404);
      if (body.plan !== undefined) db.subscription.plan = body.plan;
      if (body.cycle !== undefined) db.subscription.cycle = body.cycle;
      if (body.cancelAtPeriodEnd !== undefined) db.subscription.cancelAtPeriodEnd = Boolean(body.cancelAtPeriodEnd);
      db.subscription.status = db.subscription.status || "active";
      db.subscription.renewsAt = computeNextRenewal(db.subscription.cycle || "monthly");
      db.subscription.updatedAt = nowIso();
      pushAudit(db, {
        actor: auth.user.email,
        action: "Subscription updated",
        detail: `${db.subscription.plan}/${db.subscription.cycle}`,
        severity: "info"
      });
      return db.subscription;
    });

    const db = store.load();
    return ok(buildSubscriptionResponse(db, auth));
  });
}
