import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Globe,
  Info,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Truck,
  Upload,
  Users2,
  X,
} from "lucide-react";

/**
 * Compliance Center (Previewable)
 * Route: /ops/compliance
 *
 * Scope
 * - Compliance cases inbox (listing + account + logistics)
 * - Document vault (licenses, MSDS, KYB, warranty terms)
 * - Desk routing (HealthMart, EduMart, FaithMart)
 * - Scan + bulk actions (demo)
 *
 * Notes
 * - Demo only. Wire to API + permissions.
 * - Supplier-safe: never show restricted buyer budget values.
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

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[780px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function severityTone(sev) {
  if (sev === "High") return "danger";
  if (sev === "Medium") return "orange";
  return "slate";
}

function statusTone(status) {
  if (status === "Resolved") return "green";
  if (status === "On Hold") return "danger";
  if (status === "Awaiting Docs") return "orange";
  return "slate";
}

function minutesUntil(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 60000);
}

function slaLabel(dueAt, status) {
  if (!dueAt || status === "Resolved") return { label: "-", tone: "slate" };
  const m = minutesUntil(dueAt);
  if (m <= 0) return { label: "Overdue", tone: "danger" };
  if (m <= 240) return { label: "< 4h", tone: "orange" };
  return { label: "On track", tone: "green" };
}

function seedCases() {
  const now = Date.now();
  const agoH = (h) => new Date(now - h * 3600_000).toISOString();
  const inH = (h) => new Date(now + h * 3600_000).toISOString();

  return [
    {
      id: "CMP-90021",
      subjectType: "Listing",
      subjectId: "L-1002",
      subjectTitle: "E-Bike Battery Pack 48V 20Ah",
      marketplace: "EVmart",
      category: "Documents",
      desk: "HealthMart",
      severity: "High",
      status: "Awaiting Docs",
      createdAt: agoH(6.4),
      dueAt: inH(5),
      issues: ["Missing MSDS upload", "Warranty terms not set"],
      requiredDocs: ["MSDS", "Warranty terms"],
      evidence: 1,
      notes: "Battery listings require MSDS and warranty statement.",
      timeline: [
        { at: agoH(6.4), who: "System", event: "Flagged missing required documents" },
        { at: agoH(5.9), who: "Ops", event: "Routed to HealthMart desk" },
      ],
    },
    {
      id: "CMP-90020",
      subjectType: "Account",
      subjectId: "KYB",
      subjectTitle: "KYB verification"
      ,
      marketplace: "SupplierHub",
      category: "Verification",
      desk: "General",
      severity: "Medium",
      status: "Open",
      createdAt: agoH(18),
      dueAt: inH(24),
      issues: ["Missing company registration certificate", "Director ID not uploaded"],
      requiredDocs: ["Company registration", "Director ID"],
      evidence: 0,
      notes: "Complete KYB to prevent payout delays.",
      timeline: [
        { at: agoH(18), who: "System", event: "KYB incomplete" },
      ],
    },
    {
      id: "CMP-90019",
      subjectType: "Listing",
      subjectId: "L-1005",
      subjectTitle: "EV charging installation service",
      marketplace: "ServiceMart",
      category: "Regulated",
      desk: "EduMart",
      severity: "High",
      status: "On Hold",
      createdAt: agoH(42),
      dueAt: inH(2),
      issues: ["Missing license document", "Incorrect category"],
      requiredDocs: ["License document"],
      evidence: 2,
      notes: "Installation services must attach professional license where required.",
      timeline: [
        { at: agoH(42), who: "System", event: "Detected mismatch between category and service keywords" },
        { at: agoH(40), who: "Ops", event: "Put listing on hold" },
      ],
    },
    {
      id: "CMP-90018",
      subjectType: "Logistics",
      subjectId: "SHIP-77",
      subjectTitle: "Shipping profile: Express International",
      marketplace: "Ops",
      category: "Shipping",
      desk: "General",
      severity: "Low",
      status: "Open",
      createdAt: agoH(10),
      dueAt: inH(48),
      issues: ["Return address not set"],
      requiredDocs: ["Return address"],
      evidence: 0,
      notes: "Set return address to improve dispute outcomes.",
      timeline: [
        { at: agoH(10), who: "System", event: "Missing return address" },
      ],
    },
  ];
}

function seedDocs() {
  const now = Date.now();
  const agoD = (d) => new Date(now - d * 24 * 3600_000).toISOString();
  return [
    {
      id: "DOC-201",
      name: "Company registration certificate",
      type: "KYB",
      status: "Missing",
      updatedAt: null,
      versions: [],
    },
    {
      id: "DOC-202",
      name: "Director ID",
      type: "KYB",
      status: "Uploaded",
      updatedAt: agoD(2),
      versions: [{ at: agoD(2), note: "Initial upload" }],
    },
    {
      id: "DOC-203",
      name: "MSDS (Batteries)",
      type: "Safety",
      status: "Missing",
      updatedAt: null,
      versions: [],
    },
    {
      id: "DOC-204",
      name: "Warranty terms",
      type: "Policy",
      status: "Draft",
      updatedAt: agoD(10),
      versions: [{ at: agoD(10), note: "Draft created" }],
    },
    {
      id: "DOC-205",
      name: "Installer license",
      type: "Regulated",
      status: "Uploaded",
      updatedAt: agoD(18),
      versions: [{ at: agoD(18), note: "Verified" }],
    },
  ];
}

function KpiCard({ icon: Icon, label, value, tone = "slate" }) {
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
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function Checkbox({ checked, onToggle, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900 transition",
        checked ? "border-emerald-200" : "border-slate-200/70"
      )}
    >
      {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
    </button>
  );
}

function DeskCard({ title, desc, icon: Icon, count, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-3xl border p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
        tone === "orange" ? "border-orange-200 bg-orange-50/60" : "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", tone === "orange" ? "bg-white dark:bg-slate-900 text-orange-700" : "bg-slate-100 text-slate-700")}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={cx("text-sm font-black", tone === "orange" ? "text-orange-900" : "text-slate-900")}>{title}</div>
            <span className="ml-auto"><Badge tone={tone === "orange" ? "orange" : "slate"}>{count}</Badge></span>
          </div>
          <div className={cx("mt-1 text-xs font-semibold", tone === "orange" ? "text-orange-900/70" : "text-slate-500")}>{desc}</div>
        </div>
        <ChevronRight className={cx("h-4 w-4", tone === "orange" ? "text-orange-600" : "text-slate-300")} />
      </div>
    </button>
  );
}

export default function ComplianceCenterPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Overview");

  const [cases, setCases] = useState(seedCases());
  const [docs, setDocs] = useState(seedDocs());
  const [loading, setLoading] = useState(true);
  const didHydrateRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const payload = await sellerBackendApi.getOpsCompliancePage();
        if (cancelled || !payload || typeof payload !== "object") return;
        if (Array.isArray(payload.cases)) setCases(payload.cases as typeof cases);
        if (Array.isArray(payload.docs)) setDocs(payload.docs as typeof docs);
      } catch {
        // keep seeded UI
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    void sellerBackendApi.patchOpsCompliancePage({ cases, docs });
  }, [cases, docs, loading]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [category, setCategory] = useState("All");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const [scanning, setScanning] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases
      .filter((c) => (status === "All" ? true : c.status === status))
      .filter((c) => (severity === "All" ? true : c.severity === severity))
      .filter((c) => (category === "All" ? true : c.category === category))
      .filter((c) => {
        if (!q) return true;
        const hay = [c.id, c.subjectType, c.subjectId, c.subjectTitle, c.marketplace, c.category, c.desk, (c.issues || []).join(" ")]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [cases, query, status, severity, category]);

  const stats = useMemo(() => {
    const open = cases.filter((c) => c.status !== "Resolved").length;
    const high = cases.filter((c) => c.severity === "High" && c.status !== "Resolved").length;
    const holds = cases.filter((c) => c.status === "On Hold").length;
    const awaiting = cases.filter((c) => c.status === "Awaiting Docs").length;
    return { open, high, holds, awaiting };
  }, [cases]);

  const deskCounts = useMemo(() => {
    const base = { General: 0, HealthMart: 0, EduMart: 0, FaithMart: 0 };
    cases.forEach((c) => {
      base[c.desk] = (base[c.desk] || 0) + (c.status === "Resolved" ? 0 : 1);
    });
    return base;
  }, [cases]);

  const toggleAll = () => {
    const all = filtered.length > 0 && filtered.every((c) => selected[c.id]);
    if (all) {
      const next = { ...selected };
      filtered.forEach((c) => delete next[c.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((c) => (next[c.id] = true));
      setSelected(next);
    }
  };

  const bulkRoute = (desk) => {
    if (!selectedIds.length) {
      pushToast({ title: "Select cases", message: "Choose one or more cases first.", tone: "warning" });
      return;
    }
    setCases((prev) =>
      prev.map((c) =>
        selectedIds.includes(c.id)
          ? {
              ...c,
              desk,
              timeline: [{ at: new Date().toISOString(), who: "Ops", event: `Routed to ${desk} desk` }, ...(c.timeline || [])],
            }
          : c
      )
    );
    setSelected({});
    pushToast({ title: "Routed", message: `${selectedIds.length} case(s) routed to ${desk}.`, tone: "success" });
  };

  const bulkRequestDocs = () => {
    if (!selectedIds.length) {
      pushToast({ title: "Select cases", message: "Choose one or more cases first.", tone: "warning" });
      return;
    }
    setCases((prev) =>
      prev.map((c) =>
        selectedIds.includes(c.id)
          ? {
              ...c,
              status: c.status === "Resolved" ? "Resolved" : "Awaiting Docs",
              timeline: [{ at: new Date().toISOString(), who: "Ops", event: "Requested documents" }, ...(c.timeline || [])],
            }
          : c
      )
    );
    setSelected({});
    pushToast({ title: "Docs requested", message: `${selectedIds.length} case(s) updated.`, tone: "success" });
  };

  const bulkResolve = () => {
    if (!selectedIds.length) {
      pushToast({ title: "Select cases", message: "Choose one or more cases first.", tone: "warning" });
      return;
    }
    setCases((prev) =>
      prev.map((c) =>
        selectedIds.includes(c.id)
          ? {
              ...c,
              status: "Resolved",
              timeline: [{ at: new Date().toISOString(), who: "Ops", event: "Marked resolved" }, ...(c.timeline || [])],
            }
          : c
      )
    );
    setSelected({});
    pushToast({ title: "Resolved", message: `${selectedIds.length} case(s) resolved.`, tone: "success" });
  };

  const runScan = async () => {
    setScanning(true);
    pushToast({ title: "Compliance scan started", message: "Scanning listings, account and logistics rules.", tone: "default" });
    await new Promise((r) => setTimeout(r, 900));

    // Demo: add a new low-severity case once
    setCases((prev) => {
      const already = prev.some((c) => c.id === "CMP-90017");
      if (already) return prev;
      return [
        {
          id: "CMP-90017",
          subjectType: "Listing",
          subjectId: "L-1003",
          subjectTitle: "Type 2 Charging Cable 5m",
          marketplace: "EVmart",
          category: "Content",
          desk: "General",
          severity: "Low",
          status: "Open",
          createdAt: new Date().toISOString(),
          dueAt: new Date(Date.now() + 72 * 3600_000).toISOString(),
          issues: ["Low image count"],
          requiredDocs: ["Add 3+ images"],
          evidence: 0,
          notes: "Improve listing media quality for policy compliance and conversion.",
          timeline: [{ at: new Date().toISOString(), who: "System", event: "Media policy check failed" }],
        },
        ...prev,
      ];
    });

    setScanning(false);
    pushToast({ title: "Scan completed", message: "Results updated.", tone: "success" });
  };

  const [caseDrawerOpen, setCaseDrawerOpen] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const activeCase = useMemo(() => cases.find((c) => c.id === activeCaseId) || null, [cases, activeCaseId]);

  const openCase = (id) => {
    setActiveCaseId(id);
    setCaseDrawerOpen(true);
  };

  const caseSla = activeCase ? slaLabel(activeCase.dueAt, activeCase.status) : null;

  const [docDrawerOpen, setDocDrawerOpen] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const activeDoc = useMemo(() => docs.find((d) => d.id === activeDocId) || null, [docs, activeDocId]);

  const uploadDoc = (docId) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: "Uploaded",
              updatedAt: new Date().toISOString(),
              versions: [{ at: new Date().toISOString(), note: "Uploaded (demo)" }, ...(d.versions || [])].slice(0, 8),
            }
          : d
      )
    );
    pushToast({ title: "Uploaded", message: "Document updated (demo).", tone: "success" });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Compliance Center</div>
                <Badge tone="slate">/ops/compliance</Badge>
                <Badge tone="slate">Ops</Badge>
                <Badge tone="orange">Premium</Badge>
                {loading ? <Badge tone="slate">Loading</Badge> : <Badge tone="green">Backend</Badge>}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Cases, documents, desk routing and policy controls.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(window.location.hash?.replace(/^#/, "") || "/ops/compliance");
                  pushToast({ title: "Link copied", message: "Route copied (demo).", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>

              <button
                type="button"
                onClick={runScan}
                disabled={scanning}
                className={cx(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                  scanning && "opacity-70"
                )}
                style={{ background: TOKENS.green }}
              >
                <RefreshCw className="h-4 w-4" />
                {scanning ? "Scanning" : "Run scan"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <KpiCard icon={ShieldCheck} label="Open cases" value={stats.open} />
            <KpiCard icon={AlertTriangle} label="High severity" value={stats.high} tone="danger" />
            <KpiCard icon={Timer} label="Awaiting docs" value={stats.awaiting} tone="orange" />
            <KpiCard icon={ClipboardList} label="On hold" value={stats.holds} tone="danger" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {["Overview", "Cases", "Documents", "Desk Routing", "Rules", "Audit"].map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}
            </Chip>
          ))}
        </div>

        {tab === "Overview" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-900">What this center does</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    A single workflow for policy checks, regulated category routing, evidence uploads and resolution.
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Listings</div>
                        <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Content checks, required docs, category rules.</div>
                      <button
                        type="button"
                        onClick={() => setTab("Cases")}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        Open cases
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Documents</div>
                        <span className="ml-auto"><Badge tone="slate">Vault</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Upload and version required evidence.</div>
                      <button
                        type="button"
                        onClick={() => setTab("Documents")}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        Open vault
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-orange-700" />
                        <div className="text-sm font-black text-orange-900">Premium</div>
                        <span className="ml-auto"><Badge tone="orange">AI</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-orange-900/70">
                        Suggested fixes, SLA risk, and desk routing hints.
                      </div>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Premium", message: "Wire AI checks and auto-fix suggestions.", tone: "default" })}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
                      >
                        View ideas
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Desk queues</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Open cases per desk</div>
                </div>
                <Badge tone="slate">Routing</Badge>
              </div>

              <div className="mt-4 grid gap-2">
                <DeskCard
                  title="HealthMart Desk"
                  desc="Safety, pharmacy-related docs, regulated products"
                  icon={ShieldCheck}
                  count={deskCounts.HealthMart}
                  tone="orange"
                  onClick={() => {
                    setTab("Cases");
                    setCategory("Documents");
                    setStatus("All");
                    setSeverity("All");
                    pushToast({ title: "Filtered", message: "Showing document cases (demo).", tone: "default" });
                  }}
                />
                <DeskCard
                  title="EduMart Desk"
                  desc="Education and training content checks"
                  icon={Building2}
                  count={deskCounts.EduMart}
                  tone="slate"
                  onClick={() => {
                    setTab("Cases");
                    setCategory("Regulated");
                    pushToast({ title: "Filtered", message: "Showing regulated cases (demo).", tone: "default" });
                  }}
                />
                <DeskCard
                  title="FaithMart Desk"
                  desc="Community guidelines and sensitive items"
                  icon={Users2}
                  count={deskCounts.FaithMart}
                  tone="slate"
                  onClick={() => {
                    setTab("Desk Routing");
                    pushToast({ title: "Desk routing", message: "Open routing rules (demo).", tone: "default" });
                  }}
                />
              </div>

              <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Supplier-safe</div>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  This view highlights requirements and workflow states. It does not reveal restricted buyer data.
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Cases" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-4 lg:col-span-12">
              <div className="grid gap-3 md:grid-cols-12 md:items-center">
                <div className="relative md:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search case, listing, issue, desk"
                    className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                    >
                      {["All", "Open", "Awaiting Docs", "On Hold", "Resolved"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                    >
                      {["All", "High", "Medium", "Low"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Category</div>
                    <div className="relative ml-auto">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {["All", "Documents", "Verification", "Regulated", "Shipping", "Content"].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Check className="h-4 w-4" />
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={bulkRequestDocs}
                    disabled={!selectedIds.length}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold transition",
                      selectedIds.length ? "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:bg-slate-950" : "cursor-not-allowed border-slate-100 text-slate-400"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Request docs
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      disabled={!selectedIds.length}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white",
                        !selectedIds.length && "opacity-60"
                      )}
                      style={{ background: TOKENS.orange }}
                      onClick={() => bulkRoute("HealthMart")}
                      title="Quick route to HealthMart"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Route
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={bulkResolve}
                    disabled={!selectedIds.length}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white",
                      !selectedIds.length && "opacity-60"
                    )}
                    style={{ background: TOKENS.green }}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Resolve
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setStatus("All");
                      setSeverity("All");
                      setCategory("All");
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

            <GlassCard className="overflow-hidden lg:col-span-12">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Compliance cases</div>
                    {selectedIds.length ? <Badge tone="green">{selectedIds.length} selected</Badge> : <Badge tone="slate">Inbox</Badge>}
                  </div>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Export", message: "Wire evidence pack export to PDF/ZIP.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    Export pack
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[1100px]">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-1">Sel</div>
                    <div className="col-span-4">Case</div>
                    <div className="col-span-2">Desk</div>
                    <div className="col-span-1">Severity</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1">SLA</div>
                    <div className="col-span-1 text-right">Action</div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {filtered.map((c) => {
                      const checked = !!selected[c.id];
                      const sla = slaLabel(c.dueAt, c.status);
                      return (
                        <div
                          key={c.id}
                          className={cx(
                            "grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold",
                            c.status === "On Hold" ? "bg-rose-50/30" : c.status === "Awaiting Docs" ? "bg-orange-50/30" : "bg-white dark:bg-slate-900/40"
                          )}
                        >
                          <div className="col-span-1 flex items-center">
                            <Checkbox checked={checked} onToggle={() => setSelected((s) => ({ ...s, [c.id]: !checked }))} label={`Select ${c.id}`} />
                          </div>

                          <button type="button" onClick={() => openCase(c.id)} className="col-span-4 text-left">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{c.id}</div>
                              <Badge tone="slate">{c.subjectType}</Badge>
                              <Badge tone="slate">{c.category}</Badge>
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500 truncate">
                              {c.subjectTitle} · {c.marketplace} · {c.subjectId}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(c.issues || []).slice(0, 2).map((iss) => (
                                <Badge key={iss} tone="slate">{iss}</Badge>
                              ))}
                              {(c.issues || []).length > 2 ? <Badge tone="slate">+{(c.issues || []).length - 2}</Badge> : null}
                            </div>
                          </button>

                          <div className="col-span-2 flex items-center">
                            <Badge tone="slate">{c.desk}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone={severityTone(c.severity)}>{c.severity}</Badge>
                          </div>

                          <div className="col-span-2 flex items-center gap-2">
                            <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                            <span className="text-[11px] font-semibold text-slate-500">{fmtTime(c.createdAt)}</span>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone={sla.tone}>{sla.label}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => openCase(c.id)}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <ChevronRight className="h-4 w-4" />
                              Open
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
                              <Filter className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="text-lg font-black text-slate-900">No cases match</div>
                              <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing keywords.</div>
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
        ) : null}

        {tab === "Documents" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Document vault</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Upload and version compliance evidence.</div>
                </div>
                <Badge tone="slate">Vault</Badge>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-5">Document</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Updated</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setActiveDocId(d.id);
                        setDocDrawerOpen(true);
                      }}
                      className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <div className="col-span-5">
                        <div className="text-sm font-black text-slate-900">{d.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{d.id}</div>
                      </div>
                      <div className="col-span-2 flex items-center"><Badge tone="slate">{d.type}</Badge></div>
                      <div className="col-span-2 flex items-center">
                        <Badge tone={d.status === "Uploaded" ? "green" : d.status === "Missing" ? "danger" : "orange"}>{d.status}</Badge>
                      </div>
                      <div className="col-span-2 flex items-center text-[11px] font-semibold text-slate-500">{d.updatedAt ? fmtTime(d.updatedAt) : "-"}</div>
                      <div className="col-span-1 flex items-center justify-end">
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Premium</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-match documents to cases and suggest what is missing.</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Quick uploads</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Common files required for smooth publishing.</div>
                </div>
                <Badge tone="slate">Shortcuts</Badge>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  { label: "Upload company registration", docId: "DOC-201", icon: Building2 },
                  { label: "Upload MSDS", docId: "DOC-203", icon: ShieldCheck },
                  { label: "Upload license", docId: "DOC-205", icon: ClipboardList },
                ].map((x) => (
                  <button
                    key={x.docId}
                    type="button"
                    onClick={() => uploadDoc(x.docId)}
                    className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <x.icon className="h-4 w-4 text-slate-700" />
                      </span>
                      {x.label}
                    </span>
                    <Upload className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Evidence pack</div>
                  <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Generate a bundle to respond to escalations or desk reviews.</div>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Export", message: "Wire: PDF + attachments zip.", tone: "default" })}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <FileText className="h-4 w-4" />
                  Export evidence pack
                </button>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Desk Routing" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Routing rules</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Desk assignment based on category, keywords and risk.</div>
                </div>
                <Badge tone="slate">Rules</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">HealthMart Desk</div>
                    <span className="ml-auto"><Badge tone="orange">Regulated</Badge></span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                    <li>Battery, pharmacy, medical equipment</li>
                    <li>Requires MSDS where applicable</li>
                    <li>Auto-hold if missing safety docs</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">EduMart Desk</div>
                    <span className="ml-auto"><Badge tone="slate">Policy</Badge></span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                    <li>Training, certifications, education content</li>
                    <li>Category mapping and labeling checks</li>
                    <li>Escalate if claims are misleading</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">FaithMart Desk</div>
                    <span className="ml-auto"><Badge tone="slate">Community</Badge></span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                    <li>Sensitive categories and community guidelines</li>
                    <li>Content review and restricted keywords</li>
                    <li>Escalation workflow</li>
                  </ul>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-700" />
                    <div className="text-sm font-black text-orange-900">Premium routing</div>
                    <span className="ml-auto"><Badge tone="orange">AI</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-orange-900/70">Auto-detect regulated keywords and suggest the best desk.</div>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Premium", message: "Wire AI routing to suggest desk + reasons.", tone: "default" })}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
                  >
                    Configure
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Bulk routing</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Route selected cases to a desk.</div>
                </div>
                <Badge tone="slate">Bulk</Badge>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  { desk: "General", label: "Route to General", icon: ShieldCheck },
                  { desk: "HealthMart", label: "Route to HealthMart", icon: ShieldCheck },
                  { desk: "EduMart", label: "Route to EduMart", icon: Building2 },
                  { desk: "FaithMart", label: "Route to FaithMart", icon: Users2 },
                ].map((x) => (
                  <button
                    key={x.desk}
                    type="button"
                    onClick={() => bulkRoute(x.desk)}
                    className={cx(
                      "flex items-center justify-between rounded-3xl border px-4 py-3 text-left text-sm font-extrabold transition",
                      selectedIds.length ? "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800" : "border-slate-100 bg-white dark:bg-slate-900/60 text-slate-400 cursor-not-allowed"
                    )}
                    disabled={!selectedIds.length}
                  >
                    <span className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                        <x.icon className="h-4 w-4 text-slate-700" />
                      </span>
                      {x.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
                {!selectedIds.length ? (
                  <div className="mt-2 text-xs font-semibold text-slate-500">Tip: select cases in the Cases tab, then route here.</div>
                ) : null}
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Rules" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-7">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Policy controls</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Configure how publishing behaves when issues are found.</div>
                </div>
                <Badge tone="slate">Controls</Badge>
              </div>

              <div className="mt-4 grid gap-3">
                {["Auto-hold listings with High severity", "Block promotions if Awaiting Docs", "Require license for Installation category"].map((r, i) => (
                  <div key={i} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">{r}</div>
                      <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Wire these toggles to policy engine and audit logs.</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Suggested checklist</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Common compliance wins for higher approvals.</div>
                </div>
                <Badge tone="orange">Tips</Badge>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  "Upload KYB documents and keep them current",
                  "Add MSDS for batteries and chemicals",
                  "Set warranty terms and after-sales policy",
                  "Verify shipping profiles and return address",
                ].map((x) => (
                  <div key={x} className="flex items-start gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                      <CheckCheck className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">{x}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Audit" ? (
          <div className="grid gap-4 lg:grid-cols-12">
            <GlassCard className="p-5 lg:col-span-12">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Audit (demo)</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">In production, every action writes to audit log with actor, time and route.</div>
                </div>
                <button
                  type="button"
                  onClick={() => pushToast({ title: "Audit", message: "Wire audit to your logging pipeline.", tone: "default" })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Info className="h-4 w-4" />
                  About audit
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Time</div>
                  <div className="col-span-2">Actor</div>
                  <div className="col-span-3">Action</div>
                  <div className="col-span-4">Detail</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {[
                    { at: fmtTime(new Date(Date.now() - 22 * 60_000).toISOString()), actor: "Ops", action: "Requested documents", detail: "CMP-90021" },
                    { at: fmtTime(new Date(Date.now() - 65 * 60_000).toISOString()), actor: "System", action: "Flagged missing MSDS", detail: "L-1002" },
                    { at: fmtTime(new Date(Date.now() - 3.2 * 3600_000).toISOString()), actor: "Ops", action: "Routed to HealthMart", detail: "CMP-90021" },
                  ].map((e, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-3 text-slate-500">{e.at}</div>
                      <div className="col-span-2 font-extrabold text-slate-800">{e.actor}</div>
                      <div className="col-span-3">{e.action}</div>
                      <div className="col-span-4 text-slate-500 truncate">{e.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </div>

      {/* Case drawer */}
      <Drawer
        open={caseDrawerOpen}
        title={activeCase ? `Case · ${activeCase.id}` : "Case"}
        subtitle={activeCase ? `${activeCase.subjectType} · ${activeCase.subjectTitle}` : ""}
        onClose={() => setCaseDrawerOpen(false)}
      >
        {!activeCase ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a case first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cx(
                    "grid h-12 w-12 place-items-center rounded-3xl",
                    activeCase.severity === "High" ? "bg-rose-50 text-rose-700" : activeCase.severity === "Medium" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {activeCase.severity === "High" ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeCase.subjectTitle}</div>
                    <Badge tone="slate">{activeCase.marketplace}</Badge>
                    <Badge tone={severityTone(activeCase.severity)}>{activeCase.severity}</Badge>
                    <Badge tone={statusTone(activeCase.status)}>{activeCase.status}</Badge>
                    {caseSla ? (
                      <span className="ml-auto">
                        <Badge tone={caseSla.tone}>{caseSla.label}</Badge>
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {activeCase.subjectType} · {activeCase.subjectId} · Desk {activeCase.desk} · Created {fmtTime(activeCase.createdAt)}
                  </div>
                  <div className="mt-3 text-xs font-semibold text-slate-600">{activeCase.notes}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(activeCase.id);
                        pushToast({ title: "Copied", message: "Case ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCases((prev) =>
                          prev.map((c) =>
                            c.id === activeCase.id
                              ? {
                                  ...c,
                                  status: c.status === "Resolved" ? "Resolved" : "Awaiting Docs",
                                  timeline: [{ at: new Date().toISOString(), who: "Ops", event: "Requested documents" }, ...(c.timeline || [])],
                                }
                              : c
                          )
                        );
                        pushToast({ title: "Requested", message: "Documents requested.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <Upload className="h-4 w-4" />
                      Request docs
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCases((prev) =>
                          prev.map((c) =>
                            c.id === activeCase.id
                              ? {
                                  ...c,
                                  status: "Resolved",
                                  timeline: [{ at: new Date().toISOString(), who: "Ops", event: "Marked resolved" }, ...(c.timeline || [])],
                                }
                              : c
                          )
                        );
                        pushToast({ title: "Resolved", message: "Case marked resolved.", tone: "success" });
                      }}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Issues</div>
                  <span className="ml-auto"><Badge tone="slate">{(activeCase.issues || []).length}</Badge></span>
                </div>
                <div className="mt-3 space-y-2">
                  {(activeCase.issues || []).map((iss) => (
                    <div key={iss} className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-slate-500" />
                      <div className="text-xs font-semibold text-slate-700">{iss}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Required</div>
                  <span className="ml-auto"><Badge tone="slate">{(activeCase.requiredDocs || []).length}</Badge></span>
                </div>
                <div className="mt-3 space-y-2">
                  {(activeCase.requiredDocs || []).map((d) => (
                    <div key={d} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-xs font-extrabold text-slate-800">{d}</div>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Upload", message: `Wire upload for: ${d}`, tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Desk and routing</div>
                <span className="ml-auto"><Badge tone="slate">{activeCase.desk}</Badge></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["General", "HealthMart", "EduMart", "FaithMart"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setCases((prev) =>
                        prev.map((c) =>
                          c.id === activeCase.id
                            ? {
                                ...c,
                                desk: d,
                                timeline: [{ at: new Date().toISOString(), who: "Ops", event: `Routed to ${d} desk` }, ...(c.timeline || [])],
                              }
                            : c
                        )
                      );
                      pushToast({ title: "Routed", message: `Case routed to ${d}.`, tone: "success" });
                    }}
                    className={cx(
                      "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                      activeCase.desk === d ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">Desk routing is logged to audit in production.</div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-900">Suggested next steps</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                    <li>Upload required evidence and link it to this case</li>
                    <li>Update listing content to match category rules</li>
                    <li>Resolve within SLA to prevent publishing holds</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Timeline</div>
                <span className="ml-auto"><Badge tone="slate">{(activeCase.timeline || []).length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(activeCase.timeline || []).map((e, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{e.who}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{e.event}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Document drawer */}
      <Drawer
        open={docDrawerOpen}
        title={activeDoc ? `Document · ${activeDoc.id}` : "Document"}
        subtitle={activeDoc ? `${activeDoc.name} · ${activeDoc.type}` : ""}
        onClose={() => setDocDrawerOpen(false)}
      >
        {!activeDoc ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a document first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeDoc.name}</div>
                    <Badge tone="slate">{activeDoc.type}</Badge>
                    <Badge tone={activeDoc.status === "Uploaded" ? "green" : activeDoc.status === "Missing" ? "danger" : "orange"}>{activeDoc.status}</Badge>
                    <span className="ml-auto text-[11px] font-semibold text-slate-500">{activeDoc.updatedAt ? fmtTime(activeDoc.updatedAt) : "Not uploaded"}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(activeDoc.id);
                        pushToast({ title: "Copied", message: "Document ID copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </button>

                    <button
                      type="button"
                      onClick={() => uploadDoc(activeDoc.id)}
                      className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Upload className="h-4 w-4" />
                      Upload new version
                    </button>

                    <button
                      type="button"
                      onClick={() => pushToast({ title: "Export", message: "Wire download original file.", tone: "default" })}
                      className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Globe className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Version history</div>
                <span className="ml-auto"><Badge tone="slate">{(activeDoc.versions || []).length}</Badge></span>
              </div>

              <div className="mt-3 space-y-2">
                {(activeDoc.versions || []).length === 0 ? (
                  <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-xs font-semibold text-slate-500">No versions yet.</div>
                ) : (
                  (activeDoc.versions || []).map((v, idx) => (
                    <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="slate">v{(activeDoc.versions.length - idx).toString()}</Badge>
                        <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(v.at)}</span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-700">{v.note}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Tip</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">
                    Keep documents updated to reduce review delays and prevent holds.
                  </div>
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
