"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BarChart3,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crown,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Globe,
  HelpCircle,
  KeyRound,
  Layers,
  Lock,
  Minus,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  UserRound,
  Users,
  Video,
  Wand2,
  Zap
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { creatorApi } from "../../lib/creatorApi";

/**
 * Roles & Permissions — Premium (Regenerated)
 * -------------------------------------------
 * Updated to reflect recent product expansion:
 * - Shoppable Adz: Adz Dashboard / Adz Marketplace / Adz Manager / Ad Builder / Adz Performance
 * - Dealz Marketplace (hybrid hub): Shoppable Adz + Live Sessionz + Live + Shoppables
 * - Live Sessionz Pro: Stream to Platforms, Audience Notifications, Overlays & CTAs Pro, Safety & Moderation, Post-Live Publisher
 * - Asset Library (independent page) used by both Ad Builder & Live Builder (picker mode)
 * - Tracking & Integrations, Templates & Brand Kit (premium surfaces)
 *
 * Notes:
 * - Permissions are organized by capability group (e.g., Shoppable Adz, Live Sessionz).
 * - Sensitive permissions show a warning badge and hint.
 * - This file is self-contained UI (demo data); wire to your API as needed.
 */

const ORANGE = "#f77f00";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// Plan type removed

type Surface = "Web" | "App" | "API";

type Perm = {
  id: string;
  label: string;
  hint?: string;
  surface?: Surface[];
  sensitive?: boolean;
};

type PermGroup = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  perms: Perm[];
};

type Role = {
  id: string;
  name: string;
  badge: "System" | "Custom";
  description: string;
  icon: React.ReactNode;
  perms: Record<string, boolean>;
};

type MemberStatus = "Active" | "Invited" | "Inactive" | "Suspended";
type Seat = "Creator" | "Manager" | "Supplier Guest" | "Support Ops";

type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: MemberStatus;
  seat: Seat;
  roleId: string;
  lastActiveLabel: string;
  twoFA: "On" | "Off";
};

type Invite = {
  id: string;
  email: string;
  roleId: string;
  seat: Seat;
  createdAtLabel: string;
  expiresAtLabel: string;
  status: "Pending" | "Accepted" | "Expired" | "Revoked";
};

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
  severity?: "info" | "warn" | "critical";
};

function nowLabel() {
  return new Date().toLocaleString();
}

