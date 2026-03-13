import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierCrewManagerPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint provided: "Crew Manager (Updated).tsx"
 *
 * Mirror-first preserved:
 * - Sticky top bar layout, copy, spacing, and premium rounded-card pattern
 * - Left column: Live sessions list + Team roster
 * - Right column: Active session detail + conflict callout + crew assignment cards
 * - Session-level permissions (per-session overrides)
 * - Availability modal (privacy-aware) + request update
 * - Invite crew modal (team vs guest co-host)
 * - Conflict modal + conflict override warning + reschedule modal
 * - Audit hooks panel + copy JSON
 *
 * Supplier adaptations (minimal + required):
 * - Team = Supplier team (seller/provider operations)
 * - Guest invites are oriented to *Creators* (guest co-hosts)
 * - Copy/notes updated to supplier tone and supplier policy assumptions
 * - Still aligned with Roles & Permissions (base roles + statuses + policy locks)
 *
 * Notes:
 * - Dependency-free: replaces lucide-react icons with lightweight emoji icon stubs for preview stability.
 * - Wire this to your API + router in your Vite project.
 */

const ORANGE = "#f77f00";

/* ------------------------- Icon stubs (replace with your icon system) ------------------------- */

const Icon = ({ className = "", children, title }) => (
  <span className={className} title={title} aria-hidden="true">
    {children}
  </span>
);

const AlertTriangle = (p) => <Icon {...p}>⚠️</Icon>;
const BadgeCheck = (p) => <Icon {...p}>✅</Icon>;
const CalendarClock = (p) => <Icon {...p}>🗓️</Icon>;
const Check = (p) => <Icon {...p}>✓</Icon>;
const ChevronDown = (p) => <Icon {...p}>▾</Icon>;
const ChevronRight = (p) => <Icon {...p}>›</Icon>;
const ClipboardCopy = (p) => <Icon {...p}>📋</Icon>;
const Copy = (p) => <Icon {...p}>⧉</Icon>;
const Crown = (p) => <Icon {...p}>👑</Icon>;
const KeyRound = (p) => <Icon {...p}>🔑</Icon>;
const Lock = (p) => <Icon {...p}>🔒</Icon>;
const Mail = (p) => <Icon {...p}>✉️</Icon>;
const Search = (p) => <Icon {...p}>🔎</Icon>;
const ShieldCheck = (p) => <Icon {...p}>🛡️</Icon>;
const SlidersHorizontal = (p) => <Icon {...p}>🎛️</Icon>;
const Unlock = (p) => <Icon {...p}>🔓</Icon>;
const UserPlus = (p) => <Icon {...p}>➕</Icon>;
const Users = (p) => <Icon {...p}>👥</Icon>;
const Video = (p) => <Icon {...p}>🎥</Icon>;
const X = (p) => <Icon {...p}>✕</Icon>;

/* ------------------------- Utils ------------------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function nowLabel() {
  return new Date().toLocaleString();
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getMember(members, id) {
  if (!id) return null;
  return members.find((m) => m.id === id) || null;
}

function formatInOffset(isoUtc, offsetHours) {
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

function getRange(session) {
  const start = new Date(session.startISO).getTime();
  const end = start + session.durationMin * 60 * 1000;
  return { start, end };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function statusPillCls(status) {
  if (status === "Live") return "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300";
  if (status === "Scheduled") return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
  if (status === "Replay") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
  return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
}

function memberStatusPillCls(status) {
  if (status === "Active") return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
  if (status === "Invited") return "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300";
  if (status === "External") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
  if (status === "Suspended") return "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300";
  return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300";
}

function hasCapability(member, crewRole) {
  // Premium idea:
  // - Workspace roleId comes from Roles & Permissions.
  // - Capability rules can be more complex (capabilities matrix). This is a mock.
  if (!member) return false;
  if (crewRole === "Host") return ["owner", "manager", "host"].includes(member.roleId);
  if (crewRole === "Producer") return ["owner", "manager", "producer"].includes(member.roleId);
  if (crewRole === "Moderator") return ["owner", "manager", "moderator"].includes(member.roleId);
  if (crewRole === "Co-host") return ["owner", "manager", "cohost", "external"].includes(member.roleId);
  return false;
}

function canAssignToCrewRole(member, crewRole) {
  // - Active team members can be assigned to Host/Producer/Moderator.
  // - Co-host supports Active + External + Invited (pre-staffing) depending on policy.
  if (!member) return false;
  if (crewRole === "Co-host") return ["Active", "External", "Invited"].includes(member.status) && hasCapability(member, crewRole);
  return member.status === "Active" && hasCapability(member, crewRole);
}

function getEventRange(ev) {
  return { start: new Date(ev.startISO).getTime(), end: new Date(ev.endISO).getTime() };
}

function availabilityConflictsForSession(session, calendar) {
  if (!calendar || !calendar.connected) return [];
  const { start, end } = getRange(session);
  return (calendar.events || []).filter((ev) => {
    const r = getEventRange(ev);
    return overlaps(start, end, r.start, r.end);
  });
}

function availabilityForMemberInSession(session, calendar) {
  if (!calendar || !calendar.connected) return { state: "Unknown", conflicts: [] };
  const conflicts = availabilityConflictsForSession(session, calendar);
  if (conflicts.length) return { state: "Busy", conflicts };
  return { state: "Available", conflicts: [] };
}

function availabilityPillCls(state) {
  if (state === "Available") return "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
  if (state === "Busy") return "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300";
  return "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300";
}

/* ------------------------- Session permissions ------------------------- */

const SESSION_ACTIONS = [
  { id: "chat.mute", label: "Mute chat" },
  { id: "chat.timeout", label: "Timeout user" },
  { id: "chat.delete", label: "Delete message" },
  { id: "studio.switch_scenes", label: "Switch scenes" },
  { id: "dealz.pin", label: "Pin dealz" },
  { id: "host.kick", label: "Kick host" }
];

function allowedActionsForCrewRole(crewRole) {
  // Guardrail: Moderators should never be allowed to kick host.
  if (crewRole === "Host") return SESSION_ACTIONS.map((a) => a.id);
  if (crewRole === "Producer") return ["chat.mute", "chat.timeout", "chat.delete", "studio.switch_scenes", "dealz.pin"];
  if (crewRole === "Moderator") return ["chat.mute", "chat.timeout", "chat.delete"];
  if (crewRole === "Co-host") return ["dealz.pin", "chat.mute"]; // supplier policy example
  return [];
}

