import React, { useMemo, useState } from "react";

import { sellerBackendApi } from "../../../lib/backendApi";


void sellerBackendApi.getWorkflowScreenState("seller-feature:livedealz/team/SupplierRolesPermissionsPage").catch(() => undefined);

/**
 * SupplierRolesPermissionsPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: Roles Permissions_Creator.tsx
 *
 * Mirror-first preserved:
 * - PageHeader actions (Invite / New role)
 * - Sticky tab bar (Roles / Members / Invites / Creators & Guests / Security & Audit)
 * - Summary cards row (Seats, Roles, Capabilities, Security)
 * - Roles tab: left role list + right role editor + permission groups with Enable all / Disable all
 * - Members tab: premium table with inline role selector + status + 2FA + actions
 * - Invites tab: table + copy/revoke + invite policy card
 * - Creators & Guests tab: safeguards card + expiry controls + quick actions
 * - Security tab: toggles + audit log stream
 * - Modals: Edit role / Create role / Invite member
 *
 * Supplier adaptations (minimal + required):
 * - Permission groups are Supplier-side: Overview, Campaigns & Collabs, Live, Adz, Deliverables, Analytics, Contracts, Team & Ops.
 * - “Suppliers & Guests” becomes “Creators & Guests” (supplier invites creator guests/co-hosts and agencies).
 * - Includes supplier-specific sensitive perms: approve/reject creator assets, accept proposals, generate contracts, manage payouts.
 * - Includes role-awareness concept: “Supplier acting as creator” permissions (campaign/content execution without external creators).
 *
 * Notes:
 * - UI-only live data; wire to your RBAC + API.
 * - No external icon libraries to keep the canvas runnable.
 */

const ORANGE = "#f77f00";

/* ------------------------- Icon stubs (replace with your icon system in-app) ------------------------- */

const I = ({ children, className = "", title }) => (
  <span className={className} title={title} aria-hidden="true">
    {children}
  </span>
);

const AlertTriangle = (p) => <I {...p}>⚠️</I>;
const BadgeCheck = (p) => <I {...p}>✅</I>;
const Ban = (p) => <I {...p}>⛔</I>;
const Building2 = (p) => <I {...p}>🏢</I>;
const CalendarClock = (p) => <I {...p}>🗓️</I>;
const Check = (p) => <I {...p}>✓</I>;
const CheckCircle2 = (p) => <I {...p}>✅</I>;
const Copy = (p) => <I {...p}>⧉</I>;
const Crown = (p) => <I {...p}>👑</I>;
const ExternalLink = (p) => <I {...p}>↗</I>;
const Eye = (p) => <I {...p}>👁️</I>;
const FileText = (p) => <I {...p}>📄</I>;
const FolderOpen = (p) => <I {...p}>📁</I>;
const Globe = (p) => <I {...p}>🌐</I>;
const HelpCircle = (p) => <I {...p}>❓</I>;
const KeyRound = (p) => <I {...p}>🔑</I>;
const Layers = (p) => <I {...p}>🧩</I>;
const Minus = (p) => <I {...p}>−</I>;
const Pencil = (p) => <I {...p}>✎</I>;
const Plus = (p) => <I {...p}>＋</I>;
const Save = (p) => <I {...p}>💾</I>;
const Search = (p) => <I {...p}>🔎</I>;
const Settings = (p) => <I {...p}>⚙️</I>;
const ShieldCheck = (p) => <I {...p}>🛡️</I>;
const Sparkles = (p) => <I {...p}>✨</I>;
const Trash2 = (p) => <I {...p}>🗑️</I>;
const TrendingUp = (p) => <I {...p}>📈</I>;
const User = (p) => <I {...p}>👤</I>;
const UserPlus = (p) => <I {...p}>➕</I>;
const Users = (p) => <I {...p}>👥</I>;
const Video = (p) => <I {...p}>🎥</I>;

/* ------------------------- Helpers ------------------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function nowLabel() {
  return new Date().toLocaleString();
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, tone = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-24 right-3 md:right-6 z-[80] flex flex-col gap-2 w-[min(420px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success"
              ? "border-emerald-200 dark:border-emerald-800"
              : t.tone === "error"
                ? "border-rose-200 dark:border-rose-800"
                : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-start gap-2">
            <span
              className={cx(
                "mt-1.5 h-2 w-2 rounded-full",
                t.tone === "success" ? "bg-emerald-500" : t.tone === "error" ? "bg-rose-500" : "bg-amber-500"
              )}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PageHeader({ pageTitle, rightContent }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Supplier workspace access control for Live, Shoppable Adz, Deliverables, and Creator Collabs.
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-bold dark:text-slate-50">{title}</div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Pill({ tone = "neutral", icon, text, title }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400"
          : tone === "brand"
            ? "text-white border-transparent"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {icon}
      {text}
    </span>
  );
}

function SmallBtn({ tone = "neutral", icon, children, onClick, disabled, title }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, disabled, label, hint }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</div>
        </div>
        {hint ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</div> : null}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-6 w-11 rounded-full border transition",
          checked ? "border-transparent" : "border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-900",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={checked ? { background: ORANGE } : undefined}
        aria-label={label}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-slate-100 shadow transition",
            checked ? "left-[22px]" : "left-[2px]"
          )}
        />
      </button>
    </div>
  );
}

/* ---------------- Permission Model (Supplier) ---------------- */

