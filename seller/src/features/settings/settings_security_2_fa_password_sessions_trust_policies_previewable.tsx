import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  Lock,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Security (Previewable)
 * Route: /settings/security
 * Core:
 * - 2FA
 * - Password
 * - Sessions
 * Super premium:
 * - Device trust policies
 * - Suspicious login review flows
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
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

function IconButton({ label, onClick, children, tone = "light" }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function SegTab({ label, active, onClick, tone = "green" }) {
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
      {label}
    </button>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-9 w-[64px] items-center rounded-full border transition",
        checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900"
      )}
    >
      <span
        className={cx(
          "absolute left-1 top-1 h-7 w-7 rounded-full bg-white dark:bg-slate-900 shadow-sm transition",
          checked && "translate-x-[28px]"
        )}
        style={checked ? { boxShadow: "0 16px 30px rgba(3,205,140,0.16)" } : undefined}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children, accent = "light" }) {
  const headerBg = accent === "dark" ? TOKENS.black : "rgba(255,255,255,0.85)";
  const headerText = accent === "dark" ? "text-white" : "text-slate-900";
  const subText = accent === "dark" ? "text-white/70" : "text-slate-500";

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
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 font-sans shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: headerBg }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className={cx("text-sm font-black", headerText)}>{title}</div>
                    {subtitle ? <div className={cx("mt-1 text-xs font-semibold", subText)}>{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose} tone={accent === "dark" ? "dark" : "light"}>
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
                <ShieldCheck className="h-5 w-5" />
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

// -------------------- Demo data --------------------

function buildSessions() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();
  return [
    { id: "SES-01", device: "desktop", label: "Chrome on Windows", location: "Wuxi, CN", ip: "10.11.2.33", lastSeen: ago(4), current: true, risk: "ok" },
    { id: "SES-02", device: "mobile", label: "Safari on iPhone", location: "Kampala, UG", ip: "41.210.9.12", lastSeen: ago(180), current: false, risk: "watch" },
    { id: "SES-03", device: "desktop", label: "Edge on Windows", location: "Nairobi, KE", ip: "197.248.7.21", lastSeen: ago(1400), current: false, risk: "ok" },
  ];
}

function buildDevices() {
  const now = Date.now();
  const agoD = (d) => new Date(now - d * 24 * 3600_000).toISOString();
  return [
    { id: "DEV-1001", name: "Office Desktop", type: "desktop", trusted: true, trustedAt: agoD(18), lastSeen: agoD(0.2), note: "Finance approvals" },
    { id: "DEV-1002", name: "iPhone 13", type: "mobile", trusted: true, trustedAt: agoD(40), lastSeen: agoD(1.2), note: "2FA device" },
    { id: "DEV-1003", name: "Unknown Windows", type: "desktop", trusted: false, trustedAt: null, lastSeen: agoD(0.1), note: "Flagged" },
  ];
}

function buildAlerts() {
  const now = Date.now();
  const ago = (m) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "AL-901",
      title: "New device sign-in",
      reason: "New device fingerprint",
      risk: 78,
      createdAt: ago(18),
      location: "Nairobi, KE",
      ip: "197.248.7.21",
      status: "Needs review",
      tags: ["new device", "new IP"],
    },
    {
      id: "AL-900",
      title: "Unusual location",
      reason: "Sign-in from an uncommon country",
      risk: 64,
      createdAt: ago(110),
      location: "Dubai, AE",
      ip: "185.33.21.9",
      status: "Needs review",
      tags: ["unusual location"],
    },
    {
      id: "AL-899",
      title: "Impossible travel",
      reason: "Rapid location change",
      risk: 92,
      createdAt: ago(540),
      location: "London, UK",
      ip: "81.2.69.142",
      status: "Resolved",
      tags: ["impossible travel", "high risk"],
    },
  ];
}

function riskTone(score) {
  const s = Number(score || 0);
  if (s >= 80) return "danger";
  if (s >= 55) return "orange";
  return "green";
}

function sessionRiskTone(risk) {
  if (risk === "watch") return "orange";
  if (risk === "risk") return "danger";
  return "green";
}

// -------------------- Page --------------------