function useToasts() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; tone: "default" | "success" | "error" }>>([]);
  const push = (message: string, tone: "default" | "success" | "error" = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Array<{ id: string; message: string; tone: "default" | "success" | "error" }> }) {
  return (
    <div className="fixed top-24 right-3 md:right-6 z-[80] flex flex-col gap-2 w-[min(420px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border px-3 py-2 text-sm shadow-sm bg-white dark:bg-slate-900",
            t.tone === "success" ? "border-emerald-200 dark:border-emerald-800" : t.tone === "error" ? "border-rose-200 dark:border-rose-800" : "border-slate-200 dark:border-slate-800"
          )}
        >
          <div className="flex items-start gap-2">
            <span className={cx("mt-1.5 h-2 w-2 rounded-full", t.tone === "success" ? "bg-emerald-500" : t.tone === "error" ? "bg-rose-500" : "bg-amber-500")} />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-bold dark:text-slate-50">{title}</div>
          <button type="button" className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Pill({ tone = "neutral", icon, text, title }: { tone?: "neutral" | "good" | "warn" | "bad" | "brand" | "pro"; icon?: React.ReactNode; text: string; title?: string }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400"
          : tone === "pro"
            ? "bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-400"
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

function SmallBtn({
  tone = "neutral",
  icon,
  children,
  onClick,
  disabled,
  title
}: {
  tone?: "neutral" | "primary" | "ghost" | "danger";
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={cx(base, cls)} style={tone === "primary" ? { background: ORANGE } : undefined}>
      {icon}
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
  hint
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
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
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white dark:bg-slate-100 shadow transition", checked ? "left-[22px]" : "left-[2px]")} />
      </button>
    </div>
  );
}

/** ---------------- Permission Model ---------------- */

const PERM_GROUPS: PermGroup[] = [
  {
    id: "dealz",
    title: "Dealz Marketplace Hub",
    icon: <Layers className="h-4 w-4" />,
    desc: "Browse, preview and onboard dealz across Shoppable Adz and Live Sessionz.",
    perms: [
      { id: "dealz.view", label: "View Dealz Marketplace", surface: ["Web"] },
      { id: "dealz.create", label: "Create new dealz (+New Dealz)", surface: ["Web"] },
      { id: "dealz.edit", label: "Edit deal details", surface: ["Web"] },
      { id: "dealz.open_builders", label: "Open Ad Builder / Live Builder", hint: "Allows navigation handoff.", surface: ["Web"] },
      { id: "dealz.publish_links", label: "Manage share links", hint: "Generate / copy share links.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "adz_core",
    title: "Shoppable Adz Core",
    icon: <Wand2 className="h-4 w-4" />,
    desc: "Build and publish Shoppable Adz with creator-first preview behavior.",
    perms: [
      { id: "adz.view", label: "View Shoppable Adz", surface: ["Web"] },
      { id: "adz.create", label: "Create / edit Adz", surface: ["Web"] },
      { id: "adz.generate", label: "Generate Ad (enable share links)", hint: "Replaces legacy “Publish Ad”.", surface: ["Web"], sensitive: true },
      { id: "adz.schedule", label: "Schedule Adz", hint: "Date/time, duration, timezone aware.", surface: ["Web"] },
      { id: "adz.manage_offers", label: "Manage featured offers", hint: "Multi-offer configuration, posters & item media.", surface: ["Web"] },
      { id: "adz.manage_cta", label: "Manage CTA Builder", hint: "Button labels + behaviors reflect in preview in real-time.", surface: ["Web"] },
      { id: "adz.manage_tracking", label: "Manage tracking links", hint: "UTM presets & short links when enabled.", surface: ["Web"] },
      { id: "adz.policy_preflight", label: "View preflight checks", hint: "Collapsed by default; shows readiness states.", surface: ["Web"] }
    ]
  },
  {
    id: "adz_analytics",
    title: "Adz Performance",
    icon: <TrendingUp className="h-4 w-4" />,
    desc: "Deep analytics: funnel, breakdowns, exports and insights.",
    perms: [
      { id: "adzperf.view", label: "View Adz Performance", surface: ["Web"] },
      { id: "adzperf.export", label: "Export reports", surface: ["Web"], sensitive: true },
      { id: "adzperf.insights", label: "Insights & recommendations", hint: "Performance optimization.", surface: ["Web"] }
    ]
  },
  {
    id: "assets",
    title: "Asset Library",
    icon: <FolderOpen className="h-4 w-4" />,
    desc: "Creator-first media library shared by Ad Builder and Live Builder (picker mode).",
    perms: [
      { id: "assets.view", label: "View Asset Library", surface: ["Web"] },
      { id: "assets.upload", label: "Upload media", hint: "Image, video, documents, or URL.", surface: ["Web"] },
      { id: "assets.camera_capture", label: "Capture from camera", hint: "Web camera upload flow.", surface: ["Web"] },
      { id: "assets.submit_review", label: "Submit assets for review", hint: "Routes to admin reviewer.", surface: ["Web"] },
      { id: "assets.review_approve", label: "Approve / request changes", hint: "Reviewer permission.", surface: ["Web"], sensitive: true },
      {
        id: "assets.attach_to_dealz",
        label: "Attach assets to dealz",
        hint: "Allow applying assets to: hero intro, offer poster, offer video, overlays, etc.",
        surface: ["Web"]
      },
      {
        id: "assets.manage_copyright_policy",
        label: "Manage copyright safeguards",
        hint: "Warnings, attestations, and enforcement rules.",
        surface: ["Web"],
        sensitive: true
      }
    ]
  },
  {
    id: "tracking",
    title: "Tracking & Integrations",
    icon: <Globe className="h-4 w-4" />,
    desc: "Pixels, short links, monitoring, attribution notes and payout timing reminders.",
    perms: [
      { id: "tracking.view", label: "View Tracking & Integrations", surface: ["Web"] },
      { id: "tracking.manage_pixels", label: "Manage pixels / destinations", surface: ["Web"], sensitive: true },
      { id: "tracking.short_links", label: "Manage short links", hint: "Domains, rotation rules.", surface: ["Web"], sensitive: true },
      { id: "tracking.monitor", label: "View link monitor & history", surface: ["Web"] },
      { id: "tracking.attribution_notes", label: "Edit attribution notes", surface: ["Web"] }
    ]
  },
  {
    id: "templates",
    title: "Templates & Brand Kit",
    icon: <FileText className="h-4 w-4" />,
    desc: "Saved templates, brand rules and approved copy blocks (compliance-safe).",
    perms: [
      { id: "tpl.view", label: "View templates", surface: ["Web"] },
      { id: "tpl.create", label: "Create / edit templates", surface: ["Web"] },
      { id: "tpl.brandkit", label: "Manage brand kit rules", hint: "Fonts, colors, voice guidelines.", surface: ["Web"], sensitive: true },
      { id: "tpl.approved_copy", label: "Manage approved copy blocks", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "live_core",
    title: "Live Sessionz Core",
    icon: <Video className="h-4 w-4" />,
    desc: "Create sessions, manage run-of-show, featured items, and go live.",
    perms: [
      { id: "live.view", label: "View Live Dashboard / Builder", surface: ["Web"] },
      { id: "live.create", label: "Create / edit sessions", surface: ["Web"] },
      { id: "live.schedule", label: "Schedule sessions", surface: ["Web"] },
      { id: "live.go_live", label: "Start / end live", hint: "Go Live disabled until preflight passes.", surface: ["Web"], sensitive: true },
      { id: "live.manage_featured", label: "Manage featured items", hint: "Posters (500×500) + item media viewers.", surface: ["Web"] },
      { id: "live.manage_overlays_basic", label: "Manage basic overlays", hint: "Lower-third, pinned item, timer.", surface: ["Web"] }
    ]
  },
  {
    id: "live_pro_stream",
    title: "Stream to Platforms",
    icon: <ExternalLink className="h-4 w-4" />,
    desc: "Destinations, output profiles, preflight and health monitoring for multistream.",
    perms: [
      { id: "livepro.stream.view", label: "View Stream to Platforms", surface: ["Web"] },
      { id: "livepro.stream.manage_destinations", label: "Connect / manage destinations", surface: ["Web"], sensitive: true },
      { id: "livepro.stream.test_stream", label: "Test stream", hint: "Premium test stream button.", surface: ["Web"] },
      { id: "livepro.stream.output_profiles", label: "Edit output profiles", hint: "Bitrate, resolution, audio, latency.", surface: ["Web"] },
      { id: "livepro.stream.health_monitor", label: "View live health monitor", surface: ["Web"] }
    ]
  },
  {
    id: "live_pro_notify",
    title: "Audience Notifications",
    icon: <Zap className="h-4 w-4" />,
    desc: "Channel prompts, template packs and phone mockup previews (opt-in workflows).",
    perms: [
      { id: "livepro.notify.view", label: "View Audience Notifications", surface: ["Web"] },
      { id: "livepro.notify.channels", label: "Manage channels", hint: "WhatsApp, Telegram, LINE, Viber, RCS.", surface: ["Web"] },
      { id: "livepro.notify.templates", label: "Select template packs", hint: "Admin-approved packs with versioning.", surface: ["Web"] },
      { id: "livepro.notify.schedule", label: "Configure reminder schedule", hint: "Includes WhatsApp 24h window planning rules.", surface: ["Web"] },
      { id: "livepro.notify.previews", label: "View phone mockup previews", surface: ["Web"] }
    ]
  },
  {
    id: "live_alerts",
    title: "Live Alerts Manager",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "One-tap alerts from Creator App (with guardrails and frequency caps).",
    perms: [
      { id: "livealerts.send", label: "Send live alerts", hint: "We’re live / Flash deal / Last chance.", surface: ["App"] },
      { id: "livealerts.override_caps", label: "Override frequency caps", hint: "Highly sensitive.", surface: ["App"], sensitive: true }
    ]
  },
  {
    id: "live_overlays_cta",
    title: "Overlays & CTAs Pro",
    icon: <Sparkles className="h-4 w-4" />,
    desc: "QR codes, short links with UTM tags, countdown timers, lower thirds, A/B variants.",
    perms: [
      { id: "livepro.overlays.view", label: "View Overlays & CTAs Pro", surface: ["Web"] },
      { id: "livepro.overlays.qr", label: "Generate QR overlays", surface: ["Web"] },
      { id: "livepro.overlays.shortlinks", label: "Create short links with UTM/source tags", surface: ["Web"], sensitive: true },
      { id: "livepro.overlays.ab", label: "A/B variants", surface: ["Web"] }
    ]
  },
  {
    id: "live_safety",
    title: "Safety & Moderation",
    icon: <ShieldCheck className="h-4 w-4" />,
    desc: "Chat tools, keyword filters, emergency controls and incident reporting.",
    perms: [
      { id: "livepro.safety.view", label: "View Safety & Moderation", surface: ["Web"] },
      { id: "livepro.safety.keyword_filters", label: "Manage keyword filters", surface: ["Web"] },
      { id: "livepro.safety.mute_chat", label: "Emergency mute chat", hint: "Per destination where supported.", surface: ["Web"], sensitive: true },
      { id: "livepro.safety.pause_notifications", label: "Pause outgoing notifications", surface: ["Web"] },
      { id: "livepro.safety.incident", label: "Send incident report to Ops", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "live_postlive",
    title: "Post-Live Publisher",
    icon: <CheckCircle2 className="h-4 w-4" />,
    desc: "Replay publishing, clip export plan and conversion boosters (recovery, price drop, restock).",
    perms: [
      { id: "livepro.postlive.view", label: "View Post-Live", surface: ["Web"] },
      { id: "livepro.postlive.publish_replay", label: "Publish replay page", surface: ["Web"] },
      { id: "livepro.postlive.clip_export", label: "Plan clips & exports", surface: ["Web"] },
      { id: "livepro.postlive.send_replay", label: "Send replay to channels", surface: ["Web"] },
      { id: "livepro.postlive.conversion_boost", label: "Post-live conversion booster", surface: ["Web"] }
    ]
  },
  {
    id: "availability",
    title: "Scheduling & Availability",
    icon: <CalendarClock className="h-4 w-4" />,
    desc: "Availability and staffing visibility for sessionz and shoots.",
    perms: [
      { id: "availability.manage_own", label: "Set my availability", surface: ["Web", "App"] },
      { id: "availability.connect_calendar", label: "Connect calendar (busy/free)", surface: ["Web"] },
      { id: "availability.view_team", label: "View team availability", hint: "Privacy-sensitive; show busy/free.", surface: ["Web"], sensitive: true },
      { id: "availability.manage_team", label: "Manage availability for others", hint: "Ops-level permission.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "suppliers",
    title: "Suppliers & Guests",
    icon: <Building2 className="h-4 w-4" />,
    desc: "Invite supplier guests, manage supplier directory and control guest join policies.",
    perms: [
      { id: "suppliers.invite_guest", label: "Invite supplier guest", hint: "Session-only guest join links.", surface: ["Web"], sensitive: true },
      { id: "suppliers.revoke_guest", label: "Revoke guest access", hint: "Immediately blocks join links.", surface: ["Web"], sensitive: true },
      { id: "suppliers.directory", label: "Manage supplier directory", hint: "Tags, categories, approvals.", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "analytics_money",
    title: "Analytics & Money",
    icon: <TrendingUp className="h-4 w-4" />,
    desc: "Analytics, rankings, payouts and statements.",
    perms: [
      { id: "analytics.view", label: "View analytics", surface: ["Web"] },
      { id: "analytics.export", label: "Export analytics", surface: ["Web"], sensitive: true },
      { id: "money.view", label: "View earnings", surface: ["Web"], sensitive: true },
      { id: "money.request_payout", label: "Request payout", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "admin",
    title: "Workspace Settings",
    icon: <Settings className="h-4 w-4" />,
    desc: "Members, roles, devices, policies and audit logs.",
    perms: [
      { id: "admin.manage_team", label: "Manage members", surface: ["Web"], sensitive: true },
      { id: "admin.manage_roles", label: "Manage roles & permissions", surface: ["Web"], sensitive: true },
      { id: "admin.security", label: "Security settings (2FA, SSO)", surface: ["Web"], sensitive: true },
      { id: "admin.audit", label: "View audit log", surface: ["Web"], sensitive: true }
    ]
  },
  {
    id: "account",
    title: "Account & Performance",
    icon: <BarChart3 className="h-4 w-4" />,
    desc: "Manage reviews, subscriptions, and team performance.",
    perms: [
      { id: "reviews.view", label: "View Reviews", hint: "See team performance and reviews.", surface: ["Web"] },
      { id: "subscription.view", label: "View My Subscription", hint: "See subscription details and status.", surface: ["Web"] }
    ]
  }
];

function allPermIds() {
  return PERM_GROUPS.flatMap((g) => g.perms.map((p) => p.id));
}

function buildPermMap(ids: string[], value: boolean) {
  const m: Record<string, boolean> = {};
  ids.forEach((id) => (m[id] = value));
  return m;
}

const SYSTEM_ROLE_IDS = [
  "owner",
  "creator_manager",
  "shoppable_manager",
  "live_producer",
  "moderator",
  "analyst",
  "finance",
  "support_ops",
  "supplier_guest",
  "viewer"
];

/** ---------------- Main Page ---------------- */

type TabKey = "roles" | "members" | "invites" | "suppliers" | "security";

export default function RolesPermissionsPremium() {
  const { toasts, push } = useToasts();

  const [tab, setTab] = useState<TabKey>("roles");

  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId) || null, [roles, selectedRoleId]);

  const [permSearch, setPermSearch] = useState("");
  const [roleNameDraft, setRoleNameDraft] = useState("");
  const [roleDescDraft, setRoleDescDraft] = useState("");

  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("viewer");
  const [inviteSeat, setInviteSeat] = useState<Seat>("Manager");

  // security (demo toggles)
  const [require2FA, setRequire2FA] = useState(true);
  const [allowExternalInvites, setAllowExternalInvites] = useState(false);
  const [supplierGuestExpiryHours, setSupplierGuestExpiryHours] = useState(24);
  const [hasLoadedBackendRoles, setHasLoadedBackendRoles] = useState(false);

  const [activeRole, setActiveRole] = useState<string>("owner");

  const switchActiveRole = (roleId: string) => {
    const roleIdLower = roleId.toLowerCase();
    setActiveRole(roleIdLower);
    push(`Session switched to ${roleIdLower} role.`, "success");
    log("Owner", "Switched active session role", roleIdLower, "info");
  };

  useEffect(() => {
    let cancelled = false;
    void creatorApi
      .roles()
      .then(async (payload) => {
        if (cancelled) return;

        const backendRoles = Array.isArray(payload.roles) ? payload.roles : [];
        if (backendRoles.length > 0) {
          setRoles(
            backendRoles.map((entry) => {
              const roleRow = entry as Record<string, unknown>;
              return {
                id: String(roleRow.id || roleRow.key || `role_${Math.random().toString(36).slice(2)}`),
                name: String(roleRow.name || "Role"),
                badge: String(roleRow.badge || "Custom") === "System" ? "System" : "Custom",
                description: String(roleRow.description || "Workspace role"),
                icon: <User className="h-4 w-4" />,
                perms:
                  roleRow.perms && typeof roleRow.perms === "object" && !Array.isArray(roleRow.perms)
                    ? (roleRow.perms as Record<string, boolean>)
                    : {}
              } satisfies Role;
            })
          );
          setSelectedRoleId((prev) => {
            if (prev && backendRoles.some((entry) => String((entry as Record<string, unknown>).id || "") === prev)) {
              return prev;
            }
            return "";
          });
        } else {
          setRoles([]);
          setSelectedRoleId("");
        }

        const backendMembers = Array.isArray(payload.members) ? payload.members : [];
        if (backendMembers.length > 0) {
          setMembers(
            backendMembers.map((entry, index) => {
              const member = entry as Record<string, unknown>;
              const statusRaw = String(member.status || "Active");
              const normalizedStatus =
                statusRaw.toLowerCase() === "invited"
                  ? "Invited"
                  : statusRaw.toLowerCase() === "suspended"
                    ? "Suspended"
                    : statusRaw.toLowerCase() === "inactive"
                      ? "Inactive"
                      : "Active";
              return {
                id: String(member.id || `member_${index}`),
                name: String(member.name || member.email || "Member"),
                email: String(member.email || ""),
                avatarUrl: "",
                status: normalizedStatus as MemberStatus,
                seat: String(member.seat || "Manager") as Seat,
                roleId: String(member.roleId || "owner"),
                lastActiveLabel: "Synced",
                twoFA: "On"
              } satisfies Member;
            })
          );
        }

        const backendInvites = Array.isArray(payload.invites) ? payload.invites : [];
        if (backendInvites.length > 0) {
          setInvites(
            backendInvites.map((entry, index) => {
              const invite = entry as Record<string, unknown>;
              const statusRaw = String(invite.status || "Pending");
              const normalizedStatus =
                statusRaw.toLowerCase() === "accepted"
                  ? "Accepted"
                  : statusRaw.toLowerCase() === "expired"
                    ? "Expired"
                    : statusRaw.toLowerCase() === "revoked"
                      ? "Revoked"
                      : "Pending";
              return {
                id: String(invite.id || `invite_${index}`),
                email: String(invite.email || ""),
                roleId: String(invite.roleId || "viewer"),
                seat: String(invite.seat || "Manager") as Seat,
                createdAtLabel: "Synced",
                expiresAtLabel: "—",
                status: normalizedStatus as Invite["status"]
              } satisfies Invite;
            })
          );
        }

        const security =
          payload.workspaceSecurity && typeof payload.workspaceSecurity === "object"
            ? (payload.workspaceSecurity as Record<string, unknown>)
            : null;
        if (security) {
          if (typeof security.require2FA === "boolean") setRequire2FA(security.require2FA);
          if (typeof security.allowExternalInvites === "boolean") setAllowExternalInvites(security.allowExternalInvites);
          if (typeof security.supplierGuestExpiryHours === "number") setSupplierGuestExpiryHours(security.supplierGuestExpiryHours);
        }
      })
      .catch(() => {
        setRoles([]);
        setMembers([]);
        setInvites([]);
      })
      .finally(() => {
        if (!cancelled) {
          setHasLoadedBackendRoles(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    if (!roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId("");
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!hasLoadedBackendRoles) return;
    void creatorApi.updateRolesSecurity({
      require2FA,
      allowExternalInvites,
      supplierGuestExpiryHours
    }).catch(() => undefined);
  }, [allowExternalInvites, hasLoadedBackendRoles, require2FA, supplierGuestExpiryHours]);

  const permIndex = useMemo(() => {
    const m = new Map<string, Perm>();
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

  function log(actor: string, action: string, detail?: string, severity: AuditEvent["severity"] = "info") {
    const e: AuditEvent = { id: `${Date.now()}_${Math.random()}`, at: nowLabel(), actor, action, detail, severity };
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
    const nextName = roleNameDraft.trim() || selectedRole.name;
    const nextDescription = roleDescDraft.trim() || selectedRole.description;
    setRoles((rs) =>
      rs.map((r) => (r.id === selectedRole.id ? { ...r, name: nextName, description: nextDescription } : r))
    );
    void creatorApi.updateRole(selectedRole.id, {
      name: nextName,
      description: nextDescription
    }).catch(() => undefined);
    setEditRoleOpen(false);
    push("Role updated.", "success");
    log("Owner", "Updated role metadata", `${selectedRole.name} → ${nextName}`);
  }

  function setPerm(roleId: string, permId: string, value: boolean) {
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r;
        const nextPerms = { ...r.perms, [permId]: value };
        void creatorApi.updateRole(roleId, { perms: nextPerms }).catch(() => undefined);
        return { ...r, perms: nextPerms };
      })
    );
  }

  function setGroupAll(roleId: string, groupId: string, value: boolean) {
    const g = PERM_GROUPS.find((x) => x.id === groupId);
    if (!g) return;
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r;
        const next = { ...r.perms };
        g.perms.forEach((p) => {
          next[p.id] = value;
        });
        void creatorApi.updateRole(roleId, { perms: next }).catch(() => undefined);
        return { ...r, perms: next };
      })
    );
  }

  function duplicateRole() {
    if (!selectedRole) return;
    const id = `custom_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 999)}`;
    const copy: Role = {
      ...selectedRole,
      id,
      name: `${selectedRole.name} (Copy)`,
      badge: "Custom"
    };
    setRoles((rs) => [copy, ...rs]);
    void creatorApi.createRole({
      id: copy.id,
      name: copy.name,
      badge: copy.badge,
      description: copy.description,
      perms: copy.perms
    }).catch(() => undefined);
    setSelectedRoleId(id);
    push("Role duplicated.", "success");
    log("Owner", "Duplicated role", `${selectedRole.name} → ${copy.name}`);
  }

  function createRole() {
    const ids = allPermIds();
    const id = `custom_${Math.floor(Date.now() / 1000)}_${Math.floor(Math.random() * 999)}`;
    const r: Role = {
      id,
      name: "New role",
      badge: "Custom",
      icon: <User className="h-4 w-4" />,
      description: "Custom role. Configure permissions as needed.",
      perms: buildPermMap(ids, false)
    };
    setRoles((rs) => [r, ...rs]);
    void creatorApi.createRole({
      id: r.id,
      name: r.name,
      badge: r.badge,
      description: r.description,
      perms: r.perms
    }).catch(() => undefined);
    setSelectedRoleId(id);
    setCreateRoleOpen(false);
    push("New role created.", "success");
    log("Owner", "Created role", r.name);
  }

  function deleteRole() {
    if (!selectedRole) return;
    if (SYSTEM_ROLE_IDS.includes(selectedRole.id)) {
      push("System roles cannot be deleted.", "error");
      return;
    }
    const name = selectedRole.name;
    setRoles((rs) => rs.filter((r) => r.id !== selectedRole.id));
    void creatorApi.deleteRole(selectedRole.id).catch(() => undefined);
    setSelectedRoleId("");
    push("Role deleted.", "success");
    log("Owner", "Deleted role", name, "warn");
  }

  function inviteMember() {
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      push("Enter a valid email.", "error");
      return;
    }

    // simple external invite guardrail
    const domain = email.split("@")[1] || "";
    const isExternal = !["creator.com", "studio.com"].includes(domain);
    if (isExternal && !allowExternalInvites) {
      push("External invites are blocked by policy. Enable in Security settings.", "error");
      return;
    }

    const inv: Invite = {
      id: `inv_${Date.now()}_${Math.random()}`,
      email,
      roleId: inviteRoleId,
      seat: inviteSeat,
      createdAtLabel: "Now",
      expiresAtLabel: "In 7 days",
      status: "Pending"
    };
    setInvites((x) => [inv, ...x]);
    void creatorApi.createRoleInvite({
      id: inv.id,
      name: email.split("@")[0] || "Invite",
      email: inv.email,
      roleId: inv.roleId,
      seat: inv.seat
    }).catch(() => undefined);
    setInviteOpen(false);
    setInviteEmail("");
    push("Invite sent.", "success");
    log("Owner", "Invited member", `${email} (${inviteSeat})`);
  }

  function copyInviteLink(inv: Invite) {
    const link = `https://mldz.app/invite/${inv.id}`;
    navigator.clipboard?.writeText(link).catch(() => { });
    push("Invite link copied.", "success");
  }

  function revokeInvite(inv: Invite) {
    setInvites((xs) => xs.map((x) => (x.id === inv.id ? { ...x, status: "Revoked" } : x)));
    push("Invite revoked.", "success");
    log("Owner", "Revoked invite", inv.email, "warn");
  }

  function changeMemberRole(memberId: string, roleId: string) {
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, roleId } : m)));
    void creatorApi.updateRoleMember(memberId, { roleId }).catch(() => undefined);
    push("Role updated.", "success");
    log("Owner", "Changed member role", `${memberId} → ${roleId}`);
  }

  function changeMemberStatus(memberId: string, status: MemberStatus) {
    setMembers((ms) => ms.map((m) => (m.id === memberId ? { ...m, status } : m)));
    void creatorApi.updateRoleMember(memberId, { status }).catch(() => undefined);
    push(`Member status: ${status}`, "success");
    log("Owner", "Changed member status", `${memberId} → ${status}`, status === "Suspended" ? "critical" : "warn");
  }

  // filtered permission groups for editor
  const permGroupsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return PERM_GROUPS;
    return PERM_GROUPS.map((g) => ({
      ...g,
      perms: g.perms.filter((p) => (p.label + " " + (p.hint || "") + " " + p.id).toLowerCase().includes(q))
    })).filter((g) => g.perms.length > 0);
  }, [permSearch]);

  // summary metrics
  const seatsUsed = members.filter((m) => m.status === "Active").length;
  const seatsInvited = members.filter((m) => m.status === "Invited").length + invites.filter((i) => i.status === "Pending").length;

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
        {/* Sticky Filter/Nav Bar */}
        <div className="sticky top-44 z-[34] bg-[#f2f2f2]/85 dark:bg-slate-950/85 backdrop-blur-sm -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {[
              { k: "roles", label: "Roles", icon: <ShieldCheck className="h-4 w-4" /> },
              { k: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
              { k: "invites", label: "Invites", icon: <UserPlus className="h-4 w-4" /> },
              { k: "suppliers", label: "Suppliers & Guests", icon: <Building2 className="h-4 w-4" /> },
              { k: "security", label: "Security & Audit", icon: <KeyRound className="h-4 w-4" /> }
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k as TabKey)}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border transition",
                  tab === (t.k as TabKey) ? "border-transparent text-white shadow-sm" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                style={tab === (t.k as TabKey) ? { background: ORANGE } : undefined}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            Updated for Shoppable Adz + Live Sessionz Pro + Asset Library + Dealz Marketplace. Use this as your RBAC model.
          </div>
          <div className="flex items-center gap-2 text-xs font-bold px-4 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-950/40 dark:bg-orange-950/20 dark:text-orange-300">
            <UserRound className="h-4 w-4" />
            <span>Active Session Role:</span>
            <span className="uppercase">{activeRole}</span>
          </div>
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
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 transition-colors">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input className="bg-transparent outline-none text-sm w-full dark:text-slate-200" placeholder="Search roles…" onChange={() => { }} />
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2 max-h-[560px] overflow-auto scrollbar-hide">
                {roles.map((r) => {
                  const active = r.id === selectedRoleId;
                  const enabled = Object.values(r.perms).filter(Boolean).length;
                  const isSystem = r.badge === "System";
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cx(
                        "w-full text-left rounded-3xl border px-3 py-3 transition shadow-sm",
                        active ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cx("inline-grid place-items-center h-8 w-8 rounded-2xl transition-colors", active ? "bg-[#f77f00]/10 text-[#f77f00]" : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100")}>
                            {r.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{r.name}</div>
                            <div className={cx("truncate text-xs", active ? "text-slate-600 dark:text-slate-400" : "text-slate-600 dark:text-slate-400")}>{r.description}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Pill tone="neutral" text={r.badge} />
                          <div className={cx("text-xs font-bold", active ? "text-slate-700 dark:text-slate-300" : "text-slate-700 dark:text-slate-300")}>{enabled} enabled</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                    <SmallBtn
                      tone="primary"
                      icon={<Crown className="h-4 w-4" />}
                      onClick={() => switchActiveRole(selectedRole?.id || "owner")}
                      disabled={activeRole === (selectedRole?.id || "").toLowerCase()}
                    >
                      {activeRole === (selectedRole?.id || "").toLowerCase() ? "Current session role" : "Switch to this role"}
                    </SmallBtn>
                    <SmallBtn icon={<Pencil className="h-4 w-4" />} onClick={openEditRole}>
                      Edit
                    </SmallBtn>
                    <SmallBtn tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={deleteRole} disabled={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "")} title={SYSTEM_ROLE_IDS.includes(selectedRole?.id || "") ? "System roles cannot be deleted" : "Delete role"}>
                      Delete
                    </SmallBtn>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex items-start gap-3 transition-colors shadow-sm">
                  <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5" />
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-bold">Tip:</span> Use group “Enable all” carefully. Sensitive permissions are marked and should be limited to Owners or trusted managers.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Permissions</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Search and toggle permissions by capability group.</div>
                  </div>

                  <div className="w-full md:w-[360px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 transition-colors">
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
                              <span className="inline-grid place-items-center h-8 w-8 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors">{g.icon}</span>
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
                                log("Owner", "Enabled permission group", g.title);
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
                                log("Owner", "Disabled permission group", g.title, "warn");
                              }}
                            >
                              Disable all
                            </SmallBtn>
                          </div>
                        </div>

                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 transition-colors">
                          <div className="grid grid-cols-1 gap-2">
                            {g.perms.map((p) => {
                              const checked = !!selectedRole?.perms[p.id];

                              const hintBits = [
                                p.hint,
                                p.surface?.length ? `Surface: ${p.surface.join(", ")}` : undefined,
                                p.sensitive ? "Sensitive" : undefined
                              ].filter(Boolean);

                              return (
                                <div key={p.id} className={cx("rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 transition-colors shadow-sm", p.sensitive && "border-amber-200 dark:border-amber-800/50")}>
                                  <Toggle
                                    checked={checked}
                                    onChange={(v) => {
                                      if (!selectedRole) return;
                                      setPerm(selectedRole.id, p.id, v);
                                      push(`${v ? "Enabled" : "Disabled"}: ${p.label}`, "success");
                                      log("Owner", `${v ? "Enabled" : "Disabled"} permission`, `${selectedRole.name}: ${p.label}`, p.sensitive ? "warn" : "info");
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

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Assignment guidance</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Keep sensitive permissions limited: tracking, payouts, security, incident reporting, destination keys.
                    </div>
                  </div>
                  <Pill tone="warn" text="Least privilege" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
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
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Assign roles, manage statuses, and enforce 2FA policy.</div>
              </div>
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                Invite member
              </SmallBtn>
            </div>

            <div className="p-4 overflow-auto scrollbar-hide">
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
                    <tr key={m.id} className="border-t border-slate-200 dark:border-slate-800 transition-colors">
                      <td className="py-3 px-1">
                        <div className="flex items-center gap-3">
                          <img src={m.avatarUrl} alt={m.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{m.name}</div>
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email}</div>
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
                          tone={m.status === "Active" ? "good" : m.status === "Invited" ? "warn" : m.status === "Suspended" ? "bad" : "neutral"}
                          text={m.status}
                        />
                      </td>
                      <td className="py-3 px-1">
                        <Pill tone={m.twoFA === "On" ? "good" : "warn"} text={m.twoFA} icon={<KeyRound className="h-3.5 w-3.5" />} />
                      </td>
                      <td className="py-3 px-1 text-sm text-slate-700 dark:text-slate-300 font-semibold">{m.lastActiveLabel}</td>
                      <td className="py-3 px-1">
                        <div className="flex items-center justify-end gap-1">
                          <SmallBtn
                            tone="ghost"
                            icon={<Pencil className="h-4 w-4" />}
                            onClick={() => push("Open member details (demo).")}
                          >
                            Details
                          </SmallBtn>
                          {m.status === "Active" ? (
                            <SmallBtn
                              tone="danger"
                              icon={<Ban className="h-4 w-4" />}
                              onClick={() => changeMemberStatus(m.id, "Suspended")}
                              title="Suspend access"
                            >
                              Suspend
                            </SmallBtn>
                          ) : m.status === "Suspended" ? (
                            <SmallBtn
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => changeMemberStatus(m.id, "Active")}
                              title="Re-activate access"
                            >
                              Reactivate
                            </SmallBtn>
                          ) : (
                            <SmallBtn
                              tone="ghost"
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => changeMemberStatus(m.id, "Active")}
                              title="Mark active"
                            >
                              Activate
                            </SmallBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

            <div className="p-4 overflow-auto scrollbar-hide">
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
                  ))}
                </tbody>
              </table>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Invite policy</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  External invites: <span className="font-bold">{allowExternalInvites ? "Allowed" : "Blocked"}</span> · Supplier guest expiry:{" "}
                  <span className="font-bold">{supplierGuestExpiryHours}h</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "suppliers" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Suppliers & Guests</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Supplier guests are usually session-scoped. Upgrade to collaborator roles for repeated supplier collaborations.</div>
                </div>
                <SmallBtn tone="primary" icon={<Building2 className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
                  Invite supplier
                </SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors shadow-sm">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Guest safeguards (recommended)</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                    Guest links should expire automatically (default 24 hours) and be revocable instantly.
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mt-0.5" />
                    Supplier guests can view approved media but cannot approve/reject assets unless explicitly granted.
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-500 mt-0.5" />
                    If suppliers upload media, require copyright attestation and admin review before it appears in the creator library.
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Supplier guest expiry</div>
                  <div className="flex items-center gap-2">
                    <SmallBtn
                      icon={<Minus className="h-4 w-4" />}
                      onClick={() => setSupplierGuestExpiryHours((h) => Math.max(1, h - 1))}
                      disabled={supplierGuestExpiryHours <= 1}
                    >
                      -1h
                    </SmallBtn>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors">{supplierGuestExpiryHours}h</div>
                    <SmallBtn icon={<Plus className="h-4 w-4" />} onClick={() => setSupplierGuestExpiryHours((h) => Math.min(168, h + 1))}>
                      +1h
                    </SmallBtn>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Applied to session-only guest links and supplier join links.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Quick actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <SmallBtn icon={<ExternalLink className="h-4 w-4" />} onClick={() => push("Open supplier directory (demo).")}>
                  Supplier directory
                </SmallBtn>
                <SmallBtn icon={<ShieldCheck className="h-4 w-4" />} onClick={() => push("Review supplier permissions (demo).")}>
                  Review permissions
                </SmallBtn>
                <SmallBtn icon={<AlertTriangle className="h-4 w-4" />} onClick={() => push("Report incident to Ops (demo).")} tone="danger">
                  Incident report
                </SmallBtn>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 shadow-sm transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">What changed recently?</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Shoppable Adz and Live Sessionz now share a single Asset Library. Supplier guests may contribute media, but it must be reviewed before use in dealz.
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
                        log("Owner", "Changed security setting", `Require 2FA: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Require 2FA for all members"
                      hint="Strongly recommended for sensitive workflows: payouts, tracking, destination keys, incident reports."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 transition-colors">
                    <Toggle
                      checked={allowExternalInvites}
                      onChange={(v) => {
                        setAllowExternalInvites(v);
                        push(`External invites ${v ? "enabled" : "disabled"}.`, "success");
                        log("Owner", "Changed invite policy", `External invites: ${v ? "ON" : "OFF"}`, "warn");
                      }}
                      label="Allow external invites"
                      hint="If OFF, only whitelisted domains can be invited."
                    />
                  </div>

                </div>

                <div className="mt-4 rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4 transition-colors">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-800 dark:text-amber-500 mt-0.5" />
                    <div className="text-sm text-amber-900 dark:text-amber-300">
                      <div className="font-bold">Sensitive access review</div>
                      <div className="mt-1 text-amber-800 dark:text-amber-400">
                        Review roles with permissions for: payout requests, tracking short links, destination keys, incident reporting, security settings.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Device & session policies (demo)</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Add your device list, login sessions, and revocation controls here.</div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Audit log</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">High-signal events: role changes, invites, share link generation, safety incidents.</div>
                </div>
                <SmallBtn icon={<Copy className="h-4 w-4" />} onClick={() => push("Export audit (demo).")}>
                  Export
                </SmallBtn>
              </div>

              <div className="p-4 space-y-3 max-h-[520px] overflow-auto scrollbar-hide">
                {audit.map((a) => (
                  <div
                    key={a.id}
                    className={cx(
                      "rounded-3xl border p-3 shadow-sm transition-colors",
                      a.severity === "critical" ? "border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10" : a.severity === "warn" ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
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
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Edit role modal */}
      <Modal
        open={editRoleOpen}
        title="Edit role"
        onClose={() => setEditRoleOpen(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Role name</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
              value={roleNameDraft}
              onChange={(e) => setRoleNameDraft(e.target.value)}
              placeholder="e.g., Live Producer"
            />
          </div>
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
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
      <Modal
        open={createRoleOpen}
        title="Create new role"
        onClose={() => setCreateRoleOpen(false)}
      >
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
          <div className="text-sm font-bold text-slate-900 dark:text-slate-50">New role</div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Creates a blank custom role with no permissions enabled. Configure permissions after creating.
          </div>
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
      <Modal
        open={inviteOpen}
        title="Invite member"
        onClose={() => setInviteOpen(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-1">
          <div className="md:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Email</div>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800 text-slate-900 dark:text-slate-100 transition-colors"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              External invites are {allowExternalInvites ? "allowed" : "blocked"} by policy.
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Seat</div>
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none text-slate-900 dark:text-slate-100 transition-colors"
              value={inviteSeat}
              onChange={(e) => setInviteSeat(e.target.value as Seat)}
            >
              <option value="Creator" className="bg-white dark:bg-slate-900">Creator</option>
              <option value="Manager" className="bg-white dark:bg-slate-900">Manager</option>
              <option value="Supplier Guest" className="bg-white dark:bg-slate-900">Supplier Guest</option>
              <option value="Support Ops" className="bg-white dark:bg-slate-900">Support Ops</option>
            </select>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">Seat type affects policies.</div>
          </div>
        </div>

        <div className="mt-3 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
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
