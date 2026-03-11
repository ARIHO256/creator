import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  AtSign,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Filter,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Notification Preferences (Previewable)
 * Route: /settings/notification-preferences
 * Core:
 * - Category toggles
 * - Channel preferences
 * Super premium:
 * - Rule engine
 * - Digest mode
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type ChannelKey = "inApp" | "email" | "sms" | "whatsapp";
type ChannelMap = Record<ChannelKey, boolean>;
type Category = {
  key: string;
  label: string;
  desc: string;
  critical: boolean;
  enabled: boolean;
  channels: ChannelMap;
};
type ChannelProfile = { enabled: boolean; address?: string; number?: string; verified?: boolean };
type ChannelProfiles = { email: ChannelProfile; sms: ChannelProfile; whatsapp: ChannelProfile; inApp: ChannelProfile };
type QuietHours = { enabled: boolean; start: string; end: string; days: string[]; bypassCritical: boolean };
type DigestSettings = {
  enabled: boolean;
  mode: "Daily" | "Weekdays" | "Weekly";
  time: string;
  channels: ChannelMap;
  includeCategories: string[];
  includePreview: boolean;
  instantForCritical: boolean;
};
type RulePriority = "High" | "Normal" | "Low";
type RuleDelivery = "Instant" | "Digest";
type Rule = {
  id: string;
  enabled: boolean;
  name: string;
  priority: RulePriority;
  trigger: { category: string; event: string };
  conditions: { severity: "High" | "Medium" | "Low" | "Any"; keyword: string };
  action: { delivery: RuleDelivery; channels: ChannelMap; throttleMins: number; bypassQuietHours: boolean };
};
type PrefsState = {
  globalChannels: ChannelMap;
  categories: Category[];
  channelProfiles: ChannelProfiles;
  quietHours: QuietHours;
  digest: DigestSettings;
  rules: Rule[];
};

const STORAGE_KEY = "evzone_notification_preferences_demo_v1";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function parseTimeToMinutes(value: string) {
  const m = String(value || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fmtTimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "orange" | "danger" }) {
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
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition",
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  disabled = false,
  size = "md",
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  ariaLabel: string;
}) {
  const h = size === "sm" ? 18 : 22;
  const w = size === "sm" ? 34 : 42;
  const dot = size === "sm" ? 14 : 18;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      className={cx(
        "relative inline-flex items-center rounded-full border transition",
        disabled ? "cursor-not-allowed opacity-50" : "hover:opacity-95"
      )}
      style={{
        height: h,
        width: w,
        borderColor: "rgba(148,163,184,0.45)",
        background: checked ? TOKENS.green : "rgba(255,255,255,0.9)",
      }}
    >
      <span
        className="absolute rounded-full bg-white dark:bg-slate-900 shadow"
        style={{
          width: dot,
          height: dot,
          left: checked ? w - dot - 2 : 2,
          top: (h - dot) / 2,
          transition: "left 160ms ease",
        }}
      />
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }) {
  const activeCls =
    tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
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
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function createDefaultPreferencesState(): PrefsState {
  return {
    globalChannels: {
      inApp: false,
      email: false,
      sms: false,
      whatsapp: false,
    },
    categories: [],
    channelProfiles: {
      email: { enabled: false, address: "", verified: false },
      sms: { enabled: false, number: "", verified: false },
      whatsapp: { enabled: false, number: "", verified: false },
      inApp: { enabled: false },
    },
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "07:00",
      days: [],
      bypassCritical: false,
    },
    digest: {
      enabled: false,
      mode: "Daily",
      time: "18:00",
      channels: { email: false, inApp: false, whatsapp: false, sms: false },
      includeCategories: [],
      includePreview: false,
      instantForCritical: false,
    },
    rules: [],
  };
}

function summarizeRule(r: Rule) {
  const trig = `${r.trigger.category}.${r.trigger.event}`;
  const actionCh = Object.entries(r.action.channels)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");
  return `${trig} → ${r.action.delivery} via ${actionCh || "none"}`;
}