const PERM_GROUPS = [
  {
    id: "overview",
    title: "Overview & Dealz",
    icon: <Layers className="h-4 w-4" />,
    desc: "LiveDealz Feed, My Campaigns command center, and Dealz Marketplace browsing.",
    perms: [
      { id: "overview.feed.view", label: "View LiveDealz Feed", surface: ["Web"] },
      { id: "overview.campaigns.view", label: "View My Campaigns", hint: "Central lifecycle monitor + creator engagement status.", surface: ["Web"] },
      { id: "overview.campaigns.create", label: "Create campaigns", hint: "Campaign Builder with Creator Usage Decision + Collab mode.", surface: ["Web"], sensitive: true },
      { id: "overview.dealz.view", label: "View Dealz Marketplace", surface: ["Web"] },
      { id: "overview.dealz.publish_links", label: "Generate share links", hint: "Copy links, UTM, short links if enabled.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "collabs",
    title: "Campaigns & Creator Collabs",
    icon: <Users className="h-4 w-4" />,
    desc: "Open Collabs & Invite-only flows: pitches, proposals, negotiation and contracts.",
    perms: [
      { id: "collabs.board.view", label: "View Campaigns Board", surface: ["Web"] },
      { id: "collabs.creators.directory", label: "View Creator Directory", surface: ["Web"] },
      { id: "collabs.creators.manage", label: "Manage My Creators", hint: "Favorite, blocklist, preferred terms.", surface: ["Web"] },
      { id: "collabs.invites.view", label: "View Invites from Creators", surface: ["Web"] },
      { id: "collabs.proposals.view", label: "View Proposals", surface: ["Web"] },
      { id: "collabs.proposals.accept", label: "Accept / reject proposals", hint: "Creates binding next steps.", surface: ["Web"], sensitive: true },
      { id: "collabs.contracts.view", label: "View Contracts", surface: ["Web"] },
      { id: "collabs.contracts.generate", label: "Generate / confirm contracts", hint: "Contract creation from proposal.", surface: ["Web"], sensitive: true },
      { id: "collabs.negotiation.room", label: "Access Negotiation Room", hint: "Counter terms, timelines, approvals.", surface: ["Web"], sensitive: true },
      { id: "collabs.campaign.switch_mode", label: "Switch collab mode (pre-submission)", hint: "Allowed only before content submission.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "supplier_as_creator",
    title: "Supplier Acting as Creator",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "When supplier selects “I will NOT use a Creator”: execute content and publishing internally.",
    perms: [
      { id: "sac.enable", label: "Enable supplier-hosted execution", hint: "Create content without external creator.", surface: ["Web"], sensitive: true },
      { id: "sac.submit_content", label: "Submit content for approval", surface: ["Web"] },
      { id: "sac.publish", label: "Publish supplier-created assets", hint: "Routes to Admin if required.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "adz_core",
    title: "Shoppable Adz",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "Adz Dashboard, Adz Marketplace, Adz Manager and publishing controls.",
    perms: [
      { id: "adz.view", label: "View Adz Dashboard", surface: ["Web"] },
      { id: "adz.marketplace", label: "Browse Adz Marketplace", surface: ["Web"] },
      { id: "adz.manage", label: "Use Adz Manager", hint: "Build, edit, schedule, and run Adz.", surface: ["Web"] },
      { id: "adz.generate", label: "Generate / publish Adz", hint: "Enables distribution + tracking.", surface: ["Web"], sensitive: true },
      { id: "adz.tracking", label: "Manage tracking links", hint: "UTM presets, destinations, short links.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "live",
    title: "Live Sessionz",
    icon: <Video className="h-4 w-4" />,
    desc: "Live Dashboard, scheduling calendar, Live Studio and replays.",
    perms: [
      { id: "live.view", label: "View Live Dashboard", surface: ["Web"] },
      { id: "live.schedule", label: "Manage Live Schedule", hint: "Create/edit timeslots and staffing.", surface: ["Web"] },
      { id: "live.studio.access", label: "Access Live Studio", surface: ["Web"], sensitive: true },
      { id: "live.go_live", label: "Start / end live", hint: "Go live controls.", surface: ["Web"], sensitive: true },
      { id: "live.replays", label: "View Replays & Clips", surface: ["Web"] }
    ]
  },
  {
    id: "deliverables",
    title: "Deliverables & Approvals",
    icon: <FolderOpen className="h-4 w-4" />,
    desc: "Task Board, Asset Library review, Links Hub and approvals pipeline.",
    perms: [
      { id: "taskboard.view", label: "View Task Board", surface: ["Web"] },
      { id: "taskboard.manage", label: "Manage tasks", hint: "Assign, set due dates, SLA rules.", surface: ["Web"] },
      { id: "assets.view", label: "View Asset Library", surface: ["Web"] },
      { id: "assets.upload", label: "Upload assets", surface: ["Web"] },
      { id: "assets.review", label: "Approve / request changes / reject assets", hint: "Supplier manual approval stage.", surface: ["Web"], sensitive: true },
      { id: "linkshub.view", label: "View Links Hub", surface: ["Web"] },
      { id: "linkshub.manage", label: "Manage links & QR", hint: "Short links, QR overlays, pinned links.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Status",
    icon: <TrendingUp className="h-4 w-4" />,
    desc: "Insights, status tracking, exports and performance drilldowns.",
    perms: [
      { id: "analytics.view", label: "View Analytics & Status", surface: ["Web"] },
      { id: "analytics.export", label: "Export reports", surface: ["Web"], sensitive: true },
      { id: "analytics.ai_insights", label: "AI insights & recommendations", hint: "Performance optimization suggestions.", surface: ["Web"] }
    ]
  },
  {
    id: "money",
    title: "Contracts & Money",
    icon: <KeyRound className="h-4 w-4" />,
    desc: "Contract value, payouts, settlements and statements.",
    perms: [
      { id: "money.view", label: "View statements", surface: ["Web"], sensitive: true },
      { id: "money.release_payout", label: "Release creator payout", hint: "Approval-based payouts.", surface: ["Web"], sensitive: true },
      { id: "money.disputes", label: "Manage disputes", hint: "Renegotiations, terminations, evidence.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "tracking",
    title: "Tracking & Integrations",
    icon: <Globe className="h-4 w-4" />,
    desc: "Pixels, destinations, attribution notes, monitoring.",
    perms: [
      { id: "tracking.view", label: "View Tracking & Integrations", surface: ["Web"] },
      { id: "tracking.manage_pixels", label: "Manage pixels / destinations", surface: ["Web"], sensitive: true },
      { id: "tracking.monitor", label: "View link monitor & history", surface: ["Web"] }
    ]
  },
  {
    id: "team_ops",
    title: "Team & Ops",
    icon: <Users className="h-4 w-4" />,
    desc: "Crew Manager, availability, and staffing policies.",
    perms: [
      { id: "crew.view", label: "View Crew Manager", surface: ["Web"] },
      { id: "crew.assign", label: "Assign Host/Producer/Moderator/Co-host", surface: ["Web"], sensitive: true },
      { id: "crew.override_conflicts", label: "Override conflicts", hint: "Requires justification and audit.", surface: ["Web"], sensitive: true },
      { id: "availability.view_team", label: "View team availability", hint: "Privacy-sensitive.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "admin",
    title: "Workspace Settings",
    icon: <Settings className="h-4 w-4" />,
    desc: "Members, roles, devices, policies and audit logs.",
    perms: [
      { id: "admin.manage_members", label: "Manage members", surface: ["Web"], sensitive: true },
      { id: "admin.manage_roles", label: "Manage roles & permissions", surface: ["Web"], sensitive: true },
      { id: "admin.security", label: "Security settings (2FA, SSO)", surface: ["Web"], sensitive: true },
      { id: "admin.audit", label: "View audit log", surface: ["Web"], sensitive: true }
    ]
  }
];

function allPermIds() {
  return PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
}

function buildPermMap(ids, value) {
  const m = {};
  ids.forEach((id) => (m[id] = value));
  return m;
}

const SYSTEM_ROLE_IDS = [
  "owner",
  "supplier_manager",
  "collab_manager",
  "adz_manager",
  "live_producer",
  "moderator",
  "analyst",
  "finance",
  "support_ops",
  "creator_guest",
  "viewer"
];

function defaultRoles() {
  const ids = allPermIds();
  const none = buildPermMap(ids, false);

  const owner = {
    id: "owner",
    name: "Supplier Owner",
    badge: "System",
    icon: <Crown className="h-4 w-4" />,
    description: "Full access across campaigns, collabs, approvals, payouts, and workspace settings.",
    perms: buildPermMap(ids, true)
  };

  const supplierManager = {
    id: "supplier_manager",
    name: "Supplier Manager",
    badge: "System",
    icon: <BadgeCheck className="h-4 w-4" />,
    description: "Ops lead: manages campaigns, schedules live, approves deliverables (if allowed), and coordinates creators.",
    perms: {
      ...none,
      "overview.feed.view": true,
      "overview.campaigns.view": true,
      "overview.campaigns.create": true,
      "overview.dealz.view": true,
      "collabs.board.view": true,
      "collabs.creators.directory": true,
      "collabs.creators.manage": true,
      "collabs.invites.view": true,
      "collabs.proposals.view": true,
      "collabs.negotiation.room": true,
      "collabs.contracts.view": true,
      "adz.view": true,
      "adz.marketplace": true,
      "adz.manage": true,
      "adz.generate": true,
      "live.view": true,
      "live.schedule": true,
      "live.studio.access": true,
      "live.replays": true,
      "taskboard.view": true,
      "taskboard.manage": true,
      "assets.view": true,
      "assets.upload": true,
      "assets.review": true,
      "linkshub.view": true,
      "linkshub.manage": true,
      "analytics.view": true,
      "analytics.export": true,
      "tracking.view": true,
      "tracking.monitor": true,
      "crew.view": true,
      "availability.view_team": true
    }
  };

  const collabManager = {
    id: "collab_manager",
    name: "Collabs Manager",
    badge: "System",
    icon: <Users className="h-4 w-4" />,
    description: "Manages creator selection, proposals, contracts and renegotiations.",
    perms: {
      ...none,
      "overview.campaigns.view": true,
      "overview.dealz.view": true,
      "collabs.board.view": true,
      "collabs.creators.directory": true,
      "collabs.creators.manage": true,
      "collabs.invites.view": true,
      "collabs.proposals.view": true,
      "collabs.proposals.accept": true,
      "collabs.negotiation.room": true,
      "collabs.contracts.view": true,
      "collabs.contracts.generate": true,
      "collabs.campaign.switch_mode": true,
      "assets.view": true,
      "assets.review": true,
      "money.view": true
    }
  };

  const adzManager = {
    id: "adz_manager",
    name: "Adz Manager",
    badge: "System",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Builds Shoppable Adz, configures tracking, and publishes.",
    perms: {
      ...none,
      "overview.feed.view": true,
      "overview.dealz.view": true,
      "adz.view": true,
      "adz.marketplace": true,
      "adz.manage": true,
      "adz.generate": true,
      "adz.tracking": true,
      "assets.view": true,
      "assets.upload": true,
      "assets.review": true,
      "tracking.view": true,
      "tracking.manage_pixels": true,
      "tracking.monitor": true,
      "analytics.view": true
    }
  };

  const liveProducer = {
    id: "live_producer",
    name: "Live Producer",
    badge: "System",
    icon: <Video className="h-4 w-4" />,
    description: "Runs live sessions: schedule, studio ops, safety coordination, and replay workflows.",
    perms: {
      ...none,
      "live.view": true,
      "live.schedule": true,
      "live.studio.access": true,
      "live.go_live": true,
      "live.replays": true,
      "crew.view": true,
      "crew.assign": true,
      "availability.view_team": true,
      "assets.view": true,
      "linkshub.view": true,
      "linkshub.manage": true
    }
  };

  const moderator = {
    id: "moderator",
    name: "Moderator",
    badge: "System",
    icon: <ShieldCheck className="h-4 w-4" />,
    description: "Live safety moderation (no publishing or payout controls).",
    perms: {
      ...none,
      "live.view": true,
      "live.studio.access": true,
      "assets.view": true
    }
  };

  const analyst = {
    id: "analyst",
    name: "Analyst",
    badge: "System",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Views analytics and exports performance reports.",
    perms: {
      ...none,
      "analytics.view": true,
      "analytics.export": true,
      "overview.campaigns.view": true,
      "overview.dealz.view": true,
      "adz.view": true,
      "live.view": true
    }
  };

  const finance = {
    id: "finance",
    name: "Finance",
    badge: "System",
    icon: <KeyRound className="h-4 w-4" />,
    description: "Statements and payout operations (sensitive).",
    perms: {
      ...none,
      "money.view": true,
      "money.release_payout": true,
      "money.disputes": true,
      "admin.audit": true
    }
  };

  const supportOps = {
    id: "support_ops",
    name: "Support Ops (Viewer)",
    badge: "System",
    icon: <Eye className="h-4 w-4" />,
    description: "Read-only troubleshooting access (no edits).",
    perms: {
      ...none,
      "overview.feed.view": true,
      "overview.campaigns.view": true,
      "overview.dealz.view": true,
      "adz.view": true,
      "live.view": true,
      "assets.view": true,
      "tracking.view": true,
      "admin.audit": true
    }
  };

  const creatorGuest = {
    id: "creator_guest",
    name: "Creator Guest (Session-only)",
    badge: "System",
    icon: <Building2 className="h-4 w-4" />,
    description: "Limited guest access for creators on session-scoped collaboration (no approvals).",
    perms: {
      ...none,
      "live.view": true,
      "live.studio.access": true,
      "assets.view": true,
      "linkshub.view": true
    }
  };

  const viewer = {
    id: "viewer",
    name: "Viewer",
    badge: "System",
    icon: <Eye className="h-4 w-4" />,
    description: "Read-only access to key pages (no exports, no edits).",
    perms: {
      ...none,
      "overview.feed.view": true,
      "overview.campaigns.view": true,
      "overview.dealz.view": true,
      "adz.view": true,
      "live.view": true,
      "assets.view": true,
      "analytics.view": true
    }
  };

  return [owner, supplierManager, collabManager, adzManager, liveProducer, moderator, analyst, finance, supportOps, creatorGuest, viewer];
}

/* ---------------- Demo Data ---------------- */

function initialMembers() {
  return [
    {
      id: "m1",
      name: "Ronald Isabirye",
      email: "owner@supplierhub.com",
      avatarUrl: "https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Owner",
      roleId: "owner",
      lastActiveLabel: "2m ago",
      twoFA: "On"
    },
    {
      id: "m2",
      name: "Doreen K.",
      email: "ops@supplierhub.com",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Manager",
      roleId: "supplier_manager",
      lastActiveLabel: "Today",
      twoFA: "On"
    },
    {
      id: "m3",
      name: "Li Wei (Creator Guest)",
      email: "liwei@creator.com",
      avatarUrl: "https://images.unsplash.com/photo-1550525811-e5869dd03032?q=80&w=256&auto=format&fit=crop",
      status: "Invited",
      seat: "Creator Guest",
      roleId: "creator_guest",
      lastActiveLabel: "—",
      twoFA: "Off"
    },
    {
      id: "m4",
      name: "Support Ops",
      email: "ops@support.com",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Support Ops",
      roleId: "support_ops",
      lastActiveLabel: "Yesterday",
      twoFA: "On"
    }
  ];
}

function initialInvites() {
  return [
    {
      id: "inv1",
      email: "liwei@creator.com",
      roleId: "creator_guest",
      seat: "Creator Guest",
      createdAtLabel: "Today",
      expiresAtLabel: "In 24h",
      status: "Pending"
    },
    {
      id: "inv2",
      email: "analytics@agency.com",
      roleId: "analyst",
      seat: "Manager",
      createdAtLabel: "Yesterday",
      expiresAtLabel: "In 6 days",
      status: "Pending"
    }
  ];
}

function initialAudit() {
  return [
    { id: "a1", at: nowLabel(), actor: "Supplier Owner", action: "Updated role permissions", detail: "Collabs Manager → enabled contracts + proposal acceptance", severity: "info" },
    { id: "a2", at: nowLabel(), actor: "Supplier Manager", action: "Approved creator asset", detail: "Clip #2 → Changes requested", severity: "warn" },
    { id: "a3", at: nowLabel(), actor: "Support Ops", action: "Viewed audit log", detail: "Read-only troubleshooting", severity: "info" }
  ];
}

/* ---------------- Main Page ---------------- */

export default function SupplierRolesPermissionsPage() {
  const { toasts, push } = useToasts();

  const [tab, setTab] = useState("roles");

  const [roles, setRoles] = useState(() => defaultRoles());
  const [members, setMembers] = useState(() => initialMembers());
  const [invites, setInvites] = useState(() => initialInvites());
  const [audit, setAudit] = useState(() => initialAudit());

  const [selectedRoleId, setSelectedRoleId] = useState(() => (roles[0]?.id ? roles[0].id : "owner"));
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || roles[0], [roles, selectedRoleId]);

  const [permSearch, setPermSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleDescDraft, setRoleDescDraft] = useState("");

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("viewer");
  const [inviteSeat, setInviteSeat] = useState("Manager");

  // security
  const [require2FA, setRequire2FA] = useState(true);
  const [allowExternalInvites, setAllowExternalInvites] = useState(false);
  const [creatorGuestExpiryHours, setCreatorGuestExpiryHours] = useState(24);

  // demo states
  const [dataState, setDataState] = useState("ready"); // ready | loading | error

  const permIndex = useMemo(() => {
    const m = new Map();
    PERM_GROUPS.forEach((g) => g.perms.forEach((p) => m.set(p.id, p)));
    return m;
  }, []);

  const enabledPermCount = useMemo(() => {
    if (!selectedRole) return 0;
    return Object.values(selectedRole.perms).filter(Boolean).length;
  }, [selectedRole]);

  const sensitiveEnabledCount = useMemo(() => {
    if (!selectedRole) return 0;
    let n = 0;
    Object.entries(selectedRole.perms).forEach(([id, v]) => {
      if (!v) return;
      if (permIndex.get(id)?.sensitive) n += 1;
    });
    return n;
  }, [selectedRole, permIndex]);

  function log(actor, action, detail, severity = "info") {
    const e = { id: `${Date.now()}_${Math.random()}`, at: nowLabel(), actor, action, detail, severity };
    setAudit((a) => [e, ...a]);
  }

  function openEditRole() {
    if (!selectedRole) return;
    setRoleNameDraft(selectedRole.name);
    setRoleDescDraft(selectedRole.description);
    setEditRoleOpen(true);
  }

  function saveRoleMeta() {
    if (!selectedRole) return;
    setRoles((rs) =>
      rs.map((r) =>
        r.id === selectedRole.id
          ? {
              ...r,
              name: roleNameDraft.trim() || r.name,
              description: roleDescDraft.trim() || r.description
            }
          : r
      )
    );
    setEditRoleOpen(false);
    push("Role updated.", "success");
    log("Supplier Owner", "Updated role metadata", `${selectedRole.name} → ${roleNameDraft.trim() || selectedRole.name}`);
  }

  function setPerm(roleId, permId, value) {
    setRoles((rs) => rs.map((r) => (r.id !== roleId ? r : { ...r, perms: { ...r.perms, [permId]: value } })));
  }

  function setGroupAll(roleId, groupId, value) {
    const g = PERM_GROUPS.find((x) => x.id === groupId);
    if (!g) return;
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r;
        const next = { ...r.perms };
        g.perms.forEach((p) => {
          next[p.id] = value;
        });
        return { ...r, perms: next };
      })
    );
  }

  function duplicateRole() {
    if (!selectedRole) return;
    const id = `custom_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 999)}`;
    const copy = { ...selectedRole, id, name: `${selectedRole.name} (Copy)`, badge: "Custom" };
    setRoles((rs) => [copy, ...rs]);
    setSelectedRoleId(id);
    push("Role duplicated.", "success");
    log("Supplier Owner", "Duplicated role", `${selectedRole.name} → ${copy.name}`);
  }

  function createRole() {
    const ids = allPermIds();
    const id = `custom_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 999)}`;
    const r = {
      id,
      name: "New role",
      badge: "Custom",
      icon: <User className="h-4 w-4" />,
      description: "Custom role. Configure permissions as needed.",
      perms: buildPermMap(ids, false)
    };
    setRoles((rs) => [r, ...rs]);
    setSelectedRoleId(id);
    setCreateRoleOpen(false);
    push("New role created.", "success");
    log("Supplier Owner", "Created role", r.name);
  }

  function deleteRole() {
    if (!selectedRole) return;
    if (SYSTEM_ROLE_IDS.includes(selectedRole.id)) {
      push("System roles cannot be deleted.", "error");
      return;
    }
    const name = selectedRole.name;
    setRoles((rs) => rs.filter((r) => r.id !== selectedRole.id));
    setSelectedRoleId("owner");
    push("Role deleted.", "success");
    log("Supplier Owner", "Deleted role", name, "warn");
  }

  function inviteMember() {
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      push("Enter a valid email.", "error");
      return;
    }

    // External invite guardrail
    const domain = (email.split("@")[1] || "").toLowerCase();
    const internal = ["supplierhub.com", "evzone.com"].includes(domain);
    if (!internal && !allowExternalInvites) {
      push("External invites are blocked by policy. Enable in Security settings.", "error");
      return;
    }

    const inv = {
      id: `inv_${Date.now()}_${Math.random()}`,
      email,
      roleId: inviteRoleId,
      seat: inviteSeat,
      createdAtLabel: "Now",
      expiresAtLabel: inviteSeat === "Creator Guest" ? `In ${creatorGuestExpiryHours}h` : "In 7 days",
      status: "Pending"
    };

    setInvites((x) => [inv, ...x]);
    setInviteOpen(false);
    setInviteEmail("");
    push("Invite sent.", "success");
    log("Supplier Owner", "Invited member", `${email} (${inviteSeat})`);
  }

  function copyInviteLink(inv) {
    const link = `https://mldz.app/invite/${inv.id}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    push("Invite link copied.", "success");
  }

  function revokeInvite(inv) {
    setInvites((xs) => xs.map((x) => (x.id === inv.id ? { ...x, status: "Revoked" } : x)));
    push("Invite revoked.", "success");
    log("Supplier Owner", "Revoked invite", inv.email, "warn");
  }

  function changeMemberRole(memberId, roleId) {
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, roleId } : m)));
    push("Role updated.", "success");
    log("Supplier Owner", "Changed member role", `${memberId} → ${roleId}`);
  }

  function changeMemberStatus(memberId, status) {
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, status } : m)));
    push(`Member status: ${status}`, "success");
    log("Supplier Owner", "Changed member status", `${memberId} → ${status}`, status === "Suspended" ? "critical" : "warn");
  }

  const permGroupsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return PERM_GROUPS;
    return PERM_GROUPS
      .map((g) => ({
        ...g,
        perms: g.perms.filter((p) => `${p.label} ${p.hint || ""} ${p.id}`.toLowerCase().includes(q))
      }))
      .filter((g) => g.perms.length > 0);
  }, [permSearch]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => `${r.name} ${r.description} ${r.badge}`.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const seatsUsed = members.filter((m) => m.status === "Active").length;
  const seatsInvited = members.filter((m) => m.status === "Invited").length + invites.filter((i) => i.status === "Pending").length;

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 transition-colors">
      <ToastStack toasts={toasts} />

      <PageHeader
        pageTitle="Roles & Permissions"
        rightContent={
          <div className="flex flex-wrap items-center gap-2">
            <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Invite
            </SmallBtn>
            <SmallBtn icon={<Plus className="h-4 w-4" />} onClick={() => setCreateRoleOpen(true)}>
              New role
            </SmallBtn>
            <SmallBtn
              tone="ghost"
              icon={<Settings className="h-4 w-4" />}
              title="Toggle loading/error"
              onClick={() => {
                setDataState((s) => (s === "ready" ? "loading" : s === "loading" ? "error" : "ready"));
                push("Toggled data state");
              }}
            >
              State
            </SmallBtn>
          </div>
        }
      />

      <main className="flex-1 flex flex-col w-full px-[0.55%] py-6 space-y-6">
        {/* Sticky Filter/Nav Bar */}
        <div className="sticky top-44 z-[34] bg-[#f2f2f2]/85 dark:bg-slate-950/85 backdrop-blur-sm -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {[
              { k: "roles", label: "Roles", icon: <ShieldCheck className="h-4 w-4" /> },
              { k: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
              { k: "invites", label: "Invites", icon: <UserPlus className="h-4 w-4" /> },
              { k: "creators", label: "Creators & Guests", icon: <Building2 className="h-4 w-4" /> },
              { k: "security", label: "Security & Audit", icon: <KeyRound className="h-4 w-4" /> }
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border transition",
                  tab === t.k
                    ? "border-transparent text-white shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                )}
                style={tab === t.k ? { background: ORANGE } : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          Updated for Supplier: Campaigns + Collabs + Deliverables approvals + Live Studio staffing. Use this as your RBAC model.
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Seats (active)</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{seatsUsed}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{seatsInvited} invited/pending</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Roles</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{roles.length}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{roles.filter((r) => r.badge === "Custom").length} custom</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Capabilities</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{PERM_GROUPS.length}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Capability groups</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Security</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={require2FA ? "good" : "warn"} text={require2FA ? "2FA required" : "2FA optional"} icon={<KeyRound className="h-3.5 w-3.5" />} />
              <Pill tone={allowExternalInvites ? "warn" : "good"} text={allowExternalInvites ? "External invites ON" : "External invites OFF"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            </div>
          </div>
        </div>

        {/* Error state */}
        {dataState === "error" ? (
          <div className="rounded-3xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-rose-900 dark:text-rose-200">Failed to load RBAC data</div>
                <div className="mt-1 text-xs text-rose-800 dark:text-rose-300">Demo error state. Toggle State to return to Ready.</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Content */}
        {tab === "roles" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Role list */}
            <div className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Roles</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Pick a role to edit permissions and assign to members.</div>
                </div>
                <SmallBtn tone="ghost" icon={<Copy className="h-4 w-4" />} onClick={duplicateRole} title="Duplicate selected role">
                  Duplicate
                </SmallBtn>
              </div>

              <div className="p-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 transition-colors">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    className="bg-transparent outline-none text-sm w-full dark:text-slate-200"
                    placeholder="Search roles…"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2 max-h-[560px] overflow-auto">
                {filteredRoles.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600 dark:text-slate-300">No roles match this search.</div>
                ) : (
                  filteredRoles.map((r) => {
                    const active = r.id === selectedRoleId;
                    const enabled = Object.values(r.perms).filter(Boolean).length;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoleId(r.id)}
                        className={cx(
                          "w-full text-left rounded-3xl border px-3 py-3 transition shadow-sm",
                          active
                            ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/30"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cx(
                                "inline-grid place-items-center h-8 w-8 rounded-2xl transition-colors",
                                active
                                  ? "bg-[#f77f00]/10 text-[#f77f00]"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              )}
                            >
                              {r.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{r.name}</div>
                              <div className="truncate text-xs text-slate-600 dark:text-slate-400">{r.description}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Pill tone="neutral" text={r.badge} />
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{enabled} enabled</div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Role editor */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{selectedRole?.name || "Role"}</div>
                      <Pill tone="neutral" text={`${enabledPermCount} perms`} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                      {sensitiveEnabledCount ? <Pill tone="warn" text={`${sensitiveEnabledCount} sensitive`} icon={<AlertTriangle className="h-3.5 w-3.5" />} /> : null}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{selectedRole?.description}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SmallBtn icon={<Pencil className="h-4 w-4" />} onClick={openEditRole}>
                      Edit
                    </SmallBtn>
                    <SmallBtn
                      tone="danger"
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={deleteRole}
                      disabled={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "")}
                      title={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "") ? "System roles cannot be deleted" : "Delete role"}
                    >
                      Delete
                    </SmallBtn>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3 flex items-start gap-3 transition-colors shadow-sm">
                  <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-bold">Tip:</span> Enable sensitive permissions only for trusted roles (Owner/Finance/Collabs Manager). All changes are audit logged.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Permissions</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Search and toggle permissions by capability group.</div>
                  </div>

                  <div className="w-full md:w-[360px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 transition-colors">
                    <Search className="h-4 w-4 text-slate-500" />
                    <input
                      className="bg-transparent outline-none text-sm w-full dark:text-slate-200"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Search permissions…"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {permGroupsFiltered.map((g) => {
                    const groupEnabled = g.perms.filter((p) => selectedRole?.perms[p.id]).length;
                    const groupTotal = g.perms.length;

                    return (
                      <div key={g.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors shadow-sm">
                        <div className="px-4 py-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-grid place-items-center h-8 w-8 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">
                                {g.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 dark:text-slate-50 flex flex-wrap items-center gap-2">
                                  {g.title}
                                  <Pill tone="neutral" text={`${groupEnabled}/${groupTotal}`} />
                                </div>
                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{g.desc}</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <SmallBtn
                              icon={<Check className="h-4 w-4" />}
                              onClick={() => {
                                if (!selectedRole) return;
                                setGroupAll(selectedRole.id, g.id, true);
                                push(`Enabled ${g.title}.`, "success");
                                log("Supplier Owner", "Enabled permission group", g.title);
                              }}
                            >
                              Enable all
                            </SmallBtn>
                            <SmallBtn
                              icon={<Ban className="h-4 w-4" />}
                              onClick={() => {
                                if (!selectedRole) return;
                                setGroupAll(selectedRole.id, g.id, false);
                                push(`Disabled ${g.title}.`, "success");
                                log("Supplier Owner", "Disabled permission group", g.title, "warn");
                              }}
                            >
                              Disable all
                            </SmallBtn>
                          </div>
                        </div>

                        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-950 transition-colors">
                          <div className="grid grid-cols-1 gap-2">
                            {g.perms.map((p) => {
                              const checked = !!selectedRole?.perms[p.id];

                              const hintBits = [
                                p.hint,
                                p.surface?.length ? `Surface: ${p.surface.join(", ")}` : null,
                                `ID: ${p.id}`
                              ].filter(Boolean);

                              return (
                                <div key={p.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 transition-colors shadow-sm">
                                  <Toggle
                                    checked={checked}
                                    onChange={(v) => {
                                      if (!selectedRole) return;
                                      setPerm(selectedRole.id, p.id, v);
                                      push(`${v ? "Enabled" : "Disabled"}: ${p.label}`, "success");
                                      if (p.sensitive && v) log("Supplier Owner", "Enabled sensitive permission", p.label, "warn");
                                    }}
                                    label={p.label}
                                    hint={hintBits.join(" · ")}
                                  />

                                  {p.sensitive ? (
                                    <div className="-mt-1 pb-3 px-1">
                                      <div className="inline-flex items-center gap-2 text-[11px] text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-3 py-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Sensitive permission. Recommend Owner/Finance-only.
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {permGroupsFiltered.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 text-sm text-slate-700 dark:text-slate-300">
                      No permissions match this search.
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
                  Permission note: In production, only roles with <span className="font-bold">admin.manage_roles</span> should be able to edit RBAC.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "members" ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Members</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Team members and invited guests. Assign roles and enforce security policies.</div>
              </div>
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                Invite
              </SmallBtn>
            </div>

            <div className="p-4 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-1">Member</th>
                    <th className="py-2 px-1">Seat</th>
                    <th className="py-2 px-1">Role</th>
                    <th className="py-2 px-1">Status</th>
                    <th className="py-2 px-1">2FA</th>
                    <th className="py-2 px-1">Last active</th>
                    <th className="py-2 px-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                        No members yet.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800 transition-colors">
                        <td className="py-3 px-1">
                          <div className="flex items-center gap-3">
                            <img src={m.avatarUrl} alt={m.name} className="h-10 w-10 rounded-2xl object-cover" />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{m.name}</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-1 text-sm font-bold text-slate-800 dark:text-slate-200">{m.seat}</td>
                        <td className="py-3 px-1">
                          <select
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-800 dark:text-slate-200 transition-colors"
                            value={m.roleId}
                            onChange={(e) => changeMemberRole(m.id, e.target.value)}
                            disabled={m.status !== "Active" && m.status !== "Invited"}
                            title={m.status === "Suspended" ? "Suspended members cannot be edited." : undefined}
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-1">
                          <Pill
                            tone={
                              m.status === "Active"
                                ? "good"
                                : m.status === "Invited"
                                  ? "warn"
                                  : m.status === "Suspended"
                                    ? "bad"
                                    : "neutral"
                            }
                            text={m.status}
                          />
                        </td>
                        <td className="py-3 px-1">
                          <Pill tone={m.twoFA === "On" ? "good" : "warn"} text={m.twoFA} icon={<KeyRound className="h-3.5 w-3.5" />} />
                        </td>
                        <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300 font-semibold">{m.lastActiveLabel}</td>
                        <td className="py-3 px-1">
                          <div className="flex items-center justify-end gap-1">
                            <SmallBtn tone="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => push("Open member details.")}>
                              Details
                            </SmallBtn>
                            {m.status === "Active" ? (
                              <SmallBtn tone="danger" icon={<Ban className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Suspended")} title="Suspend access">
                                Suspend
                              </SmallBtn>
                            ) : m.status === "Suspended" ? (
                              <SmallBtn icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Active")} title="Re-activate access">
                                Reactivate
                              </SmallBtn>
                            ) : (
                              <SmallBtn tone="ghost" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Active")} title="Mark active">
                                Activate
                              </SmallBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {require2FA ? (
                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4 transition-colors">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-500 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                      <div className="font-bold">2FA is required</div>
                      <div className="mt-1 text-amber-800 dark:text-amber-400">Members with 2FA OFF will be prompted to enable before accessing sensitive features.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "invites" ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Invites</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Pending invitations and policies (expiry, revoke, resend).</div>
              </div>
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                New invite
              </SmallBtn>
            </div>

            <div className="p-4 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-1">Email</th>
                    <th className="py-2 px-1">Seat</th>
                    <th className="py-2 px-1">Role</th>
                    <th className="py-2 px-1">Created</th>
                    <th className="py-2 px-1">Expires</th>
                    <th className="py-2 px-1">Status</th>
                    <th className="py-2 px-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                        No invites yet.
                      </td>
                    </tr>
                  ) : (
                    invites.map((inv) => (
                      <tr key={inv.id} className="border-t border-slate-200 dark:border-slate-800 transition-colors">
                        <td className="py-3 px-1 text-sm font-bold text-slate-900 dark:text-slate-100">{inv.email}</td>
                        <td className="py-3 px-1 text-sm font-bold text-slate-800 dark:text-slate-200">{inv.seat}</td>
                        <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300 font-semibold">{roles.find((r) => r.id === inv.roleId)?.name || inv.roleId}</td>
                        <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300">{inv.createdAtLabel}</td>
                        <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300">{inv.expiresAtLabel}</td>
                        <td className="py-3 px-1">
                          <Pill tone={inv.status === "Pending" ? "warn" : inv.status === "Accepted" ? "good" : inv.status === "Revoked" ? "bad" : "neutral"} text={inv.status} />
                        </td>
                        <td className="py-3 px-1">
                          <div className="flex justify-end gap-1">
                            <SmallBtn tone="ghost" icon={<Copy className="h-4 w-4" />} onClick={() => copyInviteLink(inv)} disabled={inv.status !== "Pending"}>
                              Copy
                            </SmallBtn>
                            <SmallBtn tone="danger" icon={<Ban className="h-4 w-4" />} onClick={() => revokeInvite(inv)} disabled={inv.status !== "Pending"}>
                              Revoke
                            </SmallBtn>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Invite policy</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  External invites: <span className="font-bold">{allowExternalInvites ? "Allowed" : "Blocked"}</span> · Creator guest expiry:{" "}
                  <span className="font-bold">{creatorGuestExpiryHours}h</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "creators" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Creators & Guests</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Guest creators are usually session-scoped. Use Collabs Manager roles for deeper campaign involvement.
                  </div>
                </div>
                <SmallBtn tone="primary" icon={<Building2 className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                  Invite creator
                </SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Guest safeguards (recommended)</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                    Guest links should expire automatically (default 24 hours) and be revocable instantly.
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                    Creator guests can view approved media but cannot approve/reject assets unless explicitly granted.
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-500 mt-0.5" />
                    If creators upload media, route through Supplier approval (manual) before Admin review.
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Creator guest expiry</div>
                  <div className="flex items-center gap-2">
                    <SmallBtn icon={<Minus className="h-4 w-4" />} onClick={() => setCreatorGuestExpiryHours((h) => Math.max(1, h - 1))} disabled={creatorGuestExpiryHours <= 1}>
                      -1h
                    </SmallBtn>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors">
                      {creatorGuestExpiryHours}h
                    </div>
                    <SmallBtn icon={<Plus className="h-4 w-4" />} onClick={() => setCreatorGuestExpiryHours((h) => Math.min(168, h + 1))}>
                      +1h
                    </SmallBtn>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Applied to session-only creator join links and guest invites.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Quick actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <SmallBtn icon={<ExternalLink className="h-4 w-4" />} onClick={() => push("Open Creator Directory.")}> 
                  Creator directory
                </SmallBtn>
                <SmallBtn icon={<ShieldCheck className="h-4 w-4" />} onClick={() => push("Review creator access policies.")}> 
                  Review access
                </SmallBtn>
                <SmallBtn icon={<AlertTriangle className="h-4 w-4" />} onClick={() => push("Report incident to Ops.")} tone="danger">
                  Incident report
                </SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 shadow-sm transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">What changed recently?</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Suppliers can set campaign-level approval mode (Manual/Auto). If Manual, suppliers review creator assets before Admin.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Security controls</div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 transition-colors">
                    <Toggle
                      checked={require2FA}
                      onChange={(v) => {
                        setRequire2FA(v);
                        push(`2FA requirement ${v ? "enabled" : "disabled"}.`, "success");
                        log("Supplier Owner", "Changed security setting", `Require 2FA: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Require 2FA for all members"
                      hint="Recommended for sensitive workflows: approvals, payouts, tracking, contracts, security settings."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 transition-colors">
                    <Toggle
                      checked={allowExternalInvites}
                      onChange={(v) => {
                        setAllowExternalInvites(v);
                        push(`External invites ${v ? "enabled" : "disabled"}.`, "success");
                        log("Supplier Owner", "Changed invite policy", `External invites: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Allow external invites"
                      hint="If OFF, only whitelisted domains can be invited (recommended)."
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4 transition-colors">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-500 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                      <div className="font-bold">Sensitive access review</div>
                      <div className="mt-1 text-amber-800 dark:text-amber-400">
                        Review roles with permissions for: approvals, payouts, tracking destinations, contracts, security settings.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Device & session policies</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Add device list, login sessions, and revocation controls here.</div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Audit log</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">High-signal events: role changes, invites, approvals, payouts, safety incidents.</div>
                </div>
                <SmallBtn icon={<Copy className="h-4 w-4" />} onClick={() => push("Export audit.")}>
                  Export
                </SmallBtn>
              </div>

              <div className="p-4 space-y-3 max-h-[520px] overflow-auto">
                {audit.map((a) => (
                  <div
                    key={a.id}
                    className={cx(
                      "rounded-3xl border p-3 shadow-sm transition-colors",
                      a.severity === "critical"
                        ? "border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10"
                        : a.severity === "warn"
                          ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{a.action}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {a.actor} · {a.at}
                        </div>
                        {a.detail ? <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{a.detail}</div> : null}
                      </div>
                      <Pill
                        tone={a.severity === "critical" ? "bad" : a.severity === "warn" ? "warn" : "neutral"}
                        text={a.severity === "critical" ? "Critical" : a.severity === "warn" ? "Warn" : "Info"}
                      />
                    </div>
                  </div>
                ))}

                {audit.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 text-sm text-slate-700 dark:text-slate-300">
                    No audit events yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Edit role modal */}
      <Modal open={editRoleOpen} title="Edit role" onClose={() => setEditRoleOpen(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Role name</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
              value={roleNameDraft}
              onChange={(e) => setRoleNameDraft(e.target.value)}
              placeholder="e.g., Collabs Manager"
            />
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Description</div>
            <textarea
              className="mt-2 w-full min-h-[86px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
              value={roleDescDraft}
              onChange={(e) => setRoleDescDraft(e.target.value)}
              placeholder="What this role can do…"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end p-1">
          <SmallBtn icon={<Ban className="h-4 w-4" />} onClick={() => setEditRoleOpen(false)}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" icon={<Save className="h-4 w-4" />} onClick={saveRoleMeta}>
            Save
          </SmallBtn>
        </div>
      </Modal>

      {/* Create role modal */}
      <Modal open={createRoleOpen} title="Create new role" onClose={() => setCreateRoleOpen(false)}>
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">New role</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Creates a blank custom role with no permissions enabled. Configure permissions after creating.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2 p-1">
          <SmallBtn onClick={() => setCreateRoleOpen(false)} icon={<Ban className="h-4 w-4" />}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" onClick={createRole} icon={<Plus className="h-4 w-4" />}>
            Create role
          </SmallBtn>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal open={inviteOpen} title="Invite member" onClose={() => setInviteOpen(false)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1">
          <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Email</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">External invites are {allowExternalInvites ? "allowed" : "blocked"} by policy.</div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Seat</div>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100 transition-colors"
              value={inviteSeat}
              onChange={(e) => setInviteSeat(e.target.value)}
            >
              <option value="Owner" className="bg-white dark:bg-slate-900">Owner</option>
              <option value="Manager" className="bg-white dark:bg-slate-900">Manager</option>
              <option value="Staff" className="bg-white dark:bg-slate-900">Staff</option>
              <option value="Creator Guest" className="bg-white dark:bg-slate-900">Creator Guest</option>
              <option value="Finance" className="bg-white dark:bg-slate-900">Finance</option>
              <option value="Support Ops" className="bg-white dark:bg-slate-900">Support Ops</option>
            </select>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Seat type affects policies.</div>
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4 transition-colors">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Role</div>
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100 transition-colors"
            value={inviteRoleId}
            onChange={(e) => setInviteRoleId(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">
                {r.name}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Invitees get the role immediately after accepting.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2 p-1">
          <SmallBtn onClick={() => setInviteOpen(false)} icon={<Ban className="h-4 w-4" />}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" onClick={inviteMember} icon={<UserPlus className="h-4 w-4" />}>
            Send invite
          </SmallBtn>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierRolesPermissionsPage test failed: ${msg}`);
  };

  assert(Array.isArray(PERM_GROUPS) && PERM_GROUPS.length > 5, "perm groups exist");
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "orange constant exists");
  assert(typeof cx("a", false && "b", "c") === "string", "cx works");

  console.log("✅ SupplierRolesPermissionsPage self-tests passed");
}
