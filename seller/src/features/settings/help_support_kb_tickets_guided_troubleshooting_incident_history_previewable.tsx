import React, { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { sellerBackendApi } from "../../lib/backendApi";

/**
 * Help & Support (Previewable)
 * Route: /settings/help
 * Core: Knowledge Base + Ticket submission
 * Super premium: Guided troubleshooting + Incident history embed
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type Tone = "slate" | "green" | "orange" | "danger";

type KbArticle = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  body: string;
  tags: string[];
  views: number;
};

type TicketDraft = {
  subject: string;
  area: string;
  priority: "Normal" | "High" | "Urgent";
  message: string;
  attachments: Array<{ id: string; name: string }>;
};

type IncidentStatus = "Operational" | "Degraded" | "Partial Outage" | "Major Outage" | "Monitoring" | "Resolved";

type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
  components: string[];
  updates: Array<{ at: string; text: string }>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
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

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
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

function Chip({ active, tone = "green", onClick, children }: { active?: boolean; tone?: "green" | "orange"; onClick?: () => void; children: React.ReactNode }) {
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

function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
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

function buildKb(): KbArticle[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

  return [
    {
      id: "KB-001",
      title: "How to reset your password and enable 2FA",
      category: "Account and Security",
      updatedAt: ago(8600),
      tags: ["login", "2FA", "security"],
      views: 18420,
      body:
        "Steps:\n1) Open Settings > Security\n2) Click Reset Password\n3) Enable 2FA using authenticator or SMS\n\nTip: For payout changes, 2FA is required.",
    },
    {
      id: "KB-002",
      title: "Troubleshoot payout delays",
      category: "Finance and Payouts",
      updatedAt: ago(3920),
      tags: ["payout", "settlement", "kyc"],
      views: 12940,
      body:
        "Checklist:\n- Confirm KYB status is Approved\n- Verify payout method\n- Check payout holds\n- Review dispute rate\n\nIf still delayed, open a ticket with settlement reference.",
    },
    {
      id: "KB-003",
      title: "Why orders get stuck in Confirmed",
      category: "Orders",
      updatedAt: ago(1540),
      tags: ["orders", "fulfillment", "SLA"],
      views: 10110,
      body:
        "Most common causes:\n- Inventory reserved but not confirmed\n- Warehouse routing pending\n- Payment verification pending\n\nFix: Update inventory, then re-sync fulfillment.",
    },
    {
      id: "KB-004",
      title: "Integrations: Webhook signature verification",
      category: "Integrations",
      updatedAt: ago(990),
      tags: ["webhooks", "API", "security"],
      views: 8020,
      body:
        "Verify:\n- Signature header exists\n- Timestamp window\n- HMAC secret\n\nRotate secret if you suspect leakage.",
    },
    {
      id: "KB-005",
      title: "MyLiveDealz: why an ad is not delivering",
      category: "MyLiveDealz",
      updatedAt: ago(520),
      tags: ["adz", "policy", "budget"],
      views: 6640,
      body:
        "Check:\n- Creative approval\n- Targeting\n- Budget schedule\n- Item availability\n\nIf the deal is out of stock, delivery can pause automatically.",
    },
  ];
}

function buildIncidents(): Incident[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

  return [
    {
      id: "INC-1208",
      title: "Intermittent delays on payouts status updates",
      status: "Resolved",
      startedAt: ago(2880),
      resolvedAt: ago(2600),
      components: ["Finance", "Status Center"],
      updates: [
        { at: ago(2880), text: "We are investigating delayed payout status updates." },
        { at: ago(2760), text: "Identified queue backlog. Processing is catching up." },
        { at: ago(2600), text: "Resolved. Status updates are back to normal." },
      ],
    },
    {
      id: "INC-1211",
      title: "MyLiveDealz analytics lag",
      status: "Monitoring",
      startedAt: ago(420),
      resolvedAt: null,
      components: ["MyLiveDealz", "Analytics"],
      updates: [
        { at: ago(420), text: "Some analytics panels may show older data." },
        { at: ago(240), text: "Fix deployed. Monitoring ingestion for stability." },
      ],
    },
    {
      id: "INC-1212",
      title: "Messaging retries for WhatsApp channel",
      status: "Degraded",
      startedAt: ago(140),
      resolvedAt: null,
      components: ["Messaging", "Integrations"],
      updates: [
        { at: ago(140), text: "Higher retry rates observed for WhatsApp delivery." },
        { at: ago(65), text: "Mitigation applied. Latency improving." },
      ],
    },
  ];
}

function incidentTone(s: IncidentStatus): Tone {
  if (s === "Operational" || s === "Resolved") return "green";
  if (s === "Monitoring") return "orange";
  if (s === "Degraded") return "orange";
  return "danger";
}

function estSla(priority: TicketDraft["priority"]) {
  if (priority === "Urgent") return "Within 2 hours";
  if (priority === "High") return "Within 8 hours";
  return "Within 24 hours";
}

function buildGuidedSteps() {
  return [
    {
      key: "issue",
      title: "Choose an issue",
      subtitle: "Pick the closest match. We will guide you.",
    },
    {
      key: "checks",
      title: "Quick checks",
      subtitle: "Answer a few questions so we can suggest the best fix.",
    },
    {
      key: "result",
      title: "Recommended action",
      subtitle: "Apply steps or open a ticket with a prefilled summary.",
    },
  ] as const;
}

export default function HelpSupportPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [kb, setKb] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const payload = await sellerBackendApi.getHelpSettings();
        if (!active) return;
        setKb(Array.isArray(payload.kb) ? payload.kb as any[] : []);
        setIncidents(Array.isArray(payload.incidents) ? payload.incidents as any[] : []);
      } catch {
        return;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const tabs = useMemo(
    () => [
      { key: "kb", label: "Knowledge Base", premium: false },
      { key: "ticket", label: "Submit Ticket", premium: false },
      { key: "troubleshoot", label: "Guided Troubleshooting", premium: true },
      { key: "incidents", label: "Incident History", premium: true },
    ],
    []
  );

  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("kb");

  // KB state
  const [kbQuery, setKbQuery] = useState("");
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    kb.forEach((a) => map.set(a.category, (map.get(a.category) || 0) + 1));
    const list = Array.from(map.entries()).map(([k, v]) => ({ k, v }));
    list.sort((a, b) => b.v - a.v);
    return [{ k: "All", v: kb.length }, ...list];
  }, [kb]);
  const [kbCat, setKbCat] = useState("All");

  const kbFiltered = useMemo(() => {
    const q = kbQuery.trim().toLowerCase();
    return kb
      .filter((a) => (kbCat === "All" ? true : a.category === kbCat))
      .filter((a) => {
        if (!q) return true;
        const hay = [a.title, a.category, a.tags.join(" "), a.body].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.views - a.views);
  }, [kb, kbQuery, kbCat]);

  const popular = useMemo(() => [...kb].sort((a, b) => b.views - a.views).slice(0, 3), [kb]);

  const [articleOpen, setArticleOpen] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const activeArticle = useMemo(() => kb.find((x) => x.id === activeArticleId) || null, [kb, activeArticleId]);

  // Ticket state
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [ticket, setTicket] = useState<TicketDraft>({
    subject: "",
    area: "Orders",
    priority: "Normal",
    message: "",
    attachments: [],
  });

  const updateTicket = (patch: Partial<TicketDraft>) => setTicket((s) => ({ ...s, ...patch }));

  const submitTicket = async () => {
    if (!ticket.subject.trim() || !ticket.message.trim()) {
      pushToast({ title: "Missing details", message: "Add a subject and message before submitting.", tone: "warning" });
      return;
    }
    const id = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await sellerBackendApi.createHelpSupportTicket({
        id,
        category: ticket.area,
        severity: String(ticket.priority || "Normal").toLowerCase(),
        subject: ticket.subject,
        ref: ticket.attachments[0]?.name || null,
      });
      pushToast({ title: "Ticket submitted", message: `${id} created. SLA: ${estSla(ticket.priority)}.`, tone: "success" });
      setTicket({ subject: "", area: ticket.area, priority: "Normal", message: "", attachments: [] });
    } catch {
      return;
    }
  };

  // Guided troubleshooting
  const steps = buildGuidedSteps();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [issueType, setIssueType] = useState<string>("Payout delayed");
  const [checks, setChecks] = useState<Record<string, boolean>>({
    triedRefresh: true,
    verifiedKyc: false,
    checkedStatus: true,
  });

  const wizardRecommendation = useMemo(() => {
    const lines: string[] = [];
    if (issueType === "Payout delayed") {
      lines.push("Confirm KYB status is Approved.");
      lines.push("Verify payout method and check payout holds.");
      lines.push("If your dispute rate is high, settlements can be delayed.");
      if (!checks.verifiedKyc) lines.push("You indicated KYB is not verified. Complete KYB first.");
    }
    if (issueType === "Cannot log in") {
      lines.push("Reset password and confirm email access.");
      lines.push("If 2FA is enabled, confirm your authenticator or SMS.");
    }
    if (issueType === "Order stuck") {
      lines.push("Confirm inventory is available and not fully reserved.");
      lines.push("Re-sync fulfillment routing and check warehouse capacity.");
    }
    if (issueType === "Webhook failing") {
      lines.push("Check endpoint availability and signature verification.");
      lines.push("Confirm the webhook secret is correct and not rotated.");
    }
    if (issueType === "Ad not delivering") {
      lines.push("Confirm the creative is approved and in schedule.");
      lines.push("Check budget schedule and item availability.");
    }
    return lines;
  }, [issueType, checks.verifiedKyc]);

  const startWizard = () => {
    setWizardStep(0);
    setIssueType("Payout delayed");
    setChecks({ triedRefresh: true, verifiedKyc: false, checkedStatus: true });
    setWizardOpen(true);
  };

  const wizardToTicket = () => {
    const summary = `Guided troubleshooting summary\nIssue: ${issueType}\nChecks: refresh=${checks.triedRefresh ? "yes" : "no"}, status=${checks.checkedStatus ? "yes" : "no"}, kyc=${checks.verifiedKyc ? "yes" : "no"}\n\nRecommended:\n- ${wizardRecommendation.join("\n- ")}`;

    setTab("ticket");
    setTicket((s) => ({
      ...s,
      subject: s.subject || `[${issueType}] Need help`,
      message: s.message ? `${s.message}\n\n${summary}` : summary,
      priority: issueType === "Payout delayed" ? "High" : s.priority,
      area:
        issueType === "Payout delayed" ? "Finance" : issueType === "Order stuck" ? "Orders" : issueType === "Webhook failing" ? "Integrations" : issueType === "Ad not delivering" ? "MyLiveDealz" : s.area,
    }));

    setWizardOpen(false);
    pushToast({ title: "Ticket draft prepared", message: "We added a guided summary to your ticket.", tone: "success" });
  };

  // Incident drawer
  const [incOpen, setIncOpen] = useState(false);
  const [incComponent, setIncComponent] = useState("All");
  const components = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach((i) => i.components.forEach((c) => set.add(c)));
    return ["All", ...Array.from(set).sort()];
  }, [incidents]);

  const incFiltered = useMemo(() => {
    return incidents
      .filter((i) => (incComponent === "All" ? true : i.components.includes(incComponent)))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [incidents, incComponent]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Help and Support</div>
                <Badge tone="slate">/settings/help</Badge>
                <Badge tone="slate">Core</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Knowledge base, ticket submission, guided troubleshooting, and incident history.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("ticket")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Submit ticket
              </button>
              <button
                type="button"
                onClick={startWizard}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Sparkles className="h-4 w-4" />
                Guided troubleshooting
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                tab === t.key ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              {t.key === "kb" ? <BookOpen className="h-4 w-4" /> : null}
              {t.key === "ticket" ? <FileText className="h-4 w-4" /> : null}
              {t.key === "troubleshoot" ? <Sparkles className="h-4 w-4" /> : null}
              {t.key === "incidents" ? <AlertTriangle className="h-4 w-4" /> : null}
              {t.label}
              {t.premium ? <Badge tone="orange">Pro</Badge> : null}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Main */}
          <div className="lg:col-span-8">
            {tab === "kb" ? (
              <div className="space-y-3">
                <GlassCard className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">Knowledge Base</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">Search guides, troubleshooting and policies.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setKbQuery("");
                          setKbCat("All");
                          pushToast({ title: "Filters cleared", tone: "default" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </button>
                      <Badge tone="slate">{kbFiltered.length} results</Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-center">
                    <div className="relative md:col-span-7">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={kbQuery}
                        onChange={(e) => setKbQuery(e.target.value)}
                        placeholder="Search articles by title, tags, content"
                        className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>
                    <div className="md:col-span-5 flex flex-wrap gap-2">
                      {categories.slice(0, 6).map((c) => (
                        <Chip key={c.k} active={kbCat === c.k} onClick={() => setKbCat(c.k)}>
                          {c.k}
                          <span className="ml-2 text-slate-500">{c.v}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="overflow-hidden">
                  <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-slate-700" />
                        <div className="text-sm font-black text-slate-900">Articles</div>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">Click an article to open</div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200/70">
                    {kbFiltered.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveArticleId(a.id);
                          setArticleOpen(true);
                        }}
                        className="w-full px-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-slate-900">{a.title}</div>
                              <Badge tone="slate">{a.category}</Badge>
                              <span className="ml-auto text-[11px] font-semibold text-slate-500">Updated {fmtTime(a.updatedAt)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {(a.tags || []).slice(0, 3).map((t) => (
                                <Badge key={t} tone="slate">{t}</Badge>
                              ))}
                              <span className="ml-auto text-[11px] font-semibold text-slate-500">{a.views.toLocaleString()} views</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    ))}

                    {kbFiltered.length === 0 ? (
                      <div className="p-6">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                          <div className="text-lg font-black text-slate-900">No results</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Try a different search term or category.</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "ticket" ? (
              <div className="space-y-3">
                <GlassCard className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-emerald-50 text-emerald-700">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900">Submit a ticket</div>
                        <Badge tone="slate">Support</Badge>
                        <span className="ml-auto"><Badge tone="slate">SLA {estSla(ticket.priority)}</Badge></span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Core support channel for account, orders, finance, and integrations.</div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-600">Subject</div>
                      <input
                        value={ticket.subject}
                        onChange={(e) => updateTicket({ subject: e.target.value })}
                        placeholder="Example: Payout is pending after KYB approval"
                        className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Area</div>
                        <div className="relative mt-2">
                          <select
                            value={ticket.area}
                            onChange={(e) => updateTicket({ area: e.target.value })}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {["Orders", "Listings", "Payments", "Finance", "Wholesale", "MyLiveDealz", "Integrations", "Account", "Other"].map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-extrabold text-slate-600">Priority</div>
                        <div className="relative mt-2">
                          <select
                            value={ticket.priority}
                            onChange={(e) => updateTicket({ priority: e.target.value as TicketDraft["priority"] })}
                            className="h-11 w-full appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-sm font-semibold text-slate-800"
                          >
                            {(["Normal", "High", "Urgent"] as const).map((x) => (
                              <option key={x} value={x}>{x}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-[11px] font-extrabold text-slate-600">Message</div>
                      <textarea
                        value={ticket.message}
                        onChange={(e) => updateTicket({ message: e.target.value })}
                        rows={7}
                        placeholder="Tell us what happened, what you have tried, and include IDs (order ID, payout ID, webhook ID)."
                        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click?.()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Upload className="h-4 w-4" />
                          Attach files
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(ticket.message || "");
                            pushToast({ title: "Copied", message: "Ticket message copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy message
                        </button>

                        <span className="ml-auto"><Badge tone={ticket.priority === "Urgent" ? "danger" : ticket.priority === "High" ? "orange" : "slate"}>{estSla(ticket.priority)}</Badge></span>
                      </div>

                      <input
                        ref={fileRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          updateTicket({
                            attachments: [
                              ...files.map((f) => ({ id: makeId("att"), name: f.name })),
                              ...ticket.attachments,
                            ].slice(0, 8),
                          });
                          pushToast({ title: "Files added", message: `${files.length} file(s) attached.`, tone: "success" });
                          e.currentTarget.value = "";
                        }}
                      />

                      {ticket.attachments.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ticket.attachments.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => updateTicket({ attachments: ticket.attachments.filter((x) => x.id !== a.id) })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-700"
                              title="Remove"
                            >
                              {a.name}
                              <X className="h-4 w-4 text-slate-400" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs font-semibold text-slate-500">Add screenshots, logs, or receipts if relevant.</div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={submitTicket}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Send className="h-5 w-5" />
                        Submit ticket
                      </button>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-orange-50 text-orange-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Use Guided Troubleshooting to auto-generate a better ticket summary and faster routing.</div>
                      <button
                        type="button"
                        onClick={startWizard}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Start guided troubleshooting
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ) : null}

            {tab === "troubleshoot" ? (
              <div className="space-y-3">
                <GlassCard className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-orange-50 text-orange-700">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900">Guided Troubleshooting</div>
                        <Badge tone="orange">Super premium</Badge>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">Answer a few questions and get the best next steps.</div>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={startWizard}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Sparkles className="h-4 w-4" />
                          Start wizard
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                    <div className="text-sm font-black text-slate-900">What you get</div>
                    <span className="ml-auto"><Badge tone="slate">Premium</Badge></span>
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-600">
                    <li>Guided checks for common issues</li>
                    <li>Auto-generated ticket summary</li>
                    <li>Fast routing by product area</li>
                    <li>Optional incident context</li>
                  </ul>
                </GlassCard>
              </div>
            ) : null}

            {tab === "incidents" ? (
              <div className="space-y-3">
                <GlassCard className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-900">Incident history</div>
                        <Badge tone="orange">Super premium</Badge>
                        <span className="ml-auto"><Badge tone="slate">Embedded</Badge></span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">A compact embed of recent incidents, useful for context in tickets.</div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="text-xs font-extrabold text-slate-600">Component</div>
                        <div className="relative">
                          <select
                            value={incComponent}
                            onChange={(e) => setIncComponent(e.target.value)}
                            className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                          >
                            {components.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setIncOpen(true)}
                          className="ml-auto inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.orange }}
                        >
                          <Clock className="h-4 w-4" />
                          View full history
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="overflow-hidden">
                  <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-black text-slate-900">Recent incidents</div>
                      <Badge tone="slate">{incFiltered.length}</Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-200/70">
                    {incFiltered.slice(0, 3).map((i) => (
                      <div key={i.id} className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-900">{i.title}</div>
                          <Badge tone={incidentTone(i.status)}>{i.status}</Badge>
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">Started {fmtTime(i.startedAt)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {i.components.map((c) => (
                            <Badge key={c} tone="slate">{c}</Badge>
                          ))}
                        </div>
                        <div className="mt-3 text-xs font-semibold text-slate-600">Latest: {i.updates[i.updates.length - 1]?.text}</div>
                      </div>
                    ))}
                    {incFiltered.length === 0 ? (
                      <div className="p-6">
                        <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                          <div className="text-lg font-black text-slate-900">No incidents found</div>
                          <div className="mt-1 text-sm font-semibold text-slate-500">Try selecting a different component.</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </GlassCard>
              </div>
            ) : null}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <div className="space-y-3">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Contact options</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Choose a channel that fits your urgency.</div>
                  </div>
                  <Badge tone="slate">Core</Badge>
                </div>

                <div className="mt-4 grid gap-2">
                  {[
                    { t: "Open ticket", d: "Best for detailed cases", icon: FileText, action: () => setTab("ticket"), tone: "green" as const },
                    { t: "Read Knowledge Base", d: "Fast self-serve", icon: BookOpen, action: () => setTab("kb"), tone: "slate" as const },
                    { t: "Message Support", d: "In-app messaging", icon: MessageCircle, action: () => pushToast({ title: "Messaging", message: "Wire to Support chat.", tone: "default" }), tone: "slate" as const },
                  ].map((x) => {
                    const Ico = x.icon;
                    return (
                      <button
                        key={x.t}
                        type="button"
                        onClick={x.action}
                        className={cx(
                          "flex items-center justify-between rounded-3xl border bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          x.tone === "green" ? "border-emerald-200" : "border-slate-200/70"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className={cx("grid h-10 w-10 place-items-center rounded-2xl", x.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                            <Ico className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block text-sm font-extrabold text-slate-900">{x.t}</span>
                            <span className="mt-0.5 block text-xs font-semibold text-slate-500">{x.d}</span>
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-orange-900">Super premium</div>
                      <div className="mt-1 text-xs font-semibold text-orange-900/70">Guided troubleshooting reduces back-and-forth and speeds up resolution.</div>
                      <button
                        type="button"
                        onClick={startWizard}
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.orange }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Start now
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">Status snapshot</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Recent system signals</div>
                  </div>
                  <Badge tone="slate">Embed</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {incidents.slice(0, 2).map((i) => (
                    <div key={i.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone={incidentTone(i.status)}>{i.status}</Badge>
                        <div className="min-w-0 truncate text-xs font-extrabold text-slate-800">{i.title}</div>
                        <span className="ml-auto text-[10px] font-extrabold text-slate-400">{fmtTime(i.startedAt)}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-slate-500">{i.updates[i.updates.length - 1]?.text}</div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTab("incidents");
                    pushToast({ title: "Incident history", message: "Showing embedded incident history.", tone: "default" });
                  }}
                  className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Open incident history
                </button>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Article drawer */}
      <Drawer
        open={articleOpen}
        title={activeArticle ? activeArticle.title : "Article"}
        subtitle={activeArticle ? `${activeArticle.id} · ${activeArticle.category} · Updated ${fmtTime(activeArticle.updatedAt)}` : ""}
        onClose={() => setArticleOpen(false)}
      >
        {!activeArticle ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select an article first.</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="slate">{activeArticle.category}</Badge>
                {activeArticle.tags.map((t) => (
                  <Badge key={t} tone="slate">{t}</Badge>
                ))}
                <span className="ml-auto"><Badge tone="slate">{activeArticle.views.toLocaleString()} views</Badge></span>
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-sm font-semibold text-slate-800">{activeArticle.body}</pre>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="text-sm font-black text-slate-900">Was this helpful?</div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Thanks", message: "Feedback recorded.", tone: "success" })}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Check className="h-4 w-4" />
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Noted", message: "We will improve this article.", tone: "default" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    No
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Still stuck?</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Open a ticket and include the article ID for faster routing.</div>
                    <button
                      type="button"
                      onClick={() => {
                        setArticleOpen(false);
                        setTab("ticket");
                        setTicket((s) => ({
                          ...s,
                          subject: s.subject || `Need help after reading ${activeArticle.id}`,
                          message: s.message || `I tried the steps in ${activeArticle.id} (${activeArticle.title}) but the issue remains.\n\nDetails:`,
                        }));
                        pushToast({ title: "Ticket draft prepared", message: "We added context from the article.", tone: "success" });
                      }}
                      className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.orange }}
                    >
                      <FileText className="h-4 w-4" />
                      Open a ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                safeCopy(`/settings/help#${activeArticle.id}`);
                pushToast({ title: "Link copied", message: "Article link copied.", tone: "success" });
              }}
              className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Copy article link
            </button>
          </div>
        )}
      </Drawer>

      {/* Wizard drawer */}
      <Drawer
        open={wizardOpen}
        title="Guided Troubleshooting"
        subtitle="Super premium - guided checks and recommended next steps"
        onClose={() => setWizardOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Step {wizardStep + 1} of {steps.length}</div>
              <span className="ml-auto"><Badge tone="orange">Super premium</Badge></span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-500">{steps[wizardStep].title} - {steps[wizardStep].subtitle}</div>
          </div>

          {wizardStep === 0 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Issue type</div>
              <div className="mt-3 grid gap-2">
                {["Payout delayed", "Cannot log in", "Order stuck", "Webhook failing", "Ad not delivering"].map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setIssueType(x)}
                    className={cx(
                      "flex items-center justify-between rounded-3xl border bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      issueType === x ? "border-emerald-200" : "border-slate-200/70"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span className={cx("grid h-10 w-10 place-items-center rounded-2xl", issueType === x ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        {x === "Payout delayed" ? <Clock className="h-5 w-5" /> : x === "Cannot log in" ? <ShieldCheck className="h-5 w-5" /> : x === "Order stuck" ? <FileText className="h-5 w-5" /> : x === "Webhook failing" ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-extrabold text-slate-900">{x}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500">Recommended checks and next steps</span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </GlassCard>
          ) : null}

          {wizardStep === 1 ? (
            <GlassCard className="p-4">
              <div className="text-sm font-black text-slate-900">Quick checks</div>
              <div className="mt-3 grid gap-2">
                {[
                  { k: "triedRefresh", t: "I refreshed and re-logged in" },
                  { k: "checkedStatus", t: "I checked the Status Center" },
                  { k: "verifiedKyc", t: "My KYC or KYB is verified" },
                ].map((x) => (
                  <button
                    key={x.k}
                    type="button"
                    onClick={() => setChecks((s) => ({ ...s, [x.k]: !s[x.k] }))}
                    className={cx(
                      "flex items-center justify-between rounded-3xl border bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                      checks[x.k] ? "border-emerald-200" : "border-slate-200/70"
                    )}
                  >
                    <span className="text-sm font-extrabold text-slate-900">{x.t}</span>
                    <span className={cx("grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900", checks[x.k] ? "border-emerald-200" : "border-slate-200/70")}>
                      {checks[x.k] ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Tip</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Accurate checks help the system route your ticket to the correct team.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          ) : null}

          {wizardStep === 2 ? (
            <GlassCard className="p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Recommended action</div>
                <span className="ml-auto"><Badge tone="slate">Auto</Badge></span>
              </div>
              <div className="mt-3 space-y-2">
                {wizardRecommendation.map((x, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3 text-xs font-semibold text-slate-700">
                    {x}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    pushToast({ title: "Steps copied", message: "Recommendations copied to clipboard.", tone: "success" });
                    safeCopy(wizardRecommendation.map((x) => `- ${x}`).join("\n"));
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy steps
                </button>

                <button
                  type="button"
                  onClick={wizardToTicket}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <FileText className="h-4 w-4" />
                  Create ticket with summary
                </button>
              </div>
            </GlassCard>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
              className={cx(
                "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold transition",
                wizardStep === 0 ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => setWizardStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={wizardStep === steps.length - 1}
              className={cx(
                "ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white transition",
                wizardStep === steps.length - 1 ? "cursor-not-allowed opacity-60" : ""
              )}
              style={{ background: TOKENS.orange }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Drawer>

      {/* Full incidents drawer */}
      <Drawer
        open={incOpen}
        title="Incident History"
        subtitle="Embedded history with timeline and updates"
        onClose={() => setIncOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Recent incidents</div>
              <span className="ml-auto"><Badge tone="slate">{incFiltered.length}</Badge></span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-xs font-extrabold text-slate-600">Component</div>
              <div className="relative">
                <select
                  value={incComponent}
                  onChange={(e) => setIncComponent(e.target.value)}
                  className="h-10 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                >
                  {components.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                type="button"
                onClick={() => {
                  safeCopy(JSON.stringify(incFiltered, null, 2));
                  pushToast({ title: "Copied", message: "Incident history JSON copied.", tone: "success" });
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy JSON
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {incFiltered.map((i) => (
              <div key={i.id} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-black text-slate-900">{i.title}</div>
                  <Badge tone={incidentTone(i.status)}>{i.status}</Badge>
                  <span className="ml-auto text-[11px] font-semibold text-slate-500">{i.id}</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">Started {fmtTime(i.startedAt)}{i.resolvedAt ? ` · Resolved ${fmtTime(i.resolvedAt)}` : ""}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.components.map((c) => (
                    <Badge key={c} tone="slate">{c}</Badge>
                  ))}
                </div>

                <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
                  <div className="border-b border-slate-200/70 px-4 py-2 text-[11px] font-extrabold text-slate-500">Updates</div>
                  <div className="divide-y divide-slate-200/70">
                    {i.updates.map((u, idx) => (
                      <div key={idx} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge tone="slate">{fmtTime(u.at)}</Badge>
                          <div className="text-xs font-semibold text-slate-700">{u.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("ticket");
                      setIncOpen(false);
                      setTicket((s) => ({
                        ...s,
                        subject: s.subject || `Issue related to ${i.id}`,
                        message: s.message || `I am impacted by incident ${i.id} (${i.title}).\n\nPlease advise next steps.`,
                        area: i.components.includes("Finance") ? "Finance" : i.components.includes("Messaging") ? "Integrations" : s.area,
                      }));
                      pushToast({ title: "Ticket draft prepared", message: "Incident context added.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <FileText className="h-4 w-4" />
                    Open ticket with context
                  </button>
                </div>
              </div>
            ))}

            {incFiltered.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                <div className="text-lg font-black text-slate-900">No incidents in this view</div>
                <div className="mt-1 text-sm font-semibold text-slate-500">Change the component filter.</div>
              </div>
            ) : null}
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
