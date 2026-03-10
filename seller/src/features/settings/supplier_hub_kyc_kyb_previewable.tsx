import React, { useMemo, useRef, useState } from "react";
import { useSellerCompatState } from "../../lib/frontendState";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  History,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

/**
 * SupplierHub Settings
 * Page: KYC / KYB
 * Route: /settings/kyc
 * Core: document upload, status timeline
 * Super premium: tiering, expiry alerts, verification history
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone };
type DocStatus = "Approved" | "Submitted" | "Required" | "Expiring" | "Rejected";
type DocHistory = { at: string; by: string; event: string };
type KycDoc = {
  id: string;
  title: string;
  required: boolean;
  status: DocStatus;
  fileName: string | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  history: DocHistory[];
  reason?: string;
};
type Tier = "Basic" | "Verified" | "Enhanced";
type TimelineItem = { at: string; label: string; tone: "slate" | "orange" | "green" };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / (24 * 3600_000));
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

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
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

function seedDocs(): KycDoc[] {
  const now = Date.now();
  const ago = (d) => new Date(now - d * 24 * 3600_000).toISOString();
  const inDays = (d) => new Date(now + d * 24 * 3600_000).toISOString();

  return [
    {
      id: "DOC-OWNER-ID",
      title: "Owner ID (Passport or National ID)",
      required: true,
      status: "Approved",
      fileName: "passport.pdf",
      uploadedAt: ago(22),
      expiresAt: inDays(210),
      history: [
        { at: ago(24), by: "Supplier", event: "Uploaded" },
        { at: ago(23), by: "Compliance", event: "Reviewed" },
        { at: ago(22), by: "Compliance", event: "Approved" },
      ],
    },
    {
      id: "DOC-BIZ-REG",
      title: "Business registration certificate",
      required: true,
      status: "Submitted",
      fileName: "business_registration.pdf",
      uploadedAt: ago(5),
      expiresAt: null,
      history: [
        { at: ago(5), by: "Supplier", event: "Uploaded" },
        { at: ago(4), by: "System", event: "Queued for review" },
      ],
    },
    {
      id: "DOC-TAX",
      title: "Tax certificate (VAT or equivalent)",
      required: true,
      status: "Required",
      fileName: null,
      uploadedAt: null,
      expiresAt: null,
      history: [],
    },
    {
      id: "DOC-POA",
      title: "Proof of address (utility bill)",
      required: true,
      status: "Expiring",
      fileName: "utility_bill.pdf",
      uploadedAt: ago(310),
      expiresAt: inDays(12),
      history: [
        { at: ago(310), by: "Supplier", event: "Uploaded" },
        { at: ago(308), by: "Compliance", event: "Approved" },
      ],
    },
    {
      id: "DOC-BANK",
      title: "Bank account proof",
      required: false,
      status: "Rejected",
      fileName: "bank_letter.jpg",
      uploadedAt: ago(9),
      expiresAt: null,
      reason: "Image is not clear. Please upload a PDF or a clearer photo.",
      history: [
        { at: ago(9), by: "Supplier", event: "Uploaded" },
        { at: ago(8), by: "Compliance", event: "Rejected" },
      ],
    },
  ];
}

function deriveTier(docs: KycDoc[]): Tier {
  const approved = docs.filter((d) => d.status === "Approved").length;
  const requiredApproved = docs.filter((d) => d.required).every((d) => d.status === "Approved");

  if (requiredApproved && approved >= 4) return "Enhanced";
  if (approved >= 2) return "Verified";
  return "Basic";
}

export default function SupplierHubKycKybPage() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [docs, setDocs] = useSellerCompatState<KycDoc[]>("settings.kyc.docs", seedDocs());
  const tier = useMemo(() => deriveTier(docs), [docs]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<DocStatus | "All">("All");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  const [selectedDoc, setSelectedDoc] = useState<KycDoc | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return docs
      .filter((d) => (status === "All" ? true : d.status === status))
      .filter((d) => (onlyExpiring ? d.status === "Expiring" : true))
      .filter((d) => {
        if (!query) return true;
        return `${d.title} ${d.id} ${d.status}`.toLowerCase().includes(query);
      });
  }, [docs, q, status, onlyExpiring]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const base: TimelineItem[] = [
      { at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), label: "KYC started", tone: "slate" },
      { at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), label: "Documents uploaded", tone: "orange" },
      { at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), label: "Under review", tone: "slate" },
    ];
    const done: TimelineItem[] = docs.some((d) => d.status === "Approved")
      ? [{ at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), label: "Partial approval granted", tone: "green" }]
      : [];
    return [...done, ...base].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [docs]);

  const expiryAlerts = useMemo(() => {
    return docs
      .filter((d) => !!d.expiresAt)
      .map((d) => ({ ...d, days: daysUntil(d.expiresAt) }))
      .filter((d) => d.days !== null)
      .sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999))
      .slice(0, 6);
  }, [docs]);

  const history = useMemo(() => {
    return [
      { id: "VH-1", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), tier: "Basic", result: "Approved", reviewer: "Compliance" },
      { id: "VH-2", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 22).toISOString(), tier: "Verified", result: "Approved", reviewer: "Compliance" },
      { id: "VH-3", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), tier: "Enhanced", result: "Rejected", reviewer: "Compliance" },
    ];
  }, []);

  const bg =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  const statusTone = (s: DocStatus): "green" | "orange" | "danger" | "slate" => {
    if (s === "Approved") return "green";
    if (s === "Expiring") return "orange";
    if (s === "Rejected") return "danger";
    if (s === "Submitted") return "slate";
    return "slate";
  };

  const uploadForDoc = (docId: string, fileName: string) => {
    setDocs((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const next = {
          ...d,
          fileName,
          uploadedAt: new Date().toISOString(),
          status: "Submitted" as DocStatus,
          reason: undefined,
          history: [{ at: new Date().toISOString(), by: "Supplier", event: `Uploaded ${fileName}` }, ...(d.history || [])],
        };

        // Some docs have expiry. Demo rule: proof of address expires in 365 days.
        if (d.id === "DOC-POA" || d.id === "DOC-OWNER-ID") {
          next.expiresAt = new Date(Date.now() + 365 * 24 * 3600_000).toISOString();
        }
        return next;
      })
    );
    pushToast({ title: "Uploaded", message: "Document submitted for review.", tone: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">KYC / KYB</div>
                <Badge tone="slate">/settings/kyc</Badge>
                <Badge tone="orange">Super premium</Badge>
                <Badge tone={tier === "Enhanced" ? "green" : tier === "Verified" ? "orange" : "slate"}>Tier: {tier}</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Upload documents, track review steps, and maintain verification status.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Report", message: "Wire PDF export.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Download report
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/support", {
                    state: {
                      openTab: "Contact Support",
                      contact: {
                        category: "Compliance",
                        priority: "High",
                        subject: "KYC/KYB compliance review",
                        message:
                          "Requesting compliance support for KYC/KYB verification. Please review the submitted documents and advise on any missing requirements.",
                        channel: "Portal",
                      },
                    },
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <ShieldCheck className="h-4 w-4" />
                Contact compliance
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-8">
            <GlassCard className="p-4">
              <div className="grid gap-3 md:grid-cols-12 md:items-center">
                <div className="relative md:col-span-7">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search documents by name or status"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>
                <div className="md:col-span-5">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Status</div>
                    <div className="relative flex-1">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as DocStatus | "All")}
                        className="h-9 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {(
                          [
                            "All",
                            "Required",
                            "Submitted",
                            "Approved",
                            "Rejected",
                            "Expiring",
                          ] as Array<DocStatus | "All">
                        ).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setOnlyExpiring((v) => !v)}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                        onlyExpiring ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                      )}
                    >
                      {onlyExpiring ? "Expiring" : "All"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {filtered.map((d) => {
                  const exp = d.expiresAt ? daysUntil(d.expiresAt) : null;
                  const expLabel = exp !== null ? `${exp} day(s)` : null;
                  const expTone = exp !== null && exp <= 30 ? "orange" : "slate";

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDoc(d)}
                      className={cx(
                        "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                        d.status === "Expiring" ? "border-orange-200" : "border-slate-200/70"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cx(
                            "grid h-11 w-11 place-items-center rounded-3xl",
                            d.status === "Approved" && "bg-emerald-50 text-emerald-700",
                            d.status === "Expiring" && "bg-orange-50 text-orange-700",
                            d.status === "Rejected" && "bg-rose-50 text-rose-700",
                            (d.status === "Submitted" || d.status === "Required") && "bg-slate-100 text-slate-700"
                          )}
                        >
                          <FileText className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{d.title}</div>
                            {d.required ? <Badge tone="orange">Required</Badge> : <Badge tone="slate">Optional</Badge>}
                            <span className="ml-auto"><Badge tone={statusTone(d.status)}>{d.status}</Badge></span>
                          </div>

                          <div className="mt-1 text-xs font-semibold text-slate-500">
                            {d.fileName ? `File: ${d.fileName}` : "No file uploaded"}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {d.uploadedAt ? <Badge tone="slate">Uploaded {fmtTime(d.uploadedAt)}</Badge> : <Badge tone="slate">Not uploaded</Badge>}
                            {expLabel ? <Badge tone={expTone}>Expiry: {expLabel}</Badge> : null}
                            {d.status === "Rejected" ? <Badge tone="danger">Needs fix</Badge> : null}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  );
                })}

                {filtered.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="text-lg font-black text-slate-900">No documents match</div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search query.</div>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            <GlassCard className="mt-4 p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Status timeline</div>
                <span className="ml-auto"><Badge tone="slate">Core</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {timeline.map((e, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone={e.tone}>{e.label}</Badge>
                      <span className="ml-auto text-[11px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Premium: add reviewer notes and SLA timers per step.</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Right */}
          <div className="lg:col-span-4">
            <div className="space-y-3">
              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Tiering</div>
                  <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Your tier impacts payouts, limits, and ranking.</div>

                <div className="mt-3 grid gap-2">
                  {[
                    { t: "Basic", d: "Upload core documents", ok: tier === "Basic" },
                    { t: "Verified", d: "Approvals for key docs", ok: tier === "Verified" },
                    { t: "Enhanced", d: "Full KYB coverage + history", ok: tier === "Enhanced" },
                  ].map((x) => (
                    <div key={x.t} className={cx("rounded-3xl border p-4", x.ok ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-900">{x.t}</div>
                        <span className="ml-auto"><Badge tone={x.ok ? "green" : "slate"}>{x.ok ? "Current" : "Available"}</Badge></span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-600">{x.d}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Expiry alerts</div>
                  <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Prevent payout delays by renewing documents early.</div>
                <div className="mt-3 space-y-2">
                  {expiryAlerts.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-xs font-semibold text-slate-500">No expiries found.</div>
                  ) : (
                    expiryAlerts.map((d) => (
                      <div key={d.id} className={cx("rounded-3xl border p-4", (d.days ?? 999) <= 30 ? "border-orange-200 bg-orange-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cx("h-4 w-4", (d.days ?? 999) <= 30 ? "text-orange-700" : "text-slate-500")} />
                          <div className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-800">{d.title}</div>
                          <Badge tone={(d.days ?? 999) <= 30 ? "orange" : "slate"}>{d.days} day(s)</Badge>
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-slate-500">Expires {fmtTime(d.expiresAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Verification history</div>
                  <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                </div>
                <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-5">Date</div>
                    <div className="col-span-3">Tier</div>
                    <div className="col-span-4">Result</div>
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {history.map((h) => (
                      <div key={h.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                        <div className="col-span-5 text-slate-500">{fmtTime(h.at)}</div>
                        <div className="col-span-3"><Badge tone="slate">{h.tier}</Badge></div>
                        <div className="col-span-4">
                          <Badge tone={h.result === "Approved" ? "green" : "danger"}>{h.result}</Badge>
                          <span className="ml-2 text-[11px] font-semibold text-slate-500">{h.reviewer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "History", message: "Wire full audit and export.", tone: "default" })}
                  className="mt-3 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Open full history
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Doc Drawer */}
      <Drawer
        open={!!selectedDoc}
        title={selectedDoc ? selectedDoc.title : "Document"}
        subtitle={selectedDoc ? `Status: ${selectedDoc.status}` : ""}
        onClose={() => setSelectedDoc(null)}
      >
        {selectedDoc ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Document summary</div>
                <span className="ml-auto"><Badge tone={selectedDoc.required ? "orange" : "slate"}>{selectedDoc.required ? "Required" : "Optional"}</Badge></span>
              </div>
              <div className="mt-3 grid gap-2">
                <Row label="Status" value={<Badge tone={statusTone(selectedDoc.status)}>{selectedDoc.status}</Badge>} />
                <Row label="File" value={selectedDoc.fileName ? <span className="text-xs font-extrabold text-slate-800">{selectedDoc.fileName}</span> : <span className="text-xs font-semibold text-slate-500">None</span>} />
                <Row label="Uploaded" value={<span className="text-xs font-semibold text-slate-700">{selectedDoc.uploadedAt ? fmtTime(selectedDoc.uploadedAt) : "-"}</span>} />
                <Row
                  label="Expiry"
                  value={
                    selectedDoc.expiresAt ? (
                      <Badge tone={(daysUntil(selectedDoc.expiresAt) ?? 999) <= 30 ? "orange" : "slate"}>
                        {daysUntil(selectedDoc.expiresAt)} day(s)
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">Not set</span>
                    )
                  }
                />
              </div>

              {selectedDoc.status === "Rejected" && selectedDoc.reason ? (
                <div className="mt-3 rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-rose-900">Rejection reason</div>
                      <div className="mt-1 text-xs font-semibold text-rose-900/70">{selectedDoc.reason}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click?.()}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Upload className="h-4 w-4" />
                  Upload new file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    uploadForDoc(selectedDoc.id, f.name);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Request review", message: "Wire escalation workflow.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Request review
                </button>

                <button
                  type="button"
                  onClick={() => pushToast({ title: "Help", message: "Show document format requirements.", tone: "default" })}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Info className="h-4 w-4" />
                  Requirements
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Review history</div>
                <span className="ml-auto"><Badge tone="slate">{selectedDoc.history?.length || 0}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(selectedDoc.history || []).map((h, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{h.by}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(h.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{h.event}</div>
                  </div>
                ))}
                {(selectedDoc.history || []).length === 0 ? (
                  <div className="text-xs font-semibold text-slate-500">No history yet.</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Super premium controls</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-expiry reminders, reviewer notes, and verification history exports can be added here.</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
      <div className="text-xs font-extrabold text-slate-600">{label}</div>
      <div className="text-xs font-semibold text-slate-800">{value}</div>
    </div>
  );
}