function defaultPermsForCrewRole(crewRole) {
  const allowed = new Set(allowedActionsForCrewRole(crewRole));
  const perms = {};
  SESSION_ACTIONS.forEach((a) => {
    perms[a.id] = allowed.has(a.id);
  });
  return perms;
}

function buildInitialSessionPerms(assignmentsBySession) {
  const out = {};
  Object.entries(assignmentsBySession).forEach(([sid, asg]) => {
    const hosts = {};
    if (asg.hostId) hosts[asg.hostId] = defaultPermsForCrewRole("Host");

    const producers = {};
    if (asg.producerId) producers[asg.producerId] = defaultPermsForCrewRole("Producer");

    const moderators = {};
    (asg.moderatorIds || []).forEach((mid) => {
      moderators[mid] = defaultPermsForCrewRole("Moderator");
    });

    const cohosts = {};
    (asg.cohostIds || []).forEach((cid) => {
      cohosts[cid] = defaultPermsForCrewRole("Co-host");
    });

    out[sid] = { hosts, producers, moderators, cohosts };
  });
  return out;
}

/* ------------------------- Toast ------------------------- */

function useToasts() {
  const [toasts, setToasts] = useState([]);

  const push = (message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  return { toasts, push };
}

function ToastArea({ toasts }) {
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
              : t.tone === "success"
                ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

async function copyToClipboard(text, push) {
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

function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

function ModalShell({ open, title, children, onClose }) {
  useScrollLock(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold dark:text-slate-100">{title}</div>
          <button
            className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center justify-center dark:text-slate-300"
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

function StatusPill({ status }) {
  return <span className={cx("px-2.5 py-1 rounded-full text-xs border", statusPillCls(status))}>{status}</span>;
}

function MemberStatusPill({ status, title }) {
  return (
    <span className={cx("px-2.5 py-1 rounded-full text-xs border", memberStatusPillCls(status))} title={title}>
      {status}
    </span>
  );
}

function AvailabilityPill({ state, onClick, title }) {
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

function LockPill({ lock }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 inline-flex items-center gap-1"
      title={lock?.reason}
    >
      <Lock className="h-3.5 w-3.5" />
      {lock?.label}
    </span>
  );
}

function RoleChip({ roleId }) {
  const map = {
    owner: "Owner",
    manager: "Manager",
    host: "Host",
    producer: "Producer",
    moderator: "Moderator",
    cohost: "Co-host",
    external: "External"
  };
  return (
    <span className="px-2.5 py-1 rounded-full text-xs border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
      {map[roleId] || roleId}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-3 py-2 rounded-2xl text-sm font-semibold text-white shadow-sm transition",
        disabled ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed" : "bg-[#f77f00] hover:bg-[#e26f00]",
        className
      )}
    >
      {children}
    </button>
  );
}

function SoftButton({ children, onClick, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition inline-flex items-center gap-2",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className
      )}
    >
      {children}
    </button>
  );
}

function TinySwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cx(
        "relative w-12 h-7 rounded-full border transition",
        checked ? "bg-emerald-500 border-emerald-500" : "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600",
        disabled ? "opacity-60 cursor-not-allowed" : ""
      )}
      aria-checked={checked}
      role="switch"
    >
      <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white dark:bg-slate-900 transition", checked ? "left-5" : "left-1")} />
    </button>
  );
}

/* ------------------------- Main page ------------------------- */

