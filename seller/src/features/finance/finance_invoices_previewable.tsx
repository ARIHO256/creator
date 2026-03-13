import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Receipt,
  Search,
  Send,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

/**
 * Finance 2: Invoices
 * Route: /finance/invoices
 * Previewable single-file page
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
type KpiCardProps = { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; hint?: string; tone?: BadgeTone };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtMoney(amount: number | string, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: BadgeTone }) {
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

function statusTone(s) {
  if (s === "Paid") return "green";
  if (s === "Overdue") return "danger";
  if (s === "Sent") return "orange";
  return "slate";
}

function invoiceDemoRows() {
  const now = Date.now();
  const agoD = (d) => new Date(now - d * 24 * 3600_000).toISOString();
  const inD = (d) => new Date(now + d * 24 * 3600_000).toISOString();
  const pastD = (d) => new Date(now - d * 24 * 3600_000).toISOString();

  return [
    {
      id: "INV-24019",
      customer: "Kampala City Logistics Ltd",
      orderId: "ORD-10512",
      currency: "USD",
      status: "Sent",
      createdAt: agoD(8),
      dueAt: inD(4),
      paymentRail: "CorporatePay",
      lines: [
        { name: "EV Wallbox 7kW", qty: 4, unit: 620 },
        { name: "Installation + commissioning", qty: 4, unit: 260 },
      ],
      taxRate: 0.02,
      notes: "Includes onsite commissioning and OCPP configuration.",
    },
    {
      id: "INV-24018",
      customer: "Amina K.",
      orderId: "ORD-10511",
      currency: "USD",
      status: "Paid",
      createdAt: agoD(22),
      dueAt: agoD(7),
      paidAt: agoD(6),
      paymentRail: "EVzone Pay Wallet",
      lines: [{ name: "EV charging installation", qty: 1, unit: 320 }],
      taxRate: 0.0,
      notes: "Paid via wallet.",
    },
    {
      id: "INV-24017",
      customer: "Nairobi Fleet Services",
      orderId: "ORD-10510",
      currency: "USD",
      status: "Overdue",
      createdAt: agoD(40),
      dueAt: pastD(6),
      paymentRail: "Standard Checkout",
      lines: [
        { name: "Type 2 charging cables 5m", qty: 120, unit: 28 },
        { name: "Packaging + docs", qty: 1, unit: 120 },
      ],
      taxRate: 0.0,
      notes: "Buyer requested revised delivery window.",
    },
    {
      id: "INV-24016",
      customer: "Moses N.",
      orderId: "ORD-10509",
      currency: "USD",
      status: "Draft",
      createdAt: agoD(2),
      dueAt: inD(14),
      paymentRail: "EVzone Pay Wallet",
      lines: [{ name: "E-bike battery pack 48V 20Ah", qty: 6, unit: 248 }],
      taxRate: 0.0,
      notes: "Draft waiting for final freight cost.",
    },
    {
      id: "INV-24015",
      customer: "Chen L.",
      orderId: "ORD-10508",
      currency: "CNY",
      status: "Sent",
      createdAt: agoD(12),
      dueAt: inD(1),
      paymentRail: "Standard Checkout",
      lines: [
        { name: "Bulk e-bike batteries", qty: 30, unit: 1750 },
        { name: "Export docs", qty: 1, unit: 480 },
      ],
      taxRate: 0.0,
      notes: "FOB Shanghai. Export docs included.",
    },
    {
      id: "INV-24014",
      customer: "Sarah T.",
      orderId: "ORD-10507",
      currency: "USD",
      status: "Void",
      createdAt: agoD(65),
      dueAt: agoD(50),
      paymentRail: "CorporatePay",
      lines: [{ name: "Warehouse to port logistics setup", qty: 1, unit: 190 }],
      taxRate: 0.0,
      notes: "Voided due to duplicate billing.",
    },
  ].map((x) => {
    const subtotal = (x.lines || []).reduce((s, l) => s + Number(l.qty || 0) * Number(l.unit || 0), 0);
    const tax = Math.round(subtotal * Number(x.taxRate || 0) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { ...x, subtotal, tax, total };
  });
}

function daysUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 3600_000));
}

function KpiCard({ icon: Icon, label, value, hint, tone = "slate" }: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
          {hint ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function FinanceInvoicesPage() {
  const { resolvedMode } = useThemeMode();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    void sellerBackendApi
      .getFinanceInvoices()
      .then((payload) => {
        if (!mounted) return;
        setRows(Array.isArray((payload as Record<string, any>)?.invoices) ? ((payload as Record<string, any>).invoices as any[]) : []);
      })
      .catch(() => {
        if (!mounted) return;
        pushToast({ title: "Invoices unavailable", message: "Could not load invoices.", tone: "danger" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [currency, setCurrency] = useState("All");
  const [sort, setSort] = useState("Due soon");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(rows[0]?.id || null);

  useEffect(() => {
    if (!rows.find((r) => r.id === activeId)) setActiveId(rows[0]?.id || null);
  }, [rows]);

  const active = useMemo(() => rows.find((r) => r.id === activeId) || null, [rows, activeId]);

  const currencies = useMemo(() => {
    const set = new Set(rows.map((r) => r.currency));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = [...rows];

    if (status !== "All") list = list.filter((r) => r.status === status);
    if (currency !== "All") list = list.filter((r) => r.currency === currency);

    if (query) {
      list = list.filter((r) => {
        const hay = `${r.id} ${r.customer} ${r.orderId} ${r.paymentRail} ${r.status}`.toLowerCase();
        return hay.includes(query);
      });
    }

    if (sort === "Newest") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "Due soon") list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    if (sort === "Highest") list.sort((a, b) => Number(b.total) - Number(a.total));

    return list;
  }, [rows, q, status, currency, sort]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => ["Draft", "Sent", "Overdue"].includes(r.status)).length;
    const overdue = rows.filter((r) => r.status === "Overdue").length;
    const dueSoon = rows.filter((r) => ["Draft", "Sent"].includes(r.status) && daysUntil(r.dueAt) <= 3).length;
    const outstanding = rows
      .filter((r) => ["Draft", "Sent", "Overdue"].includes(r.status))
      .reduce((s, r) => s + Number(r.total || 0), 0);
    return { open, overdue, dueSoon, outstanding };
  }, [rows]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);
  const toggleAll = () => {
    const next = { ...selected };
    if (allVisibleSelected) {
      filtered.forEach((r) => delete next[r.id]);
    } else {
      filtered.forEach((r) => (next[r.id] = true));
    }
    setSelected(next);
  };

  const sendInvoice = async (id) => {
    const invoice = rows.find((row) => row.id === id);
    const next =
      invoice?.status === "Draft"
        ? { status: "Sent", sentAt: new Date().toISOString() }
        : { sentAt: new Date().toISOString() };
    const updated = await sellerBackendApi.patchFinanceInvoice(id, next);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...(updated as Record<string, unknown>) } : row)));
    pushToast({ title: "Invoice sent", message: `${id} sent to customer.`, tone: "success" });
  };

  const markPaid = async (id) => {
    const updated = await sellerBackendApi.patchFinanceInvoice(id, {
      status: "Paid",
      paidAt: new Date().toISOString(),
    });
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...(updated as Record<string, unknown>) } : row)));
    pushToast({ title: "Marked as paid", message: `${id} updated to Paid.`, tone: "success" });
  };

  const bulkMarkPaid = async () => {
    if (!selectedIds.length) return;
    const paidAt = new Date().toISOString();
    await Promise.all(selectedIds.map((id) => sellerBackendApi.patchFinanceInvoice(id, { status: "Paid", paidAt })));
    setRows((prev) => prev.map((row) => (selectedIds.includes(row.id) ? { ...row, status: "Paid", paidAt } : row)));
    setSelected({});
    pushToast({ title: "Bulk update", message: `${selectedIds.length} invoice(s) marked as paid.`, tone: "success" });
  };

  const bulkSend = async () => {
    if (!selectedIds.length) return;
    const sentAt = new Date().toISOString();
    await Promise.all(
      selectedIds.map((id) => {
        const row = rows.find((item) => item.id === id);
        return sellerBackendApi.patchFinanceInvoice(id, {
          status: row?.status === "Draft" ? "Sent" : row?.status,
          sentAt,
        });
      })
    );
    setRows((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id)
          ? {
              ...r,
              status: r.status === "Draft" ? "Sent" : r.status,
              sentAt,
            }
          : r
      )
    );
    setSelected({});
    pushToast({ title: "Bulk send", message: `${selectedIds.length} invoice(s) queued to send.`, tone: "success" });
  };

  const download = (id) => {
    pushToast({ title: "Download", message: `Invoice PDF export started for ${id} (demo).`, tone: "default" });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          resolvedMode === "dark"
            ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #020617 0%, #0b1220 45%, #020617 100%)"
            : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Invoices</div>
                <Badge tone="slate">/finance/invoices</Badge>
                <Badge tone="slate">Finance</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Issue, send, track and reconcile invoices with clear statuses and export actions.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to CSV/PDF.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "New invoice", message: "Create flow to be wired.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Receipt className="h-4 w-4" />
                New Invoice
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={Receipt} label="Open invoices" value={String(stats.open)} hint="Draft, Sent, Overdue" />
          <KpiCard icon={AlertTriangle} label="Overdue" value={String(stats.overdue)} tone="danger" />
          <KpiCard icon={Calendar} label="Due soon" value={String(stats.dueSoon)} hint="Within 3 days" tone="orange" />
          <KpiCard icon={Wallet} label="Outstanding" value={fmtMoney(stats.outstanding, currency === "All" ? "USD" : currency)} hint="Sum of open totals" tone="green" />
        </div>

        {/* Filters */}
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search invoice, customer, order"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Sort</div>
                  <div className="relative ml-auto">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {[
                        { k: "Due soon", label: "Due soon" },
                        { k: "Newest", label: "Newest" },
                        { k: "Highest", label: "Highest" },
                      ].map((s) => (
                        <option key={s.k} value={s.k}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                  >
                    {currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "All",
                "Draft",
                "Sent",
                "Paid",
                "Overdue",
                "Void",
              ].map((s) => (
                <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                  {s}
                </Chip>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <Badge tone="slate">{filtered.length} shown</Badge>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setStatus("All");
                    setCurrency("All");
                    setSort("Due soon");
                    setSelected({});
                    pushToast({ title: "Filters cleared", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Controls</div>
              <span className="ml-auto">
                <Badge tone="slate">Bulk</Badge>
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <Check className="h-5 w-5" />
                  </span>
                  {allVisibleSelected ? "Unselect visible" : "Select visible"}
                </span>
                <Badge tone="slate">{filtered.length}</Badge>
              </button>

              <button
                type="button"
                disabled={!selectedIds.length}
                onClick={bulkSend}
                className={cx(
                  "flex items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm font-extrabold transition",
                  selectedIds.length
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
                    : "cursor-not-allowed border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-400"
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-emerald-700">
                    <Send className="h-5 w-5" />
                  </span>
                  Send
                </span>
                <Badge tone={selectedIds.length ? "green" : "slate"}>{selectedIds.length}</Badge>
              </button>

              <button
                type="button"
                disabled={!selectedIds.length}
                onClick={bulkMarkPaid}
                className={cx(
                  "flex items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm font-extrabold transition",
                  selectedIds.length
                    ? "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-50"
                    : "cursor-not-allowed border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-400"
                )}
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-orange-700">
                    <CheckCheck className="h-5 w-5" />
                  </span>
                  Mark paid
                </span>
                <Badge tone={selectedIds.length ? "orange" : "slate"}>{selectedIds.length}</Badge>
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Table */}
        <div className="mt-4">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Invoice list</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row to open details</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">Select</div>
                  <div className="col-span-3">Invoice</div>
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Due</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((r) => {
                    const checked = !!selected[r.id];
                    const isActive = r.id === activeId;
                    const dueDays = daysUntil(r.dueAt);
                    const dueTone = r.status === "Overdue" ? "danger" : dueDays <= 3 && ["Draft", "Sent"].includes(r.status) ? "orange" : "slate";

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setActiveId(r.id);
                          setDetailOpen(true);
                        }}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          isActive ? "bg-emerald-50/60" : "bg-white dark:bg-slate-900/50"
                        )}
                      >
                        <div className="col-span-1 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected((s) => ({ ...s, [r.id]: !checked }));
                            }}
                            className={cx(
                              "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                              checked ? "border-emerald-200" : "border-slate-200/70"
                            )}
                            aria-label={checked ? "Unselect" : "Select"}
                          >
                            {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{r.id}</div>
                            <Badge tone="slate">{r.currency}</Badge>
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">Order {r.orderId}</div>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-900">{r.customer}</div>
                          <div className="mt-1 text-[11px] font-semibold text-slate-500">Rail: {r.paymentRail}</div>
                        </div>

                        <div className="col-span-2 flex items-center">
                          <div>
                            <div className="text-sm font-black text-slate-900">{fmtMoney(r.total, r.currency)}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Tax {fmtMoney(r.tax, r.currency)}</div>
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-extrabold text-slate-900">{fmtTime(r.dueAt)}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Created {fmtTime(r.createdAt)}</div>
                          </div>
                          <Badge tone={dueTone}>{r.status === "Overdue" ? "Overdue" : dueDays <= 0 ? "Due" : `D-${dueDays}`}</Badge>
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
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `Invoice ${active.id}` : "Invoice"}
        subtitle={active ? `${active.status} · ${active.customer} · Due ${fmtTime(active.dueAt)}` : ""}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <GlassCard className="p-5">
            <div className="text-sm font-black text-slate-900">No invoice selected</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Open an invoice from the list.</div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{active.id}</div>
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                    <Badge tone="slate">{active.currency}</Badge>
                    <span className="ml-auto"><Badge tone="slate">Order {active.orderId}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Customer: {active.customer} · Rail: {active.paymentRail}</div>
                  {active.notes ? <div className="mt-2 text-xs font-semibold text-slate-600">Note: {active.notes}</div> : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(active.id);
                        pushToast({ title: "Copied", message: "Invoice ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => download(active.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => sendInvoice(active.id)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Send className="h-4 w-4" />
                      {active.status === "Draft" ? "Send" : "Resend"}
                    </button>

                    <button
                      type="button"
                      onClick={() => markPaid(active.id)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark Paid
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Line items</div>
                <span className="ml-auto"><Badge tone="slate">{active.lines.length}</Badge></span>
              </div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">Line</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {active.lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-6">
                        <div className="text-sm font-extrabold text-slate-900">{l.name}</div>
                      </div>
                      <div className="col-span-2 flex items-center">{l.qty}</div>
                      <div className="col-span-2 flex items-center">{fmtMoney(l.unit, active.currency)}</div>
                      <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(Number(l.qty) * Number(l.unit), active.currency)}</div>
                    </div>
                  ))}

                  <div className="grid grid-cols-12 gap-2 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-xs font-extrabold text-slate-700">
                    <div className="col-span-6">Totals</div>
                    <div className="col-span-2" />
                    <div className="col-span-2" />
                    <div className="col-span-2" />
                    <div className="col-span-12 mt-3 grid gap-2 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <div className="text-[11px] font-extrabold text-slate-500">Subtotal</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{fmtMoney(active.subtotal, active.currency)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <div className="text-[11px] font-extrabold text-slate-500">Tax</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{fmtMoney(active.tax, active.currency)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <div className="text-[11px] font-extrabold text-slate-500">Total</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{fmtMoney(active.total, active.currency)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] font-semibold text-slate-500">Premium: add payment reconciliation, partial payments, and credit notes.</div>
            </GlassCard>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-900">Best practice</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Send the invoice early, attach proofs, and keep payment rails clear to reduce disputes.</div>
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
