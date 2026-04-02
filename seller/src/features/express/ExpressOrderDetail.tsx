import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Truck,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";

/**
 * ExpressMart Pages (PREVIEWABLE)
 * Routes:
 * - /expressmart (Home)
 * - /expressmart/orders (Orders)
 * - /expressmart/orders/:id (Order Detail)
 * - /expressmart/order-detail (alias, uses last selected)
 *
 * Core:
 * - Fast-order ops summary
 * - Same-day pipeline + filters + batch processing
 * - Delivery status + proof of delivery
 *
 * Super premium (placeholder UI hooks):
 * - Dispatch board (later)
 * - Routing and slot management (later)
 * - Customer satisfaction feedback loop
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type BadgeTone = "green" | "orange" | "danger" | "slate";
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type RiskKey = "risk" | "watch" | "ok";
type RiskMeta = { risk: RiskKey; riskLabel: string; mins: number };
type OrderStatus = "New" | "Confirmed" | "Picking" | "Packed" | "Out for Delivery" | "Delivered" | "Failed" | "Cancelled";
type FollowUpKey = "none" | "callback" | "refund" | "replacement";
type IssueType = "Delay" | "Damaged package" | "Wrong items" | "Customer unreachable" | "Rider incident";
type OrderProof = { photo: string | null; signature: boolean; otp: string };
type OrderFeedback = { rating: number | null; note: string; followUp: FollowUpKey };
type OrderIssue = { type: IssueType; note: string; reportedAt: string };
type Order = {
  id: string;
  customer: string;
  phone: string;
  address: string;
  zone: string;
  hub: string;
  items: number;
  total: number;
  currency: string;
  status: OrderStatus;
  slot: string;
  channel: string;
  updatedAt: string;
  promisedBy: string;
  rider: string | null;
  payment: string;
  proof: OrderProof;
  feedback: OrderFeedback;
  issue: OrderIssue | null;
  risk: RiskKey;
  riskLabel: string;
  mins: number;
};
type RiderStatus = "Online" | "Busy";
type Rider = { id: string; name: string; zone: string; status: RiderStatus; capacity: number };

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode; tone?: "light" | "dark"; disabled?: boolean };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type ToastCenterProps = { toasts: Toast[]; dismiss: (id: string) => void };
type ModalProps = { open: boolean; title: string; children: React.ReactNode; onClose: () => void };
type DrawerProps = { open: boolean; title: string; subtitle?: string; children: React.ReactNode; onClose: () => void };
type EmptyStateAction = { label: string; onClick: () => void };
type EmptyStateProps = { title: string; message: string; action?: EmptyStateAction };
type KpiCardProps = { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; hint?: string; tone?: BadgeTone };
type StarsProps = { value: number; onChange: (next: number) => void };
type ExpressMartHomeProps = { orders: Order[]; navigate: (to: string) => void; openOrder: (id: string) => void };
type ExpressMartOrdersProps = {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  riders: Rider[];
  navigate: (to: string) => void;
  openOrder: (id: string) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
};
type ExpressMartOrderDetailProps = {
  order: Order | null;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  navigate: (to: string) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
};
type TimelineRowProps = { title: string; done: boolean };
type RowProps = { label: string; value: React.ReactNode; strong?: boolean };
const DETAIL_TABS = ["Overview", "Items", "Timeline", "Proof", "Customer", "Feedback"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];
const FOLLOW_UP_OPTIONS: FollowUpKey[] = ["none", "callback", "refund", "replacement"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function shortTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(amount: number | string, currency = "UGX") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
}

function minutesUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function hashCode(str: string | number) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h << 5) - h + String(str).charCodeAt(i);
    h |= 0;
  }
  return h;
}

function initials(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${String(first).toUpperCase()}${String(second || "").toUpperCase()}`.slice(0, 2);
}

function svgThumb(label: string, seed: string) {
  const clean = String(label || "EX").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "EX";
  const hue = Math.abs(hashCode(seed || clean)) % 360;
  const bg1 = `hsl(${hue}, 75%, 54%)`;
  const bg2 = `hsl(${(hue + 26) % 360}, 75%, 48%)`;
  const svg = `\n    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">\n      <defs>\n        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n          <stop offset="0" stop-color="${bg1}"/>\n          <stop offset="1" stop-color="${bg2}"/>\n        </linearGradient>\n      </defs>\n      <rect width="64" height="64" rx="16" fill="url(#g)"/>\n      <circle cx="54" cy="10" r="6" fill="rgba(255,255,255,0.22)"/>\n      <text x="32" y="38" text-anchor="middle" font-family="system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, &quot;Apple Color Emoji&quot;, &quot;Segoe UI Emoji&quot;" font-size="16" font-weight="900" fill="rgba(255,255,255,0.94)">${clean}</text>\n    </svg>\n  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function avatarSrc(name: string) {
  return svgThumb(initials(name), name);
}

function orderThumb(order?: Order) {
  const cnt = Math.min(9, Math.max(0, Number(order?.items || 0)));
  const label = `EX${cnt}`;
  return svgThumb(label, order?.id || label);
}

function riskMeta(promisedBy: string): RiskMeta {
  const mins = minutesUntil(promisedBy);
  if (mins <= 0) return { risk: "risk", riskLabel: "Overdue", mins };
  if (mins <= 60) return { risk: "risk", riskLabel: "< 1h", mins };
  if (mins <= 180) return { risk: "watch", riskLabel: "< 3h", mins };
  return { risk: "ok", riskLabel: "On track", mins };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapBackendOrderStatus(status: unknown): OrderStatus {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CONFIRMED") return "Confirmed";
  if (normalized === "PICKING") return "Picking";
  if (normalized === "PACKED") return "Packed";
  if (normalized === "OUT_FOR_DELIVERY") return "Out for Delivery";
  if (normalized === "DELIVERED") return "Delivered";
  if (normalized === "FAILED") return "Failed";
  if (normalized === "CANCELLED") return "Cancelled";
  return "New";
}

function mapUiOrderStatus(status: OrderStatus) {
  if (status === "Confirmed") return "CONFIRMED";
  if (status === "Picking") return "PICKING";
  if (status === "Packed") return "PACKED";
  if (status === "Out for Delivery") return "OUT_FOR_DELIVERY";
  if (status === "Delivered") return "DELIVERED";
  if (status === "Failed") return "FAILED";
  if (status === "Cancelled") return "CANCELLED";
  return "NEW";
}

function mapBackendExpressOrder(value: Record<string, unknown>): Order {
  const metadata = asObject(value.metadata);
  const proof = asObject(metadata.proof);
  const feedback = asObject(metadata.feedback);
  const issue = asObject(metadata.issue);
  const promisedBy =
    typeof metadata.promisedBy === "string"
      ? metadata.promisedBy
      : typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString();

  return {
    id: String(value.id || ""),
    customer: String(metadata.customer || "Buyer"),
    phone: String(metadata.phone || ""),
    address: String(metadata.address || ""),
    zone: String(metadata.zone || ""),
    hub: String(metadata.hub || value.warehouse || ""),
    items: Number(value.itemCount || 0),
    total: Number(value.total || 0),
    currency: String(value.currency || "USD"),
    status: mapBackendOrderStatus(value.status),
    slot: String(metadata.slot || ""),
    channel: String(value.channel || "ExpressMart"),
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    promisedBy,
    rider: typeof metadata.rider === "string" ? metadata.rider : null,
    payment: String(metadata.payment || ""),
    proof: {
      photo: typeof proof.photo === "string" ? proof.photo : null,
      signature: !!proof.signature,
      otp: String(proof.otp || ""),
    },
    feedback: {
      rating:
        typeof feedback.rating === "number" && Number.isFinite(feedback.rating)
          ? feedback.rating
          : null,
      note: String(feedback.note || ""),
      followUp:
        feedback.followUp === "callback" ||
        feedback.followUp === "refund" ||
        feedback.followUp === "replacement"
          ? (feedback.followUp as FollowUpKey)
          : "none",
    },
    issue:
      typeof issue.type === "string" &&
      typeof issue.note === "string" &&
      typeof issue.reportedAt === "string"
        ? {
            type: issue.type as IssueType,
            note: issue.note,
            reportedAt: issue.reportedAt,
          }
        : null,
    ...riskMeta(promisedBy),
  };
}

function mapBackendRider(value: Record<string, unknown>): Rider {
  return {
    id: String(value.id || ""),
    name: String(value.name || ""),
    zone: String(value.zone || ""),
    status: value.status === "Busy" ? "Busy" : "Online",
    capacity: Number(value.capacity || 0),
  };
}

function buildExpressOrderMetadata(order: Order) {
  return {
    customer: order.customer,
    phone: order.phone,
    address: order.address,
    zone: order.zone,
    hub: order.hub,
    slot: order.slot,
    payment: order.payment,
    promisedBy: order.promisedBy,
    rider: order.rider,
    proof: order.proof,
    feedback: order.feedback,
    issue: order.issue,
  };
}

function hashOrderForSync(order: Order) {
  return JSON.stringify({
    id: order.id,
    status: order.status,
    rider: order.rider,
    proof: order.proof,
    feedback: order.feedback,
    issue: order.issue,
    promisedBy: order.promisedBy,
    payment: order.payment,
  });
}

function getExpressOrderTransitionPath(from: OrderStatus, to: OrderStatus) {
  if (from === to) return [];

  const transitions: Record<OrderStatus, OrderStatus[]> = {
    New: ["Confirmed", "Cancelled"],
    Confirmed: ["Picking", "Cancelled"],
    Picking: ["Packed", "Cancelled"],
    Packed: ["Out for Delivery"],
    "Out for Delivery": ["Delivered", "Failed"],
    Delivered: [],
    Failed: [],
    Cancelled: [],
  };

  const queue: Array<{ status: OrderStatus; path: OrderStatus[] }> = [{ status: from, path: [] }];
  const visited = new Set<OrderStatus>([from]);

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const next of transitions[current.status] ?? []) {
      if (visited.has(next)) continue;
      const path = [...current.path, next];
      if (next === to) return path;
      visited.add(next);
      queue.push({ status: next, path });
    }
  }

  return null;
}

function Badge({ children, tone = "slate" }: BadgeProps) {
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

function GlassCard({ children, className }: GlassCardProps) {
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

function IconButton({ label, onClick, children, tone = "light", disabled }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        disabled && "cursor-not-allowed opacity-60",
        tone === "dark"
          ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }: ChipProps) {
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

function ToastCenter({ toasts, dismiss }: ToastCenterProps) {
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

function Modal({ open, title, children, onClose }: ModalProps) {
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
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[620px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Premium ops modal.</div>
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
              <div className="border-t border-slate-200/70 p-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Drawer({ open, title, subtitle, children, onClose }: DrawerProps) {
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
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[92vw] max-w-[520px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
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

function EmptyState({ title, message, action }: EmptyStateProps) {
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

      <Modal open={issueOpen} title="Report delivery issue" onClose={() => setIssueOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-rose-900">Capture the issue clearly</div>
                <div className="mt-1 text-xs font-semibold text-rose-900/70">This will mark the order as failed and save the issue in order metadata for follow-up.</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Issue type</div>
            <div className="mt-2 relative">
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-10 text-sm font-extrabold text-slate-800 outline-none"
              >
                {["Delay", "Damaged package", "Wrong items", "Customer unreachable", "Rider incident"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold text-slate-600">What happened</div>
            <textarea
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              rows={5}
              placeholder="Describe the delivery issue, next steps taken, and what support should do next."
              className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={submitIssue}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: "#DC2626" }}
          >
            Report issue
          </button>
        </div>
      </Modal>
    </div>
  );
}

function useHashRoute(defaultPath = "/expressmart") {
  const get = () => {
    const raw = typeof window !== "undefined" ? window.location.hash : "";
    const path = raw.replace(/^#/, "");
    return path || defaultPath;
  };

  const [path, setPath] = useState(get);

  useEffect(() => {
    const onHash = () => setPath(get());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (to: string) => {
    const cleaned = to.startsWith("/") ? to : `/${to}`;
    if (typeof window !== "undefined") window.location.hash = cleaned;
  };

  return { path, navigate };
}

function riskTone(risk: RiskKey) {
  if (risk === "risk") return "danger";
  if (risk === "watch") return "orange";
  return "green";
}

function statusTone(status: OrderStatus) {
  if (status === "Cancelled" || status === "Failed") return "danger";
  if (status === "Out for Delivery" || status === "Packed") return "orange";
  if (status === "Delivered") return "green";
  return "slate";
}

function KpiCard({ label, value, icon: Icon, hint, tone = "slate" }: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-xs font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Stars({ value, onChange }: StarsProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cx(
            "grid h-9 w-9 place-items-center rounded-2xl border transition",
            value >= n ? "border-orange-200 bg-orange-50 text-orange-700" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-500"
          )}
          aria-label={`${n} star`}
        >
          <Star className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function ExpressMartHome({ orders, navigate, openOrder }: ExpressMartHomeProps) {
  const now = Date.now();

  const dueSoon = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && minutesUntil(o.promisedBy) <= 180);
  const atRisk = orders.filter((o) => o.risk === "risk" && o.status !== "Delivered" && o.status !== "Cancelled");
  const outForDelivery = orders.filter((o) => o.status === "Out for Delivery");
  const deliveredToday = orders.filter((o) => o.status === "Delivered" && new Date(o.updatedAt).getTime() > now - 24 * 3600_000);

  const topWatch = orders
    .filter((o) => o.status !== "Delivered" && o.status !== "Cancelled")
    .sort((a, b) => a.mins - b.mins)
    .slice(0, 5);

  const hotZones = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      if (o.status === "Delivered" || o.status === "Cancelled") return;
      map.set(o.zone, (map.get(o.zone) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [orders]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">ExpressMart Home</div>
              <Badge tone="slate">/expressmart</Badge>
              <Badge tone="slate">Fast-order ops summary</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Same-day operations at a glance. Dispatch board will be added later.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/expressmart/orders")}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Package className="h-4 w-4" />
              Open Orders
            </button>
            <button
              type="button"
              onClick={() => navigate("/expressmart/orders")}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
            >
              <Truck className="h-4 w-4" />
              Create wave (from Orders)
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-8">
          <div className="flex items-start gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-3xl text-white"
              style={{ background: `linear-gradient(135deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}
            >
              <Truck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-black text-slate-900">Today at a glance</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Orders, SLA risk, and delivery pressure.</div>
            </div>
            <div className="ml-auto hidden md:flex items-center gap-2">
              <Badge tone="green">Auto sync</Badge>
              <Badge tone="slate">Ops</Badge>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Due in 3h" value={`${dueSoon.length}`} icon={Clock} tone={dueSoon.length ? "orange" : "green"} hint="SLA pressure" />
            <KpiCard label="At risk" value={`${atRisk.length}`} icon={AlertTriangle} tone={atRisk.length ? "danger" : "green"} hint="Needs action" />
            <KpiCard label="Out for delivery" value={`${outForDelivery.length}`} icon={Truck} tone={outForDelivery.length ? "orange" : "slate"} hint="Riders active" />
            <KpiCard label="Delivered" value={`${deliveredToday.length}`} icon={CheckCheck} tone="green" hint="Last 24 hours" />
            <KpiCard label="Hot zones" value={`${hotZones.length}`} icon={MapPin} tone={hotZones.length ? "orange" : "slate"} hint="Demand clusters" />
            <KpiCard label="Dispatch board" value="Planned" icon={BarChart3} tone="slate" hint="Coming soon" />
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Watchlist</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Top orders by urgency (click to open detail).</div>
              </div>
              <Badge tone="slate">{topWatch.length}</Badge>
            </div>

            <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                <div className="col-span-3">Order</div>
                <div className="col-span-3">Customer</div>
                <div className="col-span-3">Zone</div>
                <div className="col-span-2">SLA</div>
                <div className="col-span-1">Go</div>
              </div>
              <div className="divide-y divide-slate-200/70">
                {topWatch.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => openOrder(o.id)}
                    className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                  >
                    <div className="col-span-3">
                      <div className="text-sm font-black text-slate-900">{o.id}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{o.status} · {o.slot}</div>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="relative h-8 w-8 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <img src={avatarSrc(o.customer)} alt="" className="h-full w-full" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900">{o.customer}</div>
                        <div className="truncate text-[11px] font-semibold text-slate-500">{o.channel}</div>
                      </div>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Badge tone="slate">{o.hub}</Badge>
                      <Badge tone="slate">{o.zone}</Badge>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Badge tone={riskTone(o.risk)}>{o.riskLabel}</Badge>
                      <span className="text-[11px] font-extrabold text-slate-500">{o.mins <= 0 ? "now" : `${o.mins}m`}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Ops quick actions</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Fast actions for same-day delivery.</div>
            </div>
            <Badge tone="slate">Premium</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => navigate("/expressmart/orders")}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">Open same-day pipeline</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Filter, batch process, assign riders.</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-orange-900">Routing and slot management</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Planned: auto-routing, slot enforcement, capacity balancing.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate("/expressmart/orders")}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <Filter className="h-4 w-4" />
                      Open Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/expressmart")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                    >
                      <Truck className="h-4 w-4" />
                      Dispatch board (later)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Hot zones</div>
                <span className="ml-auto"><Badge tone="slate">Now</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {hotZones.length === 0 ? (
                  <div className="text-xs font-semibold text-slate-500">No active clusters.</div>
                ) : (
                  hotZones.map((z) => (
                    <div key={z.zone} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-xs font-extrabold text-slate-800">{z.zone}</div>
                      <Badge tone="orange">{z.count} orders</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ExpressMartOrders({
  orders,
  setOrders,
  riders,
  navigate,
  openOrder,
  pushToast,
}: ExpressMartOrdersProps) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [zone, setZone] = useState("All");
  const [hub, setHub] = useState("All");
  const [slot, setSlot] = useState("All");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [waveOpen, setWaveOpen] = useState(false);

  const statuses = ["All", "New", "Confirmed", "Picking", "Packed", "Out for Delivery", "Delivered", "Failed", "Cancelled"];

  const zones = useMemo(() => ["All", ...Array.from(new Set(orders.map((o) => o.zone)))], [orders]);
  const hubs = useMemo(() => ["All", ...Array.from(new Set(orders.map((o) => o.hub)))], [orders]);
  const slots = useMemo(() => ["All", ...Array.from(new Set(orders.map((o) => o.slot)))], [orders]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: orders.length };
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders
      .filter((o) => (status === "All" ? true : o.status === status))
      .filter((o) => (risk === "All" ? true : risk === "At Risk" ? o.risk === "risk" : o.risk === "watch"))
      .filter((o) => (zone === "All" ? true : o.zone === zone))
      .filter((o) => (hub === "All" ? true : o.hub === hub))
      .filter((o) => (slot === "All" ? true : o.slot === slot))
      .filter((o) => {
        if (!query) return true;
        const hay = `${o.id} ${o.customer} ${o.phone} ${o.address} ${o.zone} ${o.hub} ${o.status} ${o.channel}`.toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [orders, q, status, risk, zone, hub, slot]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selected[o.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((o) => delete next[o.id]);
    } else {
      filtered.forEach((o) => (next[o.id] = true));
    }
    setSelected(next);
  };

  const updateMany = (ids: string[], patch: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (!ids.includes(o.id)) return o;
        const next = { ...o, ...patch, updatedAt: new Date().toISOString() };
        const meta = riskMeta(next.promisedBy);
        return { ...next, ...meta };
      })
    );
  };

  const bulkStatus = (nextStatus: OrderStatus) => {
    if (!selectedIds.length) {
      pushToast({ title: "Select orders", message: "Choose one or more orders first.", tone: "warning" });
      return;
    }
    updateMany(selectedIds, { status: nextStatus });
    setSelected({});
    pushToast({ title: "Bulk update", message: `${selectedIds.length} set to ${nextStatus}.`, tone: "success" });
  };

  const groupedWave = useMemo(() => {
    const map = new Map();
    selectedIds.forEach((id) => {
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      const key = `${o.hub} · ${o.zone} · ${o.slot}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([k, count]) => ({ key: k, count }));
  }, [selectedIds, orders]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">ExpressMart Orders</div>
              <Badge tone="slate">/expressmart/orders</Badge>
              <Badge tone="slate">Same-day pipeline</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Filters, batch processing, and SLA awareness. Routing and slot management planned.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Refreshed", message: "Latest signals loaded.", tone: "success" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Dispatch board", message: "Planned as a super premium surface.", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
            >
              <BarChart3 className="h-4 w-4" />
              Dispatch board (later)
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
              <span className="ml-2 text-slate-500">{counts[s] ?? 0}</span>
            </Chip>
          ))}
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="grid gap-2 md:grid-cols-12 md:items-center">
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order, customer, phone, address"
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
          </div>

          <div className="md:col-span-2">
            <div className="relative">
              <select
                value={hub}
                onChange={(e) => setHub(e.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
              >
                {hubs.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="relative">
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <div className="text-xs font-extrabold text-slate-700">Risk</div>
              <div className="ml-auto inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                {["All", "Watch", "At Risk"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRisk(r)}
                    className={cx(
                      "px-4 py-2 text-xs font-extrabold transition",
                      risk === r ? "bg-orange-50 text-orange-800" : "text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600">Slot</div>
            <div className="relative">
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800 outline-none"
              >
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setStatus("All");
                setRisk("All");
                setZone("All");
                setHub("All");
                setSlot("All");
                pushToast({ title: "Filters cleared", tone: "default" });
              }}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              Clear
            </button>

            <Badge tone="slate">Showing {filtered.length}</Badge>
          </div>
        </div>
      </GlassCard>

      {selectedIds.length ? (
        <div className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">{selectedIds.length} selected</Badge>
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
            >
              <Check className="h-4 w-4" />
              {allVisibleSelected ? "Unselect all" : "Select all"}
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => bulkStatus("Confirmed")}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Confirm
              </button>
              <button
                type="button"
                onClick={() => bulkStatus("Picking")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <Package className="h-4 w-4" />
                Pick
              </button>
              <button
                type="button"
                onClick={() => bulkStatus("Packed")}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
              >
                <CheckCheck className="h-4 w-4" />
                Pack
              </button>
              <button
                type="button"
                onClick={() => bulkStatus("Out for Delivery")}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Truck className="h-4 w-4" />
                Dispatch
              </button>
              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <User className="h-4 w-4" />
                Assign rider
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast({ title: "Labels queued", message: "Wire to printer.", tone: "default" });
                  setSelected({});
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <FileText className="h-4 w-4" />
                Print labels
              </button>
              <button
                type="button"
                onClick={() => setWaveOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-emerald-800"
              >
                <Truck className="h-4 w-4" />
                Create wave
              </button>

              <button
                type="button"
                onClick={() => setSelected({})}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <GlassCard className="overflow-hidden lg:col-span-8">
          <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Same-day orders</div>
                <Badge tone="slate">{filtered.length}</Badge>
              </div>
              <div className="text-xs font-semibold text-slate-500">Select for batching, click order for detail</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={cx(
                      "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
                      allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
                    )}
                    aria-label="Select all"
                  >
                    {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                  </button>
                </div>
                <div className="col-span-3">Order</div>
                <div className="col-span-2">Customer</div>
                <div className="col-span-2">Zone</div>
                <div className="col-span-1">Slot</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">SLA</div>
              </div>

              <div className="divide-y divide-slate-200/70">
                {filtered.map((o) => {
                  const checked = !!selected[o.id];
                  return (
                    <div key={o.id} className="grid grid-cols-12 gap-2 px-4 py-3">
                      <div className="col-span-1 flex items-center">
                        <button
                          type="button"
                          onClick={() => setSelected((s) => ({ ...s, [o.id]: !checked }))}
                          className={cx(
                            "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
                            checked ? "border-emerald-200" : "border-slate-200/70"
                          )}
                          aria-label={checked ? "Unselect" : "Select"}
                        >
                          {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                        </button>
                      </div>

                      <button type="button" onClick={() => openOrder(o.id)} className="col-span-3 flex items-center gap-3 rounded-2xl text-left">
                        <span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                          <img src={orderThumb(o)} alt="" className="h-full w-full" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-900">{o.id}</span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{o.hub} · {o.channel}</span>
                        </span>
                      </button>

                      <div className="col-span-2 flex items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="relative h-10 w-10 overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <img src={avatarSrc(o.customer)} alt="" className="h-full w-full" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-slate-900">{o.customer}</div>
                            <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">Updated {shortTime(o.updatedAt)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <Badge tone="slate">{o.zone}</Badge>
                        {o.rider ? <Badge tone="slate">Rider</Badge> : <Badge tone="orange">Unassigned</Badge>}
                      </div>

                      <div className="col-span-1 flex items-center">
                        <Badge tone="slate">{o.slot}</Badge>
                      </div>

                      <div className="col-span-1 flex items-center">
                        <div>
                          <div className="text-sm font-black text-slate-900">{fmtMoney(o.total, o.currency)}</div>
                          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{o.items} items</div>
                        </div>
                      </div>

                      <div className="col-span-1 flex items-center">
                        <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                      </div>

                      <div className="col-span-1 flex items-center justify-between gap-2">
                        <div className={cx("grid h-9 w-9 place-items-center rounded-2xl", o.risk === "risk" ? "bg-rose-50 text-rose-700" : o.risk === "watch" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700")}>
                          {o.risk === "risk" ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-extrabold text-slate-700">{o.riskLabel}</div>
                          <div className="text-[11px] font-semibold text-slate-500">{o.mins <= 0 ? "now" : `${o.mins}m`}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState title="No orders found" message="Try clearing filters or changing status." action={{ label: "Clear filters", onClick: () => { setQ(""); setStatus("All"); setRisk("All"); setZone("All"); setHub("All"); setSlot("All"); } }} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Routing and slots</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Super premium surfaces (planned)</div>
            </div>
            <Badge tone="orange">Planned</Badge>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-orange-900">Auto-routing</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Generate best routes, stops, and rider loads.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => pushToast({ title: "Routing", message: "Routing engine planned.", tone: "default" })}
                className="mt-3 w-full rounded-3xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-orange-700"
              >
                Open routing (coming soon)
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Slot capacity</div>
                <span className="ml-auto"><Badge tone="slate">Planned</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Enforce slot quotas per zone, and auto-shift overflow.</div>
              <button
                type="button"
                onClick={() => pushToast({ title: "Slots", message: "Slot manager planned.", tone: "default" })}
                className="mt-3 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
              >
                Open slot manager (coming soon)
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Riders online</div>
                <span className="ml-auto"><Badge tone="slate">{riders.filter((r) => r.status === "Online").length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {riders.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", r.status === "Online" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-black text-slate-900">{r.name}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{r.zone} · Capacity {r.capacity}</div>
                    </div>
                    <Badge tone={r.status === "Online" ? "green" : "orange"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <Drawer
        open={assignOpen}
        title="Assign rider"
        subtitle="Assign selected orders to a rider."
        onClose={() => setAssignOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Selected</div>
              <span className="ml-auto"><Badge tone="slate">{selectedIds.length}</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Best practice: prefer same zone and slot grouping.</div>
          </div>

          <div className="grid gap-2">
            {riders.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (r.status !== "Online") {
                    pushToast({ title: "Rider unavailable", message: "Choose an online rider.", tone: "warning" });
                    return;
                  }
                  updateMany(selectedIds, { rider: r.name });
                  setSelected({});
                  setAssignOpen(false);
                  pushToast({ title: "Assigned", message: `${r.name} assigned to orders.`, tone: "success" });
                }}
                className={cx(
                  "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                  r.status === "Online" ? "border-slate-200/70" : "border-orange-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", r.status === "Online" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{r.name}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{r.zone} · Capacity {r.capacity}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone={r.status === "Online" ? "green" : "orange"}>{r.status}</Badge>
                      <Badge tone="slate">Dispatch-ready</Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>

          {selectedIds.length === 0 ? (
            <EmptyState title="No selected orders" message="Select orders first, then assign a rider." />
          ) : null}
        </div>
      </Drawer>

      <Modal open={waveOpen} title="Create wave" onClose={() => setWaveOpen(false)}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Wave plan</div>
              <span className="ml-auto"><Badge tone="slate">{selectedIds.length} orders</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Wave groups by hub, zone, and slot for fast dispatch.</div>
          </div>

          <div className="space-y-2">
            {groupedWave.map((g) => (
              <div key={g.key} className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-slate-800">{g.key}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Suggested: assign rider with matching zone</div>
                </div>
                <Badge tone="green">{g.count}</Badge>
              </div>
            ))}
            {groupedWave.length === 0 ? <EmptyState title="Nothing selected" message="Select orders to build a wave." /> : null}
          </div>

          <button
            type="button"
            onClick={() => {
              if (!selectedIds.length) {
                pushToast({ title: "Select orders", message: "Choose orders before creating a wave.", tone: "warning" });
                return;
              }
              setWaveOpen(false);
              setSelected({});
              pushToast({ title: "Wave created", message: "Wave created (wire to dispatch system).", tone: "success" });
            }}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Create wave
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ExpressMartOrderDetail({
  order,
  orders,
  setOrders,
  navigate,
  pushToast,
}: ExpressMartOrderDetailProps) {
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [note, setNote] = useState("");
  const [otp, setOtp] = useState(order?.proof?.otp || "");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueType, setIssueType] = useState<IssueType>("Delay");
  const [issueNote, setIssueNote] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTab("Overview");
    setNote(order?.feedback?.note || "");
    setOtp(order?.proof?.otp || "");
    setIssueOpen(false);
    setIssueType(order?.issue?.type || "Delay");
    setIssueNote(order?.issue?.note || "");
  }, [order?.id]);

  const items = useMemo(() => {
    const total = order?.total ?? 0;
    return [
      { sku: "EX-GROC-001", name: "Groceries bundle", qty: 1, unit: Math.round(total * 0.55) },
      { sku: "EX-GEN-021", name: "Household supplies", qty: 2, unit: Math.round(total * 0.2) },
      { sku: "EX-FOOD-104", name: "Snacks", qty: 1, unit: Math.round(total * 0.05) },
    ];
  }, [order?.id, order?.total]);

  if (!order) {
    return (
      <div className="w-full">
        <EmptyState title="Order not found" message="Go back to ExpressMart Orders and select an order." action={{ label: "Open Orders", onClick: () => navigate("/expressmart/orders") }} />
      </div>
    );
  }

  const setOrder = (patch: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        const next = { ...o, ...patch, updatedAt: new Date().toISOString() };
        const meta = riskMeta(next.promisedBy);
        return { ...next, ...meta };
      })
    );
  };

  const timeline = [
    { k: "New", done: ["New", "Confirmed", "Picking", "Packed", "Out for Delivery", "Delivered"].includes(order.status) },
    { k: "Confirmed", done: ["Confirmed", "Picking", "Packed", "Out for Delivery", "Delivered"].includes(order.status) },
    { k: "Picking", done: ["Picking", "Packed", "Out for Delivery", "Delivered"].includes(order.status) },
    { k: "Packed", done: ["Packed", "Out for Delivery", "Delivered"].includes(order.status) },
    { k: "Out for Delivery", done: ["Out for Delivery", "Delivered"].includes(order.status) },
    { k: "Delivered", done: ["Delivered"].includes(order.status) },
  ];

  const totalLines = items.reduce((s, i) => s + i.qty * i.unit, 0);
  const deliveryFee = Math.max(2000, Math.round(order.total * 0.08));
  const taxes = Math.max(0, Math.round(order.total * 0.02));

  const canProof = order.status === "Out for Delivery" || order.status === "Delivered";
  const submitIssue = () => {
    const finalNote = issueNote.trim();
    if (!finalNote) {
      pushToast({ title: "Issue details required", message: "Add a short description before reporting the issue.", tone: "warning" });
      return;
    }
    setOrder({
      status: "Failed",
      issue: {
        type: issueType,
        note: finalNote,
        reportedAt: new Date().toISOString(),
      },
    });
    setIssueOpen(false);
    pushToast({ title: "Issue reported", message: `${issueType} captured for this order.`, tone: "warning" });
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Order {order.id}</div>
              <Badge tone="slate">/expressmart/order-detail</Badge>
              <Badge tone={statusTone(order.status)}>{order.status}</Badge>
              <Badge tone={riskTone(order.risk)}>{order.riskLabel}</Badge>
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Delivery status, proofs, and satisfaction loop.</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/expressmart/orders")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Orders
            </button>
            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Invoice", message: "Invoice export planned.", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <FileText className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => {
                pushToast({ title: "Trust signals", message: "Open dispute prevention and audit signals.", tone: "default" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <CheckCheck className="h-4 w-4" />
              Trust
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DETAIL_TABS.map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)} tone={t === "Feedback" ? "orange" : "green"}>
            {t}
          </Chip>
        ))}
        <span className="ml-auto">
          <Badge tone={riskTone(order.risk)}>SLA {order.mins <= 0 ? "now" : `in ${order.mins}m`}</Badge>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{tab}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Core detail view for ExpressMart delivery.</div>
                </div>
                <Badge tone="slate">{order.zone}</Badge>
              </div>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
                  {tab === "Overview" ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-700" />
                            <div className="text-xs font-extrabold text-slate-600">Customer</div>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{order.customer}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{order.phone}</div>
                          <div className="mt-2"><Badge tone="slate">{order.channel}</Badge></div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-700" />
                            <div className="text-xs font-extrabold text-slate-600">Delivery</div>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{order.address}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{order.zone} · {order.hub}</div>
                          <div className="mt-2"><Badge tone="slate">Slot {order.slot}</Badge></div>
                        </div>

                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-slate-700" />
                            <div className="text-xs font-extrabold text-slate-600">Rider</div>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{order.rider || "Unassigned"}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Status: {order.status}</div>
                          <div className="mt-2"><Badge tone={order.rider ? "green" : "orange"}>{order.rider ? "Assigned" : "Needs assignment"}</Badge></div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Totals</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Includes taxes and delivery fee.</div>
                          </div>
                          <Badge tone="slate">{order.currency}</Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                          <Row label="Lines" value={fmtMoney(totalLines, order.currency)} />
                          <Row label="Taxes" value={fmtMoney(taxes, order.currency)} />
                          <Row label="Delivery fee" value={fmtMoney(deliveryFee, order.currency)} />
                          <div className="h-px bg-slate-200/70" />
                          <Row label="Total" value={fmtMoney(totalLines + taxes + deliveryFee, order.currency)} strong />
                        </div>
                      </div>

                      {order.issue ? (
                        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-700" />
                            <div className="text-sm font-black text-rose-900">Reported issue</div>
                            <span className="ml-auto"><Badge tone="danger">{order.issue.type}</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-rose-900/70">{fmtTime(order.issue.reportedAt)}</div>
                          <div className="mt-3 text-sm font-semibold text-rose-900">{order.issue.note}</div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setOrder({ status: "Out for Delivery" })}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Truck className="h-4 w-4" />
                          Mark out for delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOrder({ status: "Delivered", proof: { ...order.proof, signature: true } });
                            pushToast({ title: "Delivered", message: "Marked delivered.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <CheckCheck className="h-4 w-4" />
                          Mark delivered
                        </button>
                        <button
                          type="button"
                          onClick={() => setIssueOpen(true)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Report issue
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Items" ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Items</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Line items.</div>
                        </div>
                        <Badge tone="slate">{items.length} lines</Badge>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                          <div className="col-span-6">Item</div>
                          <div className="col-span-2">Qty</div>
                          <div className="col-span-2">Unit</div>
                          <div className="col-span-2">Line</div>
                        </div>
                        <div className="divide-y divide-slate-200/70">
                          {items.map((it) => (
                            <div key={it.sku} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                              <div className="col-span-6">
                                <div className="text-sm font-extrabold text-slate-900">{it.name}</div>
                                <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{it.sku}</div>
                              </div>
                              <div className="col-span-2 flex items-center">{it.qty}</div>
                              <div className="col-span-2 flex items-center">{fmtMoney(it.unit, order.currency)}</div>
                              <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(it.qty * it.unit, order.currency)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Timeline" ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Timeline</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Same-day stages.</div>
                        </div>
                        <Badge tone={riskTone(order.risk)}>{order.riskLabel}</Badge>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {timeline.map((t) => (
                          <TimelineRow key={t.k} title={t.k} done={t.done} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {tab === "Proof" ? (
                    <div className="grid gap-3">
                      <div className={cx("rounded-3xl border p-4", canProof ? "border-slate-200/70 bg-white dark:bg-slate-900/70" : "border-orange-200 bg-orange-50/70")}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Proof of delivery</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Photo, signature and OTP.</div>
                          </div>
                          <Badge tone={canProof ? "slate" : "orange"}>{canProof ? "Active" : "Available after dispatch"}</Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click?.()}
                            disabled={!canProof}
                            className={cx(
                              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                              !canProof && "cursor-not-allowed opacity-60"
                            )}
                            style={{ background: TOKENS.orange }}
                          >
                            <Upload className="h-4 w-4" />
                            Upload photo
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setOrder({ proof: { ...order.proof, photo: f.name } });
                              pushToast({ title: "Photo added", message: f.name, tone: "success" });
                              e.currentTarget.value = "";
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              if (!canProof) return;
                              setOrder({ proof: { ...order.proof, signature: !order.proof?.signature } });
                              pushToast({ title: "Signature toggled", message: "Updated signature flag.", tone: "default" });
                            }}
                            disabled={!canProof}
                            className={cx(
                              "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold",
                              order.proof?.signature ? "border-emerald-200 text-emerald-800" : "border-slate-200/70 text-slate-800",
                              !canProof && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <Check className="h-4 w-4" />
                            Signature
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="text-[11px] font-extrabold text-slate-600">OTP code (optional)</div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter OTP"
                                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                                disabled={!canProof}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canProof) return;
                                  setOrder({ proof: { ...order.proof, otp } });
                                  pushToast({ title: "OTP saved", message: "OTP stored.", tone: "success" });
                                }}
                                disabled={!canProof}
                                className={cx("rounded-2xl px-3 py-2 text-xs font-extrabold text-white", !canProof && "opacity-60")}
                                style={{ background: TOKENS.green }}
                              >
                                Save
                              </button>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="text-[11px] font-extrabold text-slate-600">Current proofs</div>
                            <div className="mt-2 space-y-2 text-xs font-semibold text-slate-700">
                              <div className="flex items-center justify-between">
                                <span>Photo</span>
                                <Badge tone={order.proof?.photo ? "green" : "orange"}>{order.proof?.photo ? order.proof.photo : "Missing"}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Signature</span>
                                <Badge tone={order.proof?.signature ? "green" : "orange"}>{order.proof?.signature ? "Yes" : "No"}</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>OTP</span>
                                <Badge tone={order.proof?.otp ? "green" : "slate"}>{order.proof?.otp ? "Captured" : "Optional"}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Customer" ? (
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-start gap-3">
                          <span className="relative h-12 w-12 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <img src={avatarSrc(order.customer)} alt="" className="h-full w-full" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-slate-900">{order.customer}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{order.phone}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Call", message: "Wire to dialer.", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Phone className="h-4 w-4" />
                                Call
                              </button>
                              <button
                                type="button"
                                onClick={() => pushToast({ title: "Message", message: "Wire to chat.", tone: "default" })}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Message
                              </button>
                            </div>
                          </div>
                          <Badge tone="slate">Buyer</Badge>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Address</div>
                          <span className="ml-auto"><Badge tone="slate">{order.zone}</Badge></span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-800">{order.address}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Hub: {order.hub} · Slot: {order.slot}</div>

                        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Map</div>
                            <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                          </div>
                          <div className="mt-3 grid h-[160px] place-items-center rounded-3xl border border-dashed border-slate-200 bg-gray-50 dark:bg-slate-950 text-xs font-semibold text-slate-500">
                            Map preview placeholder
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Feedback" ? (
                    <div className="grid gap-3">
                      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Star className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-orange-900">Customer satisfaction loop</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Collect rating, open follow-up tasks, and prevent repeats.</div>
                          </div>
                          <Badge tone="orange">Premium</Badge>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Rating</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Best practice: request rating only after delivery.</div>
                          </div>
                          <Badge tone={order.status === "Delivered" ? "green" : "orange"}>{order.status === "Delivered" ? "Eligible" : "Wait for delivery"}</Badge>
                        </div>

                        <div className="mt-4">
                          <Stars
                            value={Number(order.feedback?.rating || 0)}
                            onChange={(v) => {
                              setOrder({ feedback: { ...order.feedback, rating: v } });
                              pushToast({ title: "Rating saved", message: `${v} star(s)`, tone: "success" });
                            }}
                          />
                        </div>

                        <div className="mt-4">
                          <div className="text-[11px] font-extrabold text-slate-600">Notes</div>
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                            placeholder="Customer comment or internal note"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setOrder({ feedback: { ...order.feedback, note } });
                              pushToast({ title: "Saved", message: "Feedback note stored.", tone: "success" });
                            }}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <CheckCheck className="h-4 w-4" />
                            Save note
                          </button>
                        </div>

                        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-slate-700" />
                            <div className="text-sm font-black text-slate-900">Follow-up</div>
                            <span className="ml-auto"><Badge tone="slate">Workflow</Badge></span>
                          </div>
                          <div className="mt-2 text-xs font-semibold text-slate-500">Premium: auto-create ticket if rating is low.</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {FOLLOW_UP_OPTIONS.map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  setOrder({ feedback: { ...order.feedback, followUp: k } });
                                  pushToast({ title: "Follow-up set", message: k, tone: "default" });
                                }}
                                className={cx(
                                  "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                  order.feedback?.followUp === k
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                )}
                              >
                                {k}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Survey sent", message: "Send via Notify/Chatoner later.", tone: "default" })}
                              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.orange }}
                            >
                              <MessageCircle className="h-4 w-4" />
                              Send survey
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">SLA and risk</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Fast actions to reduce disputes</div>
              </div>
              <Badge tone={riskTone(order.risk)}>{order.riskLabel}</Badge>
            </div>

            <div className="mt-4 space-y-2">
              {[{
                title: order.risk !== "ok" ? "SLA risk detected" : "SLA healthy",
                message: order.risk !== "ok" ? "Send ETA update and prioritize packing and dispatch." : "Keep communication active and upload proofs on delivery.",
                tone: order.risk === "risk" ? "danger" : order.risk === "watch" ? "orange" : "green",
                action: {
                  label: "Create ETA message",
                  onClick: () => pushToast({ title: "ETA draft", message: "Draft created.", tone: "success" }),
                },
              }].map((p) => (
                <div
                  key={p.title}
                  className={cx(
                    "rounded-3xl border p-4",
                    p.tone === "danger" ? "border-rose-200 bg-rose-50/70" : p.tone === "orange" ? "border-orange-200 bg-orange-50/70" : "border-emerald-200 bg-emerald-50/70"
                  )}
                >
                  <div className="text-sm font-black text-slate-900">{p.title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-700">{p.message}</div>
                  <button
                    type="button"
                    onClick={p.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                    style={{ color: p.tone === "danger" ? "#B42318" : p.tone === "orange" ? "#B45309" : "#047857" }}
                  >
                    {p.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Rider assignment</div>
                <span className="ml-auto"><Badge tone={order.rider ? "green" : "orange"}>{order.rider ? "Assigned" : "Missing"}</Badge></span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Assign a rider before dispatch for faster delivery.</div>
              <button
                type="button"
                onClick={() => pushToast({ title: "Assign rider", message: "Assign from Orders page (batch).", tone: "default" })}
                className="mt-3 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                Assign from Orders
              </button>
            </div>

            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Premium idea</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-generate satisfaction follow-ups for low ratings and repeat issues.</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({ title, done }: TimelineRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={cx("grid h-8 w-8 place-items-center rounded-2xl border", done ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
        {done ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-500">{done ? "Completed" : "Pending"}</div>
      </div>
      <Badge tone={done ? "green" : "slate"}>{done ? "Done" : "Pending"}</Badge>
    </div>
  );
}

function Row({ label, value, strong }: RowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-700")}>{value}</div>
    </div>
  );
}

export default function ExpressMartPagesPreviewable() {
  const { path, navigate } = useHashRoute("/expressmart");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const syncedOrderHashesRef = useRef<Record<string, string>>({});
  const syncedOrderStatusesRef = useRef<Record<string, OrderStatus>>({});
  const syncingRef = useRef(false);

  const loadExpressData = async () => {
    const [ordersPayload, ridersPayload] = await Promise.all([
      sellerBackendApi.getExpressOrders().catch(() => ({ orders: [] })),
      sellerBackendApi.getExpressRiders().catch(() => ({ riders: [] })),
    ]);
    const nextOrders = Array.isArray(ordersPayload?.orders)
      ? ordersPayload.orders.map((entry) => mapBackendExpressOrder(entry))
      : [];
    const nextRiders = Array.isArray(ridersPayload?.riders)
      ? ridersPayload.riders.map((entry) => mapBackendRider(entry))
      : [];
    syncedOrderHashesRef.current = Object.fromEntries(
      nextOrders.map((order) => [order.id, hashOrderForSync(order)])
    );
    syncedOrderStatusesRef.current = Object.fromEntries(
      nextOrders.map((order) => [order.id, order.status])
    );
    setOrders(nextOrders);
    setRiders(nextRiders);
  };

  useEffect(() => {
    void loadExpressData();
  }, []);

  useEffect(() => {
    if (syncingRef.current || orders.length === 0) return;
    const changed = orders.filter(
      (order) => syncedOrderHashesRef.current[order.id] !== hashOrderForSync(order)
    );
    if (changed.length === 0) return;

    syncingRef.current = true;
    void Promise.all(
      changed.map(async (order) => {
        const syncedStatus = syncedOrderStatusesRef.current[order.id] ?? order.status;
        const transitionPath = getExpressOrderTransitionPath(syncedStatus, order.status);

        if (syncedStatus === order.status) {
          await sellerBackendApi.patchExpressOrder(order.id, {
            metadata: buildExpressOrderMetadata(order),
          });
          return;
        }

        if (!transitionPath || transitionPath.length === 0) {
          return;
        }

        for (let index = 0; index < transitionPath.length; index += 1) {
          const nextStatus = transitionPath[index];
          await sellerBackendApi.patchExpressOrder(order.id, {
            status: mapUiOrderStatus(nextStatus),
            metadata: index === transitionPath.length - 1 ? buildExpressOrderMetadata(order) : undefined,
          });
          syncedOrderStatusesRef.current[order.id] = nextStatus;
        }
      })
    )
      .then(() => {
        changed.forEach((order) => {
          syncedOrderHashesRef.current[order.id] = hashOrderForSync(order);
          syncedOrderStatusesRef.current[order.id] = order.status;
        });
      })
      .catch((error) => {
        pushToast({
          title: "Order sync failed",
          message: error instanceof Error ? error.message : "Unable to sync ExpressMart order changes.",
          tone: "danger",
        });
      })
      .finally(() => {
        syncingRef.current = false;
      });
  }, [orders]);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => orders[0]?.id || "");

  useEffect(() => {
    // Ensure path is inside /expressmart for this preview
    if (!path.startsWith("/expressmart")) navigate("/expressmart");
  }, [path]);

  useEffect(() => {
    if (!orders.find((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0]?.id || "");
    }
  }, [orders, selectedOrderId]);

  const activeOrderId = useMemo(() => {
    if (path.startsWith("/expressmart/orders/")) return path.split("/").slice(-1)[0] || selectedOrderId;
    if (path === "/expressmart/order-detail") return selectedOrderId;
    return selectedOrderId;
  }, [path, selectedOrderId]);

  const activeOrder = useMemo(() => orders.find((o) => o.id === activeOrderId) || null, [orders, activeOrderId]);

  const openOrder = (id: string) => {
    setSelectedOrderId(id);
    navigate(`/expressmart/orders/${id}`);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        <AnimatePresence mode="wait">
          <motion.div key={path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
            {path === "/expressmart" ? (
              <ExpressMartHome orders={orders} navigate={navigate} openOrder={openOrder} />
            ) : null}

            {path === "/expressmart/orders" ? (
              <ExpressMartOrders
                orders={orders}
                setOrders={setOrders}
                riders={riders}
                navigate={navigate}
                openOrder={openOrder}
                pushToast={pushToast}
              />
            ) : null}

            {path === "/expressmart/order-detail" || path.startsWith("/expressmart/orders/") ? (
              <ExpressMartOrderDetail
                order={activeOrder}
                orders={orders}
                setOrders={setOrders}
                navigate={navigate}
                pushToast={pushToast}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
