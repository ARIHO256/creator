import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Filter,
  Info,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  X,
} from "lucide-react";

/**
 * HealthMart Logistics (Previewable)
 * Route: /regulatory/healthmart/logistics
 * Core:
 * - Logistics compliance checklist
 * - Licenses
 * Super premium:
 * - Auto validation rules
 * - Audit evidence pack
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastAction = { label: string; type: string; id?: string };
type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };
type BadgeTone = "green" | "orange" | "danger" | "slate";
type ChecklistStatus = "pass" | "warn" | "fail" | "pending";

type EvidenceDoc = { id: string; name: string; type: string; uploadedAt: string };
type EvidenceEntry = EvidenceDoc & { source: string };
type License = {
  id: string;
  name: string;
  issuer: string;
  number: string;
  issuedAt: string | null;
  expiresAt: string | null;
  required: boolean;
  scope: string;
  verifiedAt: string | null;
  docs: EvidenceDoc[];
  tags: string[];
};
type ChecklistItem = {
  id: string;
  title: string;
  requirement: string;
  status: ChecklistStatus;
  required: boolean;
  owner: string;
  updatedAt: string;
  evidence: EvidenceDoc[];
};
type ChecklistSection = { id: string; title: string; items: ChecklistItem[] };
type Rule = { id: string; name: string; enabled: boolean; severity: "High" | "Medium" | "Low"; when: string; then: string; evidence: string };
type AuditEntry = { id: string; at: string; actor: string; action: string; detail: string };
type Finding = { id: string; severity: "High" | "Medium" | "Low"; title: string; message: string; action: ToastAction };
type PackSelect = { licenses: Record<string, boolean>; checks: Record<string, boolean> };
type EvidencePackManifest = {
  packId: string;
  createdAt: string;
  createdBy: string;
  route: string;
  notes: string;
  summary: {
    complianceScore: number;
    checklistScore: number;
    licenseScore: number;
    selectedLicenses: number;
    selectedChecklistItems: number;
    evidenceDocuments: number;
  };
  includeAutoSnapshot: boolean;
  autoSnapshot: { runAt: string | null; findings: Finding[] } | null;
  evidence: EvidenceEntry[];
};
type EvidencePack = {
  id: string;
  createdAt: string;
  createdBy: string;
  docs: number;
  checksum: string;
  manifest: EvidencePackManifest;
};
const TABS = ["Checklist", "Licenses", "Auto validation", "Evidence pack", "Audit log"] as const;
type TabKey = (typeof TABS)[number];
const CHECKLIST_STATUSES: ChecklistStatus[] = ["pass", "warn", "fail", "pending"];

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode; tone?: "light" | "dark" };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type DrawerProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
type ToastCenterProps = { toasts: Toast[]; dismiss: (id: string) => void };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

function hashLite(input?: string | number | null) {
  const s = String(input || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
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

function IconButton({ label, onClick, children, tone = "light" }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
        tone === "dark"
          ? "border-white/20 bg-white dark:bg-slate-900/10 text-white hover:bg-gray-50 dark:hover:bg-slate-800/15"
          : "border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children, tone = "green" }: ChipProps) {
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

function Drawer({ open, title, subtitle, onClose, children }: DrawerProps) {
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
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[760px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function checklistTone(status: ChecklistItem["status"]): BadgeTone {
  if (status === "pass") return "green";
  if (status === "warn") return "orange";
  if (status === "fail") return "danger";
  return "slate";
}

function licenseStatus(lic: License): { k: string; tone: BadgeTone } {
  const missing = !lic.number || !lic.expiresAt;
  if (missing) return { k: "Missing", tone: "danger" };
  const d = daysUntil(lic.expiresAt);
  if (d !== null && d < 0) return { k: "Expired", tone: "danger" };
  if (d !== null && d <= 30) return { k: "Expiring", tone: "orange" };
  return { k: "Valid", tone: "green" };
}

function collectEvidenceForItem(item: ChecklistItem): EvidenceEntry[] {
  return (item.evidence || []).map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    uploadedAt: e.uploadedAt,
    source: `Checklist: ${item.title}`,
  }));
}

function collectEvidenceForLicense(lic: License): EvidenceEntry[] {
  return (lic.docs || []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    uploadedAt: d.uploadedAt,
    source: `License: ${lic.name}`,
  }));
}

export default function HealthMartLogisticsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState<TabKey>("Checklist");

  const [licenses, setLicenses] = useState<License[]>([]);
  const [checklist, setChecklist] = useState<ChecklistSection[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getRegulatoryDesk("healthmart-logistics").then((payload) => {
      if (!active) return;
      const pageData = ((payload as { pageData?: Record<string, unknown> }).pageData ?? {}) as Record<string, unknown>;
      setLicenses(Array.isArray(pageData.licenses) ? pageData.licenses as License[] : []);
      setChecklist(Array.isArray(pageData.checklist) ? pageData.checklist as ChecklistSection[] : []);
      setRules(Array.isArray(pageData.rules) ? pageData.rules as Rule[] : []);
      setAudit(Array.isArray(pageData.audit) ? pageData.audit as AuditEntry[] : []);
    });

    return () => {
      active = false;
    };
  }, []);
  const logAudit = (actor: string, action: string, detail: string) => {
    setAudit((s) => [{ id: makeId("A"), at: new Date().toISOString(), actor, action, detail }, ...s].slice(0, 120));
  };

  const allChecklistItems = useMemo(() => checklist.flatMap((s) => s.items || []), [checklist]);

  const checklistStats = useMemo(() => {
    const required = allChecklistItems.filter((x) => x.required);
    const pass = required.filter((x) => x.status === "pass").length;
    const warn = required.filter((x) => x.status === "warn").length;
    const fail = required.filter((x) => x.status === "fail").length;
    const pending = required.filter((x) => x.status === "pending").length;
    const score = required.length ? Math.round(((pass + warn * 0.5) / required.length) * 100) : 0;
    return { required: required.length, pass, warn, fail, pending, score };
  }, [allChecklistItems]);

  const licenseStats = useMemo(() => {
    const required = licenses.filter((l) => l.required);
    const states = required.map((l) => licenseStatus(l).k);
    const valid = states.filter((s) => s === "Valid").length;
    const expiring = states.filter((s) => s === "Expiring").length;
    const expired = states.filter((s) => s === "Expired").length;
    const missing = states.filter((s) => s === "Missing").length;
    const score = required.length ? Math.round(((valid + expiring * 0.5) / required.length) * 100) : 0;
    return { required: required.length, valid, expiring, expired, missing, score };
  }, [licenses]);

  const complianceScore = useMemo(() => {
    const score = Math.round((checklistStats.score * 0.6 + licenseStats.score * 0.4) * 10) / 10;
    return clamp(score, 0, 100);
  }, [checklistStats.score, licenseStats.score]);

  const complianceTone = useMemo(() => {
    if (complianceScore >= 85) return "green";
    if (complianceScore >= 65) return "orange";
    return "danger";
  }, [complianceScore]);

  const [autoRunAt, setAutoRunAt] = useState<string | null>(null);

  const autoFindings = useMemo<Finding[]>(() => {
    const findings: Finding[] = [];

    const road = licenses.find((l) => l.name.toLowerCase().includes("roadworthiness"));
    const roadState = road ? licenseStatus(road).k : "Missing";
    if (roadState === "Expired" || roadState === "Missing") {
      findings.push({
        id: "F-ROAD",
        severity: "High",
        title: "Dispatch blocked",
        message: "Vehicle roadworthiness is expired or missing.",
        action: { label: "Open license", type: "license", id: road?.id },
      });
    }

    const cold = licenses.find((l) => l.name.toLowerCase().includes("cold chain"));
    if (cold) {
      const d = daysUntil(cold.expiresAt);
      if (d !== null && d <= 30 && d >= 0) {
        findings.push({
          id: "F-COLD",
          severity: "Medium",
          title: "Certificate expiring",
          message: `Cold chain certificate expires in ${d} day(s).`,
          action: { label: "Create renewal task", type: "toast" },
        });
      }
    }

    const cargo = licenses.find((l) => l.name.toLowerCase().includes("cargo insurance"));
    const crossBorder = true; // demo switch
    if (crossBorder) {
      const st = cargo ? licenseStatus(cargo).k : "Missing";
      if (st === "Missing" || st === "Expired") {
        findings.push({
          id: "F-INS",
          severity: "High",
          title: "Insurance required",
          message: "Cross-border deliveries require cargo insurance evidence.",
        action: { label: "Upload insurance", type: "license", id: cargo?.id },
        });
      }
    }

    const packaging = allChecklistItems.find((x) => x.title.toLowerCase().includes("tamper"));
    if (packaging && packaging.status !== "pass") {
      findings.push({
        id: "F-PKG",
        severity: "Low",
        title: "Packaging evidence needed",
        message: "Provide SOP evidence for tamper-evident packaging.",
        action: { label: "Attach evidence", type: "check", id: packaging.id },
      });
    }

    return findings;
  }, [licenses, allChecklistItems]);

  const autoSummary = useMemo(() => {
    const high = autoFindings.filter((f) => f.severity === "High").length;
    const med = autoFindings.filter((f) => f.severity === "Medium").length;
    const low = autoFindings.filter((f) => f.severity === "Low").length;
    return { high, med, low, total: autoFindings.length };
  }, [autoFindings]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      checklist.forEach((section) => {
        if (!(section.id in next)) {
          next[section.id] = true;
        }
      });
      return next;
    });
  }, [checklist]);

  const setChecklistStatus = (itemId: string, nextStatus: ChecklistItem["status"]) => {
    setChecklist((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: (sec.items || []).map((it) => (it.id === itemId ? { ...it, status: nextStatus, updatedAt: new Date().toISOString() } : it)),
      }))
    );
    logAudit("Compliance Desk", "Checklist updated", `${itemId} set to ${nextStatus.toUpperCase()}`);
  };

  const addChecklistEvidence = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((sec) => ({
        ...sec,
        items: (sec.items || []).map((it) => {
          if (it.id !== itemId) return it;
          const ev = { id: makeId("ev"), name: `evidence_${itemId.toLowerCase()}.pdf`, type: "PDF", uploadedAt: new Date().toISOString() };
          return { ...it, evidence: [ev, ...(it.evidence || [])], updatedAt: new Date().toISOString() };
        }),
      }))
    );
    logAudit("Ops", "Evidence uploaded", `Checklist evidence attached for ${itemId}`);
    pushToast({ title: "Evidence attached", message: "Evidence file added (demo).", tone: "success" });
  };

  const [licenseDrawerOpen, setLicenseDrawerOpen] = useState(false);
  const [activeLicenseId, setActiveLicenseId] = useState<string | null>(null);
  const activeLicense = useMemo(() => licenses.find((l) => l.id === activeLicenseId) || null, [licenses, activeLicenseId]);

  const openLicense = (id: string) => {
    setActiveLicenseId(id);
    setLicenseDrawerOpen(true);
  };

  const addLicenseDoc = (licenseId: string) => {
    setLicenses((prev) =>
      prev.map((l) => {
        if (l.id !== licenseId) return l;
        const doc = { id: makeId("doc"), name: `${licenseId.toLowerCase()}_upload.pdf`, type: "PDF", uploadedAt: new Date().toISOString() };
        return {
          ...l,
          number: l.number || `${licenseId.slice(-3)}-${Math.floor(Math.random() * 90000 + 10000)}`,
          issuedAt: l.issuedAt || new Date().toISOString(),
          expiresAt: l.expiresAt || new Date(Date.now() + 120 * 86_400_000).toISOString(),
          docs: [doc, ...(l.docs || [])],
          verifiedAt: new Date().toISOString(),
        };
      })
    );

    logAudit("Compliance Desk", "License document uploaded", `${licenseId} new file added`);
    pushToast({ title: "Upload complete", message: "License document uploaded (demo).", tone: "success" });
  };

  const verifyLicense = (licenseId: string) => {
    setLicenses((prev) => prev.map((l) => (l.id === licenseId ? { ...l, verifiedAt: new Date().toISOString() } : l)));
    logAudit("Compliance Desk", "License verified", `${licenseId} verified`);
    pushToast({ title: "Verified", message: "Verification timestamp updated.", tone: "success" });
  };

  const renewLicense = (licenseId: string) => {
    setLicenses((prev) =>
      prev.map((l) => {
        if (l.id !== licenseId) return l;
        const nextExp = new Date(Date.now() + 365 * 86_400_000).toISOString();
        return { ...l, expiresAt: nextExp, verifiedAt: new Date().toISOString() };
      })
    );
    logAudit("Compliance Desk", "License renewed", `${licenseId} renewed`);
    pushToast({ title: "Renewal recorded", message: "Expiry date extended (demo).", tone: "success" });
  };

  const [ruleSearch, setRuleSearch] = useState("");
  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => `${r.name} ${r.when} ${r.then}`.toLowerCase().includes(q));
  }, [rules, ruleSearch]);

  const runAutoValidation = () => {
    const at = new Date().toISOString();
    setAutoRunAt(at);
    logAudit("System", "Auto validation", `Auto checks executed (${autoSummary.total} finding(s))`);
    pushToast({
      title: "Auto checks complete",
      message: `${autoSummary.high} high, ${autoSummary.med} medium, ${autoSummary.low} low.`,
      tone: autoSummary.high ? "warning" : "success",
    });
  };

  // Evidence pack
  const [packs, setPacks] = useState<EvidencePack[]>([]);
  const [packOnlyRequired, setPackOnlyRequired] = useState(true);
  const [packIncludeAutoSnapshot, setPackIncludeAutoSnapshot] = useState(true);
  const [packNotes, setPackNotes] = useState("Quarterly audit pack - HealthMart Logistics");

  const requiredChecklistIds = useMemo(() => new Set(allChecklistItems.filter((x) => x.required).map((x) => x.id)), [allChecklistItems]);
  const requiredLicenseIds = useMemo(() => new Set(licenses.filter((l) => l.required).map((l) => l.id)), [licenses]);

  const [packSelect, setPackSelect] = useState<PackSelect>({ licenses: {}, checks: {} });

  useEffect(() => {
    // Default selection
    setPackSelect((s) => {
      const next = { licenses: { ...s.licenses }, checks: { ...s.checks } };
      if (packOnlyRequired) {
        licenses.forEach((l) => {
          if (requiredLicenseIds.has(l.id)) next.licenses[l.id] = true;
        });
        allChecklistItems.forEach((it) => {
          if (requiredChecklistIds.has(it.id)) next.checks[it.id] = true;
        });
      }
      return next;
    });
  }, [packOnlyRequired, licenses, allChecklistItems, requiredLicenseIds, requiredChecklistIds]);

  const selectedEvidence = useMemo(() => {
    const licE = licenses
      .filter((l) => !!packSelect.licenses[l.id])
      .flatMap((l) => collectEvidenceForLicense(l));

    const chkE = allChecklistItems
      .filter((it) => !!packSelect.checks[it.id])
      .flatMap((it) => collectEvidenceForItem(it));

    const combined = [...licE, ...chkE];
    combined.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return combined;
  }, [licenses, allChecklistItems, packSelect]);

  const packSummary = useMemo(() => {
    const selLic = Object.keys(packSelect.licenses).filter((k) => packSelect.licenses[k]).length;
    const selChk = Object.keys(packSelect.checks).filter((k) => packSelect.checks[k]).length;
    const docs = selectedEvidence.length;
    return { selLic, selChk, docs };
  }, [packSelect, selectedEvidence]);

  const generatePack = () => {
    const createdAt = new Date().toISOString();
    const manifest = {
      packId: `PACK-${hashLite(`${createdAt}_${packNotes}_${packSummary.docs}`)}`.toUpperCase(),
      createdAt,
      createdBy: "Compliance Desk",
      route: "/regulatory/healthmart/logistics",
      notes: packNotes,
      summary: {
        complianceScore,
        checklistScore: checklistStats.score,
        licenseScore: licenseStats.score,
        selectedLicenses: packSummary.selLic,
        selectedChecklistItems: packSummary.selChk,
        evidenceDocuments: packSummary.docs,
      },
      includeAutoSnapshot: packIncludeAutoSnapshot,
      autoSnapshot: packIncludeAutoSnapshot
        ? {
            runAt: autoRunAt,
            findings: autoFindings,
          }
        : null,
      evidence: selectedEvidence,
    };

    const pack = {
      id: manifest.packId,
      createdAt,
      createdBy: "Compliance Desk",
      docs: packSummary.docs,
      checksum: hashLite(JSON.stringify(manifest)).slice(0, 12),
      manifest,
    };

    setPacks((s) => [pack, ...s].slice(0, 20));
    logAudit("Compliance Desk", "Evidence pack generated", `${pack.id} created with ${pack.docs} doc(s)`);
    pushToast({
      title: "Evidence pack generated",
      message: `${pack.id} - checksum ${pack.checksum}`,
      tone: "success",
      action: { label: "Open packs", onClick: () => setTab("Evidence pack") },
    });
  };

  const evidencePackBlocked = useMemo(() => {
    // basic gating: must include at least 3 evidence docs
    return selectedEvidence.length < 3;
  }, [selectedEvidence.length]);

  const goBack = () => {
    pushToast({ title: "Navigation", message: "Wire this to /regulatory (Desks Home).", tone: "default" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">HealthMart Logistics</div>
                <Badge tone="slate">/regulatory/healthmart/logistics</Badge>
                <Badge tone="slate">Regulatory Desk</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Logistics compliance checklist, licenses, auto validation rules, and audit evidence pack.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={() => {
                  runAutoValidation();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Run auto checks
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("Evidence pack");
                  pushToast({ title: "Evidence pack", message: "Select evidence and generate a pack.", tone: "default" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Sparkles className="h-4 w-4" />
                Evidence pack
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={cx(
                    "grid h-12 w-12 place-items-center rounded-3xl",
                    complianceTone === "green" && "bg-emerald-50 text-emerald-700",
                    complianceTone === "orange" && "bg-orange-50 text-orange-700",
                    complianceTone === "danger" && "bg-rose-50 text-rose-700"
                  )}
                >
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-600">Overall compliance score</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-3xl font-black text-slate-900">{complianceScore}</div>
                    <Badge tone={complianceTone}>{complianceTone === "green" ? "Healthy" : complianceTone === "orange" ? "Needs attention" : "At risk"}</Badge>
                    <Badge tone="slate">Auto findings {autoSummary.total}</Badge>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Core scoring is based on required checklist and required licenses. No sensitive buyer data is shown.
                  </div>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                  <div className="text-[11px] font-extrabold text-slate-600">Checklist</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-lg font-black text-slate-900">{checklistStats.score}%</div>
                    <Badge tone={checklistStats.fail ? "danger" : checklistStats.warn ? "orange" : "green"}>
                      {checklistStats.fail ? `${checklistStats.fail} fail` : checklistStats.warn ? `${checklistStats.warn} warn` : "OK"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                  <div className="text-[11px] font-extrabold text-slate-600">Licenses</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-lg font-black text-slate-900">{licenseStats.score}%</div>
                    <Badge tone={licenseStats.expired || licenseStats.missing ? "danger" : licenseStats.expiring ? "orange" : "green"}>
                      {licenseStats.expired || licenseStats.missing
                        ? `${licenseStats.expired + licenseStats.missing} issue`
                        : licenseStats.expiring
                        ? `${licenseStats.expiring} expiring`
                        : "OK"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                  <div className="text-[11px] font-extrabold text-slate-600">Next audit</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="text-lg font-black text-slate-900">{fmtDate(new Date(Date.now() + 14 * 86_400_000).toISOString())}</div>
                    <Badge tone="slate">14d</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <Chip
                  key={t}
                  active={tab === t}
                  onClick={() => setTab(t)}
                  tone={t === "Auto validation" || t === "Evidence pack" ? "orange" : "green"}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Priority findings</div>
              <span className="ml-auto">
                <Badge tone={autoSummary.high ? "danger" : autoSummary.med ? "orange" : "green"}>{autoSummary.high ? "High" : autoSummary.med ? "Medium" : "OK"}</Badge>
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {autoFindings.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className={cx(
                    "rounded-3xl border p-4",
                    f.severity === "High" && "border-rose-200 bg-rose-50/70",
                    f.severity === "Medium" && "border-orange-200 bg-orange-50/70",
                    f.severity === "Low" && "border-slate-200/70 bg-white dark:bg-slate-900/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={f.severity === "High" ? "danger" : f.severity === "Medium" ? "orange" : "slate"}>{f.severity}</Badge>
                    <div className="text-xs font-extrabold text-slate-800">{f.title}</div>
                    <span className="ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (f.action?.type === "license" && f.action.id) {
                            openLicense(f.action.id);
                            return;
                          }
                          if (f.action?.type === "check" && f.action.id) {
                            setTab("Checklist");
                            pushToast({ title: "Jump", message: "Scroll to the item and attach evidence.", tone: "default" });
                            return;
                          }
                          pushToast({ title: "Task created", message: "This is a demo action.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-800"
                      >
                        {f.action?.label || "Open"}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-700">{f.message}</div>
                </div>
              ))}

              {autoFindings.length === 0 ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                      <CheckCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-emerald-900">All good</div>
                      <div className="mt-1 text-xs font-semibold text-emerald-900/70">No active auto validation findings.</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Audit evidence pack</div>
                <span className="ml-auto">
                  <Badge tone={packSummary.docs >= 3 ? "green" : "orange"}>{packSummary.docs} docs</Badge>
                </span>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Super premium: generate a pack with checklist evidence, license files, and optional auto snapshot.
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Main content */}
        <div className="mt-4">
          {tab === "Checklist" ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-4 lg:col-span-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Logistics compliance checklist</div>
                    <Badge tone="slate">Required {checklistStats.required}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSections((s) => {
                        const next = { ...s };
                        Object.keys(next).forEach((k) => (next[k] = true));
                        return next;
                      });
                      pushToast({ title: "Expanded", message: "All sections expanded.", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Expand
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  {checklist.map((sec) => (
                    <div key={sec.id} className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => setOpenSections((s) => ({ ...s, [sec.id]: !s[sec.id] }))}
                        className="flex w-full items-center justify-between bg-white dark:bg-slate-900/70 px-4 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900">{sec.title}</div>
                          <div className="mt-0.5 text-xs font-semibold text-slate-500">
                            {(sec.items || []).filter((x) => x.required).length} required item(s)
                          </div>
                        </div>
                        <ChevronDown className={cx("h-4 w-4 text-slate-400 transition", openSections[sec.id] && "rotate-180")} />
                      </button>

                      <AnimatePresence initial={false}>
                        {openSections[sec.id] ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-slate-200/70">
                              {(sec.items || []).map((it) => (
                                <div key={it.id} className="p-4">
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-sm font-black text-slate-900">{it.title}</div>
                                        {it.required ? <Badge tone="slate">Required</Badge> : <Badge tone="slate">Optional</Badge>}
                                        <Badge tone={checklistTone(it.status)}>{it.status.toUpperCase()}</Badge>
                                        <span className="ml-auto text-[11px] font-semibold text-slate-500">
                                          Updated {fmtTime(it.updatedAt)}
                                        </span>
                                      </div>
                                      <div className="mt-1 text-xs font-semibold text-slate-600">{it.requirement}</div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge tone="slate">Owner: {it.owner}</Badge>
                                        <Badge tone="slate">Evidence {String((it.evidence || []).length)}</Badge>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="relative">
                                        <select
                                          value={it.status}
                                          onChange={(e) => setChecklistStatus(it.id, e.target.value as ChecklistStatus)}
                                          className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                                        >
                                          {CHECKLIST_STATUSES.map((s) => (
                                            <option key={s} value={s}>
                                              {s.toUpperCase()}
                                            </option>
                                          ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => addChecklistEvidence(it.id)}
                                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                                        style={{ background: TOKENS.orange }}
                                      >
                                        <Upload className="h-4 w-4" />
                                        Attach evidence
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          safeCopy(it.id);
                                          pushToast({ title: "Copied", message: "Checklist item ID copied.", tone: "success" });
                                        }}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                                      >
                                        <Copy className="h-4 w-4" />
                                        Copy ID
                                      </button>
                                    </div>
                                  </div>

                                  {(it.evidence || []).length ? (
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                      {(it.evidence || []).slice(0, 4).map((e) => (
                                        <div key={e.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                            <FileText className="h-5 w-5" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-black text-slate-900">{e.name}</div>
                                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{e.type} · {fmtTime(e.uploadedAt)}</div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => pushToast({ title: "Download", message: "Wire file download.", tone: "default" })}
                                            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                                            aria-label="Download"
                                          >
                                            <Download className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:col-span-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Checklist insights</div>
                  <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
                </div>

                <div className="mt-3 grid gap-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-xs font-extrabold text-slate-600">Open issues</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={checklistStats.fail ? "danger" : "slate"}>Fail {checklistStats.fail}</Badge>
                      <Badge tone={checklistStats.warn ? "orange" : "slate"}>Warn {checklistStats.warn}</Badge>
                      <Badge tone={checklistStats.pending ? "orange" : "slate"}>Pending {checklistStats.pending}</Badge>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-slate-500">
                      Super premium suggestion: set SLAs per item and auto-route to owners.
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Best next actions</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                          <li>Upload cargo insurance evidence (required for cross-border)</li>
                          <li>Renew cold chain certificate (expiring soon)</li>
                          <li>Add packaging SOP evidence to close warning</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTab("Evidence pack");
                      pushToast({ title: "Pack builder", message: "Select evidence and generate a pack.", tone: "default" });
                    }}
                    className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    Generate evidence pack
                  </button>
                </div>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Licenses" ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-4 lg:col-span-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Licenses and permits</div>
                    <Badge tone="slate">Required {licenseStats.required}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Library", message: "Wire license templates and country-specific rules.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Settings className="h-4 w-4" />
                    License library
                  </button>
                </div>

                <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                    <div className="col-span-4">License</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Expires</div>
                    <div className="col-span-2">Verified</div>
                    <div className="col-span-1">Docs</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {licenses.map((l) => {
                      const st = licenseStatus(l);
                      const du = daysUntil(l.expiresAt);
                      return (
                        <div key={l.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                          <div className="col-span-4 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{l.name}</div>
                              {l.required ? <Badge tone="slate">Required</Badge> : <Badge tone="slate">Optional</Badge>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {l.issuer}</span>
                              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {l.number || "No number"}</span>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <Badge tone={st.tone}>{st.k}</Badge>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <div>
                              <div className="text-sm font-extrabold text-slate-900">{fmtDate(l.expiresAt)}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{du === null ? "-" : du < 0 ? `${Math.abs(du)} day(s) ago` : `in ${du} day(s)`}</div>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <div className="text-[11px] font-semibold text-slate-600">{l.verifiedAt ? fmtTime(l.verifiedAt) : "Not verified"}</div>
                          </div>

                          <div className="col-span-1 flex items-center">
                            <Badge tone="slate">{(l.docs || []).length}</Badge>
                          </div>

                          <div className="col-span-1 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openLicense(l.id)}
                              className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                              aria-label="Open"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:col-span-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">License risk</div>
                  <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-xs font-extrabold text-slate-600">Issues</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge tone={licenseStats.missing ? "danger" : "slate"}>Missing {licenseStats.missing}</Badge>
                      <Badge tone={licenseStats.expired ? "danger" : "slate"}>Expired {licenseStats.expired}</Badge>
                      <Badge tone={licenseStats.expiring ? "orange" : "slate"}>Expiring {licenseStats.expiring}</Badge>
                    </div>
                    <div className="mt-3 text-xs font-semibold text-slate-500">Auto validation can block dispatch based on required license status.</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTab("Auto validation");
                      pushToast({ title: "Auto validation", message: "Review rules and run checks.", tone: "default" });
                    }}
                    className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    Open auto validation rules
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTab("Evidence pack");
                      pushToast({ title: "Evidence pack", message: "Include license docs and export.", tone: "default" });
                    }}
                    className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Generate evidence pack
                  </button>
                </div>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Auto validation" ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-4 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Auto validation rules</div>
                    <Badge tone="orange">Super premium</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={runAutoValidation}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.orange }}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Run now
                  </button>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-12 md:items-center">
                  <div className="relative md:col-span-7">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={ruleSearch}
                      onChange={(e) => setRuleSearch(e.target.value)}
                      placeholder="Search rules"
                      className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>
                  <div className="md:col-span-5 flex items-center justify-end gap-2">
                    <Badge tone="slate">Last run {autoRunAt ? fmtTime(autoRunAt) : "Never"}</Badge>
                    <Badge tone={autoSummary.high ? "danger" : autoSummary.med ? "orange" : "green"}>{autoSummary.total} finding(s)</Badge>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {filteredRules.map((r) => (
                    <div key={r.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className={cx(
                          "grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900",
                          r.severity === "High" ? "text-rose-700" : r.severity === "Medium" ? "text-orange-700" : "text-slate-700"
                        )}>
                          <Settings className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900">{r.name}</div>
                            <Badge tone={r.severity === "High" ? "danger" : r.severity === "Medium" ? "orange" : "slate"}>{r.severity}</Badge>
                            <span className="ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setRules((s) => s.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
                                  logAudit("Compliance Desk", "Rule toggled", `${r.id} set to ${(!r.enabled).toString()}`);
                                }}
                                className={cx(
                                  "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                                  r.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                                )}
                              >
                                {r.enabled ? "Enabled" : "Disabled"}
                              </button>
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                              <div className="text-[11px] font-extrabold text-slate-600">When</div>
                              <div className="mt-1 text-xs font-semibold text-slate-700">{r.when}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                              <div className="text-[11px] font-extrabold text-slate-600">Then</div>
                              <div className="mt-1 text-xs font-semibold text-slate-700">{r.then}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Evidence: {r.evidence}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredRules.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="text-lg font-black text-slate-900">No rules</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Try a different search term.</div>
                    </div>
                  ) : null}
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:col-span-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Auto findings</div>
                  <span className="ml-auto"><Badge tone="slate">Snapshot</Badge></span>
                </div>

                <div className="mt-3 space-y-2">
                  {autoFindings.map((f) => (
                    <div
                      key={f.id}
                      className={cx(
                        "rounded-3xl border p-4",
                        f.severity === "High" && "border-rose-200 bg-rose-50/70",
                        f.severity === "Medium" && "border-orange-200 bg-orange-50/70",
                        f.severity === "Low" && "border-slate-200/70 bg-white dark:bg-slate-900/70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={f.severity === "High" ? "danger" : f.severity === "Medium" ? "orange" : "slate"}>{f.severity}</Badge>
                        <div className="text-xs font-extrabold text-slate-800">{f.title}</div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-700">{f.message}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (f.action?.type === "license" && f.action.id) return openLicense(f.action.id);
                            if (f.action?.type === "check" && f.action.id) {
                              setTab("Checklist");
                              return pushToast({ title: "Jump", message: "Open checklist and attach evidence.", tone: "default" });
                            }
                            pushToast({ title: "Task created", message: "This is a demo action.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                        >
                          {f.action?.label || "Open"}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(JSON.stringify(f, null, 2));
                            pushToast({ title: "Copied", message: "Finding JSON copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy JSON
                        </button>
                      </div>
                    </div>
                  ))}

                  {autoFindings.length === 0 ? (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                          <CheckCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-emerald-900">No findings</div>
                          <div className="mt-1 text-xs font-semibold text-emerald-900/70">All checks passed.</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setTab("Evidence pack")}
                    className="w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    Generate evidence pack with auto snapshot
                  </button>
                </div>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Evidence pack" ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <GlassCard className="p-4 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Audit evidence pack builder</div>
                    <Badge tone="orange">Super premium</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPackOnlyRequired((v) => !v);
                        pushToast({ title: "Selection mode", message: "Updated default selection.", tone: "default" });
                      }}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                        packOnlyRequired ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                      )}
                    >
                      {packOnlyRequired ? "Required only" : "All items"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPackIncludeAutoSnapshot((v) => !v)}
                      className={cx(
                        "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                        packIncludeAutoSnapshot ? "border-orange-200 bg-orange-50 text-orange-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                      )}
                    >
                      {packIncludeAutoSnapshot ? "Auto snapshot ON" : "Auto snapshot OFF"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Pack notes</div>
                  <input
                    value={packNotes}
                    onChange={(e) => setPackNotes(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    placeholder="Describe the audit scope"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="slate">Selected licenses {packSummary.selLic}</Badge>
                    <Badge tone="slate">Selected checklist {packSummary.selChk}</Badge>
                    <Badge tone={packSummary.docs >= 3 ? "green" : "orange"}>Evidence docs {packSummary.docs}</Badge>
                    <span className="ml-auto"><Badge tone="slate">Route /regulatory/healthmart/logistics</Badge></span>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Licenses</div>
                      <span className="ml-auto"><Badge tone="slate">Select</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {licenses.map((l) => {
                        const st = licenseStatus(l);
                        const checked = !!packSelect.licenses[l.id];
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setPackSelect((s) => ({ ...s, licenses: { ...s.licenses, [l.id]: !checked } }))}
                            className={cx(
                              "flex w-full items-center gap-3 rounded-3xl border bg-white dark:bg-slate-900 p-3 text-left transition",
                              checked ? "border-emerald-200" : "border-slate-200/70 hover:bg-gray-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-black text-slate-900">{l.name}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Docs {(l.docs || []).length} · {st.k}</div>
                            </div>
                            <Badge tone={st.tone}>{st.k}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Checklist items</div>
                      <span className="ml-auto"><Badge tone="slate">Select</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {allChecklistItems.map((it) => {
                        const checked = !!packSelect.checks[it.id];
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => setPackSelect((s) => ({ ...s, checks: { ...s.checks, [it.id]: !checked } }))}
                            className={cx(
                              "flex w-full items-center gap-3 rounded-3xl border bg-white dark:bg-slate-900 p-3 text-left transition",
                              checked ? "border-emerald-200" : "border-slate-200/70 hover:bg-gray-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className={cx("grid h-10 w-10 place-items-center rounded-2xl", checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                              <ClipboardList className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-black text-slate-900">{it.title}</div>
                              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Evidence {(it.evidence || []).length} · {it.status.toUpperCase()}</div>
                            </div>
                            <Badge tone={checklistTone(it.status)}>{it.status.toUpperCase()}</Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (evidencePackBlocked) {
                        pushToast({ title: "More evidence required", message: "Select or attach at least 3 evidence documents.", tone: "warning" });
                        return;
                      }
                      generatePack();
                    }}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                      evidencePackBlocked && "opacity-60"
                    )}
                    style={{ background: TOKENS.green }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate pack
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(JSON.stringify({ packSelect, packNotes, packIncludeAutoSnapshot }, null, 2));
                      pushToast({ title: "Copied", message: "Pack draft JSON copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy draft
                  </button>

                  <span className="ml-auto text-[11px] font-semibold text-slate-500">
                    Tip: include auto snapshot for audits, or switch it off for a lighter pack.
                  </span>
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:col-span-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Included evidence</div>
                    <Badge tone="slate">{selectedEvidence.length}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Export", message: "Wire export to PDF and ZIP.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {selectedEvidence.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{e.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{e.type} · {e.source}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => safeCopy(e.name)}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Copy"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {selectedEvidence.length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="text-lg font-black text-slate-900">No evidence selected</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Select licenses and checklist items to include their evidence.</div>
                    </div>
                  ) : null}

                  <div className="mt-2 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Pack format</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">
                          Manifest JSON + evidence list + optional auto snapshot. In production, export as PDF and ZIP.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Pack history</div>
                      <span className="ml-auto"><Badge tone="slate">{packs.length}</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {packs.slice(0, 5).map((p) => (
                        <div key={p.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-black text-slate-900 truncate">{p.id}</div>
                            <Badge tone="slate">Docs {p.docs}</Badge>
                            <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(p.createdAt)}</span>
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-slate-500">Checksum {p.checksum}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(JSON.stringify(p.manifest, null, 2));
                                pushToast({ title: "Copied", message: "Manifest JSON copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy manifest
                            </button>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Export", message: "Wire export to PDF and ZIP.", tone: "default" })}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Download className="h-4 w-4" />
                              Export
                            </button>
                          </div>
                        </div>
                      ))}
                      {packs.length === 0 ? <div className="text-xs font-semibold text-slate-500">No packs generated yet.</div> : null}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Audit log" ? (
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Audit log</div>
                  <Badge tone="slate">{audit.length}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(JSON.stringify(audit.slice(0, 30), null, 2));
                    pushToast({ title: "Copied", message: "Audit log JSON copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-3">Time</div>
                  <div className="col-span-2">Actor</div>
                  <div className="col-span-3">Action</div>
                  <div className="col-span-4">Detail</div>
                </div>
                <div className="divide-y divide-slate-200/70">
                  {audit.slice(0, 30).map((e) => (
                    <div key={e.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                      <div className="col-span-3 text-slate-500">{fmtTime(e.at)}</div>
                      <div className="col-span-2 font-extrabold text-slate-800">{e.actor}</div>
                      <div className="col-span-3">{e.action}</div>
                      <div className="col-span-4 text-slate-500 truncate">{e.detail}</div>
                    </div>
                  ))}
                  {audit.length === 0 ? (
                    <div className="p-6">
                      <div className="text-lg font-black text-slate-900">No audit events</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Actions like uploads, renewals, and pack generation will appear here.</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassCard>
          ) : null}
        </div>
      </div>

      {/* License drawer */}
      <Drawer
        open={licenseDrawerOpen}
        title={activeLicense ? `License · ${activeLicense.name}` : "License"}
        subtitle={activeLicense ? `${activeLicense.id} · ${activeLicense.scope}` : ""}
        onClose={() => setLicenseDrawerOpen(false)}
      >
        {!activeLicense ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a license first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-black text-slate-900">{activeLicense.name}</div>
                    <Badge tone={licenseStatus(activeLicense).tone}>{licenseStatus(activeLicense).k}</Badge>
                    {activeLicense.required ? <Badge tone="slate">Required</Badge> : <Badge tone="slate">Optional</Badge>}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Issuer: {activeLicense.issuer}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="slate">Number: {activeLicense.number || "-"}</Badge>
                    <Badge tone="slate">Issued: {fmtDate(activeLicense.issuedAt)}</Badge>
                    <Badge tone="slate">Expires: {fmtDate(activeLicense.expiresAt)}</Badge>
                    <Badge tone="slate">Verified: {activeLicense.verifiedAt ? fmtTime(activeLicense.verifiedAt) : "Not verified"}</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addLicenseDoc(activeLicense.id)}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.orange }}
                >
                  <Upload className="h-4 w-4" />
                  Upload document
                </button>

                <button
                  type="button"
                  onClick={() => verifyLicense(activeLicense.id)}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Verify
                </button>

                <button
                  type="button"
                  onClick={() => renewLicense(activeLicense.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Renew (demo)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(activeLicense.id);
                    pushToast({ title: "Copied", message: "License ID copied.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy ID
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Files</div>
                <span className="ml-auto"><Badge tone="slate">{(activeLicense.docs || []).length}</Badge></span>
              </div>

              <div className="mt-3 space-y-2">
                {(activeLicense.docs || []).length === 0 ? (
                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Missing documents</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">Upload evidence to clear this license.</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  (activeLicense.docs || []).map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-slate-900">{d.name}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{d.type} · {fmtTime(d.uploadedAt)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Download", message: "Wire download.", tone: "default" })}
                        className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Notes</div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">
                Production: validate license types per country, support multi-fleet mapping, and auto-request renewals.
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
