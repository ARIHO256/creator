import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Filter,
  Info,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  X,
} from "lucide-react";

/**
 * HealthMart Compliance Hub (Supplier-facing)
 * Route: /regulatory/healthmart
 *
 * Core:
 * - Submissions queue
 * - Required docs library + uploads
 * - Approval status + decision timeline
 *
 * Super premium:
 * - Risk scoring + drivers
 * - Escalation playbooks
 * - Evidence export pack
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastAction = { label: string; onClick: () => void };
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: ToastAction };
type BadgeTone = "green" | "orange" | "danger" | "slate";

type DocRequirement = { key: string; label: string; state: string };
type SubmissionDecision = { state: string; reviewerNote?: string };
type AuditEntry = { at: string; who: string; action: string };
type Submission = {
  id: string;
  desk: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  riskScore: number;
  docs: { required: DocRequirement[] };
  decision?: SubmissionDecision;
  flags?: string[];
  audit?: AuditEntry[];
};
type DocLibraryItem = { key: string; label: string; appliesTo: string; state: string };
type RiskDriver = { tone: "green" | "orange" | "danger"; label: string; detail: string };
type Playbook = { id: string; title: string; tone: "green" | "orange" | "danger"; steps: string[]; evidence: string[] };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

function minsUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 60000);
}

function scoreTone(score) {
  const s = Number(score || 0);
  if (s >= 75) return "danger";
  if (s >= 55) return "orange";
  return "green";
}

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("approved")) return "green";
  if (s.includes("rejected")) return "danger";
  if (s.includes("escalated")) return "orange";
  if (s.includes("needs")) return "orange";
  if (s.includes("draft")) return "slate";
  return "slate";
}

function docTone(state) {
  const s = String(state || "").toLowerCase();
  if (s.includes("uploaded") || s.includes("verified")) return "green";
  if (s.includes("expiring") || s.includes("needs")) return "orange";
  if (s.includes("missing") || s.includes("rejected")) return "danger";
  return "slate";
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
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[860px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function seedSubmissions(): Submission[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
  const dueIn = (mins: number) => new Date(now + mins * 60_000).toISOString();

  return [
    {
      id: "HM-SUB-24091",
      desk: "HealthMart",
      category: "Pharmacy",
      subject: "Antibiotics import listing (restricted)",
      status: "Needs documents",
      createdAt: ago(320),
      updatedAt: ago(12),
      slaDueAt: dueIn(220),
      riskScore: 84,
      docs: {
        required: [
          { key: "pharmacy_license", label: "Pharmacy License", state: "Uploaded" },
          { key: "drug_import_permit", label: "Drug Import Permit", state: "Missing" },
          { key: "responsible_pharmacist", label: "Responsible Pharmacist ID", state: "Uploaded" },
          { key: "restricted_items_policy", label: "Restricted Items Policy", state: "Needs update" },
        ],
      },
      decision: { state: "Pending", reviewerNote: "Please upload Drug Import Permit. Update restricted items policy." },
      flags: ["Restricted items"],
      audit: [
        { at: ago(320), who: "System", action: "Submission created" },
        { at: ago(40), who: "Desk", action: "Requested additional documents" },
        { at: ago(12), who: "Supplier", action: "Uploaded Pharmacy License" },
      ],
    },
    {
      id: "HM-SUB-24088",
      desk: "HealthMart",
      category: "Logistics",
      subject: "Cold-chain delivery setup (vaccines)",
      status: "Under review",
      createdAt: ago(860),
      updatedAt: ago(55),
      slaDueAt: dueIn(520),
      riskScore: 62,
      docs: {
        required: [
          { key: "logistics_license", label: "Logistics License", state: "Uploaded" },
          { key: "cold_chain_sop", label: "Cold Chain SOP", state: "Uploaded" },
          { key: "warehouse_certificate", label: "Warehouse Certificate", state: "Expiring soon" },
        ],
      },
      decision: { state: "Pending", reviewerNote: "Warehouse certificate is expiring soon. Upload renewal proof." },
      flags: ["Cold-chain"],
      audit: [
        { at: ago(860), who: "System", action: "Submission created" },
        { at: ago(120), who: "Supplier", action: "Uploaded Cold Chain SOP" },
        { at: ago(55), who: "Desk", action: "Review started" },
      ],
    },
    {
      id: "HM-SUB-24074",
      desk: "HealthMart",
      category: "Equipment",
      subject: "Diagnostic device (CE certificate)",
      status: "Approved",
      createdAt: ago(3020),
      updatedAt: ago(1440),
      slaDueAt: dueIn(9999),
      riskScore: 28,
      docs: {
        required: [
          { key: "ce_fda", label: "CE/FDA Certificate", state: "Verified" },
          { key: "user_manual", label: "User Manual", state: "Uploaded" },
          { key: "warranty", label: "Warranty & Service Terms", state: "Uploaded" },
        ],
      },
      decision: { state: "Approved", reviewerNote: "All required certificates verified." },
      flags: [],
      audit: [
        { at: ago(3020), who: "System", action: "Submission created" },
        { at: ago(1500), who: "Desk", action: "Approved" },
      ],
    },
    {
      id: "HM-SUB-24070",
      desk: "HealthMart",
      category: "Equipment",
      subject: "Hospital bed import (HS code compliance)",
      status: "Rejected",
      createdAt: ago(5100),
      updatedAt: ago(2100),
      slaDueAt: dueIn(9999),
      riskScore: 71,
      docs: {
        required: [
          { key: "import_rules", label: "Import Rules Declaration", state: "Missing" },
          { key: "invoice", label: "Commercial Invoice", state: "Uploaded" },
          { key: "cert", label: "Certification", state: "Rejected" },
        ],
      },
      decision: { state: "Rejected", reviewerNote: "Certification document is invalid. Upload a valid certificate and import declaration." },
      flags: ["Import rules"],
      audit: [
        { at: ago(5100), who: "System", action: "Submission created" },
        { at: ago(2100), who: "Desk", action: "Rejected" },
      ],
    },
    {
      id: "HM-SUB-24066",
      desk: "HealthMart",
      category: "Logistics",
      subject: "Medical supplies warehouse registration",
      status: "Draft",
      createdAt: ago(180),
      updatedAt: ago(22),
      slaDueAt: dueIn(720),
      riskScore: 44,
      docs: {
        required: [
          { key: "warehouse_certificate", label: "Warehouse Certificate", state: "Missing" },
          { key: "safety_sop", label: "Safety SOP", state: "Missing" },
        ],
      },
      decision: { state: "Not submitted", reviewerNote: "Complete required documents then submit for review." },
      flags: [],
      audit: [
        { at: ago(180), who: "Supplier", action: "Draft created" },
        { at: ago(22), who: "Supplier", action: "Updated draft" },
      ],
    },
  ];
}

function seedDocLibrary(): DocLibraryItem[] {
  return [
    { key: "business_license", label: "Business Registration", appliesTo: "All", state: "Uploaded" },
    { key: "tax_certificate", label: "Tax Certificate", appliesTo: "All", state: "Uploaded" },
    { key: "quality_policy", label: "Quality Policy (QMS)", appliesTo: "All", state: "Needs update" },

    { key: "logistics_license", label: "Logistics License", appliesTo: "Logistics", state: "Uploaded" },
    { key: "cold_chain_sop", label: "Cold Chain SOP", appliesTo: "Logistics", state: "Uploaded" },
    { key: "warehouse_certificate", label: "Warehouse Certificate", appliesTo: "Logistics", state: "Expiring soon" },

    { key: "pharmacy_license", label: "Pharmacy License", appliesTo: "Pharmacy", state: "Uploaded" },
    { key: "drug_import_permit", label: "Drug Import Permit", appliesTo: "Pharmacy", state: "Missing" },
    { key: "responsible_pharmacist", label: "Responsible Pharmacist ID", appliesTo: "Pharmacy", state: "Uploaded" },

    { key: "equipment_cert", label: "Equipment Certification (CE/FDA)", appliesTo: "Equipment", state: "Verified" },
    { key: "user_manual", label: "User Manual", appliesTo: "Equipment", state: "Uploaded" },
    { key: "warranty_terms", label: "Warranty & Service Terms", appliesTo: "Equipment", state: "Uploaded" },
  ];
}

function buildRiskDrivers(sub: Submission | null | undefined): RiskDriver[] {
  const drivers: RiskDriver[] = [];
  const docs: DocRequirement[] = sub?.docs?.required || [];
  const missing = docs.filter((d) => String(d.state).toLowerCase().includes("missing")).length;
  const bad = docs.filter((d) => {
    const s = String(d.state).toLowerCase();
    return s.includes("rejected") || s.includes("needs") || s.includes("expiring");
  }).length;

  if (missing) drivers.push({ tone: "danger", label: "Missing documents", detail: `${missing} required doc(s) missing.` });
  if (bad) drivers.push({ tone: "orange", label: "Quality issues", detail: `${bad} document(s) need attention.` });
  (sub?.flags || []).forEach((f) => {
    drivers.push({ tone: "orange", label: "Flag", detail: String(f) });
  });

  if (!drivers.length) drivers.push({ tone: "green", label: "Low risk", detail: "Docs look complete for this category." });
  return drivers.slice(0, 4);
}

function playbooksFor(sub: Submission | null | undefined): Playbook[] {
  const flags = new Set((sub?.flags || []).map((x) => String(x).toLowerCase()));
  const docs: DocRequirement[] = sub?.docs?.required || [];
  const missingKeys = new Set<string>(
    docs
      .filter((d) => String(d.state).toLowerCase().includes("missing"))
      .map((d) => String(d.key).toLowerCase())
  );

  const list: Playbook[] = [];

  if (flags.has("restricted items") || sub?.category === "Pharmacy") {
    list.push({
      id: "pb_restricted",
      title: "Restricted items clearance",
      tone: "danger",
      steps: [
        "Upload Drug Import Permit",
        "Attach Restricted Items Policy",
        "Add responsible pharmacist confirmation",
      ],
      evidence: ["Permit", "Policy PDF", "Pharmacist ID"],
    });
  }

  if (flags.has("cold-chain") || sub?.category === "Logistics") {
    list.push({
      id: "pb_coldchain",
      title: "Cold-chain compliance fast-track",
      tone: "orange",
      steps: [
        "Upload Cold Chain SOP",
        "Add temperature monitoring proof",
        "Provide warehouse certificate (valid)",
      ],
      evidence: ["SOP", "Monitoring logs", "Warehouse certificate"],
    });
  }

  if (flags.has("import rules") || missingKeys.has("import_rules")) {
    list.push({
      id: "pb_import",
      title: "Import rules evidence pack",
      tone: "orange",
      steps: [
        "Attach Import Rules Declaration",
        "Confirm HS code mapping",
        "Upload valid certification",
      ],
      evidence: ["Declaration", "HS mapping", "Certificate"],
    });
  }

  if (missingKeys.size) {
    list.push({
      id: "pb_missing",
      title: "Missing documents checklist",
      tone: "orange",
      steps: Array.from(missingKeys).slice(0, 4).map((k) => `Upload: ${k.replace(/_/g, " ")}`),
      evidence: ["Uploaded documents"],
    });
  }

  if (!list.length) {
    list.push({
      id: "pb_ok",
      title: "Keep it compliant",
      tone: "green",
      steps: ["Double-check expiry dates", "Ensure names match your business registration", "Submit for review"],
      evidence: ["Doc list"],
    });
  }

  return list.slice(0, 3);
}

function DeskModuleCard({
  title,
  subtitle,
  icon: Icon,
  onClick,
  badge,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  badge?: { tone: BadgeTone; text: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-[0_18px_50px_rgba(2,16,23,0.10)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-black text-slate-900">{title}</div>
            {badge ? <Badge tone={badge.tone}>{badge.text}</Badge> : null}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
    </button>
  );
}

export default function HealthMartComplianceHubPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [subs, setSubs] = useState<Submission[]>([]);
  const [docLib, setDocLib] = useState<DocLibraryItem[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getRegulatoryDesk("healthmart").then((payload) => {
      if (!active) return;
      const pageData = ((payload as { pageData?: Record<string, unknown> }).pageData ?? {}) as Record<string, unknown>;
      setSubs(Array.isArray(pageData.submissions) ? pageData.submissions as Submission[] : []);
      setDocLib(Array.isArray(pageData.docLibrary) ? pageData.docLibrary as DocLibraryItem[] : []);
    });

    return () => {
      active = false;
    };
  }, []);

  // Filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [riskMin, setRiskMin] = useState(0);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return subs
      .filter((s) => (category === "All" ? true : s.category === category))
      .filter((s) => (status === "All" ? true : s.status === status))
      .filter((s) => Number(s.riskScore || 0) >= riskMin)
      .filter((s) => {
        if (!query) return true;
        const hay = [s.id, s.category, s.subject, s.status, (s.flags || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [subs, q, category, status, riskMin]);

  const stats = useMemo(() => {
    const total = subs.length;
    const pending = subs.filter((s) => ["Under review", "Submitted"].includes(s.status)).length;
    const needs = subs.filter((s) => s.status === "Needs documents").length;
    const approved = subs.filter((s) => s.status === "Approved").length;
    const avgRisk = total ? Math.round(subs.reduce((a, s) => a + Number(s.riskScore || 0), 0) / total) : 0;
    return { total, pending, needs, approved, avgRisk };
  }, [subs]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { All: subs.length, Logistics: 0, Pharmacy: 0, Equipment: 0 };
    subs.forEach((s) => {
      map[s.category] = (map[s.category] || 0) + 1;
    });
    return map;
  }, [subs]);

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((s) => selected[s.id]);
  const toggleAll = () => {
    if (!filtered.length) return;
    if (allVisibleSelected) {
      const next = { ...selected };
      filtered.forEach((s) => delete next[s.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((s) => (next[s.id] = true));
      setSelected(next);
    }
  };

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => subs.find((s) => s.id === activeId) || null, [subs, activeId]);

  const openDetail = (id: string) => {
    setActiveId(id);
    setDetailOpen(true);
  };

  const [tab, setTab] = useState("Overview");
  useEffect(() => {
    if (!detailOpen) return;
    setTab("Overview");
  }, [detailOpen, activeId]);

  const riskDrivers = useMemo(() => buildRiskDrivers(active), [activeId]);
  const playbooks = useMemo(() => playbooksFor(active), [activeId]);

  const submitForReview = (id) => {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const hasMissing = (s.docs?.required || []).some((d) => String(d.state).toLowerCase().includes("missing"));
        if (hasMissing) return s;
        return {
          ...s,
          status: "Under review",
          updatedAt: new Date().toISOString(),
          audit: [{ at: new Date().toISOString(), who: "Supplier", action: "Submitted for review" }, ...(s.audit || [])],
        };
      })
    );

    const sub = subs.find((x) => x.id === id);
    const hasMissing = (sub?.docs?.required || []).some((d) => String(d.state).toLowerCase().includes("missing"));
    if (hasMissing) {
      pushToast({ title: "Missing documents", message: "Upload all required docs before submitting.", tone: "warning" });
      return;
    }
    pushToast({ title: "Submitted", message: "Your submission is now under review.", tone: "success" });
  };

  const requestEscalation = (id) => {
    setSubs((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: s.status === "Approved" ? s.status : "Escalated",
              updatedAt: new Date().toISOString(),
              audit: [{ at: new Date().toISOString(), who: "Supplier", action: "Requested escalation" }, ...(s.audit || [])],
            }
          : s
      )
    );
    pushToast({ title: "Escalation requested", message: "Support team notified (demo).", tone: "default" });
  };

  const uploadDocForSubmission = (subId, docKey) => {
    setSubs((prev) =>
      prev.map((s) => {
        if (s.id !== subId) return s;
        const req = (s.docs?.required || []).map((d) => (d.key === docKey ? { ...d, state: "Uploaded" } : d));
        const nextMissing = req.some((d) => String(d.state).toLowerCase().includes("missing"));
        const nextStatus = s.status === "Needs documents" && !nextMissing ? "Draft" : s.status;
        return {
          ...s,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
          docs: { ...s.docs, required: req },
          audit: [{ at: new Date().toISOString(), who: "Supplier", action: `Uploaded ${docKey}` }, ...(s.audit || [])],
        };
      })
    );

    setDocLib((prev) => prev.map((d) => (d.key === docKey ? { ...d, state: "Uploaded" } : d)));
    pushToast({ title: "Uploaded", message: "Document attached (demo).", tone: "success" });
  };

  const exportEvidencePack = (subId) => {
    const sub = subs.find((s) => s.id === subId);
    if (!sub) return;

    const pack = {
      packId: makeId("EVID"),
      generatedAt: new Date().toISOString(),
      desk: sub.desk,
      submission: {
        id: sub.id,
        category: sub.category,
        subject: sub.subject,
        status: sub.status,
        riskScore: sub.riskScore,
        flags: sub.flags,
      },
      requiredDocs: (sub.docs?.required || []).map((d) => ({ key: d.key, label: d.label, state: d.state })),
      decision: sub.decision,
      audit: sub.audit,
      supplierNote: "This evidence pack is supplier-facing. It does not include internal desk-only data.",
    };

    safeCopy(JSON.stringify(pack, null, 2));
    pushToast({
      title: "Evidence pack exported",
      message: "Evidence JSON copied (wire to PDF/ZIP export).",
      tone: "success",
      action: { label: "Open submission", onClick: () => openDetail(subId) },
    });
  };

  const bulkExport = () => {
    if (!selectedIds.length) return;
    selectedIds.forEach((id) => exportEvidencePack(id));
    setSelected({});
  };

  const go = (to) => {
    // Demo navigation for preview
    try {
      window.location.hash = String(to);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">HealthMart Compliance Hub</div>
                <Badge tone="slate">/regulatory/healthmart</Badge>
                <Badge tone="slate">Supplier view</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Manage HealthMart submissions, upload required docs, track approvals, risk scoring and evidence export.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Playbooks", message: "Open escalation playbooks inside a submission.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Playbooks
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Select submissions and Export evidence pack.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Copy className="h-4 w-4" />
                Evidence export
              </button>
            </div>
          </div>
        </div>

        {/* Desk modules (Logistics, Pharmacy, Equipment) */}
        <div className="grid gap-3 md:grid-cols-3">
          <DeskModuleCard
            title="HealthMart Logistics"
            subtitle="Licenses, cold-chain SOPs, audit-ready evidence"
            icon={Truck}
            badge={{ text: `${categoryCounts.Logistics} items`, tone: "slate" }}
            onClick={() => go("/regulatory/healthmart/logistics")}
          />
          <DeskModuleCard
            title="HealthMart Pharmacy"
            subtitle="Pharmacy licensing, restricted items, enforcement rules"
            icon={Package}
            badge={{ text: `${categoryCounts.Pharmacy} items`, tone: "slate" }}
            onClick={() => go("/regulatory/healthmart/pharmacy")}
          />
          <DeskModuleCard
            title="HealthMart Equipment"
            subtitle="Certifications, import rules, compliance scoring per submission"
            icon={Boxes}
            badge={{ text: `${categoryCounts.Equipment} items`, tone: "slate" }}
            onClick={() => go("/regulatory/healthmart/equipment")}
          />
        </div>

        {/* KPIs */}
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Total submissions</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.total}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Under review</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.pending}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Needs docs</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.needs}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <CheckCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Approved</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.approved}</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Avg risk</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.avgRisk}</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-3 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search submission ID, subject, flags"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                  >
                    {["All", "Draft", "Needs documents", "Under review", "Approved", "Rejected", "Escalated"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Risk ≥</div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={riskMin}
                    onChange={(e) => setRiskMin(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs font-black text-slate-600">{riskMin}</div>
                </div>
              </div>

              <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                {[
                  { k: "All", label: `All (${categoryCounts.All})` },
                  { k: "Logistics", label: `Logistics (${categoryCounts.Logistics})` },
                  { k: "Pharmacy", label: `Pharmacy (${categoryCounts.Pharmacy})` },
                  { k: "Equipment", label: `Equipment (${categoryCounts.Equipment})` },
                ].map((c) => (
                  <Chip key={c.k} active={category === c.k} onClick={() => setCategory(c.k)}>
                    {c.label}
                  </Chip>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setCategory("All");
                    setStatus("All");
                    setRiskMin(0);
                    setSelected({});
                    pushToast({ title: "Cleared", message: "Filters cleared.", tone: "default" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <Badge tone="slate">{filtered.length} shown</Badge>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Supplier guidance</div>
              <span className="ml-auto">
                <Badge tone="slate">Tip</Badge>
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Keep your documents current. Expiring or missing docs increase risk and slow approvals.
            </div>
            <div className="mt-3 grid gap-2">
              {[
                { t: "Upload missing permits", d: "Submit only when required docs are complete." },
                { t: "Avoid restricted items holds", d: "Attach policies and authorization evidence." },
                { t: "Export evidence pack", d: "Generate packs for customs, partners, and disputes." },
              ].map((x) => (
                <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-xs font-extrabold text-slate-700">{x.t}</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">{x.d}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Bulk bar */}
        <AnimatePresence>
          {selectedIds.length ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.16 }}
              className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800">
                  <Check className="h-4 w-4" />
                  {selectedIds.length} selected
                </div>

                <button
                  type="button"
                  onClick={bulkExport}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Copy className="h-4 w-4" />
                  Export evidence
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelected({});
                    pushToast({ title: "Selection cleared", tone: "default" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Content grid */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* Queue */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Submissions queue</div>
                  <Badge tone="slate">Supplier-facing</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "New submission", message: "Wire to submission wizard.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Sparkles className="h-4 w-4" />
                  New submission
                </button>
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
                        "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                        allVisibleSelected ? "border-emerald-200" : "border-slate-200/70"
                      )}
                      aria-label="Select all"
                    >
                      {allVisibleSelected ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="col-span-4">Submission</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1">Risk</div>
                  <div className="col-span-1">SLA</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((s) => {
                    const checked = !!selected[s.id];
                    const missing = (s.docs?.required || []).filter((d) => String(d.state).toLowerCase().includes("missing")).length;
                    const sla = minsUntil(s.slaDueAt);
                    const slaTone = sla <= 0 ? "danger" : sla <= 180 ? "orange" : "slate";
                    const urgentBg = sla <= 0 ? "bg-rose-50/35" : sla <= 180 ? "bg-orange-50/25" : "bg-white dark:bg-slate-900/50";

                    return (
                      <div key={s.id} className={cx("grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700", urgentBg)}>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => setSelected((p) => ({ ...p, [s.id]: !checked }))}
                            className={cx(
                              "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900",
                              checked ? "border-emerald-200" : "border-slate-200/70"
                            )}
                            aria-label={checked ? "Unselect" : "Select"}
                          >
                            {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                          </button>
                        </div>

                        <button type="button" onClick={() => openDetail(s.id)} className="col-span-4 text-left">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{s.subject}</div>
                            <Badge tone="slate">{s.id}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                            <span>Updated {fmtTime(s.updatedAt)}</span>
                            {missing ? <Badge tone="orange">{missing} missing</Badge> : <Badge tone="green">Docs OK</Badge>}
                            {(s.flags || []).slice(0, 2).map((f) => (
                              <Badge key={f} tone="slate">{f}</Badge>
                            ))}
                          </div>
                        </button>

                        <div className="col-span-2 flex items-center">
                          <Badge tone="slate">{s.category}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                          <Badge tone={statusTone(s.decision?.state)}>{s.decision?.state}</Badge>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={scoreTone(s.riskScore)}>{s.riskScore}</Badge>
                        </div>

                        <div className="col-span-1 flex items-center">
                          <Badge tone={slaTone}>{sla <= 0 ? "Overdue" : `${sla}m`}</Badge>
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          {s.status === "Draft" || s.status === "Needs documents" ? (
                            <button
                              type="button"
                              onClick={() => submitForReview(s.id)}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                              title="Submit for review"
                            >
                              <CheckCheck className="h-4 w-4" />
                              Submit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => exportEvidencePack(s.id)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                              title="Export evidence pack"
                            >
                              <Copy className="h-4 w-4" />
                              Export
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openDetail(s.id)}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                            aria-label="Open"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                        <div className="flex items-start gap-3">
                          <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                            <Search className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900">No submissions match</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try adjusting filters or clearing search.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Right rail */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Required docs library</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Reusable docs that apply across submissions</div>
                </div>
                <Badge tone="slate">Library</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {docLib.slice(0, 10).map((d) => (
                  <div key={d.key} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-xs font-black text-slate-900">{d.label}</div>
                          <Badge tone="slate">{d.appliesTo}</Badge>
                          <span className="ml-auto"><Badge tone={docTone(d.state)}>{d.state}</Badge></span>
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-slate-500">Attach this doc to submissions that require it.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              pushToast({ title: "Upload", message: "Wire to file uploader.", tone: "default" });
                              setDocLib((p) => p.map((x) => (x.key === d.key ? { ...x, state: "Uploaded" } : x)));
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Upload className="h-4 w-4" />
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              safeCopy(`${d.label} (${d.key})`);
                              pushToast({ title: "Copied", message: "Doc reference copied.", tone: "success" });
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                          >
                            <Copy className="h-4 w-4" />
                            Copy ref
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Premium</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-validation rules can flag expired/invalid docs before you submit.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={active ? `Submission · ${active.id}` : "Submission"}
        subtitle={active ? `${active.category} · ${active.status} · Risk ${active.riskScore}` : ""}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a submission first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx(
                  "grid h-12 w-12 place-items-center rounded-3xl",
                  scoreTone(active.riskScore) === "danger" ? "bg-rose-50 text-rose-700" : scoreTone(active.riskScore) === "orange" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
                )}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{active.subject}</div>
                    <Badge tone="slate">{active.category}</Badge>
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                    <span className="ml-auto"><Badge tone={scoreTone(active.riskScore)}>{active.riskScore}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Created {fmtTime(active.createdAt)} · Updated {fmtTime(active.updatedAt)}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(active.decision?.state)}>{active.decision?.state}</Badge>
                    {(active.flags || []).map((f) => (
                      <Badge key={f} tone="slate">{f}</Badge>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(active.id);
                        pushToast({ title: "Copied", message: "Submission ID copied.", tone: "success" });
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {["Overview", "Required Docs", "Approval", "Risk & Playbooks", "Audit", "Evidence Export"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cx(
                    "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                    tab === t ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  )}
                >
                  {t}
                </button>
              ))}

              <button
                type="button"
                onClick={() => requestEscalation(active.id)}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Request escalation
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.16 }}>
                {tab === "Overview" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">What you need to do</div>
                        <span className="ml-auto"><Badge tone="slate">Checklist</Badge></span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(active.docs?.required || []).map((d) => (
                          <div key={d.key} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                            <div className="text-xs font-extrabold text-slate-700">{d.label}</div>
                            <Badge tone={docTone(d.state)}>{d.state}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-[11px] font-semibold text-slate-500">Tip: once all docs are uploaded, submit for review to start approval.</div>
                    </GlassCard>

                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Risk drivers</div>
                        <span className="ml-auto"><Badge tone={scoreTone(active.riskScore)}>{active.riskScore}</Badge></span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {riskDrivers.map((d) => (
                          <div key={d.label} className={cx(
                            "rounded-3xl border p-4",
                            d.tone === "danger" ? "border-rose-200 bg-rose-50/70" : d.tone === "orange" ? "border-orange-200 bg-orange-50/70" : "border-emerald-200 bg-emerald-50/70"
                          )}>
                            <div className="text-xs font-black text-slate-900">{d.label}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-700">{d.detail}</div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Quick actions</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Fast paths for suppliers</div>
                        </div>
                        <Badge tone="slate">Actions</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitForReview(active.id)}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <CheckCheck className="h-4 w-4" />
                          Submit for review
                        </button>
                        <button
                          type="button"
                          onClick={() => exportEvidencePack(active.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Export evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => pushToast({ title: "Support", message: "Wire to support chat.", tone: "default" })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Contact support
                        </button>
                      </div>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Required Docs" ? (
                  <div className="space-y-3">
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Upload and attach documents</div>
                        <span className="ml-auto"><Badge tone="slate">{(active.docs?.required || []).length} required</Badge></span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {(active.docs?.required || []).map((d) => {
                          const isMissing = String(d.state).toLowerCase().includes("missing") || String(d.state).toLowerCase().includes("needs");
                          return (
                            <div key={d.key} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                              <div className="flex items-start gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-black text-slate-900">{d.label}</div>
                                    <span className="ml-auto"><Badge tone={docTone(d.state)}>{d.state}</Badge></span>
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-slate-500">Attach the latest version for faster approval.</div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => uploadDocForSubmission(active.id, d.key)}
                                      className={cx(
                                        "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold",
                                        isMissing ? "text-white" : "border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                      )}
                                      style={isMissing ? { background: TOKENS.green } : undefined}
                                    >
                                      <Upload className="h-4 w-4" />
                                      {isMissing ? "Upload now" : "Replace"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        safeCopy(d.label);
                                        pushToast({ title: "Copied", message: "Doc name copied.", tone: "success" });
                                      }}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                    >
                                      <Copy className="h-4 w-4" />
                                      Copy name
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Auto-validation (premium)</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">On upload: check expiry, name match, file format, and policy keywords.</div>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Approval" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Approval status</div>
                        <span className="ml-auto"><Badge tone={statusTone(active.decision?.state)}>{active.decision?.state}</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Desk note</div>
                      <div className="mt-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-sm font-semibold text-slate-700">
                        {active.decision?.reviewerNote || "No reviewer notes yet."}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitForReview(active.id)}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <CheckCheck className="h-4 w-4" />
                          {active.status === "Under review" ? "Resubmit" : "Submit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => requestEscalation(active.id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Escalate
                        </button>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Decision timeline</div>
                        <span className="ml-auto"><Badge tone="slate">{(active.audit || []).length}</Badge></span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(active.audit || []).slice(0, 8).map((e, idx) => (
                          <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                            <div className="flex items-center gap-2">
                              <Badge tone="slate">{e.who}</Badge>
                              <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                            </div>
                            <div className="mt-2 text-sm font-black text-slate-900">{e.action}</div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Risk & Playbooks" ? (
                  <div className="space-y-3">
                    <GlassCard className="p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Recommended playbooks</div>
                        <span className="ml-auto"><Badge tone="slate">{playbooks.length}</Badge></span>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {playbooks.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              pushToast({ title: "Playbook opened", message: p.title, tone: p.tone === "danger" ? "danger" : "default" });
                              setSubs((prev) =>
                                prev.map((s) =>
                                  s.id === active.id
                                    ? {
                                        ...s,
                                        audit: [{ at: new Date().toISOString(), who: "Supplier", action: `Opened playbook: ${p.title}` }, ...(s.audit || [])],
                                      }
                                    : s
                                )
                              );
                            }}
                            className={cx(
                              "rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                              p.tone === "danger" ? "border-rose-200" : p.tone === "orange" ? "border-orange-200" : "border-emerald-200"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cx(
                                "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                                p.tone === "danger" ? "text-rose-700" : p.tone === "orange" ? "text-orange-700" : "text-emerald-700"
                              )}>
                                {p.tone === "danger" ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900">{p.title}</div>
                                <div className="mt-2 text-[11px] font-semibold text-slate-600">
                                  {p.steps.slice(0, 3).map((s, i) => (
                                    <div key={i} className="truncate">• {s}</div>
                                  ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {p.evidence.slice(0, 3).map((e) => (
                                    <Badge key={e} tone="slate">{e}</Badge>
                                  ))}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">Risk reduction</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Premium: show what changed since last upload</div>
                          </div>
                          <Badge tone={scoreTone(active.riskScore)}>{active.riskScore}</Badge>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {riskDrivers.map((d) => (
                            <div key={d.label} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                              <div className="text-xs font-extrabold text-slate-700">{d.label}</div>
                              <Badge tone={d.tone}>{d.tone === "danger" ? "High" : d.tone === "orange" ? "Medium" : "Low"}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ) : null}

                {tab === "Audit" ? (
                  <div className="space-y-2">
                    {(active.audit || []).map((e, idx) => (
                      <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-center gap-2">
                          <Badge tone="slate">{e.who}</Badge>
                          <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                        </div>
                        <div className="mt-2 text-sm font-black text-slate-900">{e.action}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {tab === "Evidence Export" ? (
                  <div className="space-y-3">
                    <GlassCard className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Evidence pack builder</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">Includes docs list, decision status and audit timeline</div>
                        </div>
                        <Badge tone="slate">Export</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {["Docs list", "Decision status", "Audit timeline", "Risk drivers"].map((x) => (
                          <div key={x} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                            <div className="text-xs font-extrabold text-slate-700">{x}</div>
                            <Badge tone="green">Included</Badge>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => exportEvidencePack(active.id)}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Copy className="h-4 w-4" />
                          Generate pack
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(active.subject);
                            pushToast({ title: "Copied", message: "Submission title copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy title
                        </button>
                      </div>

                      <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                            <Info className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-orange-900">Premium export</div>
                            <div className="mt-1 text-xs font-semibold text-orange-900/70">Generate a PDF/ZIP evidence pack, signed audit hash, and share link.</div>
                          </div>
                        </div>
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
