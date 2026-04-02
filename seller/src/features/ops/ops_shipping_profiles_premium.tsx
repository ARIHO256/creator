import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  Globe,
  Info,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

/**
 * Ops: Shipping Profiles (Premium)
 * Route: /ops/shipping-profiles
 * Core: zones, pricing, lead time
 * Super premium: multi-warehouse shipping policies
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

type ShippingZone = {
  id: string;
  name: string;
  countries: string[];
  pricing: { mode: "weight" | "item"; base: number; perKg: number; perItem: number };
  lead: { minDays: number; maxDays: number };
  notes: string;
};

type PolicyRule = {
  id: string;
  priority: number;
  title: string;
  when: { zoneId?: string; country?: string; maxWeightKg?: number };
  then: { warehouseId?: string | null };
  enabled?: boolean;
};

type ShippingPolicy = {
  mode: string;
  fallbackWarehouseId: string | null;
  rules: PolicyRule[];
};

type ShippingProfile = {
  id: string;
  name: string;
  status: string;
  currency: string;
  serviceType: string;
  updatedAt: string;
  zones: ShippingZone[];
  policy: ShippingPolicy;
};

type ZonePricing = { mode?: "weight" | "item"; base?: number; perKg?: number; perItem?: number };
type ZoneLead = { minDays?: number; maxDays?: number };
type ZoneDraft = {
  id?: string;
  name?: string;
  countries?: string[];
  pricing?: ZonePricing;
  lead?: ZoneLead;
  notes?: string;
};

type Warehouse = {
  id: string;
  name: string;
  code?: string;
  country: string;
  city: string;
  active: boolean;
  cutOffLocal: string;
  processingDays: number;
  capabilities: Record<string, boolean>;
  constraints: Record<string, boolean>;
};

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
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
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
  const activeCls = tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
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

function zoneMatch(profile, country) {
  if (!profile) return null;
  const c = String(country || "").trim();
  if (!c) return null;
  return (profile.zones || []).find((z) => (z.countries || []).some((x) => x.toLowerCase() === c.toLowerCase())) || null;
}

function computeZoneCost(zone, weightKg, items) {
  if (!zone) return null;
  const w = Math.max(0, Number(weightKg || 0));
  const it = Math.max(0, Math.floor(Number(items || 0)));
  const p = zone.pricing || { mode: "flat", base: 0, perKg: 0, perItem: 0 };

  if (p.mode === "flat") return Math.max(0, Number(p.base || 0));
  if (p.mode === "item") return Math.max(0, Number(p.base || 0) + it * Number(p.perItem || 0));
  // weight (default)
  return Math.max(0, Number(p.base || 0) + w * Number(p.perKg || 0));
}

function mapWarehouse(entry: Record<string, any>): Warehouse {
  const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  const address = entry.address && typeof entry.address === "object" ? entry.address : {};
  return {
    id: String(entry.id || ""),
    name: String(entry.name || "Warehouse"),
    code: typeof entry.code === "string" ? entry.code : undefined,
    country: String(address.country || ""),
    city: String(address.city || ""),
    active: String(entry.status || "").toUpperCase() !== "INACTIVE",
    cutOffLocal: String(metadata.cutOffLocal || "17:00"),
    processingDays: Number(metadata.processingDays || 1),
    capabilities: (metadata.capabilities as Record<string, boolean>) || {},
    constraints: (metadata.constraints as Record<string, boolean>) || {},
  };
}

function mapShippingProfile(entry: Record<string, any>): ShippingProfile {
  const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  return {
    id: String(entry.id || ""),
    name: String(entry.name || "Shipping profile"),
    status: String(entry.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "Inactive" : "Active",
    currency: String(metadata.currency || entry.currency || "USD"),
    serviceType: String(metadata.serviceType || entry.serviceLevel || "Parcel"),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
    zones: Array.isArray(metadata.zones) ? (metadata.zones as ShippingZone[]) : [],
    policy:
      metadata.policy && typeof metadata.policy === "object"
        ? (metadata.policy as ShippingPolicy)
        : { mode: "auto", fallbackWarehouseId: null, rules: [] },
  };
}

function toShippingProfilePayload(profile: ShippingProfile) {
  const countries = Array.from(new Set(profile.zones.flatMap((zone) => zone.countries || [])));
  return {
    name: profile.name,
    description: `${profile.serviceType} shipping profile`,
    status: profile.status === "Inactive" ? "INACTIVE" : "ACTIVE",
    carrier: "EV Hub Logistics",
    serviceLevel: profile.serviceType,
    handlingTimeDays: Math.max(
      1,
      ...profile.zones.map((zone) => Number(zone.lead?.minDays || 0)).filter((value) => Number.isFinite(value))
    ),
    regions: countries,
    metadata: {
      currency: profile.currency,
      serviceType: profile.serviceType,
      zones: profile.zones,
      policy: profile.policy,
    },
  };
}

function selectWarehouse(profile, ctx) {
  const { zone, country, weightKg, items, buyerPreferredWarehouseId, warehouses } = ctx;
  const policy = profile?.policy;
  const whMap = new Map((warehouses || []).map((w) => [w.id, w]));

  const fallback = policy?.fallbackWarehouseId && whMap.get(policy.fallbackWarehouseId) ? policy.fallbackWarehouseId : (warehouses?.[0]?.id || null);

  const w = Math.max(0, Number(weightKg || 0));
  const it = Math.max(0, Math.floor(Number(items || 0)));

  const ruleMatches = (rule) => {
    const when = rule.when || {};
    if (when.zoneId && zone?.id && when.zoneId !== zone.id) return false;
    if (when.country && String(when.country).toLowerCase() !== String(country || "").toLowerCase()) return false;
    if (Number.isFinite(when.maxWeightKg) && w > Number(when.maxWeightKg)) return false;
    if (Number.isFinite(when.minItems) && it < Number(when.minItems)) return false;
    return true;
  };

  // Buyer preferred (super premium)
  if (policy?.mode === "buyer_preferred" && buyerPreferredWarehouseId && whMap.get(buyerPreferredWarehouseId)) {
    // If buyer preferred exists, we still ensure constraints can be extended here.
    return {
      warehouseId: buyerPreferredWarehouseId,
      reason: `Buyer preference selected (${buyerPreferredWarehouseId}).`,
    };
  }

  const rules = [...(policy?.rules || [])].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
  const first = rules.find((r) => ruleMatches(r) && whMap.get(r.then?.warehouseId));
  if (first) {
    return {
      warehouseId: first.then.warehouseId,
      reason: `Matched policy rule: ${first.title || first.id}.`,
    };
  }

  return {
    warehouseId: fallback,
    reason: `Fallback warehouse selected (${fallback}).`,
  };
}

function policyHealth(profile, warehouses) {
  const whSet = new Set((warehouses || []).map((w) => w.id));
  const policy = profile?.policy;
  const rules = policy?.rules || [];

  const missing = rules.filter((r) => r?.then?.warehouseId && !whSet.has(r.then.warehouseId)).length;
  const hasFallback = !!(policy?.fallbackWarehouseId && whSet.has(policy.fallbackWarehouseId));

  const scoreBase = 70;
  const score = clamp(scoreBase + (hasFallback ? 12 : -10) - missing * 10 + Math.min(14, rules.length * 4), 30, 99);

  const tone = score >= 85 ? "green" : score >= 65 ? "orange" : "danger";
  return { score, tone, missing, hasFallback };
}

// ------------------------ UI helpers ------------------------

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

function FieldLabel({ children }) {
  return <div className="text-[11px] font-extrabold text-slate-600">{children}</div>;
}

function SegTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
    </button>
  );
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

// ------------------------ Main page ------------------------

export default function OpsShippingProfilesPremium() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [role, setRole] = useState("seller");
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([sellerBackendApi.getOpsWarehouses(), sellerBackendApi.getShippingProfiles()])
      .then(([warehousePayload, profilePayload]) => {
        if (!mounted) return;
        setWarehouses(
          Array.isArray(warehousePayload?.warehouses)
            ? (warehousePayload.warehouses as Array<Record<string, any>>).map(mapWarehouse)
            : []
        );
        setProfiles(
          Array.isArray(profilePayload?.profiles)
            ? (profilePayload.profiles as Array<Record<string, any>>).map(mapShippingProfile)
            : []
        );
      })
      .catch(() => {
        return;
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Updated");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...profiles];
    if (status !== "All") list = list.filter((p) => p.status === status);
    if (q) {
      list = list.filter((p) => {
        const hay = [p.id, p.name, p.serviceType, p.status].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (sort === "Name") list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (sort === "Zones") list.sort((a, b) => (b.zones?.length || 0) - (a.zones?.length || 0));
    if (sort === "Updated") list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }, [profiles, query, status, sort]);

  const [activeId, setActiveId] = useState(() => profiles[0]?.id);
  useEffect(() => {
    if (!profiles.find((p) => p.id === activeId)) setActiveId(profiles[0]?.id);
  }, [profiles]);

  const active = useMemo(() => profiles.find((p) => p.id === activeId) || null, [profiles, activeId]);

  // Test shipment
  const [testCountry, setTestCountry] = useState("Uganda");
  const [testWeight, setTestWeight] = useState(5);
  const [testItems, setTestItems] = useState(2);
  const [buyerPrefWh, setBuyerPrefWh] = useState("");

  const testResult = useMemo(() => {
    if (!active) return null;
    const zone = zoneMatch(active, testCountry);
    const cost = computeZoneCost(zone, testWeight, testItems);
    const whPick = selectWarehouse(active, {
      zone,
      country: testCountry,
      weightKg: testWeight,
      items: testItems,
      buyerPreferredWarehouseId: buyerPrefWh || null,
      warehouses,
    });

    return {
      zone,
      cost,
      lead: zone?.lead || null,
      warehouseId: whPick.warehouseId,
      reason: whPick.reason,
    };
  }, [active?.id, testCountry, testWeight, testItems, buyerPrefWh, warehouses]);

  const activeWh = useMemo(() => {
    if (!testResult?.warehouseId) return null;
    return warehouses.find((w) => w.id === testResult.warehouseId) || null;
  }, [testResult?.warehouseId, warehouses]);

  const stats = useMemo(() => {
    const total = profiles.length;
    const activeCount = profiles.filter((p) => p.status === "Active").length;
    const zones = profiles.reduce((s, p) => s + (p.zones?.length || 0), 0);
    const premium = profiles.filter((p) => (p.policy?.rules || []).length >= 2).length;
    return { total, activeCount, zones, premium };
  }, [profiles]);

  // Drawer: create/edit
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [editorStep, setEditorStep] = useState("Basics");

  const blankProfile = useMemo<ShippingProfile>(
    () => ({
      id: `SHIP-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      name: "",
      status: "Active",
      currency: "USD",
      serviceType: "Parcel",
      updatedAt: new Date().toISOString(),
      zones: [],
      policy: { mode: "auto", fallbackWarehouseId: warehouses[0]?.id || null, rules: [] },
    }),
    [warehouses]
  );

  const [draft, setDraft] = useState<ShippingProfile>(blankProfile);

  const openCreate = () => {
    setEditorMode("create");
    setEditorStep("Basics");
    setDraft({ ...blankProfile, id: `SHIP-${Math.random().toString(16).slice(2, 6).toUpperCase()}` });
    setEditorOpen(true);
  };

  const openEdit = (p) => {
    setEditorMode("edit");
    setEditorStep("Basics");
    setDraft(JSON.parse(JSON.stringify(p)));
    setEditorOpen(true);
  };

  const saveDraft = async () => {
    const cleanedName = String(draft.name || "").trim();
    if (!cleanedName) {
      pushToast({ title: "Name required", message: "Add a profile name to continue.", tone: "warning" });
      setEditorStep("Basics");
      return;
    }

    const now = new Date().toISOString();
    const next = { ...draft, name: cleanedName, updatedAt: now };
    try {
      const payload = toShippingProfilePayload(next);
      const response =
        editorMode === "edit"
          ? await sellerBackendApi.patchShippingProfile(next.id, payload)
          : await sellerBackendApi.createShippingProfile(payload);
      const saved = mapShippingProfile(response as Record<string, any>);
      setProfiles((prev) => {
        if (editorMode === "edit") return prev.map((item) => (item.id === saved.id ? saved : item));
        return [saved, ...prev];
      });
      setActiveId(saved.id);
      setEditorOpen(false);
      pushToast({ title: "Saved", message: "Shipping profile updated.", tone: "success" });
    } catch {
      return;
    }
  };

  // Zone editor inside drawer
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneMode, setZoneMode] = useState("create");
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft | null>(null);

  const openZoneCreate = () => {
    setZoneMode("create");
    setZoneDraft({
      id: `Z-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
      name: "",
      countries: [],
      pricing: { mode: "weight", base: 0, perKg: 0, perItem: 0 },
      lead: { minDays: 2, maxDays: 5 },
      notes: "",
    });
    setZoneModalOpen(true);
  };

  const openZoneEdit = (z) => {
    setZoneMode("edit");
    setZoneDraft(JSON.parse(JSON.stringify(z)));
    setZoneModalOpen(true);
  };

  const saveZone = () => {
    if (!zoneDraft) return;
    const name = String(zoneDraft.name || "").trim();
    if (!name) {
      pushToast({ title: "Zone name required", message: "Give this zone a name.", tone: "warning" });
      return;
    }

    const countries = (zoneDraft.countries || []).map((c) => String(c).trim()).filter(Boolean);
    if (!countries.length) {
      pushToast({ title: "Countries required", message: "Add at least one country.", tone: "warning" });
      return;
    }

    const zNext: ShippingZone = {
      id: zoneDraft.id || makeId("zone"),
      name,
      countries,
      notes: zoneDraft.notes || "",
      lead: {
        minDays: clamp(Number(zoneDraft.lead?.minDays || 0), 0, 90),
        maxDays: clamp(Number(zoneDraft.lead?.maxDays || 0), 0, 120),
      },
      pricing: {
        mode: zoneDraft.pricing?.mode === "item" ? "item" : "weight",
        base: Math.max(0, Number(zoneDraft.pricing?.base || 0)),
        perKg: Math.max(0, Number(zoneDraft.pricing?.perKg || 0)),
        perItem: Math.max(0, Number(zoneDraft.pricing?.perItem || 0)),
      },
    };

    setDraft((s) => {
      const list = [...(s.zones || [])];
      if (zoneMode === "edit") {
        return { ...s, zones: list.map((x) => (x.id === zNext.id ? zNext : x)) };
      }
      return { ...s, zones: [zNext, ...list] };
    });

    setZoneModalOpen(false);
    pushToast({ title: "Zone saved", tone: "success" });
  };

  const removeZone = (zoneId) => {
    setDraft((s) => ({ ...s, zones: (s.zones || []).filter((z) => z.id !== zoneId) }));
    pushToast({ title: "Zone removed", tone: "default" });
  };

  // Policy rules editor
  const addPolicyRule = () => {
    setDraft((s) => {
      const rules = [...(s.policy?.rules || [])];
      const next = {
        id: makeId("rule"),
        priority: rules.length ? Math.max(...rules.map((r) => Number(r.priority || 0))) + 10 : 10,
        title: "New rule",
        when: { zoneId: s.zones?.[0]?.id || "" },
        then: { warehouseId: s.policy?.fallbackWarehouseId || warehouses[0]?.id || "" },
      };
      return { ...s, policy: { ...s.policy, rules: [...rules, next] } };
    });
  };

  const updateRule = (ruleId, patch) => {
    setDraft((s) => {
      const rules = (s.policy?.rules || []).map((r) => (r.id === ruleId ? { ...r, ...patch } : r));
      return { ...s, policy: { ...s.policy, rules } };
    });
  };

  const deleteRule = (ruleId) => {
    setDraft((s) => {
      const rules = (s.policy?.rules || []).filter((r) => r.id !== ruleId);
      return { ...s, policy: { ...s.policy, rules } };
    });
    pushToast({ title: "Rule deleted", tone: "default" });
  };

  const bumpRule = (ruleId, dir) => {
    setDraft((s) => {
      const rules = [...(s.policy?.rules || [])].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));
      const idx = rules.findIndex((r) => r.id === ruleId);
      if (idx < 0) return s;
      const j = idx + dir;
      if (j < 0 || j >= rules.length) return s;
      // swap priorities
      const a = rules[idx];
      const b = rules[j];
      const pa = Number(a.priority || 0);
      const pb = Number(b.priority || 0);
      a.priority = pb;
      b.priority = pa;
      return { ...s, policy: { ...s.policy, rules } };
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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Shipping Profiles</div>
                <Badge tone="slate">/ops/shipping-profiles</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Zones, pricing, lead time, plus multi-warehouse policy builder.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setRole("seller")}
                  className={cx("px-4 py-2 text-xs font-extrabold", role === "seller" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
                >
                  Seller
                </button>
                <button
                  type="button"
                  onClick={() => setRole("provider")}
                  className={cx("px-4 py-2 text-xs font-extrabold", role === "provider" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
                >
                  Provider
                </button>
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest carrier sync loaded.", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(active || {}, null, 2));
                  pushToast({ title: "Copied", message: "Active profile JSON copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New profile
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <Kpi icon={Truck} label="Profiles" value={stats.total} />
          <Kpi icon={BadgeCheck} label="Active" value={stats.activeCount} tone="green" />
          <Kpi icon={Globe} label="Zones" value={stats.zones} />
          <Kpi icon={Sparkles} label="Premium policies" value={stats.premium} tone="orange" />
        </div>

        {/* Filters */}
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-3 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search profile by name, type, status"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Status</div>
                  <div className="ml-auto w-[160px]">
                    <SmallSelect value={status} onChange={setStatus}>
                      {[
                        { k: "All", t: "All" },
                        { k: "Active", t: "Active" },
                        { k: "Paused", t: "Paused" },
                      ].map((x) => (
                        <option key={x.k} value={x.k}>
                          {x.t}
                        </option>
                      ))}
                    </SmallSelect>
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Sort</div>
                  <div className="ml-auto w-[160px]">
                    <SmallSelect value={sort} onChange={setSort}>
                      {[
                        { k: "Updated", t: "Updated" },
                        { k: "Name", t: "Name" },
                        { k: "Zones", t: "Zones" },
                      ].map((x) => (
                        <option key={x.k} value={x.k}>
                          {x.t}
                        </option>
                      ))}
                    </SmallSelect>
                  </div>
                </div>
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatus("All");
                    setSort("Updated");
                    pushToast({ title: "Filters cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>

                <span className="ml-auto">
                  <Badge tone="slate">{filtered.length} results</Badge>
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Policy quality</div>
              <span className="ml-auto">{active ? <Badge tone={policyHealth(active, warehouses).tone}>{policyHealth(active, warehouses).score}</Badge> : <AwareEmpty />}</span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Super premium: validate missing warehouses and fallback routing.</div>
            {active ? (
              <div className="mt-3 grid gap-2">
                <MiniRow label="Rules" value={(active.policy?.rules || []).length} />
                <MiniRow label="Fallback" value={active.policy?.fallbackWarehouseId ? "Set" : "Not set"} />
                <MiniRow label="Missing targets" value={policyHealth(active, warehouses).missing} />
              </div>
            ) : null}
          </GlassCard>
        </div>

        {/* Main */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* List */}
          <GlassCard className="overflow-hidden lg:col-span-7">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Profiles</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row to preview</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((p) => {
                const isActive = p.id === activeId;
                const h = policyHealth(p, warehouses);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveId(p.id)}
                    className={cx("w-full px-4 py-4 text-left transition", isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{p.name}</div>
                          <Badge tone={p.status === "Active" ? "green" : "slate"}>{p.status}</Badge>
                          <Badge tone="slate">{p.serviceType}</Badge>
                          <Badge tone={h.tone}>{`Policy ${h.score}`}</Badge>
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(p.updatedAt)}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{p.id}</Badge>
                          <Badge tone="slate">{p.zones?.length || 0} zones</Badge>
                          <Badge tone="slate">{p.currency}</Badge>

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCopy(p.id);
                                pushToast({ title: "Copied", message: "Profile ID copied.", tone: "success" });
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
                                openEdit(p);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No profiles" message="Create a new shipping profile or clear filters." action={{ label: "New profile", onClick: openCreate }} />
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Preview + test */}
          <div className="lg:col-span-5">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Preview</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Zones, rates, lead time and warehouse policy.</div>
                </div>
                <Badge tone="orange">Premium</Badge>
              </div>

              {!active ? (
                <div className="mt-4">
                  <EmptyState title="Select a profile" message="Choose a profile from the list to preview details." />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Boxes className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{active.name}</div>
                          <Badge tone={active.status === "Active" ? "green" : "slate"}>{active.status}</Badge>
                          <span className="ml-auto"><Badge tone="slate">{active.currency}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Service type: {active.serviceType} · {active.zones.length} zones</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="slate">Policy mode: {active.policy?.mode || "auto"}</Badge>
                          <Badge tone="slate">Fallback: {active.policy?.fallbackWarehouseId || "-"}</Badge>
                          <Badge tone={policyHealth(active, warehouses).tone}>Policy score {policyHealth(active, warehouses).score}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zones */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Zones</div>
                      <span className="ml-auto"><Badge tone="slate">{active.zones.length}</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {active.zones.slice(0, 6).map((z) => (
                        <div key={z.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-black text-slate-900">{z.name}</div>
                            <Badge tone="slate">{z.id}</Badge>
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">{z.lead.minDays}-{z.lead.maxDays} days</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone="slate">Countries {z.countries.length}</Badge>
                            <Badge tone="slate">Pricing {z.pricing.mode}</Badge>
                            <Badge tone="slate">Base {fmtMoney(z.pricing.base, active.currency)}</Badge>
                            {z.pricing.mode === "weight" ? <Badge tone="slate">Per kg {fmtMoney(z.pricing.perKg, active.currency)}</Badge> : null}
                            {z.pricing.mode === "item" ? <Badge tone="slate">Per item {fmtMoney(z.pricing.perItem, active.currency)}</Badge> : null}
                          </div>
                        </div>
                      ))}
                      {active.zones.length > 6 ? <div className="text-[11px] font-semibold text-slate-500">More zones available in Edit.</div> : null}
                    </div>
                  </div>

                  {/* Test shipment */}
                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-700" />
                      <div className="text-sm font-black text-orange-900">Rate and routing preview</div>
                      <span className="ml-auto"><Badge tone="orange">Simulator</Badge></span>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <FieldLabel>Destination country</FieldLabel>
                        <input
                          value={testCountry}
                          onChange={(e) => setTestCountry(e.target.value)}
                          placeholder="Uganda"
                          className="mt-2 h-11 w-full rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <FieldLabel>Weight (kg)</FieldLabel>
                        <input
                          value={String(testWeight)}
                          onChange={(e) => setTestWeight(Number(e.target.value))}
                          className="mt-2 h-11 w-full rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <FieldLabel>Items</FieldLabel>
                        <input
                          value={String(testItems)}
                          onChange={(e) => setTestItems(Number(e.target.value))}
                          className="mt-2 h-11 w-full rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <FieldLabel>Buyer preferred warehouse (optional)</FieldLabel>
                        <div className="mt-2">
                          <SmallSelect value={buyerPrefWh} onChange={setBuyerPrefWh}>
                            <option value={""}>None</option>
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.code} - {w.name}
                              </option>
                            ))}
                          </SmallSelect>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-3xl border border-orange-200 bg-white dark:bg-slate-900/80 p-4">
                      {!testResult ? (
                        <div className="text-xs font-semibold text-slate-600">Select a profile first.</div>
                      ) : (
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="slate">Zone</Badge>
                            <div className="text-sm font-black text-slate-900">{testResult.zone ? testResult.zone.name : "No match"}</div>
                            <span className="ml-auto"><Badge tone="slate">{active.currency}</Badge></span>
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <MiniRow label="Estimated cost" value={testResult.cost != null ? fmtMoney(testResult.cost, active.currency) : "-"} strong />
                            <MiniRow label="Lead time" value={testResult.lead ? `${testResult.lead.minDays}-${testResult.lead.maxDays} days` : "-"} />
                          </div>

                          <div className="grid gap-2 md:grid-cols-2">
                            <MiniRow label="Warehouse" value={activeWh ? `${activeWh.code} (${activeWh.country})` : "-"} strong />
                            <MiniRow label="Reason" value={testResult.reason} />
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Saved", message: "Quote preview saved as a test case.", tone: "success" })}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <BadgeCheck className="h-4 w-4" />
                              Save test case
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const payload = { profileId: active.id, input: { testCountry, testWeight, testItems, buyerPrefWh }, output: testResult };
                                safeCopy(JSON.stringify(payload, null, 2));
                                pushToast({ title: "Copied", message: "Simulation payload copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                            >
                              <Copy className="h-4 w-4" />
                              Copy simulation
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-[11px] font-semibold text-orange-900/70">
                      Super premium: connect carrier APIs, dimensional weight, taxes, and SLA commitments.
                    </div>
                  </div>

                  {/* Policy summary */}
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Warehouse policy</div>
                      <span className="ml-auto"><Badge tone="slate">{active.policy?.mode || "auto"}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Rules choose the best warehouse for a zone. Buyer preference is optional.</div>

                    <div className="mt-3 space-y-2">
                      {(active.policy?.rules || []).slice(0, 4).map((r) => (
                        <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                          <div className="flex items-center gap-2">
                            <Badge tone="slate">P{r.priority}</Badge>
                            <div className="truncate text-xs font-black text-slate-900">{r.title}</div>
                            <span className="ml-auto"><Badge tone="slate">{r.then?.warehouseId}</Badge></span>
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">
                            If zone {r.when?.zoneId || "-"}{r.when?.country ? `, country ${r.when.country}` : ""}{Number.isFinite(r.when?.maxWeightKg) ? `, max ${r.when.maxWeightKg}kg` : ""}
                          </div>
                        </div>
                      ))}
                      {(active.policy?.rules || []).length === 0 ? (
                        <div className="text-xs font-semibold text-slate-500">No rules yet. Add rules in Edit.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer
        open={editorOpen}
        title={editorMode === "create" ? "Create shipping profile" : `Edit shipping profile · ${draft?.id || ""}`}
        subtitle="Wizard: Basics, Zones, Policy, Review."
        onClose={() => setEditorOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              "Basics",
              "Zones",
              "Policy",
              "Review",
            ].map((t) => (
              <SegTab key={t} label={t} active={editorStep === t} onClick={() => setEditorStep(t)} />
            ))}
            <span className="ml-auto">
              <Badge tone="slate">Role: {role}</Badge>
            </span>
          </div>

          <GlassCard className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={editorStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.16 }}
              >
                {editorStep === "Basics" ? (
                  <div className="grid gap-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Core details</div>
                        <span className="ml-auto"><Badge tone="slate">{draft?.id}</Badge></span>
                      </div>
                      <div className="mt-3 grid gap-3">
                        <div>
                          <FieldLabel>Profile name</FieldLabel>
                          <input
                            value={draft?.name || ""}
                            onChange={(e) => setDraft((s) => ({ ...s, name: e.target.value }))}
                            placeholder="Example: Standard Parcel Africa"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <FieldLabel>Status</FieldLabel>
                            <div className="mt-2">
                              <SmallSelect value={draft?.status || "Active"} onChange={(v) => setDraft((s) => ({ ...s, status: v }))}>
                                <option value="Active">Active</option>
                                <option value="Paused">Paused</option>
                              </SmallSelect>
                            </div>
                          </div>

                          <div>
                            <FieldLabel>Service type</FieldLabel>
                            <div className="mt-2">
                              <SmallSelect value={draft?.serviceType || "Parcel"} onChange={(v) => setDraft((s) => ({ ...s, serviceType: v }))}>
                                <option value="Parcel">Parcel</option>
                                <option value="Freight">Freight</option>
                                <option value="Express">Express</option>
                              </SmallSelect>
                            </div>
                          </div>

                          <div>
                            <FieldLabel>Currency</FieldLabel>
                            <div className="mt-2">
                              <SmallSelect value={draft?.currency || "USD"} onChange={(v) => setDraft((s) => ({ ...s, currency: v }))}>
                                <option value="USD">USD</option>
                                <option value="UGX">UGX</option>
                                <option value="KES">KES</option>
                                <option value="CNY">CNY</option>
                                <option value="EUR">EUR</option>
                              </SmallSelect>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                              <Info className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-black text-orange-900">Premium note</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">
                                Profiles can be shared for Seller and Provider roles. Use zones to control destination coverage.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {editorStep === "Zones" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={openZoneCreate}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Plus className="h-4 w-4" />
                        Add zone
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const sample: ShippingZone = {
                            id: `Z-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
                            name: "West Africa",
                            countries: ["Nigeria", "Ghana"],
                            pricing: { mode: "weight", base: 10, perKg: 1.6, perItem: 0 },
                            lead: { minDays: 4, maxDays: 9 },
                            notes: "Regional",
                          };
                          setDraft((s) => ({ ...s, zones: [sample, ...(s.zones || [])] }));
                          pushToast({ title: "Added", message: "Sample zone added.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Sparkles className="h-4 w-4" />
                        Add sample
                      </button>
                      <span className="ml-auto"><Badge tone="slate">{(draft?.zones || []).length} zones</Badge></span>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                        <div className="col-span-4">Zone</div>
                        <div className="col-span-3">Coverage</div>
                        <div className="col-span-3">Pricing + lead</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                      <div className="divide-y divide-slate-200/70">
                        {(draft?.zones || []).map((z) => (
                          <div key={z.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                            <div className="col-span-4 min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{z.name}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{z.id}</div>
                            </div>
                            <div className="col-span-3 flex items-center">
                              <Badge tone="slate">{(z.countries || []).length} countries</Badge>
                            </div>
                            <div className="col-span-3">
                              <div className="text-[11px] font-semibold text-slate-500">Mode: <span className="font-extrabold text-slate-800">{z.pricing?.mode}</span></div>
                              <div className="mt-1 text-[11px] font-semibold text-slate-500">Lead: <span className="font-extrabold text-slate-800">{z.lead?.minDays}-{z.lead?.maxDays}d</span></div>
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openZoneEdit(z)}
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                aria-label="Edit zone"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeZone(z.id)}
                                className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                                aria-label="Remove zone"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(draft?.zones || []).length === 0 ? (
                          <div className="p-5">
                            <EmptyState title="No zones" message="Add a zone to define pricing and lead time." action={{ label: "Add zone", onClick: openZoneCreate }} />
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Premium zone design</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                            <li>Use a tight set of zones to reduce confusion</li>
                            <li>Define lead time as a range and include processing time in the warehouse</li>
                            <li>Keep pricing models consistent (weight or per item) per marketplace</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {editorStep === "Policy" ? (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Multi-warehouse shipping policy</div>
                        <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Rules route shipments to the right warehouse based on zone and constraints.</div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <FieldLabel>Policy mode</FieldLabel>
                          <div className="mt-2">
                            <SmallSelect
                              value={draft?.policy?.mode || "auto"}
                              onChange={(v) => setDraft((s) => ({ ...s, policy: { ...(s.policy || {}), mode: v } }))}
                            >
                              <option value="auto">auto</option>
                              <option value="buyer_preferred">buyer preferred</option>
                              <option value="manual">manual</option>
                            </SmallSelect>
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">
                            buyer preferred respects the buyer's warehouse choice (if allowed).
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Fallback warehouse</FieldLabel>
                          <div className="mt-2">
                            <SmallSelect
                              value={draft?.policy?.fallbackWarehouseId || ""}
                              onChange={(v) => setDraft((s) => ({ ...s, policy: { ...(s.policy || {}), fallbackWarehouseId: v } }))}
                            >
                              {warehouses.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.code} - {w.name}
                                </option>
                              ))}
                            </SmallSelect>
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Used when no rules match.</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={addPolicyRule}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Plus className="h-4 w-4" />
                        Add rule
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // A useful starter set
                          const z = (draft?.zones || [])[0];
                          if (!z) {
                            pushToast({ title: "Add a zone first", message: "Create zones before adding starter rules.", tone: "warning" });
                            return;
                          }
                          setDraft((s) => {
                            const rules = [...(s.policy?.rules || [])];
                            const sample: PolicyRule = {
                              id: makeId("rule"),
                              priority: 10,
                              title: "Small parcels use Kampala",
                              when: { zoneId: z.id, maxWeightKg: 10 },
                              then: { warehouseId: "WH-UG-KLA" },
                            };
                            const sample2: PolicyRule = {
                              id: makeId("rule"),
                              priority: 20,
                              title: "Heavy items use Wuxi",
                              when: { zoneId: z.id, maxWeightKg: 999 },
                              then: { warehouseId: "WH-CN-WUXI" },
                            };
                            return { ...s, policy: { ...(s.policy || {}), rules: [...rules, sample, sample2] } };
                          });
                          pushToast({ title: "Starter rules added", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Sparkles className="h-4 w-4" />
                        Starter set
                      </button>
                      <span className="ml-auto"><Badge tone="slate">{(draft?.policy?.rules || []).length} rules</Badge></span>
                    </div>

                    <div className="space-y-2">
                      {(draft?.policy?.rules || [])
                        .slice()
                        .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))
                        .map((r) => (
                          <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-start gap-3">
                              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                <MapPin className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge tone="slate">P{r.priority}</Badge>
                                  <input
                                    value={r.title || ""}
                                    onChange={(e) => updateRule(r.id, { title: e.target.value })}
                                    className="h-10 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                  />
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <div>
                                    <FieldLabel>When zone</FieldLabel>
                                    <div className="mt-2">
                                      <SmallSelect
                                        value={r.when?.zoneId || ""}
                                        onChange={(v) => updateRule(r.id, { when: { ...(r.when || {}), zoneId: v } })}
                                      >
                                        <option value={""}>Select zone</option>
                                        {(draft?.zones || []).map((z) => (
                                          <option key={z.id} value={z.id}>
                                            {z.name} ({z.id})
                                          </option>
                                        ))}
                                      </SmallSelect>
                                    </div>
                                  </div>

                                  <div>
                                    <FieldLabel>Optional country match</FieldLabel>
                                    <input
                                      value={r.when?.country || ""}
                                      onChange={(e) => updateRule(r.id, { when: { ...(r.when || {}), country: e.target.value } })}
                                      placeholder="Kenya"
                                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <FieldLabel>Max weight (kg)</FieldLabel>
                                    <input
                                      value={String(Number.isFinite(r.when?.maxWeightKg) ? r.when.maxWeightKg : "")}
                                      onChange={(e) => updateRule(r.id, { when: { ...(r.when || {}), maxWeightKg: e.target.value === "" ? undefined : Number(e.target.value) } })}
                                      placeholder="10"
                                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <FieldLabel>Then use warehouse</FieldLabel>
                                    <div className="mt-2">
                                      <SmallSelect
                                        value={r.then?.warehouseId || ""}
                                        onChange={(v) => updateRule(r.id, { then: { ...(r.then || {}), warehouseId: v } })}
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
                                    <FieldLabel>Priority</FieldLabel>
                                    <input
                                      value={String(r.priority || 0)}
                                      onChange={(e) => updateRule(r.id, { priority: Number(e.target.value) })}
                                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                    />
                                  </div>

                                  <div className="flex items-end justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => bumpRule(r.id, -1)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <ArrowRight className="h-4 w-4 -rotate-90" />
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => bumpRule(r.id, 1)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <ArrowRight className="h-4 w-4 rotate-90" />
                                      Down
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteRule(r.id)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                                    >
                                      <X className="h-4 w-4" />
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 text-[11px] font-semibold text-slate-500">
                                  Tip: keep priorities spaced (10, 20, 30) so you can insert rules later.
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                      {(draft?.policy?.rules || []).length === 0 ? (
                        <EmptyState title="No rules yet" message="Add at least one rule, or rely on fallback warehouse." action={{ label: "Add rule", onClick: addPolicyRule }} />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {editorStep === "Review" ? (
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Review</div>
                        <span className="ml-auto"><Badge tone={policyHealth(draft, warehouses).tone}>Policy {policyHealth(draft, warehouses).score}</Badge></span>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <MiniRow label="Name" value={draft?.name || "-"} strong />
                        <MiniRow label="Status" value={draft?.status || "-"} />
                        <MiniRow label="Service type" value={draft?.serviceType || "-"} />
                        <MiniRow label="Currency" value={draft?.currency || "-"} />
                        <MiniRow label="Zones" value={(draft?.zones || []).length} />
                        <MiniRow label="Policy rules" value={(draft?.policy?.rules || []).length} />
                      </div>

                      <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Preflight checklist</div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                              <li>At least 1 zone with pricing and lead time</li>
                              <li>Fallback warehouse selected</li>
                              <li>Rules target existing warehouses</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={saveDraft}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(JSON.stringify(draft, null, 2));
                            pushToast({ title: "Copied", message: "Draft JSON copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy draft
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditorOpen(false)}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <X className="h-4 w-4" />
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </GlassCard>

          {/* Sticky footer for steps other than Review */}
          {editorStep !== "Review" ? (
            <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const order = ["Basics", "Zones", "Policy", "Review"];
                    const idx = order.indexOf(editorStep);
                    setEditorStep(order[Math.max(0, idx - 1)]);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const order = ["Basics", "Zones", "Policy", "Review"];
                    const idx = order.indexOf(editorStep);
                    setEditorStep(order[Math.min(order.length - 1, idx + 1)]);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Zone modal */}
        <ZoneModal
          open={zoneModalOpen}
          onClose={() => setZoneModalOpen(false)}
          title={zoneMode === "create" ? "Add zone" : `Edit zone · ${zoneDraft?.id || ""}`}
          zoneDraft={zoneDraft}
          setZoneDraft={setZoneDraft}
          onSave={saveZone}
          currency={draft?.currency || "USD"}
          pushToast={pushToast}
        />
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function MiniRow({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-800")}>{String(value)}</div>
    </div>
  );
}

function AwareEmpty() {
  return <span className="text-xs font-semibold text-slate-400">-</span>;
}

function ZoneModal({ open, onClose, title, zoneDraft, setZoneDraft, onSave, currency, pushToast }) {
  const presets = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana", "South Africa", "China", "United States", "United Kingdom", "Germany", "France"];

  const addCountry = (c) => {
    const v = String(c || "").trim();
    if (!v) return;
    setZoneDraft((s) => {
      const cur = new Set((s.countries || []).map((x) => String(x).trim()).filter(Boolean));
      cur.add(v);
      return { ...s, countries: Array.from(cur) };
    });
  };

  const removeCountry = (c) => {
    setZoneDraft((s) => ({ ...s, countries: (s.countries || []).filter((x) => String(x) !== String(c)) }));
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] bg-black/35 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[100] max-h-[90vh] w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Define coverage, pricing model and lead time.</div>
                </div>
                <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {!zoneDraft ? null : (
                  <div className="grid gap-3">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Zone name</div>
                      <input
                        value={zoneDraft.name || ""}
                        onChange={(e) => setZoneDraft((s) => ({ ...s, name: e.target.value }))}
                        placeholder="Example: East Africa"
                        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Countries</div>
                        <span className="ml-auto"><Badge tone="slate">{(zoneDraft.countries || []).length}</Badge></span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {presets.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => addCountry(c)}
                            className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                          >
                            + {c}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(zoneDraft.countries || []).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => removeCountry(c)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800"
                          >
                            {c}
                            <X className="h-4 w-4" />
                          </button>
                        ))}
                        {(zoneDraft.countries || []).length === 0 ? (
                          <div className="text-xs font-semibold text-slate-500">Add at least one country.</div>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <div className="text-[11px] font-extrabold text-slate-600">Add via comma list</div>
                        <input
                          placeholder="Uganda, Kenya, Tanzania"
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const txt = String(e.currentTarget.value || "");
                              txt.split(",").map((x) => x.trim()).filter(Boolean).forEach(addCountry);
                              e.currentTarget.value = "";
                              pushToast({ title: "Countries added", tone: "success" });
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Boxes className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Pricing</div>
                          <span className="ml-auto"><Badge tone="slate">{currency}</Badge></span>
                        </div>

                        <div className="mt-3 grid gap-3">
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Pricing mode</div>
                            <div className="mt-2">
                              <SmallSelect
                                value={zoneDraft.pricing?.mode || "weight"}
                                onChange={(v) => setZoneDraft((s) => ({ ...s, pricing: { ...(s.pricing || {}), mode: v } }))}
                              >
                                <option value="weight">weight</option>
                                <option value="item">per item</option>
                                <option value="flat">flat</option>
                              </SmallSelect>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600">Base</div>
                              <input
                                value={String(zoneDraft.pricing?.base ?? 0)}
                                onChange={(e) => setZoneDraft((s) => ({ ...s, pricing: { ...(s.pricing || {}), base: Number(e.target.value) } }))}
                                className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                              />
                            </div>

                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600">Per kg</div>
                              <input
                                disabled={(zoneDraft.pricing?.mode || "weight") !== "weight"}
                                value={String(zoneDraft.pricing?.perKg ?? 0)}
                                onChange={(e) => setZoneDraft((s) => ({ ...s, pricing: { ...(s.pricing || {}), perKg: Number(e.target.value) } }))}
                                className={cx(
                                  "mt-2 h-11 w-full rounded-2xl border bg-white dark:bg-slate-900 px-3 text-sm font-semibold outline-none",
                                  (zoneDraft.pricing?.mode || "weight") !== "weight" ? "border-slate-100 text-slate-400" : "border-slate-200/70 text-slate-800"
                                )}
                              />
                            </div>

                            <div>
                              <div className="text-[11px] font-extrabold text-slate-600">Per item</div>
                              <input
                                disabled={(zoneDraft.pricing?.mode || "weight") !== "item"}
                                value={String(zoneDraft.pricing?.perItem ?? 0)}
                                onChange={(e) => setZoneDraft((s) => ({ ...s, pricing: { ...(s.pricing || {}), perItem: Number(e.target.value) } }))}
                                className={cx(
                                  "mt-2 h-11 w-full rounded-2xl border bg-white dark:bg-slate-900 px-3 text-sm font-semibold outline-none",
                                  (zoneDraft.pricing?.mode || "weight") !== "item" ? "border-slate-100 text-slate-400" : "border-slate-200/70 text-slate-800"
                                )}
                              />
                            </div>

                            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-3">
                              <div className="text-[11px] font-extrabold text-orange-900">Preview</div>
                              <div className="mt-1 text-xs font-semibold text-orange-900/70">Example 2 items, 5kg</div>
                              <div className="mt-2 text-sm font-black text-orange-900">
                                {fmtMoney(computeZoneCost(zoneDraft, 5, 2) || 0, currency)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Lead time</div>
                          <span className="ml-auto"><Badge tone="slate">days</Badge></span>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Min</div>
                            <input
                              value={String(zoneDraft.lead?.minDays ?? 0)}
                              onChange={(e) => setZoneDraft((s) => ({ ...s, lead: { ...(s.lead || {}), minDays: Number(e.target.value) } }))}
                              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                          <div>
                            <div className="text-[11px] font-extrabold text-slate-600">Max</div>
                            <input
                              value={String(zoneDraft.lead?.maxDays ?? 0)}
                              onChange={(e) => setZoneDraft((s) => ({ ...s, lead: { ...(s.lead || {}), maxDays: Number(e.target.value) } }))}
                              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="text-[11px] font-extrabold text-slate-600">Notes</div>
                          <textarea
                            value={zoneDraft.notes || ""}
                            onChange={(e) => setZoneDraft((s) => ({ ...s, notes: e.target.value }))}
                            rows={3}
                            className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                          />
                        </div>

                        <div className="mt-3 text-[11px] font-semibold text-slate-500">Premium: add cut-off time overrides per zone and carrier service codes.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onSave}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    Save zone
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
