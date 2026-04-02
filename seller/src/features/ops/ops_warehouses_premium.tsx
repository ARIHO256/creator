import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Info,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

/**
 * Ops: Warehouses (Premium)
 * Route: /ops/warehouses
 * Core: add and manage warehouses, routing rules
 * Super premium: buyer preferred warehouse routing and constraints
 *
 * Notes:
 * - Standalone preview page (drop into your router later).
 * - No em dashes used.
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

type Warehouse = {
  id: string;
  code: string;
  name: string;
  country: string;
  city: string;
  active: boolean;
  cutOffLocal: string;
  processingDays: number;
  capabilities: { ship: boolean; pickup: boolean; returns: boolean };
  constraints: { hazmat: boolean; batteries: boolean };
  serviceCountries: string[];
  blockedCountries: string[];
  updatedAt: string;
};

type RoutingRule = {
  id: string;
  enabled: boolean;
  priority: number;
  name: string;
  match: { country?: string; category?: string };
  action: { warehouseId: string };
  note: string;
};

type BuyerPref = {
  id: string;
  name: string;
  preferredWarehouseId: string;
  lastOrderAt: string;
  note: string;
};

type ExplainStep = { step: string; ok: boolean; note: string };
type RoutingResult = { warehouseId: string | null; reason: string; explain: ExplainStep[] };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
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

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[820px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function ToastCenter({ toasts, dismiss }) {
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

function FieldLabel({ children }) {
  return <div className="text-[11px] font-extrabold text-slate-600">{children}</div>;
}

function SmallSelect({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function MiniRow({ label, value, tone = "slate" }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <Badge tone={tone}>{String(value)}</Badge>
    </div>
  );
}

function Toggle({ on, setOn, label }) {
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={cx(
        "inline-flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-extrabold",
        on ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800"
      )}
    >
      <span>{label}</span>
      <span className={cx("h-5 w-9 rounded-full p-0.5", on ? "bg-emerald-300" : "bg-slate-200")}>
        <span className={cx("block h-4 w-4 rounded-full bg-white dark:bg-slate-900 transition", on ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function buildRules(): RoutingRule[] {
  return [
    {
      id: "RR-1",
      enabled: true,
      priority: 10,
      name: "Kenya goes to Nairobi",
      match: { country: "Kenya" },
      action: { warehouseId: "WH-KE-NBO" },
      note: "Local hub reduces last-mile time.",
    },
    {
      id: "RR-2",
      enabled: true,
      priority: 20,
      name: "Uganda goes to Kampala",
      match: { country: "Uganda" },
      action: { warehouseId: "WH-UG-KLA" },
      note: "Local hub.",
    },
    {
      id: "RR-3",
      enabled: true,
      priority: 30,
      name: "Batteries default to Wuxi for export",
      match: { category: "Batteries" },
      action: { warehouseId: "WH-CN-WUXI" },
      note: "Export paperwork and packaging.",
    },
  ];
}

function buildBuyerPrefs(): BuyerPref[] {
  const ago = (m) => new Date(Date.now() - m * 60_000).toISOString();
  return [
    { id: "B-1001", name: "Amina K.", preferredWarehouseId: "WH-UG-KLA", lastOrderAt: ago(320), note: "Fast pickup" },
    { id: "B-1002", name: "Kato S.", preferredWarehouseId: "WH-KE-NBO", lastOrderAt: ago(980), note: "Regional" },
    { id: "B-1003", name: "Chen L.", preferredWarehouseId: "WH-CN-WUXI", lastOrderAt: ago(220), note: "Consolidation" },
  ];
}

function warehouseAllows(wh: Warehouse | undefined, country: string, category: string) {
  if (!wh?.active) return { ok: false, why: "Warehouse inactive" };
  const c = String(country || "").trim();
  if (!c) return { ok: false, why: "Destination missing" };
  const blocked = new Set((wh.blockedCountries || []).map((x) => String(x).toLowerCase()));
  if (blocked.has(c.toLowerCase())) return { ok: false, why: "Country blocked" };

  const service = wh.serviceCountries && wh.serviceCountries.length ? new Set(wh.serviceCountries.map((x) => String(x).toLowerCase())) : null;
  if (service && !service.has(c.toLowerCase())) return { ok: false, why: "Not in service countries" };

  const cat = String(category || "").trim();
  if (cat.toLowerCase() === "hazmat" && wh.constraints?.hazmat === false) return { ok: false, why: "Hazmat not allowed" };
  if (cat.toLowerCase() === "batteries" && wh.constraints?.batteries === false) return { ok: false, why: "Batteries not allowed" };

  return { ok: true, why: "Allowed" };
}

function evaluateRouting({
  warehouses,
  rules,
  allowBuyerPreference,
  buyerPreferredWarehouseId,
  country,
  category,
}: {
  warehouses: Warehouse[];
  rules: RoutingRule[];
  allowBuyerPreference: boolean;
  buyerPreferredWarehouseId: string | null;
  country: string;
  category: string;
}): RoutingResult {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  const explain: ExplainStep[] = [];

  // Buyer preference
  const prefWh = allowBuyerPreference && buyerPreferredWarehouseId ? whMap.get(buyerPreferredWarehouseId) : undefined;
  if (prefWh) {
    const allowed = warehouseAllows(prefWh, country, category);
    explain.push({ step: "Buyer preference", ok: allowed.ok, note: allowed.ok ? `Using ${prefWh.code}` : `Ignored: ${allowed.why}` });
    if (allowed.ok) {
      return { warehouseId: prefWh.id, reason: "Buyer preferred warehouse applied.", explain };
    }
  } else {
    explain.push({ step: "Buyer preference", ok: false, note: allowBuyerPreference ? "No preference" : "Disabled" });
  }

  // Rules
  const ordered = [...rules].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
  for (const r of ordered) {
    if (!r.enabled) continue;
    const matchCountry = r.match?.country ? String(r.match.country).toLowerCase() === String(country || "").toLowerCase() : true;
    const matchCategory = r.match?.category ? String(r.match.category).toLowerCase() === String(category || "").toLowerCase() : true;
    if (!matchCountry || !matchCategory) continue;

    const wh = whMap.get(r.action?.warehouseId);
    if (!wh) {
      explain.push({ step: `Rule ${r.id}`, ok: false, note: "Target warehouse missing" });
      continue;
    }

    const allowed = warehouseAllows(wh, country, category);
    explain.push({ step: `Rule ${r.id}`, ok: allowed.ok, note: allowed.ok ? `Matched ${r.name}` : `Blocked: ${allowed.why}` });
    if (allowed.ok) {
      return { warehouseId: wh.id, reason: `Matched routing rule: ${r.name}`, explain };
    }
  }

  // Fallback
  const fallback = warehouses.find((w) => warehouseAllows(w, country, category).ok) || warehouses[0];
  explain.push({ step: "Fallback", ok: true, note: fallback ? `Selected ${fallback.code}` : "No warehouses" });
  return { warehouseId: fallback?.id || null, reason: "Fallback warehouse selected.", explain };
}

// ------------------------ Main page ------------------------

export default function OpsWarehousesPremium() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [buyerPrefs, setBuyerPrefs] = useState<BuyerPref[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getOpsWarehouses().then((payload) => {
      if (!active) return;
      const rows = Array.isArray((payload as { warehouses?: unknown[] }).warehouses)
        ? ((payload as { warehouses?: Array<Record<string, unknown>> }).warehouses ?? [])
        : [];
      setWarehouses(
        rows.map((entry) => {
          const address = ((entry.address ?? {}) as Record<string, unknown>);
          const meta = ((entry.metadata ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? ""),
            code: String(entry.code ?? ""),
            name: String(entry.name ?? "Warehouse"),
            country: String(address.country ?? ""),
            city: String(address.city ?? ""),
            active: String(entry.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
            cutOffLocal: String(meta.cutOffLocal ?? "17:00"),
            processingDays: Number(meta.processingDays ?? 1),
            capabilities: (meta.capabilities as Warehouse["capabilities"] | undefined) ?? { ship: true, pickup: false, returns: false },
            constraints: (meta.constraints as Warehouse["constraints"] | undefined) ?? { hazmat: false, batteries: false },
            serviceCountries: Array.isArray(meta.serviceCountries) ? meta.serviceCountries.map((item) => String(item)) : [],
            blockedCountries: Array.isArray(meta.blockedCountries) ? meta.blockedCountries.map((item) => String(item)) : [],
            updatedAt: String(entry.updatedAt ?? new Date().toISOString()),
          } satisfies Warehouse;
        })
      );
      setRules(
        Array.isArray((payload as { rules?: unknown[] }).rules)
          ? ((payload as { rules?: Array<RoutingRule> }).rules ?? [])
          : []
      );
      setBuyerPrefs(
        Array.isArray((payload as { buyerPrefs?: unknown[] }).buyerPrefs)
          ? ((payload as { buyerPrefs?: Array<BuyerPref> }).buyerPrefs ?? [])
          : []
      );
    });

    return () => {
      active = false;
    };
  }, []);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  const filteredWarehouses = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = [...warehouses];
    if (onlyActive) list = list.filter((w) => w.active);
    if (query) {
      list = list.filter((w) => {
        const hay = [w.id, w.code, w.name, w.country, w.city].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }
    list.sort((a, b) => (a.active === b.active ? a.code.localeCompare(b.code) : a.active ? -1 : 1));
    return list;
  }, [warehouses, q, onlyActive]);

  const [activeWhId, setActiveWhId] = useState(() => warehouses[0]?.id);
  useEffect(() => {
    if (!warehouses.find((w) => w.id === activeWhId)) setActiveWhId(warehouses[0]?.id);
  }, [warehouses]);
  const activeWh = useMemo(() => warehouses.find((w) => w.id === activeWhId) || null, [warehouses, activeWhId]);

  // Global routing settings
  const [allowBuyerPreference, setAllowBuyerPreference] = useState(true);
  const [tieBreak, setTieBreak] = useState("fastest");

  // Simulation
  const [simCountry, setSimCountry] = useState("Uganda");
  const [simCategory, setSimCategory] = useState("General");
  const [simBuyerPref, setSimBuyerPref] = useState(buyerPrefs[0]?.preferredWarehouseId || "");

  const simResult = useMemo(() => {
    return evaluateRouting({
      warehouses,
      rules,
      allowBuyerPreference,
      buyerPreferredWarehouseId: simBuyerPref || null,
      country: simCountry,
      category: simCategory,
    });
  }, [warehouses, rules, allowBuyerPreference, simBuyerPref, simCountry, simCategory]);

  const simWh = useMemo(() => warehouses.find((w) => w.id === simResult?.warehouseId) || null, [warehouses, simResult?.warehouseId]);

  const stats = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((w) => w.active).length;
    const shipCap = warehouses.filter((w) => w.capabilities?.ship).length;
    const rulesOn = rules.filter((r) => r.enabled).length;
    return { total, active, shipCap, rulesOn };
  }, [warehouses, rules]);

  // Warehouse editor
  const [whDrawerOpen, setWhDrawerOpen] = useState(false);
  const [whMode, setWhMode] = useState("create");
  const blankWh = useMemo<Warehouse>(
    () => ({
      id: `WH-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      code: "",
      name: "",
      country: "",
      city: "",
      active: true,
      cutOffLocal: "16:00",
      processingDays: 1,
      capabilities: { ship: true, pickup: false, returns: true },
      constraints: { hazmat: false, batteries: true },
      serviceCountries: [],
      blockedCountries: [],
      updatedAt: new Date().toISOString(),
    }),
    []
  );
  const [whDraft, setWhDraft] = useState<Warehouse>(blankWh);

  const openWhCreate = () => {
    setWhMode("create");
    setWhDraft({ ...blankWh, id: `WH-${Math.random().toString(16).slice(2, 6).toUpperCase()}` });
    setWhDrawerOpen(true);
  };
  const openWhEdit = (w) => {
    setWhMode("edit");
    setWhDraft(JSON.parse(JSON.stringify(w)));
    setWhDrawerOpen(true);
  };
  const saveWh = () => {
    const code = String(whDraft.code || "").trim().toUpperCase();
    const name = String(whDraft.name || "").trim();
    const country = String(whDraft.country || "").trim();
    const city = String(whDraft.city || "").trim();

    if (!code || !name || !country) {
      pushToast({ title: "Missing fields", message: "Code, name, and country are required.", tone: "warning" });
      return;
    }

    const next = {
      ...whDraft,
      code,
      name,
      country,
      city,
      serviceCountries: (whDraft.serviceCountries || []).map((x) => String(x).trim()).filter(Boolean),
      blockedCountries: (whDraft.blockedCountries || []).map((x) => String(x).trim()).filter(Boolean),
      processingDays: clamp(Number(whDraft.processingDays || 0), 0, 14),
      updatedAt: new Date().toISOString(),
    };

    setWarehouses((prev) => {
      if (whMode === "edit") return prev.map((x) => (x.id === next.id ? next : x));
      return [next, ...prev];
    });
    setActiveWhId(next.id);
    setWhDrawerOpen(false);
    pushToast({ title: "Saved", message: "Warehouse updated.", tone: "success" });
  };

  // Rule editor
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [ruleMode, setRuleMode] = useState("create");
  const blankRule = useMemo<RoutingRule>(
    () => ({
      id: `RR-${Math.random().toString(16).slice(2, 5).toUpperCase()}`,
      enabled: true,
      priority: 10,
      name: "New rule",
      match: { country: "", category: "" },
      action: { warehouseId: warehouses[0]?.id || "" },
      note: "",
    }),
    [warehouses]
  );
  const [ruleDraft, setRuleDraft] = useState<RoutingRule>(blankRule);

  const openRuleCreate = () => {
    setRuleMode("create");
    setRuleDraft({ ...blankRule, id: `RR-${Math.random().toString(16).slice(2, 5).toUpperCase()}`, priority: nextRulePriority(rules) });
    setRuleDrawerOpen(true);
  };
  const openRuleEdit = (r) => {
    setRuleMode("edit");
    setRuleDraft(JSON.parse(JSON.stringify(r)));
    setRuleDrawerOpen(true);
  };
  const saveRule = () => {
    const name = String(ruleDraft.name || "").trim();
    if (!name) {
      pushToast({ title: "Rule name required", tone: "warning" });
      return;
    }
    const next = {
      ...ruleDraft,
      name,
      priority: clamp(Number(ruleDraft.priority || 0), 1, 999),
      match: {
        country: String(ruleDraft.match?.country || "").trim(),
        category: String(ruleDraft.match?.category || "").trim(),
      },
      action: { warehouseId: ruleDraft.action?.warehouseId || warehouses[0]?.id || "" },
    };

    setRules((prev) => {
      if (ruleMode === "edit") return prev.map((x) => (x.id === next.id ? next : x));
      return [...prev, next];
    });

    setRuleDrawerOpen(false);
    pushToast({ title: "Saved", message: "Routing rule updated.", tone: "success" });
  };

  const deleteRule = (id) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    pushToast({ title: "Deleted", message: "Rule removed.", tone: "default" });
  };

  const bumpRule = (id, dir) => {
    setRules((prev) => {
      const list = [...prev].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
      const idx = list.findIndex((r) => r.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= list.length) return prev;
      const a = list[idx];
      const b = list[j];
      const pa = Number(a.priority || 0);
      const pb = Number(b.priority || 0);
      a.priority = pb;
      b.priority = pa;
      return list;
    });
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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Warehouses</div>
                <Badge tone="slate">/ops/warehouses</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Warehouse management and routing rules with buyer preference constraints.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "WMS status refreshed.", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify({ warehouses, rules }, null, 2));
                  pushToast({ title: "Copied", message: "Ops configuration copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>
              <button
                type="button"
                onClick={openWhCreate}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New warehouse
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <Kpi icon={Building2} label="Warehouses" value={stats.total} />
          <Kpi icon={BadgeCheck} label="Active" value={stats.active} tone="green" />
          <Kpi icon={Truck} label="Ship capable" value={stats.shipCap} />
          <Kpi icon={Settings} label="Rules enabled" value={stats.rulesOn} tone="orange" />
        </div>

        {/* Filters row */}
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-3 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-7">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by code, name, country"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-5 flex flex-wrap items-center gap-2">
                <Toggle on={onlyActive} setOn={setOnlyActive} label="Active only" />

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setOnlyActive(false);
                    pushToast({ title: "Filters cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <span className="ml-auto"><Badge tone="slate">{filteredWarehouses.length} shown</Badge></span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Routing settings</div>
              <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700">Allow buyer preference</div>
                  <button
                    type="button"
                    onClick={() => setAllowBuyerPreference((v) => !v)}
                    className={cx(
                      "rounded-2xl border px-3 py-1.5 text-xs font-extrabold",
                      allowBuyerPreference ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                    )}
                  >
                    {allowBuyerPreference ? "On" : "Off"}
                  </button>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Used when the preferred warehouse is allowed for destination.</div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                <div className="text-xs font-extrabold text-slate-700">Tie-break strategy</div>
                <div className="mt-2">
                  <SmallSelect value={tieBreak} onChange={setTieBreak}>
                    <option value="fastest">fastest</option>
                    <option value="lowest_cost">lowest cost</option>
                    <option value="capacity">capacity</option>
                  </SmallSelect>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">In production: feed from cost tables and SLA estimates.</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Warehouses list */}
          <GlassCard className="overflow-hidden lg:col-span-7">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Warehouses</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">Select to view details</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filteredWarehouses.map((w) => {
                const isActive = w.id === activeWhId;
                const tone = w.active ? "green" : "slate";
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setActiveWhId(w.id)}
                    className={cx("w-full px-4 py-4 text-left transition", isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{w.code} · {w.name}</div>
                          <Badge tone={tone}>{w.active ? "Active" : "Inactive"}</Badge>
                          <Badge tone="slate">Cut-off {w.cutOffLocal}</Badge>
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(w.updatedAt)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{w.country}</Badge>
                          <Badge tone="slate">Proc {w.processingDays}d</Badge>
                          <Badge tone={w.constraints?.batteries ? "green" : "danger"}>Batteries</Badge>
                          <Badge tone={w.constraints?.hazmat ? "green" : "slate"}>Hazmat</Badge>
                          <span className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCopy(w.id);
                                pushToast({ title: "Copied", message: "Warehouse ID copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openWhEdit(w);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredWarehouses.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No warehouses" message="Create a warehouse or clear filters." action={{ label: "New warehouse", onClick: openWhCreate }} />
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Right column: Routing rules + simulation + buyer prefs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active details */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Warehouse detail</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Service coverage and constraints.</div>
                </div>
                <Badge tone="slate">Detail</Badge>
              </div>

              {!activeWh ? (
                <div className="mt-4"><EmptyState title="Select a warehouse" message="Click a warehouse to view its details." /></div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{activeWh.code} · {activeWh.name}</div>
                          <Badge tone={activeWh.active ? "green" : "slate"}>{activeWh.active ? "Active" : "Inactive"}</Badge>
                          <span className="ml-auto"><Badge tone="slate">{activeWh.country}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{activeWh.city || ""} · Cut-off {activeWh.cutOffLocal} · Processing {activeWh.processingDays} day(s)</div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <MiniRow label="Ship" value={activeWh.capabilities?.ship ? "Yes" : "No"} tone={activeWh.capabilities?.ship ? "green" : "slate"} />
                          <MiniRow label="Returns" value={activeWh.capabilities?.returns ? "Yes" : "No"} tone={activeWh.capabilities?.returns ? "green" : "slate"} />
                          <MiniRow label="Batteries" value={activeWh.constraints?.batteries ? "Allowed" : "Blocked"} tone={activeWh.constraints?.batteries ? "green" : "danger"} />
                          <MiniRow label="Hazmat" value={activeWh.constraints?.hazmat ? "Allowed" : "Blocked"} tone={activeWh.constraints?.hazmat ? "green" : "slate"} />
                        </div>

                        <div className="mt-3">
                          <div className="text-[11px] font-extrabold text-slate-600">Service countries</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(activeWh.serviceCountries || []).slice(0, 8).map((c) => (
                              <Badge key={c} tone="slate">{c}</Badge>
                            ))}
                            {(activeWh.serviceCountries || []).length === 0 ? <div className="text-xs font-semibold text-slate-500">No restrictions set</div> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Premium constraint ideas</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                          <li>Cut-off aware routing (same-day handover vs next day)</li>
                          <li>Carrier compliance for batteries and temperature sensitive items</li>
                          <li>Capacity based routing (work-in-progress limits)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Routing rules */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Routing rules</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Priority rules and constraints. Higher priority wins.</div>
                </div>
                <button
                  type="button"
                  onClick={openRuleCreate}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Plus className="h-4 w-4" />
                  Add rule
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {[...rules].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0)).map((r) => (
                  <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", r.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        <Filter className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="slate">P{r.priority}</Badge>
                          <div className="truncate text-sm font-black text-slate-900">{r.name}</div>
                          <Badge tone={r.enabled ? "green" : "slate"}>{r.enabled ? "On" : "Off"}</Badge>
                          <span className="ml-auto"><Badge tone="slate">{r.id}</Badge></span>
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">
                          Match: {r.match?.country ? `country ${r.match.country}` : "any"}{r.match?.category ? `, category ${r.match.category}` : ""} · Then: {r.action?.warehouseId}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setRules((s) => s.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                            className={cx(
                              "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                              r.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                            )}
                          >
                            {r.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => bumpRule(r.id, -1)}
                            className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => bumpRule(r.id, 1)}
                            className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => openRuleEdit(r)}
                            className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(r.id)}
                            className="ml-auto rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {rules.length === 0 ? <EmptyState title="No rules" message="Add a rule to control routing." action={{ label: "Add rule", onClick: openRuleCreate }} /> : null}
              </div>
            </GlassCard>

            {/* Simulation */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Routing simulator</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">See which warehouse would be selected and why.</div>
                </div>
                <Badge tone="orange">Super premium</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Destination country</FieldLabel>
                  <input
                    value={simCountry}
                    onChange={(e) => setSimCountry(e.target.value)}
                    placeholder="Uganda"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <FieldLabel>Category</FieldLabel>
                  <div className="mt-2">
                    <SmallSelect value={simCategory} onChange={setSimCategory}>
                      <option value="General">General</option>
                      <option value="Batteries">Batteries</option>
                      <option value="Hazmat">Hazmat</option>
                    </SmallSelect>
                  </div>
                </div>

                <div>
                  <FieldLabel>Buyer preferred warehouse</FieldLabel>
                  <div className="mt-2">
                    <SmallSelect value={simBuyerPref} onChange={setSimBuyerPref}>
                      <option value={""}>None</option>
                      {buyerPrefs.map((b) => (
                        <option key={b.id} value={b.preferredWarehouseId}>
                          {b.name} - {b.preferredWarehouseId}
                        </option>
                      ))}
                    </SmallSelect>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-orange-700" />
                    <div className="text-xs font-extrabold text-orange-900">Settings in effect</div>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-orange-900/70">Buyer preference: {allowBuyerPreference ? "On" : "Off"}</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Tie-break: {tieBreak}</div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Result</div>
                  <span className="ml-auto"><Badge tone="slate">{simResult?.warehouseId || "-"}</Badge></span>
                </div>

                <div className="mt-2 text-xs font-semibold text-slate-500">{simResult?.reason || ""}</div>

                {simWh ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <MiniRow label="Warehouse" value={`${simWh.code} · ${simWh.country}`} tone="green" />
                    <MiniRow label="Processing" value={`${simWh.processingDays} day(s)`} />
                    <MiniRow label="Batteries" value={simWh.constraints?.batteries ? "Allowed" : "Blocked"} tone={simWh.constraints?.batteries ? "green" : "danger"} />
                    <MiniRow label="Hazmat" value={simWh.constraints?.hazmat ? "Allowed" : "Blocked"} tone={simWh.constraints?.hazmat ? "green" : "slate"} />
                  </div>
                ) : null}

                <div className="mt-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Decision trace</div>
                  <div className="mt-2 space-y-2">
                    {(simResult?.explain || []).map((x, idx) => (
                      <div key={idx} className={cx("rounded-2xl border p-3", x.ok ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900")}
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone={x.ok ? "green" : "slate"}>{x.step}</Badge>
                          <div className={cx("text-xs", x.ok ? "font-black text-emerald-900" : "font-semibold text-slate-700")}>{x.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(JSON.stringify({ input: { simCountry, simCategory, simBuyerPref, allowBuyerPreference }, output: simResult }, null, 2));
                      pushToast({ title: "Copied", message: "Simulation payload copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy simulation
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Saved", message: "Simulator scenario saved.", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Save scenario
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Buyer preference table */}
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Buyer preferred warehouses</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Super premium: respect preference when allowed and safe.</div>
                </div>
                <Badge tone="slate">{buyerPrefs.length}</Badge>
              </div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Buyer</div>
                  <div className="col-span-4">Preferred warehouse</div>
                  <div className="col-span-4">Last order</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {buyerPrefs.map((b) => (
                    <div key={b.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-4">
                        <div className="text-sm font-black text-slate-900">{b.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{b.id}</div>
                      </div>
                      <div className="col-span-4 flex items-center">
                        <Badge tone="slate">{b.preferredWarehouseId}</Badge>
                      </div>
                      <div className="col-span-4 flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-slate-500">{fmtTime(b.lastOrderAt)}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setSimBuyerPref(b.preferredWarehouseId);
                            pushToast({ title: "Loaded", message: "Buyer preference applied to simulator.", tone: "success" });
                          }}
                          className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                        >
                          Simulate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Important</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Buyer preference can be ignored when it violates constraints (blocked country, prohibited category, inactive warehouse).
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Warehouse drawer */}
      <Drawer
        open={whDrawerOpen}
        title={whMode === "create" ? "Create warehouse" : `Edit warehouse · ${whDraft?.id || ""}`}
        subtitle="Core fields plus constraints and coverage."
        onClose={() => setWhDrawerOpen(false)}
      >
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Code</FieldLabel>
                <input
                  value={whDraft.code}
                  onChange={(e) => setWhDraft((s) => ({ ...s, code: e.target.value }))}
                  placeholder="KLA"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
              <div>
                <FieldLabel>Name</FieldLabel>
                <input
                  value={whDraft.name}
                  onChange={(e) => setWhDraft((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Kampala Hub"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
              <div>
                <FieldLabel>Country</FieldLabel>
                <input
                  value={whDraft.country}
                  onChange={(e) => setWhDraft((s) => ({ ...s, country: e.target.value }))}
                  placeholder="Uganda"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <input
                  value={whDraft.city}
                  onChange={(e) => setWhDraft((s) => ({ ...s, city: e.target.value }))}
                  placeholder="Kampala"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <FieldLabel>Cut-off local time</FieldLabel>
                <input
                  value={whDraft.cutOffLocal}
                  onChange={(e) => setWhDraft((s) => ({ ...s, cutOffLocal: e.target.value }))}
                  placeholder="16:00"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <FieldLabel>Processing days</FieldLabel>
                <input
                  value={String(whDraft.processingDays)}
                  onChange={(e) => setWhDraft((s) => ({ ...s, processingDays: Number(e.target.value) }))}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Capabilities</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Toggle on={!!whDraft.capabilities.ship} setOn={(v) => setWhDraft((s) => ({ ...s, capabilities: { ...(s.capabilities || {}), ship: v } }))} label="Ship" />
                  <Toggle on={!!whDraft.capabilities.pickup} setOn={(v) => setWhDraft((s) => ({ ...s, capabilities: { ...(s.capabilities || {}), pickup: v } }))} label="Pickup" />
                  <Toggle on={!!whDraft.capabilities.returns} setOn={(v) => setWhDraft((s) => ({ ...s, capabilities: { ...(s.capabilities || {}), returns: v } }))} label="Returns" />
                  <Toggle on={!!whDraft.active} setOn={(v) => setWhDraft((s) => ({ ...s, active: v }))} label="Active" />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Constraints</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Toggle on={!!whDraft.constraints.batteries} setOn={(v) => setWhDraft((s) => ({ ...s, constraints: { ...(s.constraints || {}), batteries: v } }))} label="Batteries" />
                  <Toggle on={!!whDraft.constraints.hazmat} setOn={(v) => setWhDraft((s) => ({ ...s, constraints: { ...(s.constraints || {}), hazmat: v } }))} label="Hazmat" />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Premium: per-carrier restrictions, temperature, regulated goods.</div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Coverage</div>
                <span className="ml-auto"><Badge tone="slate">Countries</Badge></span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Service countries (comma separated)</FieldLabel>
                  <input
                    value={(whDraft.serviceCountries || []).join(", ")}
                    onChange={(e) => setWhDraft((s) => ({ ...s, serviceCountries: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
                    placeholder="Uganda, Kenya, Rwanda"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">If empty, the warehouse is treated as global.</div>
                </div>

                <div>
                  <FieldLabel>Blocked countries</FieldLabel>
                  <input
                    value={(whDraft.blockedCountries || []).join(", ")}
                    onChange={(e) => setWhDraft((s) => ({ ...s, blockedCountries: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))}
                    placeholder=""
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Buyer preference interplay</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">
                      Buyer preferred routing only applies when the preferred warehouse is allowed for destination and category.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveWh}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setWhDrawerOpen(false)}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Rule drawer */}
      <Drawer
        open={ruleDrawerOpen}
        title={ruleMode === "create" ? "Create routing rule" : `Edit routing rule · ${ruleDraft?.id || ""}`}
        subtitle="Priority, matching, then target warehouse."
        onClose={() => setRuleDrawerOpen(false)}
      >
        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Rule name</FieldLabel>
                <input
                  value={ruleDraft.name}
                  onChange={(e) => setRuleDraft((s) => ({ ...s, name: e.target.value }))}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <FieldLabel>Priority</FieldLabel>
                <input
                  value={String(ruleDraft.priority)}
                  onChange={(e) => setRuleDraft((s) => ({ ...s, priority: Number(e.target.value) }))}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <FieldLabel>Match country (optional)</FieldLabel>
                <input
                  value={ruleDraft.match?.country || ""}
                  onChange={(e) => setRuleDraft((s) => ({ ...s, match: { ...(s.match || {}), country: e.target.value } }))}
                  placeholder="Kenya"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <FieldLabel>Match category (optional)</FieldLabel>
                <div className="mt-2">
                  <SmallSelect
                    value={ruleDraft.match?.category || ""}
                    onChange={(v) => setRuleDraft((s) => ({ ...s, match: { ...(s.match || {}), category: v } }))}
                  >
                    <option value={""}>Any</option>
                    <option value="General">General</option>
                    <option value="Batteries">Batteries</option>
                    <option value="Hazmat">Hazmat</option>
                  </SmallSelect>
                </div>
              </div>

              <div>
                <FieldLabel>Target warehouse</FieldLabel>
                <div className="mt-2">
                  <SmallSelect
                    value={ruleDraft.action?.warehouseId || ""}
                    onChange={(v) => setRuleDraft((s) => ({ ...s, action: { ...(s.action || {}), warehouseId: v } }))}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name}
                      </option>
                    ))}
                  </SmallSelect>
                </div>
              </div>

              <div>
                <FieldLabel>Enabled</FieldLabel>
                <div className="mt-2">
                  <Toggle on={!!ruleDraft.enabled} setOn={(v) => setRuleDraft((s) => ({ ...s, enabled: v }))} label={ruleDraft.enabled ? "On" : "Off"} />
                </div>
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Note (optional)</FieldLabel>
                <textarea
                  value={ruleDraft.note || ""}
                  onChange={(e) => setRuleDraft((s) => ({ ...s, note: e.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Tip</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Leave match fields empty to make a broad fallback rule.</div>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={saveRule}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setRuleDrawerOpen(false)}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = "slate" }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
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
      </div>
    </div>
  );
}

function nextRulePriority(rules) {
  if (!rules?.length) return 10;
  return Math.max(...rules.map((r) => Number(r.priority || 0))) + 10;
}
