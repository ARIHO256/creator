import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accessibility,
  Check,
  ChevronDown,
  Copy,
  DollarSign,
  Globe,
  LayoutGrid,
  Monitor,
  Moon,
  Palette,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { LANGUAGE_OPTIONS } from "../../localization/config";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Preferences (Previewable)
 * Route: /settings/preferences
 * Core: language, currency, UI settings
 * Super premium: role-based workspace preferences
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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

function SegTab({ label, active, onClick }) {
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
      {label}
    </button>
  );
}

function Toggle({ value, onChange, label, hint }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      <div className="min-w-0">
        <div className="text-sm font-black text-slate-900">{label}</div>
        {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
      </div>
      <span
        className={cx(
          "relative inline-flex h-7 w-12 items-center rounded-full border transition",
          value ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900"
        )}
      >
        <span
          className={cx(
            "inline-block h-5 w-5 translate-x-1 rounded-full bg-slate-900/10 transition",
            value && "translate-x-6 bg-emerald-600"
          )}
        />
      </span>
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SelectField({ value, onChange, options, icon: Icon, placeholder = "", tone = "light" }) {
  return (
    <div className={cx("flex items-center gap-2 rounded-2xl border px-3 py-2", tone === "dark" ? "border-white/20 bg-white dark:bg-slate-900/10" : "border-slate-200/70 bg-white dark:bg-slate-900")}> 
      {Icon ? <Icon className={cx("h-4 w-4", tone === "dark" ? "text-white/80" : "text-slate-600")} /> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "h-9 w-full appearance-none bg-transparent pr-8 text-sm font-extrabold outline-none",
          tone === "dark" ? "text-white" : "text-slate-800"
        )}
      >
        {placeholder ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={cx("h-4 w-4", tone === "dark" ? "text-white/70" : "text-slate-400")} />
    </div>
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
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                  </button>
                ) : null}
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

const LANGS = LANGUAGE_OPTIONS.map((option) => ({ label: option.label, value: option.code }));

const CURRENCIES = [
  { label: "UGX", value: "UGX" },
  { label: "USD", value: "USD" },
  { label: "CNY", value: "CNY" },
  { label: "KES", value: "KES" },
  { label: "EUR", value: "EUR" },
  { label: "NGN", value: "NGN" },
];

const THEMES = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const DENSITY = [
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" },
  { label: "Dense", value: "dense" },
];

const ROLES = [
  { label: "Seller", value: "seller" },
  { label: "Provider", value: "provider" },
  { label: "Ops", value: "ops" },
  { label: "Finance", value: "finance" },
  { label: "Desk", value: "desk" },
  { label: "Support", value: "support" },
];

const HOME_ROUTES = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "Orders", value: "/orders" },
  { label: "Listings", value: "/listings" },
  { label: "Wholesale RFQs", value: "/wholesale/rfq" },
  { label: "Provider Reviews", value: "/provider/reviews" },
  { label: "Ops Returns", value: "/ops/returns" },
  { label: "Finance Wallets", value: "/finance/wallets" },
  { label: "Regulatory Desks", value: "/regulatory" },
];

function defaultPrefs() {
  return {
    language: "en",
    currency: "UGX",
    theme: "system",
    density: "comfortable",
    animations: true,
    reduceMotion: false,
    largeText: false,
    stickyHeader: true,
    compactSidebar: false,
  };
}

function defaultWorkspaces() {
  const base = {};
  ROLES.forEach((r) => {
    base[r.value] = {
      home: r.value === "seller" ? "/dashboard" : r.value === "provider" ? "/provider/service-command" : "/dashboard",
      startOnLast: true,
      showAdvanced: r.value !== "support",
      defaultFilters: r.value === "seller" ? "Orders: New + At Risk" : r.value === "provider" ? "Reviews: Unreplied" : "Default",
      pinned: r.value === "seller" ? ["Orders", "Listings", "Wholesale"] : r.value === "provider" ? ["Bookings", "Reviews", "Quotes"] : ["Status Center"],
      quickActions: r.value === "seller" ? ["Create listing", "Draft quote", "Export"] : r.value === "provider" ? ["New quote", "Reply reviews", "Schedule"] : ["Open queue", "Export", "Audit"],
    };
  });
  return base;
}

