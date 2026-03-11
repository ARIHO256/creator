import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  Filter,
  Handshake,
  History,
  Info,
  Layers,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Templates Hub (Previewable)
 * Route: /templates
 * Core: Quote templates, Message templates, Contract templates, Listing templates
 * Super premium: Versioning + Approvals
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

type TemplateType = "quote" | "message" | "contract" | "listing";
type TemplateStatus = "Active" | "Draft" | "Archived";
type ApprovalState = "approved" | "pending" | "rejected" | "draft";
type TemplateApprovalAction = "approved" | "rejected" | "submitted" | "reset" | "duplicated" | "requested";
type TemplateApproval = { id: string; at: string; actor: string; action: TemplateApprovalAction; note: string };
type TemplateSnapshot = { name: string; description: string; tags: string[]; content: string };
type TemplateVersion = { id: string; number: number; at: string; actor: string; note: string; snapshot: TemplateSnapshot };
type Template = {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  status: TemplateStatus;
  approvalState: ApprovalState;
  tags: string[];
  owner: string;
  updatedAt: string;
  createdAt: string;
  usage: number;
  requireApproval: boolean;
  content: string;
  approvals: TemplateApproval[];
  versions: TemplateVersion[];
};

type BadgeProps = { children: React.ReactNode; tone?: BadgeTone };
type GlassCardProps = { children: React.ReactNode; className?: string };
type IconButtonProps = { label: string; onClick: () => void; children: React.ReactNode };
type ChipProps = { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "green" | "orange" };
type SegTabProps = { label: string; active: boolean; onClick: () => void };
type DrawerProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
type ModalProps = { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode };
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

