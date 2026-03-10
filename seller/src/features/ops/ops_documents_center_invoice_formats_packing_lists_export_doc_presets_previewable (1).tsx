import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMockState } from "../../mocks";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Globe,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/**
 * Ops: Documents Center
 * Route: /ops/documents
 * Core: invoice formats, packing lists, export doc presets
 * Super premium: template versioning and team defaults
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};
type TemplateDefaults = {
  currency?: string;
  taxes?: string;
  units?: string;
  print?: string;
  format?: string;
  range?: string;
};
type TemplateVersion = { v: number; at: string; by: string; note: string };
type Template = {
  id: string;
  kind: string;
  name: string;
  scope: string;
  locale: string;
  updatedAt: string;
  owner: string;
  status: string;
  fields: string[];
  defaults: TemplateDefaults;
  versions: TemplateVersion[];
  teamDefault: boolean;
};
type EmptyStateAction = { label: string; onClick: () => void };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function Badge({ children, tone = "slate" }) {
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

function GlassCard({ children, className }) {
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

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: EmptyStateAction }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200/70 bg-white dark:bg-slate-900/70 p-6 text-center">
      <div className="text-lg font-black text-slate-900">{title}</div>
      <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
          style={{ background: TOKENS.green }}
        >
          <Plus className="h-4 w-4" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[860px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
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
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
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

function seedTemplates(): Template[] {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();

  const base = [
    {
      id: "TPL-INV-1001",
      kind: "Invoice format",
      name: "Standard Invoice (International)",
      scope: "Global",
      locale: "en-US",
      updatedAt: ago(42),
      owner: "Finance",
      status: "Active",
      fields: ["Seller", "Buyer", "Items", "Incoterms", "Bank details"],
      defaults: { currency: "USD", taxes: "Auto" },
      versions: [
        { v: 3, at: ago(42), by: "Finance", note: "Added Incoterms + bank footer" },
        { v: 2, at: ago(380), by: "Finance", note: "Updated tax labels" },
        { v: 1, at: ago(2100), by: "System", note: "Initial template" },
      ],
      teamDefault: true,
    },
    {
      id: "TPL-PACK-2001",
      kind: "Packing list",
      name: "Packing List (Warehouse)",
      scope: "Warehouse",
      locale: "en-GB",
      updatedAt: ago(90),
      owner: "Ops",
      status: "Active",
      fields: ["Order", "Boxes", "Weights", "SKU", "HS codes"],
      defaults: { units: "kg", print: "A4" },
      versions: [
        { v: 2, at: ago(90), by: "Ops", note: "Added HS codes" },
        { v: 1, at: ago(980), by: "System", note: "Initial template" },
      ],
      teamDefault: false,
    },
    {
      id: "TPL-EXP-3001",
      kind: "Export preset",
      name: "Orders Export Preset (Ops)",
      scope: "Team",
      locale: "en-US",
      updatedAt: ago(18),
      owner: "Ops Team",
      status: "Active",
      fields: ["Order ID", "Warehouse", "Status", "SLA", "Totals"],
      defaults: { format: "CSV", range: "Last 7 days" },
      versions: [
        { v: 4, at: ago(18), by: "Ops Team", note: "Added SLA column" },
        { v: 3, at: ago(220), by: "Ops Team", note: "Split warehouse fields" },
        { v: 2, at: ago(620), by: "Ops Team", note: "Added totals" },
        { v: 1, at: ago(1900), by: "System", note: "Initial preset" },
      ],
      teamDefault: true,
    },
    {
      id: "TPL-INV-1002",
      kind: "Invoice format",
      name: "VAT Invoice (EU)",
      scope: "EU",
      locale: "de-DE",
      updatedAt: ago(240),
      owner: "Finance",
      status: "Draft",
      fields: ["VAT number", "Buyer VAT", "Items", "Tax breakdown"],
      defaults: { currency: "EUR", taxes: "VAT" },
      versions: [{ v: 1, at: ago(240), by: "Finance", note: "Draft created" }],
      teamDefault: false,
    },
  ];

  return base;
}

function toneForStatus(s) {
  if (s === "Active") return "green";
  if (s === "Draft") return "slate";
  return "danger";
}

function kindTone(kind) {
  if (kind === "Invoice format") return "orange";
  if (kind === "Packing list") return "slate";
  return "green";
}

export default function OpsDocumentsCenterPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("All Templates");

  const [templates, setTemplates] = useMockState<Template[]>("ops.documents.templates", seedTemplates());

  const [q, setQ] = useState("");
  const [kind, setKind] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return templates
      .filter((t) => (kind === "All" ? true : t.kind === kind))
      .filter((t) => (status === "All" ? true : t.status === status))
      .filter((t) => {
        if (!query) return true;
        const hay = [t.id, t.kind, t.name, t.scope, t.locale, t.owner, t.status, ...(t.fields || [])].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [templates, q, kind, status]);

  const counts = useMemo(() => {
    const map = { All: templates.length };
    ["Invoice format", "Packing list", "Export preset"].forEach((k) => (map[k] = templates.filter((t) => t.kind === k).length));
    return map;
  }, [templates]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => templates.find((t) => t.id === activeId) || null, [templates, activeId]);

  const openTemplate = (id) => {
    setActiveId(id);
    setDrawerOpen(true);
  };

  const duplicateTemplate = (tpl) => {
    const copy = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: `DUP-${tpl.id}-${Math.floor(Math.random() * 9) + 1}`,
      name: `${tpl.name} (Copy)`,
      status: "Draft",
      updatedAt: new Date().toISOString(),
      teamDefault: false,
      versions: [{ v: 1, at: new Date().toISOString(), by: "You", note: "Duplicated" }],
    };
    setTemplates((s) => [copy, ...s]);
    pushToast({ title: "Duplicated", message: copy.id, tone: "success" });
  };

  const setTeamDefault = (id, on) => {
    setTemplates((s) => s.map((t) => (t.id === id ? { ...t, teamDefault: on } : t)));
    pushToast({ title: on ? "Set as team default" : "Removed team default", message: id, tone: "default" });
  };

  const createNew = (which) => {
    const id = `TPL-${which === "Invoice" ? "INV" : which === "Packing" ? "PACK" : "EXP"}-${Math.floor(4000 + Math.random() * 500)}`;
    const tpl: Template = {
      id,
      kind: which === "Invoice" ? "Invoice format" : which === "Packing" ? "Packing list" : "Export preset",
      name: which === "Invoice" ? "New Invoice Template" : which === "Packing" ? "New Packing List" : "New Export Preset",
      scope: "Team",
      locale: "en-US",
      updatedAt: new Date().toISOString(),
      owner: "You",
      status: "Draft",
      fields: [],
      defaults: {},
      versions: [{ v: 1, at: new Date().toISOString(), by: "You", note: "Created" }],
      teamDefault: false,
    };
    setTemplates((s) => [tpl, ...s]);
    setTab("All Templates");
    openTemplate(id);
    pushToast({ title: "Created", message: id, tone: "success" });
  };

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Documents Center</div>
                <Badge tone="slate">/ops/documents</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Invoice formats, packing lists, and export document presets. Premium: versioning and team defaults.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Templates refreshed (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => createNew("Invoice")}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New template
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["All Templates", "Invoice Formats", "Packing Lists", "Export Presets"].map((t) => (
              <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                {t}
              </Chip>
            ))}
            <span className="ml-auto"><Badge tone="slate">{filtered.length} shown</Badge></span>
          </div>
        </div>

        {/* Filters */}
        <GlassCard className="p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search template id, name, scope, owner"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <Select label="Type" value={kind} onChange={setKind} options={["All", "Invoice format", "Packing list", "Export preset"]} />
            </div>
            <div className="md:col-span-3">
              <Select label="Status" value={status} onChange={setStatus} options={["All", "Active", "Draft"]} />
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setKind("All");
                  setStatus("All");
                  pushToast({ title: "Filters cleared", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>

              <div className="ml-auto flex items-center gap-2">
                <Badge tone="slate">Invoice {counts["Invoice format"] || 0}</Badge>
                <Badge tone="slate">Packing {counts["Packing list"] || 0}</Badge>
                <Badge tone="slate">Presets {counts["Export preset"] || 0}</Badge>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Templates</div>
                  <Badge tone="orange">Versioned</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Open a template for version history and defaults</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1100px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Template</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Scope</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered
                    .filter((t) => {
                      if (tab === "Invoice Formats") return t.kind === "Invoice format";
                      if (tab === "Packing Lists") return t.kind === "Packing list";
                      if (tab === "Export Presets") return t.kind === "Export preset";
                      return true;
                    })
                    .map((t) => (
                      <div key={t.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{t.name}</div>
                            {t.teamDefault ? <Badge tone="green">Team default</Badge> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.id}</span>
                            <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {t.locale}</span>
                            <span className="inline-flex items-center gap-1"><History className="h-3.5 w-3.5" /> Updated {fmtTime(t.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <Badge tone={kindTone(t.kind)}>{t.kind}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <Badge tone="slate">{t.scope}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <Badge tone={toneForStatus(t.status)}>{t.status}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openTemplate(t.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                          >
                            <ChevronRight className="h-4 w-4" />
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateTemplate(t)}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                            aria-label="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState title="No templates" message="Create a template or clear filters." />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Create</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Quick entry points</div>
              </div>
              <Badge tone="slate">Core</Badge>
            </div>

            <div className="mt-4 grid gap-2">
              <ActionCard icon={FileText} title="New Invoice format" desc="Create invoice template" onClick={() => createNew("Invoice")} accent="green" />
              <ActionCard icon={BookOpen} title="New Packing list" desc="Create packing list" onClick={() => createNew("Packing")} accent="orange" />
              <ActionCard icon={Filter} title="New Export preset" desc="Create reusable export preset" onClick={() => createNew("Preset")} accent="green" />
            </div>

            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Super premium</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    <li>Template versioning with rollback</li>
                    <li>Team defaults per marketplace or warehouse</li>
                    <li>Policy checks before activation</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={active ? `${active.kind} · ${active.name}` : "Template"}
        subtitle={active ? `${active.id} · ${active.scope} · ${active.locale}` : ""}
        onClose={() => setDrawerOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6 text-sm font-semibold text-slate-600">Select a template.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700")}> 
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.name}</div>
                    <Badge tone={kindTone(active.kind)}>{active.kind}</Badge>
                    <Badge tone={toneForStatus(active.status)}>{active.status}</Badge>
                    {active.teamDefault ? <Badge tone="green">Team default</Badge> : <Badge tone="slate">Not default</Badge>}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Owner: {active.owner} · Updated {fmtTime(active.updatedAt)}</div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Fields</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(active.fields || []).length === 0 ? <Badge tone="slate">None</Badge> : null}
                        {(active.fields || []).map((f) => (
                          <Badge key={f} tone="slate">{f}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="text-[11px] font-extrabold text-slate-600">Defaults</div>
                      <div className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
                        {Object.keys(active.defaults || {}).length === 0 ? <div className="text-slate-500">No defaults set.</div> : null}
                        {Object.entries(active.defaults || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-slate-600 font-extrabold">{k}</span>
                            <span className="text-slate-800">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(JSON.stringify(active, null, 2));
                        pushToast({ title: "Copied", message: "Template JSON copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy JSON
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTemplates((s) => s.map((t) => (t.id === active.id ? { ...t, status: "Active" } : t)));
                        pushToast({ title: "Activated", message: active.id, tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Activate
                    </button>

                    <button
                      type="button"
                      onClick={() => setTeamDefault(active.id, !active.teamDefault)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold",
                        active.teamDefault ? "border-orange-200 text-orange-700" : "border-slate-200/70 text-slate-800"
                      )}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {active.teamDefault ? "Unset default" : "Set default"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTemplates((s) => s.filter((t) => t.id !== active.id));
                        setDrawerOpen(false);
                        pushToast({ title: "Deleted", message: active.id, tone: "default" });
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Version history (super premium)</div>
                <span className="ml-auto"><Badge tone="slate">{(active.versions || []).length}</Badge></span>
              </div>

              <div className="mt-3 space-y-2">
                {(active.versions || []).map((v) => (
                  <div key={v.v} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">v{v.v}</Badge>
                      <div className="text-xs font-extrabold text-slate-700">{fmtTime(v.at)}</div>
                      <span className="ml-auto"><Badge tone="slate">{v.by}</Badge></span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{v.note}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Rollback", message: `Rolled back to v${v.v} (demo).`, tone: "success" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                      >
                        <History className="h-4 w-4" />
                        Rollback
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Compare", message: "Diff view (demo).", tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                        Compare
                      </button>
                    </div>
                  </div>
                ))}
                {(active.versions || []).length === 0 ? <EmptyState title="No versions" message="Create a version by saving changes." /> : null}
              </div>
            </GlassCard>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Compliance hint</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Before activating templates, verify legal footer and tax fields for the target region.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800 outline-none"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, onClick, accent }) {
  const bg = accent === "green" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", bg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
}