export default function PreferencesPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Core");
  const [prefs, setPrefs] = useState(() => defaultPrefs());
  const [workspaces, setWorkspaces] = useState(() => defaultWorkspaces());
  const [activeRole, setActiveRole] = useState("seller");
  const [loading, setLoading] = useState(true);

  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prefPayload, uiPayload] = await Promise.all([
          sellerBackendApi.getPreferences().catch(() => ({})),
          sellerBackendApi.getUiState().catch(() => ({})),
        ]);
        if (cancelled) return;
        const uiPrefs =
          uiPayload && typeof uiPayload === "object" && uiPayload.preferences && typeof uiPayload.preferences === "object"
            ? (uiPayload.preferences as Record<string, unknown>)
            : {};
        const uiWorkspaces =
          uiPayload && typeof uiPayload === "object" && uiPayload.workspaces && typeof uiPayload.workspaces === "object"
            ? (uiPayload.workspaces as Record<string, unknown>)
            : {};
        setPrefs({
          ...defaultPrefs(),
          ...uiPrefs,
          language: String(uiPrefs.language ?? prefPayload.locale ?? defaultPrefs().language),
          currency: String(uiPrefs.currency ?? prefPayload.currency ?? defaultPrefs().currency),
        });
        setWorkspaces({
          ...defaultWorkspaces(),
          ...uiWorkspaces,
        });
      } catch {
        if (!cancelled) {
          pushToast({ title: "Backend unavailable", message: "Loaded default preferences.", tone: "warning" });
        }
      } finally {
        if (!cancelled) {
          dirtyRef.current = false;
          setDirty(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dirtyRef.current) return;
    setDirty(true);
  }, [prefs, workspaces]);

  const markDirty = () => {
    dirtyRef.current = true;
    setDirty(true);
  };

  const saveAll = () => {
    void Promise.all([
      sellerBackendApi.patchPreferences({
        locale: prefs.language,
        currency: prefs.currency,
      }),
      sellerBackendApi.patchUiState({
        preferences: prefs,
        workspaces,
      }),
    ])
      .then(() => {
        setDirty(false);
        dirtyRef.current = false;
        pushToast({ title: "Preferences saved", message: "Persisted to seller settings.", tone: "success" });
      })
      .catch(() => {
        pushToast({ title: "Save failed", message: "Could not update backend settings.", tone: "danger" });
      });
  };

  const resetAll = () => {
    setPrefs(defaultPrefs());
    setWorkspaces(defaultWorkspaces());
    dirtyRef.current = true;
    setDirty(true);
    pushToast({ title: "Reset ready", message: "Defaults loaded. Click Save to apply.", tone: "warning" });
  };

  const roleCfg = workspaces[activeRole] || defaultWorkspaces()[activeRole];

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Preferences</div>
                <Badge tone="slate">/settings/preferences</Badge>
                <Badge tone="slate">Settings</Badge>
                <Badge tone="orange">Super premium</Badge>
                {dirty ? <Badge tone="orange">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Language, currency, UI preferences, plus role-based workspaces.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify({ prefs, workspaces }, null, 2));
                  pushToast({ title: "Copied", message: "Preferences JSON copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-50"
              >
                <X className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={saveAll}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {["Core", "Workspaces"].map((t) => (
              <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
            ))}
            <span className="ml-auto"><Badge tone="slate">{loading ? "Loading backend" : "Backend persisted"}</Badge></span>
          </div>
        </div>

        {/* Core */}
        {tab === "Core" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-7">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Core preferences</div>
                <span className="ml-auto"><Badge tone="slate">Account-level</Badge></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">These apply across devices unless overridden by a role workspace.</div>

              <div className="mt-4 grid gap-3">
                <Row label="Language">
                  <SelectField
                    value={prefs.language}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, language: v }));
                      markDirty();
                    }}
                    options={LANGS}
                    icon={Globe}
                  />
                </Row>

                <Row label="Currency">
                  <SelectField
                    value={prefs.currency}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, currency: v }));
                      markDirty();
                    }}
                    options={CURRENCIES}
                    icon={DollarSign}
                  />
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">
                    Note: pricing display can still vary by listing origin and buyer region.
                  </div>
                </Row>

                <div className="grid gap-3 md:grid-cols-2">
                  <Row label="Theme">
                    <SelectField
                      value={prefs.theme}
                      onChange={(v) => {
                        setPrefs((s) => ({ ...s, theme: v }));
                        markDirty();
                      }}
                      options={THEMES}
                      icon={prefs.theme === "dark" ? Moon : prefs.theme === "light" ? Sun : Monitor}
                    />
                  </Row>

                  <Row label="Density">
                    <SelectField
                      value={prefs.density}
                      onChange={(v) => {
                        setPrefs((s) => ({ ...s, density: v }));
                        markDirty();
                      }}
                      options={DENSITY}
                      icon={LayoutGrid}
                    />
                  </Row>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    value={prefs.animations}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, animations: v }));
                      markDirty();
                    }}
                    label="Animations"
                    hint="Smooth transitions and micro-interactions"
                  />

                  <Toggle
                    value={prefs.reduceMotion}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, reduceMotion: v }));
                      markDirty();
                    }}
                    label="Reduce motion"
                    hint="Accessibility preference for minimal motion"
                  />

                  <Toggle
                    value={prefs.largeText}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, largeText: v }));
                      markDirty();
                    }}
                    label="Large text"
                    hint="Increase text size across the UI"
                  />

                  <Toggle
                    value={prefs.stickyHeader}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, stickyHeader: v }));
                      markDirty();
                    }}
                    label="Sticky header"
                    hint="Keep top navigation visible while scrolling"
                  />

                  <Toggle
                    value={prefs.compactSidebar}
                    onChange={(v) => {
                      setPrefs((s) => ({ ...s, compactSidebar: v }));
                      markDirty();
                    }}
                    label="Compact sidebar"
                    hint="Prefer icon-first navigation"
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-5">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Preview</div>
                <span className="ml-auto"><Badge tone="slate">UI</Badge></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">A quick preview of how your settings impact the interface.</div>

              <div className="mt-4 space-y-3">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <Accessibility className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">Accessibility summary</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Based on your toggles</div>
                    </div>
                    <span className="ml-auto"><Badge tone={prefs.reduceMotion ? "orange" : "green"}>{prefs.reduceMotion ? "Reduced" : "Standard"}</Badge></span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="slate">Theme: {prefs.theme}</Badge>
                    <Badge tone="slate">Density: {prefs.density}</Badge>
                    <Badge tone="slate">Text: {prefs.largeText ? "Large" : "Default"}</Badge>
                    <Badge tone="slate">Animations: {prefs.animations ? "On" : "Off"}</Badge>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Role-based workspaces let each role have its own home page, pinned modules and defaults.</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTab("Workspaces");
                    pushToast({ title: "Opened workspaces", message: "Configure per-role defaults.", tone: "default" });
                  }}
                  className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  Configure workspaces
                </button>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {/* Workspaces */}
        {tab === "Workspaces" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Role workspaces</div>
                <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Pick a role, then customize its default workspace behavior.</div>

              <div className="mt-4 grid gap-2">
                {ROLES.map((r) => {
                  const active = activeRole === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setActiveRole(r.value)}
                      className={cx(
                        "flex items-center gap-3 rounded-3xl border p-4 text-left transition",
                        active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <span className={cx("grid h-11 w-11 place-items-center rounded-2xl", active ? "bg-white dark:bg-slate-900 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        <User className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">{r.label}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Home: {(workspaces[r.value]?.home || "/dashboard")}</div>
                      </div>
                      <Badge tone={active ? "green" : "slate"}>{active ? "Editing" : ""}</Badge>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-sm font-black text-slate-900">Global actions</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Copy a workspace configuration or apply across roles.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const from = activeRole;
                      const next = { ...workspaces };
                      ROLES.forEach((r) => {
                        if (r.value !== from) next[r.value] = { ...next[from] };
                      });
                      setWorkspaces(next);
                      markDirty();
                      pushToast({ title: "Applied to all roles", message: `Copied from ${from}.`, tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    Apply to all
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const json = JSON.stringify(roleCfg, null, 2);
                      safeCopy(json);
                      pushToast({ title: "Copied", message: "Workspace JSON copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy role
                  </button>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-7">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Workspace editor</div>
                <span className="ml-auto"><Badge tone="slate">{activeRole}</Badge></span>
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Define defaults for this role. These can override core UI choices.</div>

              <div className="mt-4 grid gap-3">
                <Row label="Default home route">
                  <SelectField
                    value={roleCfg.home}
                    onChange={(v) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), home: v },
                      }));
                      markDirty();
                    }}
                    options={HOME_ROUTES}
                    icon={Globe}
                  />
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Tip: keep roles focused. Example: Finance starts on Wallets.</div>
                </Row>

                <div className="grid gap-3 md:grid-cols-2">
                  <Toggle
                    value={!!roleCfg.startOnLast}
                    onChange={(v) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), startOnLast: v },
                      }));
                      markDirty();
                    }}
                    label="Start on last visited page"
                    hint="Overrides the home route when enabled"
                  />

                  <Toggle
                    value={!!roleCfg.showAdvanced}
                    onChange={(v) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), showAdvanced: v },
                      }));
                      markDirty();
                    }}
                    label="Show advanced tools"
                    hint="Power controls and expert shortcuts"
                  />
                </div>

                <Row label="Default filters (text)">
                  <input
                    value={roleCfg.defaultFilters || ""}
                    onChange={(e) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), defaultFilters: e.target.value },
                      }));
                      markDirty();
                    }}
                    placeholder="Example: Orders: At Risk, Unshipped"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Wire this to each module's saved views later.</div>
                </Row>

                <Row label="Pinned modules">
                  <TagEditor
                    value={roleCfg.pinned || []}
                    placeholder="Add a module name"
                    onChange={(next) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), pinned: next },
                      }));
                      markDirty();
                    }}
                  />
                </Row>

                <Row label="Quick actions">
                  <TagEditor
                    value={roleCfg.quickActions || []}
                    placeholder="Add an action name"
                    onChange={(next) => {
                      setWorkspaces((s) => ({
                        ...s,
                        [activeRole]: { ...(s[activeRole] || {}), quickActions: next },
                      }));
                      markDirty();
                    }}
                  />
                </Row>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium ideas</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                        <li>Per-role default dashboards and widgets</li>
                        <li>Per-role shortcut drawer and command palette presets</li>
                        <li>Per-role notification routing rules and SLA views</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...workspaces, [activeRole]: defaultWorkspaces()[activeRole] };
                      setWorkspaces(next);
                      markDirty();
                      pushToast({ title: "Role reset", message: "Defaults loaded for this role.", tone: "warning" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700 hover:bg-orange-50"
                  >
                    <X className="h-4 w-4" />
                    Reset role
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      pushToast({
                        title: "Where this is used",
                        message: "Apply home route, pinned modules and quick actions inside your AppShell.",
                        tone: "default",
                        action: { label: "Copy route", onClick: () => safeCopy("/settings/preferences") },
                      });
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <InfoPill />
                    Integration note
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </div>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function InfoPill() {
  return (
    <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-100 text-slate-700">
      <span className="text-[10px] font-black">i</span>
    </span>
  );
}

function TagEditor({ value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    const next = Array.from(new Set([...(value || []), t]));
    onChange(next);
    setDraft("");
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="flex flex-wrap gap-2">
        {(value || []).map((t) => (
          <span key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800">
            {t}
            <button
              type="button"
              onClick={() => onChange((value || []).filter((x) => x !== t))}
              className="grid h-5 w-5 place-items-center rounded-full border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-10 flex-1 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: TOKENS.green }}
        >
          <Check className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="mt-2 text-[11px] font-semibold text-slate-500">Press Enter to add quickly.</div>
    </div>
  );
}