function SegTab({ label, active, onClick }: SegTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {label}
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
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[820px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
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

function Modal({ open, title, subtitle, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed left-1/2 top-1/2 z-[95] max-h-[90vh] w-[92vw] max-w-[760px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 p-4">
                <div>
                  <div className="text-sm font-black text-slate-900">{title}</div>
                  {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                </div>
                <IconButton label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
              <div className="border-t border-slate-200/70 p-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
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

function ToastCenter({ toasts, dismiss }: ToastCenterProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[110] flex w-[92vw] max-w-[420px] flex-col gap-2">
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

function typeMeta(type: TemplateType) {
  if (type === "quote") return { label: "Quote", icon: FileText, tone: "slate" as const };
  if (type === "message") return { label: "Message", icon: MessageCircle, tone: "slate" as const };
  if (type === "contract") return { label: "Contract", icon: Handshake, tone: "slate" as const };
  return { label: "Listing", icon: Package, tone: "slate" as const };
}

function statusTone(status: TemplateStatus) {
  if (status === "Active") return "green";
  if (status === "Archived") return "danger";
  return "slate";
}

function approvalTone(state: ApprovalState) {
  if (state === "approved") return "green";
  if (state === "pending") return "orange";
  if (state === "rejected") return "danger";
  return "slate";
}

function renderSample(templateBody: string) {
  const sample = {
    buyer_name: "Amina",
    rfq_id: "RFQ-4101",
    order_id: "ORD-10512",
    amount: "USD 2,480",
    company: "EVzone",
    sku: "CHG-7KW-WBX",
  };

  let out = String(templateBody || "");
  Object.entries(sample).forEach(([k, v]) => {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v);
  });
  return out;
}

function seedTemplates(): Template[] {
  const now = Date.now();
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();

  const mk = (t: Omit<Template, "id" | "requireApproval" | "approvals" | "versions"> & { approvals?: TemplateApproval[]; versions?: TemplateVersion[] }) => {
    const base = {
      id: makeId("tpl"),
      name: t.name,
      description: t.description,
      type: t.type,
      status: t.status,
      approvalState: t.approvalState,
      tags: t.tags,
      owner: t.owner,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
      usage: t.usage,
      requireApproval: true,
      content: t.content,
      approvals: t.approvals || [],
      versions: t.versions || [],
    };

    // initial version
    const v: TemplateVersion = {
      id: makeId("ver"),
      number: 1,
      at: base.createdAt,
      actor: base.owner,
      note: "Initial version",
      snapshot: {
        name: base.name,
        description: base.description,
        tags: base.tags,
        content: base.content,
      },
    };

    base.versions = [v];

    // If approved, add an approval event
    if (base.approvalState === "approved") {
      base.approvals = [
        {
          id: makeId("ap"),
          at: ago(220),
          actor: "Manager",
          action: "approved",
          note: "Approved for use",
        },
      ];
    }

    return base;
  };

  return [
    mk({
      name: "Wholesale RFQ Reply - EV Chargers",
      description: "RFQ reply template with pricing and lead time placeholders.",
      type: "quote",
      status: "Active",
      approvalState: "approved",
      tags: ["wholesale", "rfq", "chargers"],
      owner: "SellerSeller",
      createdAt: ago(3500),
      updatedAt: ago(140),
      usage: 86,
      content:
        "Hello {{buyer_name}},\n\nThank you for RFQ {{rfq_id}}. Below is our quotation summary:\n- Item: {{sku}}\n- Total: {{amount}}\n- Lead time: 14 to 21 days\n\nWe can share full line pricing, warranties, and Incoterms on request.\n\nRegards,\n{{company}}",
    }),
    mk({
      name: "Order Update - Tracking Pending",
      description: "Buyer message for orders that are shipped but tracking is not yet shared.",
      type: "message",
      status: "Active",
      approvalState: "approved",
      tags: ["orders", "support", "tracking"],
      owner: "SellerSeller",
      createdAt: ago(2900),
      updatedAt: ago(60),
      usage: 214,
      content:
        "Hi {{buyer_name}},\n\nQuick update on order {{order_id}}: your shipment is prepared and will be handed to the carrier shortly.\nWe will share tracking as soon as it is issued.\n\nThank you,\n{{company}}",
    }),
    mk({
      name: "Creator Collab Contract - Revenue Share",
      description: "Contract template for creator promotion with revenue share.",
      type: "contract",
      status: "Draft",
      approvalState: "draft",
      tags: ["mldz", "creator", "contract"],
      owner: "LegalOps",
      createdAt: ago(900),
      updatedAt: ago(45),
      usage: 3,
      content:
        "CONTRACT SUMMARY\n\nParties: {{company}} and Creator ({{buyer_name}})\nScope: Creator promotes agreed items and links.\nCommercials: Revenue share model applies per campaign terms.\nPayment: Settled after completion and approvals.\n\nSignatures\n- {{company}}\n- Creator",
    }),
    mk({
      name: "EVmart Product Listing - Charger",
      description: "Listing template for charger products with minimum required fields.",
      type: "listing",
      status: "Active",
      approvalState: "pending",
      tags: ["listing", "evmart", "product"],
      owner: "CatalogTeam",
      createdAt: ago(1200),
      updatedAt: ago(18),
      usage: 44,
      content:
        "LISTING TEMPLATE\n\nTitle: {{sku}} - 7kW Wallbox Charger\nHighlights:\n- OCPP ready\n- RFID access\n- Smart scheduling\n\nDescription:\nAdd full specs, warranty, and shipping profile.\n\nPricing:\nRetail and wholesale tiers (MOQ)\n\nCompliance:\nUpload certificates where required.",
      approvals: [
        {
          id: makeId("ap"),
          at: ago(30),
          actor: "CatalogTeam",
          action: "submitted",
          note: "Submitted for approval",
        },
      ],
    }),
  ];
}

function templateTokensByType(type: TemplateType) {
  const common = ["{{buyer_name}}", "{{company}}"];
  if (type === "quote") return [...common, "{{rfq_id}}", "{{amount}}", "{{sku}}"];
  if (type === "message") return [...common, "{{order_id}}", "{{amount}}"];
  if (type === "contract") return [...common, "{{buyer_name}}", "{{amount}}"];
  return [...common, "{{sku}}"];
}

function mapBackendTemplate(raw: Record<string, unknown>): Template {
  const metadata = raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
  const payload = raw.payload && typeof raw.payload === "object" ? (raw.payload as Record<string, unknown>) : {};
  const kind = String(raw.kind || "quote").toLowerCase();
  return {
    id: String(raw.id || makeId("tpl")),
    name: String(raw.name || ""),
    description: String(raw.notes || payload.description || ""),
    type: kind === "message" || kind === "contract" || kind === "listing" ? (kind as TemplateType) : "quote",
    status: String(raw.status || "ACTIVE") === "ARCHIVED" ? "Archived" : String(metadata.approvalState || "draft") === "draft" ? "Draft" : "Active",
    approvalState: ["approved", "pending", "rejected", "draft"].includes(String(metadata.approvalState || "").toLowerCase())
      ? (String(metadata.approvalState).toLowerCase() as ApprovalState)
      : "draft",
    tags: Array.isArray(payload.tags) ? payload.tags.map((tag) => String(tag)) : [],
    owner: String(metadata.owner || "SellerSeller"),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    usage: Number(metadata.usage || 0),
    requireApproval: Boolean(metadata.requireApproval ?? true),
    content: String(payload.content || ""),
    approvals: Array.isArray(metadata.approvals) ? (metadata.approvals as TemplateApproval[]) : [],
    versions: Array.isArray(metadata.versions) ? (metadata.versions as TemplateVersion[]) : [],
  };
}

function serializeTemplate(template: Template) {
  return {
    name: template.name,
    kind: template.type,
    notes: template.description,
    status: template.status === "Archived" ? "ARCHIVED" : "ACTIVE",
    payload: {
      content: template.content,
      description: template.description,
      tags: template.tags,
    },
    metadata: {
      approvalState: template.approvalState,
      owner: template.owner,
      usage: template.usage,
      requireApproval: template.requireApproval,
      approvals: template.approvals,
      versions: template.versions,
    },
  };
}

export default function TemplatesHubPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await sellerBackendApi.getCatalogTemplates();
        if (cancelled) return;
        const rows = Array.isArray(payload.templates) ? payload.templates : [];
        setTemplates(rows.map((row) => mapBackendTemplate(row as Record<string, unknown>)));
      } catch {
        if (!cancelled) {
          setTemplates(seedTemplates());
          pushToast({ title: "Backend unavailable", message: "Loaded seeded templates.", tone: "warning" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [approval, setApproval] = useState("All");
  const [sort, setSort] = useState("Updated");

  const counts = useMemo(() => {
    const base = { All: templates.length, Quote: 0, Message: 0, Contract: 0, Listing: 0 };
    templates.forEach((t) => {
      const m = typeMeta(t.type).label;
      base[m] += 1;
    });
    return base;
  }, [templates]);

  const stats = useMemo(() => {
    const approved = templates.filter((t) => t.approvalState === "approved").length;
    const pending = templates.filter((t) => t.approvalState === "pending").length;
    const usage = templates.reduce((s, t) => s + Number(t.usage || 0), 0);
    const mostUsed = [...templates].sort((a, b) => Number(b.usage || 0) - Number(a.usage || 0))[0];
    return { approved, pending, usage, mostUsed };
  }, [templates]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = [...templates];

    if (tab !== "All") {
      const mapped = tab.toLowerCase();
      list = list.filter((t) => typeMeta(t.type).label === tab);
      // mapped unused, kept for readability
      void mapped;
    }

    if (status !== "All") list = list.filter((t) => t.status === status);
    if (approval !== "All") list = list.filter((t) => t.approvalState === approval);

    if (query) {
      list = list.filter((t) => {
        const hay = [t.name, t.description, t.type, t.status, t.approvalState, (t.tags || []).join(" "), t.owner].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }

    if (sort === "Updated") list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (sort === "Usage") list.sort((a, b) => Number(b.usage || 0) - Number(a.usage || 0));
    if (sort === "Name") list.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    return list;
  }, [templates, q, tab, status, approval, sort]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(() => templates.find((t) => t.id === activeId) || null, [templates, activeId]);

  const [draft, setDraft] = useState<Template | null>(null);
  const updateDraft = (updater: (current: Template) => Template) => {
    setDraft((s) => (s ? updater(s) : s));
  };
  const [drawerTab, setDrawerTab] = useState("Editor");
  const [approveNote, setApproveNote] = useState("");

  const [versionPreviewOpen, setVersionPreviewOpen] = useState(false);
  const [versionPreview, setVersionPreview] = useState<TemplateVersion | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    setDrawerTab("Editor");
    setApproveNote("");

    if (!activeId) {
      // New template draft
      const n: Template = {
        id: makeId("tpl"),
        name: "",
        description: "",
        type: "quote",
        status: "Draft",
        approvalState: "draft",
        tags: [] as string[],
        owner: "SellerSeller",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usage: 0,
        requireApproval: true,
        content: "",
        approvals: [] as TemplateApproval[],
        versions: [] as TemplateVersion[],
      };
      setDraft(n);
      return;
    }

    setDraft(active ? (JSON.parse(JSON.stringify(active)) as Template) : null);
  }, [drawerOpen, activeId]);

  const openNew = () => {
    setActiveId(null);
    setDrawerOpen(true);
  };

  const openEdit = (id: string) => {
    setActiveId(id);
    setDrawerOpen(true);
  };

  const saveTemplate = async () => {
    if (!draft) return;

    const isNew = !templates.some((t) => t.id === draft.id);
    const now = new Date().toISOString();

    // Versioning (super premium)
    const nextVersions = Array.isArray(draft.versions) ? [...draft.versions] : [];
    const nextNumber = nextVersions.length ? Math.max(...nextVersions.map((v) => Number(v.number || 0))) + 1 : 1;

    nextVersions.unshift({
      id: makeId("ver"),
      number: nextNumber,
      at: now,
      actor: "SellerSeller",
      note: isNew ? "Created" : "Saved changes",
      snapshot: {
        name: draft.name,
        description: draft.description,
        tags: draft.tags,
        content: draft.content,
      },
    });

    // If an approved template is modified, it becomes draft again
    const wasApproved = !isNew && (templates.find((t) => t.id === draft.id)?.approvalState === "approved");

    const normalized: Template = {
      ...draft,
      updatedAt: now,
      versions: nextVersions.slice(0, 25),
      approvalState: wasApproved ? "draft" : draft.approvalState,
      approvals: wasApproved
        ? [
            {
              id: makeId("ap"),
              at: now,
              actor: "System",
              action: "reset",
              note: "Changes require re-approval",
            },
            ...(draft.approvals || []),
          ]
        : draft.approvals || [],
    };

    if (!normalized.name.trim()) {
      pushToast({ title: "Name required", message: "Add a template name before saving.", tone: "warning" });
      return;
    }

    try {
      const saved = isNew
        ? await sellerBackendApi.createCatalogTemplate(serializeTemplate(normalized))
        : await sellerBackendApi.patchCatalogTemplate(normalized.id, serializeTemplate(normalized));
      const persisted = mapBackendTemplate(saved);
      setTemplates((prev) => {
        if (isNew) return [persisted, ...prev];
        return prev.map((t) => (t.id === persisted.id ? persisted : t));
      });
    } catch {
      pushToast({ title: "Save failed", message: "Could not persist template.", tone: "danger" });
      return;
    }

    pushToast({
      title: isNew ? "Template created" : "Template saved",
      message: wasApproved ? "Changes saved. Re-approval is required." : "Saved successfully.",
      tone: "success",
    });

    setDrawerOpen(false);
  };

  const duplicateTemplate = async (t: Template) => {
    const now = new Date().toISOString();
    const copy: Template = {
      ...(JSON.parse(JSON.stringify(t)) as Template),
      id: makeId("tpl"),
      name: `${t.name} (Copy)`,
      status: "Draft",
      approvalState: "draft",
      createdAt: now,
      updatedAt: now,
      usage: 0,
      approvals: [
        {
          id: makeId("ap"),
          at: now,
          actor: "System",
          action: "duplicated",
          note: "Created from an existing template",
        },
      ],
      versions: [
        {
          id: makeId("ver"),
          number: 1,
          at: now,
          actor: "SellerSeller",
          note: "Duplicated",
          snapshot: {
            name: `${t.name} (Copy)`,
            description: t.description,
            tags: t.tags,
            content: t.content,
          },
        },
      ],
    };

    try {
      const saved = await sellerBackendApi.createCatalogTemplate(serializeTemplate(copy));
      const persisted = mapBackendTemplate(saved);
      setTemplates((prev) => [persisted, ...prev]);
      pushToast({ title: "Duplicated", message: "New draft created.", tone: "success", action: { label: "Edit", onClick: () => openEdit(persisted.id) } });
    } catch {
      pushToast({ title: "Duplicate failed", message: "Could not create backend copy.", tone: "danger" });
    }
  };

  const submitForApproval = () => {
    if (!draft) return;
    const now = new Date().toISOString();

    if (draft.approvalState === "pending") {
      pushToast({ title: "Already pending", message: "This template is awaiting approval.", tone: "default" });
      return;
    }

    const next: Template = {
      ...draft,
      approvalState: "pending",
      approvals: [
        {
          id: makeId("ap"),
          at: now,
          actor: draft.owner || "SellerSeller",
          action: "submitted",
          note: approveNote.trim() || "Submitted for approval",
        },
        ...(draft.approvals || []),
      ],
    };

    setDraft(next);
    pushToast({ title: "Submitted", message: "Approval request created.", tone: "success" });
  };

  const approveTemplate = (decision: "approve" | "reject") => {
    if (!draft) return;
    const now = new Date().toISOString();

    if (draft.approvalState !== "pending") {
      pushToast({ title: "Not pending", message: "Only pending templates can be approved or rejected.", tone: "warning" });
      return;
    }

    const nextState = decision === "approve" ? "approved" : "rejected";
    const next: Template = {
      ...draft,
      approvalState: nextState,
      status: decision === "approve" ? "Active" : "Draft",
      approvals: [
        {
          id: makeId("ap"),
          at: now,
          actor: "Manager",
          action: decision === "approve" ? "approved" : "rejected",
          note: approveNote.trim() || (decision === "approve" ? "Approved for use" : "Rejected"),
        },
        ...(draft.approvals || []),
      ],
    };

    setDraft(next);
    pushToast({ title: decision === "approve" ? "Approved" : "Rejected", message: "Decision recorded.", tone: decision === "approve" ? "success" : "warning" });
  };

  const applyDraftToStore = async () => {
    if (!draft) return;
    try {
      const saved = await sellerBackendApi.patchCatalogTemplate(draft.id, serializeTemplate(draft));
      const persisted = mapBackendTemplate(saved);
      setTemplates((prev) => {
        const exists = prev.some((t) => t.id === persisted.id);
        if (!exists) return [persisted, ...prev];
        return prev.map((t) => (t.id === persisted.id ? persisted : t));
      });
      setDraft(persisted);
      pushToast({ title: "Updated", message: "Template state synced to backend.", tone: "success" });
    } catch {
      pushToast({ title: "Sync failed", message: "Could not update template.", tone: "danger" });
    }
  };

  useEffect(() => {
    if (!drawerOpen) return;
    // Keep list in sync when changing approval state inside drawer
    // Safe and explicit: user expects the list to reflect actions.
    // We do not auto-sync every keystroke to avoid list churn.
  }, [drawerOpen]);

  const kpis = useMemo(() => {
    const total = templates.length;
    const approved = templates.filter((t) => t.approvalState === "approved").length;
    const pending = templates.filter((t) => t.approvalState === "pending").length;
    const risky = templates.filter((t) => t.status === "Draft" || t.approvalState === "rejected").length;
    return { total, approved, pending, risky };
  }, [templates]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Templates Hub</div>
                <Badge tone="slate">/templates</Badge>
                <Badge tone="slate">Core</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Quote, message, contract, and listing templates with versioning and approvals.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void sellerBackendApi
                    .getCatalogTemplates()
                    .then((payload) => {
                      const rows = Array.isArray(payload.templates) ? payload.templates : [];
                      setTemplates(rows.map((row) => mapBackendTemplate(row as Record<string, unknown>)));
                      pushToast({ title: "Refreshed", message: "Latest templates loaded.", tone: "success" });
                    })
                    .catch(() => {
                      pushToast({ title: "Refresh failed", message: "Could not fetch templates.", tone: "danger" });
                    })
                    .finally(() => setLoading(false));
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                {loading ? "Loading" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={openNew}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Plus className="h-4 w-4" />
                New template
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Total templates</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.total}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Approved</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.approved}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Pending approvals</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{kpis.pending}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Total uses</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{stats.usage}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  Most used: <span className="font-extrabold text-slate-800">{stats.mostUsed?.name || "-"}</span>
                </div>
              </div>
            </div>
          </GlassCard>
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
                  placeholder="Search name, tags, owner"
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
                      {["Updated", "Usage", "Name"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex flex-wrap gap-2">
                  {["All", "Draft", "Active", "Archived"].map((s) => (
                    <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {["All", "draft", "pending", "approved", "rejected"].map((a) => (
                <Chip
                  key={a}
                  active={approval === a}
                  onClick={() => setApproval(a)}
                  tone={a === "pending" ? "orange" : "green"}
                >
                  {a === "All" ? "All approvals" : `Approval: ${a}`}
                </Chip>
              ))}

              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setStatus("All");
                  setApproval("All");
                  setSort("Updated");
                  setTab("All");
                  pushToast({ title: "Filters cleared", tone: "default" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Template types</div>
              <span className="ml-auto">
                <Badge tone="slate">{filtered.length} shown</Badge>
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["All", "Quote", "Message", "Contract", "Listing"].map((t) => (
                <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t}
                  <span className="ml-2 text-slate-500">{counts[t] ?? templates.length}</span>
                </Chip>
              ))}
            </div>
            <div className="mt-3 text-xs font-semibold text-slate-500">Core: templates library. Super premium: versions and approvals.</div>
          </GlassCard>
        </div>

        {/* Table */}
        <div className="mt-4">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Templates</div>
                  <Badge tone="slate">Library</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row to open editor and approvals</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1120px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-5">Template</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Updated</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((t) => {
                    const meta = typeMeta(t.type);
                    const TypeIcon = meta.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openEdit(t.id)}
                        className="grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <div className="col-span-5 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900">
                              <TypeIcon className="h-5 w-5 text-slate-700" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-black text-slate-900">{t.name}</div>
                              <div
                                className="mt-1 text-[11px] font-semibold text-slate-500"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {t.description || "No description"}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge tone="slate">Owner: {t.owner}</Badge>
                                <Badge tone="slate">Uses: {t.usage}</Badge>
                                {(t.tags || []).slice(0, 3).map((tg) => (
                                  <Badge key={tg} tone="slate">
                                    {tg}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone="slate">{typeMeta(t.type).label}</Badge>
                          <Badge tone={approvalTone(t.approvalState)}>{t.approvalState}</Badge>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                          {t.requireApproval ? <Badge tone="orange">Approval required</Badge> : <Badge tone="slate">No approval</Badge>}
                        </div>

                        <div className="col-span-2 flex items-center text-slate-500">{fmtTime(t.updatedAt)}</div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              safeCopy(t.content);
                              pushToast({ title: "Copied", message: "Template content copied.", tone: "success" });
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                            aria-label="Copy"
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTemplate(t);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800"
                            aria-label="Duplicate"
                            title="Duplicate"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
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
                            <div className="text-lg font-black text-slate-900">No templates found</div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or creating a new template.</div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={openNew}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                                style={{ background: TOKENS.green }}
                              >
                                <Plus className="h-4 w-4" />
                                New template
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQ("");
                                  setStatus("All");
                                  setApproval("All");
                                  setSort("Updated");
                                  setTab("All");
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                              >
                                <X className="h-4 w-4" />
                                Clear
                              </button>
                            </div>
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

      {/* Editor drawer */}
      <Drawer
        open={drawerOpen}
        title={draft?.name?.trim() ? `Template: ${draft.name}` : activeId ? "Edit template" : "New template"}
        subtitle={draft ? `${typeMeta(draft.type).label} · ${draft.status} · Approval: ${draft.approvalState}` : ""}
        onClose={() => {
          setDrawerOpen(false);
          setActiveId(null);
          setDraft(null);
        }}
      >
        {!draft ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a template.</div>
        ) : (
          <div className="space-y-3">
            {/* Drawer tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {["Editor", "Versions", "Approvals", "Settings"].map((t) => (
                <SegTab key={t} label={t} active={drawerTab === t} onClick={() => setDrawerTab(t)} />
              ))}
              <span className="ml-auto flex items-center gap-2">
                <Badge tone="slate">Super premium</Badge>
              </span>
            </div>

            {/* Save bar */}
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={saveTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    safeCopy(draft.content || "");
                    pushToast({ title: "Copied", message: "Template content copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>

                <button
                  type="button"
                  onClick={() => {
                    updateDraft((s) => ({ ...s, status: s.status === "Archived" ? "Draft" : "Archived" }));
                    pushToast({ title: "Status toggled", message: "Remember to save.", tone: "default" });
                  }}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold",
                    draft.status === "Archived" ? "border-emerald-200 text-emerald-800" : "border-rose-200 text-rose-700"
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {draft.status === "Archived" ? "Unarchive" : "Archive"}
                </button>

                <span className="ml-auto flex items-center gap-2">
                  <Badge tone={approvalTone(draft.approvalState)}>{draft.approvalState}</Badge>
                  <Badge tone="slate">Updated {fmtTime(draft.updatedAt)}</Badge>
                </span>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                Versioning: every save creates a new version. Approvals: submit, approve, reject.
              </div>
            </div>

            {/* Editor */}
            {drawerTab === "Editor" ? (
              <div className="grid gap-3 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-3">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Template editor</div>
                      <span className="ml-auto"><Badge tone="slate">Core</Badge></span>
                    </div>

                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Name</div>
                          <input
                            value={draft.name}
                            onChange={(e) => updateDraft((s) => ({ ...s, name: e.target.value }))}
                            placeholder="e.g., RFQ Reply - Default"
                            className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                          />
                        </div>
                        <div>
                          <div className="text-[11px] font-extrabold text-slate-600">Type</div>
                          <div className="relative mt-2">
                            <select
                              value={draft.type}
                              onChange={(e) => updateDraft((s) => ({ ...s, type: e.target.value as TemplateType }))}
                              className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                            >
                              <option value="quote">Quote template</option>
                              <option value="message">Message template</option>
                              <option value="contract">Contract template</option>
                              <option value="listing">Listing template</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Description</div>
                        <input
                          value={draft.description}
                          onChange={(e) => updateDraft((s) => ({ ...s, description: e.target.value }))}
                          placeholder="Short summary for your team"
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Tags</div>
                        <input
                          value={(draft.tags || []).join(", ")}
                          onChange={(e) =>
                            updateDraft((s) => ({
                              ...s,
                              tags: e.target.value
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean),
                            }))
                          }
                          placeholder="wholesale, rfq, tracking"
                          className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Body</div>
                        <textarea
                          value={draft.content}
                          onChange={(e) => updateDraft((s) => ({ ...s, content: e.target.value }))}
                          rows={10}
                          placeholder="Write the template content..."
                          className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">Tokens</Badge>
                          {templateTokensByType(draft.type).map((tok) => (
                            <button
                              key={tok}
                              type="button"
                              onClick={() => {
                                updateDraft((s) => ({ ...s, content: `${s.content || ""}${s.content ? "\n" : ""}${tok}` }));
                                pushToast({ title: "Token inserted", message: tok, tone: "default" });
                              }}
                              className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                              {tok}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Preview</div>
                      <span className="ml-auto"><Badge tone="slate">Safe</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Shows a sample render using demo placeholder values.</div>
                    <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                      <pre className="whitespace-pre-wrap text-xs font-semibold text-slate-800">{renderSample(draft.content)}</pre>
                    </div>
                  </GlassCard>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-orange-900">Super premium behavior</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">
                          If a template is approved and you edit it, the state resets to draft and requires re-approval.
                        </div>
                      </div>
                    </div>
                  </div>

                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Latest version</div>
                      <span className="ml-auto"><Badge tone="slate">v{(draft.versions?.[0]?.number || 1).toString()}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">Open the Versions tab to rollback or preview changes.</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawerTab("Versions")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <History className="h-4 w-4" />
                        Open versions
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerTab("Approvals")}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Approvals
                      </button>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : null}

            {/* Versions */}
            {drawerTab === "Versions" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Version history</div>
                    <span className="ml-auto"><Badge tone="slate">{(draft.versions || []).length}</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">Every save creates a new version. You can preview or rollback.</div>
                </GlassCard>

                <div className="space-y-2">
                  {(draft.versions || []).map((v) => (
                    <div key={v.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="slate">v{v.number}</Badge>
                        <div className="text-xs font-extrabold text-slate-700">{fmtTime(v.at)}</div>
                        <Badge tone="slate">{v.actor}</Badge>
                        <span className="ml-auto"><Badge tone="slate">{v.note}</Badge></span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setVersionPreview(v);
                            setVersionPreviewOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <FileText className="h-4 w-4" />
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const snap = v.snapshot || {};
                            updateDraft((s) => ({
                              ...s,
                              name: snap.name ?? s.name,
                              description: snap.description ?? s.description,
                              tags: snap.tags ?? s.tags,
                              content: snap.content ?? s.content,
                            }));
                            pushToast({ title: "Rolled back", message: `Draft replaced with v${v.number}.`, tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-800"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rollback
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(JSON.stringify(v.snapshot || {}, null, 2));
                            pushToast({ title: "Copied", message: "Version snapshot copied.", tone: "default" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}

                  {(draft.versions || []).length === 0 ? (
                    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                      <div className="text-lg font-black text-slate-900">No versions yet</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">Save this template to create version history.</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Approvals */}
            {drawerTab === "Approvals" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Approvals</div>
                    <span className="ml-auto"><Badge tone={approvalTone(draft.approvalState)}>{draft.approvalState}</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Super premium: approvals for publishing templates. Submit, approve, reject, and keep a timeline.
                  </div>
                </GlassCard>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-sm font-black text-slate-900">Decision note</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Optional. Stored in the approvals timeline.</div>
                    <textarea
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      rows={4}
                      placeholder="Add a short note..."
                      className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={submitForApproval}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Submit
                      </button>

                      <button
                        type="button"
                        onClick={() => approveTemplate("approve")}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => approveTemplate("reject")}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-extrabold text-rose-700"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          applyDraftToStore();
                        }}
                        className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                        Sync
                      </button>
                    </div>

                    <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                          <Info className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-orange-900">Approval rules</div>
                          <div className="mt-1 text-xs font-semibold text-orange-900/70">Demo rule: 1 manager approval required.</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone="slate">Approver: Manager</Badge>
                            <Badge tone="slate">Scope: Team</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Approvals timeline</div>
                      <span className="ml-auto"><Badge tone="slate">{(draft.approvals || []).length}</Badge></span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(draft.approvals || []).length === 0 ? (
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-xs font-semibold text-slate-600">
                          No approval events yet.
                        </div>
                      ) : (
                        (draft.approvals || []).slice(0, 12).map((e) => (
                          <div key={e.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-center gap-2">
                              <Badge tone={e.action === "approved" ? "green" : e.action === "rejected" ? "danger" : e.action === "submitted" ? "orange" : "slate"}>
                                {e.action}
                              </Badge>
                              <Badge tone="slate">{e.actor}</Badge>
                              <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(e.at)}</span>
                            </div>
                            {e.note ? <div className="mt-2 text-xs font-semibold text-slate-600">{e.note}</div> : null}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-3 text-[11px] font-semibold text-slate-500">Tip: Save the template after approval actions to store them in the list.</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Settings */}
            {drawerTab === "Settings" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">Template settings</div>
                    <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">Controls for approvals, access, and safe usage.</div>
                </GlassCard>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-sm font-black text-slate-900">Require approval</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">If enabled, template must be approved before Active use.</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          updateDraft((s) => ({ ...s, requireApproval: !s.requireApproval }));
                          pushToast({ title: "Setting updated", message: "Remember to save.", tone: "default" });
                        }}
                        className={cx(
                          "rounded-2xl border px-3 py-2 text-xs font-extrabold",
                          draft.requireApproval ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700"
                        )}
                      >
                        {draft.requireApproval ? "Enabled" : "Disabled"}
                      </button>
                      <Badge tone="slate">Scope: Team</Badge>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="text-sm font-black text-slate-900">Access level</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Demo: Team templates can be shared across staff.</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Private", "Team", "Organization"].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => pushToast({ title: "Access set", message: lvl, tone: "default" })}
                          className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Safety note</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Avoid putting sensitive data inside templates. Use variables instead.</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="sticky bottom-0 -mx-4 mt-3 border-t border-slate-200/70 bg-white dark:bg-slate-900/92 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    applyDraftToStore();
                    setDrawerOpen(false);
                    setActiveId(null);
                    setDraft(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Check className="h-4 w-4" />
                  Save and close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setActiveId(null);
                    setDraft(null);
                    pushToast({ title: "Closed", message: "Draft not saved.", tone: "default" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Version preview modal */}
      <Modal
        open={versionPreviewOpen}
        title={versionPreview ? `Preview v${versionPreview.number}` : "Preview"}
        subtitle={versionPreview ? `${fmtTime(versionPreview.at)} · ${versionPreview.actor} · ${versionPreview.note}` : ""}
        onClose={() => {
          setVersionPreviewOpen(false);
          setVersionPreview(null);
        }}
      >
        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="text-xs font-extrabold text-slate-600">Snapshot</div>
          <div className="mt-2 text-sm font-black text-slate-900">{versionPreview?.snapshot?.name || "-"}</div>
          {versionPreview?.snapshot?.description ? <div className="mt-1 text-xs font-semibold text-slate-500">{versionPreview.snapshot.description}</div> : null}
          <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <pre className="whitespace-pre-wrap text-xs font-semibold text-slate-800">{versionPreview?.snapshot?.content || ""}</pre>
          </div>
        </div>
      </Modal>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
