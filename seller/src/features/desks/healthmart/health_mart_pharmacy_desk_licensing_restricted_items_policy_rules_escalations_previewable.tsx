import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../../lib/backendApi";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";

/**
 * HealthMart Pharmacy Desk (Previewable)
 * Route: /regulatory/healthmart/pharmacy
 * Core:
 * - Pharmacy licensing
 * - Restricted items
 * Super premium:
 * - Policy enforcement rules
 * - Escalation workflow
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

type LicenseStatus = "Pending" | "Verified" | "Expired" | "Suspended";
type License = {
  id: string;
  seller: string;
  country: string;
  authority: string;
  licenseNo: string;
  issuedAt: string;
  expiresAt: string;
  status: LicenseStatus;
  scope: string[];
  docs: string[];
  riskScore: number;
  notes: string;
};

type RestrictionKey = "RxOnly" | "Controlled" | "Age18" | "License";
type RestrictedItemStatus = "Pending" | "On Hold" | "Blocked" | "Approved";
type RestrictedItem = {
  id: string;
  title: string;
  seller: string;
  category: string;
  restriction: RestrictionKey;
  policy: string;
  status: RestrictedItemStatus;
  createdAt: string;
  evidence: string[];
};

type PolicyRule = {
  id: string;
  name: string;
  enabled: boolean;
  when: string[];
  then: string[];
  lastEditedAt: string;
};

type EscalationSeverity = "High" | "Medium" | "Low";
type EscalationStatus = "Open" | "In Review" | "Closed";
type EscalationTimeline = { at: string; who: string; what: string };
type EscalationCase = {
  id: string;
  severity: EscalationSeverity;
  status: EscalationStatus;
  title: string;
  related: string;
  createdAt: string;
  assignee: string;
  timeline: EscalationTimeline[];
};

type DetailKind = "license" | "item" | "rule" | "case";
const TABS = ["Licensing", "Restricted Items", "Policy Rules", "Escalations"] as const;
type TabKey = (typeof TABS)[number];
type LicenseStatusFilter = LicenseStatus | "All";
type ItemStatusFilter = RestrictedItemStatus | "All";
type RestrictionFilter = RestrictionKey | "All";

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type DrawerProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
type ToastCenterProps = { toasts: Toast[]; dismiss: (id: string) => void };
type KpiCardProps = { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; tone?: "green" | "orange" | "slate" };
type ScorePillProps = { score?: number };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
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

function IconButton({ label, onClick, children }: IconButtonProps) {
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

// -------------------- Demo data --------------------

const LICENSE_STATUSES: LicenseStatus[] = ["Pending", "Verified", "Expired", "Suspended"]; // demo

function statusTone(s: LicenseStatus): BadgeTone {
  if (s === "Verified") return "green";
  if (s === "Pending") return "orange";
  if (s === "Expired") return "danger";
  if (s === "Suspended") return "danger";
  return "slate";
}

function severityTone(s: EscalationSeverity): BadgeTone {
  if (s === "High") return "danger";
  if (s === "Medium") return "orange";
  return "slate";
}

function seedLicenses(): License[] {
  const now = Date.now();
  const agoH = (h: number) => new Date(now - h * 3600_000).toISOString();
  const inD = (d: number) => new Date(now + d * 24 * 3600_000).toISOString();
  const agoD = (d: number) => new Date(now - d * 24 * 3600_000).toISOString();

  return [
    {
      id: "LIC-24019",
      seller: "Kampala Care Pharmacy",
      country: "UG",
      authority: "National Drug Authority",
      licenseNo: "NDA/PH/2025/1881",
      issuedAt: agoD(220),
      expiresAt: inD(96),
      status: "Pending",
      scope: ["OTC", "Rx"],
      docs: ["license_scan.pdf", "premises_photos.zip", "pharmacist_certificate.pdf"],
      riskScore: 62,
      notes: "Awaiting verification of supervising pharmacist registration.",
    },
    {
      id: "LIC-24018",
      seller: "Nairobi Wellness Chemist",
      country: "KE",
      authority: "Pharmacy and Poisons Board",
      licenseNo: "PPB/KE/2024/7742",
      issuedAt: agoD(420),
      expiresAt: inD(12),
      status: "Verified",
      scope: ["OTC"],
      docs: ["license_scan.pdf"],
      riskScore: 18,
      notes: "Verified. OTC only.",
    },
    {
      id: "LIC-24017",
      seller: "Mombasa Health Supplies",
      country: "KE",
      authority: "PPB",
      licenseNo: "PPB/KE/2023/6120",
      issuedAt: agoD(760),
      expiresAt: agoH(12),
      status: "Expired",
      scope: ["OTC", "Rx"],
      docs: ["license_scan.pdf", "renewal_receipt.pdf"],
      riskScore: 79,
      notes: "Expired. Block Rx until renewal confirmed.",
    },
    {
      id: "LIC-24016",
      seller: "Dar Med Store",
      country: "TZ",
      authority: "Tanzania Medicines and Medical Devices Authority",
      licenseNo: "TMDA/TZ/2024/0391",
      issuedAt: agoD(310),
      expiresAt: inD(180),
      status: "Suspended",
      scope: ["OTC"],
      docs: ["license_scan.pdf", "suspension_notice.pdf"],
      riskScore: 92,
      notes: "Suspended. All pharmacy items must remain blocked.",
    },
  ];
}

const RESTRICTIONS: Array<{ k: RestrictionKey; label: string }> = [
  { k: "RxOnly", label: "Prescription required" },
  { k: "Controlled", label: "Controlled substance" },
  { k: "Age18", label: "Age 18+" },
  { k: "License", label: "License required" },
];

function restrictionTone(k: RestrictionKey): BadgeTone {
  if (k === "Controlled") return "danger";
  if (k === "RxOnly") return "orange";
  if (k === "License") return "slate";
  return "slate";
}

function seedRestrictedItems(): RestrictedItem[] {
  const now = Date.now();
  const agoM = (m: number) => new Date(now - m * 60_000).toISOString();

  return [
    {
      id: "RX-90112",
      title: "Amoxicillin 500mg capsules (Box of 20)",
      seller: "Kampala Care Pharmacy",
      category: "Medicine",
      restriction: "RxOnly",
      policy: "Block Rx without verified license",
      status: "On Hold",
      createdAt: agoM(95),
      evidence: [],
    },
    {
      id: "RX-90111",
      title: "Tramadol 50mg tablets",
      seller: "Dar Med Store",
      category: "Medicine",
      restriction: "Controlled",
      policy: "Controlled substances require manual approval",
      status: "Blocked",
      createdAt: agoM(210),
      evidence: ["supplier_invoice.pdf"],
    },
    {
      id: "RX-90110",
      title: "Insulin pen needles (100pcs)",
      seller: "Nairobi Wellness Chemist",
      category: "Medical Device",
      restriction: "License",
      policy: "Medical devices require active pharmacy license",
      status: "Pending",
      createdAt: agoM(520),
      evidence: [],
    },
    {
      id: "RX-90109",
      title: "Cough syrup 120ml",
      seller: "Mombasa Health Supplies",
      category: "OTC",
      restriction: "Age18",
      policy: "Age gating required",
      status: "Pending",
      createdAt: agoM(980),
      evidence: [],
    },
  ];
}

function seedRules(): PolicyRule[] {
  return [
    {
      id: "RULE-01",
      name: "Block Rx without verified pharmacy license",
      enabled: true,
      when: ["Category is Medicine", "Restriction is RxOnly", "Seller license is not Verified"],
      then: ["Block listing", "Create escalation case (Medium)", "Notify seller"],
      lastEditedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "RULE-02",
      name: "Controlled substances require manual approval",
      enabled: true,
      when: ["Restriction is Controlled"],
      then: ["Block listing", "Create escalation case (High)", "Route to Supervisor"],
      lastEditedAt: new Date(Date.now() - 1000 * 60 * 540).toISOString(),
    },
    {
      id: "RULE-03",
      name: "Auto-hold listings when license expired",
      enabled: false,
      when: ["Seller license status is Expired"],
      then: ["Put all pharmacy listings On Hold", "Notify seller"],
      lastEditedAt: new Date(Date.now() - 1000 * 60 * 860).toISOString(),
    },
  ];
}

function seedCases(): EscalationCase[] {
  const now = Date.now();
  const agoM = (m: number) => new Date(now - m * 60_000).toISOString();
  return [
    {
      id: "CASE-7701",
      severity: "High",
      status: "Open",
      title: "Controlled substance listing detected",
      related: "RX-90111",
      createdAt: agoM(185),
      assignee: "HealthMart Supervisor",
      timeline: [
        { at: agoM(185), who: "System", what: "Case created from policy RULE-02" },
        { at: agoM(160), who: "Desk", what: "Requested source invoice" },
      ],
    },
    {
      id: "CASE-7700",
      severity: "Medium",
      status: "In Review",
      title: "Rx listing while license pending verification",
      related: "LIC-24019",
      createdAt: agoM(410),
      assignee: "Compliance Analyst",
      timeline: [
        { at: agoM(410), who: "System", what: "Case created from policy RULE-01" },
        { at: agoM(300), who: "Analyst", what: "Requested pharmacist registration proof" },
      ],
    },
  ];
}

function KpiCard({ icon: Icon, label, value, tone = "slate" }: KpiCardProps) {
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
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ score }: ScorePillProps) {
  const s = clamp(Number(score || 0), 0, 100);
  const tone = s >= 80 ? "danger" : s >= 50 ? "orange" : "green";
  return <Badge tone={tone}>{s}</Badge>;
}

export default function HealthMartPharmacyDeskPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState<TabKey>("Licensing");

  const [licenses, setLicenses] = useState<License[]>([]);
  const [items, setItems] = useState<RestrictedItem[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [cases, setCases] = useState<EscalationCase[]>([]);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getRegulatoryDesk("healthmart-pharmacy").then((payload) => {
      if (!active) return;
      const pageData = ((payload as { pageData?: Record<string, unknown> }).pageData ?? {}) as Record<string, unknown>;
      setLicenses(Array.isArray(pageData.licenses) ? pageData.licenses as License[] : []);
      setItems(Array.isArray(pageData.items) ? pageData.items as RestrictedItem[] : []);
      setRules(Array.isArray(pageData.rules) ? pageData.rules as PolicyRule[] : []);
      setCases(Array.isArray(pageData.cases) ? pageData.cases as EscalationCase[] : []);
    });

    return () => {
      active = false;
    };
  }, []);

  const pendingLicenses = useMemo(() => licenses.filter((l) => l.status === "Pending").length, [licenses]);
  const flaggedItems = useMemo(() => items.filter((i) => i.status !== "Approved").length, [items]);
  const enabledRules = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);
  const openCases = useMemo(() => cases.filter((c) => c.status !== "Closed").length, [cases]);

  // Licensing filters
  const [licQ, setLicQ] = useState("");
  const [licStatus, setLicStatus] = useState<LicenseStatusFilter>("All");

  const filteredLicenses = useMemo(() => {
    const q = licQ.trim().toLowerCase();
    return [...licenses]
      .filter((l) => (licStatus === "All" ? true : l.status === licStatus))
      .filter((l) => {
        if (!q) return true;
        const hay = [l.id, l.seller, l.country, l.authority, l.licenseNo, (l.scope || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));
  }, [licenses, licQ, licStatus]);

  // Restricted items filters
  const [itemQ, setItemQ] = useState("");
  const [itemStatus, setItemStatus] = useState<ItemStatusFilter>("All");
  const [restriction, setRestriction] = useState<RestrictionFilter>("All");

  const filteredItems = useMemo(() => {
    const q = itemQ.trim().toLowerCase();
    return [...items]
      .filter((i) => (itemStatus === "All" ? true : i.status === itemStatus))
      .filter((i) => (restriction === "All" ? true : i.restriction === restriction))
      .filter((i) => {
        if (!q) return true;
        const hay = [i.id, i.title, i.seller, i.category, i.policy].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, itemQ, itemStatus, restriction]);

  // Drawers
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKind, setDetailKind] = useState<DetailKind | null>(null); // 'license' | 'item' | 'rule' | 'case'
  const [detailId, setDetailId] = useState<string | null>(null);

  const openDetail = (kind: DetailKind, id: string) => {
    setDetailKind(kind);
    setDetailId(id);
    setDetailOpen(true);
  };

  const activeLicense = useMemo(() => (detailKind === "license" ? licenses.find((x) => x.id === detailId) : null), [detailKind, detailId, licenses]);
  const activeItem = useMemo(() => (detailKind === "item" ? items.find((x) => x.id === detailId) : null), [detailKind, detailId, items]);
  const activeRule = useMemo(() => (detailKind === "rule" ? rules.find((x) => x.id === detailId) : null), [detailKind, detailId, rules]);
  const activeCase = useMemo(() => (detailKind === "case" ? cases.find((x) => x.id === detailId) : null), [detailKind, detailId, cases]);

  // Policy editor (super premium)
  const [ruleDraft, setRuleDraft] = useState<PolicyRule | null>(null);
  const updateRuleDraft = (updater: (draft: PolicyRule) => PolicyRule) => {
    setRuleDraft((s) => (s ? updater(s) : s));
  };
  useEffect(() => {
    if (detailKind !== "rule" || !activeRule) return;
    setRuleDraft(JSON.parse(JSON.stringify(activeRule)));
  }, [detailKind, activeRule?.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">HealthMart Pharmacy</div>
                <Badge tone="slate">/regulatory/healthmart/pharmacy</Badge>
                <Badge tone="slate">Regulatory Desk</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Licensing review, restricted items, policy enforcement rules and escalation workflow.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Sync", message: "Sync latest applications and flagged items (wire to API).", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <ShieldCheck className="h-4 w-4" />
                Sync
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Desk preferences", message: "Wire desk SLAs, templates and routing rules.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Sparkles className="h-4 w-4" />
                Preferences
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard icon={ClipboardList} label="Pending licenses" value={pendingLicenses} tone="orange" />
          <KpiCard icon={AlertTriangle} label="Flagged items" value={flaggedItems} tone="orange" />
          <KpiCard icon={Sparkles} label="Active rules" value={enabledRules} tone="green" />
          <KpiCard icon={Users} label="Open escalations" value={openCases} tone="slate" />
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <Chip
              key={t}
              active={tab === t}
              onClick={() => setTab(t)}
              tone={t === "Restricted Items" || t === "Escalations" ? "orange" : "green"}
            >
              {t}
            </Chip>
          ))}
          <span className="ml-auto"><Badge tone="slate">Desk view</Badge></span>
        </div>

        {/* Main */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.16 }}>
              {tab === "Licensing" ? (
                <div className="grid gap-4 lg:grid-cols-12">
                  <GlassCard className="p-4 lg:col-span-5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Licensing inbox</div>
                      <span className="ml-auto"><Badge tone="slate">{filteredLicenses.length}</Badge></span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-12 md:items-center">
                      <div className="relative md:col-span-7">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={licQ}
                          onChange={(e) => setLicQ(e.target.value)}
                          placeholder="Search seller, license number, authority"
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                      <div className="md:col-span-5">
                        <div className="relative">
                          <select
                            value={licStatus}
                            onChange={(e) => setLicStatus(e.target.value as LicenseStatusFilter)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", ...LICENSE_STATUSES].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {filteredLicenses.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => openDetail("license", l.id)}
                          className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">{l.seller}</div>
                                <Badge tone={statusTone(l.status)}>{l.status}</Badge>
                                <span className="ml-auto"><ScorePill score={l.riskScore} /></span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">{l.country} · {l.authority}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge tone="slate">{l.licenseNo}</Badge>
                                <Badge tone="slate">Scope: {(l.scope || []).join(", ")}</Badge>
                                <Badge tone="slate">Docs: {(l.docs || []).length}</Badge>
                              </div>
                              <div className="mt-2 text-[11px] font-semibold text-slate-500">Expires {fmtTime(l.expiresAt)}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </button>
                      ))}

                      {filteredLicenses.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                          <div className="flex items-start gap-3">
                            <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                              <Filter className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="text-lg font-black text-slate-900">No results</div>
                              <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing search text.</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setLicQ("");
                                  setLicStatus("All");
                                  pushToast({ title: "Filters cleared", tone: "default" });
                                }}
                                className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Check className="h-4 w-4" />
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 lg:col-span-7">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">How licensing works</div>
                      <span className="ml-auto"><Badge tone="orange">Core</Badge></span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {[{ t: "Verify license", d: "Check authority, license number, scope and expiry." }, { t: "Validate pharmacist", d: "Confirm supervising pharmacist registration and credentials." }, { t: "Restrict by scope", d: "Enforce OTC and Rx scope automatically on listings." }, { t: "Escalate when needed", d: "Create cases for suspicious, expired, or controlled items." }].map((x) => (
                        <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="text-sm font-black text-slate-900">{x.t}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Super premium enforcement</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Policies auto-block risky listings, open escalation cases, and enforce consistent outcomes across countries.</div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ) : null}

              {tab === "Restricted Items" ? (
                <div className="grid gap-4 lg:grid-cols-12">
                  <GlassCard className="p-4 lg:col-span-8">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Restricted items</div>
                      <span className="ml-auto"><Badge tone="slate">{filteredItems.length} shown</Badge></span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-12 md:items-center">
                      <div className="relative md:col-span-6">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={itemQ}
                          onChange={(e) => setItemQ(e.target.value)}
                          placeholder="Search item, seller, policy"
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <div className="relative">
                          <select
                            value={itemStatus}
                            onChange={(e) => setItemStatus(e.target.value as ItemStatusFilter)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", "Pending", "On Hold", "Blocked", "Approved"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="relative">
                          <select
                            value={restriction}
                            onChange={(e) => setRestriction(e.target.value as RestrictionFilter)}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["All", ...RESTRICTIONS.map((r) => r.k)].map((s) => (
                              <option key={s} value={s}>
                                {s === "All" ? "All restrictions" : s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
                      <div className="min-w-[980px]">
                        <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                          <div className="col-span-4">Item</div>
                          <div className="col-span-2">Seller</div>
                          <div className="col-span-2">Restriction</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-2 text-right">Actions</div>
                        </div>

                        <div className="divide-y divide-slate-200/70">
                          {filteredItems.map((i) => (
                            <div key={i.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                              <div className="col-span-4 min-w-0">
                                <div className="truncate text-sm font-black text-slate-900">{i.title}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                                  <Badge tone="slate">{i.id}</Badge>
                                  <span>Category: {i.category}</span>
                                  <span>Created {fmtTime(i.createdAt)}</span>
                                </div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500">Policy: {i.policy}</div>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <div className="truncate font-extrabold text-slate-900">{i.seller}</div>
                              </div>
                              <div className="col-span-2 flex items-center gap-2">
                                <Badge tone={restrictionTone(i.restriction)}>
                                  {RESTRICTIONS.find((r) => r.k === i.restriction)?.label || i.restriction}
                                </Badge>
                              </div>
                              <div className="col-span-2 flex items-center gap-2">
                                <Badge tone={i.status === "Blocked" ? "danger" : i.status === "On Hold" ? "orange" : i.status === "Approved" ? "green" : "slate"}>{i.status}</Badge>
                                {(i.evidence || []).length ? <Badge tone="slate">Evidence {i.evidence.length}</Badge> : null}
                              </div>
                              <div className="col-span-2 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItems((s) => s.map((x) => (x.id === i.id ? { ...x, status: "Approved" } : x)));
                                    pushToast({ title: "Approved", message: `${i.id} approved.`, tone: "success" });
                                  }}
                                  className="rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                                  style={{ background: TOKENS.green }}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setItems((s) => s.map((x) => (x.id === i.id ? { ...x, status: "Blocked" } : x)));
                                    pushToast({ title: "Blocked", message: `${i.id} blocked.`, tone: "warning" });
                                  }}
                                  className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-extrabold text-rose-700"
                                >
                                  Block
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDetail("item", i.id)}
                                  className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                                  aria-label="Open"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {filteredItems.length === 0 ? (
                            <div className="p-6">
                              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                                <div className="flex items-start gap-3">
                                  <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                    <Filter className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <div className="text-lg font-black text-slate-900">No results</div>
                                    <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing search text.</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 lg:col-span-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Enforcement ideas</div>
                      <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        { t: "Auto-hold when license expires", d: "Automatically move pharmacy listings to On Hold when the seller license expires." },
                        { t: "Prescription proof flow", d: "Require prescription evidence for Rx items and log verification decisions." },
                        { t: "Age gating", d: "Enforce age checks for restricted OTC products." },
                        { t: "Escalate controlled", d: "Create High severity cases for controlled substances." },
                      ].map((x) => (
                        <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="text-sm font-black text-slate-900">{x.t}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              ) : null}

              {tab === "Policy Rules" ? (
                <div className="grid gap-4 lg:grid-cols-12">
                  <GlassCard className="p-4 lg:col-span-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Policy rules</div>
                      <span className="ml-auto"><Badge tone="slate">{rules.length}</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {rules.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => openDetail("rule", r.id)}
                          className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-start gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">{r.name}</div>
                                <Badge tone={r.enabled ? "green" : "slate"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
                                <span className="ml-auto text-[11px] font-semibold text-slate-500">Edited {fmtTime(r.lastEditedAt)}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge tone="slate">When: {r.when.length}</Badge>
                                <Badge tone="slate">Then: {r.then.length}</Badge>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Super premium rule engine</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Use rules to enforce pharmacy policies consistently across the platform.</div>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-4 lg:col-span-7">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Rule design patterns</div>
                      <span className="ml-auto"><Badge tone="slate">Examples</Badge></span>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {[
                        { t: "Block and escalate", d: "If Controlled, block listing and open High severity case." },
                        { t: "Scope enforcement", d: "If OTC only, block Rx listings automatically." },
                        { t: "Expiry guard", d: "If license expired, hold all pharmacy listings and notify seller." },
                        { t: "Evidence required", d: "If Rx, request prescription proof and log decision." },
                      ].map((x) => (
                        <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="text-sm font-black text-slate-900">{x.t}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              ) : null}

              {tab === "Escalations" ? (
                <div className="grid gap-4 lg:grid-cols-12">
                  <GlassCard className="p-4 lg:col-span-7">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Escalation cases</div>
                      <span className="ml-auto"><Badge tone="slate">{cases.length}</Badge></span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {cases.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => openDetail("case", c.id)}
                          className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", c.severity === "High" ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-orange-700")}>
                              <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">{c.title}</div>
                                <Badge tone={severityTone(c.severity)}>{c.severity}</Badge>
                                <Badge tone={c.status === "Open" ? "orange" : "slate"}>{c.status}</Badge>
                                <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(c.createdAt)}</span>
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500">Related: {c.related} · Assignee: {c.assignee}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge tone="slate">Timeline {c.timeline.length}</Badge>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const id = makeId("CASE").replace("CASE_", "CASE-");
                        const next: EscalationCase = {
                          id,
                          severity: "Medium",
                          status: "Open",
                          title: "Manual escalation (demo)",
                          related: "-",
                          createdAt: new Date().toISOString(),
                          assignee: "Compliance Analyst",
                          timeline: [{ at: new Date().toISOString(), who: "Desk", what: "Case created" }],
                        };
                        setCases((s) => [next, ...s]);
                        pushToast({ title: "Case created", message: id, tone: "success" });
                      }}
                      className="mt-3 w-full rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      Create new escalation
                    </button>
                  </GlassCard>

                  <GlassCard className="p-4 lg:col-span-5">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Escalation playbook</div>
                      <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        { t: "High severity", d: "Controlled substances, suspended licenses, repeat offenders." },
                        { t: "Medium severity", d: "Rx listings with pending license or missing evidence." },
                        { t: "Low severity", d: "Age gating issues, category mismatch, missing disclaimers." },
                      ].map((x) => (
                        <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                          <div className="text-sm font-black text-slate-900">{x.t}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Evidence pack</div>
                        <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Attach invoices, regulator notices, pharmacist certificates and screenshots.</div>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Export", message: "Export evidence pack as PDF (wire to backend).", tone: "default" })}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold text-slate-800"
                      >
                        <FileText className="h-5 w-5" />
                        Export pack
                      </button>
                    </div>
                  </GlassCard>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        title={
          detailKind === "license"
            ? `License · ${activeLicense?.id || ""}`
            : detailKind === "item"
            ? `Restricted item · ${activeItem?.id || ""}`
            : detailKind === "rule"
            ? `Policy rule · ${activeRule?.id || ""}`
            : detailKind === "case"
            ? `Escalation · ${activeCase?.id || ""}`
            : "Details"
        }
        subtitle={
          detailKind === "license" && activeLicense
            ? `${activeLicense.seller} · ${activeLicense.authority}`
            : detailKind === "item" && activeItem
            ? `${activeItem.title}`
            : detailKind === "rule" && activeRule
            ? `Edited ${fmtTime(activeRule.lastEditedAt)}`
            : detailKind === "case" && activeCase
            ? `${activeCase.title}`
            : ""
        }
        onClose={() => setDetailOpen(false)}
      >
        {detailKind === "license" && activeLicense ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeLicense.seller}</div>
                    <Badge tone={statusTone(activeLicense.status)}>{activeLicense.status}</Badge>
                    <Badge tone="slate">{activeLicense.country}</Badge>
                    <span className="ml-auto"><ScorePill score={activeLicense.riskScore} /></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{activeLicense.licenseNo}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="slate">Authority: {activeLicense.authority}</Badge>
                    <Badge tone="slate">Scope: {(activeLicense.scope || []).join(", ")}</Badge>
                    <Badge tone="slate">Expires {fmtTime(activeLicense.expiresAt)}</Badge>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-slate-600">Notes: {activeLicense.notes}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Documents</div>
                <span className="ml-auto"><Badge tone="slate">{(activeLicense.docs || []).length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(activeLicense.docs || []).map((d) => (
                  <div key={d} className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-900">{d}</div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Supplier provided document (demo)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        safeCopy(d);
                        pushToast({ title: "Copied", message: "Filename copied.", tone: "success" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Upload", message: "Upload extra evidence (wire to storage).", tone: "default" })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Upload className="h-5 w-5" />
                Upload evidence
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-[11px] font-extrabold text-slate-600">Verification checklist</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                  <li>Authority exists and matches country</li>
                  <li>License number format valid</li>
                  <li>Scope aligns with listings</li>
                  <li>Expiry is in the future</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="text-[11px] font-extrabold text-orange-900">Escalate when</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                  <li>Expiry mismatch or forged doc signals</li>
                  <li>Suspension notice present</li>
                  <li>Controlled items listed</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setLicenses((s) => s.map((x) => (x.id === activeLicense.id ? { ...x, status: "Verified" } : x)));
                  pushToast({ title: "Verified", message: `${activeLicense.id} verified.`, tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Verify
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = makeId("CASE").replace("CASE_", "CASE-");
                  const next: EscalationCase = {
                    id,
                    severity: "Medium",
                    status: "Open",
                    title: "License verification escalation",
                    related: activeLicense.id,
                    createdAt: new Date().toISOString(),
                    assignee: "Compliance Analyst",
                    timeline: [{ at: new Date().toISOString(), who: "System", what: "Escalated from licensing" }],
                  };
                  setCases((s) => [next, ...s]);
                  pushToast({ title: "Escalated", message: id, tone: "warning", action: { label: "Open case", onClick: () => openDetail("case", id) } });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate
              </button>

              <button
                type="button"
                onClick={() => {
                  setLicenses((s) => s.map((x) => (x.id === activeLicense.id ? { ...x, status: "Suspended" } : x)));
                  pushToast({ title: "Suspended", message: "License marked suspended (demo).", tone: "danger" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
              >
                <X className="h-4 w-4" />
                Suspend
              </button>
            </div>
          </div>
        ) : null}

        {detailKind === "item" && activeItem ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", activeItem.restriction === "Controlled" ? "bg-rose-50 text-rose-700" : "bg-orange-50 text-orange-700")}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeItem.title}</div>
                    <Badge tone={restrictionTone(activeItem.restriction)}>
                      {RESTRICTIONS.find((r) => r.k === activeItem.restriction)?.label || activeItem.restriction}
                    </Badge>
                    <Badge tone={activeItem.status === "Blocked" ? "danger" : activeItem.status === "On Hold" ? "orange" : activeItem.status === "Approved" ? "green" : "slate"}>{activeItem.status}</Badge>
                    <span className="ml-auto text-[11px] font-semibold text-slate-500">Created {fmtTime(activeItem.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Seller: {activeItem.seller} · Category: {activeItem.category}</div>
                  <div className="mt-2 text-xs font-semibold text-slate-600">Policy trigger: {activeItem.policy}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Evidence</div>
                <span className="ml-auto"><Badge tone="slate">{(activeItem.evidence || []).length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {(activeItem.evidence || []).length === 0 ? (
                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="text-sm font-black text-orange-900">No evidence attached</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Request prescription proof or supplier invoice, depending on restriction.</div>
                  </div>
                ) : (
                  (activeItem.evidence || []).map((e) => (
                    <div key={e} className="flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="truncate text-sm font-black text-slate-900">{e}</div>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(e);
                          pushToast({ title: "Copied", message: "Filename copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => pushToast({ title: "Request sent", message: "Requested evidence from seller (demo).", tone: "success" })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Upload className="h-5 w-5" />
                Request evidence
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setItems((s) => s.map((x) => (x.id === activeItem.id ? { ...x, status: "Approved" } : x)));
                  pushToast({ title: "Approved", message: `${activeItem.id} approved.`, tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setItems((s) => s.map((x) => (x.id === activeItem.id ? { ...x, status: "On Hold" } : x)));
                  pushToast({ title: "On Hold", message: "Listing moved to On Hold.", tone: "warning" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-orange-700"
              >
                <Info className="h-4 w-4" />
                Hold
              </button>
              <button
                type="button"
                onClick={() => {
                  setItems((s) => s.map((x) => (x.id === activeItem.id ? { ...x, status: "Blocked" } : x)));
                  pushToast({ title: "Blocked", message: `${activeItem.id} blocked.`, tone: "danger" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-extrabold text-rose-700"
              >
                <X className="h-4 w-4" />
                Block
              </button>
            </div>
          </div>
        ) : null}

        {detailKind === "rule" && ruleDraft ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Rule editor</div>
                <span className="ml-auto"><Badge tone={ruleDraft.enabled ? "green" : "slate"}>{ruleDraft.enabled ? "Enabled" : "Disabled"}</Badge></span>
              </div>

              <div className="mt-3 grid gap-3">
                <div>
                    <div className="text-[11px] font-extrabold text-slate-600">Name</div>
                    <input
                      value={ruleDraft.name}
                      onChange={(e) => updateRuleDraft((s) => ({ ...s, name: e.target.value }))}
                      className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateRuleDraft((s) => ({ ...s, enabled: !s.enabled }))}
                    className={cx(
                      "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                      ruleDraft.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                    )}
                  >
                    {ruleDraft.enabled ? "Enabled" : "Disabled"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      safeCopy(JSON.stringify(ruleDraft, null, 2));
                      pushToast({ title: "Copied", message: "Rule JSON copied.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...ruleDraft, lastEditedAt: new Date().toISOString() };
                      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                      pushToast({ title: "Saved", message: "Rule updated.", tone: "success" });
                    }}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-sm font-black text-slate-900">When</div>
                <div className="mt-2 space-y-2">
                  {ruleDraft.when.map((w, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-xs font-extrabold text-slate-800">{w}</div>
                      <button
                        type="button"
                        onClick={() => updateRuleDraft((s) => ({ ...s, when: s.when.filter((_, i) => i !== idx) }))}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateRuleDraft((s) => ({ ...s, when: [...s.when, "New condition (edit me)"] }))}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    + Add condition
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-sm font-black text-slate-900">Then</div>
                <div className="mt-2 space-y-2">
                  {ruleDraft.then.map((t, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="text-xs font-extrabold text-slate-800">{t}</div>
                      <button
                        type="button"
                        onClick={() => updateRuleDraft((s) => ({ ...s, then: s.then.filter((_, i) => i !== idx) }))}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateRuleDraft((s) => ({ ...s, then: [...s.then, "New action (edit me)"] }))}
                    className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    + Add action
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-orange-900">Policy testing</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Super premium: simulate an item to preview decisions before enabling the rule.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => pushToast({ title: "Simulation", message: "Simulated: 1 listing would be blocked and escalated.", tone: "default" })}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-white dark:bg-slate-900 px-4 py-3 text-sm font-extrabold"
                style={{ color: "#B45309" }}
              >
                Run simulation
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}

        {detailKind === "case" && activeCase ? (
          <div className="space-y-3">
            <div className={cx("rounded-3xl border p-4", activeCase.severity === "High" ? "border-rose-200 bg-rose-50/70" : "border-orange-200 bg-orange-50/70")}>
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{activeCase.title}</div>
                    <Badge tone={severityTone(activeCase.severity)}>{activeCase.severity}</Badge>
                    <Badge tone={activeCase.status === "Open" ? "orange" : "slate"}>{activeCase.status}</Badge>
                    <span className="ml-auto text-[11px] font-semibold text-slate-500">Created {fmtTime(activeCase.createdAt)}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-700">Assignee: {activeCase.assignee}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-700">Related: {activeCase.related}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Timeline</div>
                <span className="ml-auto"><Badge tone="slate">{activeCase.timeline.length}</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {activeCase.timeline.map((t, idx) => (
                  <div key={idx} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">{t.who}</Badge>
                      <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(t.at)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-800">{t.what}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCases((s) =>
                      s.map((c) =>
                        c.id === activeCase.id
                          ? {
                              ...c,
                              status: "In Review",
                              timeline: [{ at: new Date().toISOString(), who: "Desk", what: "Marked In Review" }, ...c.timeline],
                            }
                          : c
                      )
                    );
                    pushToast({ title: "Updated", message: "Case marked In Review.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Mark In Review
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCases((s) =>
                      s.map((c) =>
                        c.id === activeCase.id
                          ? {
                              ...c,
                              status: "Closed",
                              timeline: [{ at: new Date().toISOString(), who: "Desk", what: "Closed" }, ...c.timeline],
                            }
                          : c
                      )
                    );
                    pushToast({ title: "Closed", message: "Case closed.", tone: "default" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!activeLicense && !activeItem && !ruleDraft && !activeCase ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6 text-sm font-semibold text-slate-600">
            Select an item to view details.
          </div>
        ) : null}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
