import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { markSellerOrderOpened } from "../../lib/attentionState";
import { sellerBackendApi } from "../../lib/backendApi";
import { formatOrderDisplayId, formatOrderItemDisplaySku } from "../../lib/orderIds";
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
  MessageCircle,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Upload,
  User,
  X,
} from "lucide-react";

/**
 * Orders + Ops Preview Host (PREVIEWABLE)
 * - Pure JSX (Preview works)
 * - Pages inside one preview:
 *   /orders (list + kanban), /orders/:id (detail), /ops/returns, /ops/disputes
 *
 * Requested changes:
 * 1) Order Detail is per-order (opened from Orders), NOT a top-level tab.
 * 2) Removed all images (no <img> thumbnails or avatar images).
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

type SelectionMap = Record<string, boolean>;
type Prompt = {
  tone: "green" | "orange" | "danger";
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
};
type RiskLevel = "risk" | "watch" | "ok";
type RiskMeta = { risk: RiskLevel; label: string; mins: number };
type Order = {
  id: string;
  customer: string;
  channel: string;
  items: number;
  total: number;
  currency: string;
  status: string;
  warehouse: string;
  updatedAt: string;
  slaDueAt: string;
  risk: RiskLevel;
  label: string;
  mins: number;
};
type ReturnCase = {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  pathway: string;
  amount: number;
  currency: string;
  createdAt: string;
};
type DisputeCase = {
  id: string;
  orderId: string;
  type: string;
  status: string;
  risk: number;
  createdAt: string;
  updatedAt: string;
};
type BackendRecord = Record<string, unknown>;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtMoney(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function exportInvoiceFile(order) {
  const displayOrderId = formatOrderDisplayId(order.id);
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const lines = [
      "EVzone Invoice",
      `Order: ${displayOrderId}`,
      `Customer: ${order.customer}`,
      `Channel: ${order.channel}`,
      `Items: ${order.items}`,
      `Status: ${order.status}`,
      `Warehouse: ${order.warehouse}`,
      `Updated: ${shortTime(order.updatedAt)}`,
      `Total: ${fmtMoney(order.total, order.currency)}`,
      `Exported: ${new Date().toISOString()}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${displayOrderId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

function shortTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function minutesUntil(iso) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60000);
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1];
  return `${String(first).toUpperCase()}${String(second || "").toUpperCase()}`.slice(0, 2);
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) {
    h = (h << 5) - h + String(str).charCodeAt(i);
    h |= 0;
  }
  return h;
}

function hueFromSeed(seed) {
  return Math.abs(hashCode(seed)) % 360;
}

function displayOrderId(value: string) {
  return formatOrderDisplayId(String(value || ""));
}

function riskMeta(slaDueAt: string): RiskMeta {
  const mins = minutesUntil(slaDueAt);
  if (mins <= 0) return { risk: "risk", label: "Overdue", mins };
  if (mins <= 120) return { risk: "risk", label: "< 2h", mins };
  if (mins <= 480) return { risk: "watch", label: "< 8h", mins };
  return { risk: "ok", label: "On track", mins };
}

function formatOrderStatus(value: unknown) {
  const status = String(value || "")
    .toLowerCase()
    .replace(/_/g, " ");
  if (!status) return "Draft";
  return status.replace(/\b\w/g, (char) => char.toUpperCase());
}

function asRecord(value: unknown): BackendRecord {
  return value && typeof value === "object" ? (value as BackendRecord) : {};
}

function asArray(value: unknown): BackendRecord[] {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

function mapBackendOrder(entry: BackendRecord): Order {
  const metadata = asRecord(entry.metadata);
  const slaDueAt =
    typeof metadata.slaDueAt === "string" && metadata.slaDueAt
      ? metadata.slaDueAt
      : new Date(Date.now() + 6 * 3600_000).toISOString();
  return {
    id: String(entry.id || ""),
    customer: String(metadata.customer || "Customer"),
    channel: String(entry.channel || "EVzone"),
    items: Number(entry.itemCount || 0),
    total: Number(entry.total || 0),
    currency: String(entry.currency || "USD"),
    status: formatOrderStatus(entry.status),
    warehouse: String(entry.warehouse || "Main Warehouse"),
    updatedAt: String(entry.updatedAt || new Date().toISOString()),
    slaDueAt,
    ...riskMeta(slaDueAt),
  };
}

function mapBackendReturn(entry: BackendRecord): ReturnCase {
  const metadata = asRecord(entry.metadata);
  return {
    id: String(entry.id || ""),
    orderId: String(entry.orderId || ""),
    status: String(metadata.displayStatus || formatOrderStatus(entry.status)),
    reason: String(entry.reason || "Support case"),
    pathway: String(metadata.pathway || "Refund"),
    amount: Number(metadata.amount || 0),
    currency: String(metadata.currency || "USD"),
    createdAt: String(entry.requestedAt || entry.createdAt || new Date().toISOString()),
  };
}

function mapBackendDispute(entry: BackendRecord): DisputeCase {
  const metadata = asRecord(entry.metadata);
  return {
    id: String(entry.id || ""),
    orderId: String(entry.orderId || ""),
    type: String(entry.reason || "Dispute"),
    status: String(metadata.displayStatus || formatOrderStatus(entry.status)),
    risk: Number(metadata.risk || 0),
    createdAt: String(entry.openedAt || entry.createdAt || new Date().toISOString()),
    updatedAt: String(entry.updatedAt || entry.resolvedAt || new Date().toISOString()),
  };
}

function mapOrderDetail(entry: BackendRecord): Order {
  const metadata = asRecord(entry.metadata);
  const buyer = asRecord(entry.buyer);
  const items = asArray(entry.items);
  const slaDueAt =
    typeof metadata.slaDueAt === "string" && metadata.slaDueAt
      ? metadata.slaDueAt
      : new Date(Date.now() + 6 * 3600_000).toISOString();
  return {
    id: String(entry.id || ""),
    customer: String(metadata.customer || buyer.name || buyer.email || "Customer"),
    channel: String(entry.channel || "EVzone"),
    items: Number(entry.itemCount || items.length || 0),
    total: Number(entry.total || 0),
    currency: String(entry.currency || "USD"),
    status: formatOrderStatus(entry.status),
    warehouse: String(metadata.warehouse || entry.warehouse || "Main Warehouse"),
    updatedAt: String(entry.updatedAt || entry.createdAt || new Date().toISOString()),
    slaDueAt,
    ...riskMeta(slaDueAt),
  };
}

function mapDetailItems(entry: BackendRecord) {
  return asArray(entry.items)
    .map((item) => ({
      sku: formatOrderItemDisplaySku(
        typeof item.sku === "string" ? item.sku : null,
        typeof item.id === "string" ? item.id : null
      ),
      name: String(item.name || item.title || ""),
      qty: Number(item.qty || 0),
      unit: Number(item.unitPrice || item.unit || item.price || 0),
    }))
    .filter((item) => item.name || item.sku);
}

function mapDetailProofs(entry: BackendRecord) {
  const metadata = asRecord(entry.metadata);
  return asArray(metadata.proofs).map((proof, index) => ({
    id: String(proof.id || `proof_${index + 1}`),
    name: String(proof.name || proof.fileName || "Proof"),
    uploadedAt: String(proof.uploadedAt || proof.createdAt || new Date().toISOString()),
    visibility: String(proof.visibility || "internal"),
  }));
}

function mapDetailMessages(entry: BackendRecord) {
  const metadata = asRecord(entry.metadata);
  return asArray(metadata.messages).map((message, index) => ({
    id: String(message.id || `message_${index + 1}`),
    from: String(message.from || message.sender || "buyer"),
    at: String(message.at || message.createdAt || new Date().toISOString()),
    text: String(message.text || message.body || ""),
    lang: String(message.lang || message.language || "en"),
  }));
}

function mapDetailAudit(entry: BackendRecord) {
  const metadata = asRecord(entry.metadata);
  return asArray(metadata.audit).map((event, index) => ({
    id: String(event.id || `audit_${index + 1}`),
    at: String(event.at || event.createdAt || new Date().toISOString()),
    actor: String(event.actor || "System"),
    action: String(event.action || event.title || "Updated"),
    detail: String(event.detail || event.message || ""),
  }));
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
        tone === "dark" ? "border-white/25 bg-white dark:bg-slate-900/12 text-white hover:bg-gray-50 dark:hover:bg-slate-800/18" : "border-slate-200/70 bg-white dark:bg-slate-900/80 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
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
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <SparkleDot />
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

function SparkleDot() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" fill="currentColor" opacity="0.65" />
      <path d="M10 1l1.2 5.1L16 7.3l-4.8 1.2L10 13l-1.2-4.5L4 7.3l4.8-1.2L10 1z" fill="currentColor" opacity="0.18" />
    </svg>
  );
}

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[80] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: 10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.98 }}
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

function Modal({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[75] max-h-[90vh] w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Premium UI with safe actions and clear results.</div>
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
              <div className="border-t border-slate-200/70 p-3">
                <button type="button" onClick={onClose} className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800">
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

function Drawer({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[92vw] max-w-[520px] border-l border-slate-200/70 bg-white dark:bg-slate-900/90 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">High signal, fast workflows.</div>
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{title}</div>
          {subtitle ? <div className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
      </div>
    </div>
  );
}

function AvatarCircle({ name, size = 40 }: { name: string; size?: number }) {
  const hue = hueFromSeed(name);
  const bg = `hsl(${hue}, 70%, 92%)`;
  const fg = `hsl(${hue}, 55%, 28%)`;
  const text = initials(name);

  return (
    <div
      className="grid place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900"
      style={{ height: size, width: size, background: bg, color: fg }}
      aria-label={name}
      title={name}
    >
      <span className={cx(size >= 40 ? "text-xs" : "text-[10px]", "font-black")}>{text}</span>
    </div>
  );
}

function OrdersTable({ rows, selected, setSelected, toggleAll, allVisibleSelected, onOpen }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-1 flex items-center">
          <button
            type="button"
            onClick={toggleAll}
            className={cx(
              "grid h-8 w-8 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
              allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
            )}
            aria-label="Select all"
          >
            {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
          </button>
        </div>
        <div className="col-span-3">Order</div>
        <div className="col-span-2">Customer</div>
        <div className="col-span-1">Items</div>
        <div className="col-span-2">Total</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1">SLA</div>
      </div>

      <div className="divide-y divide-slate-200/70">
        {rows.map((o) => {
          const checked = !!selected[o.id];
          const riskTone = o.risk === "risk" ? "danger" : o.risk === "watch" ? "orange" : "slate";

          return (
            <div key={o.id} className="grid grid-cols-12 gap-2 px-4 py-3">
              <div className="col-span-1 flex items-center">
                <button
                  type="button"
                  onClick={() => setSelected((s) => ({ ...s, [o.id]: !checked }))}
                  className={cx(
                    "grid h-8 w-8 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                    checked ? "border-emerald-200" : "border-slate-200/70"
                  )}
                  aria-label={checked ? "Unselect" : "Select"}
                >
                  {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                </button>
              </div>

              <button type="button" onClick={() => onOpen(o.id)} className="col-span-3 flex items-center gap-3 rounded-2xl text-left">
                <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <Package className="h-5 w-5 text-slate-800" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-900">{o.id}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{o.channel} · {o.warehouse}</span>
                </span>
              </button>

              <div className="col-span-2 flex items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarCircle name={o.customer} size={40} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-900">{o.customer}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Updated {shortTime(o.updatedAt)}</div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 flex items-center text-sm font-extrabold text-slate-800">{o.items}</div>

              <div className="col-span-2 flex items-center">
                <div>
                  <div className="text-sm font-black text-slate-900">{fmtMoney(o.total, o.currency)}</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Taxes calculated</div>
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Badge tone={o.status === "Cancelled" ? "danger" : o.status === "On Hold" ? "orange" : o.status === "Delivered" ? "green" : "slate"}>
                  {o.status}
                </Badge>
                {o.risk !== "ok" ? <Badge tone={riskTone}>{o.label}</Badge> : null}
              </div>

              <div className="col-span-1 flex items-center">
                <div
                  className={cx(
                    "grid h-9 w-9 place-items-center rounded-2xl",
                    o.risk === "risk" ? "bg-rose-50 text-rose-700" : o.risk === "watch" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {o.risk === "risk" ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrdersList({
  orders,
  openOrder,
  pushToast,
}: {
  orders: Order[];
  openOrder: (id: string) => void;
  pushToast: (t: Omit<Toast, "id">) => void;
}) {
  const [view, setView] = useState("list");
  const [grouped, setGrouped] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [warehouse, setWarehouse] = useState("All");

  const [exportOpen, setExportOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const [selected, setSelected] = useState<SelectionMap>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const counts = useMemo(() => {
    const map = { All: orders.length };
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return map;
  }, [orders]);

  const warehouses = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => s.add(o.warehouse));
    return ["All", ...Array.from(s)];
  }, [orders]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "All" && o.status !== status) return false;
      if (warehouse !== "All" && o.warehouse !== warehouse) return false;
      if (risk === "At Risk" && o.risk !== "risk") return false;
      if (risk === "Watch" && o.risk !== "watch") return false;
      if (!query) return true;
      const hay = `${o.id} ${o.customer} ${o.channel} ${o.status} ${o.warehouse}`.toLowerCase();
      return hay.includes(query);
    });
  }, [orders, q, status, warehouse, risk]);

  const groupedByWarehouse = useMemo(() => {
    const map = new Map<string, Order[]>();
    filtered.forEach((o) => {
      const k = o.warehouse;
      if (!map.has(k)) map.set(k, []);
      map.get(k)?.push(o);
    });
    return Array.from(map.entries()).map(([warehouseName, items]) => ({ warehouseName, items }));
  }, [filtered]);

  const kanban = useMemo(() => {
    const cols = ["New", "Confirmed", "Packed", "Shipped", "Delivered", "On Hold", "Cancelled"];
    const map = new Map<string, Order[]>(cols.map((c) => [c, [] as Order[]]));
    filtered.forEach((o) => map.get(o.status)?.push(o));
    return cols.map((c) => ({ status: c, items: map.get(c) || [] }));
  }, [filtered]);

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

  const bulkAction = (kind) => {
    if (!selectedIds.length) {
      pushToast({ title: "Select orders", message: "Choose one or more orders first.", tone: "warning" });
      return;
    }
    if (kind === "Batch") {
      setBatchOpen(true);
      return;
    }
    const prev = { ...selected };
    setSelected({});
    pushToast({
      title: `Bulk action: ${kind}`,
      message: `${selectedIds.length} order(s) updated (wire to API).`,
      tone: "success",
      action: { label: "Undo", onClick: () => setSelected(prev) },
    });
  };

  const StatusPills = ["All", "New", "Confirmed", "Packed", "Shipped", "Delivered", "On Hold", "Cancelled"];

  return (
    <div>
      <SectionHeader
        title="Orders"
        subtitle="Status pipeline, smart filters, bulk actions, exports. Premium: kanban, SLA flags, batching by warehouse."
        right={
          <>
            <button
              type="button"
              onClick={() => pushToast({ title: "Refreshed", message: "Latest signals loaded.", tone: "success" })}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Receipt className="h-4 w-4" />
              Export
            </button>

            <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cx("px-4 py-2 text-xs font-extrabold", view === "list" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cx("px-4 py-2 text-xs font-extrabold", view === "kanban" ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
              >
                Kanban
              </button>
            </div>

            <button
              type="button"
              onClick={() => setGrouped((v) => !v)}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold",
                grouped ? "border-emerald-200 text-emerald-800" : "border-slate-200/70 text-slate-800"
              )}
            >
              <Filter className="h-4 w-4" />
              {grouped ? "Grouped" : "Ungrouped"}
            </button>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order ID, customer, warehouse, channel…"
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
          {StatusPills.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
              <span className="ml-2 text-slate-500">{counts[s] ?? 0}</span>
            </Chip>
          ))}
        </div>

        <div className="lg:col-span-12 flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
            {["All", "Watch", "At Risk"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRisk(r)}
                className={cx("px-4 py-2 text-xs font-extrabold", risk === r ? "bg-orange-50 text-orange-800" : "text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800")}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs font-extrabold text-slate-600">Warehouse</div>
            <div className="relative">
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 pr-9 text-xs font-extrabold text-slate-800 outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <Badge tone="slate">Showing {filtered.length}</Badge>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }} className="sticky top-[12px] z-30 mt-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="green">{selectedIds.length} selected</Badge>
                <button
                  type="button"
                  onClick={() => setSelected({})}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {["Confirm", "Pack", "Ship", "Print", "Batch"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => bulkAction(a)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold",
                        a === "Batch" ? "border border-emerald-200 bg-white dark:bg-slate-900 text-emerald-800" : "text-white"
                      )}
                      style={a === "Batch" ? undefined : { background: TOKENS.green }}
                    >
                      <Check className="h-4 w-4" />
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4">
        {view === "kanban" ? (
          <div className="grid gap-3 lg:grid-cols-7">
            {kanban.map((col) => (
              <GlassCard key={col.status} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-slate-700">{col.status}</div>
                  <Badge tone="slate">{col.items.length}</Badge>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {col.items.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/60 p-3 text-[11px] font-semibold text-slate-500">No orders</div>
                  ) : (
                    col.items.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => openOrder(o.id)}
                        className={cx(
                          "rounded-3xl border bg-white dark:bg-slate-900/70 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          o.risk === "risk" ? "border-rose-200" : o.risk === "watch" ? "border-orange-200" : "border-slate-200/70"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                            <Package className="h-4 w-4 text-slate-800" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-xs font-black text-slate-900">{o.id}</div>
                              {o.risk !== "ok" ? <Badge tone={o.risk === "risk" ? "danger" : "orange"}>{o.label}</Badge> : null}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <AvatarCircle name={o.customer} size={24} />
                              <div className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-500">{o.customer}</div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone="slate">{o.warehouse}</Badge>
                              <span className="ml-auto text-[11px] font-extrabold text-slate-700">{fmtMoney(o.total, o.currency)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        ) : grouped ? (
          <div className="space-y-4">
            {groupedByWarehouse.map((g) => (
              <div key={g.warehouseName}>
                <div className="mb-2 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">{g.warehouseName}</div>
                  <Badge tone="slate">{g.items.length}</Badge>
                </div>
                <OrdersTable
                  rows={g.items}
                  selected={selected}
                  setSelected={setSelected}
                  toggleAll={toggleAll}
                  allVisibleSelected={allVisibleSelected}
                  onOpen={(id) => openOrder(id)}
                />
              </div>
            ))}
            {filtered.length === 0 ? <EmptyState title="No results" message="Try adjusting filters or clearing search." /> : null}
          </div>
        ) : (
          <OrdersTable
            rows={filtered}
            selected={selected}
            setSelected={setSelected}
            toggleAll={toggleAll}
            allVisibleSelected={allVisibleSelected}
            onOpen={(id) => openOrder(id)}
          />
        )}
      </div>

      <Modal open={exportOpen} title="Export orders" onClose={() => setExportOpen(false)}>
        <div className="grid gap-2">
          {[{ k: "csv", t: "CSV", d: "For spreadsheets and pipelines" }, { k: "xlsx", t: "Excel", d: "Formatted workbook" }, { k: "pdf", t: "PDF", d: "Shareable report" }].map((x) => (
            <button
              key={x.k}
              type="button"
              onClick={() => {
                setExportOpen(false);
                pushToast({ title: `Export started (${x.t})`, message: "Generating file.", tone: "success" });
              }}
              className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">{x.t}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                  <div className="mt-2 text-[11px] font-extrabold text-slate-500">Includes filters, SLA flags, warehouse grouping</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <Drawer open={batchOpen} title="Batch by warehouse" onClose={() => setBatchOpen(false)}>
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-700" />
            <div className="text-sm font-black text-slate-900">Wave planning</div>
            <span className="ml-auto"><Badge tone="slate">Batching</Badge></span>
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">Split selected orders into fulfillment batches and print labels.</div>
        </div>

        <div className="mt-4 space-y-3">
          {Object.entries(
            selectedIds.reduce((acc, id) => {
              const o = orders.find((x) => x.id === id);
              const wh = o?.warehouse || "Unknown";
              acc[wh] = (acc[wh] || 0) + 1;
              return acc;
            }, {})
          ).map(([wh, count]) => (
            <div key={wh} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">{wh}</div>
                <span className="ml-auto"><Badge tone="green">{count} orders</Badge></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Wave created", message: `${wh} wave planned (wire to WMS).`, tone: "success" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Create wave
                </button>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Labels queued", message: `${wh} labels queued (wire to printer).`, tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Receipt className="h-4 w-4" />
                  Print labels
                </button>
              </div>
            </div>
          ))}
          {selectedIds.length === 0 ? <EmptyState title="No selected orders" message="Select orders in the table then open batching." /> : null}
        </div>

        <button
          type="button"
          onClick={() => {
            setBatchOpen(false);
            setSelected({});
            pushToast({ title: "Batches finalized", message: "Batch planning completed.", tone: "success" });
          }}
          className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
          style={{ background: TOKENS.green }}
        >
          Finalize batches
        </button>
      </Drawer>
    </div>
  );
}

function TimelineRow({ title, subtitle, done }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cx("grid h-8 w-8 place-items-center rounded-2xl border", done ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900")}>
        {done ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs font-semibold text-slate-500">{subtitle}</div>
      </div>
      <Badge tone={done ? "green" : "slate"}>{done ? "Done" : "Pending"}</Badge>
    </div>
  );
}

function MiniCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
        <div className="text-xs font-extrabold text-slate-600">{title}</div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-700")}>{value}</div>
    </div>
  );
}

function OrderDetail({ orderId, orders, onBack, pushToast }) {
  const [detailRecord, setDetailRecord] = useState<BackendRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const order = useMemo(() => {
    const matched = orders.find((o) => o.id === orderId);
    if (detailRecord) return mapOrderDetail(detailRecord);
    if (detailError) return null;
    if (matched) return matched;
    return null;
  }, [detailError, detailRecord, orderId, orders]);

  const [tab, setTab] = useState("Overview");
  const [translate, setTranslate] = useState(true);
  const [draft, setDraft] = useState("");
  const [proofs, setProofs] = useState<
    Array<{ id: string; name: string; uploadedAt: string; visibility: string }>
  >([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleProofUpload = () => {
    setTab("Proofs");
    fileRef.current?.click?.();
  };

  useEffect(() => {
    if (!orderId) {
      return;
    }

    void markSellerOrderOpened(orderId);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setDetailRecord(null);
      setDetailLoading(false);
      setDetailError("");
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    void sellerBackendApi
      .getSellerOrderDetail(orderId)
      .then((payload) => {
        if (active) {
          setDetailRecord(asRecord(payload));
        }
      })
      .catch((error) => {
        if (active) {
          setDetailRecord(null);
          setDetailError(error instanceof Error ? error.message : "Unable to load order detail.");
        }
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    setProofs(detailRecord ? mapDetailProofs(detailRecord) : []);
  }, [detailRecord]);

  const metadata = useMemo(() => asRecord(detailRecord?.metadata), [detailRecord]);
  const shippingMeta = useMemo(() => asRecord(metadata.shipping), [metadata]);
  const paymentMeta = useMemo(() => asRecord(metadata.payment), [metadata]);
  const items = useMemo(() => (detailRecord ? mapDetailItems(detailRecord) : []), [detailRecord]);

  const pricing = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.unit, 0);
    const taxes = Number(metadata.taxes || metadata.tax || 0);
    const shipping = Number(metadata.shipping || metadata.shippingAmount || 0);
    const total = Number(detailRecord?.total || order?.total || subtotal + taxes + shipping);
    return { subtotal, taxes, shipping, total };
  }, [detailRecord, items, metadata, order]);

  const meta = order ? riskMeta(order.slaDueAt) : { risk: "ok", label: "On track", mins: 0 };

  const missingTracking = !String(
    shippingMeta.trackingNumber || shippingMeta.tracking || metadata.trackingNumber || ""
  ).trim();

  const prompts = useMemo<Prompt[]>(() => {
    const list: Prompt[] = [];
    if (meta.risk !== "ok") {
      list.push({
        tone: meta.risk === "risk" ? "danger" : "orange",
        title: "SLA risk detected",
        message: "Send a proactive ETA update to prevent disputes and chargebacks.",
        action: {
          label: "Create ETA message",
          onClick: () => {
            setTab("Messages");
            setDraft("Update: Your order is being prepared. Estimated ship time: today. We will share tracking shortly.");
            pushToast({ title: "Draft created", message: "ETA message draft is ready.", tone: "success" });
          },
        },
      });
    }
    if (missingTracking) {
      list.push({
        tone: "orange",
        title: "Tracking not shared",
        message: "If shipped, add tracking and attach a shipping label to avoid 'Item not received' disputes.",
        action: { label: "Upload proof", onClick: handleProofUpload },
      });
    }
    if (list.length === 0) {
      list.push({
        tone: "green",
        title: "Dispute prevention: OK",
        message: "Everything looks healthy. Keep communication active and upload proofs as you ship.",
        action: { label: "Open templates", onClick: () => pushToast({ title: "Templates", message: "Use message templates for faster replies.", tone: "default" }) },
      });
    }
    return list;
  }, [meta.risk, missingTracking, pushToast, handleProofUpload]);

  const messages = useMemo(() => (detailRecord ? mapDetailMessages(detailRecord) : []), [detailRecord]);
  const audit = useMemo(() => (detailRecord ? mapDetailAudit(detailRecord) : []), [detailRecord]);

  if (detailLoading) {
    return (
      <div>
        <SectionHeader
          title={orderId ? `Order ${displayOrderId(orderId)}` : "Order"}
          subtitle="Loading order detail."
          right={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Orders
            </button>
          }
        />
        <GlassCard className="p-5">
          <div className="text-sm font-semibold text-slate-600">Loading order detail...</div>
        </GlassCard>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <SectionHeader
          title={orderId ? `Order ${displayOrderId(orderId)}` : "Order"}
          subtitle="Per-order detail."
          right={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Orders
            </button>
          }
        />
        <GlassCard className="p-5">
          <EmptyState
            title="No order data"
            message={detailError || "This account does not have accessible data for the selected order."}
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={`Order ${displayOrderId(order.id)}`}
        subtitle="Per-order detail: timeline, items, taxes, shipping, messages. Premium: proof uploads, dispute prevention prompts, audit snippet."
        right={
          <>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Orders
            </button>
            <button
              type="button"
              onClick={() => {
                const ok = exportInvoiceFile(order);
                pushToast({
                  title: ok ? "Invoice exported" : "Export failed",
                  message: ok ? "Invoice text file downloaded." : "Unable to export invoice.",
                  tone: ok ? "success" : "danger",
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <Receipt className="h-4 w-4" />
              Export invoice
            </button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          const input = e.currentTarget;
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          const next = files.map((f) => ({
            id: makeId("proof"),
            name: f.name,
            uploadedAt: new Date().toISOString(),
            visibility: "internal",
          }));
          setProofs((s) => [...next, ...s]);
          pushToast({
            title: "Proof added",
            message: `${files.length} file(s) uploaded (local).`,
            tone: "success",
          });
          input.value = "";
        }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["Overview", "Items", "Messages", "Proofs", "Audit"].map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t}
          </Chip>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a
            href={`/orders/${order.id}/print/invoice`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Print Invoice
          </a>
          <a
            href={`/orders/${order.id}/print/packing-slip`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Print Packing
          </a>
          <a
            href={`/orders/${order.id}/print/sticker`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Print Sticker
          </a>
          <Badge tone={meta.risk === "risk" ? "danger" : meta.risk === "watch" ? "orange" : "green"}>SLA {meta.label}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">{tab}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Order-level operations with safe actions.</div>
                </div>
                <Badge tone="slate">{order.status}</Badge>
              </div>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
                  {tab === "Overview" ? (
                    <div className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <MiniCard title="Customer" icon={User}>
                          <div className="flex items-center gap-3">
                            <AvatarCircle name={order.customer} size={40} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{order.customer}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{String(metadata.customerLocation || "No location on file")}</div>
                            </div>
                          </div>
                        </MiniCard>
                        <MiniCard title="Shipping" icon={Truck}>
                          <div className="text-sm font-black text-slate-900">{String(shippingMeta.method || shippingMeta.service || "Not available")}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Carrier: {String(shippingMeta.carrier || "Not available")}</div>
                          <div className="mt-2">
                            <Badge tone={missingTracking ? "orange" : "green"}>
                              {missingTracking ? "Tracking pending" : String(shippingMeta.trackingNumber || shippingMeta.tracking)}
                            </Badge>
                          </div>
                        </MiniCard>
                        <MiniCard title="Payment" icon={Receipt}>
                          <div className="text-sm font-black text-slate-900">{String(paymentMeta.status || metadata.paymentStatus || "Not available")}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{String(paymentMeta.method || metadata.paymentMethod || "No payment method on file")}</div>
                          <div className="mt-2"><Badge tone="slate">{String(paymentMeta.reference || paymentMeta.id || "No reference")}</Badge></div>
                        </MiniCard>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Timeline</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Operational steps with audit entry points.</div>
                          </div>
                          <Badge tone={meta.risk === "risk" ? "danger" : meta.risk === "watch" ? "orange" : "green"}>Due {meta.mins <= 0 ? "now" : `in ${meta.mins}m`}</Badge>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <TimelineRow title="Order created" subtitle="Payment authorized" done />
                          <TimelineRow title="Confirmed" subtitle="Stock verified" done={order.status !== "New"} />
                          <TimelineRow title="Packed" subtitle="Awaiting packing proof" done={order.status === "Packed" || order.status === "Shipped" || order.status === "Delivered"} />
                          <TimelineRow title="Shipped" subtitle="Tracking pending" done={order.status === "Shipped" || order.status === "Delivered"} />
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Totals</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Includes taxes and shipping</div>
                          </div>
                          <Badge tone="slate">{order.currency}</Badge>
                        </div>
                        <div className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
                          <Row label="Subtotal" value={fmtMoney(pricing.subtotal, order.currency)} />
                          <Row label="Taxes" value={fmtMoney(pricing.taxes, order.currency)} />
                          <Row label="Shipping" value={fmtMoney(pricing.shipping, order.currency)} />
                          <div className="h-px bg-slate-200/70" />
                          <Row label="Total" value={fmtMoney(pricing.total, order.currency)} strong />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Items" ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Items</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Line items with unit and totals</div>
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

                  {tab === "Messages" ? (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Conversation</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Templates, auto-translation, and fast replies.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTranslate((v) => !v)}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold",
                            translate ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                          )}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {translate ? "Auto-translate ON" : "Auto-translate OFF"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            className={cx(
                              "max-w-[92%] rounded-3xl border p-3",
                              m.from === "supplier" ? "ml-auto border-emerald-200 bg-emerald-50/60" : "mr-auto border-slate-200/70 bg-white dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Badge tone={m.from === "supplier" ? "green" : "slate"}>{m.from === "supplier" ? "You" : "Buyer"}</Badge>
                              <span className="ml-auto text-[10px] font-extrabold text-slate-400">{shortTime(m.at)}</span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-slate-800">{translate ? `${m.text}` : m.text}</div>
                            <div className="mt-2 text-[10px] font-extrabold text-slate-500">Lang: {m.lang}</div>
                          </div>
                        ))}
                        {messages.length === 0 ? (
                          <EmptyState title="No messages yet" message="Order messages will appear here when this account sends or receives them." />
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {["Thanks, we are preparing it now.", "We will share tracking within 2 hours.", "Your order is packed. Shipping shortly."].map((tpl) => (
                          <button key={tpl} type="button" onClick={() => setDraft(tpl)} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800">
                            {tpl}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Write a message…"
                          className="h-11 flex-1 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!draft.trim()) return;
                            pushToast({ title: "Message sent", message: "Buyer updated (wire to messaging).", tone: "success" });
                            setDraft("");
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Check className="h-4 w-4" />
                          Send
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {tab === "Proofs" ? (
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Proof uploads</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Invoices, packing photos, and shipping labels.</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleProofUpload}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </button>
                      </div>

                      <div className="space-y-2">
                        {proofs.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black text-slate-900">{p.name}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Uploaded {shortTime(p.uploadedAt)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProofs((s) => s.map((x) => (x.id === p.id ? { ...x, visibility: x.visibility === "internal" ? "buyer" : "internal" } : x)))}
                              className={cx(
                                "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                p.visibility === "buyer" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                              )}
                            >
                              {p.visibility === "buyer" ? "Buyer can see" : "Internal"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setProofs((s) => s.filter((x) => x.id !== p.id))}
                              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                              aria-label="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {proofs.length === 0 ? <EmptyState title="No proofs yet" message="Upload invoices, packing photos, and labels." /> : null}
                      </div>
                    </div>
                  ) : null}

                  {tab === "Audit" ? (
                    <div className="space-y-2">
                      {audit.map((a) => (
                        <div key={a.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="flex items-center gap-2">
                            <Badge tone="slate">{a.actor}</Badge>
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{shortTime(a.at)}</span>
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">{a.action}</div>
                          {a.detail ? <div className="mt-1 text-xs font-semibold text-slate-500">{a.detail}</div> : null}
                        </div>
                      ))}
                      {audit.length === 0 ? (
                        <EmptyState title="No audit events" message="Order activity history will appear here when it exists." />
                      ) : null}
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
                <div className="mt-1 text-xs font-semibold text-slate-500">Dispute prevention prompts</div>
              </div>
              <Badge tone={meta.risk === "risk" ? "danger" : meta.risk === "watch" ? "orange" : "green"}>SLA {meta.label}</Badge>
            </div>

            <div className="mt-4 space-y-2">
              {prompts.map((p) => (
                <div key={p.title} className={cx("rounded-3xl border p-4", p.tone === "danger" ? "border-rose-200 bg-rose-50/70" : p.tone === "orange" ? "border-orange-200 bg-orange-50/70" : "border-emerald-200 bg-emerald-50/70")}>
                  <div className="text-sm font-black text-slate-900">{p.title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-700">{p.message}</div>
                  {p.action ? (
                    <button
                      type="button"
                      onClick={p.action.onClick}
                      className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                      style={{ color: p.tone === "danger" ? "#B42318" : p.tone === "orange" ? "#B45309" : "#047857" }}
                    >
                      {p.action.label}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ReturnsRmas({ returnsList, pushToast }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [drawer, setDrawer] = useState(false);
  const [eligibilityAuto, setEligibilityAuto] = useState(true);
  const [restockAuto, setRestockAuto] = useState(true);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return returnsList.filter((r) => {
      if (status !== "All" && r.status !== status) return false;
      if (!query) return true;
      return `${r.id} ${r.orderId} ${displayOrderId(r.orderId)} ${r.reason}`.toLowerCase().includes(query);
    });
  }, [returnsList, q, status]);

  const reasons = useMemo(() => {
    const map = new Map();
    returnsList.forEach((r) => map.set(r.reason, (map.get(r.reason) || 0) + 1));
    const max = Math.max(1, ...Array.from(map.values()));
    return Array.from(map.entries()).map(([reason, count]) => ({ reason, count, pct: Math.round((count / max) * 100) }));
  }, [returnsList]);

  return (
    <div>
      <SectionHeader
        title="Returns and RMAs"
        subtitle="RMA creation, approvals, refund pathways. Premium: eligibility automation, reasons analytics, restock automation hooks."
        right={
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Plus className="h-4 w-4" />
            Create RMA
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search RMA ID, order, reason…"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["All", "Requested", "Approved", "In Transit", "Received", "Rejected"].map((s) => (
                <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
              <div className="col-span-3">RMA</div>
              <div className="col-span-2">Order</div>
              <div className="col-span-3">Reason</div>
              <div className="col-span-2">Pathway</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="divide-y divide-slate-200/70">
              {filtered.map((r) => (
                <div key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                  <div className="col-span-3">
                    <div className="text-sm font-black text-slate-900">{r.id}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{shortTime(r.createdAt)}</div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Badge tone="slate">{displayOrderId(r.orderId)}</Badge>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{r.reason}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Amount {fmtMoney(r.amount, r.currency)}</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Badge tone="slate">{r.pathway}</Badge>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Approved", message: `${r.id} approved.`, tone: "success" })}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Rejected", message: `${r.id} rejected.`, tone: "warning" })}
                      className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-[11px] font-extrabold text-orange-800"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No RMAs" message="Create an RMA or adjust filters." action={{ label: "Create RMA", onClick: () => setDrawer(true) }} />
                </div>
              ) : null}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-slate-900">Automation and insights</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">Premium operations layer</div>
            </div>
            <Badge tone="slate">Ops</Badge>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Eligibility automation</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Auto-check windows, condition, and category rules</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEligibilityAuto((v) => !v)}
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                    eligibilityAuto ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  )}
                >
                  {eligibilityAuto ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Restock automation hooks</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Auto-restock on received and passed inspection</div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockAuto((v) => !v)}
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                    restockAuto ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  )}
                >
                  {restockAuto ? "On" : "Off"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Reasons analytics</div>
                <span className="ml-auto"><Badge tone="slate">Last 30 days</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {reasons.map((x) => (
                  <div key={x.reason}>
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600">
                      <span className="truncate">{x.reason}</span>
                      <span className="text-slate-500">{x.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${x.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <Drawer open={drawer} title="Create RMA" onClose={() => setDrawer(false)}>
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="text-sm font-black text-slate-900">RMA wizard</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">In production: stepper with autosave, eligibility checks, and policies.</div>
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-extrabold text-slate-600">Order ID</label>
            <input className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 text-sm font-semibold text-slate-800 outline-none" placeholder="Order ID" />
            <label className="text-xs font-extrabold text-slate-600">Reason</label>
            <input className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 text-sm font-semibold text-slate-800 outline-none" placeholder="Damaged item" />
            <label className="text-xs font-extrabold text-slate-600">Refund pathway</label>
            <select className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 px-3 text-sm font-semibold text-slate-800 outline-none">
              <option>Refund to Wallet</option>
              <option>Refund to Bank</option>
              <option>Store Credit</option>
              <option>Exchange</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrawer(false);
              pushToast({ title: "RMA created", message: "New RMA created.", tone: "success" });
            }}
            className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            Create RMA
          </button>
        </div>
      </Drawer>
    </div>
  );
}

function Disputes({ disputesList, pushToast }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [active, setActive] = useState<DisputeCase | null>(null);
  const [playbooksOpen, setPlaybooksOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const playbooks = useMemo(
    () => [
      {
        id: "pb-inr",
        title: "Item Not Received",
        summary: "Collect carrier scans, delivery proof, and buyer contact attempts.",
        appliesTo: ["item not received", "not received", "inr"],
        steps: [
          "Upload carrier tracking scan and proof of delivery.",
          "Share latest ETA update with the buyer.",
          "Offer replacement or refund based on policy window.",
        ],
        actions: [
          { id: "request-carrier", label: "Request carrier scan" },
          { id: "send-eta", label: "Send ETA update" },
        ],
      },
      {
        id: "pb-payment",
        title: "Payment Dispute",
        summary: "Compile payment confirmation, invoice, and fulfillment logs.",
        appliesTo: ["payment dispute", "payment"],
        steps: [
          "Upload invoice and payment confirmation.",
          "Provide proof of fulfillment and delivery timeline.",
          "Send a short case summary to the buyer.",
        ],
        actions: [
          { id: "attach-invoice", label: "Attach invoice" },
          { id: "summarize", label: "Draft case summary" },
        ],
      },
      {
        id: "pb-quality",
        title: "Quality Mismatch",
        summary: "Document QC checks, product photos, and remediation options.",
        appliesTo: ["quality mismatch", "quality", "defect"],
        steps: [
          "Upload QC checklist and product photos.",
          "Offer replacement or partial refund.",
          "Confirm corrective action for next shipment.",
        ],
        actions: [
          { id: "upload-qc", label: "Upload QC proof" },
          { id: "offer-replace", label: "Offer replacement" },
        ],
      },
    ],
    []
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return disputesList.filter((d) => {
      if (status !== "All" && d.status !== status) return false;
      if (!query) return true;
      return `${d.id} ${d.orderId} ${displayOrderId(d.orderId)} ${d.type}`.toLowerCase().includes(query);
    });
  }, [disputesList, q, status]);

  const riskTone = (score) => (score >= 70 ? "danger" : score >= 40 ? "orange" : "green");
  const visiblePlaybooks = useMemo(() => {
    if (!active?.type) return playbooks;
    const typeKey = active.type.toLowerCase();
    const matches = playbooks.filter((p) => p.appliesTo.some((t) => typeKey.includes(t)));
    return matches.length ? matches : playbooks;
  }, [active, playbooks]);

  return (
    <div>
      <SectionHeader
        title="Disputes"
        subtitle="Case list and detail, evidence upload, resolution actions. Premium: risk scoring, playbooks, export evidence pack."
        right={
          <button
            type="button"
            onClick={() => setPlaybooksOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />
            Playbooks
          </button>
        }
      />

      <Modal open={playbooksOpen} title={`Playbooks${active?.type ? ` · ${active.type}` : ""}`} onClose={() => setPlaybooksOpen(false)}>
        <div className="grid gap-3">
          {visiblePlaybooks.map((pb) => (
            <div key={pb.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{pb.title}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{pb.summary}</div>
                </div>
                <Badge tone="slate">Template</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700">
                {pb.steps.map((step) => (
                  <div key={step} className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pb.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() =>
                      pushToast({
                        title: pb.title,
                        message: `${action.label} applied.`,
                        tone: "success",
                      })
                    }
                    className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {visiblePlaybooks.length === 0 ? <EmptyState title="No playbooks yet" message="Try a different dispute or clear filters." /> : null}
        </div>
      </Modal>

      <div className="grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-5 lg:col-span-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search dispute ID, order, type…"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/80 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["All", "Open", "Under review", "Resolved"].map((s) => (
                <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActive(d)}
                className={cx(
                  "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                  active?.id === d.id ? "border-emerald-200" : "border-slate-200/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", d.risk >= 70 ? "bg-rose-50 text-rose-700" : d.risk >= 40 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700")}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-black text-slate-900">{d.id}</div>
                      <Badge tone={riskTone(d.risk)}>{d.risk}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{shortTime(d.updatedAt)}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-600">Order {displayOrderId(d.orderId)} · {d.type}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge tone="slate">{d.status}</Badge>
                      <Badge tone="slate">Evidence needed</Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>
            ))}
            {filtered.length === 0 ? <EmptyState title="No disputes" message="Try changing filters or clearing search." /> : null}
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-5">
          {active ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Case detail</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Evidence, actions, and export pack</div>
                </div>
                <Badge tone={riskTone(active.risk)}>{active.risk} risk</Badge>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-sm font-black text-slate-900">{active.type}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Order {displayOrderId(active.orderId)} · Status: {active.status}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click?.()}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <Upload className="h-4 w-4" />
                    Upload evidence
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => {
                      const input = e.currentTarget;
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      pushToast({ title: "Evidence uploaded", message: `${files.length} file(s) added (local).`, tone: "success" });
                      input.value = "";
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Exported evidence pack", message: "Evidence pack generated.", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Export pack
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Resolution actions</div>
                  <span className="ml-auto"><Badge tone="slate">Safe</Badge></span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => pushToast({ title: "Partial refund", message: "Resolution applied.", tone: "success" })} className="rounded-2xl px-3 py-2 text-xs font-extrabold text-white" style={{ background: TOKENS.green }}>
                    Partial refund
                  </button>
                  <button type="button" onClick={() => pushToast({ title: "Replacement", message: "Replacement started.", tone: "success" })} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800">
                    Replacement
                  </button>
                  <button type="button" onClick={() => pushToast({ title: "Denied", message: "Denied with reason.", tone: "warning" })} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700">
                    Deny
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="Select a case" message="Choose a dispute from the list to view details." />
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export default function OrdersOpsPreviewableV4() {
  const { id: routeOrderId } = useParams();
  const [screen, setScreen] = useState(routeOrderId ? "orderDetail" : "orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [returnsList, setReturnsList] = useState<ReturnCase[]>([]);
  const [disputesList, setDisputesList] = useState<DisputeCase[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    void Promise.all([
      sellerBackendApi.getSellerOrders(),
      sellerBackendApi.getSellerReturns(),
      sellerBackendApi.getSellerDisputes(),
    ])
      .then(([ordersPayload, returnsPayload, disputesPayload]) => {
        if (!active) return;
        const nextOrders = Array.isArray(ordersPayload?.orders)
          ? ordersPayload.orders.map((entry) => mapBackendOrder(asRecord(entry)))
          : [];
        const nextReturns = Array.isArray(returnsPayload)
          ? returnsPayload.map((entry) => mapBackendReturn(asRecord(entry)))
          : [];
        const nextDisputes = Array.isArray(disputesPayload)
          ? disputesPayload.map((entry) => mapBackendDispute(asRecord(entry)))
          : [];
        setOrders(nextOrders);
        setReturnsList(nextReturns);
        setDisputesList(nextDisputes);
        setSelectedOrderId((current) => current || routeOrderId || "");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load seller orders.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [routeOrderId]);

  useEffect(() => {
    setSelectedOrderId(routeOrderId || "");
    setScreen(routeOrderId ? "orderDetail" : "orders");
  }, [routeOrderId]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const tabValue = screen === "orderDetail" ? "orders" : screen;

  const openOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setScreen("orderDetail");
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(2,183,126,0.08) 0%, rgba(2,183,126,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="sticky top-0 z-40 border-b rounded-[10px]  20 border-white/10" style={{ background: `linear-gradient(90deg, ${TOKENS.green} 0%, ${TOKENS.greenDeep} 100%)` }}>
        <div className="w-full flex flex-wrap items-center justify-between gap-2 px-[0.55%] py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900/15 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-white">SupplierHub Ops</div>
              <div className="text-[11px] font-semibold text-white/80">Orders and operations preview</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScreen("orders")}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  tabValue === "orders" ? "border-white/25 bg-white dark:bg-slate-900/15 text-white" : "border-white/20 bg-white dark:bg-slate-900/10 text-white/90 hover:bg-gray-50 dark:hover:bg-slate-800/15"
                )}
              >
                <Package className="h-4 w-4" />
                Orders
              </button>
              <button
                type="button"
                onClick={() => setScreen("returns")}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  tabValue === "returns" ? "border-white/25 bg-white dark:bg-slate-900/15 text-white" : "border-white/20 bg-white dark:bg-slate-900/10 text-white/90 hover:bg-gray-50 dark:hover:bg-slate-800/15"
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Returns
              </button>
              <button
                type="button"
                onClick={() => setScreen("disputes")}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  tabValue === "disputes" ? "border-white/25 bg-white dark:bg-slate-900/15 text-white" : "border-white/20 bg-white dark:bg-slate-900/10 text-white/90 hover:bg-gray-50 dark:hover:bg-slate-800/15"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Disputes
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <IconButton label="Tip" tone="dark" onClick={() => pushToast({ title: "Tip", message: "Open an order from the Orders list to view its detail page.", tone: "default" })}>
              <MessageCircle className="h-4 w-4" />
            </IconButton>
            <IconButton label="Saved" tone="dark" onClick={() => pushToast({ title: "Saved", message: "This is a preview host only.", tone: "success" })}>
              <Check className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="px-[0.55%] pt-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-600">
            Loading seller orders...
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="px-[0.55%] pt-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {loadError}
          </div>
        </div>
      ) : null}

      <div className="w-full px-[0.55%] py-6">
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
            {screen === "orders" ? <OrdersList orders={orders} openOrder={openOrder} pushToast={pushToast} /> : null}
            {screen === "orderDetail" ? (
              <OrderDetail
                orderId={selectedOrderId}
                orders={orders}
                onBack={() => setScreen("orders")}
                pushToast={pushToast}
              />
            ) : null}
            {screen === "returns" ? <ReturnsRmas returnsList={returnsList} pushToast={pushToast} /> : null}
            {screen === "disputes" ? <Disputes disputesList={disputesList} pushToast={pushToast} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