export default function SettingsSecurityPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  // Core states
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState("authenticator"); // authenticator | sms | email

  const [sessions, setSessions] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const hydratedRef = useRef(false);

  // Password
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwShow, setPwShow] = useState({ current: false, next: false, confirm: false });

  // Drawers
  const [twoFADrawer, setTwoFADrawer] = useState(false);
  const [sessionsDrawer, setSessionsDrawer] = useState(false);
  const [policyDrawer, setPolicyDrawer] = useState(false);
  const [alertDrawer, setAlertDrawer] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  // Super premium policies
  const [policies, setPolicies] = useState({
    requireTrustedForFinance: true,
    stepUpOnNewDevice: true,
    autoTrustAfter2FA: false,
    maxTrustedDevices: 5,
    allowHighRiskCountries: false,
  });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getSecuritySettings();
        if (!active) return;
        const metadata = (payload.metadata as Record<string, unknown> | undefined) ?? {};
        setTwoFAEnabled(Boolean(payload.twoFactor));
        setTwoFAMethod(String(payload.twoFactorMethod || "authenticator"));
        setSessions(Array.isArray(metadata.settingsSessions) ? metadata.settingsSessions as any[] : []);
        setDevices(Array.isArray(metadata.settingsDevices) ? metadata.settingsDevices as any[] : []);
        setAlerts(Array.isArray(metadata.settingsAlerts) ? metadata.settingsAlerts as any[] : []);
        setPolicies((current) => ({ ...current, ...((metadata.policies as Record<string, unknown> | undefined) ?? {}) }));
        hydratedRef.current = true;
      } catch {
        if (!active) return;
        pushToast({ title: "Security unavailable", message: "Could not load security settings.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void sellerBackendApi.patchSecuritySettings({
      twoFactor: twoFAEnabled,
      twoFactorMethod: twoFAMethod,
      metadata: {
        settingsSessions: sessions,
        settingsDevices: devices,
        settingsAlerts: alerts,
        policies,
      },
    });
  }, [twoFAEnabled, twoFAMethod, sessions, devices, alerts, policies]);

  const activeAlert = useMemo(() => alerts.find((a) => a.id === activeAlertId) || null, [alerts, activeAlertId]);

  const trustedCount = useMemo(() => devices.filter((d) => d.trusted).length, [devices]);
  const openAlerts = useMemo(() => alerts.filter((a) => a.status !== "Resolved").length, [alerts]);

  const passwordScore = useMemo(() => {
    const lastChangedDays = 42;
    const base = 72;
    const decay = clamp(Math.round((lastChangedDays / 90) * 18), 0, 18);
    return clamp(base - decay, 45, 92);
  }, []);

  const passwordTone = passwordScore >= 80 ? "green" : passwordScore >= 60 ? "orange" : "danger";

  const savePassword = () => {
    if (!pw.current || !pw.next || !pw.confirm) {
      pushToast({ title: "Password required", message: "Fill all fields.", tone: "warning" });
      return;
    }
    if (pw.next !== pw.confirm) {
      pushToast({ title: "Passwords do not match", message: "Confirm your new password.", tone: "danger" });
      return;
    }
    if (pw.next.length < 10) {
      pushToast({ title: "Weak password", message: "Use at least 10 characters.", tone: "warning" });
      return;
    }
    setPw({ current: "", next: "", confirm: "" });
    setPwOpen(false);
    pushToast({ title: "Password updated", message: "Sign-in sessions remain active (demo).", tone: "success" });
  };

  const revokeSession = (id) => {
    setSessions((s) => s.filter((x) => x.id !== id));
    pushToast({ title: "Session revoked", message: `${id} signed out.`, tone: "success" });
  };

  const signOutOthers = () => {
    setSessions((s) => s.filter((x) => x.current));
    pushToast({ title: "Signed out", message: "All other sessions ended.", tone: "success" });
  };

  const toggleTrust = (deviceId, trust) => {
    setDevices((s) =>
      s.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              trusted: trust,
              trustedAt: trust ? new Date().toISOString() : null,
            }
          : d
      )
    );
    pushToast({ title: trust ? "Device trusted" : "Device untrusted", message: deviceId, tone: trust ? "success" : "default" });
  };

  const openAlert = (id) => {
    setActiveAlertId(id);
    setAlertDrawer(true);
  };

  const resolveAlert = (id, actionLabel) => {
    setAlerts((s) => s.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)));
    pushToast({ title: "Alert resolved", message: actionLabel, tone: "success" });
  };

  const background =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Security</div>
                <Badge tone="slate">/settings/security</Badge>
                <Badge tone="slate">Core</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">2FA, password and sessions, plus trust policies and suspicious login review flows.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF or audit pack.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Saved", message: "Security settings saved (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-5">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-600">2FA</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={twoFAEnabled ? "green" : "orange"}>{twoFAEnabled ? "Enabled" : "Not enabled"}</Badge>
                  <span className="text-xs font-semibold text-slate-500">{twoFAMethod}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-600">Password</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={passwordTone}>{passwordScore}</Badge>
                  <span className="text-xs font-semibold text-slate-500">strength</span>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Sessions</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{sessions.length}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Trusted devices</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{trustedCount}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Alerts</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{openAlerts}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Core controls */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-7">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Core security</div>
              <span className="ml-auto"><Badge tone="slate">2FA · Password · Sessions</Badge></span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {/* 2FA */}
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-900">Two-factor authentication</div>
                      <span className="ml-auto"><Badge tone={twoFAEnabled ? "green" : "orange"}>{twoFAEnabled ? "Enabled" : "Not enabled"}</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Protect logins, payouts and contracts.</div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="text-[11px] font-extrabold text-slate-600">Method</div>
                      <div className="relative">
                        <select
                          value={twoFAMethod}
                          onChange={(e) => setTwoFAMethod(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          <option value="authenticator">Authenticator</option>
                          <option value="sms">SMS</option>
                          <option value="email">Email</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTwoFADrawer(true)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {twoFAEnabled ? "Manage 2FA" : "Set up 2FA"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!twoFAEnabled) {
                            pushToast({ title: "Enable 2FA first", message: "Complete setup to enable.", tone: "warning" });
                            return;
                          }
                          setTwoFAEnabled(false);
                          pushToast({ title: "2FA disabled", message: "Not recommended for payouts.", tone: "warning" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <X className="h-4 w-4" />
                        Disable
                      </button>
                    </div>

                    <div className="mt-3 text-[11px] font-semibold text-slate-500">Core: enable 2FA. Super premium: trust policies can require 2FA for finance actions.</div>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-900">Password</div>
                      <span className="ml-auto"><Badge tone={passwordTone}>{passwordScore}</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Last changed 42 days ago (demo).</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPwOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <KeyRound className="h-4 w-4" />
                        Change password
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Reset link", message: "Wire email reset flow.", tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Send reset link
                      </button>
                    </div>

                    <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
                      <div className="text-[11px] font-extrabold text-orange-900">Best practice</div>
                      <div className="mt-1 text-[11px] font-semibold text-orange-900/70">Use a unique password. Enable 2FA for admin actions and payouts.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Sessions</div>
                  <span className="ml-auto"><Badge tone="slate">{sessions.length} active</Badge></span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Review devices, revoke sessions, and sign out other sessions.</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionsDrawer(true)}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Monitor className="h-4 w-4" />
                    Review sessions
                  </button>
                  <button
                    type="button"
                    onClick={signOutOthers}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                  >
                    <X className="h-4 w-4" />
                    Sign out others
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-4">Device</div>
                    <div className="col-span-4">Location</div>
                    <div className="col-span-3">Last seen</div>
                    <div className="col-span-1 text-right">Risk</div>
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {sessions.slice(0, 3).map((s) => (
                      <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                        <div className="col-span-4 flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                            {s.device === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-900">{s.label}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{s.id}{s.current ? " · current" : ""}</div>
                          </div>
                        </div>
                        <div className="col-span-4 flex items-center text-slate-600">{s.location}</div>
                        <div className="col-span-3 flex items-center text-slate-500">{fmtTime(s.lastSeen)}</div>
                        <div className="col-span-1 flex items-center justify-end"><Badge tone={sessionRiskTone(s.risk)}>{s.risk}</Badge></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Super premium */}
          <GlassCard className="p-5 lg:col-span-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-700" />
              <div className="text-sm font-black text-slate-900">Super premium</div>
              <span className="ml-auto"><Badge tone="orange">Trust policies + review flows</Badge></span>
            </div>

            <div className="mt-4 space-y-3">
              {/* Device trust policies */}
              <div className="rounded-3xl border border-orange-200 bg-orange-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-orange-900">Device trust policies</div>
                      <span className="ml-auto"><Badge tone="slate">{trustedCount} trusted</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Enforce trusted devices for finance actions and step-up checks.</div>

                    <div className="mt-3 grid gap-2">
                      <RowToggle
                        title="Require trusted device for finance"
                        desc="Applies to payouts, holds, and contract approvals"
                        checked={policies.requireTrustedForFinance}
                        onChange={(v) => setPolicies((p) => ({ ...p, requireTrustedForFinance: v }))}
                      />
                      <RowToggle
                        title="Step-up verification on new device"
                        desc="Require 2FA when device is unknown"
                        checked={policies.stepUpOnNewDevice}
                        onChange={(v) => setPolicies((p) => ({ ...p, stepUpOnNewDevice: v }))}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPolicyDrawer(true)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Open policies
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Policies saved", message: "Applied immediately (demo).", tone: "success" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suspicious logins */}
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-900">Suspicious login review</div>
                      <span className="ml-auto"><Badge tone={openAlerts ? "orange" : "green"}>{openAlerts ? `${openAlerts} open` : "Clear"}</Badge></span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Review alerts, mark safe, force logout, or require reset.</div>

                    <div className="mt-3 space-y-2">
                      {alerts.slice(0, 3).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => openAlert(a.id)}
                          className={cx(
                            "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                            a.status === "Resolved" ? "border-slate-200/70" : a.risk >= 80 ? "border-rose-200" : "border-orange-200"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cx(
                                "grid h-10 w-10 place-items-center rounded-2xl",
                                a.status === "Resolved"
                                  ? "bg-slate-100 text-slate-700"
                                  : a.risk >= 80
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-orange-50 text-orange-700"
                              )}
                            >
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">{a.title}</div>
                                <Badge tone={riskTone(a.risk)}>{a.risk}</Badge>
                                <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(a.createdAt)}</span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-600">{a.location} · {a.ip}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge tone="slate">{a.status}</Badge>
                                {a.tags.slice(0, 2).map((t) => (
                                  <Badge key={t} tone="slate">{t}</Badge>
                                ))}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          pushToast({ title: "Refreshed", message: "Latest alerts loaded (demo).", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Rules", message: "Wire alert rules and thresholds.", tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Alert rules
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Security note</div>
                  <span className="ml-auto"><Badge tone="slate">Privacy</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Suppliers and partners should never see budget caps or other sensitive limits on finance rails.
                  Trust signals should be shown as badges and workflows.
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* 2FA drawer */}
      <Drawer
        open={twoFADrawer}
        title="Two-factor authentication"
        subtitle="Set up, change method, and generate recovery codes (demo)."
        onClose={() => setTwoFADrawer(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Status</div>
              <span className="ml-auto"><Badge tone={twoFAEnabled ? "green" : "orange"}>{twoFAEnabled ? "Enabled" : "Not enabled"}</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Recommended: enable 2FA for payouts and contract approvals.</div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {[
                { key: "authenticator", label: "Authenticator", desc: "Most secure" },
                { key: "sms", label: "SMS", desc: "Fast access" },
                { key: "email", label: "Email", desc: "Fallback" },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setTwoFAMethod(m.key)}
                  className={cx(
                    "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                    twoFAMethod === m.key ? "border-emerald-200" : "border-slate-200/70"
                  )}
                >
                  <div className="text-sm font-black text-slate-900">{m.label}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{m.desc}</div>
                  <div className="mt-3"><Badge tone={twoFAMethod === m.key ? "green" : "slate"}>{twoFAMethod === m.key ? "Selected" : "Select"}</Badge></div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
              <div className="text-[11px] font-extrabold text-slate-600">Setup (demo)</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs font-semibold text-slate-700">
                <li>Choose a method.</li>
                <li>Verify with a 6-digit code.</li>
                <li>Download recovery codes.</li>
              </ol>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTwoFAEnabled(true);
                    pushToast({ title: "2FA enabled", message: `Method: ${twoFAMethod}.`, tone: "success" });
                    setTwoFADrawer(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Enable 2FA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy("RECOVERY-1\nRECOVERY-2\nRECOVERY-3\nRECOVERY-4");
                    pushToast({ title: "Copied", message: "Recovery codes copied (demo).", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy recovery codes
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Tip</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">Do not disable 2FA if you manage payouts or approvals.</div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Sessions drawer */}
      <Drawer
        open={sessionsDrawer}
        title="Sessions"
        subtitle="Review active sessions, revoke access, and copy evidence."
        onClose={() => setSessionsDrawer(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-black text-slate-900">Active sessions</div>
              <span className="ml-auto"><Badge tone="slate">{sessions.length}</Badge></span>
              <button
                type="button"
                onClick={signOutOthers}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-sans font-extrabold text-rose-700"
              >
                <X className="h-4 w-4" />
                Sign out others
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                <div className="col-span-4">Session</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-2">IP</div>
                <div className="col-span-2">Last seen</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              <div className="divide-y divide-slate-200/70">
                {sessions.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cx("grid h-9 w-9 place-items-center rounded-2xl", s.risk === "watch" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                          {s.device === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900">{s.label}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{s.id}{s.current ? " · current" : ""}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3 flex items-center">{s.location}</div>
                    <div className="col-span-2 flex items-center"><Badge tone="slate">{s.ip}</Badge></div>
                    <div className="col-span-2 flex items-center text-slate-500">{fmtTime(s.lastSeen)}</div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(JSON.stringify(s, null, 2));
                          pushToast({ title: "Copied", message: "Session details copied.", tone: "success" });
                        }}
                        className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Copy"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      {!s.current ? (
                        <button
                          type="button"
                          onClick={() => revokeSession(s.id)}
                          className="grid h-9 w-9 place-items-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700"
                          aria-label="Revoke"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <Badge tone="green">Current</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-[11px] font-semibold text-slate-500">Super premium: suspicious login review can trigger forced session revocation.</div>
          </div>
        </div>
      </Drawer>

      {/* Policy drawer */}
      <Drawer
        open={policyDrawer}
        title="Device trust policies"
        subtitle="Advanced enforcement rules for sensitive actions."
        onClose={() => setPolicyDrawer(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Policy rules</div>
              <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
            </div>

            <div className="mt-4 space-y-3">
              <PolicyRow
                title="Require trusted device for finance"
                desc="Blocks payout actions from unknown devices"
                checked={policies.requireTrustedForFinance}
                onChange={(v) => setPolicies((p) => ({ ...p, requireTrustedForFinance: v }))}
              />
              <PolicyRow
                title="Step-up verification on new device"
                desc="Prompt 2FA when device is unknown"
                checked={policies.stepUpOnNewDevice}
                onChange={(v) => setPolicies((p) => ({ ...p, stepUpOnNewDevice: v }))}
              />
              <PolicyRow
                title="Auto-trust device after successful 2FA"
                desc="Automatically marks a device as trusted"
                checked={policies.autoTrustAfter2FA}
                onChange={(v) => setPolicies((p) => ({ ...p, autoTrustAfter2FA: v }))}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Max trusted devices</div>
                  <input
                    value={String(policies.maxTrustedDevices)}
                    onChange={(e) => setPolicies((p) => ({ ...p, maxTrustedDevices: clamp(Number(e.target.value), 1, 12) }))}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Exceeding this requires admin approval (demo).</div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">High-risk countries</div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">Block or allow based on risk rules</div>
                    </div>
                    <Switch
                      checked={policies.allowHighRiskCountries}
                      onChange={(v) => setPolicies((p) => ({ ...p, allowHighRiskCountries: v }))}
                      label="Allow high risk countries"
                    />
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-slate-500">Recommended: keep blocked and use review flows.</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    pushToast({ title: "Policies saved", message: "Applied immediately (demo).", tone: "success" });
                    setPolicyDrawer(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Save policies
                </button>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(policies, null, 2));
                    pushToast({ title: "Copied", message: "Policy JSON copied.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Trusted devices</div>
              <span className="ml-auto"><Badge tone="slate">{trustedCount}</Badge></span>
            </div>
            <div className="mt-3 space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                  <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", d.trusted ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
                    {d.type === "mobile" ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-slate-900">{d.name}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{d.id} · last seen {fmtTime(d.lastSeen)}</div>
                    {d.note ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{d.note}</div> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={d.trusted ? "green" : "danger"}>{d.trusted ? "Trusted" : "Untrusted"}</Badge>
                    <button
                      type="button"
                      onClick={() => toggleTrust(d.id, !d.trusted)}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                        d.trusted ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      )}
                    >
                      {d.trusted ? "Untrust" : "Trust"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Alert drawer */}
      <Drawer
        open={alertDrawer}
        title={activeAlert ? `Login alert · ${activeAlert.id}` : "Login alert"}
        subtitle={activeAlert ? `${activeAlert.title} · Risk ${activeAlert.risk}` : ""}
        onClose={() => setAlertDrawer(false)}
      >
        {!activeAlert ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select an alert first.</div>
        ) : (
          <div className="space-y-3">
            <div className={cx("rounded-3xl border bg-white dark:bg-slate-900/70 p-4", activeAlert.risk >= 80 ? "border-rose-200" : "border-orange-200")}>
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", activeAlert.risk >= 80 ? "text-rose-700" : "text-orange-700")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeAlert.title}</div>
                    <span className="ml-auto"><Badge tone={riskTone(activeAlert.risk)}>{activeAlert.risk}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{activeAlert.reason}</div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <KV label="Status" value={activeAlert.status} />
                    <KV label="Created" value={fmtTime(activeAlert.createdAt)} />
                    <KV label="Location" value={activeAlert.location} />
                    <KV label="IP" value={activeAlert.ip} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeAlert.tags.map((t) => (
                      <Badge key={t} tone="slate">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Review actions</div>
                <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Choose an action. In production, these create audit events and notify support.</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => resolveAlert(activeAlert.id, "Marked as safe")}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Mark safe
                </button>

                <button
                  type="button"
                  onClick={() => {
                    signOutOthers();
                    resolveAlert(activeAlert.id, "Forced logout other sessions");
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
                >
                  <X className="h-4 w-4" />
                  Force logout
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFAEnabled(true);
                    resolveAlert(activeAlert.id, "Required 2FA");
                    pushToast({ title: "2FA required", message: "Enabled for this account (demo).", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Require 2FA
                </button>

                <button
                  type="button"
                  onClick={() => {
                    pushToast({ title: "Password reset required", message: "Wire reset workflow.", tone: "warning" });
                    resolveAlert(activeAlert.id, "Required password reset");
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <KeyRound className="h-4 w-4" />
                  Require reset
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(activeAlert, null, 2));
                    pushToast({ title: "Copied", message: "Alert evidence copied.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy evidence
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Timeline</div>
                <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { who: "System", at: activeAlert.createdAt, text: "Alert generated." },
                  { who: "Security", at: new Date().toISOString(), text: "Awaiting review." },
                ].map((e, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{e.who}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{e.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Password modal */}
      <AnimatePresence>
        {pwOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-sm"
              onClick={() => setPwOpen(false)}
            />
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed left-1/2 top-1/2 z-[65] max-h-[90vh] w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
                <div className="border-b border-slate-200/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-slate-900">Change password</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Use a unique password. Minimum 10 characters.</div>
                    </div>
                    <IconButton label="Close" onClick={() => setPwOpen(false)}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3">
                    <PasswordField
                      label="Current password"
                      value={pw.current}
                      onChange={(v) => setPw((s) => ({ ...s, current: v }))}
                      show={pwShow.current}
                      setShow={(v) => setPwShow((s) => ({ ...s, current: v }))}
                    />
                    <PasswordField
                      label="New password"
                      value={pw.next}
                      onChange={(v) => setPw((s) => ({ ...s, next: v }))}
                      show={pwShow.next}
                      setShow={(v) => setPwShow((s) => ({ ...s, next: v }))}
                      helper="Tip: include uppercase, numbers, and symbols."
                    />
                    <PasswordField
                      label="Confirm new password"
                      value={pw.confirm}
                      onChange={(v) => setPw((s) => ({ ...s, confirm: v }))}
                      show={pwShow.confirm}
                      setShow={(v) => setPwShow((s) => ({ ...s, confirm: v }))}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={savePassword}
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPw({ current: "", next: "", confirm: "" });
                        setPwOpen(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function RowToggle({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-orange-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-extrabold text-orange-900">{title}</div>
        <div className="mt-0.5 text-[11px] font-semibold text-orange-900/70">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function PolicyRow({ title, desc, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
  helper = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (next: boolean) => void;
  helper?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
          placeholder={label}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helper ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{helper}</div> : null}
    </div>
  );
}
