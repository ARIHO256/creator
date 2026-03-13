import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  Info,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";

/**
 * Changelog (Previewable)
 * Route: /support/changelog
 * Core:
 * - Product updates
 * - New features
 * Super premium:
 * - Targeted updates by role
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function daysAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 99999;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "orange" | "danger" | "slate" }) {
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

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
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

function Chip({ active, onClick, children, tone = "green" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: "green" | "orange" }) {
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

type ToastTone = "default" | "success" | "warning" | "danger";

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};

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
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
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

type UpdateType = "Feature" | "Improvement" | "Fix" | "Security";

type Role =
  | "All"
  | "Seller"
  | "Provider"
  | "Creator"
  | "Buyer"
  | "Support"
  | "Admin"
  | "Finance"
  | "Ops";

type ChangelogItem = {
  id: string;
  at: string;
  version: string;
  product: string;
  type: UpdateType;
  title: string;
  summary: string;
  details: string[];
  roles: Role[];
  tags: string[];
  impact: "Low" | "Medium" | "High";
  breaking?: boolean;
  actionsRequired?: string[];
};

function typeTone(t: UpdateType): "green" | "orange" | "danger" | "slate" {
  if (t === "Feature") return "green";
  if (t === "Improvement") return "slate";
  if (t === "Fix") return "orange";
  return "danger";
}

function impactTone(i: ChangelogItem["impact"]): "green" | "orange" | "danger" | "slate" {
  if (i === "High") return "danger";
  if (i === "Medium") return "orange";
  return "green";
}

function buildChangelog(): ChangelogItem[] {
  const now = Date.now();
  const agoH = (h: number) => new Date(now - h * 3600_000).toISOString();
  const agoD = (d: number) => new Date(now - d * 86_400_000).toISOString();

  return [
    {
      id: "CLG-1008",
      at: agoH(5),
      version: "v2.14.0",
      product: "SupplierHub",
      type: "Feature",
      title: "Support: Changelog page added",
      summary: "A new changelog with search, filters, and role targeting.",
      details: [
        "Route: /support/changelog",
        "Search by keyword, product, and version",
        "Premium: targeted updates by role with ‘For you’ highlights",
      ],
      roles: ["Support", "Seller", "Provider"],
      tags: ["Support", "UI"],
      impact: "Low",
      breaking: false,
    },
    {
      id: "CLG-1007",
      at: agoD(2),
      version: "v2.13.2",
      product: "MyLiveDealz",
      type: "Improvement",
      title: "Creator Studio: faster load time",
      summary: "Reduced initial load time by caching layout assets.",
      details: [
        "Improved client-side caching for studio shell",
        "Reduced UI jank when switching sections",
        "Premium: studio pages can keep state on navigation",
      ],
      roles: ["Creator", "Support"],
      tags: ["Performance", "Creator"],
      impact: "Medium",
      breaking: false,
    },
    {
      id: "CLG-1006",
      at: agoD(5),
      version: "v2.13.0",
      product: "EVzone Pay",
      type: "Security",
      title: "Added stronger session checks",
      summary: "Security hardening for sensitive actions.",
      details: [
        "Re-auth required for payout method edits",
        "Improved device session tracking signals",
        "Premium: suspicious login prompts and audit entry points",
      ],
      roles: ["Finance", "Admin", "Support"],
      tags: ["Security", "Finance"],
      impact: "High",
      breaking: false,
      actionsRequired: ["Enable 2FA for staff accounts", "Review payout permissions for teams"],
    },
    {
      id: "CLG-1005",
      at: agoD(8),
      version: "v2.12.4",
      product: "Wholesale",
      type: "Fix",
      title: "RFQ: fixed draft totals edge case",
      summary: "Resolved rounding issues for subtotal lines.",
      details: [
        "Subtotal row now matches line totals",
        "Improved validations for numeric inputs",
        "Premium: explainable scoring panel now persists between tabs",
      ],
      roles: ["Seller", "Ops", "Support"],
      tags: ["Wholesale", "RFQ"],
      impact: "Medium",
      breaking: false,
    },
    {
      id: "CLG-1004",
      at: agoD(12),
      version: "v2.12.0",
      product: "Marketplace",
      type: "Feature",
      title: "Listings: per-item drawer editing",
      summary: "Merged list, detail, and edit into a faster workflow.",
      details: [
        "Per-item detail drawer",
        "Per-item edit drawer with autosave feel",
        "Premium: versions and rollback snapshot",
      ],
      roles: ["Seller", "Ops"],
      tags: ["Listings", "UX"],
      impact: "High",
      breaking: false,
    },
    {
      id: "CLG-1003",
      at: agoD(18),
      version: "v2.11.3",
      product: "SupplierHub",
      type: "Improvement",
      title: "Global command palette",
      summary: "Search routes, run actions, open saved views.",
      details: [
        "Ctrl/Cmd + K opens command palette",
        "Grouped results by domain",
        "Premium: saved views and favorites",
      ],
      roles: ["Seller", "Provider", "Support", "Admin"],
      tags: ["Navigation", "Productivity"],
      impact: "Medium",
      breaking: false,
    },
  ];
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function SupportChangelogPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [items, setItems] = useState<ChangelogItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;

    void sellerBackendApi
      .getHelpSupportContent()
      .then((payload) => {
        if (!active) return;
        const updates = Array.isArray((payload as { updates?: unknown[] }).updates)
          ? ((payload as { updates?: Array<Record<string, unknown>> }).updates ?? [])
          : [];
        const mapped = updates.map((entry) => {
          const meta = ((entry.metadata ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? meta.id ?? Math.random().toString(16).slice(2)),
            at: String(entry.updatedAt ?? entry.createdAt ?? new Date().toISOString()),
            version: String(meta.version ?? "Latest"),
            product: String(meta.product ?? "Seller App"),
            type: String(meta.type ?? "Improvement") as UpdateType,
            title: String(entry.title ?? "Product update"),
            summary: String(entry.body ?? meta.summary ?? ""),
            details: Array.isArray(meta.details) ? meta.details.map((item) => String(item)) : [],
            roles: Array.isArray(meta.roles) ? meta.roles.map((item) => String(item) as Role) : ["Seller"],
            tags: Array.isArray(meta.tags) ? meta.tags.map((item) => String(item)) : [],
            impact: String(meta.impact ?? "Medium") as "Low" | "Medium" | "High",
            breaking: Boolean(meta.breaking),
            actionsRequired: Array.isArray(meta.actionsRequired)
              ? meta.actionsRequired.map((item) => String(item))
              : [],
          } satisfies ChangelogItem;
        });
        setItems(mapped);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, boolean>>({});

  const [role, setRole] = useState<Role>("All");
  const [product, setProduct] = useState<string>("All");
  const [type, setType] = useState<UpdateType | "All">("All");
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "All">("30d");
  const [q, setQ] = useState<string>("");
  const [sort, setSort] = useState<"Newest" | "Oldest">("Newest");

  const products = useMemo(() => ["All", ...uniq(items.map((x) => x.product)).sort()], [items]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { All: items.length, Feature: 0, Improvement: 0, Fix: 0, Security: 0 };
    items.forEach((x) => (base[x.type] += 1));
    return base;
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const maxDays = range === "All" ? Infinity : range === "7d" ? 7 : range === "30d" ? 30 : 90;

    let list = [...items]
      .filter((x) => daysAgo(x.at) <= maxDays)
      .filter((x) => (product === "All" ? true : x.product === product))
      .filter((x) => (type === "All" ? true : x.type === type))
      .filter((x) => (role === "All" ? true : x.roles.includes(role)))
      .filter((x) => {
        if (!query) return true;
        const hay = [
          x.id,
          x.version,
          x.product,
          x.type,
          x.title,
          x.summary,
          (x.details || []).join(" "),
          (x.tags || []).join(" "),
          (x.roles || []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });

    list.sort((a, b) => (sort === "Newest" ? new Date(b.at).getTime() - new Date(a.at).getTime() : new Date(a.at).getTime() - new Date(b.at).getTime()));

    return list;
  }, [items, q, product, type, role, range, sort]);

  const roleHighlights = useMemo(() => {
    if (role === "All") return null;
    const recent = items
      .filter((x) => x.roles.includes(role))
      .filter((x) => daysAgo(x.at) <= 30)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const actions = uniq(recent.flatMap((x) => x.actionsRequired || [])).slice(0, 4);
    const top = recent.slice(0, 3);

    return {
      count30d: recent.length,
      top,
      actions,
    };
  }, [role, items]);

  useEffect(() => {
    if (!loaded || items.length > 0) return;
    setItems([]);
  }, [items.length, loaded]);

  const shareBase = useMemo(() => {
    // demo base link
    return "https://evzone.example/support/changelog";
  }, []);

  const subscribePrefsRef = useRef({ email: true, inApp: true, whatsapp: false });

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Changelog</div>
                <Badge tone="slate">/support/changelog</Badge>
                <Badge tone="slate">Support</Badge>
                <Badge tone={role === "All" ? "slate" : "orange"}>{role === "All" ? "Core" : "Super premium"}</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Product updates, new features, fixes and security notes. Premium: updates targeted by role.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${shareBase}?role=${encodeURIComponent(role)}&product=${encodeURIComponent(product)}&type=${encodeURIComponent(type)}&range=${encodeURIComponent(range)}`;
                  safeCopy(url);
                  pushToast({ title: "Link copied", message: "Shareable view link copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <LinkIcon className="h-4 w-4" />
                Share link
              </button>

              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Export",
                    message: "Wire export to PDF/CSV.",
                    tone: "default",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: "Preferences",
                    message: "Wire notification preferences and delivery channels.",
                    tone: "default",
                  })
                }
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Super premium - role highlights */}
        {role !== "All" && roleHighlights ? (
          <div className="mb-3 grid gap-3 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">For {role}</div>
                    <Badge tone="orange">Targeted</Badge>
                    <span className="ml-auto"><Badge tone="slate">Last 30 days: {roleHighlights.count30d}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Your role focused view prioritizes relevant changes and actions.</div>

                  <div className="mt-4 grid gap-2 md:grid-cols-3">
                    {roleHighlights.top.map((x) => (
                      <button
                        key={x.id}
                        type="button"
                        onClick={() => {
                          setExpanded((s) => ({ ...s, [x.id]: true }));
                          pushToast({ title: "Opened update", message: x.title, tone: "success" });
                        }}
                        className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", x.type === "Security" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black text-slate-900 line-clamp-2">{x.title}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge tone="slate">{x.product}</Badge>
                              <Badge tone={typeTone(x.type)}>{x.type}</Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {roleHighlights.actions.length ? (
                    <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-orange-700" />
                        <div className="text-sm font-black text-orange-900">Actions required</div>
                        <span className="ml-auto"><Badge tone="orange">{roleHighlights.actions.length}</Badge></span>
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                        {roleHighlights.actions.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Role updates subscription</div>
                <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Choose how to receive updates for {role}.</div>

              <div className="mt-4 grid gap-2">
                {[
                  { k: "email", label: "Email", icon: Mail },
                  { k: "inApp", label: "In app", icon: Bell },
                  { k: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                ].map((c) => {
                  const Icon = c.icon;
                  const checked = (subscribePrefsRef.current as any)[c.k];
                  return (
                    <button
                      key={c.k}
                      type="button"
                      onClick={() => {
                        (subscribePrefsRef.current as any)[c.k] = !checked;
                        pushToast({
                          title: "Preference updated",
                          message: `${c.label} is now ${!checked ? "enabled" : "disabled"}.`,
                          tone: "success",
                        });
                      }}
                      className={cx(
                        "flex items-center gap-3 rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        checked ? "border-emerald-200" : "border-slate-200/70"
                      )}
                    >
                      <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{c.label}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Delivery channel</div>
                      </div>
                      <div className={cx("grid h-9 w-9 place-items-center rounded-2xl border", checked ? "border-emerald-200 bg-white dark:bg-slate-900" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
                        {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Subscribed", message: `You will receive ${role} updates.`, tone: "success" })}
                className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                Save subscription
              </button>
            </GlassCard>
          </div>
        ) : null}

        {/* Filters */}
        <div className="grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search updates, versions, tags"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Type</div>
                  <div className="relative ml-auto">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {(["All", "Feature", "Improvement", "Fix", "Security"] as const).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Tag className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Product</div>
                  <div className="relative ml-auto">
                    <select
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {products.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {( ["All", "Seller", "Provider", "Creator", "Buyer", "Support", "Admin", "Finance", "Ops"] as Role[] ).map((r) => (
                  <Chip key={r} active={role === r} onClick={() => setRole(r)} tone={r === "All" ? "green" : "orange"}>
                    {r}
                  </Chip>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {( ["7d", "30d", "90d", "All"] as const ).map((r) => (
                  <Chip key={r} active={range === r} onClick={() => setRange(r)}>
                    {r}
                  </Chip>
                ))}

                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                  >
                    {(["Newest", "Oldest"] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setRole("All");
                    setProduct("All");
                    setType("All");
                    setRange("30d");
                    setSort("Newest");
                    pushToast({ title: "Filters cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Summary</div>
              <span className="ml-auto"><Badge tone="slate">{filtered.length} shown</Badge></span>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-xs font-extrabold text-slate-600">Features</div>
                <Badge tone="green">{counts.Feature}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-xs font-extrabold text-slate-600">Improvements</div>
                <Badge tone="slate">{counts.Improvement}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-xs font-extrabold text-slate-600">Fixes</div>
                <Badge tone="orange">{counts.Fix}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                <div className="text-xs font-extrabold text-slate-600">Security</div>
                <Badge tone="danger">{counts.Security}</Badge>
              </div>
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">Premium: subscribe per role and export filtered release notes.</div>
          </GlassCard>
        </div>

        {/* List */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Release notes</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Open an item to view details</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((it) => {
                const open = !!expanded[it.id];
                const isRead = !!read[it.id];
                const link = `${shareBase}#${it.id}`;

                return (
                  <div key={it.id} className={cx("px-4 py-4", open ? "bg-emerald-50/50" : "bg-white dark:bg-slate-900/50")}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", it.type === "Security" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700")}>
                        {it.type === "Security" ? <ShieldCheck className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{it.title}</div>
                          {isRead ? <Badge tone="green">Read</Badge> : <Badge tone="orange">New</Badge>}
                          {it.breaking ? <Badge tone="danger">Breaking</Badge> : null}
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(it.at)}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{it.product}</Badge>
                          <Badge tone={typeTone(it.type)}>{it.type}</Badge>
                          <Badge tone={impactTone(it.impact)}>Impact {it.impact}</Badge>
                          <Badge tone="slate">{it.version}</Badge>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-slate-700">{it.summary}</div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {(it.tags || []).slice(0, 4).map((t) => (
                            <Badge key={t} tone="slate">{t}</Badge>
                          ))}
                          {(it.roles || []).slice(0, 4).map((r) => (
                            <Badge key={r} tone={r === role && role !== "All" ? "orange" : "slate"}>{r}</Badge>
                          ))}

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(link);
                                pushToast({ title: "Copied", message: "Update link copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <LinkIcon className="h-4 w-4" />
                              Copy link
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRead((s) => ({ ...s, [it.id]: true }));
                                pushToast({ title: "Marked as read", message: it.id, tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Check className="h-4 w-4" />
                              Read
                            </button>

                            <button
                              type="button"
                              onClick={() => setExpanded((s) => ({ ...s, [it.id]: !open }))}
                              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                              aria-label={open ? "Collapse" : "Expand"}
                            >
                              <ChevronDown className={cx("h-4 w-4 transition", open && "rotate-180")} />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {open ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                                <div className="flex items-center gap-2">
                                  <Info className="h-4 w-4 text-slate-700" />
                                  <div className="text-sm font-black text-slate-900">Details</div>
                                  <span className="ml-auto"><Badge tone="slate">{it.id}</Badge></span>
                                </div>

                                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-700">
                                  {(it.details || []).map((d) => (
                                    <li key={d}>{d}</li>
                                  ))}
                                </ul>

                                {(it.actionsRequired || []).length ? (
                                  <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                                    <div className="flex items-center gap-2">
                                      <AlertMini />
                                      <div className="text-sm font-black text-orange-900">Actions required</div>
                                    </div>
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                                      {(it.actionsRequired || []).map((a) => (
                                        <li key={a}>{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      safeCopy(JSON.stringify(it, null, 2));
                                      pushToast({ title: "Copied", message: "JSON copied.", tone: "success" });
                                    }}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                  >
                                    <Copy className="h-4 w-4" />
                                    Copy JSON
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      pushToast({
                                        title: "Feedback",
                                        message: "Wire feedback to a support ticket.",
                                        tone: "default",
                                      })
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Send feedback
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpanded((s) => ({ ...s, [it.id]: false }));
                                      pushToast({ title: "Collapsed", message: it.title, tone: "default" });
                                    }}
                                    className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                    style={{ background: TOKENS.orange }}
                                  >
                                    <X className="h-4 w-4" />
                                    Close
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Search className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No results</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search text.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setQ("");
                            setRole("All");
                            setProduct("All");
                            setType("All");
                            setRange("30d");
                            setSort("Newest");
                            pushToast({ title: "Filters cleared", tone: "default" });
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Check className="h-4 w-4" />
                          Clear filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Quick tools</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Support friendly actions</div>
                </div>
                <Badge tone="slate">Ops</Badge>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Open Support Center", message: "Wire to /support.", tone: "default" })}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <User className="h-4 w-4 text-slate-700" />
                    </span>
                    Support Center
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const unread = items.filter((x) => !read[x.id]).length;
                    pushToast({ title: "Unread updates", message: `${unread} item(s) not marked as read.`, tone: unread ? "warning" : "success" });
                  }}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <Bell className="h-4 w-4 text-slate-700" />
                    </span>
                    Unread summary
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </button>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium tip</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Set role to get a targeted view and subscribe to only relevant updates.</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Report a missing note</div>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">If something changed and it is not here, create a support note for release tracking.</div>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Ticket drafted", message: "Wire ticket creation.", tone: "success" })}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Create ticket
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function AlertMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.2c.5 0 1 .27 1.25.72l7.2 12.5c.5.87-.13 1.98-1.13 1.98H2.68c-1 0-1.63-1.1-1.13-1.98l7.2-12.5c.26-.45.75-.72 1.25-.72Z"
        fill="#F77F00"
        opacity="0.22"
      />
      <path d="M10 6v5" stroke="#B45309" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 14.6h.01" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
