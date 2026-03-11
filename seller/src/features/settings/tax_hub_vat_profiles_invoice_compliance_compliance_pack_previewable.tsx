import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Filter,
  Globe,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Tax Hub (Previewable)
 * Route: /settings/tax
 * Core:
 * - VAT profiles
 * - Invoice compliance
 * Super premium:
 * - Multi-region support
 * - Exportable compliance pack
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default";
type Toast = { id: string; title: string; message?: string; tone?: ToastTone; action?: { label: string; onClick: () => void } };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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

function fmtPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${Math.round(v * 10) / 10}%`;
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

function Chip({ active, onClick, tone = "green", children }) {
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

function Modal({ open, title, subtitle, onClose, children }) {
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
            className="fixed left-1/2 top-1/2 z-[85] max-h-[90vh] w-[92vw] max-w-[640px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="border-b border-slate-200/70 px-4 py-3">
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
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ToastCenter({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-[95] flex w-[92vw] max-w-[420px] flex-col gap-2">
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

const COUNTRIES = [
  { code: "UG", name: "Uganda" },
  { code: "KE", name: "Kenya" },
  { code: "NG", name: "Nigeria" },
  { code: "ZA", name: "South Africa" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "CN", name: "China" },
];

function buildVatProfiles() {
  const now = Date.now();
  const ago = (mins) => new Date(now - mins * 60_000).toISOString();

  return [
    {
      id: "VAT-UG-001",
      profileName: "UG Standard VAT",
      country: "UG",
      vatId: "UG-1234567",
      standardRate: 18,
      reducedRate: 0,
      status: "Active",
      isDefault: true,
      updatedAt: ago(55),
      notes: "Default VAT profile for domestic sales.",
    },
    {
      id: "VAT-KE-002",
      profileName: "KE VAT",
      country: "KE",
      vatId: "KE-9988123",
      standardRate: 16,
      reducedRate: 8,
      status: "Active",
      isDefault: false,
      updatedAt: ago(220),
      notes: "Supports standard and reduced rate categories.",
    },
    {
      id: "VAT-GB-003",
      profileName: "UK VAT",
      country: "GB",
      vatId: "GB-7711-2233",
      standardRate: 20,
      reducedRate: 5,
      status: "In Review",
      isDefault: false,
      updatedAt: ago(1040),
      notes: "Pending verification.",
    },
  ];
}

function buildPackHistory() {
  const now = Date.now();
  const ago = (mins) => new Date(now - mins * 60_000).toISOString();

  return [
    { id: "PACK-102", scope: "All regions", status: "Ready", createdAt: ago(290), items: 14, size: "6.8 MB" },
    { id: "PACK-101", scope: "UG only", status: "Ready", createdAt: ago(940), items: 11, size: "5.2 MB" },
    { id: "PACK-100", scope: "KE + UG", status: "Expired", createdAt: ago(2880), items: 13, size: "6.1 MB" },
  ];
}

export default function TaxHubPreviewable() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("VAT Profiles");
  const [region, setRegion] = useState("All");

  const [profiles, setProfiles] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [packHistory, setPackHistory] = useState<any[]>([]);
  const hydratedRef = useRef(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = useMemo(() => profiles.find((p) => p.id === editingId) || null, [profiles, editingId]);

  const [draft, setDraft] = useState({
    profileName: "",
    country: "UG",
    vatId: "",
    standardRate: 18,
    reducedRate: 0,
    status: "Active",
    isDefault: false,
    notes: "",
  });

  useEffect(() => {
    if (!editorOpen) return;
    if (!editing) {
      setDraft({
        profileName: "",
        country: "UG",
        vatId: "",
        standardRate: 18,
        reducedRate: 0,
        status: "Active",
        isDefault: false,
        notes: "",
      });
      return;
    }

    setDraft({
      profileName: editing.profileName,
      country: editing.country,
      vatId: editing.vatId,
      standardRate: editing.standardRate,
      reducedRate: editing.reducedRate,
      status: editing.status,
      isDefault: editing.isDefault,
      notes: editing.notes || "",
    });
  }, [editorOpen, editingId]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .filter((p) => (region === "All" ? true : p.country === region))
      .filter((p) => (statusFilter === "All" ? true : p.status === statusFilter))
      .filter((p) => {
        if (!q) return true;
        const hay = [p.id, p.profileName, p.country, p.vatId, p.status].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [profiles, query, region, statusFilter]);

  const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name || code;

  const setDefault = (id) => {
    setProfiles((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
    pushToast({ title: "Default set", message: "VAT profile set as default.", tone: "success" });
  };

  const openNew = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (id) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const saveProfile = () => {
    if (!draft.profileName.trim()) {
      pushToast({ title: "Profile name required", message: "Enter a clear VAT profile name.", tone: "warning" });
      return;
    }
    if (!draft.vatId.trim()) {
      pushToast({ title: "VAT ID required", message: "Add the VAT registration ID for this profile.", tone: "warning" });
      return;
    }

    const payload = {
      ...draft,
      standardRate: Number(draft.standardRate || 0),
      reducedRate: Number(draft.reducedRate || 0),
      updatedAt: new Date().toISOString(),
    };

    setProfiles((prev) => {
      if (editingId) {
        let next = prev.map((p) => (p.id === editingId ? { ...p, ...payload } : p));
        if (payload.isDefault) next = next.map((p) => ({ ...p, isDefault: p.id === editingId }));
        return next;
      }

      const id = `VAT-${payload.country}-${String(Math.floor(Math.random() * 900) + 100)}`;
      let next = [{ id, ...payload }, ...prev];
      if (payload.isDefault) next = next.map((p) => ({ ...p, isDefault: p.id === id }));
      return next;
    });

    setEditorOpen(false);
    pushToast({ title: "Saved", message: "VAT profile saved.", tone: "success" });
  };

  const deleteProfile = (id) => {
    const target = profiles.find((p) => p.id === id);
    if (!target) return;

    setProfiles((prev) => prev.filter((p) => p.id !== id));
    pushToast({
      title: "Deleted",
      message: `${target.profileName} removed.`,
      tone: "default",
      action: {
        label: "Undo",
        onClick: () => setProfiles((prev) => [target, ...prev]),
      },
    });
  };

  // Invoice compliance
  const [invoiceCfg, setInvoiceCfg] = useState({
    legalName: "EVzone Marketplace",
    legalAddress: "Millennium House, Nsambya Road 472, Kampala, Uganda",
    invoiceSeries: "EVZ-INV",
    nextNumber: 12039,
    includeVatId: true,
    requireBuyerTaxIdForB2B: true,
    showPaymentRail: true,
    enableCreditNotes: true,
    enableEinvoicing: false,
  });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getTaxSettings();
        if (!active) return;
        setProfiles(Array.isArray(payload.profiles) ? payload.profiles as any[] : []);
        setPackHistory(Array.isArray((payload.metadata as Record<string, unknown> | undefined)?.packHistory) ? ((payload.metadata as Record<string, unknown>).packHistory as any[]) : Array.isArray(payload.reports) ? payload.reports as any[] : []);
        setInvoiceCfg((current) => ({ ...current, ...(((payload.metadata as Record<string, unknown> | undefined)?.invoiceCfg as Record<string, unknown> | undefined) ?? {}) }));
        hydratedRef.current = true;
      } catch {
        if (!active) return;
        pushToast({ title: "Tax settings unavailable", message: "Could not load tax settings.", tone: "warning" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    void sellerBackendApi.patchTaxSettings({ profiles, reports: packHistory, metadata: { packHistory, invoiceCfg } });
  }, [profiles, packHistory, invoiceCfg]);

  const complianceSignals = useMemo(() => {
    const issues: string[] = [];
    if (!invoiceCfg.legalName.trim()) issues.push("Missing legal entity name");
    if (!invoiceCfg.legalAddress.trim()) issues.push("Missing legal entity address");
    if (!invoiceCfg.invoiceSeries.trim()) issues.push("Missing invoice series");
    if (!Number(invoiceCfg.nextNumber)) issues.push("Next invoice number not set");
    if (invoiceCfg.enableEinvoicing && region === "All") issues.push("E-invoicing enabled but no region selected");

    return {
      issues,
      ok: issues.length === 0,
      hint: issues.length ? "Fix issues to improve compliance readiness." : "Invoice settings look compliant.",
    };
  }, [invoiceCfg, region]);

  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);

  // Multi-region
  const regionCards = useMemo(() => {
    const by = new Map();
    profiles.forEach((p) => by.set(p.country, (by.get(p.country) || 0) + 1));
    return COUNTRIES.map((c) => ({
      ...c,
      profiles: by.get(c.code) || 0,
      status: c.code === "UG" ? "Ready" : c.code === "KE" ? "Ready" : "Setup",
      notes:
        c.code === "UG"
          ? "Default region"
          : c.code === "KE"
          ? "B2B ready"
          : "Add VAT ID and invoice rules",
    }));
  }, [profiles]);

  const cloneToRegion = (fromId, toCountry) => {
    const src = profiles.find((p) => p.id === fromId);
    if (!src) return;

    const copyId = `VAT-${toCountry}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const next = {
      ...src,
      id: copyId,
      country: toCountry,
      profileName: `${src.profileName} (${toCountry})`,
      isDefault: false,
      status: "In Review",
      updatedAt: new Date().toISOString(),
      notes: "Cloned from another region. Verify before activating.",
    };

    setProfiles((prev) => [next, ...prev]);
    pushToast({ title: "Cloned", message: `Copied to ${countryName(toCountry)}.`, tone: "success" });
  };

  // Compliance pack
  const [packBusy, setPackBusy] = useState(false);

  const packItems = useMemo(
    () => [
      { k: "VAT registrations", desc: "Profiles, IDs, rates, effective dates" },
      { k: "Invoice templates", desc: "Series, fields, numbering rules" },
      { k: "Sample invoices", desc: "PDF previews and required fields" },
      { k: "Tax controls", desc: "B2B rules, reverse charge, exemptions" },
      { k: "Audit trail", desc: "Configuration changes and admin actions" },
    ],
    []
  );

  const generatePack = async () => {
    setPackBusy(true);
    pushToast({ title: "Generating pack", message: "Preparing compliance documents (demo).", tone: "default" });

    await new Promise((r) => setTimeout(r, 850));

    const pack = {
      id: `PACK-${Math.floor(Math.random() * 900) + 200}`,
      scope: region === "All" ? "All regions" : `${region} only`,
      status: "Ready",
      createdAt: new Date().toISOString(),
      items: packItems.length + 9,
      size: "7.1 MB",
    };

    setPackHistory((prev) => [pack, ...prev].slice(0, 12));
    setPackBusy(false);

    pushToast({
      title: "Compliance pack ready",
      message: `${pack.id} generated.`,
      tone: "success",
      action: {
        label: "Copy pack ID",
        onClick: () => safeCopy(pack.id),
      },
    });
  };

  const tabs = [
    { k: "VAT Profiles", tone: "green", badge: "Core" },
    { k: "Invoice Compliance", tone: "green", badge: "Core" },
    { k: "Multi-region", tone: "orange", badge: "Super premium" },
    { k: "Compliance Pack", tone: "orange", badge: "Super premium" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Tax Hub</div>
                <Badge tone="slate">/settings/tax</Badge>
                <Badge tone="slate">Settings</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                VAT profiles, invoice compliance, multi-region configuration, and exportable compliance packs.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Saved", message: "Tax settings saved (demo).", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Check className="h-4 w-4" />
                Save
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire exports to PDF/CSV.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tabs.map((t) => (
              <Chip key={t.k} active={tab === t.k} onClick={() => setTab(t.k)} tone={t.tone}>
                {t.k}
                <span className="ml-2 text-slate-500">{t.badge}</span>
              </Chip>
            ))}

            <span className="ml-auto flex items-center gap-2">
              <Badge tone="slate">Region</Badge>
              <div className="relative">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800"
                >
                  <option value="All">All</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </span>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.16 }}
          >
            {tab === "VAT Profiles" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <GlassCard className="p-4 lg:col-span-8">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">VAT profiles</div>
                      <Badge tone="slate">{filteredProfiles.length}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={openNew}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Plus className="h-4 w-4" />
                        Add VAT profile
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-center">
                    <div className="relative md:col-span-7">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search profile, VAT ID, country"
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="md:col-span-5">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <div className="text-xs font-extrabold text-slate-700">Status</div>
                        <div className="relative ml-auto">
                          <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                          >
                            {["All", "Active", "In Review", "Inactive"].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                      <div className="col-span-4">Profile</div>
                      <div className="col-span-2">Region</div>
                      <div className="col-span-2">VAT ID</div>
                      <div className="col-span-2">Rates</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-200/70">
                      {filteredProfiles.map((p) => (
                        <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{p.profileName}</div>
                              {p.isDefault ? <Badge tone="green">Default</Badge> : null}
                              <Badge tone={p.status === "Active" ? "green" : p.status === "In Review" ? "orange" : "slate"}>{p.status}</Badge>
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">Updated {fmtTime(p.updatedAt)}</div>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <Badge tone="slate">{p.country}</Badge>
                            <span className="ml-2 text-[11px] font-semibold text-slate-500">{countryName(p.country)}</span>
                          </div>

                          <div className="col-span-2 flex items-center">
                            <span className="font-extrabold text-slate-900">{p.vatId}</span>
                          </div>

                          <div className="col-span-2 flex items-center gap-2">
                            <Badge tone="slate">Std {fmtPct(p.standardRate)}</Badge>
                            <Badge tone="slate">Red {fmtPct(p.reducedRate)}</Badge>
                          </div>

                          <div className="col-span-2 flex items-center justify-end gap-2">
                            {!p.isDefault ? (
                              <button
                                type="button"
                                onClick={() => setDefault(p.id)}
                                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800"
                              >
                                Set default
                              </button>
                            ) : (
                              <span className="rounded-2xl border border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-[11px] font-extrabold text-slate-500">Default</span>
                            )}

                            <button
                              type="button"
                              onClick={() => openEdit(p.id)}
                              className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteProfile(p.id)}
                              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-extrabold text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredProfiles.length === 0 ? (
                        <div className="p-6">
                          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                            <div className="flex items-start gap-3">
                              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                                <Filter className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="text-lg font-black text-slate-900">No profiles found</div>
                                <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or add a new VAT profile.</div>
                                <button
                                  type="button"
                                  onClick={openNew}
                                  className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                  style={{ background: TOKENS.green }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Add VAT profile
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">VAT readiness</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Core controls to keep invoicing compliant.</div>
                    </div>
                    <Badge tone="slate">Core</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-emerald-900">Invoice compliance</div>
                          <div className="mt-1 text-xs font-semibold text-emerald-900/70">Your VAT profiles feed invoice fields automatically.</div>
                          <button
                            type="button"
                            onClick={() => setTab("Invoice Compliance")}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                            style={{ color: "#047857" }}
                          >
                            Open invoice compliance
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Super premium</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Multi-region VAT and exportable compliance packs.</div>
                          <button
                            type="button"
                            onClick={() => setTab("Compliance Pack")}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                            style={{ color: "#B45309" }}
                          >
                            Open compliance pack
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Quick checklist</div>
                        <span className="ml-auto"><Badge tone="slate">Best practice</Badge></span>
                      </div>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                        <li>Set a single default VAT profile per seller entity</li>
                        <li>Ensure invoice numbering is consistent and sequential</li>
                        <li>Verify tax fields for B2B and exports per region</li>
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "Invoice Compliance" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <GlassCard className="p-5 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Invoice compliance</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Core settings and validation checks.</div>
                    </div>
                    <Badge tone="slate">Core</Badge>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Legal entity name">
                        <input
                          value={invoiceCfg.legalName}
                          onChange={(e) => setInvoiceCfg((s) => ({ ...s, legalName: e.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </Field>
                      <Field label="Invoice series">
                        <input
                          value={invoiceCfg.invoiceSeries}
                          onChange={(e) => setInvoiceCfg((s) => ({ ...s, invoiceSeries: e.target.value }))}
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </Field>
                    </div>

                    <Field label="Legal address">
                      <textarea
                        value={invoiceCfg.legalAddress}
                        onChange={(e) => setInvoiceCfg((s) => ({ ...s, legalAddress: e.target.value }))}
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                      />
                    </Field>

                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Next invoice number">
                        <input
                          value={String(invoiceCfg.nextNumber)}
                          onChange={(e) => setInvoiceCfg((s) => ({ ...s, nextNumber: Number(e.target.value) }))}
                          className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
                        />
                      </Field>

                      <Field label="Include VAT ID">
                        <Toggle
                          value={invoiceCfg.includeVatId}
                          onChange={(v) => setInvoiceCfg((s) => ({ ...s, includeVatId: v }))}
                        />
                      </Field>

                      <Field label="Credit notes">
                        <Toggle
                          value={invoiceCfg.enableCreditNotes}
                          onChange={(v) => setInvoiceCfg((s) => ({ ...s, enableCreditNotes: v }))}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Require buyer tax ID (B2B)">
                        <Toggle
                          value={invoiceCfg.requireBuyerTaxIdForB2B}
                          onChange={(v) => setInvoiceCfg((s) => ({ ...s, requireBuyerTaxIdForB2B: v }))}
                        />
                      </Field>
                      <Field label="Show payment rail">
                        <Toggle
                          value={invoiceCfg.showPaymentRail}
                          onChange={(v) => setInvoiceCfg((s) => ({ ...s, showPaymentRail: v }))}
                        />
                      </Field>
                      <Field label="E-invoicing">
                        <Toggle
                          value={invoiceCfg.enableEinvoicing}
                          onChange={(v) => setInvoiceCfg((s) => ({ ...s, enableEinvoicing: v }))}
                          tone="orange"
                        />
                      </Field>
                    </div>

                    <div className={cx("rounded-3xl border p-4", complianceSignals.ok ? "border-emerald-200 bg-emerald-50/60" : "border-orange-200 bg-orange-50/70")}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cx("grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900", complianceSignals.ok ? "text-emerald-700" : "text-orange-700")}>
                          {complianceSignals.ok ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={cx("text-sm font-black", complianceSignals.ok ? "text-emerald-900" : "text-orange-900")}>
                            {complianceSignals.ok ? "Compliance ready" : "Compliance issues"}
                          </div>
                          <div className={cx("mt-1 text-xs font-semibold", complianceSignals.ok ? "text-emerald-900/70" : "text-orange-900/70")}>
                            {complianceSignals.hint}
                          </div>
                          {!complianceSignals.ok ? (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                              {complianceSignals.issues.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setInvoicePreviewOpen(true)}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <FileText className="h-4 w-4" />
                              Preview invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Template", message: "Wire custom invoice templates here.", tone: "default" })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Settings className="h-4 w-4" />
                              Templates
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Invoice policy tips</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Practical compliance defaults.</div>
                    </div>
                    <Badge tone="slate">Guide</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      { t: "Numbering", d: "Keep invoice numbers sequential and never reuse numbers." },
                      { t: "B2B fields", d: "Require buyer tax ID for B2B where applicable." },
                      { t: "VAT visibility", d: "Always display VAT ID and legal address on invoices." },
                      { t: "Credit notes", d: "Enable credit notes to handle returns and adjustments." },
                    ].map((x) => (
                      <div key={x.t} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="text-sm font-black text-slate-900">{x.t}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{x.d}</div>
                      </div>
                    ))}

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Super premium</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">E-invoicing, multi-region templates, and exportable compliance packs.</div>
                          <button
                            type="button"
                            onClick={() => setTab("Compliance Pack")}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                            style={{ color: "#B45309" }}
                          >
                            Open compliance pack
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "Multi-region" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <GlassCard className="p-5 lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Multi-region support</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Manage VAT and invoice readiness across countries.</div>
                    </div>
                    <Badge tone="orange">Super premium</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {regionCards.map((c) => (
                      <div key={c.code} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", c.status === "Ready" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700")}>
                            <Globe className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-black text-slate-900">{c.name}</div>
                              <Badge tone="slate">{c.code}</Badge>
                              <span className="ml-auto"><Badge tone={c.status === "Ready" ? "green" : "orange"}>{c.status}</Badge></span>
                            </div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{c.notes}</div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge tone="slate">VAT profiles {c.profiles}</Badge>
                              <button
                                type="button"
                                onClick={() => {
                                  setRegion(c.code);
                                  setTab("VAT Profiles");
                                }}
                                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                              >
                                Open
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                              <div className="text-[11px] font-extrabold text-slate-600">Quick action</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const src = profiles.find((p) => p.isDefault) || profiles[0];
                                    if (!src) {
                                      pushToast({ title: "No source profile", message: "Create a VAT profile first.", tone: "warning" });
                                      return;
                                    }
                                    cloneToRegion(src.id, c.code);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white"
                                  style={{ background: TOKENS.orange }}
                                >
                                  <CopyIcon />
                                  Clone default VAT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => pushToast({ title: "Rules", message: "Wire cross-border rules here.", tone: "default" })}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  Rules
                                </button>
                              </div>
                              <div className="mt-2 text-[11px] font-semibold text-slate-500">Premium: reverse charge, exemptions, OSS and threshold logic.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Multi-region controls</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Keep configs consistent across regions.</div>
                    </div>
                    <Badge tone="orange">Super premium</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Policy layers</div>
                      </div>
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                        <li>Per-country VAT ID and rates</li>
                        <li>Invoice template variants per region</li>
                        <li>Buyer type rules: B2B vs B2C</li>
                        <li>Cross-border handling</li>
                      </ul>
                    </div>

                    <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Download className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Export compliance pack</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Generate a document bundle for auditors, banks, and partners.</div>
                          <button
                            type="button"
                            onClick={() => setTab("Compliance Pack")}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold"
                            style={{ color: "#B45309" }}
                          >
                            Open pack generator
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "Compliance Pack" ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <GlassCard className="p-5 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Exportable compliance pack</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Bundle tax and invoice evidence for multi-region operations.</div>
                    </div>
                    <Badge tone="orange">Super premium</Badge>
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Pack contents</div>
                      <span className="ml-auto"><Badge tone="slate">{packItems.length}</Badge></span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {packItems.map((x) => (
                        <div key={x.k} className="flex items-start justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                          <div>
                            <div className="text-sm font-black text-slate-900">{x.k}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">{x.desc}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => pushToast({ title: "Included", message: x.k, tone: "success" })}
                            className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                          >
                            Included
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={generatePack}
                        disabled={packBusy}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white",
                          packBusy && "opacity-70"
                        )}
                        style={{ background: TOKENS.orange }}
                      >
                        <Download className="h-4 w-4" />
                        {packBusy ? "Generating" : "Generate pack"}
                      </button>
                      <button
                        type="button"
                        onClick={() => pushToast({ title: "Upload", message: "Attach extra evidence docs here.", tone: "default" })}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Upload className="h-4 w-4" />
                        Add evidence
                      </button>
                    </div>

                    <div className="mt-2 text-[11px] font-semibold text-slate-500">Scope is based on your region selector. Use "All" for multi-region exports.</div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Pack history</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Ready packs can be shared with partners.</div>
                    </div>
                    <Badge tone="slate">{packHistory.length}</Badge>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                    <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                      <div className="col-span-4">Pack</div>
                      <div className="col-span-4">Scope</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-200/70">
                      {packHistory.map((p) => (
                        <div key={p.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                          <div className="col-span-4">
                            <div className="text-sm font-black text-slate-900">{p.id}</div>
                            <div className="mt-1 text-[11px] font-semibold text-slate-500">{fmtTime(p.createdAt)} · {p.items} items · {p.size}</div>
                          </div>
                          <div className="col-span-4 flex items-center text-slate-700">{p.scope}</div>
                          <div className="col-span-2 flex items-center">
                            <Badge tone={p.status === "Ready" ? "green" : p.status === "Expired" ? "danger" : "slate"}>{p.status}</Badge>
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                safeCopy(p.id);
                                pushToast({ title: "Copied", message: "Pack ID copied.", tone: "success" });
                              }}
                              className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-extrabold text-slate-800"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => pushToast({ title: "Download", message: "Wire pack download.", tone: "default" })}
                              className={cx(
                                "rounded-2xl px-3 py-2 text-[11px] font-extrabold text-white",
                                p.status !== "Ready" && "opacity-60"
                              )}
                              style={{ background: TOKENS.green }}
                              disabled={p.status !== "Ready"}
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Privacy note</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">
                          Compliance packs should not include buyer payment limits or internal risk thresholds.
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* VAT Profile Editor */}
      <Modal
        open={editorOpen}
        title={editingId ? "Edit VAT profile" : "Add VAT profile"}
        subtitle="Core: VAT profiles. Use one default profile per seller entity."
        onClose={() => setEditorOpen(false)}
      >
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Profile name" required>
              <input
                value={draft.profileName}
                onChange={(e) => setDraft((s) => ({ ...s, profileName: e.target.value }))}
                placeholder="e.g., UG Standard VAT"
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
            </Field>

            <Field label="Country" required>
              <div className="relative">
                <select
                  value={draft.country}
                  onChange={(e) => setDraft((s) => ({ ...s, country: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>
          </div>

          <Field label="VAT registration ID" required>
            <input
              value={draft.vatId}
              onChange={(e) => setDraft((s) => ({ ...s, vatId: e.target.value }))}
              placeholder="e.g., UG-1234567"
              className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Standard rate (%)">
              <input
                value={String(draft.standardRate)}
                onChange={(e) => setDraft((s) => ({ ...s, standardRate: Number(e.target.value) }))}
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
            </Field>
            <Field label="Reduced rate (%)">
              <input
                value={String(draft.reducedRate)}
                onChange={(e) => setDraft((s) => ({ ...s, reducedRate: Number(e.target.value) }))}
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none"
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Status">
              <div className="relative">
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((s) => ({ ...s, status: e.target.value }))}
                  className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-sm font-semibold text-slate-800"
                >
                  {["Active", "In Review", "Inactive"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </Field>

            <Field label="Default">
              <Toggle value={!!draft.isDefault} onChange={(v) => setDraft((s) => ({ ...s, isDefault: v }))} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((s) => ({ ...s, notes: e.target.value }))}
              rows={3}
              placeholder="Optional notes for this VAT profile"
              className="w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                safeCopy(JSON.stringify(draft, null, 2));
                pushToast({ title: "Copied", message: "Draft JSON copied.", tone: "success" });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
            >
              <ClipboardList className="h-4 w-4" />
              Copy JSON
            </button>

            <button
              type="button"
              onClick={() => setEditorOpen(false)}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            <button
              type="button"
              onClick={saveProfile}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice preview drawer */}
      <Drawer
        open={invoicePreviewOpen}
        title="Invoice preview"
        subtitle="Preview invoice compliance fields with your current settings."
        onClose={() => setInvoicePreviewOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Sample invoice</div>
              <span className="ml-auto"><Badge tone="slate">Demo</Badge></span>
            </div>
            <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{invoiceCfg.legalName || "Legal name"}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">{invoiceCfg.legalAddress || "Legal address"}</div>
                  {invoiceCfg.includeVatId ? (
                    <div className="mt-2 text-xs font-semibold text-slate-700">
                      VAT ID: <span className="font-black">{profiles.find((p) => p.isDefault)?.vatId || "Not set"}</span>
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-500">Invoice</div>
                  <div className="mt-1 text-sm font-black text-slate-900">
                    {invoiceCfg.invoiceSeries}-{invoiceCfg.nextNumber}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-500">Date {fmtTime(new Date().toISOString())}</div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 bg-gray-50 dark:bg-slate-950 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-2">Line</div>
                </div>
                {[{ name: "Service fee", qty: 1, unit: 120 }, { name: "Accessories", qty: 2, unit: 35 }].map((x) => (
                  <div key={x.name} className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-700">
                    <div className="col-span-6 font-black text-slate-900">{x.name}</div>
                    <div className="col-span-2">{x.qty}</div>
                    <div className="col-span-2">{x.unit}</div>
                    <div className="col-span-2 font-black text-slate-900">{x.qty * x.unit}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Buyer</div>
                  <div className="mt-1 text-sm font-black text-slate-900">Organization Buyer</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Tax ID required: {invoiceCfg.requireBuyerTaxIdForB2B ? "Yes" : "No"}</div>
                </div>
                <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-[11px] font-extrabold text-slate-600">Payment</div>
                  <div className="mt-1 text-sm font-black text-slate-900">CorporatePay</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Show rail: {invoiceCfg.showPaymentRail ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.orange }}
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvoiceCfg((s) => ({ ...s, nextNumber: Number(s.nextNumber || 0) + 1 }));
                  pushToast({ title: "Number advanced", message: "Next invoice number incremented.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                Advance number
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-black text-orange-900">Super premium preview</div>
                <div className="mt-1 text-xs font-semibold text-orange-900/70">Add region-specific invoice templates and e-invoicing integrations.</div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold text-slate-600">
        {label}
        {required ? <span className="ml-1 text-rose-600">*</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, tone = "green" }) {
  const on = !!value;
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx(
        "inline-flex h-11 w-full items-center justify-between rounded-2xl border px-3 text-sm font-extrabold transition",
        on ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
      )}
    >
      <span>{on ? "Enabled" : "Disabled"}</span>
      <span className={cx("h-5 w-9 rounded-full p-0.5", on ? (tone === "orange" ? "bg-orange-200" : "bg-emerald-200") : "bg-slate-200")}>
        <span className={cx("block h-4 w-4 rounded-full bg-white dark:bg-slate-900 transition", on ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 9h10v10H9V9z" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
