import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  Globe,
  HelpCircle,
  KeyRound,
  Layers,
  MessageSquare,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Video,
  Wand2,
  Zap,
} from "lucide-react";

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function PageHeader({ pageTitle, rightContent }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur px-3 sm:px-4 md:px-6 lg:px-8 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 font-semibold">
            Supplier App
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-50 truncate">
            {pageTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, tone = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
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
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors"
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
      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

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
      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800";

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
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{label}</div>
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

const PERM_GROUPS = [
  {
    id: "campaigns",
    title: "Campaigns & Dealz Marketplace",
    icon: <Layers className="h-4 w-4" />,
    desc: "Supplier-owned campaign creation, board visibility, dealz orchestration and builder handoff.",
    perms: [
      { id: "campaigns.view", label: "View Campaigns Board", surface: ["Web"] },
      { id: "campaigns.create", label: "Create supplier campaigns", surface: ["Web"], sensitive: true },
      { id: "campaigns.edit", label: "Edit campaign details", surface: ["Web"], sensitive: true },
      { id: "campaigns.archive", label: "Archive / terminate campaigns", surface: ["Web"], sensitive: true },
      { id: "campaigns.open_builders", label: "Open Ad Builder / Live Builder", hint: "Allows supplier-side build handoff.", surface: ["Web"] },
      { id: "campaigns.publish_links", label: "Manage campaign share links", hint: "Generate and copy deal / campaign links.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "adz_core",
    title: "Shoppable Adz Core",
    icon: <Wand2 className="h-4 w-4" />,
    desc: "Build, review, generate and schedule supplier-side Shoppable Adz.",
    perms: [
      { id: "adz.view", label: "View Shoppable Adz", surface: ["Web"] },
      { id: "adz.create", label: "Create / edit Adz", surface: ["Web"] },
      { id: "adz.generate", label: "Generate Ad", hint: "Replaces legacy publish Ad.", surface: ["Web"], sensitive: true },
      { id: "adz.schedule", label: "Schedule Adz", surface: ["Web"] },
      { id: "adz.manage_offers", label: "Manage featured offers", hint: "Items, posters, bundles, pricing blocks.", surface: ["Web"] },
      { id: "adz.manage_cta", label: "Manage CTA Builder", hint: "Buttons, labels, destinations and offer behavior.", surface: ["Web"] },
      { id: "adz.manage_tracking", label: "Manage tracking links", hint: "UTM presets and short links.", surface: ["Web"], sensitive: true },
      { id: "adz.policy_preflight", label: "View preflight checks", hint: "Readiness and policy checks before launch.", surface: ["Web"] },
    ],
  },
  {
    id: "adz_analytics",
    title: "Adz Performance",
    icon: <TrendingUp className="h-4 w-4" />,
    desc: "Deep analytics, exports and performance insights for supplier-side promotions.",
    perms: [
      { id: "adzperf.view", label: "View Adz Performance", surface: ["Web"] },
      { id: "adzperf.export", label: "Export Adz reports", surface: ["Web"], sensitive: true },
      { id: "adzperf.insights", label: "View insights & recommendations", hint: "Optimization suggestions and trend signals.", surface: ["Web"] },
    ],
  },
  {
    id: "assets",
    title: "Asset Library",
    icon: <FolderOpen className="h-4 w-4" />,
    desc: "Shared supplier asset library for campaigns, adz, live posters, clips and documents.",
    perms: [
      { id: "assets.view", label: "View Asset Library", surface: ["Web"] },
      { id: "assets.upload", label: "Upload media", hint: "Image, video, documents or URL assets.", surface: ["Web"] },
      { id: "assets.camera_capture", label: "Capture from camera", hint: "Web camera upload flow.", surface: ["Web"] },
      { id: "assets.submit_review", label: "Submit assets for review", hint: "Routes to approver / admin reviewer.", surface: ["Web"] },
      { id: "assets.review_approve", label: "Approve / request changes", hint: "Supplier review permission for media and creative assets.", surface: ["Web"], sensitive: true },
      { id: "assets.attach_to_campaigns", label: "Attach assets to campaigns & dealz", hint: "Heroes, posters, items, overlays and session content.", surface: ["Web"] },
      { id: "assets.manage_copyright_policy", label: "Manage copyright safeguards", hint: "Warnings, attestations and policy enforcement.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "tracking",
    title: "Tracking & Integrations",
    icon: <Globe className="h-4 w-4" />,
    desc: "Pixels, destinations, short links, link monitoring and attribution notes.",
    perms: [
      { id: "tracking.view", label: "View Tracking & Integrations", surface: ["Web"] },
      { id: "tracking.manage_pixels", label: "Manage pixels / destinations", surface: ["Web"], sensitive: true },
      { id: "tracking.short_links", label: "Manage short links", hint: "Domains, routing, rotation rules and ownership.", surface: ["Web"], sensitive: true },
      { id: "tracking.monitor", label: "View link monitor & history", surface: ["Web"] },
      { id: "tracking.attribution_notes", label: "Edit attribution notes", surface: ["Web"] },
    ],
  },
  {
    id: "templates",
    title: "Templates & Brand Kit",
    icon: <FileText className="h-4 w-4" />,
    desc: "Supplier brand rules, saved templates and approved copy blocks.",
    perms: [
      { id: "tpl.view", label: "View templates", surface: ["Web"] },
      { id: "tpl.create", label: "Create / edit templates", surface: ["Web"] },
      { id: "tpl.brandkit", label: "Manage brand kit rules", hint: "Fonts, colors, voice guidelines and packaging rules.", surface: ["Web"], sensitive: true },
      { id: "tpl.approved_copy", label: "Manage approved copy blocks", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "live_core",
    title: "Live Sessionz Core",
    icon: <Video className="h-4 w-4" />,
    desc: "Supplier-side live planning, execution, co-host delegation and studio controls.",
    perms: [
      { id: "live.view", label: "View Live Dashboard / Builder / Studio", surface: ["Web"] },
      { id: "live.create", label: "Create / edit live sessions", surface: ["Web"] },
      { id: "live.schedule", label: "Schedule live sessions", surface: ["Web"] },
      { id: "live.answer_chats", label: "Answer live chats", hint: "Reply to audience chats during session execution.", surface: ["Web", "App"] },
      { id: "live.view_poll_stats", label: "View poll stats", hint: "Read live poll results and poll performance during execution.", surface: ["Web"] },
      { id: "live.go_live", label: "Go live / start live session", hint: "Allows delegated co-host or live ops to start a session when permitted.", surface: ["Web"], sensitive: true },
      { id: "live.manage_featured", label: "Manage featured items", hint: "Pinned products, posters and offer cards.", surface: ["Web"] },
      { id: "live.manage_overlays_basic", label: "Manage basic overlays", hint: "Pinned item, timer, lower third, price block.", surface: ["Web"] },
    ],
  },
  {
    id: "live_stream",
    title: "Stream to Platforms",
    icon: <ExternalLink className="h-4 w-4" />,
    desc: "Destinations, output profiles, preflight and health monitoring for supplier streams.",
    perms: [
      { id: "livestream.view", label: "View Stream to Platforms", surface: ["Web"] },
      { id: "livestream.manage_destinations", label: "Connect / manage destinations", surface: ["Web"], sensitive: true },
      { id: "livestream.test_stream", label: "Test stream", hint: "Premium supplier-side stream test flow.", surface: ["Web"] },
      { id: "livestream.output_profiles", label: "Edit output profiles", hint: "Bitrate, resolution, audio and latency.", surface: ["Web"], sensitive: true },
      { id: "livestream.health_monitor", label: "View live health monitor", surface: ["Web"] },
    ],
  },
  {
    id: "live_notify",
    title: "Audience Notifications",
    icon: <Zap className="h-4 w-4" />,
    desc: "Reminder channels, template packs and notification previews for supplier campaigns.",
    perms: [
      { id: "livenotify.view", label: "View Audience Notifications", surface: ["Web"] },
      { id: "livenotify.channels", label: "Manage channels", hint: "WhatsApp, Telegram, LINE, Viber, RCS and more.", surface: ["Web"], sensitive: true },
      { id: "livenotify.templates", label: "Select template packs", hint: "Approved pack selection with versioning.", surface: ["Web"] },
      { id: "livenotify.schedule", label: "Configure reminder schedule", hint: "Includes channel timing rules.", surface: ["Web"] },
      { id: "livenotify.previews", label: "View device mockup previews", surface: ["Web"] },
    ],
  },
  {
    id: "live_alerts",
    title: "Live Alerts Manager",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "One-tap supplier alerts during live execution with guardrails and caps.",
    perms: [
      { id: "livealerts.send", label: "Send live alerts", hint: "We’re live, flash deal, last chance and similar prompts.", surface: ["App"] },
      { id: "livealerts.override_caps", label: "Override alert frequency caps", hint: "Highly sensitive supplier control.", surface: ["App"], sensitive: true },
    ],
  },
  {
    id: "live_overlays",
    title: "Overlays & CTAs Pro",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "QR codes, short links, countdown timers, lower thirds and A/B variants.",
    perms: [
      { id: "liveoverlays.view", label: "View Overlays & CTAs Pro", surface: ["Web"] },
      { id: "liveoverlays.qr", label: "Generate QR overlays", surface: ["Web"] },
      { id: "liveoverlays.shortlinks", label: "Create short links with UTM / source tags", surface: ["Web"], sensitive: true },
      { id: "liveoverlays.ab", label: "A/B overlay variants", surface: ["Web"] },
    ],
  },
  {
    id: "live_safety",
    title: "Safety & Moderation",
    icon: <ShieldCheck className="h-4 w-4" />,
    desc: "Keyword filters, moderation tools, incident reporting and emergency controls.",
    perms: [
      { id: "livesafety.view", label: "View Safety & Moderation", surface: ["Web"] },
      { id: "livesafety.keyword_filters", label: "Manage keyword filters", surface: ["Web"] },
      { id: "livesafety.mute_chat", label: "Emergency mute chat", hint: "Per destination where supported.", surface: ["Web"], sensitive: true },
      { id: "livesafety.pause_notifications", label: "Pause outgoing notifications", surface: ["Web"] },
      { id: "livesafety.incident", label: "Send incident report to Ops", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "postlive",
    title: "Post-Live Publisher",
    icon: <CheckCircle2 className="h-4 w-4" />,
    desc: "Replay publishing, clip plans, exports and post-live conversion pushes.",
    perms: [
      { id: "postlive.view", label: "View Post-Live", surface: ["Web"] },
      { id: "postlive.publish_replay", label: "Publish replay page", surface: ["Web"] },
      { id: "postlive.clip_export", label: "Plan clips & exports", surface: ["Web"] },
      { id: "postlive.send_replay", label: "Send replay to channels", surface: ["Web"] },
      { id: "postlive.conversion_boost", label: "Post-live conversion booster", surface: ["Web"] },
    ],
  },
  {
    id: "availability",
    title: "Scheduling & Availability",
    icon: <CalendarClock className="h-4 w-4" />,
    desc: "Availability and staffing visibility for sessions, shoots and live operations.",
    perms: [
      { id: "availability.manage_own", label: "Set my availability", surface: ["Web", "App"] },
      { id: "availability.connect_calendar", label: "Connect calendar (busy/free)", surface: ["Web"] },
      { id: "availability.view_team", label: "View team availability", hint: "Privacy-sensitive busy/free visibility.", surface: ["Web"], sensitive: true },
      { id: "availability.manage_team", label: "Manage availability for others", hint: "Ops-level scheduling control.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "creators",
    title: "Creators & Guests",
    icon: <Building2 className="h-4 w-4" />,
    desc: "Invite creator guests, manage creator directory and control guest join / access rules.",
    perms: [
      { id: "creators.invite_guest", label: "Invite creator guest", hint: "Session-only guest join links or scoped creator access.", surface: ["Web"], sensitive: true },
      { id: "creators.revoke_guest", label: "Revoke guest access", hint: "Immediately blocks creator guest links.", surface: ["Web"], sensitive: true },
      { id: "creators.directory", label: "Manage creator directory", hint: "Tags, categories, approvals, follow / shortlist states.", surface: ["Web"], sensitive: true },
      { id: "creators.onboarding_queue", label: "View creator onboarding queue", hint: "Pending creator invite and collaboration queue.", surface: ["Web"] },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration, Proposals & Contracts",
    icon: <Briefcase className="h-4 w-4" />,
    desc: "Supplier-side collaboration flows for My Creators, invites, proposals, negotiation and contracts.",
    perms: [
      { id: "collab.view_my_creators", label: "View My Creators", surface: ["Web"] },
      { id: "collab.view_invites_from_creators", label: "View Invites from Creators", surface: ["Web"] },
      { id: "collab.accept_decline_creator_invites", label: "Accept / decline creator invites", hint: "Binding collaboration-entry action.", surface: ["Web"], sensitive: true },
      { id: "collab.view_proposals", label: "View Proposals page", surface: ["Web"] },
      { id: "collab.create_send_proposals", label: "Create / send proposals", surface: ["Web"], sensitive: true },
      { id: "collab.negotiate_proposals", label: "Negotiate proposals", hint: "Open negotiation workflow rather than generic contact.", surface: ["Web"], sensitive: true },
      { id: "collab.view_contracts", label: "View contracts", surface: ["Web"] },
      { id: "collab.generate_terminate_contracts", label: "Generate / terminate contracts", hint: "High-sensitivity contract control.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    icon: <Star className="h-4 w-4" />,
    desc: "Control access to Reviews including creator reviews, team-related review visibility and performance review surfaces where relevant.",
    perms: [
      { id: "reviews.view_page", label: "View Reviews page", hint: "Show the Reviews page in navigation and allow access.", surface: ["Web", "App"] },
      { id: "reviews.view_team", label: "View team-related reviews", hint: "Includes team review visibility where relevant.", surface: ["Web"], sensitive: true },
      { id: "reviews.view_performance", label: "View performance reviews", hint: "For team or performance review contexts where applicable.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "subscription",
    title: "My Subscription",
    icon: <CreditCard className="h-4 w-4" />,
    desc: "Control access to supplier subscription status, plan details and account details.",
    perms: [
      { id: "subscription.view_page", label: "View My Subscription page", hint: "Show the subscription page in navigation and allow access.", surface: ["Web", "App"] },
      { id: "subscription.view_status", label: "View subscription status & plan", hint: "Includes current plan, renewal state and subscription status.", surface: ["Web", "App"] },
      { id: "subscription.account_details", label: "View account details", hint: "Includes billing and subscription-related account information.", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "analytics_money",
    title: "Analytics & Money",
    icon: <TrendingUp className="h-4 w-4" />,
    desc: "Supplier analytics, rankings, earnings visibility, payouts and statements.",
    perms: [
      { id: "analytics.view", label: "View analytics", surface: ["Web"] },
      { id: "analytics.export", label: "Export analytics", surface: ["Web"], sensitive: true },
      { id: "money.view", label: "View earnings", surface: ["Web"], sensitive: true },
      { id: "money.request_payout", label: "Request payout", surface: ["Web"], sensitive: true },
    ],
  },
  {
    id: "admin",
    title: "Workspace Settings",
    icon: <Settings className="h-4 w-4" />,
    desc: "Members, roles, policies, security, SSO and audit visibility.",
    perms: [
      { id: "admin.manage_team", label: "Manage members", surface: ["Web"], sensitive: true },
      { id: "admin.manage_roles", label: "Manage roles & permissions", surface: ["Web"], sensitive: true },
      { id: "admin.security", label: "Security settings (2FA, SSO)", surface: ["Web"], sensitive: true },
      { id: "admin.audit", label: "View audit log", surface: ["Web"], sensitive: true },
    ],
  },
];

function allPermIds() {
  return PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
}

function buildPermMap(ids, value) {
  const m = {};
  ids.forEach((id) => {
    m[id] = value;
  });
  return m;
}

const SYSTEM_ROLE_IDS = [
  "supplier_owner",
  "campaign_manager",
  "co_host",
  "shoppable_manager",
  "live_producer",
  "moderator_support",
  "analyst",
  "finance_manager",
  "creator_guest",
  "viewer",
];

function defaultRoles() {
  const ids = allPermIds();
  const none = buildPermMap(ids, false);

  const owner = {
    id: "supplier_owner",
    name: "Supplier Owner",
    badge: "System",
    icon: <Crown className="h-4 w-4" />,
    description: "Full access across campaigns, Shoppable Adz, Live Sessionz, creator collaboration, reviews, subscription and workspace settings.",
    perms: buildPermMap(ids, true),
  };

  const campaignManager = {
    id: "campaign_manager",
    name: "Campaign Manager",
    badge: "System",
    icon: <BadgeCheck className="h-4 w-4" />,
    description: "Leads supplier campaign execution, creator collaboration, proposals, approvals and builder orchestration.",
    perms: {
      ...none,
      "campaigns.view": true,
      "campaigns.create": true,
      "campaigns.edit": true,
      "campaigns.open_builders": true,
      "campaigns.publish_links": true,
      "adz.view": true,
      "adz.create": true,
      "adz.generate": true,
      "adz.schedule": true,
      "adz.manage_offers": true,
      "adz.manage_cta": true,
      "adz.manage_tracking": true,
      "adz.policy_preflight": true,
      "adzperf.view": true,
      "adzperf.export": true,
      "assets.view": true,
      "assets.upload": true,
      "assets.submit_review": true,
      "assets.review_approve": true,
      "assets.attach_to_campaigns": true,
      "tracking.view": true,
      "tracking.monitor": true,
      "tracking.attribution_notes": true,
      "tracking.short_links": true,
      "tpl.view": true,
      "tpl.create": true,
      "live.view": true,
      "live.create": true,
      "live.schedule": true,
      "live.answer_chats": true,
      "live.view_poll_stats": true,
      "live.go_live": true,
      "live.manage_featured": true,
      "live.manage_overlays_basic": true,
      "livestream.view": true,
      "livestream.manage_destinations": true,
      "livestream.test_stream": true,
      "live_notify": undefined,
      "livenotify.view": true,
      "livenotify.channels": true,
      "livenotify.templates": true,
      "livenotify.schedule": true,
      "livenotify.previews": true,
      "livealerts.send": true,
      "liveoverlays.view": true,
      "liveoverlays.qr": true,
      "liveoverlays.shortlinks": true,
      "liveoverlays.ab": true,
      "livesafety.view": true,
      "livesafety.keyword_filters": true,
      "livesafety.pause_notifications": true,
      "postlive.view": true,
      "postlive.publish_replay": true,
      "postlive.clip_export": true,
      "postlive.send_replay": true,
      "postlive.conversion_boost": true,
      "availability.manage_own": true,
      "availability.connect_calendar": true,
      "availability.view_team": true,
      "creators.invite_guest": true,
      "creators.revoke_guest": true,
      "creators.directory": true,
      "creators.onboarding_queue": true,
      "collab.view_my_creators": true,
      "collab.view_invites_from_creators": true,
      "collab.accept_decline_creator_invites": true,
      "collab.view_proposals": true,
      "collab.create_send_proposals": true,
      "collab.negotiate_proposals": true,
      "collab.view_contracts": true,
      "collab.generate_terminate_contracts": true,
      "reviews.view_page": true,
      "reviews.view_team": true,
      "reviews.view_performance": true,
      "subscription.view_page": true,
      "subscription.view_status": true,
      "analytics.view": true,
      "analytics.export": true,
      "money.view": true,
    },
  };

  const coHost = {
    id: "co_host",
    name: "Co-Host / Live Ops",
    badge: "System",
    icon: <Video className="h-4 w-4" />,
    description: "Delegated live teammate who can answer live chats, view poll stats and start a live session when allowed.",
    perms: {
      ...none,
      "campaigns.view": true,
      "campaigns.open_builders": true,
      "assets.view": true,
      "assets.attach_to_campaigns": true,
      "live.view": true,
      "live.schedule": true,
      "live.answer_chats": true,
      "live.view_poll_stats": true,
      "live.go_live": true,
      "live.manage_featured": true,
      "live.manage_overlays_basic": true,
      "livestream.view": true,
      "livestream.test_stream": true,
      "livenotify.view": true,
      "livealerts.send": true,
      "liveoverlays.view": true,
      "liveoverlays.qr": true,
      "livesafety.view": true,
      "livesafety.keyword_filters": true,
      "livesafety.pause_notifications": true,
      "postlive.view": true,
      "availability.manage_own": true,
      "reviews.view_page": true,
    },
  };

  const shoppableManager = {
    id: "shoppable_manager",
    name: "Shoppable Adz Manager",
    badge: "System",
    icon: <Wand2 className="h-4 w-4" />,
    description: "Builds, generates and schedules supplier Shoppable Adz while managing assets and CTA tracking.",
    perms: {
      ...none,
      "campaigns.view": true,
      "campaigns.open_builders": true,
      "adz.view": true,
      "adz.create": true,
      "adz.generate": true,
      "adz.schedule": true,
      "adz.manage_offers": true,
      "adz.manage_cta": true,
      "adz.manage_tracking": true,
      "adz.policy_preflight": true,
      "assets.view": true,
      "assets.upload": true,
      "assets.attach_to_campaigns": true,
      "tracking.view": true,
      "tracking.monitor": true,
      "tracking.short_links": true,
      "adzperf.view": true,
      "analytics.view": true,
      "reviews.view_page": true,
    },
  };

  const liveProducer = {
    id: "live_producer",
    name: "Live Producer",
    badge: "System",
    icon: <PlayCircle className="h-4 w-4" />,
    description: "Runs supplier live sessions, destinations, overlays, notifications, moderation and post-live publishing.",
    perms: {
      ...none,
      "campaigns.view": true,
      "campaigns.open_builders": true,
      "live.view": true,
      "live.create": true,
      "live.schedule": true,
      "live.answer_chats": true,
      "live.view_poll_stats": true,
      "live.go_live": true,
      "live.manage_featured": true,
      "live.manage_overlays_basic": true,
      "assets.view": true,
      "assets.attach_to_campaigns": true,
      "livestream.view": true,
      "livestream.manage_destinations": true,
      "livestream.test_stream": true,
      "livestream.output_profiles": true,
      "livestream.health_monitor": true,
      "livenotify.view": true,
      "livenotify.channels": true,
      "livenotify.templates": true,
      "livenotify.schedule": true,
      "livenotify.previews": true,
      "livealerts.send": true,
      "liveoverlays.view": true,
      "liveoverlays.qr": true,
      "liveoverlays.shortlinks": true,
      "liveoverlays.ab": true,
      "livesafety.view": true,
      "livesafety.keyword_filters": true,
      "livesafety.mute_chat": true,
      "livesafety.pause_notifications": true,
      "livesafety.incident": true,
      "postlive.view": true,
      "postlive.publish_replay": true,
      "postlive.clip_export": true,
      "postlive.send_replay": true,
      "postlive.conversion_boost": true,
    },
  };

  const moderatorSupport = {
    id: "moderator_support",
    name: "Moderator / Support",
    badge: "System",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Moderates live chats, reads poll performance and handles safety tools without broader commercial permissions.",
    perms: {
      ...none,
      "live.view": true,
      "live.answer_chats": true,
      "live.view_poll_stats": true,
      "livesafety.view": true,
      "livesafety.keyword_filters": true,
      "livesafety.mute_chat": true,
      "livesafety.pause_notifications": true,
      "livesafety.incident": true,
      "assets.view": true,
      "reviews.view_page": true,
    },
  };

  const analyst = {
    id: "analyst",
    name: "Analyst",
    badge: "System",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Views supplier analytics, poll performance, adz performance and team review metrics.",
    perms: {
      ...none,
      "campaigns.view": true,
      "adz.view": true,
      "adzperf.view": true,
      "adzperf.export": true,
      "live.view": true,
      "live.view_poll_stats": true,
      "analytics.view": true,
      "analytics.export": true,
      "reviews.view_page": true,
      "reviews.view_team": true,
      "reviews.view_performance": true,
    },
  };

  const finance = {
    id: "finance_manager",
    name: "Finance Manager",
    badge: "System",
    icon: <CreditCard className="h-4 w-4" />,
    description: "Earnings visibility, payouts, subscription account details and contract-related financial surfaces.",
    perms: {
      ...none,
      "collab.view_proposals": true,
      "collab.view_contracts": true,
      "money.view": true,
      "money.request_payout": true,
      "analytics.view": true,
      "subscription.view_page": true,
      "subscription.view_status": true,
      "subscription.account_details": true,
      "admin.audit": true,
    },
  };

  const creatorGuest = {
    id: "creator_guest",
    name: "Creator Guest (Session-only)",
    badge: "System",
    icon: <User className="h-4 w-4" />,
    description: "Limited guest access for creators invited into a specific supplier session or scoped workflow.",
    perms: {
      ...none,
      "campaigns.view": true,
      "assets.view": true,
      "live.view": true,
    },
  };

  const viewer = {
    id: "viewer",
    name: "Viewer",
    badge: "System",
    icon: <Eye className="h-4 w-4" />,
    description: "Read-only access to key supplier pages with no exports and no edits.",
    perms: {
      ...none,
      "campaigns.view": true,
      "adz.view": true,
      "live.view": true,
      "assets.view": true,
      "collab.view_my_creators": true,
      "collab.view_proposals": true,
      "analytics.view": true,
      "reviews.view_page": true,
    },
  };

  return [
    owner,
    campaignManager,
    coHost,
    shoppableManager,
    liveProducer,
    moderatorSupport,
    analyst,
    finance,
    creatorGuest,
    viewer,
  ];
}

function initialMembers() {
  return [
    {
      id: "m1",
      name: "Ronald Isabirye",
      email: "owner@supplier.com",
      avatar: "RI",
      status: "Active",
      seat: "Owner",
      roleId: "supplier_owner",
      lastActiveLabel: "2m ago",
      twoFA: "On",
    },
    {
      id: "m2",
      name: "Claire N.",
      email: "claire@campaigns.com",
      avatar: "CN",
      status: "Active",
      seat: "Manager",
      roleId: "campaign_manager",
      lastActiveLabel: "Today",
      twoFA: "On",
    },
    {
      id: "m3",
      name: "David Live Ops",
      email: "david@studio.com",
      avatar: "DL",
      status: "Active",
      seat: "Live Ops",
      roleId: "co_host",
      lastActiveLabel: "1h ago",
      twoFA: "On",
    },
    {
      id: "m4",
      name: "Finance Desk",
      email: "finance@supplier.com",
      avatar: "FD",
      status: "Active",
      seat: "Finance",
      roleId: "finance_manager",
      lastActiveLabel: "Yesterday",
      twoFA: "On",
    },
    {
      id: "m5",
      name: "Creator Guest",
      email: "amina@creator.com",
      avatar: "AK",
      status: "Invited",
      seat: "Creator Guest",
      roleId: "creator_guest",
      lastActiveLabel: "—",
      twoFA: "Off",
    },
  ];
}

function initialInvites() {
  return [
    {
      id: "inv1",
      email: "amina@creator.com",
      roleId: "creator_guest",
      seat: "Creator Guest",
      createdAtLabel: "Today",
      expiresAtLabel: "In 7 days",
      status: "Pending",
    },
    {
      id: "inv2",
      email: "ops@support.com",
      roleId: "moderator_support",
      seat: "Support",
      createdAtLabel: "Yesterday",
      expiresAtLabel: "In 6 days",
      status: "Pending",
    },
  ];
}

function nowLabel() {
  return new Date().toLocaleString();
}

function initialAudit() {
  return [
    {
      id: "a1",
      at: nowLabel(),
      actor: "Supplier Owner",
      action: "Created supplier permission set",
      detail: "Converted Creator-facing roles page into Supplier-facing matrix with campaign, creator, proposal and contract controls.",
      severity: "info",
    },
    {
      id: "a2",
      at: nowLabel(),
      actor: "Claire N.",
      action: "Reviewed live-operation defaults",
      detail: "Confirmed Live Sessionz Core includes Answer live chats, View poll stats and Go live / start live session with Owner default access enabled.",
      severity: "info",
    },
    {
      id: "a3",
      at: nowLabel(),
      actor: "Finance Desk",
      action: "Viewed subscription account details",
      detail: "Finance role has account-level subscription visibility enabled.",
      severity: "warn",
    },
  ];
}

export default function SupplierRolesPermissionsPreviewCanvas() {
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState("roles");
  const [roles, setRoles] = useState(() => defaultRoles());
  const [members, setMembers] = useState(() => initialMembers());
  const [invites, setInvites] = useState(() => initialInvites());
  const [audit, setAudit] = useState(() => initialAudit());

  const [selectedRoleId, setSelectedRoleId] = useState("supplier_owner");
  const [roleSearch, setRoleSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleDescDraft, setRoleDescDraft] = useState("");

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("viewer");
  const [inviteSeat, setInviteSeat] = useState("Manager");

  const [require2FA, setRequire2FA] = useState(true);
  const [allowExternalInvites, setAllowExternalInvites] = useState(false);
  const [creatorGuestExpiryHours, setCreatorGuestExpiryHours] = useState(24);

  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || roles[0], [roles, selectedRoleId]);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(q));
  }, [roles, roleSearch]);

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

  const seatsUsed = useMemo(() => members.filter((m) => m.status === "Active").length, [members]);
  const seatsInvited = useMemo(
    () => members.filter((m) => m.status === "Invited").length + invites.filter((i) => i.status === "Pending").length,
    [members, invites]
  );

  const permGroupsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return PERM_GROUPS;
    return PERM_GROUPS.map((g) => ({
      ...g,
      perms: g.perms.filter((p) => `${p.label} ${p.hint || ""} ${p.id}`.toLowerCase().includes(q)),
    })).filter((g) => g.perms.length > 0);
  }, [permSearch]);

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
          ? { ...r, name: roleNameDraft.trim() || r.name, description: roleDescDraft.trim() || r.description }
          : r
      )
    );
    setEditRoleOpen(false);
    push("Role updated.", "success");
    log("Supplier Owner", "Updated role metadata", `${selectedRole.name} → ${roleNameDraft.trim() || selectedRole.name}`);
  }

  function setPerm(roleId, permId, value) {
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r;
        return { ...r, perms: { ...r.perms, [permId]: value } };
      })
    );
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
    const copy = {
      ...selectedRole,
      id,
      name: `${selectedRole.name} (Copy)`,
      badge: "Custom",
    };
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
      name: "New supplier role",
      badge: "Custom",
      icon: <User className="h-4 w-4" />,
      description: "Custom supplier role. Configure permissions as needed.",
      perms: buildPermMap(ids, false),
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
    setSelectedRoleId("supplier_owner");
    push("Role deleted.", "success");
    log("Supplier Owner", "Deleted role", name, "warn");
  }

  function inviteMember() {
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      push("Enter a valid email.", "error");
      return;
    }

    const domain = email.split("@")[1] || "";
    const isExternal = !["supplier.com", "campaigns.com", "studio.com"].includes(domain);
    if (isExternal && !allowExternalInvites) {
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
      status: "Pending",
    };
    setInvites((x) => [inv, ...x]);
    setInviteOpen(false);
    setInviteEmail("");
    push("Invite sent.", "success");
    log("Supplier Owner", "Invited member", `${email} (${inviteSeat})`);
  }

  function copyInviteLink(inv) {
    const link = `https://supplier.app/invite/${inv.id}`;
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
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
          </div>
        }
      />

      <main className="flex-1 flex flex-col w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <div className="sticky top-20 z-[34] bg-[#f2f2f2]/85 dark:bg-slate-950/85 backdrop-blur-sm -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {[
              { k: "roles", label: "Roles", icon: <ShieldCheck className="h-4 w-4" /> },
              { k: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
              { k: "invites", label: "Invites", icon: <UserPlus className="h-4 w-4" /> },
              { k: "creators", label: "Creators & Guests", icon: <Building2 className="h-4 w-4" /> },
              { k: "security", label: "Security & Audit", icon: <KeyRound className="h-4 w-4" /> },
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border transition",
                  tab === t.k
                    ? "border-transparent text-white shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                style={tab === t.k ? { background: ORANGE } : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          This supplier-facing version keeps the same enterprise matrix structure as the attached Creator page, but swaps the role model and permission groups for supplier workflows: campaigns, creator invites, proposals, contracts, reviews, subscription, live operations and creator guest access.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Seats (active)</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{seatsUsed}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{seatsInvited} invited / pending</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Roles</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{roles.length}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{roles.filter((r) => r.badge === "Custom").length} custom</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Capability groups</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{PERM_GROUPS.length}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Live chat, polls and delegated go-live included</div>
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Security</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={require2FA ? "good" : "warn"} text={require2FA ? "2FA required" : "2FA optional"} icon={<KeyRound className="h-3.5 w-3.5" />} />
              <Pill tone={allowExternalInvites ? "warn" : "good"} text={allowExternalInvites ? "External invites ON" : "External invites OFF"} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            </div>
          </div>
        </div>

        {tab === "roles" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Roles</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Pick a supplier role to edit permissions and assign to members.</div>
                </div>
                <SmallBtn tone="ghost" icon={<Copy className="h-4 w-4" />} onClick={duplicateRole} title="Duplicate selected role">
                  Duplicate
                </SmallBtn>
              </div>

              <div className="p-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2">
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
                {filteredRoles.map((r) => {
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
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cx("inline-grid place-items-center h-8 w-8 rounded-2xl", active ? "bg-[#f77f00]/10 text-[#f77f00]" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100")}>{r.icon}</span>
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
                })}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
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
                    <SmallBtn tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={deleteRole} disabled={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "")} title={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "") ? "System roles cannot be deleted" : "Delete role"}>
                      Delete
                    </SmallBtn>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex items-start gap-3 shadow-sm">
                  <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-bold">Tip:</span> Supplier live roles now expose chat response, poll visibility and delegated go-live as separate permissions. Supplier Owner keeps full access, while Co-Host / Live Ops and Moderator / Support roles can be tuned without flattening the rest of the matrix.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Permissions</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Search and toggle permissions by supplier capability group.</div>
                  </div>

                  <div className="w-full md:w-[360px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2">
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
                      <div key={g.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-white dark:bg-slate-900 flex items-start justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-grid place-items-center h-8 w-8 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">{g.icon}</span>
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

                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950">
                          <div className="grid grid-cols-1 gap-2">
                            {g.perms.map((p) => {
                              const checked = !!selectedRole?.perms[p.id];
                              const hintBits = [
                                p.hint,
                                p.surface?.length ? `Surface: ${p.surface.join(", ")}` : undefined,
                                p.sensitive ? "Sensitive" : undefined,
                              ].filter(Boolean);

                              return (
                                <div
                                  key={p.id}
                                  className={cx(
                                    "rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 shadow-sm",
                                    p.sensitive && "border-amber-200 dark:border-amber-800/50"
                                  )}
                                >
                                  <Toggle
                                    checked={checked}
                                    onChange={(v) => {
                                      if (!selectedRole) return;
                                      setPerm(selectedRole.id, p.id, v);
                                      push(`${v ? "Enabled" : "Disabled"}: ${p.label}`, "success");
                                      log("Supplier Owner", `${v ? "Enabled" : "Disabled"} permission`, `${selectedRole.name}: ${p.label}`, p.sensitive ? "warn" : "info");
                                    }}
                                    label={p.label}
                                    hint={hintBits.length ? hintBits.join(" · ") : undefined}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Supplier Live Sessionz Core guide</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                          <MessageSquare className="h-4 w-4 text-[#f77f00]" />
                          Answer live chats
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Best for moderators, co-hosts or delegated live support staff.</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                          <BarChart3 className="h-4 w-4 text-[#f77f00]" />
                          View poll stats
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Best for co-hosts, live producers and analysts monitoring audience performance.</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                          <PlayCircle className="h-4 w-4 text-[#f77f00]" />
                          Go live / start live session
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Use for delegated live execution. Keep tightly controlled and grant only to trusted operators.</div>
                      </div>
                    </div>
                  </div>
                  <Pill tone="warn" text="Least privilege" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "members" ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Members</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Assign supplier roles, manage statuses and enforce 2FA policy.</div>
              </div>
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                Invite member
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
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-3 px-1">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-black text-slate-900 dark:text-slate-100 shadow-sm">
                            {m.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{m.name}</div>
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-1 text-sm font-bold text-slate-800 dark:text-slate-200">{m.seat}</td>
                      <td className="py-3 px-1">
                        <select
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-800 dark:text-slate-200"
                          value={m.roleId}
                          onChange={(e) => changeMemberRole(m.id, e.target.value)}
                          disabled={m.status !== "Active" && m.status !== "Invited"}
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-1">
                        <Pill tone={m.status === "Active" ? "good" : m.status === "Invited" ? "warn" : m.status === "Suspended" ? "bad" : "neutral"} text={m.status} />
                      </td>
                      <td className="py-3 px-1">
                        <Pill tone={m.twoFA === "On" ? "good" : "warn"} text={m.twoFA} icon={<KeyRound className="h-3.5 w-3.5" />} />
                      </td>
                      <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300 font-semibold">{m.lastActiveLabel}</td>
                      <td className="py-3 px-1">
                        <div className="flex items-center justify-end gap-1">
                          <SmallBtn tone="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => push("Open member details (demo).")}>Details</SmallBtn>
                          {m.status === "Active" ? (
                            <SmallBtn tone="danger" icon={<Ban className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Suspended")}>Suspend</SmallBtn>
                          ) : m.status === "Suspended" ? (
                            <SmallBtn icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Active")}>Reactivate</SmallBtn>
                          ) : (
                            <SmallBtn tone="ghost" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => changeMemberStatus(m.id, "Active")}>Activate</SmallBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {require2FA ? (
                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-500 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                      <div className="font-bold">2FA is required</div>
                      <div className="mt-1 text-amber-800 dark:text-amber-400">Members with 2FA OFF will be prompted to enable it before accessing sensitive supplier workflows.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "invites" ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Invites</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Pending supplier team and creator guest invitations, with expiry, revoke and resend policies.</div>
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
                  {invites.map((inv) => (
                    <tr key={inv.id} className="border-t border-slate-200 dark:border-slate-800">
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
                          <SmallBtn tone="ghost" icon={<Copy className="h-4 w-4" />} onClick={() => copyInviteLink(inv)} disabled={inv.status !== "Pending"}>Copy</SmallBtn>
                          <SmallBtn tone="danger" icon={<Ban className="h-4 w-4" />} onClick={() => revokeInvite(inv)} disabled={inv.status !== "Pending"}>Revoke</SmallBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Invite policy</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  External invites: <span className="font-bold">{allowExternalInvites ? "Allowed" : "Blocked"}</span> · Creator guest expiry: <span className="font-bold">{creatorGuestExpiryHours}h</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "creators" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Creators & Guests</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Supplier-side creator guest access, collaboration gating and onboarding safeguards.</div>
                </div>
                <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                  Invite creator
                </SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Creator guest safeguards</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />Creator guest links should expire automatically and be revocable instantly.</div>
                  <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />Creator guests can view approved media but cannot approve or reject assets unless explicitly granted.</div>
                  <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-500 mt-0.5" />If creators upload media, require copyright attestation and approver review before it appears in supplier campaign assets.</div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Creator guest expiry</div>
                  <div className="flex items-center gap-2">
                    <SmallBtn icon={<Ban className="h-4 w-4" />} onClick={() => setCreatorGuestExpiryHours((h) => Math.max(1, h - 1))} disabled={creatorGuestExpiryHours <= 1}>-1h</SmallBtn>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100">{creatorGuestExpiryHours}h</div>
                    <SmallBtn icon={<Plus className="h-4 w-4" />} onClick={() => setCreatorGuestExpiryHours((h) => Math.min(168, h + 1))}>+1h</SmallBtn>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Applied to session-only creator guest links and supplier-created guest access.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Quick actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <SmallBtn icon={<Building2 className="h-4 w-4" />} onClick={() => push("Open creator directory (demo).")}>Creator directory</SmallBtn>
                <SmallBtn icon={<ShieldCheck className="h-4 w-4" />} onClick={() => push("Review creator permissions (demo).")}>Review guest permissions</SmallBtn>
                <SmallBtn icon={<FileText className="h-4 w-4" />} onClick={() => push("Open Proposals (demo).")}>Open Proposals</SmallBtn>
                <SmallBtn icon={<Briefcase className="h-4 w-4" />} onClick={() => push("Open Contracts (demo).")}>Open Contracts</SmallBtn>
                <SmallBtn icon={<AlertTriangle className="h-4 w-4" />} onClick={() => push("Report incident to Ops (demo).") } tone="danger">Incident report</SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">What changed?</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">This supplier-facing matrix now includes collaboration, proposals and contracts, while preserving live chat, poll stats, go-live permissions, Reviews and My Subscription.</div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Security controls</div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3">
                    <Toggle
                      checked={require2FA}
                      onChange={(v) => {
                        setRequire2FA(v);
                        push(`2FA requirement ${v ? "enabled" : "disabled"}.`, "success");
                        log("Supplier Owner", "Changed security setting", `Require 2FA: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Require 2FA for all members"
                      hint="Strongly recommended for payouts, tracking links, destination keys, live go-start delegation, team review visibility and subscription account details."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3">
                    <Toggle
                      checked={allowExternalInvites}
                      onChange={(v) => {
                        setAllowExternalInvites(v);
                        push(`External invites ${v ? "enabled" : "disabled"}.`, "success");
                        log("Supplier Owner", "Changed invite policy", `External invites: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Allow external invites"
                      hint="If OFF, only whitelisted internal domains can be invited. Useful when creator guest access must stay controlled."
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-500 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                      <div className="font-bold">Sensitive access review</div>
                      <div className="mt-1 text-amber-800 dark:text-amber-400">Review roles with access to contracts, proposal negotiation, creator invite acceptance, short links, destinations, payouts, team review visibility and subscription account details.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Device & session policies</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Add device list, login sessions and revocation controls here for supplier operators and creator guests.</div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Audit log</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">High-signal events: role changes, creator invites, contract actions, proposal negotiations, subscription visibility, go-live delegation and safety incidents.</div>
                </div>
                <SmallBtn icon={<Copy className="h-4 w-4" />} onClick={() => push("Export audit (demo).")}>Export</SmallBtn>
              </div>

              <div className="p-4 space-y-3 max-h-[520px] overflow-auto">
                {audit.map((a) => (
                  <div key={a.id} className={cx("rounded-3xl border p-3 shadow-sm", a.severity === "critical" ? "border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10" : a.severity === "warn" ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{a.action}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.actor} · {a.at}</div>
                        {a.detail ? <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{a.detail}</div> : null}
                      </div>
                      <Pill tone={a.severity === "critical" ? "bad" : a.severity === "warn" ? "warn" : "neutral"} text={a.severity === "critical" ? "Critical" : a.severity === "warn" ? "Warn" : "Info"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <Modal open={editRoleOpen} title="Edit role" onClose={() => setEditRoleOpen(false)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Role name</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
              value={roleNameDraft}
              onChange={(e) => setRoleNameDraft(e.target.value)}
              placeholder="e.g., Contracts Manager"
            />
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Description</div>
            <textarea
              className="mt-2 w-full min-h-[86px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none text-slate-900 dark:text-slate-100"
              value={roleDescDraft}
              onChange={(e) => setRoleDescDraft(e.target.value)}
              placeholder="What this role can do…"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end p-1">
          <SmallBtn icon={<Ban className="h-4 w-4" />} onClick={() => setEditRoleOpen(false)}>Cancel</SmallBtn>
          <SmallBtn tone="primary" icon={<Save className="h-4 w-4" />} onClick={saveRoleMeta}>Save</SmallBtn>
        </div>
      </Modal>

      <Modal open={createRoleOpen} title="Create new role" onClose={() => setCreateRoleOpen(false)}>
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">New supplier role</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Creates a blank custom supplier role with no permissions enabled. Configure permissions after creating.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2 p-1">
          <SmallBtn onClick={() => setCreateRoleOpen(false)} icon={<Ban className="h-4 w-4" />}>Cancel</SmallBtn>
          <SmallBtn tone="primary" onClick={createRole} icon={<Plus className="h-4 w-4" />}>Create role</SmallBtn>
        </div>
      </Modal>

      <Modal open={inviteOpen} title="Invite member" onClose={() => setInviteOpen(false)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1">
          <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Email</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">External invites are {allowExternalInvites ? "allowed" : "blocked"} by policy.</div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Seat</div>
            <select className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100" value={inviteSeat} onChange={(e) => setInviteSeat(e.target.value)}>
              <option value="Owner">Owner</option>
              <option value="Manager">Manager</option>
              <option value="Live Ops">Live Ops</option>
              <option value="Finance">Finance</option>
              <option value="Creator Guest">Creator Guest</option>
              <option value="Support">Support</option>
            </select>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Seat type affects policy and expiry handling.</div>
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Role</div>
          <select className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100" value={inviteRoleId} onChange={(e) => setInviteRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Invitees receive this role immediately after accepting.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2 p-1">
          <SmallBtn onClick={() => setInviteOpen(false)} icon={<Ban className="h-4 w-4" />}>Cancel</SmallBtn>
          <SmallBtn tone="primary" onClick={inviteMember} icon={<UserPlus className="h-4 w-4" />}>Send invite</SmallBtn>
        </div>
      </Modal>
    </div>
  );
}
