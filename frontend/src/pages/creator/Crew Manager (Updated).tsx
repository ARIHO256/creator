import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Copy,
  Crown,
  KeyRound,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
  UserPlus,
  Users,
  Video,
  X
} from "lucide-react";

/**
 * Crew Management (Premium) — aligned with Roles & Permissions.
 *
 * Built from your latest Crew Management TSX and upgraded to match the premium contract:
 *  - Host + Co-host as first-class (base) roles
 *  - View Team Availability (calendar + privacy)
 *  - Conflict detection:
 *      - Producer booked on another overlapping session
 *      - Producer calendar busy (availability conflict)
 *  - Soft locks:
 *      - "Producer locked by Ops", "Moderator assigned by policy", "Permissions locked by policy"
 *  - Session-level permissions:
 *      - Per-session capability overrides (e.g., Moderator can mute chat but cannot kick host)
 *  - Audit hooks:
 *      - "User X added as Co-host for Session Y", availability requests, overrides, etc.
 *
 * Notes:
 *  - This is a front-end mock showing UX + data modeling. Wire to your backend later.
 *  - Orange is the primary color to match Roles & Permissions.
 */

const ORANGE = "#f77f00";

type SessionStatus = "Scheduled" | "Live" | "Replay";
type CrewRole = "Host" | "Producer" | "Moderator" | "Co-host";

type WorkspaceRoleId =
  | "owner"
  | "manager"
  | "host"
  | "producer"
  | "moderator"
  | "cohost"
  | "editor"
  | "analyst"
  | "finance"
  | "viewer"
  | "external"
  | string;

type MemberStatus = "Active" | "Inactive" | "Suspended" | "Invited" | "External";

type Member = {
  id: string;
  name: string;
  email: string;
  handle?: string;
  roleId: WorkspaceRoleId; // comes from Roles & Permissions
  status: MemberStatus; // comes from Roles & Permissions
  tzLabel: string;
  tzOffsetHours: number; // e.g. +3 for EAT
};

type Session = {
  id: string;
  title: string;
  supplierName: string;
  campaign: string;
  status: SessionStatus;
  startISO: string; // ISO string in UTC
  durationMin: number;
  cohostSlots: number;
};

type Assignments = {
  hostId: string | null;
  producerId: string | null;
  moderatorIds: string[];
  cohostIds: string[];
};

type SoftLock = {
  by: "Ops" | "Policy";
  label: string; // e.g. "Producer locked by Ops"
  reason: string;
  createdAt: string;
};

type SoftLocksBySession = {
  host?: SoftLock;
  producer?: SoftLock;
  moderators?: Record<string, SoftLock>;
  cohosts?: Record<string, SoftLock>;
  // Optional: lock permission edits per person in this session
  permLocks?: Record<string, SoftLock>;
};

type AuditEntry = {
  id: string;
  when: string;
  who: string;
  what: string;
  meta: string;
};

type SessionAction =
  | "chat.mute"
  | "chat.timeout"
  | "chat.delete"
  | "host.kick"
  | "studio.switch_scenes"
  | "dealz.pin";

type PermissionSet = Record<SessionAction, boolean>;

type SessionPerms = {
  hosts: Record<string, PermissionSet>; // 0..1
  producers: Record<string, PermissionSet>; // 0..1
  moderators: Record<string, PermissionSet>;
  cohosts: Record<string, PermissionSet>;
};

type AvailabilityPrivacy = "busy_free" | "details";

type AvailabilityEvent = {
  id: string;
  startISO: string; // UTC
  endISO: string; // UTC
  title: string;
  // In a real system you'd also store source calendar id, transparency, etc.
};

type AvailabilityCalendar = {
  connected: boolean;
  privacy: AvailabilityPrivacy; // details are only visible if viewer has permission + member allows
  updatedAt: string;
  events: AvailabilityEvent[];
};

type AvailabilityByMember = Record<string, AvailabilityCalendar>;

type PermissionId =
  | "crew.manage_assignments"
  | "crew.override_conflicts"
  | "crew.manage_session_permissions"
  | "availability.view_team"
  | "availability.view_details"
  | "availability.request_update"
  | "suppliers.invite_guest_cohost";

