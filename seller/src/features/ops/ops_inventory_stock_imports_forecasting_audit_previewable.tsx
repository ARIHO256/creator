import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSellerCompatState } from "../../lib/frontendState";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  History,
  Package,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";

/**
 * Ops Inventory (Previewable)
 * Route: /ops/inventory
 * Core:
 * - Stock list
 * - Reserved vs available
 * - Imports
 * Super premium:
 * - Forecasting
 * - Low-stock alerts
 * - Adjustment audit
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
type MappingState = Record<string, string>;
type AlertItem = {
  id: string;
  sku: string;
  name: string;
  title: string;
  message: string;
  severity: "danger" | "warning" | "default";
};
type ReorderSuggestion = {
  sku: string;
  name: string;
  available: number;
  lead: number;
  dts: number;
  suggested: number;
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n, digits = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  const m = Math.pow(10, digits);
  return String(Math.round(v * m) / m);
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
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

function Chip({ active, onClick, children, tone = "green" }) {
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

function Drawer({ open, title, subtitle, onClose, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
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
                <CheckCheck className="h-5 w-5" />
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

// -------------------- Inventory logic --------------------

function seedInventory() {
  const now = Date.now();
  const agoM = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "SKU-1001",
      sku: "CHG-7KW-WBX",
      name: "EV Wallbox Charger 7kW",
      category: "Chargers",
      unit: "pcs",
      reorderPoint: 8,
      leadDays: 18,
      velocityPerDay: 0.55,
      warehouses: [
        { id: "wh1", name: "Main Warehouse", onHand: 22, reserved: 3 },
        { id: "wh2", name: "Kampala Hub", onHand: 8, reserved: 1 },
      ],
      updatedAt: agoM(22),
    },
    {
      id: "SKU-1002",
      sku: "BAT-48V-20AH",
      name: "E-Bike Battery Pack 48V 20Ah",
      category: "Batteries",
      unit: "pcs",
      reorderPoint: 15,
      leadDays: 25,
      velocityPerDay: 1.9,
      warehouses: [
        { id: "wh1", name: "Main Warehouse", onHand: 36, reserved: 6 },
        { id: "wh3", name: "Nairobi Hub", onHand: 14, reserved: 3 },
      ],
      updatedAt: agoM(75),
    },
    {
      id: "SKU-1003",
      sku: "CAB-T2-5M",
      name: "Type 2 Charging Cable 5m",
      category: "Accessories",
      unit: "pcs",
      reorderPoint: 80,
      leadDays: 14,
      velocityPerDay: 8.5,
      warehouses: [{ id: "wh1", name: "Main Warehouse", onHand: 160, reserved: 22 }],
      updatedAt: agoM(145),
    },
    {
      id: "SKU-1004",
      sku: "RFID-CARD",
      name: "RFID Access Card",
      category: "Accessories",
      unit: "pcs",
      reorderPoint: 200,
      leadDays: 10,
      velocityPerDay: 16.0,
      warehouses: [
        { id: "wh1", name: "Main Warehouse", onHand: 180, reserved: 40 },
        { id: "wh2", name: "Kampala Hub", onHand: 80, reserved: 18 },
      ],
      updatedAt: agoM(310),
    },
    {
      id: "SKU-1005",
      sku: "PLUG-CCS2",
      name: "CCS2 Connector Plug",
      category: "Connectors",
      unit: "pcs",
      reorderPoint: 12,
      leadDays: 21,
      velocityPerDay: 0.75,
      warehouses: [{ id: "wh1", name: "Main Warehouse", onHand: 9, reserved: 3 }],
      updatedAt: agoM(18),
    },
  ];
}

function totals(item) {
  const onHand = (item.warehouses || []).reduce((s, w) => s + Number(w.onHand || 0), 0);
  const reserved = (item.warehouses || []).reduce((s, w) => s + Number(w.reserved || 0), 0);
  const available = Math.max(0, onHand - reserved);
  return { onHand, reserved, available };
}

function statusFor(item) {
  const t = totals(item);
  if (t.available <= 0) return { k: "Out", tone: "danger" };
  if (t.available <= Number(item.reorderPoint || 0)) return { k: "Low", tone: "orange" };
  return { k: "OK", tone: "green" };
}

function daysToStockout(item) {
  const v = Math.max(0.05, Number(item.velocityPerDay || 0));
  const { available } = totals(item);
  return available / v;
}

function forecastPoints(item, weeks = 8) {
  const v = Math.max(0.05, Number(item.velocityPerDay || 0));
  const { available } = totals(item);
  const pts: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const projected = Math.max(0, available - v * 7 * i);
    pts.push(projected);
  }
  return pts;
}

function Sparkline({ points }) {
  const w = 240;
  const h = 70;
  const pad = 8;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-900">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function parseCsv(text) {
  const raw = String(text || "").trim();
  if (!raw) return { headers: [], rows: [] };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((c) => c.trim()))
    .map((cells) => {
      const obj = {};
      headers.forEach((h, idx) => (obj[h] = cells[idx] ?? ""));
      return obj;
    });

  return { headers, rows };
}

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SAMPLE_CSV =
  "sku,name,warehouse,onHand,reserved,reorderPoint,category\n" +
  "CHG-7KW-WBX,EV Wallbox Charger 7kW,Main Warehouse,24,3,8,Chargers\n" +
  "BAT-48V-20AH,E-Bike Battery Pack 48V 20Ah,Main Warehouse,40,6,15,Batteries\n" +
  "CAB-T2-5M,Type 2 Charging Cable 5m,Kampala Hub,60,12,80,Accessories\n" +
  "PLUG-CCS2,CCS2 Connector Plug,Nairobi Hub,18,2,12,Connectors\n";

// -------------------- Page --------------------

export default function OpsInventoryPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [items, setItems] = useSellerCompatState("ops.inventory.items", seedInventory());

  const [query, setQuery] = useState("");
  const [warehouse, setWarehouse] = useState("All");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const warehouses = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => (it.warehouses || []).forEach((w) => s.add(w.name)));
    return ["All", ...Array.from(s)];
  }, [items]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          items
            .map((x) => x.category)
            .filter((value): value is string => Boolean(value))
        )
      ),
    ],
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => {
        if (warehouse === "All") return true;
        return (it.warehouses || []).some((w) => w.name === warehouse);
      })
      .filter((it) => (category === "All" ? true : it.category === category))
      .filter((it) => {
        if (status === "All") return true;
        return statusFor(it).k === status;
      })
      .filter((it) => {
        if (!q) return true;
        const hay = [it.sku, it.name, it.category, (it.warehouses || []).map((w) => w.name).join(" ")]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, query, warehouse, category, status]);

  const [activeSku, setActiveSku] = useSellerCompatState("ops.inventory.activeSku", seedInventory()[0]?.sku);
  useEffect(() => {
    if (!filtered.find((x) => x.sku === activeSku)) setActiveSku(filtered[0]?.sku);
  }, [filtered]);

  const active = useMemo(() => items.find((x) => x.sku === activeSku) || null, [items, activeSku]);

  const kpis = useMemo(() => {
    const totalSkus = items.length;
    const low = items.filter((x) => statusFor(x).k === "Low").length;
    const out = items.filter((x) => statusFor(x).k === "Out").length;
    const totalAvail = items.reduce((s, x) => s + totals(x).available, 0);
    const totalReserved = items.reduce((s, x) => s + totals(x).reserved, 0);
    const reservedPct = totalAvail + totalReserved > 0 ? Math.round((totalReserved / (totalAvail + totalReserved)) * 100) : 0;
    return { totalSkus, low, out, totalAvail, totalReserved, reservedPct };
  }, [items]);

  // -------------------- Adjustment audit --------------------
  const [audit, setAudit] = useState(() => {
    const now = Date.now();
    const ago = (m) => new Date(now - m * 60_000).toISOString();
    return [
      {
        id: "AUD-2003",
        sku: "PLUG-CCS2",
        warehouse: "Main Warehouse",
        deltaOnHand: -6,
        deltaReserved: 0,
        reason: "Damage write-off",
        actor: "Ops",
        createdAt: ago(34),
      },
      {
        id: "AUD-2002",
        sku: "RFID-CARD",
        warehouse: "Kampala Hub",
        deltaOnHand: +120,
        deltaReserved: 0,
        reason: "Restock arrival",
        actor: "Ops",
        createdAt: ago(98),
      },
      {
        id: "AUD-2001",
        sku: "BAT-48V-20AH",
        warehouse: "Nairobi Hub",
        deltaOnHand: 0,
        deltaReserved: +4,
        reason: "Order reservations",
        actor: "System",
        createdAt: ago(190),
      },
    ];
  });

  const auditForActive = useMemo(() => {
    if (!active) return [];
    return audit.filter((a) => a.sku === active.sku).slice(0, 10);
  }, [audit, active?.sku]);

  // -------------------- Import drawer --------------------
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [importText, setImportText] = useState("");

  const parsed = useMemo(() => parseCsv(importText), [importText]);

  const requiredFields = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Name" },
    { key: "warehouse", label: "Warehouse" },
    { key: "onHand", label: "On hand" },
    { key: "reserved", label: "Reserved" },
  ];

  const [mapping, setMapping] = useState<MappingState>({});

  useEffect(() => {
    if (!importOpen) return;
    // reset
    setImportStep(1);
    setImportFileName("");
    setImportText("");
    setMapping({});
  }, [importOpen]);

  useEffect(() => {
    // best-effort default mapping based on headers
    const headers = parsed.headers || [];
    if (!headers.length) return;

    const hdrNorm = headers.map((h) => ({ raw: h, n: normalizeKey(h) }));
    const pick = (fieldKey, aliases) => {
      const found = hdrNorm.find((h) => aliases.includes(h.n));
      return found?.raw || "";
    };

    setMapping((prev) => {
      const next = { ...prev };
      if (!next.sku) next.sku = pick("sku", ["sku", "product_sku", "item_sku"]);
      if (!next.name) next.name = pick("name", ["name", "title", "product_name", "item_name"]);
      if (!next.warehouse) next.warehouse = pick("warehouse", ["warehouse", "location", "warehouse_name"]);
      if (!next.onHand) next.onHand = pick("onHand", ["onhand", "on_hand", "stock", "qty_on_hand"]);
      if (!next.reserved) next.reserved = pick("reserved", ["reserved", "reserved_qty", "qty_reserved"]);
      if (!next.reorderPoint) next.reorderPoint = pick("reorderPoint", ["reorderpoint", "reorder_point", "min_stock"]);
      if (!next.category) next.category = pick("category", ["category", "cat", "product_category"]);
      return next;
    });
  }, [parsed.headers?.join("|")]);

  const mappingOk = useMemo(() => {
    if (!parsed.rows.length) return false;
    return requiredFields.every((f) => mapping[f.key]);
  }, [mapping, parsed.rows.length]);

  const previewRows = useMemo(() => {
    const rows = parsed.rows || [];
    if (!rows.length) return [];

    const get = (row, key) => {
      const col = mapping[key];
      return col ? row[col] : "";
    };

    return rows.slice(0, 10).map((r, idx) => ({
      idx,
      sku: get(r, "sku"),
      name: get(r, "name"),
      warehouse: get(r, "warehouse"),
      onHand: get(r, "onHand"),
      reserved: get(r, "reserved"),
      reorderPoint: get(r, "reorderPoint"),
      category: get(r, "category"),
    }));
  }, [parsed.rows, mapping]);

  const runImport = () => {
    if (!mappingOk) {
      pushToast({ title: "Mapping required", message: "Map all required fields first.", tone: "warning" });
      return;
    }

    const rows = parsed.rows || [];
    if (!rows.length) return;

    const get = (row, key) => {
      const col = mapping[key];
      return col ? row[col] : "";
    };

    setItems((prev) => {
      const next = [...prev];

      rows.forEach((r) => {
        const sku = String(get(r, "sku") || "").trim();
        if (!sku) return;

        const name = String(get(r, "name") || "").trim() || sku;
        const whName = String(get(r, "warehouse") || "").trim() || "Main Warehouse";
        const onHand = Number(get(r, "onHand") || 0);
        const reserved = Number(get(r, "reserved") || 0);
        const reorderPointRaw = get(r, "reorderPoint");
        const categoryRaw = get(r, "category");

        const reorderPoint = reorderPointRaw === "" || reorderPointRaw == null ? undefined : Number(reorderPointRaw);
        const cat = String(categoryRaw || "").trim() || undefined;
        const reorderPointVal =
          typeof reorderPoint === "number" && Number.isFinite(reorderPoint) ? reorderPoint : 10;

        const existingIdx = next.findIndex((x) => x.sku === sku);
        if (existingIdx === -1) {
          next.push({
            id: makeId("SKU"),
            sku,
            name,
            category: cat || "Uncategorized",
            unit: "pcs",
            reorderPoint: reorderPointVal,
            leadDays: 18,
            velocityPerDay: 1.0,
            warehouses: [{ id: makeId("wh"), name: whName, onHand: Number.isFinite(onHand) ? onHand : 0, reserved: Number.isFinite(reserved) ? reserved : 0 }],
            updatedAt: new Date().toISOString(),
          });
        } else {
          const cur = next[existingIdx];
          const whs = [...(cur.warehouses || [])];
          const wIdx = whs.findIndex((w) => w.name === whName);
          const patchedReorder =
            typeof reorderPoint === "number" && Number.isFinite(reorderPoint) ? reorderPoint : cur.reorderPoint;
          const patched = {
            id: cur.id,
            sku: cur.sku,
            name: name || cur.name,
            category: cat || cur.category,
            unit: cur.unit,
            reorderPoint: patchedReorder,
            leadDays: cur.leadDays,
            velocityPerDay: cur.velocityPerDay,
            warehouses: whs,
            updatedAt: new Date().toISOString(),
          };

          if (wIdx === -1) {
            patched.warehouses = [
              ...whs,
              { id: makeId("wh"), name: whName, onHand: Number.isFinite(onHand) ? onHand : 0, reserved: Number.isFinite(reserved) ? reserved : 0 },
            ];
          } else {
            patched.warehouses = whs.map((w, i) =>
              i === wIdx
                ? {
                    ...w,
                    onHand: Number.isFinite(onHand) ? onHand : w.onHand,
                    reserved: Number.isFinite(reserved) ? reserved : w.reserved,
                  }
                : w
            );
          }

          next[existingIdx] = patched;
        }
      });

      return next;
    });

    setAudit((prev) => [
      {
        id: makeId("AUD"),
        sku: "MULTI",
        warehouse: "Import",
        deltaOnHand: 0,
        deltaReserved: 0,
        reason: `Inventory import (${rows.length} rows)`,
        actor: "Ops",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ].slice(0, 400));

    setImportOpen(false);
    pushToast({ title: "Imported", message: `${rows.length} row(s) processed.`, tone: "success" });
  };

  // -------------------- Adjust drawer --------------------

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustWarehouse, setAdjustWarehouse] = useState("Main Warehouse");
  const [adjustMode, setAdjustMode] = useState("add"); // add | remove | set
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReserved, setAdjustReserved] = useState(0);
  const [adjustReason, setAdjustReason] = useState("Stock correction");
  const [adjustNote, setAdjustNote] = useState("");

  useEffect(() => {
    if (!adjustOpen) return;
    setAdjustMode("add");
    setAdjustQty(0);
    setAdjustReserved(0);
    setAdjustReason("Stock correction");
    setAdjustNote("");
    setAdjustWarehouse(active?.warehouses?.[0]?.name || "Main Warehouse");
  }, [adjustOpen, active?.sku]);

  const applyAdjustment = () => {
    if (!active) return;

    const qty = Number(adjustQty || 0);
    const rsv = Number(adjustReserved || 0);

    if (!Number.isFinite(qty) || !Number.isFinite(rsv)) {
      pushToast({ title: "Invalid numbers", message: "Check adjustment values.", tone: "warning" });
      return;
    }

    setItems((prev) =>
      prev.map((it) => {
        if (it.sku !== active.sku) return it;

        const whs = [...(it.warehouses || [])];
        const idx = whs.findIndex((w) => w.name === adjustWarehouse);
        const cur = idx >= 0 ? whs[idx] : { id: makeId("wh"), name: adjustWarehouse, onHand: 0, reserved: 0 };

        let nextOnHand = Number(cur.onHand || 0);
        let nextReserved = Number(cur.reserved || 0);

        if (adjustMode === "add") nextOnHand = nextOnHand + qty;
        if (adjustMode === "remove") nextOnHand = Math.max(0, nextOnHand - Math.abs(qty));
        if (adjustMode === "set") nextOnHand = Math.max(0, qty);

        // Reserved changes are applied as delta
        nextReserved = Math.max(0, nextReserved + rsv);

        // Never reserve more than on hand
        nextReserved = Math.min(nextOnHand, nextReserved);

        const patched = { ...cur, onHand: nextOnHand, reserved: nextReserved };
        const nextWhs = idx >= 0 ? whs.map((w, i) => (i === idx ? patched : w)) : [...whs, patched];

        return { ...it, warehouses: nextWhs, updatedAt: new Date().toISOString() };
      })
    );

    // audit record
    const deltaOnHand =
      adjustMode === "add" ? qty : adjustMode === "remove" ? -Math.abs(qty) : qty; // for set we store qty as a marker (demo)

    setAudit((prev) => [
      {
        id: makeId("AUD"),
        sku: active.sku,
        warehouse: adjustWarehouse,
        deltaOnHand,
        deltaReserved: rsv,
        reason: adjustReason,
        actor: "Ops",
        createdAt: new Date().toISOString(),
        note: adjustNote || undefined,
      },
      ...prev,
    ].slice(0, 400));

    setAdjustOpen(false);
    pushToast({ title: "Adjusted", message: "Inventory updated and recorded in audit.", tone: "success" });
  };

  // -------------------- Low stock alerts (premium) --------------------

  const alerts = useMemo<AlertItem[]>(() => {
    const list = items
      .map((it) => {
        const s = statusFor(it).k;
        const dts = daysToStockout(it);
        const lead = Number(it.leadDays || 0);
        const { available } = totals(it);

        const severity = s === "Out" ? "danger" : s === "Low" ? "warning" : dts <= lead ? "warning" : "default";

        const title =
          s === "Out"
            ? "Out of stock"
            : s === "Low"
            ? "Low stock"
            : dts <= lead
            ? "Stockout risk"
            : null;

        if (!title) return null;

        const message =
          s === "Out"
            ? `No available units. Consider immediate replenishment.`
            : s === "Low"
            ? `Available ${available}. Reorder point ${it.reorderPoint}.`
            : `Projected stockout in ${Math.max(1, Math.round(dts))} day(s). Lead time ${lead} day(s).`;

        return {
          id: makeId("al"),
          sku: it.sku,
          name: it.name,
          title,
          message,
          severity,
        };
      })
      .filter((value): value is AlertItem => Boolean(value));

    // most critical first
    const rank = (sev) => (sev === "danger" ? 0 : sev === "warning" ? 1 : 2);
    list.sort((a, b) => rank(a.severity) - rank(b.severity));
    return list.slice(0, 8);
  }, [items]);

  const reorderSuggestions = useMemo<ReorderSuggestion[]>(() => {
    return items
      .map((it) => {
        const dts = daysToStockout(it);
        const lead = Number(it.leadDays || 0);
        const { available } = totals(it);
        const reorderPoint = Number(it.reorderPoint || 0);

        const should = available <= reorderPoint || dts <= lead + 7;
        if (!should) return null;

        const targetDays = Math.max(14, lead + 14);
        const targetStock = Math.ceil(Math.max(0, targetDays) * Math.max(0.05, Number(it.velocityPerDay || 0)));
        const suggested = Math.max(0, targetStock - available);

        return {
          sku: it.sku,
          name: it.name,
          available,
          lead,
          dts: Math.max(1, Math.round(dts)),
          suggested,
        };
      })
      .filter((value): value is ReorderSuggestion => Boolean(value))
      .slice(0, 8);
  }, [items]);

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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Inventory</div>
                <Badge tone="slate">/ops/inventory</Badge>
                <Badge tone="slate">Ops</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Stock list, reserved vs available, imports, forecasting, alerts, and adjustment audit.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  pushToast({ title: "Refreshed", message: "Latest stock snapshot loaded (demo).", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Upload className="h-4 w-4" />
                Import
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustOpen(true);
                  if (!active) pushToast({ title: "Select an item", message: "Pick a SKU to adjust.", tone: "warning" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Plus className="h-4 w-4" />
                Adjust
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-5">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">SKUs</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.totalSkus}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Low stock</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.low}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Out of stock</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.out}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Available</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{fmtNum(kpis.totalAvail)}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Reserved</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.reservedPct}%</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <GlassCard className="mt-3 p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU, name, category, warehouse"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-2">
              <div className="relative">
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {warehouses.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { k: "All", tone: "green" },
                  { k: "OK", tone: "green" },
                  { k: "Low", tone: "orange" },
                  { k: "Out", tone: "orange" },
                ].map((x) => (
                  <Chip key={x.k} active={status === x.k} onClick={() => setStatus(x.k)} tone={x.tone}>
                    {x.k}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setWarehouse("All");
                  setCategory("All");
                  setStatus("All");
                  pushToast({ title: "Filters cleared", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Filter className="h-4 w-4" />
                Clear filters
              </button>

              <span className="ml-auto">
                <Badge tone="slate">{filtered.length} shown</Badge>
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Main content */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* List */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Stock list</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row for forecasting and audit</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Item</div>
                  <div className="col-span-2">Warehouse</div>
                  <div className="col-span-1">On hand</div>
                  <div className="col-span-1">Reserved</div>
                  <div className="col-span-1">Available</div>
                  <div className="col-span-1">Reorder</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Updated</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((it) => {
                    const t = totals(it);
                    const st = statusFor(it);
                    const primaryWh = warehouse === "All" ? it.warehouses?.[0]?.name : warehouse;
                    const activeRow = it.sku === activeSku;

                    return (
                      <button
                        key={it.sku}
                        type="button"
                        onClick={() => setActiveSku(it.sku)}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition",
                          activeRow ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{it.name}</div>
                            <Badge tone="slate">{it.sku}</Badge>
                            <Badge tone="slate">{it.category}</Badge>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <div className="text-xs font-extrabold text-slate-800">{primaryWh || "-"}</div>
                        </div>
                        <div className="col-span-1 flex items-center font-extrabold text-slate-900">{fmtNum(t.onHand)}</div>
                        <div className="col-span-1 flex items-center">{fmtNum(t.reserved)}</div>
                        <div className="col-span-1 flex items-center">
                          <Badge tone={t.available <= Number(it.reorderPoint || 0) ? "orange" : "green"}>{fmtNum(t.available)}</Badge>
                        </div>
                        <div className="col-span-1 flex items-center">{fmtNum(it.reorderPoint)}</div>
                        <div className="col-span-1 flex items-center">
                          <Badge tone={st.tone}>{st.k}</Badge>
                        </div>
                        <div className="col-span-2 flex items-center text-slate-500">{fmtTime(it.updatedAt)}</div>
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
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search text.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Inventory intelligence</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Forecasting, low-stock alerts, and audit log.</div>
                </div>
                <Badge tone="slate">Premium</Badge>
              </div>

              {!active ? (
                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">
                  Select a SKU to view details.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {/* Selected */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{active.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge tone="slate">{active.sku}</Badge>
                          <Badge tone={statusFor(active).tone}>{statusFor(active).k}</Badge>
                          <Badge tone="slate">Lead {fmtNum(active.leadDays)}d</Badge>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(active.sku);
                          pushToast({ title: "Copied", message: "SKU copied.", tone: "success" });
                        }}
                        className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Copy"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {(() => {
                        const t = totals(active);
                        const dts = daysToStockout(active);
                        return (
                          <>
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="text-xs font-extrabold text-slate-600">On hand</div>
                              <div className="text-xs font-black text-slate-900">{fmtNum(t.onHand)}</div>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="text-xs font-extrabold text-slate-600">Reserved</div>
                              <div className="text-xs font-black text-slate-900">{fmtNum(t.reserved)}</div>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="text-xs font-extrabold text-slate-600">Available</div>
                              <div className="text-xs font-black text-slate-900">{fmtNum(t.available)}</div>
                            </div>
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="text-xs font-extrabold text-slate-600">Projected stockout</div>
                              <div className="text-xs font-black text-slate-900">{fmtNum(Math.max(1, Math.round(dts)))} day(s)</div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <Plus className="h-4 w-4" />
                        Adjust
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(JSON.stringify(active, null, 2));
                          pushToast({ title: "Copied", message: "Item JSON copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <FileText className="h-4 w-4" />
                        Copy JSON
                      </button>
                    </div>
                  </div>

                  {/* Forecasting */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Forecasting</div>
                      <span className="ml-auto"><Badge tone="slate">Next 8 weeks</Badge></span>
                    </div>
                    <div className="mt-3"><Sparkline points={forecastPoints(active, 8)} /></div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Super premium: train on orders, seasonality, and lead times per supplier.</div>
                  </div>

                  {/* Alerts */}
                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-orange-900">Low-stock alerts</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">Top alerts across SKUs. Click to open the SKU.</div>
                      </div>
                      <Badge tone="orange">{alerts.length}</Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      {alerts.slice(0, 4).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setActiveSku(a.sku);
                            pushToast({ title: a.title, message: `${a.sku} selected.`, tone: a.severity === "danger" ? "danger" : "warning" });
                          }}
                          className={cx(
                            "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                            a.severity === "danger" ? "border-rose-200" : "border-orange-200"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cx("grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900", a.severity === "danger" ? "text-rose-700" : "text-orange-700")}>
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-black text-slate-900">{a.title} · {a.sku}</div>
                              <div className="mt-1 text-[11px] font-semibold text-slate-600">{a.message}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </button>
                      ))}
                      {alerts.length === 0 ? (
                        <div className="text-xs font-semibold text-orange-900/70">No alerts at the moment.</div>
                      ) : null}
                    </div>
                  </div>

                  {/* Audit */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Adjustment audit</div>
                      <span className="ml-auto"><Badge tone="slate">Latest</Badge></span>
                    </div>

                    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-3 py-2 text-[11px] font-extrabold text-slate-500">
                        <div className="col-span-4">When</div>
                        <div className="col-span-3">Delta</div>
                        <div className="col-span-5">Reason</div>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {auditForActive.slice(0, 6).map((e) => (
                          <div key={e.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-semibold text-slate-700">
                            <div className="col-span-4 text-slate-500">{fmtTime(e.createdAt)}</div>
                            <div className="col-span-3">
                              <Badge tone={e.deltaOnHand < 0 ? "danger" : e.deltaOnHand > 0 ? "green" : "slate"}>
                                {e.deltaOnHand >= 0 ? `+${e.deltaOnHand}` : String(e.deltaOnHand)} onHand
                              </Badge>
                            </div>
                            <div className="col-span-5 truncate">{e.reason}</div>
                          </div>
                        ))}
                        {auditForActive.length === 0 ? (
                          <div className="p-3 text-xs font-semibold text-slate-500">No audit events for this SKU yet.</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(JSON.stringify(auditForActive, null, 2));
                          pushToast({ title: "Copied", message: "Audit events copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy audit
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Export", message: "Wire export to CSV/PDF.", tone: "default" })}
                        className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Export
                      </button>
                    </div>
                  </div>

                  {/* Reorder suggestions */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Reorder suggestions</div>
                      <span className="ml-auto"><Badge tone="slate">Auto</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Super premium: suggested qty and timing based on lead time and velocity.</div>

                    <div className="mt-3 space-y-2">
                      {reorderSuggestions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-600">No reorder suggestions right now.</div>
                      ) : (
                        reorderSuggestions.map((r) => (
                          <button
                            key={r.sku}
                            type="button"
                            onClick={() => setActiveSku(r.sku)}
                            className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                                <TrendingUp className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-black text-slate-900">{r.sku} · {r.name}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-600">Avail {r.available} · Stockout {r.dts} day(s) · Lead {r.lead} day(s)</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge tone="orange">Suggested reorder {r.suggested}</Badge>
                                  <Badge tone="slate">Review</Badge>
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Import drawer */}
      <Drawer
        open={importOpen}
        title="Import inventory"
        subtitle="Core: imports. Map fields, preview, then apply updates."
        onClose={() => setImportOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Import wizard</div>
              <span className="ml-auto"><Badge tone="slate">Step {importStep}/3</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Recommended headers: sku, name, warehouse, onHand, reserved. Optional: reorderPoint, category.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setImportStep(s)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  importStep === s ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                {s === 1 ? "Upload" : s === 2 ? "Map" : "Preview"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                safeCopy(SAMPLE_CSV);
                pushToast({ title: "Sample CSV copied", message: "Paste into a file and upload, or click Use sample.", tone: "success" });
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
            >
              <Copy className="h-4 w-4" />
              Copy sample
            </button>
          </div>

          {importStep === 1 ? (
            <GlassCard className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Upload CSV</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Local-only in this preview. Wire to your backend in production.</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click?.()}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Upload className="h-4 w-4" />
                      Choose file
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportFileName("sample_inventory.csv");
                        setImportText(SAMPLE_CSV);
                        pushToast({ title: "Sample loaded", message: "Proceed to Map.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <FileText className="h-4 w-4" />
                      Use sample
                    </button>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = (e.target.files || [])[0];
                      if (!f) return;
                      setImportFileName(f.name);
                      const reader = new FileReader();
                      reader.onload = () => {
                        setImportText(String(reader.result || ""));
                        pushToast({ title: "File loaded", message: "Proceed to Map.", tone: "success" });
                      };
                      reader.readAsText(f);
                      e.currentTarget.value = "";
                    }}
                  />

                  <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="text-[11px] font-extrabold text-slate-600">Selected file</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{importFileName || "None"}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Rows detected: {parsed.rows.length}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Import safety</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                        <li>Imports can overwrite on hand and reserved numbers per warehouse</li>
                        <li>Reserved should never exceed on hand</li>
                        <li>Use Preview to confirm mapping and values</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportStep(2)}
                  disabled={!parsed.rows.length}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                    !parsed.rows.length && "cursor-not-allowed opacity-50"
                  )}
                  style={{ background: TOKENS.green }}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          ) : null}

          {importStep === 2 ? (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Map columns</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Required fields must be mapped to proceed.</div>
                </div>
                <Badge tone={mappingOk ? "green" : "orange"}>{mappingOk ? "Ready" : "Incomplete"}</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {requiredFields.map((f) => (
                  <div key={f.key} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="text-[11px] font-extrabold text-slate-600">{f.label} (required)</div>
                    <div className="relative mt-2">
                      <select
                        value={mapping[f.key] || ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        <option value="">Select column</option>
                        {parsed.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-500">Mapped: {mapping[f.key] || "-"}</div>
                  </div>
                ))}

                {["reorderPoint", "category"].map((k) => (
                  <div key={k} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="text-[11px] font-extrabold text-slate-600">{k === "reorderPoint" ? "Reorder point" : "Category"} (optional)</div>
                    <div className="relative mt-2">
                      <select
                        value={mapping[k] || ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [k]: e.target.value }))}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                      >
                        <option value="">None</option>
                        {parsed.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-slate-500">Mapped: {mapping[k] || "-"}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setImportStep(1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setImportStep(3)}
                  disabled={!mappingOk}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                    !mappingOk && "cursor-not-allowed opacity-50"
                  )}
                  style={{ background: TOKENS.green }}
                >
                  Preview
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </GlassCard>
          ) : null}

          {importStep === 3 ? (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Preview</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Confirm values then run import.</div>
                </div>
                <Badge tone="slate">{parsed.rows.length} rows</Badge>
              </div>

              <div className="mt-3 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-2">SKU</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Warehouse</div>
                    <div className="col-span-1">On hand</div>
                    <div className="col-span-1">Reserved</div>
                    <div className="col-span-2">Optional</div>
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {previewRows.map((r) => (
                      <div key={r.idx} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                        <div className="col-span-2 font-extrabold text-slate-900">{r.sku || "-"}</div>
                        <div className="col-span-4 truncate">{r.name || "-"}</div>
                        <div className="col-span-2">{r.warehouse || "-"}</div>
                        <div className="col-span-1">{r.onHand || "0"}</div>
                        <div className="col-span-1">{r.reserved || "0"}</div>
                        <div className="col-span-2 text-[11px] text-slate-500 truncate">
                          {(r.reorderPoint ? `Reorder ${r.reorderPoint}` : "") + (r.category ? ` · ${r.category}` : "")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setImportStep(2)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={runImport}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Run import
                </button>
              </div>
            </GlassCard>
          ) : null}
        </div>
      </Drawer>

      {/* Adjust drawer */}
      <Drawer
        open={adjustOpen}
        title={active ? `Adjust inventory · ${active.sku}` : "Adjust inventory"}
        subtitle="Super premium: adjustment audit and reason codes"
        onClose={() => setAdjustOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a SKU first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Adjustment</div>
                <span className="ml-auto"><Badge tone={statusFor(active).tone}>{statusFor(active).k}</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Edits on hand and reserved. Changes are recorded into the audit log.</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Warehouse</div>
                <div className="relative mt-2">
                  <select
                    value={adjustWarehouse}
                    onChange={(e) => setAdjustWarehouse(e.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                  >
                    {warehouses
                      .filter((w) => w !== "All")
                      .map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Tip: create a new warehouse by importing a row with a new name.</div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Mode</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { k: "add", label: "Add" },
                    { k: "remove", label: "Remove" },
                    { k: "set", label: "Set" },
                  ].map((m) => (
                    <button
                      key={m.k}
                      type="button"
                      onClick={() => setAdjustMode(m.k)}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                        adjustMode === m.k ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Set replaces on hand value. Add/Remove apply deltas.</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">On hand adjustment</div>
                <input
                  value={String(adjustQty)}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Example: 10 (add), 10 (remove), 50 (set)</div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Reserved delta</div>
                <input
                  value={String(adjustReserved)}
                  onChange={(e) => setAdjustReserved(Number(e.target.value))}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Positive to reserve more, negative to release.</div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Reason</div>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                >
                  {[
                    "Stock correction",
                    "Restock arrival",
                    "Damage write-off",
                    "Cycle count",
                    "Reservation reconciliation",
                    "Return restock",
                  ].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-[11px] font-semibold text-slate-500">Used in audit and reports.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="text-[11px] font-extrabold text-slate-600">Note (optional)</div>
              <textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                rows={4}
                placeholder="Explain what changed and why."
                className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={applyAdjustment}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Check className="h-4 w-4" />
                Apply adjustment
              </button>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
