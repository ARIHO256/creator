"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
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
  Users,
  Video,
  Wand2,
  Zap
} from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useApiCache } from "../../api/cache";
import { queryKeys } from "../../api/queryKeys";
import {
  useAuditLogsQuery,
  useCreateWorkspaceRoleMutation,
  useDeleteWorkspaceRoleMutation,
  useInviteWorkspaceMemberMutation,
  useRolesWorkspaceQuery,
  useUpdateWorkspaceSecurityMutation,
  useUpdateWorkspaceMemberMutation,
  useUpdateWorkspaceRoleMutation
} from "../../hooks/api/useWorkspaceRoles";
import { useRemoveSettingsDeviceMutation, useSettingsQuery, useSignOutAllSettingsDevicesMutation } from "../../hooks/api/useSettings";
import type { RolesWorkspaceRecord, UpdateWorkspaceSecurityInput, WorkspaceMemberRecord, WorkspaceRoleRecord } from "../../api/types";

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
 * - /roles-permissions is backend-driven for: role CRUD, permission toggles, member role/status updates,
 *   invites/revoke invite, workspace security policy toggles, and audit log rows.
 * - Some “Quick actions” buttons are still presentation-only placeholders.
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
type Seat = "Creator" | "Manager" | "Supplier Guest" | "Support Ops" | "Owner" | "Team";

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
    id: "account_pages",
    title: "Account Pages",
    icon: <BadgeCheck className="h-4 w-4" />,
    desc: "Control access to creator feedback and account subscription pages.",
    perms: [
      {
        id: "reviews.view",
        label: "View Reviews page",
        hint: "Lets the role open Reviews and see creator/team review performance.",
        surface: ["Web"]
      },
      {
        id: "subscription.view",
        label: "View My Subscription page",
        hint: "Lets the role open subscription status, plan details, and billing cycle.",
        surface: ["Web"]
      }
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

function defaultRoles(): Role[] {
  const ids = allPermIds();
  const none = buildPermMap(ids, false);

  const owner: Role = {
    id: "owner",
    name: "Owner",
    badge: "System",
    icon: <Crown className="h-4 w-4" />,
    description: "Full access across Shoppable Adz, Live Sessionz Pro, tracking, and workspace settings.",
    perms: buildPermMap(ids, true)
  };

  const creatorManager: Role = {
    id: "creator_manager",
    name: "Creator Manager",
    badge: "System",
    icon: <BadgeCheck className="h-4 w-4" />,
    description: "Ops lead: manages dealz, builds ads, schedules sessions, and coordinates approvals.",
    perms: {
      ...none,
      // Dealz
      "dealz.view": true,
      "dealz.create": true,
      "dealz.edit": true,
      "dealz.open_builders": true,
      "dealz.publish_links": true,

      // Adz
      "adz.view": true,
      "adz.create": true,
      "adz.generate": true,
      "adz.schedule": true,
      "adz.manage_offers": true,
      "adz.manage_cta": true,
      "adz.policy_preflight": true,
      "adzperf.view": true,
      "adzperf.export": true,

      // Assets
      "assets.view": true,
      "assets.upload": true,
      "assets.submit_review": true,
      "assets.attach_to_dealz": true,

      // Live
      "live.view": true,
      "live.create": true,
      "live.schedule": true,
      "live.go_live": true,
      "live.manage_featured": true,
      "live.manage_overlays_basic": true,

      // Live Pro surfaces (view + configure)
      "livepro.stream.view": true,
      "livepro.stream.manage_destinations": true,
      "livepro.stream.output_profiles": true,
      "livepro.notify.view": true,
      "livepro.notify.channels": true,
      "livepro.notify.templates": true,
      "livepro.notify.schedule": true,
      "livepro.notify.previews": true,
      "livepro.overlays.view": true,
      "livepro.overlays.qr": true,
      "livepro.overlays.shortlinks": true,
      "livepro.overlays.ab": true,
      "livepro.safety.view": true,
      "livepro.safety.keyword_filters": true,
      "livepro.safety.pause_notifications": true,
      "livepro.postlive.view": true,
      "livepro.postlive.publish_replay": true,
      "livepro.postlive.clip_export": true,
      "livepro.postlive.send_replay": true,
      "livepro.postlive.conversion_boost": true,

      // Availability
      "availability.manage_own": true,
      "availability.connect_calendar": true,
      "availability.view_team": true,

      // Suppliers
      "suppliers.invite_guest": true,
      "suppliers.revoke_guest": true,

      // Analytics/money (no payout method changes here)
      "analytics.view": true,
      "analytics.export": true,
      "money.view": true,
      "money.request_payout": true
    }
  };

  const shoppableManager: Role = {
    id: "shoppable_manager",
    name: "Shoppable Adz Manager",
    badge: "System",
    icon: <Wand2 className="h-4 w-4" />,
    description: "Builds and generates Shoppable Adz; manages assets and tracking needed for publishing.",
    perms: {
      ...none,
      "dealz.view": true,
      "dealz.open_builders": true,
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
      "assets.attach_to_dealz": true,
      "assets.submit_review": true,
      "tracking.view": true,
      "tracking.short_links": true,
      "analytics.view": true,
      "adzperf.view": true
    }
  };

  const liveProducer: Role = {
    id: "live_producer",
    name: "Live Producer",
    badge: "System",
    icon: <Video className="h-4 w-4" />,
    description: "Runs sessions: stream destinations, overlays, safety tools, and post-live publishing.",
    perms: {
      ...none,
      "dealz.view": true,
      "dealz.open_builders": true,
      "live.view": true,
      "live.create": true,
      "live.schedule": true,
      "live.go_live": true,
      "live.manage_featured": true,
      "live.manage_overlays_basic": true,

      "assets.view": true,
      "assets.attach_to_dealz": true,

      // Live Pro
      "livepro.stream.view": true,
      "livepro.stream.manage_destinations": true,
      "livepro.stream.test_stream": true,
      "livepro.stream.output_profiles": true,
      "livepro.stream.health_monitor": true,

      "livepro.notify.view": true,
      "livepro.notify.channels": true,
      "livepro.notify.templates": true,
      "livepro.notify.schedule": true,
      "livepro.notify.previews": true,

      "livealerts.send": true,

      "livepro.overlays.view": true,
      "livepro.overlays.qr": true,
      "livepro.overlays.shortlinks": true,
      "livepro.overlays.ab": true,

      "livepro.safety.view": true,
      "livepro.safety.keyword_filters": true,
      "livepro.safety.mute_chat": true,
      "livepro.safety.pause_notifications": true,
      "livepro.safety.incident": true,

      "livepro.postlive.view": true,
      "livepro.postlive.publish_replay": true,
      "livepro.postlive.clip_export": true,
      "livepro.postlive.send_replay": true,
      "livepro.postlive.conversion_boost": true
    }
  };

  const moderator: Role = {
    id: "moderator",
    name: "Moderator",
    badge: "System",
    icon: <ShieldCheck className="h-4 w-4" />,
    description: "Chat moderation and safety controls (no scheduling or payout permissions).",
    perms: {
      ...none,
      "live.view": true,
      "livepro.safety.view": true,
      "livepro.safety.keyword_filters": true,
      "livepro.safety.mute_chat": true,
      "livepro.safety.pause_notifications": true,
      "livepro.safety.incident": true,
      "assets.view": true
    }
  };

  const analyst: Role = {
    id: "analyst",
    name: "Analyst",
    badge: "System",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Views analytics and performance across Live + Shoppable surfaces.",
    perms: {
      ...none,
      "analytics.view": true,
      "analytics.export": true,
      "adzperf.view": true,
      "adzperf.export": true,
      "dealz.view": true,
      "adz.view": true,
      "live.view": true
    }
  };

  const finance: Role = {
    id: "finance",
    name: "Finance",
    badge: "System",
    icon: <KeyRound className="h-4 w-4" />,
    description: "Earnings visibility and payout operations.",
    perms: {
      ...none,
      "money.view": true,
      "money.request_payout": true,
      "analytics.view": true,
      "admin.audit": true
    }
  };

  const supportOps: Role = {
    id: "support_ops",
    name: "Support Ops (Viewer)",
    badge: "System",
    icon: <Eye className="h-4 w-4" />,
    description: "Read-only troubleshooting access for support teams (no content edits).",
    perms: {
      ...none,
      "dealz.view": true,
      "adz.view": true,
      "live.view": true,
      "assets.view": true,
      "tracking.view": true,
      "admin.audit": true
    }
  };

  const supplierGuest: Role = {
    id: "supplier_guest",
    name: "Supplier Guest (Session-only)",
    badge: "System",
    icon: <Building2 className="h-4 w-4" />,
    description: "Limited guest access for suppliers on specific sessionz or dealz.",
    perms: {
      ...none,
      "dealz.view": true,
      "assets.view": true
    }
  };

  const viewer: Role = {
    id: "viewer",
    name: "Viewer",
    badge: "System",
    icon: <Eye className="h-4 w-4" />,
    description: "Read-only access to key pages (no exports, no edits).",
    perms: {
      ...none,
      "dealz.view": true,
      "adz.view": true,
      "live.view": true,
      "assets.view": true,
      "analytics.view": true
    }
  };

  return [owner, creatorManager, shoppableManager, liveProducer, moderator, analyst, finance, supportOps, supplierGuest, viewer];
}

const DEFAULT_ROLE_TEMPLATES = defaultRoles();
const DEFAULT_ROLE_TEMPLATE_INDEX = DEFAULT_ROLE_TEMPLATES.reduce<Record<string, Role>>((accumulator, role) => {
  accumulator[role.id] = role;
  return accumulator;
}, {});

function pickRoleTemplate(record: WorkspaceRoleRecord): Role | undefined {
  const directTemplateId =
    record.id === "role_creator_owner"
      ? "owner"
      : record.id === "role_producer"
        ? "live_producer"
        : record.id === "role_moderator"
          ? "moderator"
          : record.id;

  if (DEFAULT_ROLE_TEMPLATE_INDEX[directTemplateId]) {
    return DEFAULT_ROLE_TEMPLATE_INDEX[directTemplateId];
  }

  const name = String(record.name || "").trim().toLowerCase();
  if (name.includes("owner")) return DEFAULT_ROLE_TEMPLATE_INDEX.owner;
  if (name.includes("producer")) return DEFAULT_ROLE_TEMPLATE_INDEX.live_producer;
  if (name.includes("moderator")) return DEFAULT_ROLE_TEMPLATE_INDEX.moderator;
  if (name.includes("finance")) return DEFAULT_ROLE_TEMPLATE_INDEX.finance;
  if (name.includes("support")) return DEFAULT_ROLE_TEMPLATE_INDEX.support_ops;
  if (name.includes("viewer")) return DEFAULT_ROLE_TEMPLATE_INDEX.viewer;
  if (name.includes("supplier")) return DEFAULT_ROLE_TEMPLATE_INDEX.supplier_guest;
  if (name.includes("analyst")) return DEFAULT_ROLE_TEMPLATE_INDEX.analyst;
  if (name.includes("ad")) return DEFAULT_ROLE_TEMPLATE_INDEX.shoppable_manager;
  return DEFAULT_ROLE_TEMPLATE_INDEX.creator_manager;
}

function mapWorkspaceRoleRecord(record: WorkspaceRoleRecord): Role {
  const template = pickRoleTemplate(record);
  return {
    id: String(record.id),
    name: String(record.name || template?.name || "Workspace Role"),
    badge: String(record.badge || template?.badge || "Custom").toLowerCase() === "system" ? "System" : "Custom",
    icon: template?.icon || <User className="h-4 w-4" />,
    description: String(record.description || template?.description || "Workspace role"),
    perms: {
      ...(template?.perms || buildPermMap(allPermIds(), false)),
      ...(record.perms || {})
    }
  };
}

function normalizeMemberStatus(value: string | undefined): MemberStatus {
  const normalized = String(value || "active").trim().toLowerCase();
  if (normalized === "invited" || normalized === "pending") return "Invited";
  if (normalized === "inactive") return "Inactive";
  if (normalized === "suspended") return "Suspended";
  return "Active";
}

function normalizeSeat(value: string | undefined): Seat {
  const normalized = String(value || "Team").trim().toLowerCase();
  if (normalized === "owner") return "Owner";
  if (normalized === "team") return "Team";
  if (normalized === "creator") return "Creator";
  if (normalized === "manager") return "Manager";
  if (normalized === "supplier guest") return "Supplier Guest";
  if (normalized === "support ops") return "Support Ops";
  return "Team";
}

function buildMemberAvatar(name: string | undefined, email: string | undefined) {
  const label = encodeURIComponent(String(name || email || "Workspace Member"));
  return `https://ui-avatars.com/api/?name=${label}&background=f77f00&color=ffffff&rounded=true`;
}

function mapWorkspaceMemberRecord(record: WorkspaceMemberRecord): Member {
  return {
    id: String(record.id),
    name: String(record.name || record.email || "Workspace member"),
    email: String(record.email || ""),
    avatarUrl: buildMemberAvatar(String(record.name || record.email || "Workspace member"), String(record.email || "")),
    status: normalizeMemberStatus(typeof record.status === "string" ? record.status : undefined),
    seat: normalizeSeat(typeof record.seat === "string" ? record.seat : undefined),
    roleId: String(record.roleId || ""),
    lastActiveLabel: String(record.lastActiveLabel || (String(record.status || "").toLowerCase() === "invited" ? "Pending" : "Recently")),
    twoFA: String(record.twoFA || "Off").toLowerCase() === "on" ? "On" : "Off"
  };
}

function mapWorkspaceInviteRecord(record: WorkspaceMemberRecord): Invite {
  return {
    id: String(record.id),
    email: String(record.email || ""),
    roleId: String(record.roleId || ""),
    seat: normalizeSeat(typeof record.seat === "string" ? record.seat : undefined),
    createdAtLabel: String((record as { createdAtLabel?: string }).createdAtLabel || "Recently"),
    expiresAtLabel: String((record as { expiresAtLabel?: string }).expiresAtLabel || "In 7 days"),
    status: String(record.status || "invited").toLowerCase() === "revoked"
      ? "Revoked"
      : String(record.status || "invited").toLowerCase() === "accepted"
        ? "Accepted"
        : String(record.status || "invited").toLowerCase() === "expired"
          ? "Expired"
          : "Pending"
  };
}

/** ---------------- Demo Data ---------------- */

function initialMembers(): Member[] {
  return [
    {
      id: "m1",
      name: "Amina K.",
      email: "amina@creator.com",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Creator",
      roleId: "owner",
      lastActiveLabel: "2m ago",
      twoFA: "On"
    },
    {
      id: "m2",
      name: "Chris M.",
      email: "chris@studio.com",
      avatarUrl: "https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Manager",
      roleId: "creator_manager",
      lastActiveLabel: "Today",
      twoFA: "On"
    },
    {
      id: "m3",
      name: "Nina (Supplier)",
      email: "nina@supplier.com",
      avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&auto=format&fit=crop",
      status: "Invited",
      seat: "Supplier Guest",
      roleId: "supplier_guest",
      lastActiveLabel: "—",
      twoFA: "Off"
    },
    {
      id: "m4",
      name: "Support Ops",
      email: "ops@support.com",
      avatarUrl: "https://images.unsplash.com/photo-1550525811-e5869dd03032?q=80&w=256&auto=format&fit=crop",
      status: "Active",
      seat: "Support Ops",
      roleId: "support_ops",
      lastActiveLabel: "Yesterday",
      twoFA: "On"
    }
  ];
}

function initialInvites(): Invite[] {
  return [
    {
      id: "inv1",
      email: "nina@supplier.com",
      roleId: "supplier_guest",
      seat: "Supplier Guest",
      createdAtLabel: "Today",
      expiresAtLabel: "In 7 days",
      status: "Pending"
    },
    {
      id: "inv2",
      email: "data@agency.com",
      roleId: "analyst",
      seat: "Manager",
      createdAtLabel: "Yesterday",
      expiresAtLabel: "In 6 days",
      status: "Pending"
    }
  ];
}

/** ---------------- Main Page ---------------- */

type TabKey = "roles" | "members" | "invites" | "suppliers" | "security";

export default function RolesPermissionsPremium() {
  const { toasts, push } = useToasts();
  const cache = useApiCache();
  const rolesWorkspaceQuery = useRolesWorkspaceQuery({ staleTime: 10_000 });
  const auditLogsQuery = useAuditLogsQuery({ staleTime: 10_000 });
  const settingsQuery = useSettingsQuery({ staleTime: 60_000 });
  const createRoleMutation = useCreateWorkspaceRoleMutation();
  const updateRoleMutation = useUpdateWorkspaceRoleMutation();
  const deleteRoleMutation = useDeleteWorkspaceRoleMutation();
  const inviteMemberMutation = useInviteWorkspaceMemberMutation();
  const updateMemberMutation = useUpdateWorkspaceMemberMutation();
  const updateWorkspaceSecurityMutation = useUpdateWorkspaceSecurityMutation();
  const removeSettingsDeviceMutation = useRemoveSettingsDeviceMutation();
  const signOutAllSettingsDevicesMutation = useSignOutAllSettingsDevicesMutation();

  const [tab, setTab] = useState<TabKey>("roles");

  const [roles, setRoles] = useState<Role[]>(() => defaultRoles());
  const [members, setMembers] = useState<Member[]>(() => initialMembers());
  const [invites, setInvites] = useState<Invite[]>(() => initialInvites());

  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || "owner");
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
  const [inviteRoleId, setInviteRoleId] = useState(roles[0]?.id || "viewer");
  const [inviteSeat, setInviteSeat] = useState<Seat>("Manager");

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

  const canManageRoles = useMemo(
    () =>
      Boolean(
        rolesWorkspaceQuery.data?.effectivePermissions?.["roles.manage"] ||
          rolesWorkspaceQuery.data?.effectivePermissions?.["admin.manage_roles"] ||
          String(rolesWorkspaceQuery.data?.currentMember?.seat || "").toLowerCase() === "owner"
      ),
    [rolesWorkspaceQuery.data?.currentMember?.seat, rolesWorkspaceQuery.data?.effectivePermissions]
  );

  const workspaceSecurity = rolesWorkspaceQuery.data?.workspaceSecurity;
  const inviteDomainAllowlist = useMemo(() => {
    const fallback = ["creator.com", "studio.com", "mylivedealz.com", "studio.test"];
    const fromApi = workspaceSecurity?.inviteDomainAllowlist;
    const list = Array.isArray(fromApi) && fromApi.length ? fromApi : fallback;
    return list.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
  }, [workspaceSecurity?.inviteDomainAllowlist]);
  const require2FA = workspaceSecurity?.require2FA ?? true;
  const allowExternalInvites = workspaceSecurity?.allowExternalInvites ?? false;
  const supplierGuestExpiryHours = useMemo(() => {
    const raw = workspaceSecurity?.supplierGuestExpiryHours;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 24;
    return Math.max(1, Math.min(168, Math.round(value)));
  }, [workspaceSecurity?.supplierGuestExpiryHours]);

  const rolesMutationBusy =
    createRoleMutation.isPending ||
    updateRoleMutation.isPending ||
    deleteRoleMutation.isPending ||
    inviteMemberMutation.isPending ||
    updateMemberMutation.isPending ||
    updateWorkspaceSecurityMutation.isPending;

  const deviceMutationBusy = removeSettingsDeviceMutation.isPending || signOutAllSettingsDevicesMutation.isPending;

  const settingsDevices = useMemo(() => {
    const record = settingsQuery.data as unknown as Record<string, unknown> | undefined;
    const nestedSettings = record && typeof record === "object" && !Array.isArray(record) ? (record.settings as Record<string, unknown> | undefined) : undefined;
    const nestedDevices = nestedSettings && Array.isArray(nestedSettings.devices) ? (nestedSettings.devices as Array<Record<string, unknown>>) : [];
    const rootSecurity = record && typeof record === "object" && !Array.isArray(record) ? (record.security as Record<string, unknown> | undefined) : undefined;
    const rootDevices = rootSecurity && Array.isArray(rootSecurity.devices) ? (rootSecurity.devices as Array<Record<string, unknown>>) : [];
    const devices = nestedDevices.length ? nestedDevices : rootDevices;
    return devices;
  }, [settingsQuery.data]);

  const syncWorkspaceState = useCallback((workspace: RolesWorkspaceRecord | undefined) => {
    if (!workspace) return;
    const nextRoles = workspace.roles.length ? workspace.roles.map(mapWorkspaceRoleRecord) : defaultRoles();
    const nextMembers = workspace.members.length ? workspace.members.map(mapWorkspaceMemberRecord) : initialMembers();
    const nextInvites = workspace.invites.length ? workspace.invites.map(mapWorkspaceInviteRecord) : initialInvites();
    setRoles(nextRoles);
    setMembers(nextMembers);
    setInvites(nextInvites);
    setSelectedRoleId((current) => (nextRoles.some((role) => role.id === current) ? current : workspace.currentMember?.roleId || nextRoles[0]?.id || current));
    setInviteRoleId((current) => (nextRoles.some((role) => role.id === current) ? current : nextRoles[0]?.id || current));
  }, []);

  useEffect(() => {
    syncWorkspaceState(rolesWorkspaceQuery.data);
  }, [rolesWorkspaceQuery.data, syncWorkspaceState]);

  const setWorkspaceCache = useCallback(
    (workspace: RolesWorkspaceRecord) => {
      cache.setData(queryKeys.settings.roles(), workspace);
    },
    [cache]
  );

  const applyWorkspaceOptimistic = useCallback(
    (updater: (current: RolesWorkspaceRecord) => RolesWorkspaceRecord) => {
      const current = rolesWorkspaceQuery.data;
      if (!current) return undefined;
      const next = updater(current);
      setWorkspaceCache(next);
      return current;
    },
    [rolesWorkspaceQuery.data, setWorkspaceCache]
  );

  async function refreshWorkspaceFromServer() {
    try {
      await rolesWorkspaceQuery.refetch();
    } catch {
      // no-op: local optimistic state is already visible; error toast is handled per action.
    }
  }

  function restoreWorkspace(snapshot: RolesWorkspaceRecord | undefined) {
    if (snapshot) {
      setWorkspaceCache(snapshot);
      return;
    }
    void refreshWorkspaceFromServer();
  }

  async function refreshAuditLogsFromServer() {
    try {
      await auditLogsQuery.refetch();
    } catch {
      // no-op
    }
  }

  const buildWorkspaceWithUpdatedRole = useCallback(
    (current: RolesWorkspaceRecord, roleId: string, updater: (role: WorkspaceRoleRecord) => WorkspaceRoleRecord) => {
      const nextRoles = current.roles.map((role) => (role.id === roleId ? updater(role) : role));
      const currentMember = current.currentMember || null;
      const currentRole = currentMember ? nextRoles.find((role) => role.id === currentMember.roleId) || null : null;
      return {
        ...current,
        roles: nextRoles,
        effectivePermissions: currentRole?.perms || current.effectivePermissions || {}
      };
    },
    []
  );

  const buildWorkspaceWithUpdatedMember = useCallback(
    (current: RolesWorkspaceRecord, memberId: string, updater: (member: WorkspaceMemberRecord) => WorkspaceMemberRecord) => {
      const nextMembers = current.members.map((member) => (member.id === memberId ? updater(member) : member));
      const nextCurrentMember = current.currentMember?.id === memberId ? nextMembers.find((member) => member.id === memberId) || current.currentMember : current.currentMember;
      const nextCurrentRole = nextCurrentMember ? current.roles.find((role) => role.id === nextCurrentMember.roleId) || null : null;
      return {
        ...current,
        members: nextMembers,
        invites: nextMembers.filter((member) => String(member.status || "").toLowerCase() === "invited"),
        currentMember: nextCurrentMember,
        effectivePermissions: nextCurrentRole?.perms || current.effectivePermissions || {}
      };
    },
    []
  );

  async function patchWorkspaceSecurity(patch: UpdateWorkspaceSecurityInput, toast?: string) {
    if (!canManageRoles) {
      push("You do not have permission to change security settings.", "error");
      return;
    }

    const snapshot = applyWorkspaceOptimistic((current) => {
      const fallbackAllowlist = ["creator.com", "studio.com", "mylivedealz.com", "studio.test"];
      const currentSecurity = current.workspaceSecurity || {
        require2FA: true,
        allowExternalInvites: false,
        supplierGuestExpiryHours: 24,
        inviteDomainAllowlist: fallbackAllowlist
      };

      return {
        ...current,
        workspaceSecurity: {
          ...currentSecurity,
          ...patch
        }
      };
    });

    try {
      await updateWorkspaceSecurityMutation.mutateAsync(patch);
      if (toast) push(toast, "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not save security settings right now.", "error");
    }
  }

  function openEditRole() {
    if (!selectedRole) return;
    setRoleNameDraft(selectedRole.name);
    setRoleDescDraft(selectedRole.description);
    setEditRoleOpen(true);
  }

  async function saveRoleMeta() {
    if (!selectedRole) return;
    if (!canManageRoles) {
      push("You do not have permission to update roles.", "error");
      return;
    }

    const nextName = roleNameDraft.trim() || selectedRole.name;
    const nextDescription = roleDescDraft.trim() || selectedRole.description;
    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedRole(current, selectedRole.id, (role) => ({
        ...role,
        name: nextName,
        description: nextDescription
      }))
    );

    try {
      await updateRoleMutation.mutateAsync({
        roleId: selectedRole.id,
        payload: {
          name: nextName,
          description: nextDescription
        }
      });
      setEditRoleOpen(false);
      push("Role updated.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not update this role right now.", "error");
    }
  }

  async function setPerm(roleId: string, permId: string, value: boolean) {
    if (!canManageRoles) {
      push("You do not have permission to change permissions.", "error");
      return;
    }

    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedRole(current, roleId, (role) => ({
        ...role,
        perms: {
          ...(role.perms || {}),
          [permId]: value
        }
      }))
    );

    try {
      await updateRoleMutation.mutateAsync({
        roleId,
        payload: {
          perms: {
            [permId]: value
          }
        }
      });
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not save that permission change.", "error");
    }
  }

  async function setGroupAll(roleId: string, groupId: string, value: boolean) {
    const g = PERM_GROUPS.find((x) => x.id === groupId);
    if (!g) return;
    if (!canManageRoles) {
      push("You do not have permission to change permissions.", "error");
      return;
    }

    const nextPermPatch = g.perms.reduce<Record<string, boolean>>((accumulator, perm) => {
      accumulator[perm.id] = value;
      return accumulator;
    }, {});

    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedRole(current, roleId, (role) => ({
        ...role,
        perms: {
          ...(role.perms || {}),
          ...nextPermPatch
        }
      }))
    );

    try {
      await updateRoleMutation.mutateAsync({
        roleId,
        payload: {
          perms: nextPermPatch
        }
      });
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not save that permission group update.", "error");
    }
  }

  async function duplicateRole() {
    if (!selectedRole) return;
    if (!canManageRoles) {
      push("You do not have permission to duplicate roles.", "error");
      return;
    }

    try {
      const createdRole = await createRoleMutation.mutateAsync({
        name: `${selectedRole.name} (Copy)`,
        badge: "Custom",
        description: selectedRole.description,
        perms: selectedRole.perms
      });
      setSelectedRoleId(createdRole.id);
      push("Role duplicated.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      push("Could not duplicate that role right now.", "error");
    }
  }

  async function createRole() {
    if (!canManageRoles) {
      push("You do not have permission to create roles.", "error");
      return;
    }

    try {
      const createdRole = await createRoleMutation.mutateAsync({
        name: "New role",
        badge: "Custom",
        description: "Custom role. Configure permissions as needed.",
        perms: buildPermMap(allPermIds(), false)
      });
      setSelectedRoleId(createdRole.id);
      setCreateRoleOpen(false);
      push("New role created.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      push("Could not create a new role right now.", "error");
    }
  }

  async function deleteRole() {
    if (!selectedRole) return;
    if (selectedRole.badge === "System" || SYSTEM_ROLE_IDS.includes(selectedRole.id)) {
      push("System roles cannot be deleted.", "error");
      return;
    }
    if (!canManageRoles) {
      push("You do not have permission to delete roles.", "error");
      return;
    }

    const snapshot = applyWorkspaceOptimistic((current) => {
      const nextRoles = current.roles.filter((role) => role.id !== selectedRole.id);
      const nextSelectedRole = nextRoles[0] || null;
      const nextCurrentMember = current.currentMember || null;
      const nextCurrentRole = nextCurrentMember ? nextRoles.find((role) => role.id === nextCurrentMember.roleId) || null : null;
      return {
        ...current,
        roles: nextRoles,
        effectivePermissions: nextCurrentRole?.perms || current.effectivePermissions || {}
      };
    });

    try {
      await deleteRoleMutation.mutateAsync({ roleId: selectedRole.id });
      setSelectedRoleId(roles.filter((role) => role.id !== selectedRole.id)[0]?.id || "owner");
      push("Role deleted.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not delete that role right now.", "error");
    }
  }

  async function inviteMember() {
    const email = inviteEmail.trim();
    if (!email.includes("@")) {
      push("Enter a valid email.", "error");
      return;
    }
    if (!canManageRoles) {
      push("You do not have permission to invite members.", "error");
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const domain = normalizedEmail.split("@")[1] || "";
    const isExternal = domain ? !inviteDomainAllowlist.includes(domain) : true;
    if (isExternal && !allowExternalInvites) {
      push("External invites are blocked by policy. Enable in Security settings.", "error");
      return;
    }

    const inviteName = email.split("@")[0]?.replace(/[._-]+/g, " ") || "New member";

    try {
      await inviteMemberMutation.mutateAsync({
        name: inviteName,
        email: normalizedEmail,
        roleId: inviteRoleId,
        seat: inviteSeat
      });
      setInviteOpen(false);
      setInviteEmail("");
      push("Invite sent.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      push("Could not send that invite right now.", "error");
    }
  }

  function copyInviteLink(inv: Invite) {
    const link = `https://mldz.app/invite/${inv.id}`;
    navigator.clipboard?.writeText(link).catch(() => { });
    push("Invite link copied.", "success");
  }

  async function revokeInvite(inv: Invite) {
    if (!canManageRoles) {
      push("You do not have permission to revoke invites.", "error");
      return;
    }

    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedMember(current, inv.id, (member) => ({
        ...member,
        status: "revoked"
      }))
    );

    try {
      await updateMemberMutation.mutateAsync({
        memberId: inv.id,
        payload: { status: "revoked" }
      });
      push("Invite revoked.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not revoke that invite.", "error");
    }
  }

  async function changeMemberRole(memberId: string, roleId: string) {
    if (!canManageRoles) {
      push("You do not have permission to update members.", "error");
      return;
    }

    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedMember(current, memberId, (member) => ({
        ...member,
        roleId
      }))
    );

    try {
      await updateMemberMutation.mutateAsync({
        memberId,
        payload: { roleId }
      });
      push("Role updated.", "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not update that member role.", "error");
    }
  }

  async function changeMemberStatus(memberId: string, status: MemberStatus) {
    if (!canManageRoles) {
      push("You do not have permission to update members.", "error");
      return;
    }

    const normalizedStatus = status.toLowerCase();
    const snapshot = applyWorkspaceOptimistic((current) =>
      buildWorkspaceWithUpdatedMember(current, memberId, (member) => ({
        ...member,
        status: normalizedStatus
      }))
    );

    try {
      await updateMemberMutation.mutateAsync({
        memberId,
        payload: { status: normalizedStatus }
      });
      push(`Member status: ${status}`, "success");
      void refreshWorkspaceFromServer();
      void refreshAuditLogsFromServer();
    } catch {
      restoreWorkspace(snapshot);
      push("Could not update that member status.", "error");
    }
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

  const rolesFiltered = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => `${role.name} ${role.description} ${role.badge}`.toLowerCase().includes(q));
  }, [roleSearch, roles]);

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
            <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)} disabled={!canManageRoles || rolesMutationBusy}>
              Invite
            </SmallBtn>
            <SmallBtn icon={<Plus className="h-4 w-4" />} onClick={() => setCreateRoleOpen(true)} disabled={!canManageRoles || rolesMutationBusy}>
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
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            Updated for Shoppable Adz + Live Sessionz Pro + Asset Library + Dealz Marketplace. Roles now sync to backend workspace records.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={rolesWorkspaceQuery.isFetching ? "warn" : "good"} text={rolesWorkspaceQuery.isFetching ? "Syncing" : "Synced"} />
            <Pill tone={canManageRoles ? "brand" : "neutral"} text={canManageRoles ? "Can manage roles" : "View only"} />
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
                <SmallBtn tone="ghost" icon={<Copy className="h-4 w-4" />} onClick={duplicateRole} title="Duplicate selected role" disabled={!canManageRoles || rolesMutationBusy}>
                  Duplicate
                </SmallBtn>
              </div>

              <div className="p-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 transition-colors">
                  <Search className="h-4 w-4 text-slate-500" />
                  <input
                    className="bg-transparent outline-none text-sm w-full dark:text-slate-200"
                    placeholder="Search roles…"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-3 pb-3 space-y-2 max-h-[560px] overflow-auto scrollbar-hide">
                {rolesFiltered.map((r) => {
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
                    <SmallBtn icon={<Pencil className="h-4 w-4" />} onClick={openEditRole} disabled={!canManageRoles || rolesMutationBusy}>
                      Edit
                    </SmallBtn>
                    <SmallBtn tone="danger" icon={<Trash2 className="h-4 w-4" />} onClick={deleteRole} disabled={!canManageRoles || rolesMutationBusy || selectedRole?.badge === "System" || SYSTEM_ROLE_IDS.includes(selectedRole?.id || "")} title={selectedRole?.badge === "System" || SYSTEM_ROLE_IDS.includes(selectedRole?.id || "") ? "System roles cannot be deleted" : "Delete role"}>
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
                                void setGroupAll(selectedRole.id, g.id, true);
                                push(`Enabled ${g.title}.`, "success");
                              }}
                              disabled={!canManageRoles || rolesMutationBusy}
                            >
                              Enable all
                            </SmallBtn>
                            <SmallBtn
                              icon={<Ban className="h-4 w-4" />}
                              onClick={() => {
                                if (!selectedRole) return;
                                void setGroupAll(selectedRole.id, g.id, false);
                                push(`Disabled ${g.title}.`, "success");
                              }}
                              disabled={!canManageRoles || rolesMutationBusy}
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
                                    disabled={!canManageRoles || rolesMutationBusy}
                                    onChange={(v) => {
                                      if (!selectedRole) return;
                                      void setPerm(selectedRole.id, p.id, v);
                                      push(`${v ? "Enabled" : "Disabled"}: ${p.label}`, "success");
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
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)} disabled={!canManageRoles || rolesMutationBusy}>
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
                          onChange={(e) => {
                            void changeMemberRole(m.id, e.target.value);
                          }}
                          disabled={!canManageRoles || rolesMutationBusy || (m.status !== "Active" && m.status !== "Invited")}
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
                              onClick={() => {
                                void changeMemberStatus(m.id, "Suspended");
                              }}
                              title="Suspend access"
                              disabled={!canManageRoles || rolesMutationBusy}
                            >
                              Suspend
                            </SmallBtn>
                          ) : m.status === "Suspended" ? (
                            <SmallBtn
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => {
                                void changeMemberStatus(m.id, "Active");
                              }}
                              title="Re-activate access"
                              disabled={!canManageRoles || rolesMutationBusy}
                            >
                              Reactivate
                            </SmallBtn>
                          ) : (
                            <SmallBtn
                              tone="ghost"
                              icon={<CheckCircle2 className="h-4 w-4" />}
                              onClick={() => {
                                void changeMemberStatus(m.id, "Active");
                              }}
                              title="Mark active"
                              disabled={!canManageRoles || rolesMutationBusy}
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
              <SmallBtn tone="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)} disabled={!canManageRoles || rolesMutationBusy}>
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
                          <SmallBtn tone="danger" icon={<Ban className="h-4 w-4" />} onClick={() => { void revokeInvite(inv); }} disabled={!canManageRoles || rolesMutationBusy || inv.status !== "Pending"}>
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
                      onClick={() => {
                        const next = Math.max(1, supplierGuestExpiryHours - 1);
                        void patchWorkspaceSecurity({ supplierGuestExpiryHours: next });
                      }}
                      disabled={!canManageRoles || rolesMutationBusy || supplierGuestExpiryHours <= 1}
                    >
                      -1h
                    </SmallBtn>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 transition-colors">{supplierGuestExpiryHours}h</div>
                    <SmallBtn
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        const next = Math.min(168, supplierGuestExpiryHours + 1);
                        void patchWorkspaceSecurity({ supplierGuestExpiryHours: next });
                      }}
                      disabled={!canManageRoles || rolesMutationBusy}
                    >
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
                      disabled={!canManageRoles || rolesMutationBusy}
                      onChange={(v) => {
                        void patchWorkspaceSecurity({ require2FA: v }, `2FA requirement ${v ? "enabled" : "disabled"}.`);
                      }}
                      label="Require 2FA for all members"
                      hint="Strongly recommended for sensitive workflows: payouts, tracking, destination keys, incident reports."
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 transition-colors">
                    <Toggle
                      checked={allowExternalInvites}
                      disabled={!canManageRoles || rolesMutationBusy}
                      onChange={(v) => {
                        void patchWorkspaceSecurity({ allowExternalInvites: v }, `External invites ${v ? "enabled" : "disabled"}.`);
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
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Devices & sessions</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Backend-driven from your account security settings. Sign out devices to revoke sessions.</div>
                  </div>
                  <SmallBtn
                    tone="danger"
                    icon={<Ban className="h-4 w-4" />}
                    onClick={() => {
                      void signOutAllSettingsDevicesMutation
                        .mutateAsync()
                        .then(() => push("Signed out all devices.", "success"))
                        .catch(() => push("Could not sign out all devices.", "error"));
                    }}
                    disabled={deviceMutationBusy || settingsDevices.length === 0}
                  >
                    Sign out all
                  </SmallBtn>
                </div>

                <div className="mt-3 space-y-2">
                  {settingsQuery.isLoading ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300">Loading devices…</div>
                  ) : settingsDevices.length === 0 ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300">No devices found.</div>
                  ) : (
                    settingsDevices.map((device) => {
                      const id = String(device.id || "");
                      const name = String(device.name || device.label || "Device");
                      const location = String(device.location || "");
                      const lastActive = String(device.lastActive || device.lastActiveLabel || "");
                      const isCurrent = Boolean(device.current);

                      return (
                        <div
                          key={id || name}
                          className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex items-start justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{name}</div>
                              {isCurrent ? <Pill tone="good" text="Current" /> : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 truncate">
                              {location ? `${location} · ` : ""}
                              {lastActive ? `Last active: ${lastActive}` : ""}
                            </div>
                          </div>

                          <SmallBtn
                            tone={isCurrent ? "ghost" : "danger"}
                            icon={<Ban className="h-4 w-4" />}
                            disabled={deviceMutationBusy || !id || isCurrent}
                            title={isCurrent ? "You can't sign out the current session from here." : "Sign out device"}
                            onClick={() => {
                              if (!id) return;
                              void removeSettingsDeviceMutation
                                .mutateAsync(id)
                                .then(() => push("Device signed out.", "success"))
                                .catch(() => push("Could not sign out that device.", "error"));
                            }}
                          >
                            Sign out
                          </SmallBtn>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-colors">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-50">Audit log</div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">High-signal events: role changes, invites, share link generation, safety incidents.</div>
                </div>
                <SmallBtn
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => {
                    const payload = JSON.stringify(auditLogsQuery.data || [], null, 2);
                    navigator.clipboard?.writeText(payload)
                      .then(() => push("Audit exported to clipboard.", "success"))
                      .catch(() => push("Could not export audit right now.", "error"));
                  }}
                  disabled={!auditLogsQuery.data || auditLogsQuery.data.length === 0}
                >
                  Export
                </SmallBtn>
              </div>

              <div className="p-4 space-y-3 max-h-[520px] overflow-auto scrollbar-hide">
                {auditLogsQuery.isLoading ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300">Loading audit logs…</div>
                ) : (auditLogsQuery.data || []).length === 0 ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300">No audit events yet.</div>
                ) : (
                  (auditLogsQuery.data || []).map((a) => {
                    const severity = String(a.severity || "info").toLowerCase();
                    const isCritical = severity === "critical" || severity === "error";
                    const isWarn = severity === "warn" || severity === "warning";
                    const label = isCritical ? "Critical" : isWarn ? "Warn" : "Info";
                    const at = (() => {
                      const d = new Date(String(a.at));
                      return Number.isNaN(d.getTime()) ? String(a.at) : d.toLocaleString();
                    })();

                    return (
                      <div
                        key={a.id}
                        className={cx(
                          "rounded-3xl border p-3 shadow-sm transition-colors",
                          isCritical
                            ? "border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10"
                            : isWarn
                              ? "border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-50">{String(a.action || "")}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {String(a.actor || "")} · {at}
                            </div>
                            {a.detail ? <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{String(a.detail)}</div> : null}
                          </div>
                          <Pill tone={isCritical ? "bad" : isWarn ? "warn" : "neutral"} text={label} />
                        </div>
                      </div>
                    );
                  })
                )}
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
          <SmallBtn icon={<Ban className="h-4 w-4" />} onClick={() => setEditRoleOpen(false)} disabled={rolesMutationBusy}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" icon={<Save className="h-4 w-4" />} onClick={() => { void saveRoleMeta(); }} disabled={!canManageRoles || rolesMutationBusy}>
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
          <SmallBtn onClick={() => setCreateRoleOpen(false)} icon={<Ban className="h-4 w-4" />} disabled={rolesMutationBusy}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" onClick={() => { void createRole(); }} icon={<Plus className="h-4 w-4" />} disabled={!canManageRoles || rolesMutationBusy}>
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
              disabled={!canManageRoles || rolesMutationBusy}
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
              disabled={!canManageRoles || rolesMutationBusy}
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
            disabled={!canManageRoles || rolesMutationBusy}
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
          <SmallBtn onClick={() => setInviteOpen(false)} icon={<Ban className="h-4 w-4" />} disabled={rolesMutationBusy}>
            Cancel
          </SmallBtn>
          <SmallBtn tone="primary" onClick={() => { void inviteMember(); }} icon={<UserPlus className="h-4 w-4" />} disabled={!canManageRoles || rolesMutationBusy}>
            Send invite
          </SmallBtn>
        </div>
      </Modal>
    </div>
  );
}