export default function SupplierCrewManagerPage() {
  const { toasts, push } = useToasts();
  const navigate = useNavigate();
  const currentUser = "Supplier Owner";
  const currentUserRoleId = "owner";

  // Replace with your RBAC (from Roles & Permissions)
  const viewerPerms = {
    "crew.manage_assignments": true,
    "crew.override_conflicts": true,
    "crew.manage_session_permissions": true,
    "availability.view_team": true,
    "availability.view_details": true,
    "availability.request_update": true,
    "suppliers.invite_guest_cohost": true
  };

  const [sessions, setSessions] = useState(() => [
    {
      id: "S-1001",
      title: "BBS — Flash Dealz Live",
      supplierName: "BBS",
      campaign: "Flash Dealz",
      status: "Scheduled",
      startISO: "2026-01-27T15:30:00.000Z",
      durationMin: 60,
      cohostSlots: 2
    },
    {
      id: "S-1002",
      title: "Tech Friday Mega",
      supplierName: "EVzone",
      campaign: "Tech Friday",
      status: "Live",
      startISO: "2026-01-27T16:00:00.000Z",
      durationMin: 75,
      cohostSlots: 2
    },
    {
      id: "S-1003",
      title: "Beauty Drop — Replay",
      supplierName: "GlowCo",
      campaign: "Beauty Drop",
      status: "Replay",
      startISO: "2026-01-26T16:00:00.000Z",
      durationMin: 45,
      cohostSlots: 1
    }
  ]);

  const [members, setMembers] = useState(() => [
    {
      id: "P-me",
      name: "Ronald Isabirye",
      email: "owner@supplierhub.com",
      handle: "@ronald",
      roleId: "owner",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-host-1",
      name: "Jade Host",
      email: "host@supplierhub.com",
      handle: "@jade",
      roleId: "host",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-prod-1",
      name: "Doreen K.",
      email: "producer@supplierhub.com",
      handle: "@doreen",
      roleId: "producer",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-prod-2",
      name: "Kelvin M.",
      email: "ops.producer@supplierhub.com",
      handle: "@kelvin",
      roleId: "producer",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-mod-1",
      name: "Sarah A.",
      email: "moderator@supplierhub.com",
      handle: "@sarah",
      roleId: "moderator",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-mod-2",
      name: "Aisha N.",
      email: "mod2@supplierhub.com",
      handle: "@aisha",
      roleId: "moderator",
      status: "Active",
      tzLabel: "WAT (+1)",
      tzOffsetHours: 1
    },
    {
      id: "P-mod-3",
      name: "Chris P.",
      email: "mod3@supplierhub.com",
      handle: "@chris",
      roleId: "moderator",
      status: "Suspended",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-co-1",
      name: "Amina S.",
      email: "cohost@supplierhub.com",
      handle: "@amina",
      roleId: "cohost",
      status: "Active",
      tzLabel: "EAT (+3)",
      tzOffsetHours: 3
    },
    {
      id: "P-co-2",
      name: "Li Wei (guest creator)",
      email: "liwei@creator.com",
      handle: "@liwei",
      roleId: "external",
      status: "External",
      tzLabel: "SGT (+8)",
      tzOffsetHours: 8
    }
  ]);

  const [availabilityByMember, setAvailabilityByMember] = useState(() => ({
    "P-me": { connected: true, privacy: "details", updatedAt: "Today", events: [] },
    "P-host-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: [{ id: "ev_h1", startISO: "2026-01-27T14:30:00.000Z", endISO: "2026-01-27T15:10:00.000Z", title: "Prep: product rundown" }]
    },
    "P-prod-1": {
      connected: true,
      privacy: "details",
      updatedAt: "Today",
      events: [{ id: "ev_p1", startISO: "2026-01-27T15:45:00.000Z", endISO: "2026-01-27T16:20:00.000Z", title: "Ops standup" }]
    },
    "P-prod-2": { connected: false, privacy: "details", updatedAt: "Not connected", events: [] },
    "P-mod-1": { connected: true, privacy: "details", updatedAt: "Today", events: [] },
    "P-mod-2": {
      connected: true,
      privacy: "busy_free",
      updatedAt: "Yesterday",
      events: [{ id: "ev_m2", startISO: "2026-01-27T15:25:00.000Z", endISO: "2026-01-27T15:50:00.000Z", title: "Busy" }]
    },
    "P-mod-3": { connected: false, privacy: "details", updatedAt: "Not connected", events: [] },
    "P-co-1": { connected: true, privacy: "details", updatedAt: "Today", events: [] },
    "P-co-2": {
      connected: true,
      privacy: "busy_free",
      updatedAt: "Today",
      events: [{ id: "ev_g1", startISO: "2026-01-27T15:20:00.000Z", endISO: "2026-01-27T15:40:00.000Z", title: "Busy" }]
    }
  }));

  const [activeSessionId, setActiveSessionId] = useState("S-1001");

  const [assignmentsBySession, setAssignmentsBySession] = useState(() => ({
    "S-1001": { hostId: "P-host-1", producerId: "P-prod-1", moderatorIds: ["P-mod-1"], cohostIds: ["P-co-2"] },
    // Intentionally conflicting: same producer overlaps S-1001
    "S-1002": { hostId: "P-me", producerId: "P-prod-1", moderatorIds: ["P-mod-1", "P-mod-2"], cohostIds: ["P-co-1"] },
    "S-1003": { hostId: "P-me", producerId: "P-prod-2", moderatorIds: ["P-mod-2"], cohostIds: [] }
  }));

  const [locksBySession] = useState(() => ({
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
          reason: "Guest creator permissions are locked to 'Pin dealz' only.",
          createdAt: "This week"
        }
      }
    }
  }));

  const [sessionPermsBySession, setSessionPermsBySession] = useState(() => buildInitialSessionPerms(assignmentsBySession));

  const [audit, setAudit] = useState(() => [
    { id: uid("a"), when: nowLabel(), who: "System", what: "Crew module opened", meta: "Supplier Crew Manager" }
  ]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("Co-host");
  const [inviteMode, setInviteMode] = useState("team"); // team | guest
  const [inviteTo, setInviteTo] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteOrg, setInviteOrg] = useState("");

  const [conflictDialog, setConflictDialog] = useState(null);
  const [conflictOverrideWarning, setConflictOverrideWarning] = useState(null);
  const [availabilityModal, setAvailabilityModal] = useState(null);

  const [rescheduleModal, setRescheduleModal] = useState(null);

  const [memberSearch, setMemberSearch] = useState("");

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const activeAssignments = assignmentsBySession[activeSession.id] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };

  const sessionLocks = locksBySession[activeSession.id] || {};
  const sessionPerms = sessionPermsBySession[activeSession.id] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };

  function addAudit(who, what, meta) {
    setAudit((prev) => [{ id: uid("aud"), when: nowLabel(), who, what, meta }, ...prev].slice(0, 40));
  }

  function requestUnlock(sessionId, lock) {
    push("Unlock requested", "success");
    addAudit(currentUser, `Unlock requested`, `${lock.label} · Session ${sessionId}`);
  }

  function ensureViewerCanEditAssignments() {
    if (!viewerPerms["crew.manage_assignments"]) {
      push("You do not have permission to edit crew", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.manage_assignments");
      return false;
    }
    return true;
  }

  function ensureViewerCanOverrideConflicts() {
    if (!viewerPerms["crew.override_conflicts"]) {
      push("Conflict override not allowed for your role", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.override_conflicts");
      return false;
    }
    return true;
  }

  function openAvailability(memberId) {
    if (!viewerPerms["availability.view_team"]) {
      push("No permission to view availability", "error");
      addAudit(currentUser, "Blocked: Missing permission", "availability.view_team");
      return;
    }
    setAvailabilityModal({ open: true, memberId });
  }

  function requestAvailabilityUpdate(memberId) {
    if (!viewerPerms["availability.request_update"]) {
      push("No permission to request availability updates", "error");
      addAudit(currentUser, "Blocked: Missing permission", "availability.request_update");
      return;
    }
    const m = getMember(members, memberId);
    push("Availability update requested", "success");
    addAudit(currentUser, "Availability update requested", `${m?.name || memberId} · Session ${activeSession.id}`);
  }

  // Conflict detection: overlaps with other sessionz OR calendar busy
  function computeAssignmentConflicts(sessionId, crewRole, candidateId) {
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return { overlappingSessions: [], calendarConflicts: [] };

    const rA = getRange(sess);

    const overlappingSessions = sessions
      .filter((s) => s.id !== sessionId && s.status !== "Replay")
      .filter((s) => {
        const asg = assignmentsBySession[s.id];
        if (!asg) return false;
        return (
          asg.hostId === candidateId ||
          asg.producerId === candidateId ||
          (asg.moderatorIds || []).includes(candidateId) ||
          (asg.cohostIds || []).includes(candidateId)
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

  function syncPermsAfterSingleAssign(sessionId, crewRole, nextMemberId) {
    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      if (crewRole === "Host") {
        const nextHosts = {};
        if (nextMemberId) nextHosts[nextMemberId] = sp.hosts[nextMemberId] || defaultPermsForCrewRole("Host");
        return { ...prev, [sessionId]: { ...sp, hosts: nextHosts } };
      }
      if (crewRole === "Producer") {
        const nextProducers = {};
        if (nextMemberId) nextProducers[nextMemberId] = sp.producers[nextMemberId] || defaultPermsForCrewRole("Producer");
        return { ...prev, [sessionId]: { ...sp, producers: nextProducers } };
      }
      return prev;
    });
  }

  function setHost(sessionId, nextHostId, opts = {}) {
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

      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Host", nextHostId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;

      if (hasConflict && !opts.force) {
        setConflictDialog({ open: true, sessionId, role: "Host", candidateId: nextHostId, overlappingSessions, calendarConflicts });
        return;
      }
    }

    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] }), hostId: nextHostId }
    }));

    syncPermsAfterSingleAssign(sessionId, "Host", nextHostId);

    const prevName = getMember(members, prevHostId)?.name || "None";
    const nextName = getMember(members, nextHostId)?.name || "None";
    push("Host updated", "success");
    addAudit(currentUser, "Host changed", `${prevName} → ${nextName} · Session ${sessionId}`);
  }

  function setProducer(sessionId, nextProducerId, opts = {}) {
    if (!ensureViewerCanEditAssignments()) return;

    const sessionLock = locksBySession[sessionId]?.producer;
    if (sessionLock) {
      push("Producer is locked (Ops). Request unlock.", "error");
      requestUnlock(sessionId, sessionLock);
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

      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Producer", nextProducerId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;

      if (hasConflict && !opts.force) {
        setConflictDialog({ open: true, sessionId, role: "Producer", candidateId: nextProducerId, overlappingSessions, calendarConflicts });
        return;
      }
    }

    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] }), producerId: nextProducerId }
    }));

    syncPermsAfterSingleAssign(sessionId, "Producer", nextProducerId);

    const prevName = getMember(members, prevProducerId)?.name || "None";
    const nextName = getMember(members, nextProducerId)?.name || "None";
    push("Producer updated", "success");
    addAudit(currentUser, "Producer changed", `${prevName} → ${nextName} · Session ${sessionId}`);
  }

  function toggleModerator(sessionId, memberId, opts = {}) {
    if (!ensureViewerCanEditAssignments()) return;

    const lock = locksBySession[sessionId]?.moderators?.[memberId];
    if (lock) {
      push("Moderator is locked (policy). Request unlock.", "error");
      requestUnlock(sessionId, lock);
      return;
    }

    const m = getMember(members, memberId);
    if (!m) return;

    if (!canAssignToCrewRole(m, "Moderator")) {
      push("Moderator must be Active and eligible.", "error");
      addAudit(currentUser, "Blocked: Moderator not eligible", `${m.name} · Session ${sessionId}`);
      return;
    }

    const current = assignmentsBySession[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
    const isAssigned = (current.moderatorIds || []).includes(memberId);

    if (!isAssigned) {
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Moderator", memberId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;
      if (hasConflict && !opts.force) {
        setConflictDialog({ open: true, sessionId, role: "Moderator", candidateId: memberId, overlappingSessions, calendarConflicts });
        return;
      }
    }

    const nextModerators = isAssigned ? current.moderatorIds.filter((x) => x !== memberId) : [...current.moderatorIds, memberId].slice(0, 4);

    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: { ...current, moderatorIds: nextModerators }
    }));

    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      const next = { ...sp.moderators };
      if (isAssigned) delete next[memberId];
      else next[memberId] = sp.moderators[memberId] || defaultPermsForCrewRole("Moderator");
      return { ...prev, [sessionId]: { ...sp, moderators: next } };
    });

    push(isAssigned ? "Moderator removed" : "Moderator added", "success");
    addAudit(currentUser, isAssigned ? "Moderator removed" : "Moderator added", `${m.name} · Session ${sessionId}`);
  }

  function toggleCohost(sessionId, memberId, opts = {}) {
    if (!ensureViewerCanEditAssignments()) return;

    const lock = locksBySession[sessionId]?.cohosts?.[memberId];
    if (lock) {
      push("Co-host is locked (policy). Request unlock.", "error");
      requestUnlock(sessionId, lock);
      return;
    }

    const m = getMember(members, memberId);
    if (!m) return;

    if (!canAssignToCrewRole(m, "Co-host")) {
      push("Co-host must be eligible.", "error");
      addAudit(currentUser, "Blocked: Co-host not eligible", `${m.name} · Session ${sessionId}`);
      return;
    }

    const current = assignmentsBySession[sessionId] || { hostId: null, producerId: null, moderatorIds: [], cohostIds: [] };
    const isAssigned = (current.cohostIds || []).includes(memberId);

    if (!isAssigned) {
      const { overlappingSessions, calendarConflicts } = computeAssignmentConflicts(sessionId, "Co-host", memberId);
      const hasConflict = overlappingSessions.length > 0 || calendarConflicts.length > 0;
      if (hasConflict && !opts.force) {
        setConflictDialog({ open: true, sessionId, role: "Co-host", candidateId: memberId, overlappingSessions, calendarConflicts });
        return;
      }

      const max = sessions.find((s) => s.id === sessionId)?.cohostSlots ?? 2;
      if ((current.cohostIds || []).length >= max) {
        push(`Co-host slots are full (${max}).`, "error");
        return;
      }
    }

    const nextCohosts = isAssigned ? current.cohostIds.filter((x) => x !== memberId) : [...current.cohostIds, memberId];

    setAssignmentsBySession((prev) => ({
      ...prev,
      [sessionId]: { ...current, cohostIds: nextCohosts }
    }));

    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      const next = { ...sp.cohosts };
      if (isAssigned) delete next[memberId];
      else next[memberId] = sp.cohosts[memberId] || defaultPermsForCrewRole("Co-host");
      return { ...prev, [sessionId]: { ...sp, cohosts: next } };
    });

    push(isAssigned ? "Co-host removed" : "Co-host added", "success");
    addAudit(currentUser, isAssigned ? "Co-host removed" : "Co-host added", `${m.name} · Session ${sessionId}`);
  }

  function setSessionPerm(sessionId, crewRole, memberId, action, value) {
    if (!viewerPerms["crew.manage_session_permissions"]) {
      push("Read-only: you cannot edit session permissions", "error");
      addAudit(currentUser, "Blocked: Missing permission", "crew.manage_session_permissions");
      return;
    }

    const lock = locksBySession[sessionId]?.permLocks?.[memberId];
    if (lock) {
      push("Permissions locked by policy for this member", "error");
      addAudit(currentUser, "Blocked: Permission locked", `${lock.label} · ${memberId}`);
      return;
    }

    // Enforce role action allow-list
    const allowed = new Set(allowedActionsForCrewRole(crewRole));
    if (!allowed.has(action)) {
      push(`Not allowed for ${crewRole}: ${action}`, "error");
      return;
    }

    setSessionPermsBySession((prev) => {
      const sp = prev[sessionId] || { hosts: {}, producers: {}, moderators: {}, cohosts: {} };
      const bucket =
        crewRole === "Host" ? "hosts" : crewRole === "Producer" ? "producers" : crewRole === "Moderator" ? "moderators" : "cohosts";

      const oldMap = sp[bucket] || {};
      const oldPerm = oldMap[memberId] || defaultPermsForCrewRole(crewRole);
      const nextPerm = { ...oldPerm, [action]: value };

      return {
        ...prev,
        [sessionId]: {
          ...sp,
          [bucket]: {
            ...oldMap,
            [memberId]: nextPerm
          }
        }
      };
    });

    push("Permission updated", "success");
    addAudit(currentUser, "Session permission changed", `${crewRole} · ${memberId} · ${action}=${value}`);
  }

  function defaultAvailabilityForNewMember(roleId) {
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

    const roleIdForInvite =
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
        name: inferredName + (inviteMode === "guest" ? " (guest creator)" : ""),
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
      inviteMode === "guest" ? "Guest creator invite sent" : "Invite sent",
      `${inferredName} · ${to} · ${inviteRole} · Session ${activeSession.id}${inviteMode === "guest" && inviteOrg.trim() ? ` · Org: ${inviteOrg.trim()}` : ""}`
    );

    setInviteOpen(false);
    setInviteTo("");
    setInviteName("");
    setInviteOrg("");
  }

  const inviteLink = useMemo(() => {
    return `https://myaccounts.evzone.com/session-invite?session=${encodeURIComponent(activeSession.id)}&role=${encodeURIComponent(inviteRole)}&type=${encodeURIComponent(inviteMode)}`;
  }, [activeSession.id, inviteRole, inviteMode]);

  const activeProducerConflicts = useMemo(() => {
    const pid = activeAssignments?.producerId;
    if (!pid) return { overlappingSessions: [], calendarConflicts: [] };
    return computeAssignmentConflicts(activeSession.id, "Producer", pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession.id, activeAssignments?.producerId, sessions, assignmentsBySession, availabilityByMember]);

  function memberAvailabilityState(memberId) {
    const cal = availabilityByMember[memberId];
    return availabilityForMemberInSession(activeSession, cal);
  }

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const hay = `${m.name} ${m.email} ${m.handle || ""} ${m.roleId} ${m.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, memberSearch]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors font-sans pb-20">
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

            {conflictDialog.overlappingSessions?.length ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Overlapping sessions</div>
                <div className="mt-2 space-y-2">
                  {conflictDialog.overlappingSessions.map((s) => (
                    <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2">
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

            {conflictDialog.calendarConflicts?.length ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-sm font-semibold dark:text-slate-100">Calendar busy</div>
                <div className="mt-2 space-y-2">
                  {conflictDialog.calendarConflicts.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.title || "Busy"}</div>
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

            <div className="text-xs text-slate-500 dark:text-slate-400 italic">Conflict resolution: reschedule the session or pick a different member.</div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <SoftButton
                onClick={() => {
                  const s = sessions.find((x) => x.id === conflictDialog.sessionId);
                  if (s) setRescheduleModal({ open: true, sessionId: s.id, startISO: s.startISO, durationMin: s.durationMin });
                  setConflictDialog(null);
                }}
              >
                <CalendarClock className="h-4 w-4" />
                Change session time
              </SoftButton>
              <PrimaryButton
                onClick={() => {
                  setConflictOverrideWarning({ ...conflictDialog, open: true });
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
              This action assigns the crew member despite the detected conflict. Ensure you have confirmed their availability.
            </div>
            <div className="flex items-center justify-end gap-2">
              <SoftButton onClick={() => setConflictOverrideWarning(null)}>Cancel</SoftButton>
              <PrimaryButton
                disabled={!viewerPerms["crew.override_conflicts"]}
                onClick={() => {
                  if (!ensureViewerCanOverrideConflicts()) return;
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
          <RescheduleModalContent
            sessions={sessions}
            value={rescheduleModal}
            onClose={() => setRescheduleModal(null)}
            onSave={(next) => {
              setSessions((prev) => prev.map((s) => (s.id === next.sessionId ? { ...s, startISO: next.startISO, durationMin: next.durationMin } : s)));
              push("Session rescheduled", "success");
              addAudit(currentUser, "Session rescheduled", `${next.sessionId} · ${next.startISO} · ${next.durationMin} min`);
              setRescheduleModal(null);
            }}
          />
        ) : null}
      </ModalShell>

      {/* Availability modal */}
      <ModalShell open={!!availabilityModal?.open} title="Team availability" onClose={() => setAvailabilityModal(null)}>
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
      <ModalShell open={inviteOpen} title="Invite crew" onClose={() => setInviteOpen(false)}>
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Team members are governed by Roles & Permissions (status, role capabilities, and policies).
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Invite type</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInviteMode("team")}
                className={cx(
                  "px-3 py-2 rounded-2xl border text-[11px] font-semibold",
                  inviteMode === "team"
                    ? "bg-amber-50/60 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                )}
              >
                Team member
              </button>
              <button
                type="button"
                onClick={() => setInviteMode("guest")}
                className={cx(
                  "px-3 py-2 rounded-2xl border text-[11px] font-semibold",
                  inviteMode === "guest"
                    ? "bg-amber-50/60 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                )}
              >
                Guest co-host (Creator)
              </button>
            </div>

            {inviteMode === "guest" ? (
              <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-2 text-[10px] text-slate-700 dark:text-slate-300">
                Recommended guest role is <span className="font-semibold">Co-host</span>. Host/Producer/Moderator are typically internal.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Role</div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] outline-none dark:text-slate-100"
            >
              <option value="Host">Host</option>
              <option value="Producer">Producer</option>
              <option value="Moderator">Moderator</option>
              <option value="Co-host">Co-host</option>
            </select>
          </div>

          {inviteMode === "guest" ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="text-[11px] font-semibold dark:text-slate-100">Creator / Agency (optional)</div>
              <input
                className="mt-2 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] outline-none dark:text-slate-100"
                placeholder="Example: Li Wei Agency"
                value={inviteOrg}
                onChange={(e) => setInviteOrg(e.target.value)}
              />
              <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Used for audit + policy labeling.</div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-[11px] font-semibold dark:text-slate-100">Invite to</div>
            <div className="mt-2 flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-white dark:bg-slate-900">
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
                className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] outline-none dark:text-slate-100"
                placeholder="Example: Sarah from Operations"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 p-2">
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
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900/85 dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 md:px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">ML</div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50">Crew Manager</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Assign Host, Producer, Moderator and Co-hosts per session. Uses Roles & Permissions status plus policy locks.
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
              <SoftButton onClick={() => navigate("/mldz/team/roles-permissions")}>
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

      <main className="w-full px-[0.55%] py-6 grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-4">
        {/* Left: sessions + roster */}
        <section className="space-y-4">
          {/* Sessions */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
            <div className="mb-4">
              <div className="text-[13px] font-semibold dark:text-slate-100">Live sessions</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Select a session to assign crew and permissions.</div>
            </div>
            <div className="space-y-3">
              {sessions.map((s) => {
                const isActive = activeSessionId === s.id;

                const asgA = assignmentsBySession[s.id];
                const assignedProducerId = asgA?.producerId;
                const assignedHostId = asgA?.hostId;

                const hostName = getMember(members, assignedHostId)?.name || "Unassigned";
                const producerName = getMember(members, assignedProducerId)?.name || "Unassigned";

                const hasOverlapConflict = sessions
                  .filter((o) => o.id !== s.id && o.status !== "Replay")
                  .some((o) => {
                    const a = assignmentsBySession[s.id];
                    const b = assignmentsBySession[o.id];
                    if (!a || !b) return false;

                    const crewA = [a.hostId, a.producerId, ...(a.moderatorIds || []), ...(a.cohostIds || [])].filter(Boolean);
                    const crewB = [b.hostId, b.producerId, ...(b.moderatorIds || []), ...(b.cohostIds || [])].filter(Boolean);
                    const shared = crewA.filter((id) => crewB.includes(id));
                    if (!shared.length) return false;

                    const rA = getRange(s);
                    const rB = getRange(o);
                    return overlaps(rA.start, rA.end, rB.start, rB.end);
                  });

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={cx(
                      "w-full text-left rounded-2xl border p-3 transition",
                      isActive
                        ? "bg-amber-50/40 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                        : "bg-white dark:bg-slate-900 border-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
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
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          <CalendarClock className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
                          {formatInOffset(s.startISO, 3)} · {s.durationMin} min · {s.supplierName}
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="text-xs text-slate-500 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 dark:text-slate-100">Host:</span> {hostName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-300">ID: {s.id}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 dark:text-slate-100">Producer:</span> {producerName}
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
                <div className="text-xs text-slate-500 dark:text-slate-300">Statuses and base roles come from Roles & Permissions.</div>
              </div>
              {/* TODO(nav): Wire this button to the dedicated advanced roster filters surface once its route is finalized.
                  Consider: open an in-page filters drawer, or navigate to the team filters page if/when introduced. */}
              <SoftButton onClick={() => push("Advanced filters")}
              >
                <Search className="h-4 w-4" />
                Filter
              </SoftButton>
            </div>

            <div className="mt-3 relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200"
                placeholder="Search members"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>

            {!viewerPerms["crew.manage_assignments"] ? (
              <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-slate-700 dark:text-slate-300">
                You can view crew, but you cannot edit assignments. Ask an Owner/Manager for access.
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {filteredMembers.map((m) => {
                const asg = assignmentsBySession[activeSession.id];
                const isHost = asg?.hostId === m.id;
                const isProducer = asg?.producerId === m.id;
                const isModerator = (asg?.moderatorIds || []).includes(m.id);
                const isCohost = (asg?.cohostIds || []).includes(m.id);

                const eligibleHost = canAssignToCrewRole(m, "Host");
                const eligibleProducer = canAssignToCrewRole(m, "Producer");
                const eligibleModerator = canAssignToCrewRole(m, "Moderator");
                const eligibleCohost = canAssignToCrewRole(m, "Co-host");

                const producerLocked = !!sessionLocks.producer;
                const hostLocked = !!sessionLocks.host;

                const memberOverlapConflict = (() => {
                  const rA = getRange(activeSession);
                  return sessions
                    .filter((s) => s.id !== activeSession.id && s.status !== "Replay")
                    .some((s) => {
                      const a = assignmentsBySession[s.id];
                      if (!a) return false;
                      const isAssigned =
                        a.hostId === m.id ||
                        a.producerId === m.id ||
                        (a.moderatorIds || []).includes(m.id) ||
                        (a.cohostIds || []).includes(m.id);
                      if (!isAssigned) return false;
                      const rB = getRange(s);
                      return overlaps(rA.start, rA.end, rB.start, rB.end);
                    });
                })();

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
                            <AvailabilityPill state={av.state} title={availabilityTitle} onClick={() => openAvailability(m.id)} />
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300 truncate">{m.email}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
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
                      {(eligibleHost || isHost) ? (
                        <button
                          type="button"
                          className={cx(
                            "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                            isHost
                              ? "text-white"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200",
                            (!eligibleHost || hostLocked || !viewerPerms["crew.manage_assignments"]) && !isHost ? "opacity-60 cursor-not-allowed" : ""
                          )}
                          style={isHost ? { background: ORANGE, borderColor: ORANGE } : undefined}
                          disabled={(!eligibleHost || hostLocked || !viewerPerms["crew.manage_assignments"]) && !isHost}
                          onClick={() => setHost(activeSession.id, isHost ? null : m.id)}
                          title={hostLocked ? "Host locked by policy" : !eligibleHost ? "Must be Active and have Host capability" : "Assign as Host"}
                        >
                          <Crown className="h-4 w-4" />
                          Host
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={cx(
                          "px-3 py-2 rounded-2xl border text-[11px] font-semibold inline-flex items-center gap-2",
                          isProducer
                            ? "text-white"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200",
                          (!eligibleProducer || producerLocked || !viewerPerms["crew.manage_assignments"]) && !isProducer
                            ? "opacity-60 cursor-not-allowed"
                            : ""
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
                          isModerator
                            ? "text-white"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200",
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
                          isCohost
                            ? "text-white"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-200",
                          (!eligibleCohost || !viewerPerms["crew.manage_assignments"]) && !isCohost ? "opacity-60 cursor-not-allowed" : ""
                        )}
                        style={isCohost ? { background: ORANGE, borderColor: ORANGE } : undefined}
                        disabled={(!eligibleCohost || !viewerPerms["crew.manage_assignments"]) && !isCohost}
                        onClick={() => toggleCohost(activeSession.id, m.id)}
                        title={!eligibleCohost ? "Co-host must be eligible" : "Toggle Co-host"}
                      >
                        <Users className="h-4 w-4" />
                        Co-host
                      </button>
                    </div>

                    {m.status !== "Active" && m.status !== "External" && m.status !== "Invited" ? (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-300">
                        This member is <span className="font-semibold">{m.status}</span> in Roles & Permissions. Cannot be assigned until re-activated.
                      </div>
                    ) : null}

                    {m.status === "Invited" ? (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-300">
                        Invite pending. You can pre-staff them as <span className="font-semibold">Co-host</span>, but they cannot join until accepted.
                      </div>
                    ) : null}

                    {producerLocked ? (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-300">
                        <Lock className="h-3.5 w-3.5 inline mr-1" />
                        Producer changes are locked by Ops for this session.
                      </div>
                    ) : null}

                    {hostLocked ? (
                      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-300">
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
                <span className="px-2.5 py-1 rounded-full text-[10px] border bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                  {activeSession.campaign}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
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
              <div className="mt-1 text-[11px] text-slate-700 dark:text-slate-300">
                {getMember(members, activeAssignments.producerId)?.name || "Producer"} may not be available.
              </div>

              {activeProducerConflicts.overlappingSessions.length ? (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">Overlapping sessions</div>
                  <div className="mt-2 space-y-2">
                    {activeProducerConflicts.overlappingSessions.map((s) => (
                      <div key={s.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold">{s.title}</div>
                          <StatusPill status={s.status} />
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">{formatInOffset(s.startISO, 3)} · Session {s.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeProducerConflicts.calendarConflicts.length ? (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">Calendar busy</div>
                  <div className="mt-2 space-y-2">
                    {activeProducerConflicts.calendarConflicts.slice(0, 3).map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold truncate">{ev.title || "Busy"}</div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] border bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                            Busy
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                          {formatInOffset(ev.startISO, 3)} → {formatInOffset(ev.endISO, 3)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300">Premium workflow: pick a backup producer, or override if confirmed.</div>
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
          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold inline-flex items-center gap-2 dark:text-slate-100">
                  <SlidersHorizontal className="h-4 w-4" />
                  Session-level permissions
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Overrides for this session only. Role rules still apply.</div>
              </div>
              {!viewerPerms["crew.manage_session_permissions"] ? (
                <span className="px-2.5 py-1 rounded-full text-xs border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">Read-only</span>
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

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-300">
              Example enforced: a Moderator can have only <span className="font-semibold">Mute chat</span> enabled. <span className="font-semibold">Kick host</span> is not allowed for Moderators.
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
                <div key={a.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.what}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{a.when}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.who} · {a.meta}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-300 inline-flex items-center gap-2">
            <ChevronDown className="h-4 w-4" />
            Tip: global access lives in Roles & Permissions. Per-session overrides and guest co-hosts live here.
          </div>
        </section>
      </main>
    </div>
  );
}

/* ------------------------- Modal content components ------------------------- */

function RescheduleModalContent({ sessions, value, onClose, onSave }) {
  const sess = sessions.find((s) => s.id === value.sessionId);
  const [startISO, setStartISO] = useState(value.startISO);
  const [durationMin, setDurationMin] = useState(value.durationMin);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
        <div className="text-sm font-semibold dark:text-slate-100">{sess?.title || "Session"}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Session {value.sessionId}</div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase text-slate-400">Start Time (ISO UTC)</label>
        <input
          className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] outline-none dark:text-slate-100"
          value={startISO}
          onChange={(e) => setStartISO(e.target.value)}
          placeholder="2026-01-27T15:30:00.000Z"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase text-slate-400">Duration (minutes)</label>
        <input
          type="number"
          className="w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] outline-none dark:text-slate-100"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value || 0))}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <SoftButton onClick={onClose}>Cancel</SoftButton>
        <PrimaryButton onClick={() => onSave({ sessionId: value.sessionId, startISO, durationMin })}>Save</PrimaryButton>
      </div>
    </div>
  );
}

function AvailabilityModalContent({ viewerPerms, member, calendar, session, onRequestUpdate }) {
  if (!member) return <div className="text-xs text-slate-600">Member not found.</div>;

  const cal = calendar || { connected: false, privacy: "busy_free", updatedAt: "-", events: [] };
  const canSeeDetails = viewerPerms["availability.view_details"] && cal.privacy === "details";
  const conflicts = availabilityConflictsForSession(session, cal);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{member.name}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{member.email}</div>
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
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Updated: {cal.updatedAt}</div>
          </div>

          <SoftButton onClick={onRequestUpdate} disabled={!viewerPerms["availability.request_update"]}>
            <Mail className="h-4 w-4" />
            Request update
          </SoftButton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-sm font-semibold">This session</div>
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {session.title} · {formatInOffset(session.startISO, member.tzOffsetHours)} · {session.durationMin} min
        </div>

        {cal.connected ? (
          conflicts.length ? (
            <div className="mt-2 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 p-2">
              <div className="text-sm font-semibold text-rose-800 dark:text-rose-300">Busy during this session</div>
              <div className="mt-1 text-xs text-rose-700 dark:text-rose-300">{conflicts.length} conflict(s) detected.</div>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 p-2">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Available</div>
              <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-300">No conflicts detected for this session.</div>
            </div>
          )
        ) : (
          <div className="mt-2 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-2">
            <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Unknown</div>
            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">Calendar not connected yet.</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold">Upcoming events</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{canSeeDetails ? "Showing event details." : "Showing busy/free only (privacy)."}</div>
          </div>
          <span className="text-[10px] text-slate-500">{member.tzLabel}</span>
        </div>

        <div className="mt-2 space-y-2">
          {cal.connected && cal.events.length ? (
            cal.events.slice(0, 6).map((ev) => (
              <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">{canSeeDetails ? ev.title : "Busy"}</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                    {canSeeDetails ? "Event" : "Busy"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">
                  {formatInOffset(ev.startISO, member.tzOffsetHours)} → {formatInOffset(ev.endISO, member.tzOffsetHours)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2 text-[11px] text-slate-600 dark:text-slate-300">
              {cal.connected ? "No events found." : "Connect calendar to see busy/free."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- Assignment cards ------------------------- */

function CrewSlotCard({ title, icon, member, lock, calendar, session, showAvailability, onOpenAvailability, onClear, onRequestUnlock }) {
  const av = member && showAvailability ? availabilityForMemberInSession(session, calendar) : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-[11px] font-semibold inline-flex items-center gap-2 min-w-0">
          <span className="text-slate-700 dark:text-slate-200 shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </div>

        {lock ? (
          <button
            type="button"
            className="text-[10px] text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 hover:opacity-90 shrink-0"
            onClick={onRequestUnlock}
            title={lock.reason}
          >
            <Unlock className="h-3.5 w-3.5" />
            Request unlock
          </button>
        ) : member ? (
          <button
            type="button"
            className="text-[10px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 shrink-0"
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
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">{member.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-300 truncate">{member.handle || member.email}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <MemberStatusPill status={member.status} />
                <RoleChip roleId={member.roleId} />
                {lock ? <LockPill lock={lock} /> : null}
                {av ? (
                  <AvailabilityPill state={av.state} title={av.state === "Busy" ? "Busy" : av.state === "Available" ? "Available" : "Unknown"} onClick={onOpenAvailability} />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 p-3 text-[11px] text-slate-500 dark:text-slate-300">
            Unassigned
          </div>
        )}
      </div>
    </div>
  );
}

function CrewMultiSlotCard({ title, icon, memberIds, members, calendarByMember, session, showAvailability, onOpenAvailability, locks, emptyText, onRemove, max, onRequestUnlock }) {
  const ids = memberIds || [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold inline-flex items-center gap-2">
          <span className="text-slate-700 dark:text-slate-200">{icon}</span>
          <span>{title}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-300">({ids.length}/{max})</span>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {ids.length ? (
          ids.map((id) => {
            const m = getMember(members, id);
            const lock = locks?.[id];
            const av = m && showAvailability ? availabilityForMemberInSession(session, calendarByMember[id]) : null;

            return (
              <div key={id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold truncate">{m?.name || id}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-300 truncate">{m?.handle || m?.email || ""}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {m ? <MemberStatusPill status={m.status} /> : null}
                      {m ? <RoleChip roleId={m.roleId} /> : null}
                      {lock ? <LockPill lock={lock} /> : null}
                      {av ? <AvailabilityPill state={av.state} onClick={() => onOpenAvailability(id)} /> : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {lock ? (
                      <button
                        type="button"
                        className="text-[10px] text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 hover:opacity-90"
                        onClick={() => onRequestUnlock(id)}
                        title={lock.reason}
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Unlock
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[10px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                        onClick={() => onRemove(id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 p-3 text-[11px] text-slate-500 dark:text-slate-300">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- Session permission blocks ------------------------- */

function SessionPermBlock({ title, crewRole, memberId, members, perms, locks, readOnly, onChange }) {
  const member = getMember(members, memberId);
  if (!memberId || !member) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="text-[11px] font-semibold dark:text-slate-100">{title}</div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">Unassigned</div>
      </div>
    );
  }

  const lock = locks?.[memberId];
  const memberPerms = perms?.[memberId] || defaultPermsForCrewRole(crewRole);

  return (
    <SessionPermCard
      title={title}
      crewRole={crewRole}
      member={member}
      lock={lock}
      perms={memberPerms}
      readOnly={readOnly || !!lock}
      onChange={(action, value) => onChange(memberId, action, value)}
    />
  );
}

function SessionPermListBlock({ title, crewRole, memberIds, members, perms, locks, readOnly, onChange }) {
  const ids = memberIds || [];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold dark:text-slate-100">{title}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-300">{ids.length} assigned</div>
      </div>

      <div className="mt-3 space-y-2">
        {ids.length ? (
          ids.map((id) => {
            const member = getMember(members, id);
            if (!member) return null;
            const lock = locks?.[id];
            const memberPerms = perms?.[id] || defaultPermsForCrewRole(crewRole);

            return (
              <SessionPermCard
                key={id}
                title={member.name}
                crewRole={crewRole}
                member={member}
                lock={lock}
                perms={memberPerms}
                readOnly={readOnly || !!lock}
                onChange={(action, value) => onChange(id, action, value)}
              />
            );
          })
        ) : (
          <div className="text-[11px] text-slate-500 dark:text-slate-300">None assigned.</div>
        )}
      </div>
    </div>
  );
}

function SessionPermCard({ title, crewRole, member, lock, perms, readOnly, onChange }) {
  const allowed = new Set(allowedActionsForCrewRole(crewRole));

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold truncate text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <RoleChip roleId={member.roleId} />
            <MemberStatusPill status={member.status} />
            <span className="px-2 py-0.5 rounded-full text-[10px] border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-extrabold">
              {crewRole}
            </span>
            {lock ? <LockPill lock={lock} /> : null}
          </div>
        </div>

        {readOnly ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
            Read-only
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SESSION_ACTIONS.map((a) => {
          const isAllowed = allowed.has(a.id);
          const checked = !!perms[a.id];
          const disabled = readOnly || !isAllowed;

          return (
            <div
              key={a.id}
              className={cx(
                "rounded-xl border p-2 flex items-center justify-between gap-2",
                isAllowed
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  : "border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/40 opacity-80"
              )}
              title={!isAllowed ? `Not allowed for ${crewRole}` : undefined}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">{a.label}</div>
                {!isAllowed ? <div className="text-[10px] text-slate-500">Policy: disabled</div> : null}
              </div>
              <TinySwitch checked={checked} onChange={(v) => onChange(a.id, v)} disabled={disabled} />
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-300">
        Permission note: per-session overrides are auditable and should respect policy locks.
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierCrewManagerPage test failed: ${msg}`);
  };

  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");
  assert(Array.isArray(SESSION_ACTIONS) && SESSION_ACTIONS.length >= 5, "session actions exist");

  console.log("✅ SupplierCrewManagerPage self-tests passed");
}
