import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  BadgePercent,
  Calculator,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/**
 * Wholesale · Price Lists
 * Route: /wholesale/price-lists
 * Features
 * - Tier pricing display (multiple SKUs + tiers)
 * - Versioning + Change Log
 * - Buyer Segmentation chips
 * - Margin Calculator (cost + target margin → recommended price)
 * - CSV Import button (demo wired)
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastAction = { label: string; onClick: () => void };
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: ToastAction };

type PriceTier = { id: string; minQty: number; price: number };
type PriceList = {
  id: string;
  sku: string;
  name: string;
  currency: string;
  baseCost: number;
  status: string;
  updatedAt: string;
  tiers: PriceTier[];
  segments: string[];
};
type PriceListVersion = { id: string; at: string; actor: string; note: string; snapshot: PriceList[] };
type BadgeTone = "green" | "orange" | "danger" | "slate";
type CsvRow = { sku: string; name: string; minQty: number; price: number; currency: string; cost: number };
type ImportData = { fileName: string; header: string[]; rows: CsvRow[] };
type CompareChange = { id: string; sku: string; name: string; diffs: string[] };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(n: number | string | null | undefined, currency = "USD") {
  const v = Number(n);
  if (!Number.isFinite(v)) return "–";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(2)}`;
  }
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

function parseCsv(text: string): { header: string[]; rows: CsvRow[] } {
  // Simple CSV parser (demo). Accepts comma-separated values.
  // Expected columns (flexible): sku, name, minQty, price, currency, cost
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { header: [], rows: [] };

  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const rows = lines.slice(1).map((ln) => {
    const parts = ln.split(",").map((s) => s.trim());
    const get = (key: string) => {
      const idx = header.indexOf(key);
      if (idx < 0) return "";
      return parts[idx] ?? "";
    };
    return {
      sku: get("sku") || parts[0] || "",
      name: get("name") || parts[1] || "",
      minQty: Number(get("minqty") || get("min_qty") || get("min") || parts[2] || 1),
      price: Number(get("price") || parts[3] || 0),
      currency: get("currency") || parts[4] || "USD",
      cost: Number(get("cost") || parts[5] || 0),
    };
  });

  return { header, rows };
}

function percent(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "–";
  return `${Math.round(v * 10) / 10}%`;
}

function marginPct(cost, price) {
  const c = Number(cost);
  const p = Number(price);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0) return 0;
  // gross margin = (price - cost) / price
  return ((p - c) / p) * 100;
}

function recPrice(cost, targetMarginPct) {
  const c = Number(cost);
  const m = clamp(Number(targetMarginPct) / 100, 0, 0.95);
  if (!Number.isFinite(c)) return 0;
  return c / (1 - m);
}

function BadgePill({ children, tone = "slate" }: { children: React.ReactNode; tone?: BadgeTone }) {
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

function IconButton({
  label,
  onClick,
  children,
  tone = "light",
  disabled,
}: {
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  tone?: "light" | "dark";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        disabled && "cursor-not-allowed opacity-50",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
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
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
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

function Modal({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 p-4">
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

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
              <div className="border-b border-slate-200/70 p-4">
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

function seedPriceLists(): PriceList[] {
  const base = Date.now();
  const ago = (m: number) => new Date(base - m * 60_000).toISOString();
  return [
    {
      id: "SKU-1001",
      sku: "EV-CHG-7KW",
      name: "EV Fast Charger 7kW Wallbox",
      currency: "USD",
      baseCost: 420,
      status: "Active",
      updatedAt: ago(35),
      tiers: [
        { id: "t1", minQty: 1, price: 620 },
        { id: "t2", minQty: 10, price: 590 },
        { id: "t3", minQty: 50, price: 560 },
      ],
      segments: ["Standard", "Distributor", "Africa"],
    },
    {
      id: "SKU-1002",
      sku: "EBK-BAT-48V-20AH",
      name: "E-Bike Battery Pack 48V 20Ah",
      currency: "USD",
      baseCost: 190,
      status: "Draft",
      updatedAt: ago(92),
      tiers: [
        { id: "t1", minQty: 5, price: 280 },
        { id: "t2", minQty: 20, price: 258 },
        { id: "t3", minQty: 50, price: 242 },
      ],
      segments: ["Standard", "Reseller"],
    },
    {
      id: "SKU-1003",
      sku: "CAB-T2-5M",
      name: "Type 2 Charging Cable 5m",
      currency: "USD",
      baseCost: 14,
      status: "Active",
      updatedAt: ago(210),
      tiers: [
        { id: "t1", minQty: 10, price: 36 },
        { id: "t2", minQty: 100, price: 29 },
      ],
      segments: ["Standard", "Distributor"],
    },
  ];
}

function segmentRule(segments) {
  // Simple pricing multipliers (demo)
  // (In production: per-segment price list selection + buyer eligibility rules)
  const s = new Set(segments);
  let multiplier = 1;
  if (s.has("Distributor")) multiplier *= 0.94;
  if (s.has("Reseller")) multiplier *= 0.97;
  if (s.has("VIP")) multiplier *= 0.98;
  if (s.has("Africa")) multiplier *= 0.99;
  return multiplier;
}

export default function WholesalePriceListsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [rows, setRows] = useState<PriceList[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const segmentOptions = ["Standard", "Distributor", "Reseller", "VIP", "Africa", "EU"]; // demo
  const [activeSegments, setActiveSegments] = useState<string[]>(["Standard"]);

  const mult = useMemo(() => segmentRule(activeSegments), [activeSegments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (status === "All" ? true : r.status === status))
      .filter((r) => {
        if (!q) return true;
        return `${r.sku} ${r.name}`.toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [rows, query, status]);

  const [activeId, setActiveId] = useState<string | undefined>(() => rows[0]?.id);
  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  useEffect(() => {
    if (!activeId && rows.length) setActiveId(rows[0].id);
  }, [rows, activeId]);

  // Versioning
  const [versions, setVersions] = useState<PriceListVersion[]>([]);

  const saveVersion = (note?: string) => {
    const v = {
      id: makeId("ver"),
      at: new Date().toISOString(),
      actor: "Supplier",
      note: note || "Saved version",
      snapshot: JSON.parse(JSON.stringify(rows)) as PriceList[],
    };
    setVersions((s) => [v, ...s].slice(0, 20));
    pushToast({ title: "Version saved", message: v.note, tone: "success" });
  };

  const restoreVersion = (verId: string) => {
    const v = versions.find((x) => x.id === verId);
    if (!v) return;
    setRows(JSON.parse(JSON.stringify(v.snapshot)));
    pushToast({ title: "Restored", message: `Rolled back to ${fmtTime(v.at)}`, tone: "warning" });
  };

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState<string | undefined>(versions[0]?.id);

  const compare = useMemo(() => {
    const v = versions.find((x) => x.id === compareId);
    if (!v) return null;
    const prev = v.snapshot;
    const curr = rows;

    const mapPrev = new Map(prev.map((r) => [r.id, r]));
    const mapCurr = new Map(curr.map((r) => [r.id, r]));

    const changed: CompareChange[] = [];
    const added: PriceList[] = [];
    const removed: PriceList[] = [];

    mapCurr.forEach((c, id) => {
      if (!mapPrev.has(id)) {
        added.push(c);
        return;
      }
      const p = mapPrev.get(id);
      if (!p) return;
      const diffs: string[] = [];
      if (p.baseCost !== c.baseCost) diffs.push("Cost");
      if (p.currency !== c.currency) diffs.push("Currency");
      if (p.status !== c.status) diffs.push("Status");
      if ((p.tiers || []).length !== (c.tiers || []).length) diffs.push("Tiers");
      // tiers content (simple)
      const pt = JSON.stringify(p.tiers);
      const ct = JSON.stringify(c.tiers);
      if (pt !== ct && !diffs.includes("Tiers")) diffs.push("Tiers");
      if (diffs.length) changed.push({ id, sku: c.sku, name: c.name, diffs });
    });

    mapPrev.forEach((p, id) => {
      if (!mapCurr.has(id)) removed.push(p);
    });

    return {
      version: v,
      summary: {
        changed: changed.length,
        added: added.length,
        removed: removed.length,
      },
      changed,
      added,
      removed,
    };
  }, [compareId, versions, rows]);

  // CSV Import
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);

  const onPickCsv = () => fileRef.current?.click?.();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setImportData({ fileName: file.name, ...parsed });
      setImportOpen(true);
      pushToast({ title: "CSV loaded", message: `${file.name} · ${parsed.rows.length} rows`, tone: "default" });
    } catch {
      pushToast({ title: "Import failed", message: "Could not read CSV file.", tone: "danger" });
    } finally {
      e.target.value = "";
    }
  };

  const applyImport = () => {
    if (!importData?.rows?.length) {
      setImportOpen(false);
      return;
    }

    setRows((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as PriceList[];
      const map = new Map(next.map((r) => [r.sku, r] as const));

      importData.rows.forEach((row) => {
        if (!row.sku) return;
        const existing = map.get(row.sku);
        if (!existing) {
          const created: PriceList = {
            id: makeId("SKU"),
            sku: row.sku,
            name: row.name || row.sku,
            currency: row.currency || "USD",
            baseCost: Number(row.cost || 0) || 0,
            status: "Draft",
            updatedAt: new Date().toISOString(),
            tiers: [{ id: makeId("t"), minQty: Math.max(1, Number(row.minQty || 1)), price: Math.max(0, Number(row.price || 0)) }],
            segments: ["Standard"],
          };
          next.unshift(created);
          map.set(row.sku, created);
        } else {
          existing.currency = row.currency || existing.currency;
          if (Number(row.cost)) existing.baseCost = Number(row.cost);
          // merge tier
          const minQty = Math.max(1, Number(row.minQty || 1));
          const price = Math.max(0, Number(row.price || 0));
          const idx = (existing.tiers || []).findIndex((t) => Number(t.minQty) === minQty);
          if (idx >= 0) {
            existing.tiers[idx].price = price;
          } else {
            existing.tiers.push({ id: makeId("t"), minQty, price });
            existing.tiers.sort((a, b) => Number(a.minQty) - Number(b.minQty));
          }
          existing.updatedAt = new Date().toISOString();
        }
      });

      return next;
    });

    pushToast({ title: "Import applied", message: "Price list updated (demo).", tone: "success" });
    setImportOpen(false);
  };

  // Editor drawer
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<PriceList | null>(null);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getWholesalePriceLists().then((payload) => {
      if (!active) return;
      const items = Array.isArray((payload as { priceLists?: unknown[] }).priceLists)
        ? ((payload as { priceLists?: Array<Record<string, unknown>> }).priceLists ?? [])
        : [];
      const nextVersions = Array.isArray((payload as { versions?: unknown[] }).versions)
        ? ((payload as { versions?: Array<Record<string, unknown>> }).versions ?? []).map((entry) => ({
            id: String(entry.id ?? makeId("ver")),
            at: String(entry.at ?? new Date().toISOString()),
            actor: String(entry.actor ?? "Supplier"),
            note: String(entry.note ?? "Saved version"),
            snapshot: Array.isArray(entry.snapshot) ? entry.snapshot as PriceList[] : [],
          }))
        : [];
      setRows(
        items.map((entry) => {
          const data = ((entry.data ?? {}) as Record<string, unknown>);
          return {
            id: String(entry.id ?? data.id ?? ""),
            sku: String(data.sku ?? entry.id ?? ""),
            name: String(entry.name ?? data.name ?? "Price list"),
            currency: String(entry.currency ?? data.currency ?? "USD"),
            baseCost: Number(data.baseCost ?? 0),
            status: String(data.status ?? entry.status ?? "Draft"),
            updatedAt: String(data.updatedAt ?? entry.updatedAt ?? new Date().toISOString()),
            tiers: Array.isArray(data.tiers) ? data.tiers as PriceTier[] : [],
            segments: Array.isArray(data.segments) ? data.segments.map((item) => String(item)) : [],
          } satisfies PriceList;
        })
      );
      setVersions(nextVersions);
    });

    return () => {
      active = false;
    };
  }, []);
  const updateDraft = (updater: (current: PriceList) => PriceList) =>
    setDraft((current) => (current ? updater(current) : current));

  const openEdit = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    setActiveId(id);
    setDraft(JSON.parse(JSON.stringify(r)) as PriceList);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setDraft(null);
  };

  const saveDraft = (note?: string) => {
    if (!draft) return;
    const normalized = {
      ...draft,
      updatedAt: new Date().toISOString(),
      tiers: (draft.tiers || [])
        .map((t) => ({
          ...t,
          minQty: Math.max(1, Number(t.minQty || 1)),
          price: Math.max(0, Number(t.price || 0)),
        }))
        .sort((a, b) => Number(a.minQty) - Number(b.minQty)),
    };

    setRows((prev) => prev.map((r) => (r.id === normalized.id ? normalized : r)));
    pushToast({ title: "Saved", message: note || "Price list updated.", tone: "success" });
    closeEdit();
  };

  const aiSuggestTiers = () => {
    if (!draft) return;
    const cost = Number(draft.baseCost || 0);
    const suggested = [
      { id: makeId("t"), minQty: Math.max(1, Number(draft.tiers?.[0]?.minQty || 1)), price: Math.round(recPrice(cost, 32) * 100) / 100 },
      { id: makeId("t"), minQty: 10, price: Math.round(recPrice(cost, 28) * 100) / 100 },
      { id: makeId("t"), minQty: 50, price: Math.round(recPrice(cost, 24) * 100) / 100 },
    ];
    updateDraft((s) => ({ ...s, tiers: suggested }));
    pushToast({ title: "AI suggestions applied", message: "Tier ladder generated (demo).", tone: "default" });
  };

  // Margin calculator
  const [mcCost, setMcCost] = useState(120);
  const [mcMargin, setMcMargin] = useState(30);
  const recommended = useMemo(() => recPrice(mcCost, mcMargin), [mcCost, mcMargin]);

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Price Lists</div>
                <BadgePill tone="slate">/wholesale/price-lists</BadgePill>
                <BadgePill tone="green">Tier pricing</BadgePill>
                <BadgePill tone="slate">Versioning</BadgePill>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Create tiered wholesale pricing with segmentation, versioning and margin intelligence.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />

              <button
                type="button"
                onClick={onPickCsv}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                CSV Import
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Export to CSV/XLSX (demo).", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => saveVersion("Saved from Price Lists")}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <History className="h-4 w-4" />
                Save version
              </button>
            </div>
          </div>

          {/* Segments */}
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2">
                <Tag className="h-4 w-4 text-slate-500" />
                <div className="text-xs font-extrabold text-slate-700">Buyer segmentation</div>
                <BadgePill tone="slate">Multiplier × {Math.round(mult * 1000) / 1000}</BadgePill>
              </div>
              {segmentOptions.map((s) => {
                const active = activeSegments.includes(s);
                return (
                  <Chip
                    key={s}
                    active={active}
                    onClick={() =>
                      setActiveSegments((prev) =>
                        active ? prev.filter((x) => x !== s) : [...prev, s]
                      )
                    }
                  >
                    {s}
                  </Chip>
                );
              })}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSegments(["Standard"])}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left: table */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">SKU price lists</div>
                  <BadgePill tone="slate">{filtered.length}</BadgePill>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search SKU or name"
                      className="h-10 w-[260px] max-w-[70vw] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {["All", "Active", "Draft"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <IconButton
                    label="Refresh"
                    onClick={() => pushToast({ title: "Refreshed", message: "Latest price signals loaded (demo).", tone: "success" })}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">SKU</div>
                  <div className="col-span-3">Tiers (effective)</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-2">Best tier</div>
                  <div className="col-span-1">Margin</div>
                  <div className="col-span-1">Updated</div>
                  <div className="col-span-1">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((r) => {
                    const isActive = r.id === activeId;
                    const best = (r.tiers || []).slice().sort((a, b) => Number(a.price) - Number(b.price))[0];
                    const eff = best ? Number(best.price) * mult : 0;
                    const m = best ? marginPct(r.baseCost, eff) : 0;
                    const mt = m >= 30 ? "green" : m >= 18 ? "orange" : "danger";

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setActiveId(r.id)}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition",
                          isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{r.sku}</div>
                            <BadgePill tone={r.status === "Active" ? "green" : "slate"}>{r.status}</BadgePill>
                          </div>
                          <div className="mt-1 truncate text-[11px] font-semibold text-slate-500">{r.name}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(r.segments || []).slice(0, 3).map((s) => (
                              <BadgePill key={s} tone="slate">
                                {s}
                              </BadgePill>
                            ))}
                            {(r.segments || []).length > 3 ? <BadgePill tone="slate">+{(r.segments || []).length - 3}</BadgePill> : null}
                          </div>
                        </div>

                        <div className="col-span-3">
                          <div className="flex flex-wrap gap-2">
                            {(r.tiers || []).slice(0, 3).map((t) => (
                              <div key={t.id} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                                <div className="text-[10px] font-extrabold text-slate-500">{t.minQty}+</div>
                                <div className="text-xs font-black text-slate-900">{fmtMoney(Number(t.price) * mult, r.currency)}</div>
                              </div>
                            ))}
                            {(r.tiers || []).length > 3 ? (
                              <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                                <div className="text-[10px] font-extrabold text-slate-500">More</div>
                                <div className="text-xs font-black text-slate-900">+{(r.tiers || []).length - 3}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <div>
                            <div className="text-[10px] font-extrabold text-slate-500">{r.currency}</div>
                            <div className="text-xs font-black text-slate-900">{fmtMoney(r.baseCost, r.currency)}</div>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          {best ? (
                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600">{best.minQty}+ units</div>
                              <div className="text-sm font-black text-slate-900">{fmtMoney(eff, r.currency)}</div>
                              <div className="text-[10px] font-semibold text-slate-500">Base {fmtMoney(best.price, r.currency)}</div>
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-slate-500">No tiers</div>
                          )}
                        </div>

                        <div className="col-span-1 flex items-center">
                          <BadgePill tone={mt}>{percent(m)}</BadgePill>
                        </div>

                        <div className="col-span-1 flex items-center text-slate-500">{fmtTime(r.updatedAt)}</div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <IconButton
                            label="Copy SKU"
                            onClick={(e) => {
                              e.stopPropagation();
                              safeCopy(r.sku);
                              pushToast({ title: "Copied", message: "SKU copied.", tone: "success" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(r.id);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                            <Filter className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900">No results</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try changing filters or clearing your search.</div>
                            <button
                              type="button"
                              onClick={() => {
                                setQuery("");
                                setStatus("All");
                                pushToast({ title: "Filters cleared", tone: "default" });
                              }}
                              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <X className="h-4 w-4" />
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right: premium panels */}
          <div className="lg:col-span-4 space-y-4">
            {/* Selected summary */}
            <GlassCard className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">Selected SKU</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Quick actions + effective pricing</div>
                </div>
                <BadgePill tone="slate">Premium</BadgePill>
              </div>

              {!active ? (
                <div className="mt-4 text-sm font-semibold text-slate-500">Select a SKU from the table.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-sm font-black text-slate-900 truncate">{active.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{active.sku} · {active.currency} · Cost {fmtMoney(active.baseCost, active.currency)}</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(active.id)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Edit tiers
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(JSON.stringify(active, null, 2));
                          pushToast({ title: "Copied", message: "SKU JSON copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <FileText className="h-4 w-4" />
                        Copy JSON
                      </button>
                    </div>

                    <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-black text-orange-900">Segmentation preview</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Selected segments apply a multiplier of × {Math.round(mult * 1000) / 1000} to show effective prices (demo).</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Margin calculator */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Margin calculator</div>
                <span className="ml-auto"><BadgePill tone="slate">Cost → Price</BadgePill></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Enter cost + target margin, get recommended price.</div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Cost</div>
                    <input
                      value={String(mcCost)}
                      onChange={(e) => setMcCost(Number(e.target.value))}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Target margin %</div>
                    <input
                      value={String(mcMargin)}
                      onChange={(e) => setMcMargin(Number(e.target.value))}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <BadgePercent className="h-4 w-4 text-emerald-700" />
                    <div className="text-sm font-black text-emerald-900">Recommended price</div>
                    <span className="ml-auto"><BadgePill tone="green">{fmtMoney(recommended, active?.currency || "USD")}</BadgePill></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-900/70">Formula: price = cost / (1 - margin)</div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!active) {
                        pushToast({ title: "Select a SKU", message: "Choose a SKU first.", tone: "warning" });
                        return;
                      }
                      openEdit(active.id);
                      pushToast({
                        title: "Tip",
                        message: "Use the editor to apply recommended prices per tier.",
                        tone: "default",
                        action: { label: "Open editor", onClick: () => openEdit(active.id) },
                      });
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Apply to SKU (via editor)
                  </button>
                </div>
              </div>
            </GlassCard>

            {/* Versioning */}
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Versioning + change log</div>
                <span className="ml-auto"><BadgePill tone="slate">{versions.length}</BadgePill></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Save versions, compare and rollback.</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveVersion("Manual snapshot")}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Save version
                </button>
                <button
                  type="button"
                  onClick={() => setCompareOpen(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Compare
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {versions.slice(0, 6).map((v) => (
                  <div key={v.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <BadgePill tone="slate">v</BadgePill>
                      <div className="text-xs font-extrabold text-slate-700">{fmtTime(v.at)}</div>
                      <span className="ml-auto"><BadgePill tone="slate">{v.actor}</BadgePill></span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900 truncate">{v.note}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCompareId(v.id);
                          setCompareOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <FileText className="h-4 w-4" />
                        Compare
                      </button>
                      <button
                        type="button"
                        onClick={() => restoreVersion(v.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Import modal */}
      <Modal
        open={importOpen}
        title="CSV Import"
        subtitle={importData ? `${importData.fileName} · ${importData.rows.length} rows detected` : ""}
        onClose={() => setImportOpen(false)}
      >
        {!importData ? (
          <div className="text-sm font-semibold text-slate-500">No file loaded.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Preview</div>
                <span className="ml-auto"><BadgePill tone="slate">Demo merge</BadgePill></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Rows will create or update SKUs and merge tiers by minQty.</div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                <div className="col-span-3">SKU</div>
                <div className="col-span-4">Name</div>
                <div className="col-span-2">MinQty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-1">Cur</div>
              </div>
              <div className="divide-y divide-slate-200/70">
                {importData.rows.slice(0, 10).map((r, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                    <div className="col-span-3 truncate font-extrabold text-slate-900">{r.sku}</div>
                    <div className="col-span-4 truncate text-slate-600">{r.name || "–"}</div>
                    <div className="col-span-2">{r.minQty}</div>
                    <div className="col-span-2 font-extrabold text-slate-900">{fmtMoney(r.price, r.currency || "USD")}</div>
                    <div className="col-span-1">{r.currency || "USD"}</div>
                  </div>
                ))}
                {importData.rows.length > 10 ? (
                  <div className="px-4 py-3 text-xs font-semibold text-slate-500">Showing first 10 rows…</div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyImport}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <CheckCheck className="h-4 w-4" />
                Apply import
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Compare modal */}
      <Modal
        open={compareOpen}
        title="Compare versions"
        subtitle={compare ? `Comparing to ${fmtTime(compare.version.at)} · ${compare.version.note}` : ""}
        onClose={() => setCompareOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600">Choose version</div>
            <div className="relative">
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {fmtTime(v.at)} · {v.note}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {compare ? (
              <div className="ml-auto flex flex-wrap gap-2">
                <BadgePill tone="slate">Changed: {compare.summary.changed}</BadgePill>
                <BadgePill tone="slate">Added: {compare.summary.added}</BadgePill>
                <BadgePill tone="slate">Removed: {compare.summary.removed}</BadgePill>
              </div>
            ) : null}
          </div>

          {compare ? (
            <>
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Change log</div>
                  <span className="ml-auto"><BadgePill tone="slate">Diff</BadgePill></span>
                </div>
                <div className="mt-3 space-y-2">
                  {compare.changed.length === 0 ? (
                    <div className="text-sm font-semibold text-slate-500">No changes detected.</div>
                  ) : (
                    compare.changed.slice(0, 10).map((c) => (
                      <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-black text-slate-900">{c.sku}</div>
                          <div className="truncate text-[11px] font-semibold text-slate-500">{c.name}</div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {c.diffs.map((d) => (
                            <BadgePill key={d} tone="orange">{d}</BadgePill>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => restoreVersion(compare.version.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Restore this version
                </button>
                <button
                  type="button"
                  onClick={() => setCompareOpen(false)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold text-slate-500">No version selected.</div>
          )}
        </div>
      </Modal>

      {/* Edit drawer */}
      <Drawer
        open={editOpen}
        title={draft ? `Edit · ${draft.sku}` : "Edit"}
        subtitle="Tier pricing, segments and approvals"
        onClose={closeEdit}
      >
        {!draft ? (
          <div className="text-sm font-semibold text-slate-500">No SKU selected.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                  <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900 truncate">{draft.name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Currency: {draft.currency} · Status: {draft.status}</div>
                </div>
                <BadgePill tone={draft.status === "Active" ? "green" : "slate"}>{draft.status}</BadgePill>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Base cost</div>
                  <input
                    value={String(draft.baseCost ?? "")}
                    onChange={(e) => updateDraft((s) => ({ ...s, baseCost: Number(e.target.value) }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Currency</div>
                  <div className="relative mt-2">
                    <select
                      value={draft.currency}
                      onChange={(e) => updateDraft((s) => ({ ...s, currency: e.target.value }))}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                    >
                      {["USD", "CNY", "EUR"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Status</div>
                  <div className="relative mt-2">
                    <select
                      value={draft.status}
                      onChange={(e) => updateDraft((s) => ({ ...s, status: e.target.value }))}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                    >
                      {["Draft", "Active"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-orange-900">✨ AI tier suggestions</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Generate a tier ladder from cost and common margin targets (demo).</div>
                    <button
                      type="button"
                      onClick={aiSuggestTiers}
                      className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
                    >
                      <Sparkles className="h-4 w-4" />
                      Apply suggestions
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Tier pricing</div>
                <span className="ml-auto"><BadgePill tone="slate">Effective × {Math.round(mult * 1000) / 1000}</BadgePill></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Edit tiers. Effective price preview uses the selected segmentation multiplier.</div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Min qty</div>
                  <div className="col-span-3">Base price</div>
                  <div className="col-span-3">Effective</div>
                  <div className="col-span-2">Margin</div>
                  <div className="col-span-1"> </div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {(draft.tiers || []).map((t, idx) => {
                    const eff = Number(t.price) * mult;
                    const m = marginPct(draft.baseCost, eff);
                    const mt = m >= 30 ? "green" : m >= 18 ? "orange" : "danger";
                    return (
                      <div key={t.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                        <div className="col-span-3">
                          <input
                            value={String(t.minQty)}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateDraft((s) => ({
                                ...s,
                                tiers: s.tiers.map((x) => (x.id === t.id ? { ...x, minQty: v } : x)),
                              }));
                            }}
                            className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            value={String(t.price)}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateDraft((s) => ({
                                ...s,
                                tiers: s.tiers.map((x) => (x.id === t.id ? { ...x, price: v } : x)),
                              }));
                            }}
                            className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div className="col-span-3 flex items-center font-black text-slate-900">{fmtMoney(eff, draft.currency)}</div>
                        <div className="col-span-2 flex items-center"><BadgePill tone={mt}>{percent(m)}</BadgePill></div>
                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => updateDraft((s) => ({ ...s, tiers: s.tiers.filter((x) => x.id !== t.id) }))}
                            className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                            aria-label="Remove tier"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {(draft.tiers || []).length === 0 ? (
                    <div className="p-4 text-sm font-semibold text-slate-500">No tiers yet. Add one below.</div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((s) => ({
                      ...s,
                      tiers: [...(s.tiers || []), { id: makeId("t"), minQty: 10, price: 0 }],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Plus className="h-4 w-4" />
                  Add tier
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(draft.tiers, null, 2));
                    pushToast({ title: "Copied", message: "Tiers copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy tiers
                </button>

                <span className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-700">
                  <BadgePercent className="h-4 w-4" />
                  Effective pricing preview
                </span>
              </div>
            </GlassCard>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveDraft("Saved from editor")}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pushToast({ title: "Approval workflow", message: "Send for approval (demo).", tone: "default" });
                    saveDraft("Submitted for approval")
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <FileText className="h-4 w-4" />
                  Submit for approval
                </button>

                <button
                  type="button"
                  onClick={closeEdit}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