/* ------------------------- Utils ------------------------- */

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function nowLabel() {
  return new Date().toLocaleString();
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getMember(members: Member[], id: string | null | undefined) {
  if (!id) return null;
  return members.find((m) => m.id === id) || null;
}

function formatInOffset(isoUtc: string, offsetHours: number) {
  const d = new Date(isoUtc);
  const ms = d.getTime() + offsetHours * 60 * 60 * 1000;
  const dd = new Date(ms);
  const y = dd.getUTCFullYear();
  const m = `${dd.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${dd.getUTCDate()}`.padStart(2, "0");
  const hh = `${dd.getUTCHours()}`.padStart(2, "0");
  const mm = `${dd.getUTCMinutes()}`.padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function getRange(session: Session) {
  const start = new Date(session.startISO).getTime();
  const end = start + session.durationMin * 60 * 1000;
  return { start, end };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function statusPillCls(status: SessionStatus) {
  if (status === "Live") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (status === "Replay") return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
}

function memberStatusPillCls(status: MemberStatus) {
  if (status === "Active") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (status === "Invited") return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (status === "Suspended") return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  if (status === "External") return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  return "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"; // Inactive
}

/**
 * Demo capability mapping. In production, this should come from Roles & Permissions (role perms).
 * Key idea:
 *  - Host/Co-host are now "base roles", i.e., first-class capabilities.
 *  - External/supplier guests can only be Co-host (and are limited by session-level perms).
 */
const ROLE_CAPS: Record<string, { host?: boolean; producer?: boolean; moderator?: boolean; cohost?: boolean }> = {
  owner: { host: true, producer: true, moderator: true, cohost: true },
  manager: { host: true, cohost: true },
  host: { host: true, cohost: true },
  producer: { producer: true, cohost: true },
  moderator: { moderator: true },
  cohost: { cohost: true },
  editor: { cohost: true },
  analyst: { cohost: false },
  finance: { cohost: false },
  viewer: { cohost: false },
  external: { cohost: true }
};

function hasCapability(member: Member, crewRole: CrewRole) {
  const caps = ROLE_CAPS[member.roleId] || {};
  if (crewRole === "Host") return !!caps.host;
  if (crewRole === "Producer") return !!caps.producer;
  if (crewRole === "Moderator") return !!caps.moderator;
  return !!caps.cohost;
}

function canAssignToCrewRole(member: Member, crewRole: CrewRole) {
  // Integrates with Roles & Permissions:
  // - Only Active members can be assigned to Host/Producer/Moderator.
  // - Co-host can be Active OR External OR Invited (to allow pre-staffing pending guests).
  if (!hasCapability(member, crewRole)) return false;

  if (crewRole === "Co-host") {
    return member.status === "Active" || member.status === "External" || member.status === "Invited";
  }
  return member.status === "Active";
}

/* ------------------------- Availability helpers ------------------------- */

function getEventRange(ev: AvailabilityEvent) {
  return { start: new Date(ev.startISO).getTime(), end: new Date(ev.endISO).getTime() };
}

function availabilityConflictsForSession(
  session: Session,
  calendar: AvailabilityCalendar | null | undefined
): AvailabilityEvent[] {
  if (!calendar?.connected) return [];
  const rS = getRange(session);
  return (calendar.events || []).filter((ev) => {
    const rE = getEventRange(ev);
    return overlaps(rS.start, rS.end, rE.start, rE.end);
  });
}

type AvailabilityState = "Available" | "Busy" | "Unknown";

function availabilityForMemberInSession(session: Session, calendar: AvailabilityCalendar | null | undefined): {
  state: AvailabilityState;
  conflicts: AvailabilityEvent[];
} {
  if (!calendar || !calendar.connected) return { state: "Unknown", conflicts: [] };
  const conflicts = availabilityConflictsForSession(session, calendar);
  if (conflicts.length) return { state: "Busy", conflicts };
  return { state: "Available", conflicts: [] };
}

function availabilityPillCls(state: AvailabilityState) {
  if (state === "Available") return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (state === "Busy") return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

/* ------------------------- Session-level permission model ------------------------- */

const ACTION_META: Array<{ key: SessionAction; label: string; hint: string; sensitive?: boolean }> = [
  { key: "studio.switch_scenes", label: "Switch scenes", hint: "Change cameras, scenes, overlays." },
  { key: "dealz.pin", label: "Pin dealz", hint: "Pin products/dealz during the live." },
  { key: "chat.mute", label: "Mute chat", hint: "Turn chat on/off for the audience." },
  { key: "chat.timeout", label: "Timeout users", hint: "Temporarily timeout chat users." },
  { key: "chat.delete", label: "Delete messages", hint: "Remove inappropriate messages." },
  { key: "host.kick", label: "Kick host", hint: "Remove host from session (high risk).", sensitive: true }
];

const ACTIONS_BY_CREW_ROLE: Record<CrewRole, SessionAction[]> = {
  Host: ["studio.switch_scenes", "dealz.pin", "chat.mute"],
  Producer: ["studio.switch_scenes", "dealz.pin", "chat.mute", "host.kick"],
  Moderator: ["chat.mute", "chat.timeout", "chat.delete", "host.kick"],
  "Co-host": ["dealz.pin"]
};

function allowedActionsForCrewRole(crewRole: CrewRole) {
  // Session-level permissions: restrict by role.
  // Example requirement: Moderator can only mute chat, not kick host.
  if (crewRole === "Moderator") return new Set<SessionAction>(["chat.mute", "chat.timeout", "chat.delete"]);
  if (crewRole === "Producer") return new Set<SessionAction>(["studio.switch_scenes", "dealz.pin", "chat.mute", "host.kick"]);
  if (crewRole === "Host") return new Set<SessionAction>(["studio.switch_scenes", "dealz.pin", "chat.mute"]);
  return new Set<SessionAction>(["dealz.pin"]);
}

function defaultPermsForCrewRole(crewRole: CrewRole): PermissionSet {
  // Defaults emphasize safety (more actions off by default).
  const base: PermissionSet = {
    "chat.mute": false,
    "chat.timeout": false,
    "chat.delete": false,
    "host.kick": false,
    "studio.switch_scenes": false,
    "dealz.pin": false
  };

  if (crewRole === "Host") {
    return {
      ...base,
      "studio.switch_scenes": true,
      "dealz.pin": true,
      "chat.mute": true,
      "host.kick": false
    };
  }

  if (crewRole === "Producer") {
    return {
      ...base,
      "studio.switch_scenes": true,
      "dealz.pin": true,
      "chat.mute": true,
      "host.kick": false
    };
  }

  if (crewRole === "Moderator") {
    return {
      ...base,
      // Example: moderator can only mute chat (defaults), but cannot kick host.
      "chat.mute": true,
      "chat.timeout": false,
      "chat.delete": false,
      "host.kick": false
    };
  }

  return {
    ...base,
    "dealz.pin": false
  };
}

function buildInitialSessionPerms(assignmentsBySession: Record<string, Assignments>): Record<string, SessionPerms> {
  const out: Record<string, SessionPerms> = {};
  Object.entries(assignmentsBySession).forEach(([sid, asg]) => {
    const hosts: Record<string, PermissionSet> = {};
    if (asg.hostId) hosts[asg.hostId] = defaultPermsForCrewRole("Host");

    const producers: Record<string, PermissionSet> = {};
    if (asg.producerId) producers[asg.producerId] = defaultPermsForCrewRole("Producer");

    const moderators: Record<string, PermissionSet> = {};
    asg.moderatorIds.forEach((mid) => {
      moderators[mid] = defaultPermsForCrewRole("Moderator");
    });

    const cohosts: Record<string, PermissionSet> = {};
    asg.cohostIds.forEach((cid) => {
      cohosts[cid] = defaultPermsForCrewRole("Co-host");
    });

    out[sid] = { hosts, producers, moderators, cohosts };
  });
  return out;
}

/* ------------------------- Toast ------------------------- */

/* ------------------------- Toast ------------------------- */

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (message: string, tone: "info" | "success" | "error" = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return { toasts, push };
}

interface Toast {
  id: string;
  message: string | React.ReactNode;
  tone: string;
}

function ToastArea({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed top-16 right-4 z-[90] flex flex-col gap-2 w-[350px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "px-4 py-3 rounded-2xl shadow-lg border text-xs font-medium bg-white dark:bg-slate-900",
            t.tone === "error"
              ? "border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400"
              : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

async function copyToClipboard(text: string, push: (msg: string, tone: "success" | "info" | "error") => void) {
  try {
    await navigator.clipboard.writeText(text);
    push("Copied!", "success");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    push("Copied!", "success");
  }
}

/* ------------------------- Modal ------------------------- */

function ModalShell({
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold dark:text-slate-100">{title}</div>
          <button
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center dark:text-slate-300"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------- UI atoms ------------------------- */

function StatusPill({ status }: { status: SessionStatus }) {
  return <span className={cx("px-2.5 py-1 rounded-full text-xs border", statusPillCls(status))}>{status}</span>;
}

function MemberStatusPill({ status, title }: { status: MemberStatus; title?: string }) {
  return (
    <span className={cx("px-2.5 py-1 rounded-full text-xs border", memberStatusPillCls(status))} title={title}>
      {status}
    </span>
  );
}

function AvailabilityPill({
  state,
  onClick,
  title
}: {
  state: AvailabilityState;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={cx("px-2.5 py-1 rounded-full text-xs border inline-flex items-center gap-1", availabilityPillCls(state))}
      onClick={onClick}
      title={title}
    >
      <CalendarClock className="h-3.5 w-3.5" />
      {state}
    </button>
  );
}

function LockPill({ lock }: { lock: SoftLock }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-slate-900 text-white border-slate-900"
      title={lock.reason}
    >
      <Lock className="h-3.5 w-3.5" />
      {lock.label}
    </span>
  );
}

function RoleChip({ roleId }: { roleId: WorkspaceRoleId }) {
  const clean = (roleId || "").toString();
  return (
    <span className="px-2.5 py-1 rounded-full text-xs border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">{clean}</span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      className={cx(
        "px-3 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-2",
        disabled ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed" : "text-white hover:brightness-95",
        className
      )}
      style={!disabled ? { background: ORANGE } : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!!disabled}
      className={cx(
        "px-3 py-2 rounded-2xl border text-xs font-semibold inline-flex items-center gap-2",
        disabled ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TinySwitch({
  checked,
  disabled,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        "h-7 w-12 rounded-full border relative transition",
        checked ? "border-orange-500 bg-orange-500" : "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={() => !disabled && onChange(!checked)}
      aria-label="toggle"
    >
      <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white transition", checked ? "left-5" : "left-1")} />
    </button>
  );
}

/* ------------------------- Main page ------------------------- */

export default function CreatorLiveCrewManagementPremium() {
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const currentUser = "Owner";
  const currentUserRoleId: WorkspaceRoleId = "owner";

  // Premium gating: these IDs should match the Roles & Permissions page.
  const viewerPerms: Record<PermissionId, boolean> = {
    "crew.manage_assignments": true,
    "crew.override_conflicts": true,
    "crew.manage_session_permissions": true,
    "availability.view_team": true,
    "availability.view_details": true,
    "availability.request_update": true,
    "suppliers.invite_guest_cohost": true
  };

  const [sessions, setSessions] = useState<Session[]>(() => [
    {
      id: "S-1001",
      title: "BBS — Flash Dealz Live",
      supplierName: "BBS",
      campaign: "Flash Dealz",
      status: "Scheduled",
      startISO: "2026-01-27T15:30:00.000Z", // 18:30 EAT
      durationMin: 60,
      cohostSlots: 2
    },
    {
      id: "S-1002",
      title: "Tech Friday Mega",
      supplierName: "Evzone",
      campaign: "Tech Friday",
      status: "Live",
      startISO: "2026-01-27T16:00:00.000Z", // 19:00 EAT
      durationMin: 75,
      cohostSlots: 2
    },
    {
      id: "S-1003",
      title: "Beauty Drop — Replay",
      supplierName: "GlowCo",
      campaign: "Beauty Drop",
      status: "Replay",
      startISO: "2026-01-26T16:00:00.000Z", // 19:00 EAT (yesterday)
      durationMin: 45,
      cohostSlots: 1
    }
  ]);

  const [members, setMembers] = useState<Member[]>(() => [
    {
      id: "P-me",
      name: "Ronald Isabirye",
      email: "owner@creatorstudio.com",
      handle: "@ronald",
      roleId: "owner",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-host-1",
      name: "Jade Host",
      email: "host@creatorstudio.com",
      handle: "@jade",
      roleId: "host",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-prod-1",
      name: "Doreen K.",
      email: "producer@creatorstudio.com",
      handle: "@doreen",
      roleId: "producer",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-prod-2",
      name: "Kelvin M.",
      email: "ops.producer@creatorstudio.com",
      handle: "@kelvin",
      roleId: "producer",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-mod-1",
      name: "Sarah A.",
      email: "moderator@creatorstudio.com",
      handle: "@sarah",
      roleId: "moderator",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-mod-2",
      name: "Aisha N.",
      email: "mod2@creatorstudio.com",
      handle: "@aisha",
      roleId: "moderator",
      status: "Active",
      tzLabel: "WAT (+1)",
      tzOffsetHours: 1
    },
    {
      id: "P-mod-3",
      name: "Chris P.",
      email: "mod3@creatorstudio.com",
      handle: "@chris",
      roleId: "moderator",
      status: "Suspended",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-co-1",
      name: "Amina S.",
      email: "cohost@creatorstudio.com",
      handle: "@amina",
      roleId: "cohost",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-co-2",
      name: "Li Wei (guest)",
      email: "liwei@guest.com",
      handle: "@liwei",
      roleId: "external",
      status: "External",
      tzLabel: "SGT (+8)",
      tzOffsetHours: 8
    }
  ]);

  const [availabilityByMember, setAvailabilityByMember] = useState<AvailabilityByMember>(() => ({
    "P-me": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: []
    },
    "P-host-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: [
        {
          id: "ev_h1",
          startISO: "2026-01-27T14:30:00.000Z",
          endISO: "2026-01-27T15:10:00.000Z",
          title: "Prep: product rundown"
        }
      ]
    },
    "P-prod-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: [
        {
          id: "ev_p1",
          startISO: "2026-01-27T15:45:00.000Z",
          endISO: "2026-01-27T16:20:00.000Z",
          title: "Ops standup"
        }
      ]
    },
    "P-prod-2": {
      connected: false,
      privacy: "details",
      updatedAt: "Not connected",
      events: []
    },
    "P-mod-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: []
    },
    "P-mod-2": {
      connected: true,
      privacy: "busy_free",
      updatedAt: "Yesterday",
      events: [
        {
          id: "ev_m2",
          startISO: "2026-01-27T15:25:00.000Z",
          endISO: "2026-01-27T15:50:00.000Z",
          title: "Busy"
        }
      ]
    },
    "P-mod-3": {
      connected: false,
      privacy: "details",
      updatedAt: "Not connected",
      events: []
    },
    "P-co-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: []
    },
    "P-co-2": {
      connected: true,
      privacy: "busy_free",
      updatedAt: "Today",
      events: [
        {
          id: "ev_g1",
          startISO: "2026-01-27T15:20:00.000Z",
          endISO: "2026-01-27T15:40:00.000Z",
          title: "Busy"
        }
      ]
    }
  }));

  const [activeSessionId, setActiveSessionId] = useState<string>("S-1001");

  const [assignmentsBySession, setAssignmentsBySession] = useState<Record<string, Assignments>>(() => ({
    "S-1001": { hostId: "P-host-1", producerId: "P-prod-1", moderatorIds: ["P-mod-1"], cohostIds: ["P-co-2"] },
    // Intentionally conflicting: same producer overlaps S-1001
    "S-1002": { hostId: "P-me", producerId: "P-prod-1", moderatorIds: ["P-mod-1", "P-mod-2"], cohostIds: ["P-co-1"] },
    "S-1003": { hostId: "P-me", producerId: "P-prod-2", moderatorIds: ["P-mod-2"], cohostIds: [] }
  }));

  const [locksBySession] = useState<Record<string, SoftLocksBySession>>(() => ({
    // Example soft locks requested:
    "S-1002": {
      producer: {
        by: "Ops",
        label: "Producer locked by Ops",
        reason: "Ops run-of-show is locked 60 minutes before a Live session.",
        createdAt: "Today"
      },
      host: {
        by: "Policy",
        label: "Host locked by policy",
        reason: "Host is locked when session is Live to prevent mid-stream identity changes.",
        createdAt: "Today"
      }
    },
    "S-1001": {
      moderators: {
        "P-mod-1": {
          by: "Policy",
          label: "Moderator assigned by policy",
          reason: "Compliance moderator is required for this supplier.",
          createdAt: "This week"
        }
      },
      permLocks: {
        "P-mod-1": {
          by: "Policy",
          label: "Permissions locked by policy",
          reason: "Compliance moderator permissions are locked for this session.",
          createdAt: "This week"
        },
        "P-co-2": {
          by: "Policy",
          label: "Guest permissions locked",
          reason: "Supplier guest permissions are locked to 'Pin dealz' only.",
          createdAt: "This week"
        }
      }
    }
  }));

  const [sessionPermsBySession, setSessionPermsBySession] = useState<Record<string, SessionPerms>>(() =>
    buildInitialSessionPerms(assignmentsBySession)
  );

  const [audit, setAudit] = useState<AuditEntry[]>(() => [
    { id: uid("a"), when: nowLabel(), who: "System", what: "Crew module opened", meta: "Crew Management" }
  ]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<CrewRole>("Co-host");
  const [inviteMode, setInviteMode] = useState<"team" | "guest">("team");
  const [inviteTo, setInviteTo] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSupplier, setInviteSupplier] = useState("");

  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    sessionId: string;
    role: CrewRole;
    candidateId: string;
    overlappingSessions: Session[];
    calendarConflicts: AvailabilityEvent[];
  } | null>(null);

  const [conflictOverrideWarning, setConflictOverrideWarning] = useState<
    | {
      open: boolean;
      sessionId: string;
      role: CrewRole;
      candidateId: string;
      overlappingSessions: Session[];
      calendarConflicts: AvailabilityEvent[];
    }
    | null
  >(null);

  const [availabilityModal, setAvailabilityModal] = useState<{ open: boolean; memberId: string } | null>(null);

  const [rescheduleModal, setRescheduleModal] = useState<{
    open: boolean;
    sessionId: string;
    startISO: string;
    durationMin: number;
  } | null>(null);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const activeAssignments = assignmentsBySession[activeSession.id];

  const sessionLocks = locksBySession[activeSession.id] || {};
  const sessionPerms = sessionPermsBySession[activeSession.id] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };

  function addAudit(who: string, what: string, meta: string) {
    setAudit((prev) => [{ id: uid("aud"), when: nowLabel(), who, what, meta }, ...prev].slice(0, 40));
  }



  function requestUnlock(sessionId: string, lock: SoftLock) {
    push("Unlock requested");
    addAudit(currentUser, `Unlock requested`, `${lock.label} · Session ${sessionId}`);
  }

  function ensureViewerCanEditAssignments(): boolean {
    if (!viewerPerms["crew.manage_assignments"]) {
      push("You do not have permission to edit crew", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.manage_assignments");
      return false;
    }
    return true;
  }

  function ensureViewerCanOverrideConflicts(): boolean {
    if (!viewerPerms["crew.override_conflicts"]) {
      push("Conflict override not allowed for your role", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.override_conflicts");
      return false;
    }
    return true;
  }



  function openAvailability(memberId: string) {
    if (!viewerPerms["availability.view_team"]) {
      push("No permission to view availability", "error");
      addAudit(currentUser, "Blocked: Missing permission", "availability.view_team");
      return;
    }
    setAvailabilityModal({ open: true, memberId });
  }

  function requestAvailabilityUpdate(memberId: string) {
    if (!viewerPerms["availability.request_update"]) {
      push("No permission to request availability updates", "error");
      addAudit(currentUser, "Blocked: Missing permission", "availability.request_update");
      return;
    }
    const m = getMember(members, memberId);
    push("Availability update requested");
    addAudit(currentUser, "Availability update requested", `${m?.name || memberId} · Session ${activeSession.id}`);
  }

  // Conflict detection: overlaps with other sessionz OR calendar busy
  function computeAssignmentConflicts(sessionId: string, crewRole: CrewRole, candidateId: string) {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return { overlappingSessions: [], calendarConflicts: [] as AvailabilityEvent[] };

    const rA = getRange(sess);

    // Enforce overlapping-session booking for ALL roles (host, producer, moderator, cohost)
    const overlappingSessions = sessions
      .filter((s) => s.id !== sessionId && s.status !== "Replay")
      .filter((s) => {
        const asg = assignmentsBySession[s.id];
        if (!asg) return false;
        return (
          asg.hostId === candidateId ||
          asg.producerId === candidateId ||
          asg.moderatorIds.includes(candidateId) ||
          asg.cohostIds.includes(candidateId)
        );
      })
      .filter((s) => {
        const rB = getRange(s);
        return overlaps(rA.start, rA.end, rB.start, rB.end);
      });

    const cal = availabilityByMember[candidateId];
    const calendarConflicts = availabilityConflictsForSession(sess, cal);

    return { overlappingSessions, calendarConflicts };
  }

  function setHost(sessionId: string, nextHostId: string | null, opts?: { force?: boolean }) {
    if (!ensureViewerCanEditAssignments()) return;

    const sessionLock = locksBySession[sessionId]?.host;
    if (sessionLock) {
      push("Host is locked (policy). Request unlock.", "error");
      requestUnlock(sessionId, sessionLock);
      return;
    }

    const prevHostId = assignmentsBySession[sessionId]?.hostId || null;

    if (nextHostId) {
      const m = getMember(members, nextHostId);
      if (!m) return;

      if (!canAssignToCrewRole(m, "Host")) {
        push("Host must be Active and eligible (Host capability).", "error");
        addAudit(currentUser, "Blocked: Host not eligible", `${m.name} · Session ${sessionId}`);
        return;
      }

      // Conflict check
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Host", nextHostId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;

      if (hasConflict && !opts?.force) {
        setConflictDialog({
          open: true,
          sessionId,
          role: "Host",
          candidateId: nextHostId,
          overlappingSessions,
          calendarConflicts
        });
        return;
      }
    }

    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] }), hostId: nextHostId }
    }));

    // perms sync
    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      const nextHosts: Record<string, PermissionSet> = {};
      if (nextHostId) nextHosts[nextHostId] = sp.hosts[nextHostId] || defaultPermsForCrewRole("Host");
      return { ...prev, [sessionId]: { ...sp, hosts: nextHosts } };
    });

    const prevName = getMember(members, prevHostId)?.name || "None";
    const nextName = getMember(members, nextHostId)?.name || "None";
    push("Host updated", "success");
    addAudit(currentUser, "Host changed", `${prevName} → ${nextName} · Session ${sessionId}`);
  }

  function setProducer(sessionId: string, nextProducerId: string | null, opts?: { force?: boolean }) {
    if (!ensureViewerCanEditAssignments()) return;

    const sessionLocks = locksBySession[sessionId];
    if (sessionLocks?.producer) {
      push("Producer is locked (Ops). Request unlock.", "error");
      requestUnlock(sessionId, sessionLocks.producer);
      return;
    }

    const prevProducerId = assignmentsBySession[sessionId]?.producerId || null;

    if (nextProducerId) {
      const m = getMember(members, nextProducerId);
      if (!m) return;

      if (!canAssignToCrewRole(m, "Producer")) {
        push("Producer must be Active and eligible (Producer capability).", "error");
        addAudit(currentUser, "Blocked: Producer not eligible", `${m.name} · Session ${sessionId}`);
        return;
      }

      // Conflict check: warn if booked elsewhere OR calendar busy
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Producer", nextProducerId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;

      if (hasConflict && !opts?.force) {
        setConflictDialog({
          open: true,
          sessionId,
          role: "Producer",
          candidateId: nextProducerId,
          overlappingSessions,
          calendarConflicts
        });
        return;
      }
    }

    // Apply
    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] }),
        producerId: nextProducerId
      }
    }));

    // Update perms
    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      const nextProducers: Record<string, PermissionSet> = {};
      if (nextProducerId) nextProducers[nextProducerId] = sp.producers[nextProducerId] || defaultPermsForCrewRole("Producer");
      return { ...prev, [sessionId]: { ...sp, producers: nextProducers } };
    });

    const prevName = getMember(members, prevProducerId)?.name || "None";
    const nextName = getMember(members, nextProducerId)?.name || "None";
    push("Producer updated", "success");
    addAudit(currentUser, "Producer changed", `${prevName} → ${nextName} · Session ${sessionId}`);
  }

  function toggleModerator(sessionId: string, memberId: string, opts?: { force?: boolean }) {
    if (!ensureViewerCanEditAssignments()) return;

    const m = getMember(members, memberId);
    if (!m) return;

    if (!canAssignToCrewRole(m, "Moderator")) {
      push("Moderator must be Active and eligible (Moderator capability).", "error");
      addAudit(currentUser, "Blocked: Moderator not eligible", `${m.name} · Session ${sessionId}`);
      return;
    }

    const curAsg = assignmentsBySession[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
    const exists = curAsg.moderatorIds.includes(memberId);

    if (!exists && !opts?.force) {
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Moderator", memberId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;
      if (hasConflict) {
        setConflictDialog({
          open: true,
          sessionId,
          role: "Moderator",
          candidateId: memberId,
          overlappingSessions,
          calendarConflicts
        });
        return;
      }
    }

    const lock = locksBySession[sessionId]?.moderators?.[memberId];

    setAssignmentsBySession((prev) => {
      const cur = prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
      const exists = cur.moderatorIds.includes(memberId);

      if (exists && lock) {
        push("Moderator is locked by policy.", "error");
        requestUnlock(sessionId, lock);
        return prev;
      }

      const nextMods = exists ? cur.moderatorIds.filter((x) => x !== memberId) : [...cur.moderatorIds, memberId];
      const next = { ...prev, [sessionId]: { ...cur, moderatorIds: nextMods } };

      // perms sync
      setSessionPermsBySession((pPrev) => {
        const sp = pPrev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
        const nextModerators = { ...sp.moderators };
        if (exists) delete nextModerators[memberId];
        else nextModerators[memberId] = sp.moderators[memberId] || defaultPermsForCrewRole("Moderator");
        return { ...pPrev, [sessionId]: { ...sp, moderators: nextModerators } };
      });

      push(exists ? "Moderator removed" : "Moderator added", "success");
      addAudit(
        currentUser,
        exists ? `${m.name} removed as Moderator for Session ${sessionId}` : `${m.name} added as Moderator for Session ${sessionId}`,
        activeSession.title
      );

      return next;
    });
  }

  function toggleCohost(sessionId: string, memberId: string, opts?: { force?: boolean }) {
    if (!ensureViewerCanEditAssignments()) return;

    const m = getMember(members, memberId);
    if (!m) return;

    if (!canAssignToCrewRole(m, "Co-host")) {
      push("Co-host must be eligible (Active/External/Invited) and have Co-host capability.", "error");
      addAudit(currentUser, "Blocked: Co-host not eligible", `${m.name} · Session ${sessionId}`);
      return;
    }

    const curAsg = assignmentsBySession[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
    const exists = curAsg.cohostIds.includes(memberId);

    if (!exists && !opts?.force) {
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Co-host", memberId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;
      if (hasConflict) {
        setConflictDialog({
          open: true,
          sessionId,
          role: "Co-host",
          candidateId: memberId,
          overlappingSessions,
          calendarConflicts
        });
        return;
      }
    }

    const lock = locksBySession[sessionId]?.cohosts?.[memberId];
    const sess = sessions.find((s) => s.id === sessionId);
    const slots = sess?.cohostSlots ?? 2;

    setAssignmentsBySession((prev) => {
      const cur = prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
      const exists = cur.cohostIds.includes(memberId);

      if (exists && lock) {
        push("Co-host is locked.", "error");
        requestUnlock(sessionId, lock);
        return prev;
      }

      if (!exists && cur.cohostIds.length >= slots) {
        push(`Max ${slots} co-hosts for this session.`, "error");
        return prev;
      }

      const nextCohosts = exists ? cur.cohostIds.filter((x) => x !== memberId) : [...cur.cohostIds, memberId];
      const next = { ...prev, [sessionId]: { ...cur, cohostIds: nextCohosts } };

      // perms sync
      setSessionPermsBySession((pPrev) => {
        const sp = pPrev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
        const nextC = { ...sp.cohosts };
        if (exists) delete nextC[memberId];
        else nextC[memberId] = sp.cohosts[memberId] || defaultPermsForCrewRole("Co-host");
        return { ...pPrev, [sessionId]: { ...sp, cohosts: nextC } };
      });

      push(exists ? "Co-host removed" : "Co-host added", "success");
      addAudit(
        currentUser,
        exists ? `${m.name} removed as Co-host for Session ${sessionId}` : `${m.name} added as Co-host for Session ${sessionId}`,
        activeSession.title
      );

      return next;
    });
  }

  function setSessionPerm(sessionId: string, crewRole: CrewRole, memberId: string, action: SessionAction, value: boolean) {
    if (!viewerPerms["crew.manage_session_permissions"]) {
      push("No permission to edit session-level permissions", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.manage_session_permissions");
      return;
    }

    const sessLocks = locksBySession[sessionId];
    const permLock = sessLocks?.permLocks?.[memberId];
    if (permLock) {
      push("Permissions locked by policy.", "error");
      requestUnlock(sessionId, permLock);
      return;
    }

    const allowed = allowedActionsForCrewRole(crewRole);
    if (!allowed.has(action)) {
      push("Not allowed for this role.", "error");
      addAudit(currentUser, "Blocked: Permission not allowed", `${crewRole} · ${action} · Session ${sessionId}`);
      return;
    }

    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };

      const apply = (bucket: Record<string, PermissionSet>) => {
        const cur = bucket[memberId] || defaultPermsForCrewRole(crewRole);
        return { ...bucket, [memberId]: { ...cur, [action]: value } };
      };

      const next: SessionPerms =
        crewRole === "Host"
          ? { ...sp, hosts: apply(sp.hosts) }
          : crewRole === "Producer"
            ? { ...sp, producers: apply(sp.producers) }
            : crewRole === "Moderator"
              ? { ...sp, moderators: apply(sp.moderators) }
              : { ...sp, cohosts: apply(sp.cohosts) };

      const memberName = getMember(members, memberId)?.name || memberId;
      const label = ACTION_META.find((a) => a.key === action)?.label || action;
      addAudit(currentUser, "Session permission updated", `${memberName} · ${crewRole} · ${label}: ${value ? "ON" : "OFF"} · Session ${sessionId}`);
      return { ...prev, [sessionId]: next };
    });

    push("Permission updated", "success");
  }

  function defaultAvailabilityForNewMember(roleId: WorkspaceRoleId): AvailabilityCalendar {
    // Premium idea:
    //  - Internal team can use full calendar details (by policy)
    //  - External guests default to busy/free for privacy
    const isExternal = roleId === "external";
    return {
      connected: false,
      privacy: isExternal ? "busy_free" : "details",
      updatedAt: "Not connected",
      events: []
    };
  }

  function sendInvite() {
    if (!ensureViewerCanEditAssignments()) return;

    const to = inviteTo.trim();
    if (!to || !/.+@.+\..+/.test(to)) {
      push("Enter a valid email", "error");
      return;
    }

    if (inviteMode === "guest" && !viewerPerms["suppliers.invite_guest_cohost"]) {
      push("You do not have permission to invite guest co-hosts", "error");
      addAudit(currentUser, "Blocked: Missing permission", "suppliers.invite_guest_cohost");
      return;
    }

    const inferredName =
      inviteName.trim() ||
      to
        .split("@")[0]
        .replace(/\./g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const roleIdForInvite: WorkspaceRoleId =
      inviteMode === "guest"
        ? "external"
        : inviteRole === "Host"
          ? "host"
          : inviteRole === "Producer"
            ? "producer"
            : inviteRole === "Moderator"
              ? "moderator"
              : "cohost";

    const newId = uid(inviteMode === "guest" ? "G" : "I");

    setMembers((prev) => [
      {
        id: newId,
        name: inferredName + (inviteMode === "guest" ? " (guest)" : ""),
        email: to,
        handle: undefined,
        roleId: roleIdForInvite,
        status: "Invited",
        tzLabel: "EAT (+3)",
        tzOffsetHours: 3
      },
      ...prev
    ]);

    setAvailabilityByMember((prev) => ({
      ...prev,
      [newId]: defaultAvailabilityForNewMember(roleIdForInvite)
    }));

    push("Invite sent", "success");
    addAudit(
      currentUser,
      inviteMode === "guest" ? "Guest invite sent" : "Invite sent",
      `${inferredName} · ${to} · ${inviteRole} · Session ${activeSession.id}${inviteMode === "guest" && inviteSupplier.trim() ? ` · Supplier: ${inviteSupplier.trim()}` : ""}`
    );

    setInviteOpen(false);
    setInviteTo("");
    setInviteName("");
    setInviteSupplier("");
  }

  const inviteLink = useMemo(() => {
    // Example only
    return `https://myaccounts.evzone.com/session-invite?session=${encodeURIComponent(activeSession.id)}&role=${encodeURIComponent(inviteRole)}&type=${encodeURIComponent(inviteMode)}`;
  }, [activeSession.id, inviteRole, inviteMode]);

  // Active session Producer conflicts
  const activeProducerConflicts = useMemo(() => {
    const pid = activeAssignments?.producerId;
    if (!pid) return { overlappingSessions: [] as Session[], calendarConflicts: [] as AvailabilityEvent[] };

    return computeAssignmentConflicts(activeSession.id, "Producer", pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession.id, activeAssignments?.producerId, sessions, assignmentsBySession, availabilityByMember]);

  function memberAvailabilityState(memberId: string) {
    const cal = availabilityByMember[memberId];
    return availabilityForMemberInSession(activeSession, cal);
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors font-sans pb-20">
      <ToastArea toasts={toasts} />
      {/* Conflict modal */}
      <ModalShell open={!!conflictDialog?.open} title="Scheduling conflict detected" onClose={() => setConflictDialog(null)}>
        {conflictDialog ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Conflict warning
              </div>
              <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                {getMember(members, conflictDialog.candidateId)?.name || "This user"} has a conflict for{" "}
                <span className="font-semibold">{conflictDialog.role}</span> on Session{" "}
                <span className="font-semibold">{conflictDialog.sessionId}</span>.
              </div>
            </div>

            {conflictDialog.overlappingSessions.length ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Overlapping sessions</div>
                <div className="mt-2 space-y-2">
                  {conflictDialog.overlappingSessions.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title}</div>
                        <StatusPill status={s.status} />
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {formatInOffset(s.startISO, 3)} · {s.durationMin} min · Session {s.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {conflictDialog.calendarConflicts.length ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Calendar busy</div>
                <div className="mt-2 space-y-2">
                  {conflictDialog.calendarConflicts.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.title}</div>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                          Busy
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {formatInOffset(c.startISO, 3)} - {formatInOffset(c.endISO, 3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              Conflict resolution: reschedule the session or pick a different member.
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <SoftButton
                onClick={() => {
                  const s = sessions.find((x) => x.id === conflictDialog.sessionId);
                  if (s) {
                    setRescheduleModal({
                      open: true,
                      sessionId: s.id,
                      startISO: s.startISO,
                      durationMin: s.durationMin
                    });
                  }
                  setConflictDialog(null);
                }}
              >
                <CalendarClock className="h-4 w-4" />
                Change session time
              </SoftButton>
              <PrimaryButton
                onClick={() => {
                  setConflictOverrideWarning({
                    ...conflictDialog,
                    open: true
                  });
                  setConflictDialog(null);
                }}
              >
                <Users className="h-4 w-4" />
                Keep assignment & warn
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </ModalShell>

      {/* Conflict override warning */}
      <ModalShell open={!!conflictOverrideWarning?.open} title="Conflict override" onClose={() => setConflictOverrideWarning(null)}>
        {conflictOverrideWarning ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="text-sm font-semibold inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Conflict override
              </div>
              <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                You are about to override a scheduling conflict for{" "}
                <span className="font-semibold">{getMember(members, conflictOverrideWarning.candidateId)?.name || "this user"}</span> as{" "}
                <span className="font-semibold">{conflictOverrideWarning.role}</span> on Session{" "}
                <span className="font-semibold">{conflictOverrideWarning.sessionId}</span>.
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              This action will assign the crew member despite the detected conflict. Ensure you have confirmed their availability.
            </div>
            <div className="flex items-center justify-end gap-2">
              <SoftButton onClick={() => setConflictOverrideWarning(null)}>Cancel</SoftButton>
              <PrimaryButton
                disabled={!viewerPerms["crew.override_conflicts"]}
                onClick={() => {
                  if (!ensureViewerCanOverrideConflicts()) return;
                  if (!conflictOverrideWarning) return;
                  const sid = conflictOverrideWarning.sessionId;
                  const pid = conflictOverrideWarning.candidateId;
                  const role = conflictOverrideWarning.role;

                  if (role === "Host") setHost(sid, pid, { force: true });
                  else if (role === "Producer") setProducer(sid, pid, { force: true });
                  else if (role === "Moderator") toggleModerator(sid, pid, { force: true });
                  else if (role === "Co-host") toggleCohost(sid, pid, { force: true });

                  setConflictOverrideWarning(null);
                  addAudit(currentUser, "Conflict override used", `${getMember(members, pid)?.name || pid} · ${role} · Session ${sid}`);
                }}
              >
                <Check className="h-4 w-4" />
                Assign anyway
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </ModalShell>

      {/* Reschedule modal */}
      <ModalShell open={!!rescheduleModal?.open} title="Reschedule Session" onClose={() => setRescheduleModal(null)}>
        {rescheduleModal ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
              <div className="text-sm font-semibold">{sessions.find(s => s.id === rescheduleModal.sessionId)?.title}</div>
              <div className="text-xs text-slate-500">Session {rescheduleModal.sessionId}</div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-slate-400">Start Time (ISO)</label>
              <input
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none"
                value={rescheduleModal.startISO}
                onChange={(e) => setRescheduleModal({ ...rescheduleModal, startISO: e.target.value })}
              />
              <div className="text-[10px] text-slate-500 italic">Example: 2026-01-27T16:00:00.000Z</div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase text-slate-400">Duration (min)</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm outline-none"
                value={rescheduleModal.durationMin}
                onChange={(e) => setRescheduleModal({ ...rescheduleModal, durationMin: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <SoftButton onClick={() => setRescheduleModal(null)}>Cancel</SoftButton>
              <PrimaryButton
                onClick={() => {
                  setSessions((prev: Session[]) =>
                    prev.map((s: Session) =>
                      s.id === rescheduleModal.sessionId
                        ? { ...s, startISO: rescheduleModal.startISO, durationMin: rescheduleModal.durationMin, endISO: new Date(new Date(rescheduleModal.startISO).getTime() + rescheduleModal.durationMin * 60000).toISOString() }
                        : s
                    )
                  );
                  addAudit(currentUser, "Session rescheduled", `Session ${rescheduleModal.sessionId} → ${rescheduleModal.startISO}`);
                  setRescheduleModal(null);
                  push("Session rescheduled", "success");
                }}
              >
                <Check className="h-4 w-4" />
                Apply changes
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </ModalShell>

      {/* Availability modal */}
      <ModalShell
        open={!!availabilityModal?.open}
        title="Team availability"
        onClose={() => setAvailabilityModal(null)}
      >
        {availabilityModal ? (
          <AvailabilityModalContent
            viewerPerms={viewerPerms}
            member={getMember(members, availabilityModal.memberId)}
            calendar={availabilityByMember[availabilityModal.memberId]}
            session={activeSession}
            onRequestUpdate={() => requestAvailabilityUpdate(availabilityModal.memberId)}
          />
        ) : null}
      </ModalShell>

      {/* Invite modal */}
      <ModalShell open={inviteOpen} title="Invite crew to this session" onClose={() => setInviteOpen(false)}>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Session</div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300">{activeSession.title}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Session {activeSession.id}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold">Invite type</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={cx(
                  "px-3 py-2 rounded-2xl border text-[11px] font-semibold",
                  inviteMode === "team" ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                )}
                style={inviteMode === "team" ? { background: ORANGE, borderColor: ORANGE } : undefined}
                onClick={() => setInviteMode("team")}
              >
                Team member (workspace)
              </button>
              <button
                type="button"
                className={cx(
                  "px-3 py-2 rounded-2xl border text-[11px] font-semibold",
                  inviteMode === "guest" ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200",
                  !viewerPerms["suppliers.invite_guest_cohost"] ? "opacity-60 cursor-not-allowed" : ""
                )}
                style={inviteMode === "guest" ? { background: ORANGE, borderColor: ORANGE } : undefined}
                onClick={() => viewerPerms["suppliers.invite_guest_cohost"] && setInviteMode("guest")}
                disabled={!viewerPerms["suppliers.invite_guest_cohost"]}
                title={!viewerPerms["suppliers.invite_guest_cohost"] ? "Missing permission: suppliers.invite_guest_cohost" : undefined}
              >
                Supplier guest (seller/provider)
              </button>
            </div>

            {inviteMode === "guest" ? (
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                Guests get session-only access and limited permissions (default: Pin dealz).
              </div>
            ) : (
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                Team members are governed by Roles & Permissions (status, role capabilities, and policies).
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Role for this invite</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["Host", "Producer", "Moderator", "Co-host"] as CrewRole[]).map((r) => {
                const active = inviteRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    className={cx(
                      "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                      active ? "text-white" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
                    )}
                    style={active ? { background: ORANGE, borderColor: ORANGE } : undefined}
                    onClick={() => setInviteRole(r)}
                  >
                    {r === "Host" ? (
                      <Crown className="h-4 w-4" />
                    ) : r === "Producer" ? (
                      <Video className="h-4 w-4" />
                    ) : r === "Moderator" ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    {r}
                  </button>
                );
              })}
            </div>

            {inviteMode === "guest" && inviteRole !== "Co-host" ? (
              <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-2 text-[10px] text-slate-700 dark:text-slate-300">
                For supplier sellers/providers, the recommended role is <span className="font-semibold">Co-host</span>. Host/Producer/Moderator are usually internal only.
              </div>
            ) : null}
          </div>

          {inviteMode === "guest" ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="text-[11px] font-semibold dark:text-slate-100">Supplier / seller (optional)</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] outline-none dark:text-slate-100"
                placeholder="Example: BBS (seller)"
                value={inviteSupplier}
                onChange={(e) => setInviteSupplier(e.target.value)}
              />
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Used for audit + policy labeling.</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Invite to</div>
            <div className="mt-2 flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-white dark:bg-slate-950">
              <Mail className="h-4 w-4 text-slate-400" />
              <input
                className="flex-1 outline-none text-[11px] bg-transparent dark:text-slate-100"
                placeholder="name@email.com"
                value={inviteTo}
                onChange={(e) => setInviteTo(e.target.value)}
              />
            </div>

            <div className="mt-2">
              <div className="text-[11px] font-semibold dark:text-slate-100">Name (optional)</div>
              <input
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] outline-none dark:text-slate-100"
                placeholder="Example: Sarah from BBS"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Invite link</div>
              <div className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all">{inviteLink}</div>
              <div className="mt-2 flex gap-2">
                <SoftButton onClick={() => copyToClipboard(inviteLink, push)}>
                  <ClipboardCopy className="h-4 w-4" />
                  Copy link
                </SoftButton>
                <PrimaryButton onClick={sendInvite}>
                  <UserPlus className="h-4 w-4" />
                  Send invite
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 md:px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/MyliveDealz PNG Icon 1.png" alt="MyLiveDealz" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50">Crew Management</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Assign Host, Producer, Moderator and Co-hosts per session. Uses Roles & Permissions status + policy locks.
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip roleId={currentUserRoleId} />
              {viewerPerms["availability.view_team"] ? (
                <span className="px-2.5 py-1 rounded-full text-[10px] border bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  Availability enabled
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                  Availability hidden
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SoftButton onClick={() => navigate("/roles-permissions")}>
                <KeyRound className="h-4 w-4" />
                Roles & Permissions
              </SoftButton>
              <PrimaryButton onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite crew
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-4">
        {/* Left: sessionz + roster */}
        <section className="space-y-4">
          {/* Sessionz */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="mb-4">
              <div className="text-[13px] font-semibold dark:text-slate-100">Live sessions</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Select a session to assign crew and permissions.</div>
            </div>
            <div className="space-y-3">
              {sessions.map((s) => {
                const isActive = activeSessionId === s.id;
                const rangeA = getRange(s);

                const asg = assignmentsBySession[s.id];
                const assignedProducerId = asg?.producerId;
                const assignedHostId = asg?.hostId;

                const hostName = getMember(members, assignedHostId)?.name || "Unassigned";
                const producerName = getMember(members, assignedProducerId)?.name || "Unassigned";

                const hasOverlapConflict =
                  sessions
                    .filter((o) => o.id !== s.id && o.status !== "Replay")
                    .some((o) => {
                      const asgA = assignmentsBySession[s.id];
                      const asgB = assignmentsBySession[o.id];
                      if (!asgA || !asgB) return false;

                      // Check if any of Session A's crew is in Session B
                      const crewA = [asgA.hostId, asgA.producerId, ...asgA.moderatorIds, ...asgA.cohostIds].filter(Boolean);
                      const crewB = [asgB.hostId, asgB.producerId, ...asgB.moderatorIds, ...asgB.cohostIds].filter(Boolean);
                      const shared = crewA.filter(id => crewB.includes(id as string));
                      if (shared.length === 0) return false;

                      const rangeA = getRange(s);
                      const rangeB = getRange(o);
                      return overlaps(rangeA.start, rangeA.end, rangeB.start, rangeB.end);
                    });

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={cx(
                      "w-full text-left rounded-2xl border p-3 transition",
                      isActive ? "bg-amber-50/40 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold truncate">{s.title}</div>
                          <StatusPill status={s.status} />
                          {hasOverlapConflict ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 inline-flex items-center gap-1"
                              title="Crew member(s) booked on overlapping session"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Conflict
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          <CalendarClock className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                          {formatInOffset(s.startISO, 3)} · {s.durationMin} min · {s.supplierName}
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Host:</span> {hostName}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: {s.id}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Producer:</span> {producerName}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team roster */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Team roster</div>
                <div className="text-xs text-slate-500">Statuses and base roles come from Roles & Permissions.</div>
              </div>
              <SoftButton
                onClick={() => push("Filters coming soon")}
                disabled={false}
              >
                <Search className="h-4 w-4" />
                Filter
              </SoftButton>
            </div>

            <div className="mt-3 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200"
                placeholder="Search members"
              />
            </div>

            {!viewerPerms["crew.manage_assignments"] ? (
              <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-slate-700 dark:text-slate-300">
                You can view crew, but you cannot edit assignments. Ask an Owner/Manager for access.
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {members.map((m) => {
                const asg = assignmentsBySession[activeSession.id];

                const isHost = asg?.hostId === m.id;
                const isProducer = asg?.producerId === m.id;
                const isModerator = asg?.moderatorIds?.includes(m.id);
                const isCohost = asg?.cohostIds?.includes(m.id);

                const eligibleHost = canAssignToCrewRole(m, "Host");
                const eligibleProducer = canAssignToCrewRole(m, "Producer");
                const eligibleModerator = canAssignToCrewRole(m, "Moderator");
                const eligibleCohost = canAssignToCrewRole(m, "Co-host");

                const producerLocked = !!sessionLocks.producer;
                const hostLocked = !!sessionLocks.host;

                // Member overlap conflicts (any crew role)
                const memberOverlapConflict = (() => {
                  const rA = getRange(activeSession);
                  return sessions
                    .filter((s) => s.id !== activeSession.id && s.status !== "Replay")
                    .some((s) => {
                      const asg = assignmentsBySession[s.id];
                      if (!asg) return false;
                      const isAssigned =
                        asg.hostId === m.id ||
                        asg.producerId === m.id ||
                        asg.moderatorIds.includes(m.id) ||
                        asg.cohostIds.includes(m.id);
                      if (!isAssigned) return false;

                      const rB = getRange(s);
                      return overlaps(rA.start, rA.end, rB.start, rB.end);
                    });
                })();

                // Calendar busy conflicts (any crew role)
                const av = memberAvailabilityState(m.id);
                const availabilityTitle =
                  av.state === "Busy"
                    ? `Busy for this session (${av.conflicts.length} conflict${av.conflicts.length === 1 ? "" : "s"})`
                    : av.state === "Available"
                      ? "Available for this session"
                      : "Calendar not connected / unknown";

                return (
                  <div key={m.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold truncate">{m.name}</div>
                          <MemberStatusPill status={m.status} title="From Roles & Permissions" />
                          <RoleChip roleId={m.roleId} />
                          {memberOverlapConflict ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 inline-flex items-center gap-1"
                              title="Already booked on an overlapping session"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Overbooked
                            </span>
                          ) : null}

                          {viewerPerms["availability.view_team"] ? (
                            <AvailabilityPill
                              state={av.state}
                              title={availabilityTitle}
                              onClick={() => openAvailability(m.id)}
                            />
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 truncate">{m.email}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {m.tzLabel} · {m.handle || ""}
                        </div>
                      </div>

                      {viewerPerms["availability.view_team"] ? (
                        <SoftButton onClick={() => requestAvailabilityUpdate(m.id)} disabled={!viewerPerms["availability.request_update"]}>
                          <Mail className="h-4 w-4" />
                          Request
                        </SoftButton>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {/* Host button: show only if eligible or already Host to keep UI clean */}
                      {(eligibleHost || isHost) ? (
                        <button
                          type="button"
                          className={cx(
                            "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                            isHost ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200",
                            (!eligibleHost || hostLocked || !viewerPerms["crew.manage_assignments"]) && !isHost ? "opacity-60 cursor-not-allowed" : ""
                          )}
                          style={isHost ? { background: ORANGE, borderColor: ORANGE } : undefined}
                          disabled={(!eligibleHost || hostLocked || !viewerPerms["crew.manage_assignments"]) && !isHost}
                          onClick={() => setHost(activeSession.id, isHost ? null : m.id)}
                          title={
                            hostLocked
                              ? "Host locked by policy"
                              : !eligibleHost
                                ? "Must be Active and have Host capability"
                                : "Assign as Host"
                          }
                        >
                          <Crown className="h-4 w-4" />
                          Host
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                          isProducer ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200",
                          (!eligibleProducer || producerLocked || !viewerPerms["crew.manage_assignments"]) && !isProducer ? "opacity-60 cursor-not-allowed" : ""
                        )}
                        style={isProducer ? { background: ORANGE, borderColor: ORANGE } : undefined}
                        disabled={(!eligibleProducer || producerLocked || !viewerPerms["crew.manage_assignments"]) && !isProducer}
                        onClick={() => setProducer(activeSession.id, isProducer ? null : m.id)}
                        title={
                          producerLocked
                            ? "Producer locked by Ops"
                            : !eligibleProducer
                              ? "Must be Active and have Producer capability"
                              : memberOverlapConflict
                                ? "Will warn (already booked)"
                                : av.state === "Busy"
                                  ? "Will warn (calendar busy)"
                                  : "Assign as Producer"
                        }
                      >
                        <Video className="h-4 w-4" />
                        Producer
                      </button>

                      <button
                        type="button"
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                          isModerator ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200",
                          (!eligibleModerator || !viewerPerms["crew.manage_assignments"]) && !isModerator ? "opacity-60 cursor-not-allowed" : ""
                        )}
                        style={isModerator ? { background: ORANGE, borderColor: ORANGE } : undefined}
                        disabled={(!eligibleModerator || !viewerPerms["crew.manage_assignments"]) && !isModerator}
                        onClick={() => toggleModerator(activeSession.id, m.id)}
                        title={!eligibleModerator ? "Must be Active and have Moderator capability" : "Toggle Moderator"}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Moderator
                      </button>

                      <button
                        type="button"
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                          isCohost ? "text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200",
                          (!eligibleCohost || !viewerPerms["crew.manage_assignments"]) && !isCohost ? "opacity-60 cursor-not-allowed" : ""
                        )}
                        style={isCohost ? { background: ORANGE, borderColor: ORANGE } : undefined}
                        disabled={(!eligibleCohost || !viewerPerms["crew.manage_assignments"]) && !isCohost}
                        onClick={() => toggleCohost(activeSession.id, m.id)}
                        title={!eligibleCohost ? "Co-host must be eligible and have Co-host capability" : "Toggle Co-host"}
                      >
                        <Users className="h-4 w-4" />
                        Co-host
                      </button>
                    </div>

                    {/* Status guidance */}
                    {m.status !== "Active" && m.status !== "External" && m.status !== "Invited" ? (
                      <div className="mt-2 text-[10px] text-slate-500">
                        This member is <span className="font-semibold">{m.status}</span> in Roles & Permissions — cannot be assigned until re-activated.
                      </div>
                    ) : null}

                    {m.status === "Invited" ? (
                      <div className="mt-2 text-[10px] text-slate-500">
                        Invite pending — you can pre-staff them as <span className="font-semibold">Co-host</span>, but they cannot join until they accept.
                      </div>
                    ) : null}

                    {producerLocked ? (
                      <div className="mt-2 text-[10px] text-slate-500">
                        <Lock className="h-3.5 w-3.5 inline mr-1" />
                        Producer changes are locked by Ops for this session.
                      </div>
                    ) : null}

                    {hostLocked ? (
                      <div className="mt-2 text-[10px] text-slate-500">
                        <Lock className="h-3.5 w-3.5 inline mr-1" />
                        Host changes are locked by policy for this session.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right: active session */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[13px] font-semibold truncate">{activeSession.title}</div>
                <StatusPill status={activeSession.status} />
                <span className="px-2.5 py-1 rounded-full text-[10px] border bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                  {activeSession.campaign}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                {formatInOffset(activeSession.startISO, 3)} · {activeSession.durationMin} min · Supplier: {activeSession.supplierName}
              </div>
            </div>
          </div>

          {/* Conflict detection callout (producer) */}
          {(activeProducerConflicts.overlappingSessions.length || activeProducerConflicts.calendarConflicts.length) ? (
            <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3">
              <div className="text-[11px] font-semibold inline-flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Producer conflict detected
              </div>
              <div className="mt-1 text-[11px] text-slate-700">
                {getMember(members, activeAssignments.producerId)?.name || "Producer"} may not be available:
              </div>

              {activeProducerConflicts.overlappingSessions.length ? (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-slate-700">Overlapping sessions</div>
                  <div className="mt-2 space-y-2">
                    {activeProducerConflicts.overlappingSessions.map((s) => (
                      <div key={s.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold">{s.title}</div>
                          <StatusPill status={s.status} />
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600">
                          {formatInOffset(s.startISO, 3)} · Session {s.id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeProducerConflicts.calendarConflicts.length ? (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-slate-700">Calendar busy</div>
                  <div className="mt-2 space-y-2">
                    {activeProducerConflicts.calendarConflicts.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold truncate">{ev.title || "Busy"}</div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] border bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                            Busy
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600">
                          {formatInOffset(ev.startISO, 3)} → {formatInOffset(ev.endISO, 3)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-2 text-[10px] text-slate-600">
                Premium workflow: pick a backup producer, or override if you confirm availability.
              </div>
            </div>
          ) : null}

          {/* Crew assignments */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <CrewSlotCard
              title="Host"
              icon={<Crown className="h-4 w-4" />}
              member={getMember(members, activeAssignments.hostId)}
              lock={sessionLocks.host}
              calendar={activeAssignments.hostId ? availabilityByMember[activeAssignments.hostId] : undefined}
              session={activeSession}
              showAvailability={viewerPerms["availability.view_team"]}
              onOpenAvailability={() => activeAssignments.hostId && openAvailability(activeAssignments.hostId)}
              onClear={() => setHost(activeSession.id, null)}
              onRequestUnlock={() => sessionLocks.host && requestUnlock(activeSession.id, sessionLocks.host)}
            />

            <CrewSlotCard
              title="Producer"
              icon={<Video className="h-4 w-4" />}
              member={getMember(members, activeAssignments.producerId)}
              lock={sessionLocks.producer}
              calendar={activeAssignments.producerId ? availabilityByMember[activeAssignments.producerId] : undefined}
              session={activeSession}
              showAvailability={viewerPerms["availability.view_team"]}
              onOpenAvailability={() => activeAssignments.producerId && openAvailability(activeAssignments.producerId)}
              onClear={() => setProducer(activeSession.id, null)}
              onRequestUnlock={() => sessionLocks.producer && requestUnlock(activeSession.id, sessionLocks.producer)}
            />

            <CrewMultiSlotCard
              title="Moderators"
              icon={<ShieldCheck className="h-4 w-4" />}
              memberIds={activeAssignments.moderatorIds}
              members={members}
              calendarByMember={availabilityByMember}
              session={activeSession}
              showAvailability={viewerPerms["availability.view_team"]}
              onOpenAvailability={(id) => openAvailability(id)}
              locks={sessionLocks.moderators}
              emptyText="No moderators assigned"
              onRemove={(id) => toggleModerator(activeSession.id, id)}
              max={4}
              onRequestUnlock={(id) => {
                const lock = sessionLocks.moderators?.[id];
                if (lock) requestUnlock(activeSession.id, lock);
              }}
            />

            <CrewMultiSlotCard
              title="Co-hosts"
              icon={<Users className="h-4 w-4" />}
              memberIds={activeAssignments.cohostIds}
              members={members}
              calendarByMember={availabilityByMember}
              session={activeSession}
              showAvailability={viewerPerms["availability.view_team"]}
              onOpenAvailability={(id) => openAvailability(id)}
              locks={sessionLocks.cohosts}
              emptyText="No co-hosts yet"
              onRemove={(id) => toggleCohost(activeSession.id, id)}
              max={activeSession.cohostSlots}
              onRequestUnlock={(id) => {
                const lock = sessionLocks.cohosts?.[id];
                if (lock) requestUnlock(activeSession.id, lock);
              }}
            />
          </div>

          {/* Session-level permissions */}
          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold inline-flex items-center gap-2 dark:text-slate-100">
                  <SlidersHorizontal className="h-4 w-4" />
                  Session-level permissions
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Overrides for this session only. Role rules still apply.</div>
              </div>
              {!viewerPerms["crew.manage_session_permissions"] ? (
                <span className="px-2.5 py-1 rounded-full text-xs border bg-slate-100 text-slate-700 border-slate-200">
                  Read-only
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-3">
              <SessionPermBlock
                title="Host permissions"
                crewRole="Host"
                memberId={activeAssignments.hostId}
                members={members}
                perms={sessionPerms.hosts}
                locks={sessionLocks.permLocks}
                readOnly={!viewerPerms["crew.manage_session_permissions"]}
                onChange={(memberId, action, value) => setSessionPerm(activeSession.id, "Host", memberId, action, value)}
              />

              <SessionPermBlock
                title="Producer permissions"
                crewRole="Producer"
                memberId={activeAssignments.producerId}
                members={members}
                perms={sessionPerms.producers}
                locks={sessionLocks.permLocks}
                readOnly={!viewerPerms["crew.manage_session_permissions"]}
                onChange={(memberId, action, value) => setSessionPerm(activeSession.id, "Producer", memberId, action, value)}
              />

              <SessionPermListBlock
                title="Moderator permissions"
                crewRole="Moderator"
                memberIds={activeAssignments.moderatorIds}
                members={members}
                perms={sessionPerms.moderators}
                locks={sessionLocks.permLocks}
                readOnly={!viewerPerms["crew.manage_session_permissions"]}
                onChange={(memberId, action, value) => setSessionPerm(activeSession.id, "Moderator", memberId, action, value)}
              />

              <SessionPermListBlock
                title="Co-host permissions"
                crewRole="Co-host"
                memberIds={activeAssignments.cohostIds}
                members={members}
                perms={sessionPerms.cohosts}
                locks={sessionLocks.permLocks}
                readOnly={!viewerPerms["crew.manage_session_permissions"]}
                onChange={(memberId, action, value) => setSessionPerm(activeSession.id, "Co-host", memberId, action, value)}
              />
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Example enforced: a Moderator can have only <span className="font-semibold">Mute chat</span> enabled;{" "}
              <span className="font-semibold">Kick host</span> is not allowed for Moderators.
            </div>
          </div>

          {/* Audit log */}
          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold inline-flex items-center gap-2 dark:text-slate-100">
                  <BadgeCheck className="h-4 w-4" />
                  Audit hooks
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Recent crew, availability & permission events.</div>
              </div>
              <SoftButton onClick={() => copyToClipboard(JSON.stringify(audit, null, 2), push)}>
                <Copy className="h-4 w-4" />
                Copy JSON
              </SoftButton>
            </div>

            <div className="mt-3 space-y-2">
              {audit.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.what}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{a.when}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {a.who} · {a.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer tip */}
          <div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4" />
            Tip: global access lives in Roles & Permissions. Per-session overrides and guest co-hosts live here.
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------- Availability modal content ------------------------- */

function AvailabilityModalContent({
  viewerPerms,
  member,
  calendar,
  session,
  onRequestUpdate
}: {
  viewerPerms: Record<PermissionId, boolean>;
  member: Member | null;
  calendar: AvailabilityCalendar | undefined;
  session: Session;
  onRequestUpdate: () => void;
}) {
  if (!member) return <div className="text-xs text-slate-600">Member not found.</div>;

  const cal = calendar || { connected: false, privacy: "busy_free" as AvailabilityPrivacy, updatedAt: "-", events: [] };
  const canSeeDetails = viewerPerms["availability.view_details"] && cal.privacy === "details";
  const conflicts = availabilityConflictsForSession(session, cal);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{member.name}</div>
            <div className="text-xs text-slate-600 truncate">{member.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <MemberStatusPill status={member.status} />
              <RoleChip roleId={member.roleId} />
              <span className="px-2.5 py-1 rounded-full text-xs border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                {cal.connected ? "Calendar connected" : "Not connected"}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                Privacy: {cal.privacy === "details" ? "Details" : "Busy/Free"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Updated: {cal.updatedAt}</div>
          </div>

          <SoftButton onClick={onRequestUpdate} disabled={!viewerPerms["availability.request_update"]}>
            <Mail className="h-4 w-4" />
            Request update
          </SoftButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-sm font-semibold">This session</div>
        <div className="mt-1 text-xs text-slate-600">
          {session.title} · {formatInOffset(session.startISO, member.tzOffsetHours)} · {session.durationMin} min
        </div>

        {cal.connected ? (
          conflicts.length ? (
            <div className="mt-2 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 p-2">
              <div className="text-sm font-semibold text-rose-800">Busy during this session</div>
              <div className="mt-1 text-xs text-rose-700">
                {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"} detected.
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-2">
              <div className="text-[11px] font-semibold text-emerald-800">Available</div>
              <div className="mt-1 text-[10px] text-emerald-700">No conflicts detected for this session.</div>
            </div>
          )
        ) : (
          <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-2">
            <div className="text-[11px] font-semibold text-amber-800">Unknown</div>
            <div className="mt-1 text-[10px] text-amber-700">Calendar not connected yet.</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold">Upcoming events</div>
            <div className="text-[10px] text-slate-500">
              {canSeeDetails ? "Showing event details." : "Showing busy/free only (privacy)."}
            </div>
          </div>
          <span className="text-[10px] text-slate-500">{member.tzLabel}</span>
        </div>

        <div className="mt-2 space-y-2">
          {cal.connected && cal.events.length ? (
            cal.events.slice(0, 6).map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-900 truncate">{canSeeDetails ? ev.title : "Busy"}</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                    {canSeeDetails ? "Event" : "Busy"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-600">
                  {formatInOffset(ev.startISO, member.tzOffsetHours)} → {formatInOffset(ev.endISO, member.tzOffsetHours)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-[11px] text-slate-600">
              {cal.connected ? "No events found." : "Connect calendar to see busy/free."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Assignment cards ------------------------- */

function CrewSlotCard({
  title,
  icon,
  member,
  lock,
  calendar,
  session,
  showAvailability,
  onOpenAvailability,
  onClear,
  onRequestUnlock
}: {
  title: string;
  icon: React.ReactNode;
  member: Member | null;
  lock?: SoftLock;
  calendar?: AvailabilityCalendar;
  session: Session;
  showAvailability: boolean;
  onOpenAvailability?: () => void;
  onClear: () => void;
  onRequestUnlock: () => void;
}) {
  const av = member && showAvailability ? availabilityForMemberInSession(session, calendar) : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-[11px] font-semibold inline-flex items-center gap-2 min-w-0">
          <span className="text-slate-700 shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        {lock ? (
          <button
            type="button"
            className="text-[10px] text-slate-700 inline-flex items-center gap-1 hover:opacity-90 shrink-0"
            onClick={onRequestUnlock}
            title={lock.reason}
          >
            <Unlock className="h-3.5 w-3.5" />
            Request unlock
          </button>
        ) : member ? (
          <button
            type="button"
            className="text-[10px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 shrink-0"
            onClick={onClear}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-2">
        {member ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">{member.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{member.handle || member.email}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <MemberStatusPill status={member.status} />
                <RoleChip roleId={member.roleId} />
                {lock ? <LockPill lock={lock} /> : null}
                {av ? (
                  <AvailabilityPill
                    state={av.state}
                    title={av.state === "Busy" ? "Busy (calendar conflict)" : av.state === "Unknown" ? "Unknown availability" : "Available"}
                    onClick={onOpenAvailability}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600">Unassigned</div>
        )}
      </div>
    </div>
  );
}

function CrewMultiSlotCard({
  title,
  icon,
  memberIds,
  members,
  calendarByMember,
  session,
  showAvailability,
  onOpenAvailability,
  locks,
  emptyText,
  onRemove,
  max,
  onRequestUnlock
}: {
  title: string;
  icon: React.ReactNode;
  memberIds: string[];
  members: Member[];
  calendarByMember: AvailabilityByMember;
  session: Session;
  showAvailability: boolean;
  onOpenAvailability: (id: string) => void;
  locks?: Record<string, SoftLock>;
  emptyText: string;
  onRemove: (id: string) => void;
  max: number;
  onRequestUnlock: (id: string) => void;
}) {
  const list = memberIds.map((id) => getMember(members, id)).filter(Boolean) as Member[];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold inline-flex items-center gap-2">
          <span className="text-slate-700">{icon}</span>
          {title}
        </div>
        <div className="text-[10px] text-slate-500">
          {list.length}/{max}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {list.length === 0 ? (
          <div className="text-[11px] text-slate-600">{emptyText}</div>
        ) : (
          list.map((m) => {
            const lock = locks?.[m.id];
            const av = showAvailability ? availabilityForMemberInSession(session, calendarByMember[m.id]) : null;
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-slate-200" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{m.handle || m.email}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <MemberStatusPill status={m.status} />
                      <RoleChip roleId={m.roleId} />
                      {lock ? <LockPill lock={lock} /> : null}
                      {av ? (
                        <AvailabilityPill
                          state={av.state}
                          title={av.state === "Busy" ? "Busy (calendar conflict)" : av.state === "Unknown" ? "Unknown availability" : "Available"}
                          onClick={() => onOpenAvailability(m.id)}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                {lock ? (
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center dark:text-slate-300"
                    onClick={() => onRequestUnlock(m.id)}
                    title="Request unlock"
                  >
                    <Unlock className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center dark:text-slate-300"
                    onClick={() => onRemove(m.id)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------- Session permissions blocks ------------------------- */

function SessionPermBlock({
  title,
  crewRole,
  memberId,
  members,
  perms,
  locks,
  readOnly,
  onChange
}: {
  title: string;
  crewRole: CrewRole;
  memberId: string | null;
  members: Member[];
  perms: Record<string, PermissionSet>;
  locks?: Record<string, SoftLock>;
  readOnly?: boolean;
  onChange: (memberId: string, action: SessionAction, value: boolean) => void;
}) {
  if (!memberId) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-sm font-semibold dark:text-slate-100">{title}</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">No {crewRole.toLowerCase()} assigned.</div>
      </div>
    );
  }

  const m = getMember(members, memberId);
  if (!m) return null;

  return (
    <SessionPermCard
      title={title}
      crewRole={crewRole}
      member={m}
      perm={perms[memberId] || defaultPermsForCrewRole(crewRole)}
      lock={locks?.[memberId]}
      readOnly={!!readOnly}
      onChange={(action, value) => onChange(memberId, action, value)}
    />
  );
}

function SessionPermListBlock({
  title,
  crewRole,
  memberIds,
  members,
  perms,
  locks,
  readOnly,
  onChange
}: {
  title: string;
  crewRole: CrewRole;
  memberIds: string[];
  members: Member[];
  perms: Record<string, PermissionSet>;
  locks?: Record<string, SoftLock>;
  readOnly?: boolean;
  onChange: (memberId: string, action: SessionAction, value: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="text-sm font-semibold dark:text-slate-100">{title}</div>
      <div className="mt-2 space-y-2">
        {memberIds.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">No {crewRole.toLowerCase()}s assigned.</div>
        ) : (
          memberIds
            .map((id) => getMember(members, id))
            .filter(Boolean)
            .map((m) => (
              <SessionPermCard
                key={m!.id}
                title={m!.name}
                crewRole={crewRole}
                member={m!}
                perm={perms[m!.id] || defaultPermsForCrewRole(crewRole)}
                lock={locks?.[m!.id]}
                readOnly={!!readOnly}
                onChange={(action, value) => onChange(m!.id, action, value)}
                compact
              />
            ))
        )}
      </div>
    </div>
  );
}

function SessionPermCard({
  title,
  crewRole,
  member,
  perm,
  lock,
  readOnly,
  onChange,
  compact
}: {
  // `key` is a React-only attribute (not passed as a prop).
  // Added here to keep TS happy in environments where JSX IntrinsicAttributes aren't available.
  key?: string;
  title: string;
  crewRole: CrewRole;
  member: Member;
  perm: PermissionSet;
  lock?: SoftLock;
  readOnly?: boolean;
  onChange: (action: SessionAction, value: boolean) => void;
  compact?: boolean;
}) {
  const allowed = allowedActionsForCrewRole(crewRole);
  const actions = ACTIONS_BY_CREW_ROLE[crewRole];

  return (
    <div className={cx("rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3", compact ? "" : "")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate dark:text-slate-100">{title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {crewRole} · {member.tzLabel}
          </div>
          {lock ? (
            <div className="mt-1">
              <LockPill lock={lock} />
            </div>
          ) : null}
          {readOnly ? (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only: you don't have permission to edit session perms.</div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {actions.map((a) => {
          const meta = ACTION_META.find((x) => x.key === a);
          const isAllowed = allowed.has(a);
          const checked = !!perm[a];
          const disabled = !!lock || !isAllowed || !!readOnly;

          return (
            <div key={a} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
                  {meta?.label || a}
                  {meta?.sensitive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] border bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                      Sensitive
                    </span>
                  ) : null}
                  {!isAllowed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                      Not allowed
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{meta?.hint || ""}</div>
              </div>

              <TinySwitch
                checked={checked && isAllowed}
                disabled={disabled}
                onChange={(v) => {
                  if (!isAllowed || disabled) return;
                  onChange(a, v);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