function eventOptionsForCategory(catKey: string) {
  const map = {
    mentions: [
      { value: "mention", label: "Mention" },
      { value: "assignment", label: "Assignment" },
    ],
    orders: [
      { value: "new_order", label: "New order" },
      { value: "sla_risk", label: "SLA risk" },
      { value: "cancelled", label: "Cancelled" },
    ],
    rfqs: [
      { value: "new", label: "New RFQ" },
      { value: "new_urgent", label: "New RFQ (urgent)" },
      { value: "clarification", label: "Clarification requested" },
    ],
    quotes: [
      { value: "approved", label: "Quote approved" },
      { value: "rejected", label: "Quote rejected" },
      { value: "revision", label: "Revision requested" },
    ],
    finance: [
      { value: "payout_scheduled", label: "Payout scheduled" },
      { value: "hold_applied", label: "Hold applied" },
      { value: "invoice_paid", label: "Invoice paid" },
    ],
    mldz: [
      { value: "live_starting", label: "Live starting" },
      { value: "adz_spike", label: "Adz performance spike" },
      { value: "creator_invite", label: "Creator invite" },
    ],
    system: [
      { value: "security_alert", label: "Security alert" },
      { value: "policy_update", label: "Policy update" },
      { value: "maintenance", label: "Maintenance" },
    ],
  };
  return map[catKey] || [{ value: "event", label: "Event" }];
}

