import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMockState } from "../../mocks";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Globe,
  Info,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

/**
 * Integrations (Previewable)
 * Route: /settings/integrations
 * Core: connected apps, API keys placeholder
 * Super premium: webhook health dashboard, retries and logs
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type AppStatus = "Connected" | "Disconnected";
type AppIntegration = {
  id: string;
  name: string;
  category: string;
  auth: string;
  status: AppStatus;
  lastSyncAt: string | null;
  notes: string;
  capabilities: string[];
};
type ApiKeyStatus = "Active" | "Revoked";
type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  status: ApiKeyStatus;
  scopes: string[];
  expiresAt?: string;
};
type WebhookStatus = "Active" | "Degraded" | "Paused";
type WebhookEndpoint = {
  id: string;
  url: string;
  status: WebhookStatus;
  lastDeliveryAt: string | null;
  successRate24h: number;
  signing: "Enabled" | "Disabled";
  events: string[];
};
type WebhookLog = {
  id: string;
  at: string;
  endpointId: string;
  endpointUrl: string;
  eventType: string;
  result: "Success" | "Failed" | "Timeout";
  httpStatus: string;
  latencyMs: number;
  tries: number;
  payloadPreview: string;
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

function pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${Math.round(v)}%`;
}

function ms(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  if (v < 1000) return `${Math.round(v)} ms`;
  return `${(v / 1000).toFixed(2)} s`;
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
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[780px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function Sparkline({ points }) {
  const w = 240;
  const h = 66;
  const pad = 7;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

// ---------------- Data seeders ----------------

function seedApps(): AppIntegration[] {
  const now = Date.now();
  const agoM = (m) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "app_whatsapp",
      name: "WhatsApp Business API",
      category: "Messaging",
      auth: "API",
      status: "Connected",
      lastSyncAt: agoM(18),
      notes: "Inbound orders, notifications, customer support.",
      capabilities: ["Send messages", "Receive webhooks", "Template sync"],
    },
    {
      id: "app_stripe",
      name: "Stripe",
      category: "Payments",
      auth: "OAuth",
      status: "Disconnected",
      lastSyncAt: null,
      notes: "Card payments, subscriptions, payouts.",
      capabilities: ["Checkout", "Webhooks", "Refunds"],
    },
    {
      id: "app_payoneer",
      name: "Payoneer",
      category: "Payouts",
      auth: "API",
      status: "Connected",
      lastSyncAt: agoM(63),
      notes: "Supplier payouts and settlements.",
      capabilities: ["Payouts", "Balance fetch"],
    },
    {
      id: "app_zapier",
      name: "Zapier",
      category: "Automation",
      auth: "API",
      status: "Connected",
      lastSyncAt: agoM(7),
      notes: "No-code automations and workflows.",
      capabilities: ["Trigger events", "Run Zaps"],
    },
    {
      id: "app_sheets",
      name: "Google Sheets",
      category: "Exports",
      auth: "OAuth",
      status: "Disconnected",
      lastSyncAt: null,
      notes: "Export orders and inventory.",
      capabilities: ["Export", "Scheduled sync"],
    },
  ];
}

function seedApiKeys(): ApiKey[] {
  const now = Date.now();
  const agoD = (d) => new Date(now - d * 24 * 3600_000).toISOString();

  return [
    {
      id: "key_8f1a9c",
      name: "Server API",
      prefix: "sk_live_7x2",
      createdAt: agoD(34),
      lastUsedAt: agoD(1),
      status: "Active",
      scopes: ["orders:read", "orders:write", "webhooks:read"],
    },
    {
      id: "key_33b7de",
      name: "Reporting",
      prefix: "sk_live_p91",
      createdAt: agoD(120),
      lastUsedAt: agoD(11),
      status: "Active",
      scopes: ["reports:read", "exports:read"],
    },
  ];
}

function seedWebhooks(): WebhookEndpoint[] {
  const now = Date.now();
  const agoM = (m) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "wh_1001",
      url: "https://example.com/webhooks/evzone",
      status: "Active",
      lastDeliveryAt: agoM(9),
      successRate24h: 98,
      signing: "Enabled",
      events: ["order.created", "order.paid", "payout.sent"],
    },
    {
      id: "wh_1002",
      url: "https://example.com/webhooks/warehouse",
      status: "Degraded",
      lastDeliveryAt: agoM(44),
      successRate24h: 86,
      signing: "Enabled",
      events: ["inventory.updated", "order.shipped"],
    },
    {
      id: "wh_1003",
      url: "https://example.com/webhooks/marketing",
      status: "Paused",
      lastDeliveryAt: null,
      successRate24h: 0,
      signing: "Disabled",
      events: ["campaign.started", "campaign.ended"],
    },
  ];
}

function seedWebhookLogs(endpoints: WebhookEndpoint[]): WebhookLog[] {
  const now = Date.now();
  const agoS = (s) => new Date(now - s * 1000).toISOString();

  const picks = [
    { ev: "order.created", st: "200", ms: 188, tries: 1 },
    { ev: "order.paid", st: "200", ms: 232, tries: 1 },
    { ev: "inventory.updated", st: "500", ms: 920, tries: 3 },
    { ev: "order.shipped", st: "408", ms: 1200, tries: 2 },
    { ev: "payout.sent", st: "200", ms: 310, tries: 1 },
    { ev: "order.paid", st: "200", ms: 201, tries: 1 },
    { ev: "inventory.updated", st: "200", ms: 410, tries: 1 },
  ];

  return Array.from({ length: 18 }).map((_, i) => {
    const p = picks[i % picks.length];
    const ep = endpoints[(i * 7) % endpoints.length];
    const statusClass = p.st === "200" ? "Success" : p.st === "500" ? "Failed" : "Timeout";
    return {
      id: `evt_${10000 + i}`,
      at: agoS(45 + i * 44),
      endpointId: ep.id,
      endpointUrl: ep.url,
      eventType: p.ev,
      result: statusClass,
      httpStatus: p.st,
      latencyMs: p.ms + (i % 5) * 21,
      tries: p.tries,
      payloadPreview: JSON.stringify({ id: `EVT-${10000 + i}`, type: p.ev, sample: true }).slice(0, 72),
    };
  });
}

function statusTone(status: AppStatus | ApiKeyStatus | WebhookStatus | WebhookLog["result"]) {
  if (status === "Connected" || status === "Active" || status === "Success") return "green";
  if (status === "Degraded" || status === "Timeout") return "orange";
  if (status === "Failed" || status === "Revoked") return "danger";
  if (status === "Paused" || status === "Disconnected") return "slate";
  return "slate";
}

export default function SettingsIntegrationsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState<"Apps" | "API keys" | "Webhooks">("Apps");

  const [apps, setApps] = useMockState<AppIntegration[]>("settings.integrations.apps", seedApps());
  const [keys, setKeys] = useMockState<ApiKey[]>("settings.integrations.keys", seedApiKeys());
  const [endpoints, setEndpoints] = useMockState<WebhookEndpoint[]>("settings.integrations.endpoints", seedWebhooks());
  const [logs, setLogs] = useMockState<WebhookLog[]>("settings.integrations.logs", seedWebhookLogs(seedWebhooks()));

  // ---------------- KPIs ----------------
  const kpis = useMemo(() => {
    const connectedApps = apps.filter((a) => a.status === "Connected").length;
    const activeKeys = keys.filter((k) => k.status === "Active").length;
    const activeEndpoints = endpoints.filter((e) => e.status === "Active").length;
    const failed = logs.filter((l) => l.result === "Failed" || l.result === "Timeout").length;
    const success = logs.filter((l) => l.result === "Success").length;
    const total = Math.max(1, logs.length);
    const successRate = (success / total) * 100;
    return { connectedApps, activeKeys, activeEndpoints, failed, successRate };
  }, [apps, keys, endpoints, logs]);

  const trend = useMemo(() => {
    // build 14-point sparkline from success ratio by bucket
    const buckets = 14;
    const per = Math.max(1, Math.floor(logs.length / buckets));
    const points = Array.from({ length: buckets }).map((_, i) => {
      const slice = logs.slice(i * per, i * per + per);
      const ok = slice.filter((x) => x.result === "Success").length;
      const t = Math.max(1, slice.length);
      return Math.round((ok / t) * 100);
    });
    return points.length ? points : [98, 99, 97, 96, 98, 97, 95, 96, 97, 98, 99, 98, 97, 98];
  }, [logs]);

  // ---------------- Connected apps UI ----------------
  const [appQuery, setAppQuery] = useState("");
  const filteredApps = useMemo(() => {
    const q = appQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) => `${a.name} ${a.category} ${a.status}`.toLowerCase().includes(q));
  }, [apps, appQuery]);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectAppId, setConnectAppId] = useState(apps[0]?.id);
  const connectApp = () => {
    const app = apps.find((a) => a.id === connectAppId);
    if (!app) return;
    setApps((prev) =>
      prev.map((a) =>
        a.id === connectAppId
          ? { ...a, status: "Connected", lastSyncAt: new Date().toISOString() }
          : a
      )
    );
    setConnectOpen(false);
    pushToast({ title: "Connected", message: `${app.name} is now connected.`, tone: "success" });
  };

  const disconnectApp = (id) => {
    const app = apps.find((a) => a.id === id);
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Disconnected", lastSyncAt: null } : a)));
    pushToast({ title: "Disconnected", message: app ? app.name : "App disconnected", tone: "default" });
  };

  // ---------------- API Keys UI ----------------
  const [keyQuery, setKeyQuery] = useState("");
  const filteredKeys = useMemo(() => {
    const q = keyQuery.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => `${k.id} ${k.name} ${k.status} ${(k.scopes || []).join(" ")}`.toLowerCase().includes(q));
  }, [keys, keyQuery]);

  const [newKeyOpen, setNewKeyOpen] = useState(false);
  const [keyName, setKeyName] = useState("New key");
  const [keyExpiryDays, setKeyExpiryDays] = useState(90);
  const allScopes = [
    "orders:read",
    "orders:write",
    "inventory:read",
    "webhooks:read",
    "webhooks:write",
    "reports:read",
  ];
  const [keyScopes, setKeyScopes] = useState(["orders:read", "webhooks:read"]);

  const createKey = () => {
    const name = keyName.trim();
    if (!name) {
      pushToast({ title: "Name required", message: "Enter a key name.", tone: "warning" });
      return;
    }

    const prefix = `sk_live_${Math.random().toString(36).slice(2, 5)}`;
    const id = `key_${Math.random().toString(16).slice(2, 8)}`;

    setKeys((s) => [
      {
        id,
        name,
        prefix,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        status: "Active",
        scopes: keyScopes.length ? keyScopes : ["orders:read"],
        expiresAt: new Date(Date.now() + Number(keyExpiryDays || 0) * 24 * 3600_000).toISOString(),
      },
      ...s,
    ]);

    setNewKeyOpen(false);
    pushToast({
      title: "API key created",
      message: "Copy it now. You will not see the full secret again (demo).",
      tone: "success",
      action: {
        label: "Copy",
        onClick: () => {
          safeCopy(`${prefix}_••••••••••`);
          pushToast({ title: "Copied", message: "Key copied.", tone: "default" });
        },
      },
    });
  };

  const revokeKey = (id) => {
    setKeys((s) => s.map((k) => (k.id === id ? { ...k, status: "Revoked" } : k)));
    pushToast({ title: "Key revoked", message: id, tone: "warning" });
  };

  // ---------------- Webhooks UI (Super premium) ----------------
  const [whQuery, setWhQuery] = useState("");
  const filteredEndpoints = useMemo(() => {
    const q = whQuery.trim().toLowerCase();
    if (!q) return endpoints;
    return endpoints.filter((e) => `${e.id} ${e.url} ${e.status} ${(e.events || []).join(" ")}`.toLowerCase().includes(q));
  }, [endpoints, whQuery]);

  const [logQuery, setLogQuery] = useState("");
  const [logStatus, setLogStatus] = useState("All");
  const [logEndpoint, setLogEndpoint] = useState("All");

  const filteredLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase();
    return logs
      .filter((l) => (logStatus === "All" ? true : l.result === logStatus))
      .filter((l) => (logEndpoint === "All" ? true : l.endpointId === logEndpoint))
      .filter((l) => {
        if (!q) return true;
        const hay = `${l.id} ${l.eventType} ${l.endpointUrl} ${l.httpStatus} ${l.result}`.toLowerCase();
        return hay.includes(q);
      })
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [logs, logQuery, logStatus, logEndpoint]);

  const retryQueue = useMemo(() => {
    // simple derived queue: failed or timeout with tries >= 2
    return filteredLogs
      .filter((l) => (l.result === "Failed" || l.result === "Timeout") && Number(l.tries || 0) >= 2)
      .slice(0, 8);
  }, [filteredLogs]);

  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const activeLog = useMemo(() => logs.find((l) => l.id === activeLogId) || null, [logs, activeLogId]);

  const replayEvent = (id) => {
    const ev = logs.find((l) => l.id === id);
    if (!ev) return;

    // Add a new success attempt as replay (demo)
    const replay: WebhookLog = {
      ...ev,
      id: makeId("evt_replay"),
      at: new Date().toISOString(),
      result: "Success",
      httpStatus: "200",
      tries: 1,
      latencyMs: Math.max(120, Math.round(Number(ev.latencyMs || 240) * 0.6)),
      payloadPreview: ev.payloadPreview,
    };
    setLogs((s) => [replay, ...s]);
    pushToast({ title: "Replay queued", message: `${ev.eventType} sent again (demo).`, tone: "success" });
  };

  const addEndpointOpenRef = useRef(false);
  const [addEndpointOpen, setAddEndpointOpen] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState("https://example.com/webhooks/new");
  const [endpointSigning, setEndpointSigning] = useState(true);
  const [endpointEvents, setEndpointEvents] = useState(["order.created", "order.paid"]);

  const allWebhookEvents = [
    "order.created",
    "order.paid",
    "order.shipped",
    "inventory.updated",
    "payout.sent",
    "campaign.started",
  ];

  const createEndpoint = () => {
    const url = endpointUrl.trim();
    if (!url) {
      pushToast({ title: "URL required", message: "Enter an endpoint URL.", tone: "warning" });
      return;
    }
    const id = `wh_${Math.random().toString(16).slice(2, 6)}`;
    setEndpoints((s) => [
      {
        id,
        url,
        status: "Active",
        lastDeliveryAt: null,
        successRate24h: 100,
        signing: endpointSigning ? "Enabled" : "Disabled",
        events: endpointEvents.length ? endpointEvents : ["order.created"],
      },
      ...s,
    ]);
    setAddEndpointOpen(false);
    pushToast({ title: "Endpoint added", message: "Webhook endpoint created.", tone: "success" });
  };

  const toggleEndpoint = (id) => {
    setEndpoints((s) =>
      s.map((e) => {
        if (e.id !== id) return e;
        const next = e.status === "Paused" ? "Active" : "Paused";
        return { ...e, status: next };
      })
    );
  };

  const removeEndpoint = (id) => {
    setEndpoints((s) => s.filter((e) => e.id !== id));
    pushToast({ title: "Endpoint removed", message: id, tone: "default" });
  };

  const simulateFailure = () => {
    const ep = endpoints.find((e) => e.status !== "Paused") || endpoints[0];
    if (!ep) return;

    const entry: WebhookLog = {
      id: makeId("evt"),
      at: new Date().toISOString(),
      endpointId: ep.id,
      endpointUrl: ep.url,
      eventType: "inventory.updated",
      result: "Failed",
      httpStatus: "500",
      latencyMs: 980,
      tries: 2,
      payloadPreview: JSON.stringify({ id: makeId("payload"), type: "inventory.updated", demo: true }).slice(0, 72),
    };
    setLogs((s) => [entry, ...s]);
    pushToast({ title: "Failure simulated", message: "A failed delivery was added to logs.", tone: "warning" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Integrations</div>
                <Badge tone="slate">/settings/integrations</Badge>
                <Badge tone="slate">Settings</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Connected apps, API keys, webhook health, retries and logs.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest integration status loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setConnectOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                Connect app
              </button>
              <button
                type="button"
                onClick={() => setNewKeyOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <KeyRound className="h-4 w-4" />
                New API key
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <Link2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Connected apps</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{kpis.connectedApps}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Active API keys</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{kpis.activeKeys}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Webhook success</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{pct(kpis.successRate)}</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", kpis.failed ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Failed deliveries</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{kpis.failed}</div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(["Apps", "API keys", "Webhooks"] as Array<"Apps" | "API keys" | "Webhooks">).map((t) => (
              <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                {t}
                {t === "Webhooks" ? <span className="ml-2 text-slate-500">Premium</span> : null}
              </Chip>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <Badge tone="slate">Core + Super premium</Badge>
            </span>
          </div>
        </div>

        {/* Content */}
        {tab === "Apps" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-8">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Connected apps</div>
                <span className="ml-auto"><Badge tone="slate">{filteredApps.length}</Badge></span>
              </div>
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={appQuery}
                    onChange={(e) => setAppQuery(e.target.value)}
                    placeholder="Search apps by name, category, status"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {filteredApps.map((a) => (
                  <div key={a.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{a.name}</div>
                          <Badge tone="slate">{a.category}</Badge>
                          <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                          <span className="ml-auto"><Badge tone="slate">Auth: {a.auth}</Badge></span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{a.notes}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(a.capabilities || []).slice(0, 4).map((c) => (
                            <Badge key={c} tone="slate">{c}</Badge>
                          ))}
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">
                            {a.lastSyncAt ? `Last sync ${fmtTime(a.lastSyncAt)}` : "Not synced"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {a.status === "Connected" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Settings", message: "Wire per-app settings.", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Configure
                              </button>
                              <button
                                type="button"
                                onClick={() => disconnectApp(a.id)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConnectAppId(a.id);
                                setConnectOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Plus className="h-4 w-4" />
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredApps.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Filter className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No results</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try changing your search text.</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard className="p-4 lg:col-span-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Integration guidance</div>
                <span className="ml-auto"><Badge tone="slate">Best practice</Badge></span>
              </div>
              <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Security</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Use least-privilege scopes and rotate keys regularly.</div>
                </div>
                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="text-sm font-black text-orange-900">Webhooks</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Use signing secrets and monitor retries to prevent missing events.</div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Audit</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Log connect, disconnect, key create and revoke actions.</div>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "API keys" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-8">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">API keys</div>
                <span className="ml-auto"><Badge tone="slate">{filteredKeys.length}</Badge></span>
              </div>
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={keyQuery}
                    onChange={(e) => setKeyQuery(e.target.value)}
                    placeholder="Search by name, scope, status"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Key</div>
                  <div className="col-span-3">Scopes</div>
                  <div className="col-span-2">Last used</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {filteredKeys.map((k) => (
                    <div key={k.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{k.name}</div>
                          <Badge tone="slate">{k.id}</Badge>
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-slate-500">
                          Secret: <span className="font-black text-slate-800">{k.prefix}</span>
                          <span className="text-slate-400">••••••••••</span>
                        </div>
                      </div>

                      <div className="col-span-3 flex flex-wrap items-center gap-2">
                        {(k.scopes || []).slice(0, 3).map((s) => (
                          <Badge key={s} tone="slate">{s}</Badge>
                        ))}
                        {(k.scopes || []).length > 3 ? <Badge tone="slate">+{(k.scopes || []).length - 3}</Badge> : null}
                      </div>

                      <div className="col-span-2 flex items-center text-slate-500">
                        {k.lastUsedAt ? fmtTime(k.lastUsedAt) : "Never"}
                      </div>

                      <div className="col-span-1 flex items-center">
                        <Badge tone={statusTone(k.status)}>{k.status}</Badge>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(k.id);
                            pushToast({ title: "Copied", message: "Key ID copied.", tone: "default" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeKey(k.id)}
                          disabled={k.status === "Revoked"}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-extrabold",
                            k.status === "Revoked"
                              ? "cursor-not-allowed border-slate-200/70 bg-white dark:bg-slate-900 text-slate-400"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredKeys.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="text-lg font-black text-slate-900">No keys found</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Create a key to enable API integrations.</div>
                        <button
                          type="button"
                          onClick={() => setNewKeyOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Plus className="h-4 w-4" />
                          New API key
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 lg:col-span-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Key policy</div>
                <span className="ml-auto"><Badge tone="slate">Placeholder</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Scopes</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Grant only the scopes you need for that integration.</div>
                </div>
                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="text-sm font-black text-orange-900">Rotation</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Rotate keys every 60 to 90 days for strong security.</div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-sm font-black text-slate-900">Audit</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Log every create, copy, rotate and revoke action.</div>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Webhooks" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Webhook health dashboard</div>
                  <Badge tone="orange">Super premium</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={simulateFailure}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold text-orange-800"
                    title="Demo action"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Simulate failure
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddEndpointOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Plus className="h-4 w-4" />
                    Add endpoint
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Success trend</div>
                    <span className="ml-auto"><Badge tone="slate">Last 14</Badge></span>
                  </div>
                  <div className="mt-3"><Sparkline points={trend} /></div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">Premium: alert rules, anomaly detection and SLO windows.</div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-orange-700" />
                    <div className="text-sm font-black text-orange-900">Retry queue</div>
                    <span className="ml-auto"><Badge tone="orange">{retryQueue.length}</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-orange-900/70">Failed and timeout deliveries that can be retried.</div>
                  <div className="mt-3 space-y-2">
                    {retryQueue.length === 0 ? (
                      <div className="rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-orange-900/70">No items in queue.</div>
                    ) : (
                      retryQueue.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 p-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-black text-slate-900">{r.eventType}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{r.endpointId} · {fmtTime(r.at)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => replayEvent(r.id)}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                            style={{ background: TOKENS.orange }}
                          >
                            Retry
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Endpoints</div>
                  <span className="ml-auto"><Badge tone="slate">{filteredEndpoints.length}</Badge></span>
                </div>

                <div className="mt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={whQuery}
                      onChange={(e) => setWhQuery(e.target.value)}
                      placeholder="Search endpoints by URL, status, event"
                      className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {filteredEndpoints.map((e) => (
                    <div key={e.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", e.status === "Active" ? "bg-emerald-50 text-emerald-700" : e.status === "Degraded" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                          <Activity className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{e.id}</div>
                            <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                            <Badge tone="slate">24h {pct(e.successRate24h)}</Badge>
                            <Badge tone="slate">Signing {e.signing}</Badge>
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">
                              {e.lastDeliveryAt ? `Last delivery ${fmtTime(e.lastDeliveryAt)}` : "No deliveries yet"}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-xs font-semibold text-slate-600">{e.url}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(e.events || []).slice(0, 4).map((ev) => (
                              <Badge key={ev} tone="slate">{ev}</Badge>
                            ))}
                            {(e.events || []).length > 4 ? <Badge tone="slate">+{(e.events || []).length - 4}</Badge> : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setLogEndpoint(e.id);
                                setLogStatus("All");
                                pushToast({ title: "Filtered", message: `Logs filtered to ${e.id}.`, tone: "default" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <FileText className="h-4 w-4" />
                              View logs
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleEndpoint(e.id)}
                              className={cx(
                                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                e.status === "Paused"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-orange-200 bg-orange-50 text-orange-800"
                              )}
                            >
                              {e.status === "Paused" ? "Resume" : "Pause"}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeEndpoint(e.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredEndpoints.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="text-lg font-black text-slate-900">No endpoints</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Add an endpoint to start receiving events.</div>
                      <button
                        type="button"
                        onClick={() => setAddEndpointOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Plus className="h-4 w-4" />
                        Add endpoint
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4 lg:col-span-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Delivery logs</div>
                <span className="ml-auto"><Badge tone="slate">{filteredLogs.length}</Badge></span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={logQuery}
                    onChange={(e) => setLogQuery(e.target.value)}
                    placeholder="Search event type, status, endpoint"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Status</div>
                  <div className="relative ml-auto">
                    <select
                      value={logStatus}
                      onChange={(e) => setLogStatus(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {['All', 'Success', 'Failed', 'Timeout'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Link2 className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Endpoint</div>
                  <div className="relative ml-auto">
                    <select
                      value={logEndpoint}
                      onChange={(e) => setLogEndpoint(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {['All', ...endpoints.map((e) => e.id)].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {filteredLogs.slice(0, 16).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setActiveLogId(l.id);
                        setLogDrawerOpen(true);
                      }}
                      className={cx(
                        "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        l.result === 'Success' ? 'border-emerald-200/70' : l.result === 'Failed' ? 'border-rose-200/70' : 'border-orange-200/70'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx(
                          "grid h-11 w-11 place-items-center rounded-3xl",
                          l.result === 'Success' ? 'bg-emerald-50 text-emerald-700' : l.result === 'Failed' ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'
                        )}>
                          {l.result === 'Success' ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{l.eventType}</div>
                            <Badge tone={statusTone(l.result)}>{l.result}</Badge>
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(l.at)}</span>
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">{l.endpointId} · HTTP {l.httpStatus} · {ms(l.latencyMs)} · tries {l.tries}</div>
                          <div className="mt-2 text-xs font-semibold text-slate-600" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {l.payloadPreview}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  ))}

                  {filteredLogs.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="text-lg font-black text-slate-900">No logs</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Deliveries will appear here once events are sent.</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </div>

      {/* Connect app drawer */}
      <Drawer
        open={connectOpen}
        title="Connect an app"
        subtitle="Choose an integration and complete auth. Demo only."
        onClose={() => setConnectOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Select app</div>
            </div>
            <div className="mt-3">
              <div className="relative">
                <select
                  value={connectAppId}
                  onChange={(e) => setConnectAppId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">In production: OAuth popup, permissions review, and callback URL validation.</div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Security note</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">Only grant required permissions. Enable signing for webhooks when available.</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={connectApp}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Connect
            </button>
            <button
              type="button"
              onClick={() => setConnectOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </Drawer>

      {/* New API key drawer */}
      <Drawer
        open={newKeyOpen}
        title="Create API key"
        subtitle="Core: API keys placeholder. This demo simulates creation."
        onClose={() => setNewKeyOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">Key name</div>
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              placeholder="e.g., Backend server"
            />
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Scopes</div>
              <span className="ml-auto"><Badge tone="slate">Least privilege</Badge></span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {allScopes.map((s) => {
                const checked = keyScopes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setKeyScopes((prev) => (checked ? prev.filter((x) => x !== s) : [...prev, s]))}
                    className={cx(
                      "flex items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-extrabold",
                      checked ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                    )}
                  >
                    <span>{s}</span>
                    {checked ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">Expiry (days)</div>
            <input
              value={String(keyExpiryDays)}
              onChange={(e) => setKeyExpiryDays(Number(e.target.value))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
            <div className="mt-2 text-xs font-semibold text-slate-500">In production: enforce rotation and revoke expired keys automatically.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createKey}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <Plus className="h-4 w-4" />
              Create key
            </button>
            <button
              type="button"
              onClick={() => setNewKeyOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </Drawer>

      {/* Add endpoint drawer */}
      <Drawer
        open={addEndpointOpen}
        title="Add webhook endpoint"
        subtitle="Super premium: health, retries and logs."
        onClose={() => setAddEndpointOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-[11px] font-extrabold text-slate-600">Endpoint URL</div>
            <input
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Signing secret</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Recommended for secure verification.</div>
              </div>
              <button
                type="button"
                onClick={() => setEndpointSigning((v) => !v)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                  endpointSigning ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                )}
              >
                {endpointSigning ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Events</div>
              <span className="ml-auto"><Badge tone="slate">Select</Badge></span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {allWebhookEvents.map((ev) => {
                const checked = endpointEvents.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => setEndpointEvents((prev) => (checked ? prev.filter((x) => x !== ev) : [...prev, ev]))}
                    className={cx(
                      "flex items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-extrabold",
                      checked ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                    )}
                  >
                    <span>{ev}</span>
                    {checked ? <Check className="h-4 w-4" /> : <span className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createEndpoint}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Plus className="h-4 w-4" />
              Add endpoint
            </button>
            <button
              type="button"
              onClick={() => setAddEndpointOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </Drawer>

      {/* Log detail drawer */}
      <Drawer
        open={logDrawerOpen}
        title={activeLog ? `Delivery log · ${activeLog.id}` : "Delivery log"}
        subtitle={activeLog ? `${activeLog.eventType} · ${activeLog.endpointId} · ${fmtTime(activeLog.at)}` : "Select a log"}
        onClose={() => setLogDrawerOpen(false)}
      >
        {!activeLog ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a delivery log first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Summary</div>
                <span className="ml-auto"><Badge tone={statusTone(activeLog.result)}>{activeLog.result}</Badge></span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Row label="Event" value={activeLog.eventType} />
                <Row label="Endpoint" value={activeLog.endpointId} />
                <Row label="HTTP" value={activeLog.httpStatus} />
                <Row label="Latency" value={ms(activeLog.latencyMs)} />
                <Row label="Tries" value={String(activeLog.tries)} />
                <Row label="Time" value={fmtTime(activeLog.at)} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Payload preview</div>
                <span className="ml-auto"><Badge tone="slate">Masked</Badge></span>
              </div>
              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 font-mono text-xs text-slate-800">
                {activeLog.payloadPreview}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(activeLog.payloadPreview);
                    pushToast({ title: "Copied", message: "Payload copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy payload
                </button>
                <button
                  type="button"
                  onClick={() => replayEvent(activeLog.id)}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  Replay event
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Premium note</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Wire signature validation, idempotency keys and backoff policy configuration.</div>
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="text-xs font-semibold text-slate-800" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
