import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Info,
  Lock,
  Mail,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/**
 * Teams & Roles (Supplier)
 * Route: /settings/teams
 *
 * Goals
 * - Supplier can add unlimited custom roles.
 * - Supplier can customize permissions per role.
 * - Assign roles to members.
 * - System roles are protected.
 *
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type Tone = "green" | "orange" | "slate" | "danger" | "default";

type PermissionKey = string;

type RoleTemplateKey =
  | "OWNER"
  | "ADMIN"
  | "OPS"
  | "SALES"
  | "FINANCE"
  | "SUPPORT"
  | "VIEWER"
  | "CUSTOM";

type Role = {
  id: string;
  name: string;
  description: string;
  template: RoleTemplateKey;
  system?: boolean;
  permissions: Record<PermissionKey, boolean>;
  updatedAt: string;
};

type Member = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "Active" | "Invited" | "Suspended";
  lastActiveAt: string;
};

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
};

type PolicyState = {
  require2faForAdmins: boolean;
  requireApprovalForPayouts: boolean;
  payoutApprovalThresholdUsd: number;
  restrictSensitiveExports: boolean;
  sessionTimeoutMins: number;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function BadgePill({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children, danger }: { label: string; onClick?: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 transition hover:bg-gray-50 dark:hover:bg-slate-800",
        danger && "border-rose-200 text-rose-700 hover:bg-rose-50"
      )}
    >
      {children}
    </button>
  );
}

function SegTab({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon?: React.ElementType }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Modal({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          >
            <div className="flex w-full max-w-[720px] max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx(
        "relative inline-flex h-8 w-14 items-center rounded-xl border transition",
        on ? "border-transparent" : "border-slate-200/70 bg-white dark:bg-slate-900"
      )}
      style={on ? { backgroundColor: TOKENS.green, borderColor: TOKENS.greenDeep } : undefined}
    >
      <span
        className={cx(
          "inline-block h-6 w-7 transform rounded-lg border bg-white dark:bg-slate-900 shadow-sm transition",
          on ? "translate-x-6 border-white/70" : "translate-x-1 border-slate-200/70"
        )}
      />
    </button>
  );
}

const PERMISSION_GROUPS: Array<{
  group: string;
  desc: string;
  items: Array<{ key: PermissionKey; label: string; hint?: string; kind?: "danger" | "normal" }>;
}> = [
  {
    group: "Orders",
    desc: "Order visibility, fulfillment and dispute prevention workflows.",
    items: [
      { key: "orders.view", label: "View orders" },
      { key: "orders.edit", label: "Edit orders" },
      { key: "orders.fulfill", label: "Fulfill and ship" },
      { key: "orders.refund", label: "Refund and adjustments", kind: "danger" },
      { key: "orders.export", label: "Export orders" },
    ],
  },
  {
    group: "Listings",
    desc: "Create and manage product and service listings.",
    items: [
      { key: "listings.view", label: "View listings" },
      { key: "listings.create", label: "Create listings" },
      { key: "listings.edit", label: "Edit listings" },
      { key: "listings.publish", label: "Publish and unpublish" },
      { key: "listings.delete", label: "Delete listings", kind: "danger" },
      { key: "listings.compliance", label: "Compliance actions" },
    ],
  },
  {
    group: "Wholesale",
    desc: "RFQs, quotes, templates and B2B operations.",
    items: [
      { key: "wholesale.rfq.view", label: "View RFQs" },
      { key: "wholesale.rfq.reply", label: "Reply and negotiate" },
      { key: "wholesale.quotes.create", label: "Create quotes" },
      { key: "wholesale.quotes.send", label: "Send quotes" },
      { key: "wholesale.pricing.manage", label: "Manage price lists" },
    ],
  },
  {
    group: "Finance",
    desc: "Wallets, payouts, invoices and financial operations.",
    items: [
      { key: "finance.view", label: "View finance" },
      { key: "finance.payouts.manage", label: "Manage payout methods" },
      { key: "finance.payouts.initiate", label: "Initiate payout", kind: "danger" },
      { key: "finance.invoices.manage", label: "Manage invoices" },
      { key: "finance.reports.export", label: "Export finance reports", kind: "danger" },
    ],
  },
  {
    group: "MyLiveDealz",
    desc: "Live and Adz promo arm permissions.",
    items: [
      { key: "mldz.view", label: "Access MyLiveDealz" },
      { key: "mldz.live.manage", label: "Manage Live Sessionz" },
      { key: "mldz.adz.manage", label: "Manage Shoppable Adz" },
      { key: "mldz.deliverables.manage", label: "Manage deliverables" },
      { key: "mldz.contracts.manage", label: "Manage contracts", kind: "danger" },
    ],
  },
  {
    group: "Support & Compliance",
    desc: "Cases, disputes, regulated desks and compliance actions.",
    items: [
      { key: "support.messages", label: "Access support messages" },
      { key: "support.disputes", label: "Handle disputes" },
      { key: "support.returns", label: "Handle returns and RMAs" },
      { key: "compliance.desks", label: "Access regulatory desks" },
      { key: "compliance.holds", label: "Apply compliance holds", kind: "danger" },
    ],
  },
  {
    group: "Settings",
    desc: "Organization, users, roles, integrations and security.",
    items: [
      { key: "settings.view", label: "View settings" },
      { key: "settings.teams.manage", label: "Manage teams and roles", kind: "danger" },
      { key: "settings.integrations.manage", label: "Manage integrations" },
      { key: "settings.security.manage", label: "Manage security", kind: "danger" },
      { key: "settings.audit.view", label: "View audit log" },
    ],
  },
];

function allPermissionKeys() {
  return PERMISSION_GROUPS.flatMap((g) => g.items.map((x) => x.key));
}

function buildEmptyPermissions() {
  const map: Record<string, boolean> = {};
  allPermissionKeys().forEach((k) => (map[k] = false));
  return map;
}

function applyTemplate(tpl: RoleTemplateKey) {
  const base = buildEmptyPermissions();

  const set = (keys: string[], v = true) => {
    keys.forEach((k) => {
      if (k in base) base[k] = v;
    });
  };

  const ALL = allPermissionKeys();

  switch (tpl) {
    case "OWNER":
      set(ALL, true);
      return base;
    case "ADMIN":
      set(ALL, true);
      // Admin still cannot remove Owner in real systems. Demo: keep all.
      return base;
    case "OPS":
      set([
        "orders.view",
        "orders.edit",
        "orders.fulfill",
        "orders.export",
        "listings.view",
        "listings.edit",
        "listings.publish",
        "listings.compliance",
        "support.disputes",
        "support.returns",
        "compliance.desks",
        "settings.view",
      ]);
      return base;
    case "SALES":
      set([
        "orders.view",
        "orders.export",
        "listings.view",
        "listings.create",
        "listings.edit",
        "listings.publish",
        "mldz.view",
        "mldz.adz.manage",
        "support.messages",
        "settings.view",
      ]);
      return base;
    case "FINANCE":
      set([
        "finance.view",
        "finance.payouts.manage",
        "finance.invoices.manage",
        "finance.reports.export",
        "orders.view",
        "orders.export",
        "settings.view",
      ]);
      // Payout initiation stays off by default
      return base;
    case "SUPPORT":
      set([
        "orders.view",
        "support.messages",
        "support.disputes",
        "support.returns",
        "compliance.desks",
        "settings.view",
      ]);
      return base;
    case "VIEWER":
      set([
        "orders.view",
        "listings.view",
        "wholesale.rfq.view",
        "finance.view",
        "mldz.view",
        "support.messages",
        "settings.view",
        "settings.audit.view",
      ]);
      return base;
    default:
      return base;
  }
}

function seedRoles(): Role[] {
  const now = new Date().toISOString();
  return [
    {
      id: "role_owner",
      name: "Owner",
      description: "Full access, can manage billing, teams and security.",
      template: "OWNER",
      system: true,
      permissions: applyTemplate("OWNER"),
      updatedAt: now,
    },
    {
      id: "role_admin",
      name: "Admin",
      description: "Full access except protected ownership actions.",
      template: "ADMIN",
      system: true,
      permissions: applyTemplate("ADMIN"),
      updatedAt: now,
    },
    {
      id: "role_ops",
      name: "Operations",
      description: "Fulfillment, listings compliance, returns and disputes.",
      template: "OPS",
      system: true,
      permissions: applyTemplate("OPS"),
      updatedAt: now,
    },
    {
      id: "role_sales",
      name: "Sales",
      description: "Listings, light orders view, MyLiveDealz promotions.",
      template: "SALES",
      system: true,
      permissions: applyTemplate("SALES"),
      updatedAt: now,
    },
    {
      id: "role_finance",
      name: "Finance",
      description: "Wallets, invoices, reporting. Payout initiation optional.",
      template: "FINANCE",
      system: true,
      permissions: applyTemplate("FINANCE"),
      updatedAt: now,
    },
    {
      id: "role_viewer",
      name: "Viewer",
      description: "Read-only access across key areas.",
      template: "VIEWER",
      system: true,
      permissions: applyTemplate("VIEWER"),
      updatedAt: now,
    },
  ];
}

function seedMembers(roleIds: { owner: string; admin: string; ops: string; sales: string; finance: string; viewer: string }): Member[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
  return [
    { id: "m1", name: "Ronald Isabirye", email: "owner@supplier.com", roleId: roleIds.owner, status: "Active", lastActiveAt: ago(11) },
    { id: "m2", name: "Amina K.", email: "ops@supplier.com", roleId: roleIds.ops, status: "Active", lastActiveAt: ago(80) },
    { id: "m3", name: "Kato S.", email: "sales@supplier.com", roleId: roleIds.sales, status: "Invited", lastActiveAt: ago(999) },
    { id: "m4", name: "Sarah T.", email: "finance@supplier.com", roleId: roleIds.finance, status: "Active", lastActiveAt: ago(320) },
    { id: "m5", name: "Chen L.", email: "viewer@supplier.com", roleId: roleIds.viewer, status: "Suspended", lastActiveAt: ago(6000) },
    { id: "m6", name: "Joy A.", email: "admin@supplier.com", roleId: roleIds.admin, status: "Active", lastActiveAt: ago(35) },
  ];
}

function seedPolicies(): PolicyState {
  return {
    require2faForAdmins: true,
    requireApprovalForPayouts: true,
    payoutApprovalThresholdUsd: 500,
    restrictSensitiveExports: true,
    sessionTimeoutMins: 60,
  };
}

function roleTemplateFromBackend(role: Record<string, unknown>): RoleTemplateKey {
  const name = String(role.name ?? "").toUpperCase();
  if (name.includes("OWNER")) return "OWNER";
  if (name.includes("ADMIN")) return "ADMIN";
  if (name.includes("OPS")) return "OPS";
  if (name.includes("SALES")) return "SALES";
  if (name.includes("FINANCE")) return "FINANCE";
  if (name.includes("SUPPORT")) return "SUPPORT";
  if (name.includes("VIEWER")) return "VIEWER";
  return "CUSTOM";
}

function mapBackendRole(role: Record<string, unknown>): Role {
  return {
    id: String(role.id ?? makeId("role")),
    name: String(role.name ?? "Role"),
    description: String(role.description ?? "Custom role"),
    template: roleTemplateFromBackend(role),
    system: String(role.badge ?? "").toLowerCase() === "system",
    permissions: ((role.perms as Record<string, boolean> | undefined) ?? {}) as Record<string, boolean>,
    updatedAt: String(role.updatedAt ?? role.createdAt ?? new Date().toISOString()),
  };
}

function mapBackendMember(member: Record<string, unknown>): Member {
  const status = String(member.status ?? "active").toLowerCase();
  return {
    id: String(member.id ?? makeId("mem")),
    name: String(member.name ?? "Member"),
    email: String(member.email ?? ""),
    roleId: String(member.roleId ?? ""),
    status: status === "invited" ? "Invited" : status === "suspended" ? "Suspended" : "Active",
    lastActiveAt: String(member.updatedAt ?? member.createdAt ?? new Date().toISOString()),
  };
}

function mapBackendPolicies(payload: Record<string, unknown> | null | undefined): PolicyState {
  const base = seedPolicies();
  if (!payload) return base;
  return {
    require2faForAdmins: payload.require2FA === undefined ? base.require2faForAdmins : Boolean(payload.require2FA),
    requireApprovalForPayouts:
      payload.requireApprovalForPayouts === undefined ? base.requireApprovalForPayouts : Boolean(payload.requireApprovalForPayouts),
    payoutApprovalThresholdUsd: Number(payload.payoutApprovalThresholdUsd ?? base.payoutApprovalThresholdUsd) || 0,
    restrictSensitiveExports:
      payload.restrictSensitiveExports === undefined ? base.restrictSensitiveExports : Boolean(payload.restrictSensitiveExports),
    sessionTimeoutMins: Number(payload.sessionTimeoutMins ?? base.sessionTimeoutMins) || base.sessionTimeoutMins,
  };
}

function mapBackendAudit(event: Record<string, unknown>): AuditEvent {
  const metadata = (event.metadata as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(event.id ?? makeId("audit")),
    at: String(event.createdAt ?? new Date().toISOString()),
    actor: String(event.role ?? "Seller"),
    action: String(event.action ?? "updated"),
    detail: String(metadata.detail ?? metadata.outcome ?? ""),
  };
}

function roleTone(role: Role): Tone {
  if (role.template === "OWNER") return "green";
  if (role.template === "FINANCE") return "orange";
  if (role.system) return "slate";
  return "green";
}

function countOn(map: Record<string, boolean>, keys: string[]) {
  return keys.reduce((s, k) => s + (map[k] ? 1 : 0), 0);
}

function exportPack(roles: Role[], members: Member[], policies: PolicyState) {
  const payload = {
    exportedAt: new Date().toISOString(),
    roles,
    members,
    policies,
  };
  return JSON.stringify(payload, null, 2);
}

export default function TeamsRolesSupplierPage() {
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message?: string; tone?: Tone }>>([]);
  const pushToast = (t: Omit<(typeof toasts)[number], "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4200);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const seededRoles = useMemo(() => seedRoles(), []);
  const [roles, setRoles] = useState<Role[]>(seededRoles);

  const roleIdMap = useMemo(() => {
    const byName: Record<string, string> = {};
    roles.forEach((r) => (byName[r.template] = r.id));
    return {
      owner: byName.OWNER || "role_owner",
      admin: byName.ADMIN || "role_admin",
      ops: byName.OPS || "role_ops",
      sales: byName.SALES || "role_sales",
      finance: byName.FINANCE || "role_finance",
      viewer: byName.VIEWER || "role_viewer",
    };
  }, [roles]);

  const [members, setMembers] = useState<Member[]>(seedMembers(roleIdMap));
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [policies, setPolicies] = useState<PolicyState>(seedPolicies());
  const [loading, setLoading] = useState(true);
  const rolesRef = useRef<Role[]>(seededRoles);

  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

  const refreshAudit = async () => {
    try {
      const logs = await sellerBackendApi.getAuditLogs();
      setAudit(Array.isArray(logs) ? logs.map(mapBackendAudit) : []);
    } catch {
      // ignore audit refresh failures
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [workspace, logs] = await Promise.all([
          sellerBackendApi.getRoles(),
          sellerBackendApi.getAuditLogs(),
        ]);
        if (cancelled) return;
        setRoles(Array.isArray(workspace.roles) ? workspace.roles.map((entry) => mapBackendRole(entry as Record<string, unknown>)) : seededRoles);
        setMembers(
          Array.isArray(workspace.members)
            ? workspace.members.map((entry) => mapBackendMember(entry as Record<string, unknown>))
            : seedMembers(roleIdMap)
        );
        setPolicies(mapBackendPolicies((workspace.workspaceSecurity as Record<string, unknown> | undefined) ?? null));
        setAudit(Array.isArray(logs) ? logs.map(mapBackendAudit) : []);
      } catch {
        if (cancelled) return;
        setRoles(seededRoles);
        setMembers(seedMembers(roleIdMap));
        setPolicies(seedPolicies());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [seededRoles]);

  // Tabs
  const [tab, setTab] = useState<"Members" | "Roles" | "Policies" | "Audit">("Roles");

  // Role selection
  const [roleQuery, setRoleQuery] = useState("");
  const [activeRoleId, setActiveRoleId] = useState(() => roles[0]?.id || "role_owner");

  useEffect(() => {
    if (!roles.find((r) => r.id === activeRoleId)) setActiveRoleId(roles[0]?.id || "role_owner");
  }, [roles, activeRoleId]);

  const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId) || null, [roles, activeRoleId]);

  const rolesFiltered = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    const list = q
      ? roles.filter((r) => `${r.name} ${r.description} ${r.template}`.toLowerCase().includes(q))
      : roles;
    // Keep system roles first
    return [...list].sort((a, b) => Number(!!b.system) - Number(!!a.system));
  }, [roles, roleQuery]);

  // Permissions editor
  const [permQuery, setPermQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // expand first groups for convenience
    if (!Object.keys(expandedGroups).length) {
      const init: Record<string, boolean> = {};
      PERMISSION_GROUPS.slice(0, 3).forEach((g) => (init[g.group] = true));
      setExpandedGroups(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permGroupsFiltered = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    if (!q) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => `${it.label} ${it.key} ${it.hint ?? ""}`.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [permQuery]);

  const roleMemberCount = useMemo(() => {
    const map: Record<string, number> = {};
    members.forEach((m) => (map[m.roleId] = (map[m.roleId] || 0) + 1));
    return map;
  }, [members]);

  // Drawer: create / edit role
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false);
  const [roleWizard, setRoleWizard] = useState<{
    mode: "create" | "edit";
    template: RoleTemplateKey;
    name: string;
    description: string;
    targetRoleId?: string;
  }>({ mode: "create", template: "CUSTOM", name: "", description: "" });

  const openCreateRole = () => {
    setRoleWizard({ mode: "create", template: "CUSTOM", name: "", description: "" });
    setRoleDrawerOpen(true);
  };

  const openEditRoleMeta = (r: Role) => {
    setRoleWizard({ mode: "edit", template: r.template, name: r.name, description: r.description, targetRoleId: r.id });
    setRoleDrawerOpen(true);
  };

  const templates = useMemo(
    () =>
      [
        { key: "CUSTOM" as const, title: "Custom", desc: "Start from scratch. Choose exactly what the role can do." },
        { key: "OPS" as const, title: "Operations", desc: "Fulfillment, compliance, returns, disputes." },
        { key: "SALES" as const, title: "Sales", desc: "Listings and promotions, light orders view." },
        { key: "FINANCE" as const, title: "Finance", desc: "Wallets, invoices, reporting. Payout initiation optional." },
        { key: "SUPPORT" as const, title: "Support", desc: "Messages, disputes, returns." },
        { key: "VIEWER" as const, title: "Viewer", desc: "Read only access." },
        { key: "ADMIN" as const, title: "Admin", desc: "Full access. Use carefully." },
      ] as const,
    []
  );

  const createRole = async () => {
    const name = roleWizard.name.trim();
    if (!name) {
      pushToast({ title: "Role name required", message: "Add a name for the new role.", tone: "orange" });
      return;
    }

    const id = makeId("role");
    const perms = roleWizard.template === "CUSTOM" ? buildEmptyPermissions() : applyTemplate(roleWizard.template);

    const role: Role = {
      id,
      name,
      description: roleWizard.description.trim() || "Custom role",
      template: roleWizard.template,
      system: false,
      permissions: perms,
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await sellerBackendApi.createRole({
        id,
        name: role.name,
        badge: role.system ? "System" : "Custom",
        description: role.description,
        perms: role.permissions,
      });
      const mapped = mapBackendRole(created);
      setRoles((s) => [mapped, ...s.filter((entry) => entry.id !== mapped.id)]);
      setActiveRoleId(mapped.id);
      setRoleDrawerOpen(false);
      pushToast({ title: "Role created", message: mapped.name, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Role create failed", message: error instanceof Error ? error.message : "Unable to create role", tone: "danger" });
    }
  };

  const saveRoleMeta = async () => {
    if (!roleWizard.targetRoleId) return;
    const role = roles.find((r) => r.id === roleWizard.targetRoleId);
    if (!role) return;
    if (role.system) {
      pushToast({ title: "Protected role", message: "System roles cannot be renamed in this demo.", tone: "orange" });
      return;
    }

    const name = roleWizard.name.trim();
    if (!name) {
      pushToast({ title: "Role name required", tone: "orange" });
      return;
    }

    try {
      const updated = await sellerBackendApi.patchRole(role.id, {
        name,
        description: roleWizard.description.trim() || role.description,
      });
      const mapped = mapBackendRole(updated);
      setRoles((s) => s.map((r) => (r.id === mapped.id ? mapped : r)));
      setRoleDrawerOpen(false);
      pushToast({ title: "Role updated", message: name, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Role update failed", message: error instanceof Error ? error.message : "Unable to update role", tone: "danger" });
    }
  };

  const duplicateRole = async (r: Role) => {
    const id = makeId("role");
    const copy: Role = {
      ...JSON.parse(JSON.stringify(r)),
      id,
      name: `${r.name} (Copy)`,
      system: false,
      template: "CUSTOM",
      updatedAt: new Date().toISOString(),
    };
    try {
      const created = await sellerBackendApi.createRole({
        id,
        name: copy.name,
        badge: "Custom",
        description: copy.description,
        perms: copy.permissions,
      });
      const mapped = mapBackendRole(created);
      setRoles((s) => [mapped, ...s.filter((entry) => entry.id !== mapped.id)]);
      setActiveRoleId(mapped.id);
      pushToast({ title: "Role duplicated", message: mapped.name, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Duplicate failed", message: error instanceof Error ? error.message : "Unable to duplicate role", tone: "danger" });
    }
  };

  const deleteRole = async (r: Role) => {
    if (r.system) {
      pushToast({ title: "Protected role", message: "System roles cannot be deleted.", tone: "orange" });
      return;
    }

    const used = members.some((m) => m.roleId === r.id);
    if (used) {
      pushToast({ title: "Role in use", message: "Reassign members before deleting this role.", tone: "orange" });
      return;
    }

    try {
      await sellerBackendApi.deleteRole(r.id);
      setRoles((s) => s.filter((x) => x.id !== r.id));
      pushToast({ title: "Role deleted", message: r.name, tone: "danger" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Delete failed", message: error instanceof Error ? error.message : "Unable to delete role", tone: "danger" });
    }
  };

  const setRolePermission = async (roleId: string, key: string, value: boolean) => {
    const target = rolesRef.current.find((entry) => entry.id === roleId);
    if (!target) return;
    const next = { ...target.permissions, [key]: value };
    setRoles((s) => s.map((r) => (r.id === roleId ? { ...r, permissions: next, updatedAt: new Date().toISOString() } : r)));
    try {
      const updated = await sellerBackendApi.patchRole(roleId, { perms: next });
      const mapped = mapBackendRole(updated);
      setRoles((s) => s.map((r) => (r.id === roleId ? mapped : r)));
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Permission save failed", message: error instanceof Error ? error.message : "Unable to persist permission", tone: "danger" });
    }
  };

  const applyPreset = async (preset: "view" | "standard" | "full") => {
    if (!activeRole) return;
    if (activeRole.system && activeRole.template === "OWNER") {
      pushToast({ title: "Owner is full access", tone: "default" });
      return;
    }

    const next = { ...activeRole.permissions };
    const all = allPermissionKeys();

    if (preset === "full") {
      all.forEach((k) => (next[k] = true));
    }

    if (preset === "view") {
      all.forEach((k) => (next[k] = false));
      [
        "orders.view",
        "listings.view",
        "wholesale.rfq.view",
        "finance.view",
        "mldz.view",
        "settings.view",
        "settings.audit.view",
      ].forEach((k) => {
        if (k in next) next[k] = true;
      });
    }

    if (preset === "standard") {
      // safe standard: view + light operational edits
      all.forEach((k) => (next[k] = false));
      [
        "orders.view",
        "orders.edit",
        "orders.fulfill",
        "orders.export",
        "listings.view",
        "listings.create",
        "listings.edit",
        "listings.publish",
        "wholesale.rfq.view",
        "wholesale.rfq.reply",
        "wholesale.quotes.create",
        "mldz.view",
        "mldz.adz.manage",
        "support.messages",
        "support.disputes",
        "support.returns",
        "settings.view",
      ].forEach((k) => {
        if (k in next) next[k] = true;
      });
    }

    setRoles((s) => s.map((r) => (r.id === activeRole.id ? { ...r, permissions: next, updatedAt: new Date().toISOString() } : r)));
    try {
      const updated = await sellerBackendApi.patchRole(activeRole.id, { perms: next });
      const mapped = mapBackendRole(updated);
      setRoles((s) => s.map((r) => (r.id === mapped.id ? mapped : r)));
      pushToast({ title: "Preset applied", message: `${activeRole.name} updated`, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Preset save failed", message: error instanceof Error ? error.message : "Unable to persist preset", tone: "danger" });
    }
  };

  const setGroupAll = async (groupName: string, value: boolean) => {
    if (!activeRole) return;
    const group = PERMISSION_GROUPS.find((g) => g.group === groupName);
    if (!group) return;
    const next = { ...activeRole.permissions };
    group.items.forEach((it) => (next[it.key] = value));
    setRoles((s) => s.map((r) => (r.id === activeRole.id ? { ...r, permissions: next, updatedAt: new Date().toISOString() } : r)));
    try {
      const updated = await sellerBackendApi.patchRole(activeRole.id, { perms: next });
      const mapped = mapBackendRole(updated);
      setRoles((s) => s.map((r) => (r.id === mapped.id ? mapped : r)));
      pushToast({ title: value ? "Enabled group" : "Disabled group", message: groupName, tone: "default" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Group save failed", message: error instanceof Error ? error.message : "Unable to persist group", tone: "danger" });
    }
  };

  // Members
  const [memberQuery, setMemberQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteDraft, setInviteDraft] = useState<{ name: string; email: string; roleId: string }>({ name: "", email: "", roleId: roleIdMap.ops });

  useEffect(() => {
    // keep roleId default stable
    setInviteDraft((s) => ({ ...s, roleId: roles.find((r) => r.id === s.roleId) ? s.roleId : (roles[0]?.id || roleIdMap.ops) }));
  }, [roles]);

  const membersFiltered = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const list = q
      ? members.filter((m) => `${m.name} ${m.email} ${m.status}`.toLowerCase().includes(q))
      : members;
    return [...list].sort((a, b) => a.status.localeCompare(b.status));
  }, [members, memberQuery]);

  const setMemberRole = async (memberId: string, roleId: string) => {
    const r = roles.find((x) => x.id === roleId);
    const m = members.find((x) => x.id === memberId);
    setMembers((s) => s.map((entry) => (entry.id === memberId ? { ...entry, roleId, lastActiveAt: new Date().toISOString() } : entry)));
    try {
      const updated = await sellerBackendApi.patchRoleMember(memberId, { roleId });
      const mapped = mapBackendMember(updated);
      setMembers((s) => s.map((entry) => (entry.id === memberId ? mapped : entry)));
      pushToast({ title: "Role updated", message: `${m?.name ?? "Member"} -> ${r?.name ?? "Role"}`, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Member update failed", message: error instanceof Error ? error.message : "Unable to update member", tone: "danger" });
    }
  };

  const inviteMember = async () => {
    const name = inviteDraft.name.trim();
    const email = inviteDraft.email.trim();
    if (!name || !email) {
      pushToast({ title: "Name and email required", tone: "orange" });
      return;
    }
    if (!email.includes("@")) {
      pushToast({ title: "Invalid email", message: "Add a valid email address.", tone: "orange" });
      return;
    }

    const role = roles.find((r) => r.id === inviteDraft.roleId);
    const member: Member = {
      id: makeId("mem"),
      name,
      email,
      roleId: inviteDraft.roleId,
      status: "Invited",
      lastActiveAt: new Date().toISOString(),
    };

    try {
      const created = await sellerBackendApi.createRoleInvite({
        id: member.id,
        name,
        email,
        roleId: inviteDraft.roleId,
      });
      const mapped = mapBackendMember(created);
      setMembers((s) => [mapped, ...s.filter((entry) => entry.id !== mapped.id)]);
      setInviteOpen(false);
      setInviteDraft({ name: "", email: "", roleId: inviteDraft.roleId });
      pushToast({ title: "Invite sent", message: `${email}`, tone: "green" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Invite failed", message: error instanceof Error ? error.message : "Unable to send invite", tone: "danger" });
    }
  };

  const removeMember = async (id: string) => {
    const m = members.find((x) => x.id === id);
    try {
      await sellerBackendApi.deleteRoleMember(id);
      setMembers((s) => s.filter((x) => x.id !== id));
      pushToast({ title: "Member removed", message: m?.email ?? "", tone: "danger" });
      void refreshAudit();
    } catch (error) {
      pushToast({ title: "Remove failed", message: error instanceof Error ? error.message : "Unable to remove member", tone: "danger" });
    }
  };

  const exportJson = () => {
    const payload = exportPack(roles, members, policies);
    safeCopy(payload);
    pushToast({ title: "Export copied", message: "JSON copied to clipboard.", tone: "green" });
  };

  const importJson = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.roles || !parsed?.members) throw new Error("Missing roles/members");
      setRoles(parsed.roles as Role[]);
      setMembers(parsed.members as Member[]);
      if (parsed.policies) setPolicies(parsed.policies as PolicyState);
      pushToast({ title: "Imported", message: "Roles and members updated.", tone: "green" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e ?? "Invalid JSON");
      pushToast({ title: "Import failed", message, tone: "danger" });
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // UI summary
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === "Active").length;
  const invitedMembers = members.filter((m) => m.status === "Invited").length;
  const customRoles = roles.filter((r) => !r.system).length;

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Teams & Roles</div>
                <BadgePill tone="slate">/settings/teams</BadgePill>
                <BadgePill tone="slate">Supplier</BadgePill>
                <BadgePill tone="orange">Custom roles</BadgePill>
                {loading ? <BadgePill tone="slate">Loading</BadgePill> : <BadgePill tone="green">Backend</BadgePill>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Create roles, customize permissions, and assign them to your supplier team.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <UserPlus className="h-4 w-4" />
                Invite member
              </button>
              <button
                type="button"
                onClick={openCreateRole}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add role
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SegTab label="Roles" active={tab === "Roles"} onClick={() => setTab("Roles")} icon={ShieldCheck} />
            <SegTab label="Members" active={tab === "Members"} onClick={() => setTab("Members")} icon={Users} />
            <SegTab label="Policies" active={tab === "Policies"} onClick={() => setTab("Policies")} icon={Settings} />
            <SegTab label="Audit" active={tab === "Audit"} onClick={() => setTab("Audit")} icon={BadgeCheck} />

            <span className="ml-auto flex flex-wrap items-center gap-2">
              <BadgePill tone="slate">Members {totalMembers}</BadgePill>
              <BadgePill tone="green">Active {activeMembers}</BadgePill>
              <BadgePill tone="orange">Invited {invitedMembers}</BadgePill>
              <BadgePill tone={customRoles ? "orange" : "slate"}>Custom roles {customRoles}</BadgePill>
            </span>
          </div>
        </div>

        {/* Content */}
        {tab === "Roles" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Role list */}
            <GlassCard className="overflow-hidden lg:col-span-4">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Roles</div>
                  <span className="ml-auto"><BadgePill tone="slate">{rolesFiltered.length}</BadgePill></span>
                </div>
                <div className="mt-3 relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="Search roles"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-200/70">
                {rolesFiltered.map((r) => {
                  const active = r.id === activeRoleId;
                  const keys = allPermissionKeys();
                  const enabled = countOn(r.permissions, keys);
                  const total = keys.length || 1;
                  const pct = Math.round((enabled / total) * 100);
                  const membersCount = roleMemberCount[r.id] || 0;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRoleId(r.id)}
                      className={cx("w-full text-left px-4 py-4 transition", active ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800")}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", active ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700")}
                          style={active ? { boxShadow: "0 18px 46px rgba(3,205,140,0.18)" } : undefined}
                        >
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{r.name}</div>
                            {r.system ? <BadgePill tone="slate">System</BadgePill> : <BadgePill tone="orange">Custom</BadgePill>}
                            <BadgePill tone={roleTone(r)}>{r.template}</BadgePill>
                            <span className="ml-auto"><BadgePill tone="slate">{membersCount} member(s)</BadgePill></span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{r.description}</div>
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600">
                              <span>Permissions</span>
                              <span className="text-slate-500">{pct}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-slate-100">
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="mt-2 text-[11px] font-semibold text-slate-500">Updated {fmtTime(r.updatedAt)}</div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateRole(r);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditRoleMeta(r);
                              }}
                              className={cx(
                                "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold",
                                r.system ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-emerald-200 text-emerald-800"
                              )}
                              disabled={r.system}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRole(r);
                              }}
                              className={cx(
                                "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold",
                                r.system ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"
                              )}
                              disabled={r.system}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {rolesFiltered.length === 0 ? (
                  <div className="p-6">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5">
                      <div className="text-lg font-black text-slate-900">No roles found</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing your search.</div>
                      <button
                        type="button"
                        onClick={() => setRoleQuery("")}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            {/* Permission editor */}
            <div className="lg:col-span-8">
              <GlassCard className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-black text-slate-900">Permission Builder</div>
                      <span className="ml-auto"><BadgePill tone="slate">Supplier safe</BadgePill></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Select a role on the left, then toggle permissions below.</div>
                  </div>
                </div>

                {!activeRole ? (
                  <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">
                    Select a role to edit permissions.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900">{activeRole.name}</div>
                        {activeRole.system ? <BadgePill tone="slate">System</BadgePill> : <BadgePill tone="orange">Custom</BadgePill>}
                        <BadgePill tone={roleTone(activeRole)}>{activeRole.template}</BadgePill>
                        <span className="ml-auto"><BadgePill tone="slate">{roleMemberCount[activeRole.id] || 0} member(s)</BadgePill></span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{activeRole.description}</div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset("view")}
                          className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          View only preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("standard")}
                          className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          Standard preset
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("full")}
                          className="rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          Full access preset
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              safeCopy(JSON.stringify(activeRole, null, 2));
                              pushToast({ title: "Role JSON copied", message: activeRole.name, tone: "green" });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                            Copy role JSON
                          </button>
                        </div>
                      </div>

                      {activeRole.system ? (
                        <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-3">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Info className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">System role note</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                You can change system role permissions in this demo, but in production you may protect some actions.
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-center">
                      <div className="relative md:col-span-7">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={permQuery}
                          onChange={(e) => setPermQuery(e.target.value)}
                          placeholder="Search permissions"
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                      <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const payload = exportPack(roles, members, policies);
                            safeCopy(payload);
                            pushToast({ title: "Backup copied", message: "Roles + members + policies", tone: "green" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Save className="h-4 w-4" />
                          Copy backup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPermQuery("");
                            pushToast({ title: "Filters cleared", tone: "default" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Filter className="h-4 w-4" />
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {permGroupsFiltered.map((g) => {
                        const groupKeys = g.items.map((x) => x.key);
                        const enabled = countOn(activeRole.permissions, groupKeys);
                        const total = groupKeys.length || 1;
                        const expanded = expandedGroups[g.group] ?? false;

                        return (
                          <div key={g.group} className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                            <button
                              type="button"
                              onClick={() => setExpandedGroups((s) => ({ ...s, [g.group]: !expanded }))}
                              className="w-full border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-black text-slate-900">{g.group}</div>
                                <BadgePill tone={enabled === total ? "green" : enabled > 0 ? "orange" : "slate"}>{enabled}/{total}</BadgePill>
                                <span className="ml-auto flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGroupAll(g.group, true);
                                    }}
                                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"
                                  >
                                    Enable all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGroupAll(g.group, false);
                                    }}
                                    className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                                  >
                                    Disable all
                                  </button>
                                  <ChevronDown className={cx("h-4 w-4 text-slate-400 transition", expanded && "rotate-180")} />
                                </span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{g.desc}</div>
                            </button>

                            <AnimatePresence initial={false}>
                              {expanded ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4">
                                    <div className="grid gap-2 md:grid-cols-2">
                                      {g.items.map((it) => {
                                        const on = !!activeRole.permissions[it.key];
                                        const danger = it.kind === "danger";
                                        return (
                                          <div key={it.key} className={cx("rounded-3xl border bg-white dark:bg-slate-900 p-4", danger ? "border-rose-200" : "border-slate-200/70")}>
                                            <div className="flex items-start gap-3">
                                              <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", danger ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700")}>
                                                {danger ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="text-sm font-black text-slate-900">{it.label}</div>
                                                <div className="mt-1 text-[11px] font-semibold text-slate-500">{it.key}</div>
                                                {danger ? (
                                                  <div className="mt-2 text-[11px] font-semibold text-rose-700">Sensitive action</div>
                                                ) : null}
                                              </div>
                                              <Toggle
                                                on={on}
                                                onChange={(v) => {
                                                  void setRolePermission(activeRole.id, it.key, v);
                                                }}
                                                label={`${it.label} toggle`}
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {permGroupsFiltered.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                          <div className="text-lg font-black text-slate-900">No permissions found</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing the permission search.</div>
                          <button
                            type="button"
                            onClick={() => setPermQuery("")}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <X className="h-4 w-4" />
                            Clear
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </GlassCard>
            </div>
          </div>
        ) : null}

        {tab === "Members" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-12">
              <div className="grid gap-3 md:grid-cols-12 md:items-center">
                <div className="relative md:col-span-6">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search members"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
                <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberQuery("");
                      pushToast({ title: "Filters cleared", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Filter className="h-4 w-4" />
                    Clear
                  </button>
                  <BadgePill tone="slate">Showing {membersFiltered.length}</BadgePill>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Member</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Last active</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {membersFiltered.map((m) => {
                    const role = roles.find((r) => r.id === m.roleId);
                    return (
                      <div key={m.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                        <div className="col-span-3">
                          <div className="text-sm font-black text-slate-900">{m.name}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{m.id}</div>
                        </div>

                        <div className="col-span-3 flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <div className="truncate">{m.email}</div>
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <select
                              value={m.roleId}
                              onChange={(e) => setMemberRole(m.id, e.target.value)}
                              className="h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          {role?.system ? <div className="mt-1"><BadgePill tone="slate">System role</BadgePill></div> : null}
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <BadgePill tone={m.status === "Active" ? "green" : m.status === "Invited" ? "orange" : "danger"}>{m.status}</BadgePill>
                        </div>

                        <div className="col-span-1 flex items-center text-[11px] font-semibold text-slate-500">{fmtTime(m.lastActiveAt)}</div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <IconButton
                            label="Copy email"
                            onClick={() => {
                              safeCopy(m.email);
                              pushToast({ title: "Copied", message: "Email copied.", tone: "green" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Remove member" danger onClick={() => removeMember(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}

                  {membersFiltered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="text-lg font-black text-slate-900">No members</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Invite your first team member.</div>
                        <button
                          type="button"
                          onClick={() => setInviteOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <UserPlus className="h-4 w-4" />
                          Invite member
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Best practice</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Use custom roles to separate Finance, Operations, and Support. Avoid giving full access to everyone.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Policies" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Access policies</div>
                <span className="ml-auto"><BadgePill tone="slate">Org</BadgePill></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">These policies apply across roles and sensitive actions.</div>

              <div className="mt-4 grid gap-3">
                <PolicyRow
                  title="Require 2FA for admins"
                  desc="Admins and roles with security permissions must enable 2FA."
                  on={policies.require2faForAdmins}
                  onChange={(v) => {
                    setPolicies((s) => ({ ...s, require2faForAdmins: v }));
                  }}
                />

                <PolicyRow
                  title="Require approval for payouts"
                  desc="Payout initiation requires a second approver above a threshold."
                  on={policies.requireApprovalForPayouts}
                  onChange={(v) => {
                    setPolicies((s) => ({ ...s, requireApprovalForPayouts: v }));
                  }}
                  right={
                    <div className="flex items-center gap-2">
                      <BadgePill tone="slate">USD</BadgePill>
                      <input
                        value={String(policies.payoutApprovalThresholdUsd)}
                        onChange={(e) => setPolicies((s) => ({ ...s, payoutApprovalThresholdUsd: Number(e.target.value) || 0 }))}
                        className="h-10 w-[120px] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-extrabold text-slate-800"
                      />
                    </div>
                  }
                />

                <PolicyRow
                  title="Restrict sensitive exports"
                  desc="Block exports for roles without explicit export permissions."
                  on={policies.restrictSensitiveExports}
                  onChange={(v) => {
                    setPolicies((s) => ({ ...s, restrictSensitiveExports: v }));
                  }}
                />

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Session timeout</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Auto sign-out after inactivity.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={String(policies.sessionTimeoutMins)}
                        onChange={(e) => setPolicies((s) => ({ ...s, sessionTimeoutMins: Number(e.target.value) || 0 }))}
                        className="h-10 w-[120px] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-xs font-extrabold text-slate-800"
                      />
                      <BadgePill tone="slate">mins</BadgePill>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sellerBackendApi.patchRolesSecurity({
                        require2FA: policies.require2faForAdmins,
                        requireApprovalForPayouts: policies.requireApprovalForPayouts,
                        payoutApprovalThresholdUsd: policies.payoutApprovalThresholdUsd,
                        restrictSensitiveExports: policies.restrictSensitiveExports,
                        sessionTimeoutMins: policies.sessionTimeoutMins,
                      });
                      pushToast({ title: "Policies saved", message: "Applied to org.", tone: "green" });
                      void refreshAudit();
                    } catch (error) {
                      pushToast({ title: "Policies save failed", message: error instanceof Error ? error.message : "Unable to save policies", tone: "danger" });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Save className="h-4 w-4" />
                  Save policies
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPolicies(seedPolicies());
                    pushToast({ title: "Reset", message: "Policies reset to defaults.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <RefreshIcon />
                  Reset
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Security note</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Policies work best with least-privilege roles.</div>
                </div>
                <BadgePill tone="slate">Guide</BadgePill>
              </div>
              <div className="mt-4 space-y-2">
                {["Use separate roles for payouts and refunds", "Use Viewer roles for analysts", "Use Support roles for disputes and RMAs", "Avoid giving Settings permissions broadly"].map((t) => (
                  <div key={t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-xs font-semibold text-slate-700">
                    {t}
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Audit" ? (
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Audit</div>
                <span className="ml-auto"><BadgePill tone="slate">{audit.length}</BadgePill></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Tracks role and member changes (demo).</div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Time</div>
                  <div className="col-span-2">Actor</div>
                  <div className="col-span-3">Action</div>
                  <div className="col-span-4">Detail</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {audit.slice(0, 60).map((e) => (
                    <div key={e.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-3 text-slate-500">{fmtTime(e.at)}</div>
                      <div className="col-span-2 font-extrabold text-slate-800">{e.actor}</div>
                      <div className="col-span-3">{e.action}</div>
                      <div className="col-span-4 text-slate-500 truncate">{e.detail ?? ""}</div>
                    </div>
                  ))}
                  {audit.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="text-lg font-black text-slate-900">No audit events yet</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Create a role, change a permission, or invite a member to generate events.</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAudit([]);
                    pushToast({ title: "Audit cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear audit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const payload = exportPack(roles, members, policies);
                    safeCopy(payload);
                    pushToast({ title: "Backup copied", message: "JSON copied.", tone: "green" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy backup
                </button>
              </div>
            </div>
          </GlassCard>
        ) : null}
      </div>

      {/* Invite member drawer */}
      <Drawer
        open={inviteOpen}
        title="Invite a team member"
        subtitle="Send an invite and assign a role."
        onClose={() => setInviteOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-sm font-black text-slate-900">Invite details</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">In production: email verification and invite tokens.</div>

            <div className="mt-4 grid gap-3">
              <Field label="Full name">
                <input
                  value={inviteDraft.name}
                  onChange={(e) => setInviteDraft((s) => ({ ...s, name: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  placeholder="Jane Doe"
                />
              </Field>

              <Field label="Email">
                <input
                  value={inviteDraft.email}
                  onChange={(e) => setInviteDraft((s) => ({ ...s, email: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  placeholder="jane@company.com"
                />
              </Field>

              <Field label="Role">
                <div className="relative">
                  <select
                    value={inviteDraft.roleId}
                    onChange={(e) => setInviteDraft((s) => ({ ...s, roleId: e.target.value }))}
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
            </div>
          </div>

          <button
            type="button"
            onClick={inviteMember}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Send invite
          </button>

          <button
            type="button"
            onClick={() => setInviteOpen(false)}
            className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800"
          >
            Cancel
          </button>
        </div>
      </Drawer>

      {/* Role create/edit drawer */}
      <Drawer
        open={roleDrawerOpen}
        title={roleWizard.mode === "create" ? "Create role" : "Edit role"}
        subtitle={roleWizard.mode === "create" ? "Pick a template or start custom." : "Update role name and description."}
        onClose={() => setRoleDrawerOpen(false)}
      >
        <div className="space-y-3">
          {roleWizard.mode === "create" ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Role template</div>
                <span className="ml-auto"><BadgePill tone="slate">Start point</BadgePill></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Templates help you create consistent roles faster.</div>

              <div className="mt-3 grid gap-2">
                {templates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setRoleWizard((s) => ({ ...s, template: t.key }))}
                    className={cx(
                      "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      roleWizard.template === t.key ? "border-emerald-200" : "border-slate-200/70"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", roleWizard.template === t.key ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{t.title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{t.desc}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-sm font-black text-slate-900">Role details</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Name and description are shown in the role list.</div>

            <div className="mt-4 grid gap-3">
              <Field label="Role name">
                <input
                  value={roleWizard.name}
                  onChange={(e) => setRoleWizard((s) => ({ ...s, name: e.target.value }))}
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  placeholder="e.g., Warehouse Supervisor"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={roleWizard.description}
                  onChange={(e) => setRoleWizard((s) => ({ ...s, description: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                  placeholder="What can this role do?"
                />
              </Field>
            </div>
          </div>

          {roleWizard.mode === "create" ? (
            <button
              type="button"
              onClick={createRole}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Create role
            </button>
          ) : (
            <button
              type="button"
              onClick={saveRoleMeta}
              className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              Save changes
            </button>
          )}

          <button
            type="button"
            onClick={() => setRoleDrawerOpen(false)}
            className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800"
          >
            Cancel
          </button>
        </div>
      </Drawer>

      {/* Import modal */}
      <Modal open={importOpen} title="Import roles" subtitle="Paste an export JSON to restore roles and members." onClose={() => setImportOpen(false)}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-sm font-black text-slate-900">Paste JSON</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Tip: Export first so you always have a backup.</div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
              placeholder='{ "roles": [...], "members": [...], "policies": {...} }'
            />
          </div>

          <button
            type="button"
            onClick={() => {
              importJson(importText);
              setImportText("");
              setImportOpen(false);
            }}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Import
          </button>

          <button
            type="button"
            onClick={() => setImportOpen(false)}
            className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Toasts */}
      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PolicyRow({
  title,
  desc,
  on,
  onChange,
  right,
}: {
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <Toggle on={on} onChange={onChange} label={title} />
        </div>
      </div>
    </div>
  );
}

function RefreshIcon() {
  return <ChevronRight className="h-4 w-4 rotate-180" />;
}

function ToastCenter({
  toasts,
  dismiss,
}: {
  toasts: Array<{ id: string; title: string; message?: string; tone?: Tone }>;
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[95] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "green" && "border-emerald-200",
              t.tone === "orange" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "slate") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "green" && "bg-emerald-50 text-emerald-700",
                  t.tone === "orange" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "slate") && "bg-slate-100 text-slate-700"
                )}
              >
                <Check className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