export default function NotificationPreferencesPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [dirty, setDirty] = useState(false);

  const [prefs, setAll] = useState<PrefsState>(createDefaultPreferencesState());
  const { globalChannels, categories, channelProfiles, quietHours, digest, rules } = prefs;
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getNotificationPreferences();
        if (!active) return;
        const next = (payload.metadata || payload) as Partial<PrefsState>;
        const defaults = createDefaultPreferencesState();
        setAll({
          ...defaults,
          ...next,
          globalChannels: { ...defaults.globalChannels, ...(next.globalChannels || {}) },
          channelProfiles: { ...defaults.channelProfiles, ...(next.channelProfiles || {}) },
          quietHours: { ...defaults.quietHours, ...(next.quietHours || {}) },
          digest: { ...defaults.digest, ...(next.digest || {}) },
          categories: Array.isArray(next.categories) ? next.categories as PrefsState["categories"] : defaults.categories,
          rules: Array.isArray(next.rules) ? next.rules as PrefsState["rules"] : defaults.rules,
        });
      } catch {
        if (!active) return;
        pushToast({ title: "Notifications unavailable", message: "Could not load notification preferences.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const snapshotRef = useRef<string | null>(null);
  useEffect(() => {
    // initialize baseline snapshot
    if (!snapshotRef.current) snapshotRef.current = JSON.stringify({ globalChannels, categories, channelProfiles, quietHours, digest, rules });
  }, []);

  const markDirty = () => setDirty(true);

  const saveAll = async () => {
    const payload = { globalChannels, categories, channelProfiles, quietHours, digest, rules };
    try {
      await sellerBackendApi.patchNotificationPreferences({ metadata: payload });
      setAll(payload);
      snapshotRef.current = JSON.stringify(payload);
      setDirty(false);
      pushToast({ title: "Preferences saved", message: "Your notification settings were updated.", tone: "success" });
    } catch {
      pushToast({ title: "Save failed", message: "Could not update notification preferences.", tone: "danger" });
    }
  };

  const restoreDefaults = () => {
    const next = createDefaultPreferencesState();
    setAll(next);
    setDirty(true);
    pushToast({ title: "Defaults restored", message: "Review and save to apply.", tone: "default" });
  };

  const exportJson = () => {
    safeCopy(JSON.stringify({ globalChannels, categories, channelProfiles, quietHours, digest, rules }, null, 2));
    pushToast({ title: "Copied", message: "Preferences JSON copied.", tone: "success" });
  };

  const enabledCategoriesCount = useMemo(() => categories.filter((c) => c.enabled).length, [categories]);
  const enabledRulesCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  const effectiveCategoryChannels = (catKey) => {
    const c = categories.find((x) => x.key === catKey);
    if (!c) return { inApp: false, email: false, sms: false, whatsapp: false };
    const eff = {};
    ["inApp", "email", "sms", "whatsapp"].forEach((ch) => {
      const globalOn = !!globalChannels[ch] && !!channelProfiles[ch]?.enabled;
      eff[ch] = !!c.enabled && globalOn && !!c.channels[ch];
    });
    return eff;
  };

  const activeChannelsCount = useMemo(() => {
    const channels = ["inApp", "email", "sms", "whatsapp"].filter((k) => globalChannels[k] && channelProfiles[k]?.enabled !== false);
    return channels.length;
  }, [globalChannels, channelProfiles]);

  // ---------- Rule engine drawer ----------
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [ruleStep, setRuleStep] = useState(1);
  const [ruleDraft, setRuleDraft] = useState<Rule | null>(null);

  const updateRuleDraft = (updater: (prev: Rule) => Rule) => {
    setRuleDraft((d) => (d ? updater(d) : d));
  };

  const openNewRule = () => {
    const firstCat = categories[0]?.key || "orders";
    const ev = eventOptionsForCategory(firstCat)[0]?.value || "event";

    setEditRuleId(null);
    setRuleStep(1);
    setRuleDraft({
      id: makeId("rule"),
      enabled: true,
      name: "",
      priority: "Normal",
      trigger: { category: firstCat, event: ev },
      conditions: { severity: "Any", keyword: "" },
      action: {
        delivery: "Instant",
        channels: { inApp: true, email: false, sms: false, whatsapp: false },
        throttleMins: 30,
        bypassQuietHours: false,
      },
    });
    setRuleDrawerOpen(true);
  };

  const openEditRule = (id) => {
    const r = rules.find((x) => x.id === id);
    if (!r) return;
    setEditRuleId(id);
    setRuleStep(1);
    setRuleDraft(JSON.parse(JSON.stringify(r)));
    setRuleDrawerOpen(true);
  };

  const duplicateRule = (id) => {
    const r = rules.find((x) => x.id === id);
    if (!r) return;
    const copy = { ...JSON.parse(JSON.stringify(r)), id: makeId("rule"), name: `${r.name} (Copy)` };
    setAll((s) => ({ ...s, rules: [copy, ...s.rules] }));
    markDirty();
    pushToast({ title: "Rule duplicated", message: copy.name, tone: "success" });
  };

  const removeRule = (id) => {
    const r = rules.find((x) => x.id === id);
    setAll((s) => ({ ...s, rules: s.rules.filter((x) => x.id !== id) }));
    markDirty();
    pushToast({ title: "Rule removed", message: r?.name || "", tone: "default" });
  };

  const validateRuleDraft = () => {
    if (!ruleDraft) return { ok: false, msg: "Missing draft" };
    if (!String(ruleDraft.name || "").trim()) return { ok: false, msg: "Rule name is required." };
    const thr = Number(ruleDraft.action?.throttleMins || 0);
    if (!Number.isFinite(thr) || thr < 0 || thr > 1440) return { ok: false, msg: "Throttle must be between 0 and 1440 minutes." };
    const anyChannel = Object.values(ruleDraft.action?.channels || {}).some(Boolean);
    if (!anyChannel) return { ok: false, msg: "Select at least one channel." };
    return { ok: true };
  };

  const commitRule = () => {
    const v = validateRuleDraft();
    if (!v.ok) {
      pushToast({ title: "Cannot save rule", message: v.msg, tone: "warning" });
      return;
    }
    if (!ruleDraft) return;

    setAll((s) => {
      const list = [...s.rules];
      if (editRuleId) {
        return { ...s, rules: list.map((x) => (x.id === editRuleId ? ruleDraft : x)) };
      }
      return { ...s, rules: [ruleDraft, ...list] };
    });

    markDirty();
    setRuleDrawerOpen(false);
    pushToast({ title: editRuleId ? "Rule updated" : "Rule added", message: ruleDraft.name, tone: "success" });
  };

  // ---------- Quiet hours validation ----------
  const quietHoursError = useMemo(() => {
    if (!quietHours.enabled) return null;
    const a = parseTimeToMinutes(quietHours.start);
    const b = parseTimeToMinutes(quietHours.end);
    if (a === null || b === null) return "Use HH:MM format.";
    if (quietHours.days.length === 0) return "Select at least one day.";
    return null;
  }, [quietHours]);

  // ---------- Digest validation ----------
  const digestError = useMemo(() => {
    if (!digest.enabled) return null;
    const t = parseTimeToMinutes(digest.time);
    if (t === null) return "Digest time must be HH:MM.";
    const anyChannel = Object.values(digest.channels || {}).some(Boolean);
    if (!anyChannel) return "Select at least one digest channel.";
    if (!digest.includeCategories?.length) return "Select at least one category for digest.";
    return null;
  }, [digest]);

  const previewDigest = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getTime() + 1000 * 60 * 60 * 18);
    const cats = (digest.includeCategories || [])
      .map((k) => categories.find((c) => c.key === k)?.label)
      .filter(Boolean);

    const ch = Object.entries(digest.channels || {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");

    return {
      when: `${digest.mode} at ${digest.time} (local time)`,
      next: fmtTimeLocal(next.toISOString()),
      cats: cats.length ? cats.join(", ") : "-",
      channels: ch || "-",
    };
  }, [digest, categories]);

  // ---------- UI helpers ----------
  const setGlobalChannel = (k, v) => {
    setAll((s) => ({ ...s, globalChannels: { ...s.globalChannels, [k]: v } }));
    markDirty();
  };

  const setChannelProfile = (k, patch) => {
    setAll((s) => ({ ...s, channelProfiles: { ...s.channelProfiles, [k]: { ...(s.channelProfiles[k] || {}), ...patch } } }));
    markDirty();
  };

  const setCategory = (key, patch) => {
    setAll((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    }));
    markDirty();
  };

  const setCategoryChannel = (key, channel, value) => {
    setAll((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.key === key ? { ...c, channels: { ...c.channels, [channel]: value } } : c)),
    }));
    markDirty();
  };

  const bulkCategories = (enabled) => {
    setAll((s) => ({ ...s, categories: s.categories.map((c) => ({ ...c, enabled })) }));
    markDirty();
    pushToast({ title: enabled ? "Enabled" : "Disabled", message: "All categories updated.", tone: "default" });
  };

  const toggleRuleEnabled = (id, enabled) => {
    setAll((s) => ({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, enabled } : r)) }));
    markDirty();
  };

  const verifyChannel = async (channelKey) => {
    setChannelProfile(channelKey, { verified: false });
    pushToast({ title: "Verification sent", message: `Check your ${channelKey} inbox.`, tone: "default" });
    await new Promise((r) => setTimeout(r, 650));
    setChannelProfile(channelKey, { verified: true });
    pushToast({ title: "Verified", message: `${channelKey} verified.`, tone: "success" });
  };

  const testNotification = () => {
    pushToast({ title: "Test sent", message: "A test notification was queued (demo).", tone: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Notification Preferences</div>
                <Badge tone="slate">/settings/notification-preferences</Badge>
                <Badge tone="slate">Settings</Badge>
                <Badge tone="orange">Super premium</Badge>
                {dirty ? <Badge tone="orange">Unsaved</Badge> : <Badge tone="green">Saved</Badge>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Category toggles, channel preferences, rule engine and digest scheduling.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={restoreDefaults}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Restore defaults
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={saveAll}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Save className="h-4 w-4" />
                Save changes
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Enabled categories</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{enabledCategoriesCount}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Channels active</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{activeChannelsCount}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Digest mode</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{digest.enabled ? "On" : "Off"}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Rules enabled</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{enabledRulesCount}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Core settings */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Categories + matrix */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Categories and channels</div>
                  <Badge tone="slate">Core</Badge>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bulkCategories(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Enable all
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkCategories(false)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Disable all
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Global channel switches control deliverability. Category switches control what is eligible to send.</div>
            </div>

            {/* Global channels */}
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs font-extrabold text-slate-600">Global channels</div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {[
                    { k: "inApp", label: "In app", icon: Bell },
                    { k: "email", label: "Email", icon: Mail },
                    { k: "sms", label: "SMS", icon: MessageCircle },
                    { k: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                  ].map((c) => {
                    const Icon = c.icon;
                    const enabled = !!globalChannels[c.k];
                    const profileEnabled = channelProfiles?.[c.k]?.enabled !== false;
                    const canToggle = c.k === "inApp" ? true : true;

                    return (
                      <div key={c.k} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="text-xs font-extrabold text-slate-800">{c.label}</div>
                        <span className="ml-1"><Badge tone={profileEnabled ? "slate" : "danger"}>{profileEnabled ? "Ready" : "Off"}</Badge></span>
                        <span className="ml-2">
                          <Switch
                            size="sm"
                            checked={enabled}
                            onChange={(v) => {
                              if (!canToggle) return;
                              setGlobalChannel(c.k, v);
                            }}
                            ariaLabel={`Toggle global ${c.label}`}
                          />
                        </span>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={testNotification}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Send test
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix */}
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-2">Enabled</div>
                  <div className="col-span-1">In app</div>
                  <div className="col-span-1">Email</div>
                  <div className="col-span-1">SMS</div>
                  <div className="col-span-1">WhatsApp</div>
                  <div className="col-span-2">Priority</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {categories.map((c) => {
                    const eff = effectiveCategoryChannels(c.key);
                    const globalOff = (ch) => !globalChannels[ch] || channelProfiles?.[ch]?.enabled === false;

                    return (
                      <div key={c.key} className={cx("grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold", c.critical ? "bg-orange-50/20" : "bg-white dark:bg-slate-900/50")}>
                        <div className="col-span-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              {c.key === "mentions" ? <AtSign className="h-5 w-5" /> : c.key === "system" ? <ShieldCheck className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{c.label}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{c.desc}</div>
                            </div>
                            <span className="ml-auto">{c.critical ? <Badge tone="orange">Critical</Badge> : <Badge tone="slate">Standard</Badge>}</span>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Switch
                            checked={!!c.enabled}
                            onChange={(v) => setCategory(c.key, { enabled: v })}
                            ariaLabel={`Enable ${c.label}`}
                          />
                          <span className="text-[11px] font-extrabold text-slate-600">{c.enabled ? "On" : "Off"}</span>
                        </div>

                        {[
                          { k: "inApp", label: "In app" },
                          { k: "email", label: "Email" },
                          { k: "sms", label: "SMS" },
                          { k: "whatsapp", label: "WhatsApp" },
                        ].map((ch) => {
                          const colSpan = 1;
                          const disabled = !c.enabled || globalOff(ch.k);
                          return (
                            <div key={ch.k} className={cx("col-span-1 flex items-center", colSpan && "")}> 
                              <div className="flex items-center gap-2">
                                <Switch
                                  size="sm"
                                  checked={!!c.channels[ch.k]}
                                  onChange={(v) => setCategoryChannel(c.key, ch.k, v)}
                                  disabled={disabled}
                                  ariaLabel={`${c.label} ${ch.label}`}
                                />
                                <span className={cx("text-[10px] font-extrabold", eff[ch.k] ? "text-emerald-700" : "text-slate-400")}>{eff[ch.k] ? "On" : "Off"}</span>
                              </div>
                            </div>
                          );
                        })}

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={c.critical ? "orange" : "slate"}>{c.critical ? "High" : "Normal"}</Badge>
                          {c.enabled ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Disabled</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-orange-50 text-orange-700">
                  <InfoIcon />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900">How it works</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Global channels must be enabled and verified. Category channel toggles then decide what can deliver. Rules and digest can override delivery timing.
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right column */}
          <div className="lg:col-span-4 space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Channel profiles</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Addresses and verification status</div>
                </div>
                <Badge tone="slate">Core</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { k: "email", title: "Email", icon: Mail, placeholder: "you@company.com", field: "address" },
                  { k: "sms", title: "SMS", icon: MessageCircle, placeholder: "+2567...", field: "number" },
                  { k: "whatsapp", title: "WhatsApp", icon: MessageCircle, placeholder: "+2567...", field: "number" },
                ].map((c) => {
                  const Icon = c.icon;
                  const prof = channelProfiles[c.k] || {};
                  const enabled = !!prof.enabled;
                  const verified = !!prof.verified;

                  return (
                    <div key={c.k} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900">{c.title}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Verification required for reliable delivery</div>
                        </div>
                        <Switch
                          checked={enabled}
                          onChange={(v) => setChannelProfile(c.k, { enabled: v })}
                          ariaLabel={`Enable ${c.title}`}
                        />
                      </div>

                      <div className="mt-3 grid gap-2">
                        <div className="text-[11px] font-extrabold text-slate-600">{c.field === "address" ? "Address" : "Number"}</div>
                        <input
                          value={String(prof[c.field] || "")}
                          onChange={(e) => setChannelProfile(c.k, { [c.field]: e.target.value })}
                          placeholder={c.placeholder}
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={enabled ? (verified ? "green" : "orange") : "slate"}>
                            {enabled ? (verified ? "Verified" : "Unverified") : "Disabled"}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => verifyChannel(c.k)}
                            disabled={!enabled}
                            className={cx(
                              "ml-auto inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                              enabled ? "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800" : "cursor-not-allowed border-slate-100 text-slate-400"
                            )}
                          >
                            <Check className="h-4 w-4" />
                            Verify
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                    <CheckCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-emerald-900">Pro tip</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-900/70">
                      Keep at least two channels enabled so critical alerts can still reach you if one channel is delayed.
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Quiet hours</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Reduce noise. Critical can bypass.</div>
                </div>
                <Switch
                  checked={quietHours.enabled}
                  onChange={(v) => {
                    setAll((s) => ({ ...s, quietHours: { ...s.quietHours, enabled: v } }));
                    markDirty();
                  }}
                  ariaLabel="Toggle quiet hours"
                />
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Start</div>
                    <input
                      value={quietHours.start}
                      onChange={(e) => {
                        setAll((s) => ({ ...s, quietHours: { ...s.quietHours, start: e.target.value } }));
                        markDirty();
                      }}
                      placeholder="22:00"
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      disabled={!quietHours.enabled}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">End</div>
                    <input
                      value={quietHours.end}
                      onChange={(e) => {
                        setAll((s) => ({ ...s, quietHours: { ...s.quietHours, end: e.target.value } }));
                        markDirty();
                      }}
                      placeholder="07:00"
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      disabled={!quietHours.enabled}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Days</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                      const active = quietHours.days.includes(d);
                      return (
                        <Chip
                          key={d}
                          active={active}
                          onClick={() => {
                            if (!quietHours.enabled) return;
                            const next = active ? quietHours.days.filter((x) => x !== d) : [...quietHours.days, d];
                            setAll((s) => ({ ...s, quietHours: { ...s.quietHours, days: next } }));
                            markDirty();
                          }}
                          tone="orange"
                        >
                          {d}
                        </Chip>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div>
                    <div className="text-sm font-black text-slate-900">Critical bypass</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">System, Orders, Mentions, Finance</div>
                  </div>
                  <Switch
                    checked={quietHours.bypassCritical}
                    onChange={(v) => {
                      setAll((s) => ({ ...s, quietHours: { ...s.quietHours, bypassCritical: v } }));
                      markDirty();
                    }}
                    disabled={!quietHours.enabled}
                    ariaLabel="Toggle critical bypass"
                  />
                </div>

                {quietHoursError ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-rose-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-rose-900">Fix quiet hours</div>
                        <div className="mt-1 text-xs font-semibold text-rose-900/70">{quietHoursError}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="text-[11px] font-semibold text-slate-500">Timezone: Africa/Kampala (UTC+03:00)</div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Super premium: Rules + Digest */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="overflow-hidden lg:col-span-7">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Rule engine</div>
                <Badge tone="orange">Super premium</Badge>
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openNewRule}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Plus className="h-4 w-4" />
                    Add rule
                  </button>
                </span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">If-then rules override delivery timing per event.</div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {rules.map((r) => (
                <div key={r.id} className="bg-white dark:bg-slate-900/50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", r.priority === "High" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                      <Filter className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-900">{r.name}</div>
                        <Badge tone={r.priority === "High" ? "orange" : r.priority === "Low" ? "slate" : "green"}>{r.priority}</Badge>
                        <Badge tone={r.enabled ? "green" : "slate"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
                        <span className="ml-auto">
                          <Switch checked={!!r.enabled} onChange={(v) => toggleRuleEnabled(r.id, v)} ariaLabel={`Toggle rule ${r.name}`} />
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{summarizeRule(r)}</div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge tone="slate">Severity: {r.conditions?.severity || "Any"}</Badge>
                        {r.conditions?.keyword ? <Badge tone="slate">Keyword: {r.conditions.keyword}</Badge> : null}
                        {r.action?.bypassQuietHours ? <Badge tone="orange">Bypass quiet hours</Badge> : <Badge tone="slate">Respects quiet hours</Badge>}
                        {Number(r.action?.throttleMins || 0) > 0 ? <Badge tone="slate">Throttle: {r.action.throttleMins}m</Badge> : <Badge tone="slate">No throttle</Badge>}

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => duplicateRule(r.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditRule(r.id)}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            <Settings className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRule(r.id)}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                            aria-label="Remove rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {rules.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No rules</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Create a rule to route important events to the right channels.</div>
                        <button
                          type="button"
                          onClick={openNewRule}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Plus className="h-4 w-4" />
                          Add rule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Digest mode</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Bundle low priority notifications into one update.</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="orange">Super premium</Badge>
                <Switch
                  checked={!!digest.enabled}
                  onChange={(v) => {
                    setAll((s) => ({ ...s, digest: { ...s.digest, enabled: v } }));
                    markDirty();
                  }}
                  ariaLabel="Toggle digest mode"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Frequency</div>
                    <div className="relative mt-2">
                      <select
                        value={digest.mode}
                        onChange={(e) => {
                          setAll((s) => ({ ...s, digest: { ...s.digest, mode: e.target.value as DigestSettings["mode"] } }));
                          markDirty();
                        }}
                        disabled={!digest.enabled}
                        className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                      >
                        {(["Daily", "Weekdays", "Weekly"] as DigestSettings["mode"][]).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Time</div>
                    <input
                      value={digest.time}
                      onChange={(e) => {
                        setAll((s) => ({ ...s, digest: { ...s.digest, time: e.target.value } }));
                        markDirty();
                      }}
                      disabled={!digest.enabled}
                      placeholder="18:00"
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Digest channels</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Where the digest is delivered</div>
                      </div>
                      <Badge tone="slate">{digest.enabled ? "Active" : "Off"}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { k: "inApp", label: "In app" },
                        { k: "email", label: "Email" },
                        { k: "whatsapp", label: "WhatsApp" },
                        { k: "sms", label: "SMS" },
                      ].map((c) => {
                        const active = !!digest.channels?.[c.k];
                        return (
                          <Chip
                            key={c.k}
                            active={active}
                            onClick={() => {
                              if (!digest.enabled) return;
                              setAll((s) => ({
                                ...s,
                                digest: { ...s.digest, channels: { ...s.digest.channels, [c.k]: !active } },
                              }));
                              markDirty();
                            }}
                            tone="green"
                          >
                            {c.label}
                          </Chip>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">Included categories</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Choose what goes into digest</div>
                      </div>
                      <Badge tone="slate">{digest.includeCategories?.length || 0}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {categories
                        .filter((c) => !c.critical)
                        .map((c) => {
                          const active = digest.includeCategories?.includes(c.key);
                          return (
                            <Chip
                              key={c.key}
                              active={active}
                              onClick={() => {
                                if (!digest.enabled) return;
                                const next = active
                                  ? digest.includeCategories.filter((x) => x !== c.key)
                                  : [...(digest.includeCategories || []), c.key];
                                setAll((s) => ({ ...s, digest: { ...s.digest, includeCategories: next } }));
                                markDirty();
                              }}
                              tone="orange"
                            >
                              {c.label}
                            </Chip>
                          );
                        })}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">Instant for critical</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Critical categories still alert immediately</div>
                      </div>
                      <Switch
                        checked={!!digest.instantForCritical}
                        onChange={(v) => {
                          setAll((s) => ({ ...s, digest: { ...s.digest, instantForCritical: v } }));
                          markDirty();
                        }}
                        disabled={!digest.enabled}
                        ariaLabel="Toggle instant for critical"
                      />
                    </div>
                  </div>

                  {digestError ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-rose-700">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-rose-900">Fix digest settings</div>
                          <div className="mt-1 text-xs font-semibold text-rose-900/70">{digestError}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-emerald-900">Digest preview</div>
                        <div className="mt-1 text-xs font-semibold text-emerald-900/70">{previewDigest.when}</div>
                        <div className="mt-3 grid gap-2">
                          <MiniRow label="Next run" value={previewDigest.next} />
                          <MiniRow label="Categories" value={previewDigest.cats} />
                          <MiniRow label="Channels" value={previewDigest.channels} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Digest preview", message: "A sample digest was generated (demo).", tone: "success" })}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Sparkles className="h-4 w-4" />
                            Preview now
                          </button>
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Digest sent", message: "Test digest queued (demo).", tone: "default" })}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                          >
                            <Mail className="h-4 w-4" />
                            Send test digest
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Safety notes</div>
                      <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                      <li>Critical categories can bypass quiet hours depending on your settings.</li>
                      <li>Rules can route security alerts to multiple channels instantly.</li>
                      <li>Channel verification improves deliverability and reduces delays.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Rule drawer */}
      <Drawer
        open={ruleDrawerOpen}
        title={editRuleId ? "Edit rule" : "Create rule"}
        subtitle="Super premium rule engine with trigger, conditions and actions"
        onClose={() => setRuleDrawerOpen(false)}
      >
        {!ruleDraft ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">No rule draft loaded.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRuleStep(n)}
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    ruleStep === n ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  Step {n}
                </button>
              ))}
              <span className="ml-auto"><Badge tone="orange">Rule engine</Badge></span>
            </div>

            <GlassCard className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={ruleStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.16 }}
                >
                  {ruleStep === 1 ? (
                    <div className="grid gap-3">
                      <div className="text-sm font-black text-slate-900">Trigger</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Category</div>
                          <div className="relative mt-2">
                            <select
                              value={ruleDraft.trigger.category}
                              onChange={(e) => {
                                const cat = e.target.value;
                                const ev = eventOptionsForCategory(cat)[0]?.value || "event";
                                updateRuleDraft((d) => ({ ...d, trigger: { category: cat, event: ev } }));
                              }}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                            >
                              {categories.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Event</div>
                          <div className="relative mt-2">
                            <select
                              value={ruleDraft.trigger.event}
                              onChange={(e) => updateRuleDraft((d) => ({ ...d, trigger: { ...d.trigger, event: e.target.value } }))}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                            >
                              {eventOptionsForCategory(ruleDraft.trigger.category).map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Rule name</div>
                          <input
                            value={ruleDraft.name}
                            onChange={(e) => updateRuleDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder="e.g., RFQ urgent alert"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Priority</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(
                              [
                                { k: "High", tone: "orange" },
                                { k: "Normal", tone: "green" },
                                { k: "Low", tone: "slate" },
                              ] as Array<{ k: RulePriority; tone: "orange" | "green" | "slate" }>
                            ).map((p) => (
                              <Chip
                                key={p.k}
                                active={ruleDraft.priority === p.k}
                                onClick={() => updateRuleDraft((d) => ({ ...d, priority: p.k }))}
                                tone={p.tone === "orange" ? "orange" : "green"}
                              >
                                {p.k}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {ruleStep === 2 ? (
                    <div className="grid gap-3">
                      <div className="text-sm font-black text-slate-900">Conditions</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Severity</div>
                          <div className="relative mt-2">
                            <select
                              value={ruleDraft.conditions.severity}
                              onChange={(e) => updateRuleDraft((d) => ({ ...d, conditions: { ...d.conditions, severity: e.target.value as Rule["conditions"]["severity"] } }))}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                            >
                              {["Any", "High", "Medium", "Low"].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">If set to Any, the rule runs for all severities.</div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Keyword contains (optional)</div>
                          <input
                            value={ruleDraft.conditions.keyword}
                            onChange={(e) => updateRuleDraft((d) => ({ ...d, conditions: { ...d.conditions, keyword: e.target.value } }))}
                            placeholder="e.g., urgent"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Matches title or message content (demo).</div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Super premium idea</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Add condition groups, AND/OR logic, and saved condition templates.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {ruleStep === 3 ? (
                    <div className="grid gap-3">
                      <div className="text-sm font-black text-slate-900">Actions</div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Delivery</div>
                          <div className="mt-2 flex gap-2">
                            {(["Instant", "Digest"] as RuleDelivery[]).map((d) => (
                              <Chip
                                key={d}
                                active={ruleDraft.action.delivery === d}
                                onClick={() => updateRuleDraft((x) => ({ ...x, action: { ...x.action, delivery: d } }))}
                                tone={d === "Digest" ? "orange" : "green"}
                              >
                                {d}
                              </Chip>
                            ))}
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Digest sends at your digest schedule.</div>
                        </div>

                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Throttle (minutes)</div>
                          <input
                            value={String(ruleDraft.action.throttleMins)}
                            onChange={(e) => updateRuleDraft((d) => ({ ...d, action: { ...d.action, throttleMins: Number(e.target.value) } }))}
                            placeholder="30"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Prevents repeated alerts for the same trigger window.</div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Channels</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Select delivery channels for this rule</div>
                          </div>
                          <Badge tone="slate">Rule</Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(
                            [
                              { k: "inApp", label: "In app" },
                              { k: "email", label: "Email" },
                              { k: "whatsapp", label: "WhatsApp" },
                              { k: "sms", label: "SMS" },
                            ] as Array<{ k: ChannelKey; label: string }>
                          ).map((c) => {
                            const active = !!ruleDraft.action.channels[c.k];
                            return (
                              <Chip
                                key={c.k}
                                active={active}
                                onClick={() => updateRuleDraft((d) => ({ ...d, action: { ...d.action, channels: { ...d.action.channels, [c.k]: !active } } }))}
                                tone={c.k === "sms" ? "orange" : "green"}
                              >
                                {c.label}
                              </Chip>
                            );
                          })}
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3">
                          <div>
                            <div className="text-sm font-black text-slate-900">Bypass quiet hours</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Send even inside quiet hours</div>
                          </div>
                          <Switch
                            checked={!!ruleDraft.action.bypassQuietHours}
                            onChange={(v) => updateRuleDraft((d) => ({ ...d, action: { ...d.action, bypassQuietHours: v } }))}
                            ariaLabel="Toggle bypass quiet hours"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {ruleStep === 4 ? (
                    <div className="grid gap-3">
                      <div className="text-sm font-black text-slate-900">Review</div>
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Summary</div>
                          <span className="ml-auto"><Badge tone="slate">{ruleDraft.priority}</Badge></span>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <MiniRow label="Name" value={ruleDraft.name || "-"} />
                          <MiniRow label="Trigger" value={`${ruleDraft.trigger.category}.${ruleDraft.trigger.event}`} />
                          <MiniRow label="Severity" value={ruleDraft.conditions.severity || "Any"} />
                          <MiniRow label="Keyword" value={ruleDraft.conditions.keyword || "-"} />
                          <MiniRow label="Delivery" value={ruleDraft.action.delivery} />
                          <MiniRow
                            label="Channels"
                            value={Object.entries(ruleDraft.action.channels)
                              .filter(([, v]) => v)
                              .map(([k]) => k)
                              .join(", ") || "-"}
                          />
                          <MiniRow label="Throttle" value={`${Number(ruleDraft.action.throttleMins || 0)} minutes`} />
                          <MiniRow label="Quiet hours" value={ruleDraft.action.bypassQuietHours ? "Bypass" : "Respect"} />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                            <CheckCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-900">Ready to save</div>
                            <div className="mt-1 text-xs font-semibold text-emerald-900/70">This rule will apply immediately after you save changes.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </GlassCard>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-200/70 bg-white dark:bg-slate-900/90 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRuleStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setRuleStep((s) => Math.min(4, s + 1))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const v = validateRuleDraft();
                    if (!v.ok) {
                      pushToast({ title: "Check rule", message: v.msg, tone: "warning" });
                      return;
                    }
                    safeCopy(JSON.stringify(ruleDraft, null, 2));
                    pushToast({ title: "Copied", message: "Rule JSON copied.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>

                <button
                  type="button"
                  onClick={commitRule}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Save className="h-4 w-4" />
                  Save rule
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

function MiniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="max-w-[60%] truncate text-xs font-semibold text-slate-800" title={String(value)}>
        {value}
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" opacity="0.35" />
      <path d="M10 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}
