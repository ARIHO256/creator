import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Globe,
  Info,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

/**
 * HealthMart Desk - Equipment
 * Route: /regulatory/healthmart/equipment
 * Core:
 * - Equipment certifications
 * - Import rules
 * Super premium:
 * - Compliance scoring per submission
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type SubmissionStatus = "Draft" | "Submitted" | "Under Review" | "Needs Info" | "Approved" | "Rejected";

type DocKey =
  | "commercialInvoice"
  | "certificateOfConformity"
  | "productRegistration"
  | "warranty"
  | "userManual"
  | "calibrationCertificate"
  | "msds";

type SubmissionDocState = Record<DocKey, boolean>;

type EquipmentSubmission = {
  id: string;
  name: string;
  category: "Diagnostics" | "Imaging" | "Surgical" | "Lab" | "PPE" | "Hospital Furniture" | "Other";
  deviceClass: "I" | "II" | "III";
  origin: string;
  destination: string;
  hsCode: string;
  manufacturer: string;
  model: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  certifications: string[];
  docs: SubmissionDocState;
  notes: string;
  flags: string[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "ID") {
  return `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeCopy(text: unknown) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "orange" | "danger" | "slate" }) {
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

function Chip({ active, onClick, children, tone = "green" }: { active?: boolean; onClick?: () => void; children: React.ReactNode; tone?: "green" | "orange" }) {
  const activeCls = tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
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

function IconButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
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

function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

type Toast = { id: string; title: string; message?: string; tone?: "default" | "success" | "warning" | "danger" };

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

function scoreTone(score: number) {
  if (score >= 85) return "green";
  if (score >= 65) return "orange";
  return "danger";
}

function computeComplianceScore(s: EquipmentSubmission) {
  // Super premium: explainable scoring per submission (demo model)
  const docWeights: Record<DocKey, number> = {
    commercialInvoice: 8,
    certificateOfConformity: 18,
    productRegistration: 18,
    warranty: 6,
    userManual: 6,
    calibrationCertificate: 10,
    msds: 6,
  };

  let score = 40;

  // docs completeness
  (Object.keys(docWeights) as DocKey[]).forEach((k) => {
    if (s.docs[k]) score += docWeights[k];
  });

  // certifications
  const certBoost = Math.min(18, (s.certifications?.length || 0) * 6);
  score += certBoost;

  // risk flags
  const flagPenalty = Math.min(22, (s.flags?.length || 0) * 7);
  score -= flagPenalty;

  // device class risk
  if (s.deviceClass === "II") score -= 2;
  if (s.deviceClass === "III") score -= 6;

  score = clamp(Math.round(score), 5, 99);

  const breakdown = {
    base: 40,
    docs: (Object.keys(docWeights) as DocKey[]).reduce((acc, k) => acc + (s.docs[k] ? docWeights[k] : 0), 0),
    certifications: certBoost,
    flags: -flagPenalty,
    classAdj: s.deviceClass === "III" ? -6 : s.deviceClass === "II" ? -2 : 0,
  };

  const missingDocs = (Object.keys(docWeights) as DocKey[]).filter((k) => !s.docs[k]);
  const suggestions = [
    ...(missingDocs.includes("certificateOfConformity") ? ["Upload a Certificate of Conformity for this equipment."] : []),
    ...(missingDocs.includes("productRegistration") ? ["Attach product registration or authorization for destination market."] : []),
    ...(s.deviceClass === "III" && !s.docs.calibrationCertificate ? ["For Class III equipment, add calibration certificate and test report evidence."] : []),
    ...(s.flags.length ? ["Resolve flagged issues and re-submit for faster approval."] : []),
  ].slice(0, 4);

  return { score, tone: scoreTone(score) as "green" | "orange" | "danger", breakdown, missingDocs, suggestions };
}

function buildSubmissions(): EquipmentSubmission[] {
  const now = Date.now();
  const agoM = (m: number) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "EQT-20091",
      name: "Patient Monitor (Vital Signs)",
      category: "Diagnostics",
      deviceClass: "II",
      origin: "China",
      destination: "Uganda",
      hsCode: "9018.19",
      manufacturer: "MedTech Shenzhen",
      model: "VMX-400",
      status: "Under Review",
      createdAt: agoM(480),
      updatedAt: agoM(45),
      certifications: ["ISO 13485", "CE"],
      docs: {
        commercialInvoice: true,
        certificateOfConformity: true,
        productRegistration: false,
        warranty: true,
        userManual: true,
        calibrationCertificate: false,
        msds: false,
      },
      notes: "Intended use: hospital ward monitoring.",
      flags: ["Missing destination registration evidence"],
    },
    {
      id: "EQT-20090",
      name: "Digital X-Ray System",
      category: "Imaging",
      deviceClass: "III",
      origin: "Germany",
      destination: "Kenya",
      hsCode: "9022.14",
      manufacturer: "ImagingWorks GmbH",
      model: "DXR-Pro",
      status: "Needs Info",
      createdAt: agoM(920),
      updatedAt: agoM(80),
      certifications: ["CE", "IEC 60601"],
      docs: {
        commercialInvoice: true,
        certificateOfConformity: true,
        productRegistration: true,
        warranty: true,
        userManual: false,
        calibrationCertificate: false,
        msds: false,
      },
      notes: "Includes installation and shielding requirements.",
      flags: ["Missing user manual", "Calibration certificate required"],
    },
    {
      id: "EQT-20089",
      name: "Autoclave Sterilizer 18L",
      category: "Surgical",
      deviceClass: "I",
      origin: "China",
      destination: "Uganda",
      hsCode: "8419.20",
      manufacturer: "SterilPro",
      model: "SP-18",
      status: "Submitted",
      createdAt: agoM(210),
      updatedAt: agoM(210),
      certifications: ["CE"],
      docs: {
        commercialInvoice: false,
        certificateOfConformity: true,
        productRegistration: false,
        warranty: true,
        userManual: true,
        calibrationCertificate: true,
        msds: false,
      },
      notes: "Clinic use. Provide import permit if required.",
      flags: [],
    },
    {
      id: "EQT-20088",
      name: "N95 Respirators (Box of 20)",
      category: "PPE",
      deviceClass: "I",
      origin: "China",
      destination: "Tanzania",
      hsCode: "6307.90",
      manufacturer: "SafeWear",
      model: "N95-A",
      status: "Approved",
      createdAt: agoM(3200),
      updatedAt: agoM(2800),
      certifications: ["CE", "EN 149"],
      docs: {
        commercialInvoice: true,
        certificateOfConformity: true,
        productRegistration: true,
        warranty: false,
        userManual: false,
        calibrationCertificate: false,
        msds: false,
      },
      notes: "PPE batch with test reports.",
      flags: [],
    },
  ];
}

function kpiFrom(subs: EquipmentSubmission[]) {
  const total = subs.length;
  const pending = subs.filter((s) => ["Submitted", "Under Review", "Needs Info"].includes(s.status)).length;
  const approved = subs.filter((s) => s.status === "Approved").length;
  const flagged = subs.filter((s) => s.flags.length > 0).length;
  const avg = total ? Math.round(subs.reduce((acc, s) => acc + computeComplianceScore(s).score, 0) / total) : 0;
  return { total, pending, approved, flagged, avg };
}

function KpiCard({ label, value, icon: Icon, tone = "slate" }: { label: string; value: string | number; icon: React.ElementType; tone?: "slate" | "green" | "orange" }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
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

function docLabel(k: DocKey) {
  const map: Record<DocKey, string> = {
    commercialInvoice: "Commercial invoice",
    certificateOfConformity: "Certificate of conformity",
    productRegistration: "Product registration",
    warranty: "Warranty",
    userManual: "User manual",
    calibrationCertificate: "Calibration certificate",
    msds: "MSDS (when applicable)",
  };
  return map[k];
}

function importRulesTemplate(destination: string) {
  const dest = destination || "Destination";
  return {
    title: `${dest} import rules (starter guide)` ,
    bullets: [
      "Declare HS code accurately and match invoice values.",
      "Provide conformity evidence for regulated equipment.",
      "Some equipment may require registration or authorization by the relevant health authority.",
      "Ensure user manuals and labeling are available in the required languages.",
      "Retain service and calibration evidence for high-risk classes.",
    ],
    disclaimers: [
      "This is a product UI preview only.",
      "Final requirements depend on local authorities and product classification.",
    ],
  };
}

export default function HealthMartEquipmentPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4500);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState<"Submissions" | "Certifications" | "Import rules">("Submissions");

  const [submissions, setSubmissions] = useState<EquipmentSubmission[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getRegulatoryDesk("healthmart-equipment").then((payload) => {
      if (!active) return;
      const pageData = ((payload as { pageData?: Record<string, unknown> }).pageData ?? {}) as Record<string, unknown>;
      setSubmissions(Array.isArray(pageData.submissions) ? pageData.submissions as EquipmentSubmission[] : []);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!submissions.find((s) => s.id === activeId)) setActiveId(submissions[0]?.id || "");
  }, [submissions, activeId]);

  const active = useMemo(() => submissions.find((s) => s.id === activeId) || null, [submissions, activeId]);

  const kpis = useMemo(() => kpiFrom(submissions), [submissions]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | SubmissionStatus>("All");
  const [origin, setOrigin] = useState("All");
  const [category, setCategory] = useState<"All" | EquipmentSubmission["category"]>("All");
  const [sort, setSort] = useState<"Newest" | "Score" | "Flagged">("Newest");

  const origins = useMemo(() => ["All", ...Array.from(new Set(submissions.map((s) => s.origin)))], [submissions]);

  const categories = useMemo(() => {
    const set = new Set(submissions.map((s) => s.category));
    return ["All", ...Array.from(set)] as Array<"All" | EquipmentSubmission["category"]>;
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...submissions];

    if (status !== "All") list = list.filter((s) => s.status === status);
    if (origin !== "All") list = list.filter((s) => s.origin === origin);
    if (category !== "All") list = list.filter((s) => s.category === category);

    if (q) {
      list = list.filter((s) => {
        const hay = [s.id, s.name, s.category, s.origin, s.destination, s.manufacturer, s.model, s.hsCode, s.status].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "Newest") list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sort === "Score") list.sort((a, b) => computeComplianceScore(b).score - computeComplianceScore(a).score);
    if (sort === "Flagged") list.sort((a, b) => (b.flags.length || 0) - (a.flags.length || 0));

    return list;
  }, [submissions, query, status, origin, category, sort]);

  const [createOpen, setCreateOpen] = useState(false);

  const destinations = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana"];
  const [rulesDest, setRulesDest] = useState("Uganda");

  const rules = useMemo(() => importRulesTemplate(rulesDest), [rulesDest]);

  const createFormRef = useRef<HTMLFormElement | null>(null);

  const addSubmission = (payload: Partial<EquipmentSubmission>) => {
    const now = new Date().toISOString();
    const next: EquipmentSubmission = {
      id: makeId("EQT"),
      name: String(payload.name || "New equipment"),
      category: payload.category ?? "Other",
      deviceClass: payload.deviceClass ?? "I",
      origin: String(payload.origin || "China"),
      destination: String(payload.destination || "Uganda"),
      hsCode: String(payload.hsCode || "-") ,
      manufacturer: String(payload.manufacturer || "-") ,
      model: String(payload.model || "-") ,
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      certifications: payload.certifications || [],
      docs: {
        commercialInvoice: false,
        certificateOfConformity: false,
        productRegistration: false,
        warranty: false,
        userManual: false,
        calibrationCertificate: false,
        msds: false,
      },
      notes: String(payload.notes || "") ,
      flags: [],
    };
    setSubmissions((s) => [next, ...s]);
    setActiveId(next.id);
    pushToast({ title: "Draft created", message: `${next.id} created as Draft.`, tone: "success" });
  };

  const toggleDoc = (k: DocKey, value?: boolean) => {
    if (!active) return;
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              updatedAt: new Date().toISOString(),
              docs: { ...s.docs, [k]: typeof value === "boolean" ? value : !s.docs[k] },
              flags: (function () {
                const nextFlags = new Set(s.flags);
                // Auto-clear a few demo flags
                if (k === "productRegistration") nextFlags.delete("Missing destination registration evidence");
                if (k === "userManual") nextFlags.delete("Missing user manual");
                if (k === "calibrationCertificate") nextFlags.delete("Calibration certificate required");
                return Array.from(nextFlags);
              })(),
            }
          : s
      )
    );
  };

  const setStatusForActive = (next: SubmissionStatus) => {
    if (!active) return;
    setSubmissions((prev) => prev.map((s) => (s.id === active.id ? { ...s, status: next, updatedAt: new Date().toISOString() } : s)));
    pushToast({
      title: "Status updated",
      message: `${active.id} set to ${next}.`,
      tone: next === "Approved" ? "success" : next === "Rejected" ? "danger" : "default",
    });
  };

  const score = active ? computeComplianceScore(active) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">HealthMart Desk</div>
                <Badge tone="slate">/regulatory/healthmart/equipment</Badge>
                <Badge tone="slate">Equipment</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Equipment certifications, import rules, and compliance scoring per submission.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy("/regulatory/healthmart/equipment");
                  pushToast({ title: "Copied", message: "Route copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy route
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF/CSV.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Sparkles className="h-4 w-4" />
                New submission
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={ClipboardList} label="Total submissions" value={kpis.total} />
          <KpiCard icon={AlertTriangle} label="Pending" value={kpis.pending} tone="orange" />
          <KpiCard icon={ShieldCheck} label="Approved" value={kpis.approved} tone="green" />
          <KpiCard icon={Info} label="Avg score" value={`${kpis.avg}`} />
        </div>

        {/* Tabs */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["Submissions", "Certifications", "Import rules"] as const).map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)} tone={t === "Import rules" ? "orange" : "green"}>
              {t}
            </Chip>
          ))}
          <span className="ml-auto"><Badge tone="slate">Core + Premium</Badge></span>
        </div>

        {tab === "Submissions" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* List */}
            <GlassCard className="lg:col-span-8 overflow-hidden">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Submission inbox</div>
                    <Badge tone="slate">{filtered.length} shown</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search ID, equipment, HS code, manufacturer"
                        className="h-10 w-[min(520px,92vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Status</div>
                      <div className="relative ml-auto">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as SubmissionStatus | "All")}
                          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {(["All", "Draft", "Submitted", "Under Review", "Needs Info", "Approved", "Rejected"] as const).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <Globe className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Origin</div>
                      <div className="relative ml-auto">
                        <select
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {origins.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <Package className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Category</div>
                      <div className="relative ml-auto">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value as EquipmentSubmission["category"] | "All")}
                          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <BarChart3 className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Sort</div>
                      <div className="relative ml-auto">
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value as "Newest" | "Score" | "Flagged")}
                          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                        >
                          {(["Newest", "Score", "Flagged"] as const).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setStatus("All");
                        setOrigin("All");
                        setCategory("All");
                        setSort("Newest");
                        pushToast({ title: "Filters cleared", tone: "default" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Clear filters
                    </button>
                    <span className="ml-auto text-[11px] font-semibold text-slate-500">Tip: click a row to view scoring and rules</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-200/70">
                {filtered.map((s) => {
                  const isActive = s.id === activeId;
                  const sc = computeComplianceScore(s);

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveId(s.id)}
                      className={cx("w-full px-4 py-4 text-left transition", isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-black text-slate-900">{s.name}</div>
                            <Badge tone="slate">{s.id}</Badge>
                            <Badge tone={s.status === "Approved" ? "green" : s.status === "Needs Info" ? "orange" : s.status === "Rejected" ? "danger" : "slate"}>{s.status}</Badge>
                            <Badge tone="slate">Class {s.deviceClass}</Badge>
                            <Badge tone={sc.tone}>{sc.score}</Badge>
                            {s.flags.length ? <Badge tone="danger">Flagged</Badge> : <Badge tone="green">Clean</Badge>}
                            <span className="ml-auto text-[11px] font-semibold text-slate-500">Updated {fmtTime(s.updatedAt)}</span>
                          </div>

                          <div className="mt-2 text-sm font-semibold text-slate-700" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {s.manufacturer} · Model {s.model} · HS {s.hsCode}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge tone="slate">{s.category}</Badge>
                            <Badge tone="slate">{s.origin} → {s.destination}</Badge>
                            {(s.certifications || []).slice(0, 3).map((c) => (
                              <Badge key={c} tone="slate">{c}</Badge>
                            ))}

                            <div className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  safeCopy(s.id);
                                  pushToast({ title: "Copied", message: "Submission ID copied.", tone: "success" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <Copy className="h-4 w-4" />
                                Copy ID
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  pushToast({ title: "Desk action", message: "Wire escalation and reviewer assignment.", tone: "default" });
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.orange }}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                Escalate
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 h-2 rounded-full bg-slate-100">
                            <div
                              className={cx("h-2 rounded-full", sc.tone === "green" ? "bg-emerald-500" : sc.tone === "orange" ? "bg-orange-500" : "bg-rose-500")}
                              style={{ width: `${clamp(sc.score, 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
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
                          <div className="text-lg font-black text-slate-900">No results</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or adjusting your search.</div>
                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setStatus("All");
                              setOrigin("All");
                              setCategory("All");
                              setSort("Newest");
                              pushToast({ title: "Filters cleared", tone: "default" });
                            }}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                            style={{ background: TOKENS.green }}
                          >
                            <Check className="h-4 w-4" />
                            Clear filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </GlassCard>

            {/* Right panel */}
            <div className="lg:col-span-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Submission details</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Super premium: compliance score with explainable breakdown.</div>
                  </div>
                  <Badge tone="slate">Desk</Badge>
                </div>

                {!active || !score ? (
                  <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">Select a submission.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-slate-900">{active.name}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{active.id} · {active.category} · Class {active.deviceClass}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge tone={active.status === "Approved" ? "green" : active.status === "Needs Info" ? "orange" : active.status === "Rejected" ? "danger" : "slate"}>{active.status}</Badge>
                            <Badge tone="slate">{active.origin} → {active.destination}</Badge>
                            <Badge tone="slate">HS {active.hsCode}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cx("rounded-3xl border p-4", score.tone === "green" ? "border-emerald-200 bg-emerald-50/60" : score.tone === "orange" ? "border-orange-200 bg-orange-50/60" : "border-rose-200 bg-rose-50/60")}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-black text-slate-900">Compliance score</div>
                          <div className="mt-1 text-xs font-semibold text-slate-600">Per submission scoring (demo).</div>
                        </div>
                        <Badge tone={score.tone}>{score.score}</Badge>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white dark:bg-slate-900/60">
                        <div
                          className={cx("h-2 rounded-full", score.tone === "green" ? "bg-emerald-500" : score.tone === "orange" ? "bg-orange-500" : "bg-rose-500")}
                          style={{ width: `${score.score}%` }}
                        />
                      </div>

                      <div className="mt-3 grid gap-2">
                        {[
                          { k: "Base", v: score.breakdown.base },
                          { k: "Docs", v: score.breakdown.docs },
                          { k: "Certifications", v: score.breakdown.certifications },
                          { k: "Flags", v: score.breakdown.flags },
                          { k: "Class adjustment", v: score.breakdown.classAdj },
                        ].map((r) => (
                          <div key={r.k} className="flex items-center justify-between rounded-2xl border border-white/40 bg-white dark:bg-slate-900/60 px-3 py-2">
                            <div className="text-xs font-extrabold text-slate-700">{r.k}</div>
                            <div className="text-xs font-black text-slate-900">{r.v >= 0 ? `+${r.v}` : `${r.v}`}</div>
                          </div>
                        ))}
                      </div>

                      {score.suggestions.length ? (
                        <div className="mt-3 rounded-2xl border border-white/40 bg-white dark:bg-slate-900/60 p-3">
                          <div className="text-xs font-extrabold text-slate-700">Suggested improvements</div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-700">
                            {score.suggestions.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Documents checklist</div>
                        <span className="ml-auto"><Badge tone="slate">Upload</Badge></span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {(Object.keys(active.docs) as DocKey[]).map((k) => {
                          const done = active.docs[k];
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => toggleDoc(k)}
                              className={cx(
                                "flex w-full items-center justify-between rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-left text-xs font-extrabold transition",
                                done ? "border-emerald-200" : "border-slate-200/70"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <span className={cx("grid h-7 w-7 place-items-center rounded-xl", done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                                  {done ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </span>
                                {docLabel(k)}
                              </span>
                              <Badge tone={done ? "green" : "orange"}>{done ? "Added" : "Missing"}</Badge>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!active) return;
                            const missing = computeComplianceScore(active).missingDocs;
                            if (!missing.length) {
                              pushToast({ title: "All docs present", message: "No missing documents detected.", tone: "success" });
                              return;
                            }
                            pushToast({ title: "Missing docs", message: `${missing.length} document(s) missing.`, tone: "warning" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Info className="h-4 w-4" />
                          Check missing
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusForActive("Submitted")}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Submit
                        </button>
                      </div>
                    </div>

                    {active.flags.length ? (
                      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-rose-900">Flags</div>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-rose-900/80">
                              {active.flags.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                            <Check className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-900">No flags</div>
                            <div className="mt-1 text-xs font-semibold text-emerald-900/70">Looks clean. Continue with review workflow.</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Import rules snapshot</div>
                        <span className="ml-auto"><Badge tone="slate">{active.destination}</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Fast view. Full rules are in the Import rules tab.</div>
                      <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                        <div className="text-xs font-extrabold text-slate-700">Starter requirements</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                          {importRulesTemplate(active.destination).bullets.slice(0, 3).map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTab("Import rules");
                          setRulesDest(active.destination);
                        }}
                        className="mt-3 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        Open Import rules
                      </button>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setStatusForActive("Approved")}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <ShieldCheck className="h-5 w-5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusForActive("Rejected")}
                        className="inline-flex items-center justify-center gap-2 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700"
                      >
                        <X className="h-5 w-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        ) : null}

        {tab === "Certifications" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <GlassCard className="lg:col-span-8 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Equipment certifications library</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Core: show what evidence is typically required for each equipment type. Customize per destination market.</div>
                </div>
                <Badge tone="slate">Core</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  {
                    t: "Diagnostics",
                    items: ["ISO 13485", "CE marking", "IEC 60601 (electrical safety)", "Test reports", "Labeling and IFU"],
                  },
                  {
                    t: "Imaging",
                    items: ["CE marking", "IEC 60601", "Radiation safety evidence", "Calibration certificate", "Installation requirements"],
                  },
                  {
                    t: "Lab",
                    items: ["GMP evidence (where applicable)", "Quality management", "Performance validation", "MSDS (chemicals)", "User manual"],
                  },
                  {
                    t: "PPE",
                    items: ["Relevant standards (example: EN 149)", "Batch test results", "Certificate of conformity", "Labeling", "Traceability"],
                  },
                ].map((c) => (
                  <div key={c.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">{c.t}</div>
                      <span className="ml-auto"><Badge tone="slate">Guide</Badge></span>
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-700">
                      {c.items.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Template", message: `Wire checklist template for ${c.t}.`, tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Open checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Desk routing", message: "Wire specialist reviewer assignment.", tone: "default" })}
                        className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <ChevronRight className="h-4 w-4" />
                        Assign reviewer
                      </button>
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
                    <div className="text-sm font-black text-orange-900">Super premium idea</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Auto-detect required certifications based on HS code, device class, and destination.</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Certification evidence uploader</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Demo UI: attach evidence to a submission.</div>
                </div>
                <Badge tone="orange">Premium</Badge>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-xs font-extrabold text-slate-600">Select submission</div>
                <div className="mt-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800">
                  {active ? `${active.id} · ${active.name}` : "Select from Submissions"}
                </div>

                <div className="mt-3 grid gap-2">
                  {["ISO 13485 certificate", "CE certificate", "Test report", "Calibration report", "Labeling pack"].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => pushToast({ title: "Uploaded", message: `${x} attached (demo).`, tone: "success" })}
                      className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-left text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                          <Upload className="h-5 w-5" />
                        </span>
                        {x}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}

        {tab === "Import rules" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <GlassCard className="lg:col-span-8 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Import rules</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Core: destination rules overview. Premium: rule packs per category and auto warnings.</div>
                </div>
                <Badge tone="slate">Core</Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Destination market</div>
                    <span className="ml-auto"><Badge tone="slate">Select</Badge></span>
                  </div>
                  <div className="mt-3 relative">
                    <select
                      value={rulesDest}
                      onChange={(e) => setRulesDest(e.target.value)}
                      className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-10 text-sm font-semibold text-slate-800"
                    >
                      {destinations.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="text-sm font-black text-slate-900">{rules.title}</div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-700">
                      {rules.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 text-orange-700" />
                        <div className="text-xs font-semibold text-orange-900/80">
                          {rules.disclaimers.join(" ")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Rule checks for active submission</div>
                    <span className="ml-auto"><Badge tone="orange">Premium</Badge></span>
                  </div>

                  {!active ? (
                    <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">Select a submission in Submissions tab.</div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          { t: "HS code", v: active.hsCode ? "Provided" : "Missing", tone: active.hsCode && active.hsCode !== "-" ? "green" : "danger" },
                          { t: "Conformity", v: active.docs.certificateOfConformity ? "Attached" : "Missing", tone: active.docs.certificateOfConformity ? "green" : "danger" },
                          { t: "Registration", v: active.docs.productRegistration ? "Attached" : "Missing", tone: active.docs.productRegistration ? "green" : "orange" },
                          { t: "Labeling and manual", v: active.docs.userManual ? "Attached" : "Missing", tone: active.docs.userManual ? "green" : "orange" },
                        ] as Array<{ t: string; v: string; tone: "green" | "orange" | "danger" }>
                      ).map((x) => (
                        <div key={x.t} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                          <div className="text-xs font-extrabold text-slate-700">{x.t}</div>
                          <Badge tone={x.tone}>{x.v}</Badge>
                        </div>
                      ))}

                      <div className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-900">Suggested next step</div>
                            <div className="mt-1 text-xs font-semibold text-emerald-900/70">
                              Generate an import checklist for {active.destination} and attach missing evidence.
                            </div>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Checklist generated", message: "Wire checklist export and reviewer workflow.", tone: "success" })}
                              className="mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <ClipboardList className="h-4 w-4" />
                              Generate checklist
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Policy notes</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Where to store policy updates and reviewer notes.</div>
                </div>
                <Badge tone="slate">Ops</Badge>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-xs font-extrabold text-slate-600">Notes</div>
                <textarea
                  defaultValue={"Use this panel for internal policy notes, restricted items, and escalations."}
                  rows={9}
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Saved", message: "Policy notes saved (demo).", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Escalated", message: "Sent to policy desk (demo).", tone: "warning" })}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Escalate
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        ) : null}
      </div>

      {/* Create drawer */}
      <Drawer
        open={createOpen}
        title="New equipment submission"
        subtitle="Create a draft and attach certifications and documents."
        onClose={() => setCreateOpen(false)}
      >
        <form
          ref={createFormRef}
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = String(fd.get("name") || "");
            const category = String(fd.get("category") || "Other") as EquipmentSubmission["category"];
            const deviceClass = String(fd.get("deviceClass") || "I") as EquipmentSubmission["deviceClass"];
            const origin = String(fd.get("origin") || "China");
            const destination = String(fd.get("destination") || "Uganda");
            const hsCode = String(fd.get("hsCode") || "-");
            const manufacturer = String(fd.get("manufacturer") || "-");
            const model = String(fd.get("model") || "-");
            const notes = String(fd.get("notes") || "");
            const certs = String(fd.get("certifications") || "")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean);

            addSubmission({ name, category, deviceClass, origin, destination, hsCode, manufacturer, model, notes, certifications: certs });
            setCreateOpen(false);
            (e.currentTarget as HTMLFormElement).reset();
          }}
        >
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Core fields</div>
              <span className="ml-auto"><Badge tone="slate">Draft</Badge></span>
            </div>

            <div className="mt-3 grid gap-3">
              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Equipment name</div>
                <input
                  name="name"
                  required
                  placeholder="Example: Patient Monitor (Vital Signs)"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Category</div>
                  <select
                    name="category"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {["Diagnostics", "Imaging", "Surgical", "Lab", "PPE", "Hospital Furniture", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Device class</div>
                  <select
                    name="deviceClass"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {["I", "II", "III"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">HS code</div>
                  <input
                    name="hsCode"
                    placeholder="Example: 9018.19"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Origin country</div>
                  <input
                    name="origin"
                    defaultValue="China"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Destination country</div>
                  <select
                    name="destination"
                    defaultValue="Uganda"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800"
                  >
                    {destinations.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Manufacturer</div>
                  <input
                    name="manufacturer"
                    placeholder="Example: MedTech Shenzhen"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Model</div>
                  <input
                    name="model"
                    placeholder="Example: VMX-400"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Certifications (comma separated)</div>
                <input
                  name="certifications"
                  placeholder="Example: ISO 13485, CE"
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>

              <div>
                <div className="text-[11px] font-extrabold text-slate-600">Notes</div>
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Intended use, installation notes, attachments, reviewers"
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-orange-900">Super premium scoring</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">After saving, open the draft and attach documents to increase the compliance score.</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Create draft
            </button>
          </div>
        </form>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
