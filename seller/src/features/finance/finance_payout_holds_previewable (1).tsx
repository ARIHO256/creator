import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import { useThemeMode } from "../../theme/themeMode";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Filter,
  Info,
  Lock,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Upload,
  X,
} from "lucide-react";

/**
 * Payout Holds (Previewable)
 * Route: /finance/holds
 * Core: what is blocked, why, how to resolve
 * Super premium: guided fix flows and audit logging
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type AuditEvent = { id: string; at: string; actor: string; action: string; detail: string; route: string };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtMoney(amount: number | string, currency = "USD") {
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

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeCopy(text: string) {
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[980px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function payoutHoldDemoRows() {
  const now = Date.now();
  const agoH = (h) => new Date(now - h * 3600_000).toISOString();

  return [
    {
      id: "HOLD-9012",
      type: "KYC_PENDING",
      title: "Identity verification required",
      reason: "KYC/KYB is incomplete. Settlements cannot be released until verification is approved.",
      severity: "High",
      status: "Active",
      currency: "USD",
      blockedAmount: 14820.5,
      affectedWallet: "Payout Wallet",
      createdAt: agoH(18),
      updatedAt: agoH(2),
      evidence: [
        { id: "ev1", name: "passport_scan.jpg", status: "Missing" },
        { id: "ev2", name: "proof_of_address.pdf", status: "Required" },
      ],
      steps: [
        { id: "s1", label: "Upload identity document", state: "todo" },
        { id: "s2", label: "Upload proof of address", state: "todo" },
        { id: "s3", label: "Wait for review", state: "blocked" },
      ],
    },
    {
      id: "HOLD-9007",
      type: "CHARGEBACK_RISK",
      title: "Chargeback risk hold",
      reason: "A dispute is under review. Funds are held until the case is resolved.",
      severity: "Medium",
      status: "Active",
      currency: "USD",
      blockedAmount: 920.0,
      affectedWallet: "Sales Wallet",
      createdAt: agoH(60),
      updatedAt: agoH(6),
      evidence: [{ id: "ev3", name: "shipping_label.pdf", status: "Uploaded" }],
      steps: [
        { id: "s1", label: "Upload proof of delivery", state: "todo" },
        { id: "s2", label: "Respond to dispute", state: "todo" },
        { id: "s3", label: "Wait for decision", state: "blocked" },
      ],
    },
    {
      id: "HOLD-8999",
      type: "TAX_PROFILE",
      title: "Tax profile missing",
      reason: "Tax settings are required for payouts in this region. Add VAT/TIN and invoice template.",
      severity: "Low",
      status: "Active",
      currency: "KES",
      blockedAmount: 184500,
      affectedWallet: "Payout Wallet",
      createdAt: agoH(120),
      updatedAt: agoH(24),
      evidence: [{ id: "ev4", name: "vat_certificate.pdf", status: "Missing" }],
      steps: [
        { id: "s1", label: "Add tax ID (VAT/TIN)", state: "todo" },
        { id: "s2", label: "Upload tax certificate", state: "todo" },
        { id: "s3", label: "Confirm invoice format", state: "todo" },
      ],
    },
  ];
}

function severityTone(sev) {
  if (sev === "High") return "danger";
  if (sev === "Medium") return "orange";
  return "slate";
}

function typeLabel(t) {
  if (t === "KYC_PENDING") return "KYC";
  if (t === "CHARGEBACK_RISK") return "Dispute";
  if (t === "TAX_PROFILE") return "Tax";
  return "Hold";
}

function StepDot({ state }) {
  const tone = state === "done" ? "green" : state === "blocked" ? "slate" : "orange";
  return <span className={cx("h-2.5 w-2.5 rounded-full", tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : "bg-slate-300")} />;
}

function KpiCard({ icon: Icon, label, value, hint, tone = "slate" }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "green" && "bg-emerald-50 text-emerald-700",
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

function EvidenceRow({ e, onUpload }) {
  const tone = e.status === "Uploaded" ? "green" : e.status === "Required" ? "orange" : "danger";
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700")}>
        {tone === "green" ? <BadgeCheck className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-slate-900">{e.name}</div>
        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Status: <span className="font-extrabold text-slate-700">{e.status}</span></div>
      </div>
      {tone !== "green" ? (
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
          style={{ background: TOKENS.orange }}
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      ) : (
        <Badge tone="green">OK</Badge>
      )}
    </div>
  );
}

function GuidedFix({ hold, onResolved, pushToast, logAudit }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setStepIdx(0);
    setUploadCount(0);
    setNote("");
  }, [hold?.id]);

  const steps = hold?.steps || [];
  const current = steps[stepIdx];

  const canNext = useMemo(() => {
    if (!current) return false;
    if (current.state === "blocked") return false;
    // demo gating: require at least 1 upload for first 2 steps
    if (stepIdx <= 1 && uploadCount === 0) return false;
    return true;
  }, [current, stepIdx, uploadCount]);

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-emerald-900">Guided fix flow</div>
            <div className="mt-1 text-xs font-semibold text-emerald-900/70">Complete steps in order. Each action writes to audit log.</div>
          </div>
          <Badge tone="green">Premium</Badge>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">Steps</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{steps.length} total · Current: {stepIdx + 1}</div>
          </div>
          <Badge tone="slate">{typeLabel(hold.type)}</Badge>
        </div>

        <div className="mt-4 space-y-2">
          {steps.map((s, i) => (
            <div key={s.id} className={cx("flex items-center gap-3 rounded-3xl border p-3", i === stepIdx ? "border-emerald-200 bg-white dark:bg-slate-900" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}>
              <StepDot state={i < stepIdx ? "done" : s.state} />
              <div className="min-w-0 flex-1">
                <div className={cx("text-xs", i === stepIdx ? "font-black text-slate-900" : "font-extrabold text-slate-700")}>{s.label}</div>
                {i === stepIdx ? <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Do this now to progress.</div> : null}
              </div>
              {i < stepIdx ? <Badge tone="green">Done</Badge> : i === stepIdx ? <Badge tone="orange">Active</Badge> : <Badge tone="slate">Later</Badge>}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Upload</div>
              <span className="ml-auto"><Badge tone="slate">Required</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Attach the relevant document for this step.</div>
            <button
              type="button"
              onClick={() => fileRef.current?.click?.()}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.orange }}
            >
              <Upload className="h-4 w-4" />
              Choose file
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                setUploadCount((c) => c + files.length);
                logAudit({ actor: "Supplier", action: "evidence uploaded", detail: `${files.length} file(s) added`, route: "/finance/holds" });
                pushToast({ title: "Uploaded", message: `${files.length} file(s) added (local).`, tone: "success" });
                e.currentTarget.value = "";
              }}
            />
            <div className="mt-2 text-[11px] font-extrabold text-slate-500">Uploaded this flow: {uploadCount}</div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Add a note</div>
              <span className="ml-auto"><Badge tone="slate">Optional</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Explain context to the reviewer (helps speed).</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Short explanation..."
              className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!note.trim()) return;
                logAudit({ actor: "Supplier", action: "note added", detail: note.trim().slice(0, 80), route: "/finance/holds" });
                pushToast({ title: "Note saved", message: "Reviewer note recorded in audit.", tone: "success" });
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <Check className="h-4 w-4" />
              Save note
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            className={cx(
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold",
              stepIdx === 0 ? "cursor-not-allowed border-slate-100 bg-white dark:bg-slate-900 text-slate-400" : "border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950"
            )}
            disabled={stepIdx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canNext) {
                pushToast({ title: "Step incomplete", message: "Upload at least one file for this step.", tone: "warning" });
                return;
              }
              logAudit({ actor: "Supplier", action: "step completed", detail: current?.label || "step", route: "/finance/holds" });
              pushToast({ title: "Step completed", message: current?.label, tone: "success" });
              setUploadCount(0);
              if (stepIdx < steps.length - 1) setStepIdx((i) => i + 1);
            }}
            className={cx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
              !canNext ? "opacity-90" : ""
            )}
            style={{ background: TOKENS.green }}
          >
            <CheckCheck className="h-4 w-4" />
            Complete step
          </button>

          <button
            type="button"
            onClick={() => {
              logAudit({ actor: "System", action: "hold submitted", detail: hold.id, route: "/finance/holds" });
              pushToast({
                title: "Submitted for review",
                message: "We will notify you when verified (demo).",
                tone: "success",
                action: { label: "Open audit", onClick: () => pushToast({ title: "Audit", message: "See audit in this drawer.", tone: "default" }) },
              });
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
          >
            <Ticket className="h-4 w-4" />
            Submit
          </button>

          <button
            type="button"
            onClick={() => {
              onResolved();
              logAudit({ actor: "System", action: "hold released", detail: hold.id, route: "/finance/holds" });
              pushToast({ title: "Hold resolved", message: "Funds released to payout queue (demo).", tone: "success" });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800"
          >
            <BadgeCheck className="h-4 w-4" />
            Mark resolved
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-orange-900">Audit logging</div>
            <div className="mt-1 text-xs font-semibold text-orange-900/70">Every upload, note, and step completion writes an audit event (demo, in-memory).</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditTable({ events }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
      <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
        <div className="col-span-3">Time</div>
        <div className="col-span-2">Actor</div>
        <div className="col-span-3">Action</div>
        <div className="col-span-4">Detail</div>
      </div>
      <div className="divide-y divide-slate-200/70">
        {events.slice(0, 14).map((e) => (
          <div key={e.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
            <div className="col-span-3 text-slate-500">{fmtTime(e.at)}</div>
            <div className="col-span-2 font-extrabold text-slate-800">{e.actor}</div>
            <div className="col-span-3">{e.action}</div>
            <div className="col-span-4 text-slate-500 truncate">{e.detail}</div>
          </div>
        ))}
        {events.length === 0 ? (
          <div className="p-5 text-sm font-semibold text-slate-500">No audit events yet.</div>
        ) : null}
      </div>
    </div>
  );
}

export default function FinancePayoutHoldsPage() {
  const { resolvedMode } = useThemeMode();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [holds, setHolds] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    void sellerBackendApi
      .getFinanceHolds()
      .then((payload) => {
        if (!mounted) return;
        setHolds(Array.isArray((payload as Record<string, any>)?.holds) ? ((payload as Record<string, any>).holds as any[]) : []);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const [q, setQ] = useState("");
  const [sev, setSev] = useState("All");
  const [type, setType] = useState("All");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return holds
      .filter((h) => (sev === "All" ? true : h.severity === sev))
      .filter((h) => (type === "All" ? true : h.type === type))
      .filter((h) => {
        if (!query) return true;
        const hay = [h.id, h.title, h.type, h.severity, h.affectedWallet].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [holds, q, sev, type]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const blocked = filtered.reduce((s, h) => s + Number(h.blockedAmount || 0), 0);
    const high = filtered.filter((h) => h.severity === "High").length;
    const kyc = filtered.filter((h) => h.type === "KYC_PENDING").length;
    return { count, blocked, high, kyc };
  }, [filtered]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(filtered[0]?.id || holds[0]?.id || null);
  useEffect(() => {
    if (!holds.find((h) => h.id === activeId)) setActiveId(holds[0]?.id);
  }, [holds]);
  const active = useMemo(() => holds.find((h) => h.id === activeId) || null, [holds, activeId]);

  const [tab, setTab] = useState("Overview");

  // simple in-memory audit log
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const logAudit = (e: Omit<AuditEvent, "id" | "at">) =>
    setAudit((s) => [{ id: makeId("audit"), at: new Date().toISOString(), ...e }, ...s].slice(0, 200));

  const bg =
    resolvedMode === "dark"
      ? "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.16) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), linear-gradient(180deg, #020617 0%, #0b1220 45%, #020617 100%)"
      : "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Payout Holds</div>
                <Badge tone="slate">/finance/holds</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">See what is blocked, why it is blocked, and the fastest path to release funds.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest holds loaded (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(filtered, null, 2));
                  pushToast({ title: "Copied", message: "Holds JSON copied (demo).", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={Lock} label="Active holds" value={String(totals.count)} hint="Filtered" />
          <KpiCard icon={AlertTriangle} label="High severity" value={String(totals.high)} hint="Fix first" tone="orange" />
          <KpiCard icon={ShieldCheck} label="KYC holds" value={String(totals.kyc)} hint="Verification" />
          <KpiCard icon={FileText} label="Blocked amount" value={fmtMoney(totals.blocked, filtered[0]?.currency || "USD")} hint="Approx (mixed currencies demo)" tone="green" />
        </div>

        {/* Filters */}
        <GlassCard className="mt-4 p-4">
          <div className="grid gap-3 md:grid-cols-12 md:items-center">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search hold ID, reason, wallet"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={sev}
                  onChange={(e) => setSev(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {["All", "High", "Medium", "Low"].map((s) => (
                    <option key={s} value={s}>
                      Severity: {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                >
                  {["All", "KYC_PENDING", "CHARGEBACK_RISK", "TAX_PROFILE"].map((t) => (
                    <option key={t} value={t}>
                      Type: {t === "All" ? "All" : typeLabel(t)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSev("All");
                  setType("All");
                  pushToast({ title: "Filters cleared", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
              <Badge tone="slate">{filtered.length} results</Badge>
            </div>
          </div>
        </GlassCard>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Table */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Active holds</div>
                </div>
                <div className="text-xs font-semibold text-slate-500">Open a hold to run the guided fix</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-4">Hold</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Blocked</div>
                  <div className="col-span-2">Wallet</div>
                  <div className="col-span-2 text-right">Updated</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setActiveId(h.id);
                        setDrawerOpen(true);
                        setTab("Overview");
                      }}
                      className={cx(
                        "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        h.severity === "High" && "bg-rose-50/40"
                      )}
                    >
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{h.title}</div>
                          <Badge tone={severityTone(h.severity)}>{h.severity}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" />{h.id}</span>
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Created {fmtTime(h.createdAt)}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <Badge tone="slate">{typeLabel(h.type)}</Badge>
                        <Badge tone="slate">{h.status}</Badge>
                      </div>
                      <div className="col-span-2 flex items-center font-black text-slate-900">{fmtMoney(h.blockedAmount, h.currency)}</div>
                      <div className="col-span-2 flex items-center"><Badge tone="slate">{h.affectedWallet}</Badge></div>
                      <div className="col-span-2 flex items-center justify-end gap-2 text-slate-500">
                        {fmtTime(h.updatedAt)}
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  ))}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="text-lg font-black text-slate-900">No holds found</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters.</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right panel */}
          <GlassCard className="p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">What to fix first</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Recommended priority (demo)</div>
              </div>
              <Badge tone="orange">Premium</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <PriorityCard
                icon={ShieldCheck}
                title="KYC holds"
                desc="Unlock large payouts by completing verification."
                tone="orange"
                onClick={() => {
                  const kycHold = holds.find((h) => h.type === "KYC_PENDING");
                  if (kycHold) {
                    setActiveId(kycHold.id);
                    setDrawerOpen(true);
                    setTab("Guided Fix");
                  }
                }}
              />
              <PriorityCard
                icon={AlertTriangle}
                title="Disputes / chargebacks"
                desc="Upload delivery proofs to release funds."
                onClick={() => pushToast({ title: "Tip", message: "Open dispute hold and run guided fix.", tone: "default" })}
              />
              <PriorityCard
                icon={FileText}
                title="Tax profile"
                desc="Add VAT/TIN and required certificates."
                onClick={() => pushToast({ title: "Tip", message: "Complete tax profile to avoid future holds.", tone: "default" })}
              />
            </div>

            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Core behavior</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    <li>Shows what is blocked and why</li>
                    <li>Explains how to resolve</li>
                    <li>Provides guided fix + audit log</li>
                  </ul>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Hold drawer */}
      <Drawer
        open={drawerOpen}
        title={active ? `Hold · ${active.id}` : "Hold"}
        subtitle={active ? `${typeLabel(active.type)} · ${active.severity} · ${fmtMoney(active.blockedAmount, active.currency)} blocked` : ""}
        onClose={() => setDrawerOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a hold.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-12 w-12 place-items-center rounded-3xl", active.severity === "High" ? "bg-rose-50 text-rose-700" : active.severity === "Medium" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                  <Lock className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.title}</div>
                    <Badge tone={severityTone(active.severity)}>{active.severity}</Badge>
                    <Badge tone="slate">{typeLabel(active.type)}</Badge>
                    <span className="ml-auto"><Badge tone="slate">Updated {fmtTime(active.updatedAt)}</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">{active.reason}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="slate">Wallet: {active.affectedWallet}</Badge>
                    <Badge tone="slate">Blocked: {fmtMoney(active.blockedAmount, active.currency)}</Badge>
                    <Badge tone="slate">Status: {active.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["Overview", "Guided Fix", "Evidence", "Audit Log", "Escalate"].map((t) => (
                <SegTab key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
              ))}
              <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.16 }}
              >
                {tab === "Overview" ? (
                  <div className="grid gap-4 lg:grid-cols-12">
                    <GlassCard className="p-5 lg:col-span-7">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">What is blocked</div>
                        <span className="ml-auto"><Badge tone="slate">Core</Badge></span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <KV label="Hold ID" value={active.id} copy />
                        <KV label="Type" value={typeLabel(active.type)} />
                        <KV label="Severity" value={active.severity} />
                        <KV label="Blocked amount" value={fmtMoney(active.blockedAmount, active.currency)} strong />
                        <KV label="Affected wallet" value={active.affectedWallet} />
                        <KV label="Created" value={fmtTime(active.createdAt)} />
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5 lg:col-span-5">
                      <div className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">How to resolve</div>
                        <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(active.steps || []).map((s) => (
                          <div key={s.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                            <StepDot state={s.state} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-slate-800">{s.label}</div>
                            </div>
                            <Badge tone={s.state === "blocked" ? "slate" : "orange"}>{s.state === "blocked" ? "Waiting" : "Todo"}</Badge>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setTab("Guided Fix");
                          pushToast({ title: "Guided fix", message: "Follow the steps to release funds.", tone: "success" });
                        }}
                        className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        Start guided fix
                      </button>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Guided Fix" ? (
                  <GuidedFix
                    hold={active}
                    pushToast={pushToast}
                    logAudit={logAudit}
                    onResolved={async () => {
                      await sellerBackendApi.deleteFinanceHold(active.id);
                      setHolds((prev) => prev.filter((h) => h.id !== active.id));
                      setDrawerOpen(false);
                    }}
                  />
                ) : null}

                {tab === "Evidence" ? (
                  <div className="space-y-3">
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Evidence required</div>
                        </div>
                        <Badge tone="slate">{active.evidence?.length || 0}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {(active.evidence || []).map((e) => (
                          <EvidenceRow
                            key={e.id}
                            e={e}
                            onUpload={() => {
                              logAudit({ actor: "Supplier", action: "evidence uploaded", detail: e.name, route: "/finance/holds" });
                              pushToast({ title: "Upload", message: `Upload ${e.name} (demo).`, tone: "default" });
                            }}
                          />
                        ))}
                      </div>
                    </GlassCard>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Premium evidence pack</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">In production: export a signed evidence pack for disputes and compliance desks.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === "Audit Log" ? (
                  <div className="space-y-3">
                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-700" />
                          <div className="text-sm font-black text-slate-900">Audit log</div>
                        </div>
                        <Badge tone="slate">{audit.length}</Badge>
                      </div>
                      <div className="mt-3">
                        <AuditTable events={audit} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(JSON.stringify(audit, null, 2));
                            pushToast({ title: "Copied", message: "Audit JSON copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy audit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudit([]);
                            pushToast({ title: "Cleared", message: "Audit cleared (demo).", tone: "default" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                        >
                          <X className="h-4 w-4" />
                          Clear
                        </button>
                      </div>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Escalate" ? (
                  <div className="grid gap-4 lg:grid-cols-12">
                    <GlassCard className="p-5 lg:col-span-7">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Escalate to Support</div>
                        <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Create a ticket with evidence and audit references.</div>

                      <div className="mt-4 grid gap-2">
                        <label className="text-xs font-extrabold text-slate-600">Subject</label>
                        <input className="h-11 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none" defaultValue={`Hold escalation: ${active.id}`} />
                        <label className="text-xs font-extrabold text-slate-600">Message</label>
                        <textarea className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none" rows={5} defaultValue={`Please review hold ${active.id}. Reason: ${active.reason}.`} />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          logAudit({ actor: "Supplier", action: "support ticket created", detail: active.id, route: "/finance/holds" });
                          pushToast({ title: "Ticket created", message: "Support will follow up (demo).", tone: "success" });
                        }}
                        className="mt-4 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        Create ticket
                      </button>
                    </GlassCard>

                    <GlassCard className="p-5 lg:col-span-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Tips to resolve faster</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">What support needs</div>
                        </div>
                        <Badge tone="slate">Checklist</Badge>
                      </div>
                      <div className="mt-4 space-y-2">
                        {["Upload clear documents", "Add concise reviewer note", "Include dispute evidence if applicable", "Reference audit events"].map((x) => (
                          <div key={x} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                            <Check className="h-4 w-4 text-emerald-700" />
                            <div className="text-xs font-extrabold text-slate-800">{x}</div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function PriorityCard({ icon: Icon, title, desc, tone = "slate", onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        tone === "orange" ? "border-orange-200 bg-orange-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", tone === "orange" ? "bg-white dark:bg-slate-900 text-orange-700" : "bg-slate-100 text-slate-700")}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{desc}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

function KV({ label, value, strong = false, copy = false }: { label: string; value: React.ReactNode; strong?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="ml-auto flex items-center gap-2">
        <div className={cx("text-xs", strong ? "font-black text-slate-900" : "font-semibold text-slate-700")}>{value}</div>
        {copy ? (
          <button
            type="button"
            onClick={() => safeCopy(String(value ?? ""))}
            className="grid h-8 w-8 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
            aria-label="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
