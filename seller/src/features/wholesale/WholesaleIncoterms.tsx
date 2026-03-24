import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
import { sellerBackendApi } from "../../lib/backendApi";

void sellerBackendApi.getWorkflowScreenState("seller-feature:wholesale/WholesaleIncoterms").catch(() => undefined);

  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Filter,
  Globe,
  Info,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Ship,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

/**
 * Wholesale Incoterms Tool (Previewable)
 * Route suggestion: /wholesale/incoterms
 *
 * Purpose:
 * - Help sellers and buyers choose the right Incoterm
 * - Make responsibilities clear (costs, risk, documents)
 * - Provide a usable reference + quick chooser
 *
 * Notes:
 * - Educational guidance only, not legal advice.
 * - Incoterms shown as "Incoterms 2020" naming.
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

type IncotermResponsibility = {
  packaging: string;
  originLoading: string;
  exportClearance: string;
  mainCarriage: string;
  insurance: string;
  destinationUnloading: string;
  importClearance: string;
  dutiesTaxes: string;
  onCarriage: string;
};

type Incoterm = {
  code: string;
  name: string;
  group: "E" | "F" | "C" | "D";
  mode: "Any" | "Sea";
  transfer: string;
  bestFor: string[];
  avoidIf: string[];
  warning?: string;
  docs: string[];
  resp: IncotermResponsibility;
};

type Answers = {
  lane: string;
  transportMode: "Any" | "Sea";
  container: boolean;
  sellerExports: boolean;
  sellerPaysMainCarriage: boolean;
  sellerProvidesInsurance: boolean;
  deliverToDestination: boolean;
  sellerUnloads: boolean;
  sellerImports: boolean;
  sellerRisk: number;
};

type Recommendation = { term: Incoterm; score: number; reasons: string[] };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: BadgeTone }) {
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

function SegTab({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: React.MouseEventHandler<HTMLButtonElement>; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/85 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
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
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: "rgba(255,255,255,0.85)" }}>
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

const RESPONSIBILITIES = [
  { key: "packaging", label: "Export packaging and marking" },
  { key: "originLoading", label: "Loading at origin" },
  { key: "exportClearance", label: "Export clearance" },
  { key: "mainCarriage", label: "Main carriage" },
  { key: "insurance", label: "Cargo insurance" },
  { key: "destinationUnloading", label: "Unloading at destination" },
  { key: "importClearance", label: "Import clearance" },
  { key: "dutiesTaxes", label: "Duties and taxes" },
  { key: "onCarriage", label: "On-carriage to final place" },
];

function personPill(who: string): { label: string; tone: BadgeTone } {
  const w = String(who || "").toLowerCase();
  if (w.includes("seller")) return { label: "Seller", tone: "green" };
  if (w.includes("buyer")) return { label: "Buyer", tone: "slate" };
  if (w.includes("shared")) return { label: "Shared", tone: "orange" };
  return { label: "-", tone: "slate" };
}

function termComplexity(group: Incoterm["group"]) {
  // Rough seller complexity / obligation level: E=1, F=2, C=3, D=4
  if (group === "E") return 1;
  if (group === "F") return 2;
  if (group === "C") return 3;
  return 4;
}

const INCOTERMS: Incoterm[] = [
  {
    code: "EXW",
    name: "Ex Works",
    group: "E",
    mode: "Any",
    transfer: "Seller premises (goods made available)",
    bestFor: ["Buyer has a strong forwarder at origin", "Experienced buyer managing export"],
    avoidIf: ["Buyer cannot handle export clearance", "You want seller support at origin"],
    warning: "EXW often creates confusion on export clearance. Consider FCA if seller can clear export.",
    docs: ["Commercial invoice", "Packing list"],
    resp: {
      packaging: "Seller",
      originLoading: "Buyer",
      exportClearance: "Buyer",
      mainCarriage: "Buyer",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "FCA",
    name: "Free Carrier",
    group: "F",
    mode: "Any",
    transfer: "Delivered to carrier (named place)",
    bestFor: ["Container shipments", "Air and courier", "Balanced control"],
    avoidIf: ["Buyer wants seller to pay main carriage"],
    warning: "For containers, FCA is often safer than FOB.",
    docs: ["Commercial invoice", "Packing list", "Export docs", "Proof of delivery to carrier"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Buyer",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "FAS",
    name: "Free Alongside Ship",
    group: "F",
    mode: "Sea",
    transfer: "Alongside the ship (port of shipment)",
    bestFor: ["Bulk or break-bulk cargo"],
    avoidIf: ["Container shipments", "Non-sea transport"],
    warning: "Use only for sea and inland waterway." ,
    docs: ["Commercial invoice", "Packing list", "Export docs"],
    resp: {
      packaging: "Seller",
      originLoading: "Seller",
      exportClearance: "Seller",
      mainCarriage: "Buyer",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "FOB",
    name: "Free On Board",
    group: "F",
    mode: "Sea",
    transfer: "On board the ship (port of shipment)",
    bestFor: ["Sea shipments (non-container)", "Buyer controls ocean freight"],
    avoidIf: ["Container shipments", "Air or road transport"],
    warning: "For containers, many teams prefer FCA instead of FOB.",
    docs: ["Commercial invoice", "Packing list", "Export docs"],
    resp: {
      packaging: "Seller",
      originLoading: "Seller",
      exportClearance: "Seller",
      mainCarriage: "Buyer",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "CFR",
    name: "Cost and Freight",
    group: "C",
    mode: "Sea",
    transfer: "On board the ship (risk transfers at shipment)",
    bestFor: ["Seller can secure freight rates", "Buyer handles insurance"],
    avoidIf: ["Buyer needs seller insurance", "Container confusion"],
    warning: "Risk transfers earlier than cost. Buyer should understand this." ,
    docs: ["Commercial invoice", "Packing list", "Export docs", "Bill of lading"],
    resp: {
      packaging: "Seller",
      originLoading: "Seller",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "CIF",
    name: "Cost, Insurance and Freight",
    group: "C",
    mode: "Sea",
    transfer: "On board the ship (risk transfers at shipment)",
    bestFor: ["Buyer wants seller to provide insurance", "Common for sea trade"],
    avoidIf: ["Non-sea transport"],
    warning: "Seller insurance is usually minimum cover unless agreed otherwise.",
    docs: ["Commercial invoice", "Packing list", "Export docs", "Bill of lading", "Insurance certificate"],
    resp: {
      packaging: "Seller",
      originLoading: "Seller",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Seller",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "CPT",
    name: "Carriage Paid To",
    group: "C",
    mode: "Any",
    transfer: "Delivered to carrier (risk transfers at origin)",
    bestFor: ["Air and courier shipments", "Seller pays main carriage"],
    avoidIf: ["Buyer expects seller to take destination risk"],
    warning: "Seller pays carriage, but risk transfers when handed to carrier.",
    docs: ["Commercial invoice", "Packing list", "Export docs", "Transport document"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Buyer",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "CIP",
    name: "Carriage and Insurance Paid To",
    group: "C",
    mode: "Any",
    transfer: "Delivered to carrier (risk transfers at origin)",
    bestFor: ["Buyer wants seller insurance", "Air shipments"],
    avoidIf: ["Buyer wants to handle insurance"],
    warning: "CIP has higher insurance expectations than CIF in many cases. Confirm cover terms.",
    docs: ["Commercial invoice", "Packing list", "Export docs", "Transport document", "Insurance certificate"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Seller",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Buyer",
    },
  },
  {
    code: "DAP",
    name: "Delivered At Place",
    group: "D",
    mode: "Any",
    transfer: "At destination, ready for unloading",
    bestFor: ["Seller controls delivery end-to-end", "Clear destination service"],
    avoidIf: ["Seller cannot manage destination logistics"],
    warning: "Unloading is buyer responsibility unless agreed otherwise.",
    docs: ["Commercial invoice", "Packing list", "Transport docs"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Shared",
      destinationUnloading: "Buyer",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Seller",
    },
  },
  {
    code: "DPU",
    name: "Delivered At Place Unloaded",
    group: "D",
    mode: "Any",
    transfer: "At destination, unloaded",
    bestFor: ["Buyer wants unloaded delivery", "Seller can manage unloading"],
    avoidIf: ["Unloading is difficult or risky at destination"],
    warning: "Seller must unload. Confirm equipment and site access.",
    docs: ["Commercial invoice", "Packing list", "Transport docs", "Proof of delivery"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Shared",
      destinationUnloading: "Seller",
      importClearance: "Buyer",
      dutiesTaxes: "Buyer",
      onCarriage: "Seller",
    },
  },
  {
    code: "DDP",
    name: "Delivered Duty Paid",
    group: "D",
    mode: "Any",
    transfer: "At destination, ready for unloading (duties paid)",
    bestFor: ["Buyer wants maximum simplicity", "Duties and taxes included"],
    avoidIf: ["Seller cannot register/import in buyer country", "High duty uncertainty"],
    warning: "DDP is the highest seller obligation. Tax and customs risk can be significant.",
    docs: ["Commercial invoice", "Packing list", "Transport docs", "Import docs", "Tax receipts"],
    resp: {
      packaging: "Seller",
      originLoading: "Shared",
      exportClearance: "Seller",
      mainCarriage: "Seller",
      insurance: "Shared",
      destinationUnloading: "Buyer",
      importClearance: "Seller",
      dutiesTaxes: "Seller",
      onCarriage: "Seller",
    },
  },
];

function groupTone(group) {
  if (group === "E") return "slate";
  if (group === "F") return "orange";
  if (group === "C") return "slate";
  return "green";
}

function modeBadge(mode: Incoterm["mode"]): { label: string; tone: BadgeTone } {
  return mode === "Sea" ? { label: "Sea only", tone: "orange" } : { label: "Any mode", tone: "slate" };
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: TOKENS.green }}
            >
              <Check className="h-4 w-4" />
              {action.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score }) {
  const v = Math.max(0, Math.min(100, Number(score || 0)));
  const tone = v >= 80 ? "green" : v >= 60 ? "orange" : "slate";
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-600">
        <span>Match score</span>
        <Badge tone={tone}>{v}</Badge>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div
          className={cx("h-2 rounded-full", tone === "green" ? "bg-emerald-500" : tone === "orange" ? "bg-orange-500" : "bg-slate-500")}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function termSummary(term: Incoterm) {
  const sellerCount = RESPONSIBILITIES.filter((r) => String(term.resp[r.key]).toLowerCase().includes("seller")).length;
  const buyerCount = RESPONSIBILITIES.filter((r) => String(term.resp[r.key]).toLowerCase().includes("buyer")).length;
  const sharedCount = RESPONSIBILITIES.filter((r) => String(term.resp[r.key]).toLowerCase().includes("shared")).length;
  return { sellerCount, buyerCount, sharedCount };
}

function buildExplainText(term: Incoterm, scenario?: { lane?: string }) {
  const parts: string[] = [];
  parts.push(`Incoterm: ${term.code} (${term.name})`);
  parts.push(`Transfer point: ${term.transfer}`);
  parts.push(`Transport: ${term.mode === "Sea" ? "Sea and inland waterway" : "Any mode"}`);
  if (scenario?.lane) parts.push(`Lane: ${scenario.lane}`);

  const bullets = RESPONSIBILITIES.map((r) => {
    const who = term.resp[r.key];
    return `- ${r.label}: ${who}`;
  }).join("\n");

  return `${parts.join("\n")}\n\nResponsibilities\n${bullets}\n\nNotes\n- Best for: ${term.bestFor.join(", ")}\n- Avoid if: ${term.avoidIf.join(", ")}\n- Caution: ${term.warning}`;
}

function computeRecommendations(answers: Answers): Recommendation[] {
  // Simple scoring model focused on seller-side decision making.
  // Higher score = closer fit.
  const modePref = answers.transportMode; // Any | Sea
  const container = answers.container;

  return INCOTERMS
    .filter((t) => (modePref === "Any" ? t.mode === "Any" : true))
    .map((t) => {
      let score = 50;

      // mode
      if (modePref === "Sea") score += t.mode === "Sea" ? 6 : 3;

      // export
      score += answers.sellerExports ? (t.resp.exportClearance === "Seller" ? 10 : -8) : (t.resp.exportClearance === "Buyer" ? 8 : -2);

      // main carriage
      score += answers.sellerPaysMainCarriage ? (t.resp.mainCarriage === "Seller" ? 12 : -8) : (t.resp.mainCarriage === "Buyer" ? 8 : -2);

      // insurance
      score += answers.sellerProvidesInsurance ? (t.resp.insurance === "Seller" ? 10 : -4) : (t.resp.insurance === "Buyer" ? 6 : 0);

      // import
      score += answers.sellerImports ? (t.resp.importClearance === "Seller" ? 16 : -12) : (t.resp.importClearance === "Buyer" ? 6 : -2);
      score += answers.sellerImports ? (t.resp.dutiesTaxes === "Seller" ? 10 : -10) : (t.resp.dutiesTaxes === "Buyer" ? 4 : 0);

      // destination delivery
      score += answers.deliverToDestination ? (t.group === "D" ? 10 : 2) : (t.group === "E" || t.group === "F" ? 6 : 2);

      // unloading
      score += answers.sellerUnloads ? (t.resp.destinationUnloading === "Seller" ? 10 : -3) : (t.resp.destinationUnloading === "Buyer" ? 4 : 0);

      // seller risk appetite
      const complexity = termComplexity(t.group);
      const target = Math.round((answers.sellerRisk / 100) * 3) + 1; // 1..4
      score += 6 - Math.abs(complexity - target) * 3;

      // container guidance
      if (container && ["FOB", "CFR", "CIF"].includes(t.code)) score -= 8;
      if (container && t.code === "FCA") score += 8;

      score = Math.max(0, Math.min(99, Math.round(score)));

      const reasons: string[] = [];
      if (answers.sellerImports && t.code === "DDP") reasons.push("Seller handles import and duties.");
      if (answers.sellerUnloads && t.code === "DPU") reasons.push("Seller unloads at destination.");
      if (answers.sellerPaysMainCarriage && ["CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"].includes(t.code)) reasons.push("Seller pays main carriage.");
      if (answers.sellerProvidesInsurance && ["CIF", "CIP"].includes(t.code)) reasons.push("Seller provides insurance.");
      if (container && t.code === "FCA") reasons.push("Container-friendly choice.");
      if (modePref === "Sea" && t.mode === "Sea") reasons.push("Sea specific term.");
      if (reasons.length === 0) reasons.push("Balanced default based on your answers.");

      return { term: t, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function ResponsibilityRow({ label, who }: { label: string; who: string }) {
  const pill = personPill(who);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
      <div className="text-xs font-extrabold text-slate-700">{label}</div>
      <Badge tone={pill.tone}>{pill.label}</Badge>
    </div>
  );
}

function MiniNote({
  tone = "slate",
  title,
  text,
  icon: Icon,
}: {
  tone?: BadgeTone;
  title: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border p-4",
        tone === "orange" && "border-orange-200 bg-orange-50/70",
        tone === "green" && "border-emerald-200 bg-emerald-50/70",
        tone === "danger" && "border-rose-200 bg-rose-50/70",
        tone === "slate" && "border-slate-200/70 bg-white dark:bg-slate-900/70"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-3xl",
            tone === "orange" && "bg-white dark:bg-slate-900 text-orange-700",
            tone === "green" && "bg-white dark:bg-slate-900 text-emerald-700",
            tone === "danger" && "bg-white dark:bg-slate-900 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className={cx("text-sm font-black", tone === "orange" ? "text-orange-900" : tone === "green" ? "text-emerald-900" : tone === "danger" ? "text-rose-900" : "text-slate-900")}>{title}</div>
          <div className={cx("mt-1 text-xs font-semibold", tone === "orange" ? "text-orange-900/70" : tone === "green" ? "text-emerald-900/70" : tone === "danger" ? "text-rose-900/70" : "text-slate-500")}>{text}</div>
        </div>
      </div>
    </div>
  );
}

export default function WholesaleIncotermsTool() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [tab, setTab] = useState("Chooser");

  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("All"); // All | Any | Sea
  const [groupFilter, setGroupFilter] = useState("All"); // All | E | F | C | D

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCode, setActiveCode] = useState<string>("FOB");

  const active = useMemo(() => INCOTERMS.find((t) => t.code === activeCode) || INCOTERMS[0], [activeCode]);

  const [answers, setAnswers] = useState<Answers>({
    lane: "China → Africa (example)",
    transportMode: "Sea", // Any | Sea
    container: true,
    sellerExports: true,
    sellerPaysMainCarriage: false,
    sellerProvidesInsurance: false,
    deliverToDestination: false,
    sellerUnloads: false,
    sellerImports: false,
    sellerRisk: 40,
  });

  const recs = useMemo(() => computeRecommendations(answers), [answers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INCOTERMS
      .filter((t) => (modeFilter === "All" ? true : t.mode === modeFilter))
      .filter((t) => (groupFilter === "All" ? true : t.group === groupFilter))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.code, t.name, t.group, t.mode, t.transfer, (t.bestFor || []).join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [search, modeFilter, groupFilter]);

  const exportText = useMemo(() => buildExplainText(active, { lane: answers.lane }), [active, answers.lane]);

  const commonMistakes = [
    {
      title: "Using FOB for container shipments",
      body: "For many container moves, FCA is preferred because delivery happens when the goods are handed to the carrier, not necessarily on board the vessel.",
      tone: "orange",
    },
    {
      title: "Assuming C-terms transfer risk at destination",
      body: "C-terms (CFR/CIF/CPT/CIP) often transfer risk earlier (at shipment or carrier handover) even when the seller pays carriage to destination.",
      tone: "slate",
    },
    {
      title: "DDP without import capability",
      body: "DDP means the seller manages import clearance and duties. If you cannot import in the buyer country, avoid DDP or use a local partner structure.",
      tone: "danger",
    },
  ];

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
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Incoterms Tool</div>
                <Badge tone="slate">Wholesale</Badge>
                <Badge tone="slate">Incoterms 2020</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">
                Choose the right Incoterm, understand responsibilities, and reduce disputes.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(exportText);
                  pushToast({ title: "Copied", message: "Incoterm summary copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy summary
              </button>
              <button
                type="button"
                onClick={() =>
                  pushToast({ title: "Export", message: "Wire export to PDF from your backend.", tone: "default" })
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  pushToast({
                    title: "Use in Quote",
                    message: "This will be wired to Quote Builder.",
                    tone: "default",
                    action: { label: "Open quotes", onClick: () => (window.location.hash = "/wholesale/quotes") },
                  });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <FileText className="h-4 w-4" />
                Use in Quote
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex flex-wrap gap-2">
            <SegTab label="Chooser" active={tab === "Chooser"} onClick={() => setTab("Chooser")} icon={Sparkles} />
            <SegTab label="Compare" active={tab === "Compare"} onClick={() => setTab("Compare")} icon={ClipboardList} />
            <SegTab label="Cheat Sheet" active={tab === "Cheat Sheet"} onClick={() => setTab("Cheat Sheet")} icon={BookOpen} />
            <SegTab label="FAQ" active={tab === "FAQ"} onClick={() => setTab("FAQ")} icon={Info} />
            <div className="ml-auto flex items-center gap-2">
              <Badge tone="slate">Route: /wholesale/incoterms</Badge>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-7">
            <GlassCard className="p-4">
              {/* Filters (for Compare + Cheat Sheet) */}
              {tab !== "Chooser" ? (
                <div className="grid gap-2 md:grid-cols-12 md:items-center">
                  <div className="relative md:col-span-6">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search term, code, notes"
                      className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Mode</div>
                      <div className="ml-auto relative">
                        <select
                          value={modeFilter}
                          onChange={(e) => setModeFilter(e.target.value)}
                          className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800"
                        >
                          {["All", "Any", "Sea"].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <div className="text-xs font-extrabold text-slate-700">Group</div>
                      <div className="ml-auto relative">
                        <select
                          value={groupFilter}
                          onChange={(e) => setGroupFilter(e.target.value)}
                          className="h-9 appearance-none rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-9 text-xs font-extrabold text-slate-800"
                        >
                          {["All", "E", "F", "C", "D"].map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-12 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setModeFilter("All");
                        setGroupFilter("All");
                        pushToast({ title: "Cleared", message: "Filters cleared.", tone: "default" });
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                      Clear filters
                    </button>
                    <span className="ml-auto">
                      <Badge tone="slate">{filtered.length} terms</Badge>
                    </span>
                  </div>
                </div>
              ) : null}

              <div className={cx(tab !== "Chooser" && "mt-4")}>
                {tab === "Chooser" ? (
                  <ChooserPanel
                    answers={answers}
                    setAnswers={setAnswers}
                    recs={recs}
                    onOpenTerm={(code) => {
                      setActiveCode(code);
                      setDrawerOpen(true);
                    }}
                    onCopy={(text) => {
                      safeCopy(text);
                      pushToast({ title: "Copied", message: "Chooser summary copied.", tone: "success" });
                    }}
                    onToast={pushToast}
                  />
                ) : null}

                {tab === "Compare" ? (
                  filtered.length === 0 ? (
                    <EmptyState title="No matches" message="Try a different search or reset filters." />
                  ) : (
                    <CompareTable
                      terms={filtered}
                      onOpen={(code) => {
                        setActiveCode(code);
                        setDrawerOpen(true);
                      }}
                    />
                  )
                ) : null}

                {tab === "Cheat Sheet" ? (
                  filtered.length === 0 ? (
                    <EmptyState title="No matches" message="Try a different search or reset filters." />
                  ) : (
                    <CheatSheet
                      terms={filtered}
                      onOpen={(code) => {
                        setActiveCode(code);
                        setDrawerOpen(true);
                      }}
                    />
                  )
                ) : null}

                {tab === "FAQ" ? (
                  <FaqPanel mistakes={commonMistakes} onOpen={(code) => { setActiveCode(code); setDrawerOpen(true); }} />
                ) : null}
              </div>
            </GlassCard>
          </div>

          {/* Right */}
          <div className="lg:col-span-5">
            <div className="space-y-4">
              <GlassCard className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">Selected term</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Click a term anywhere to view details.</div>
                  </div>
                  <Badge tone={groupTone(active.group)}>{`Group ${active.group}`}</Badge>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-slate-900">{active.code}</div>
                        <Badge tone="slate">{active.name}</Badge>
                        <Badge tone={modeBadge(active.mode).tone}>{modeBadge(active.mode).label}</Badge>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-500">Transfer point: {active.transfer}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDrawerOpen(true)}
                          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <ChevronRight className="h-4 w-4" />
                          Open detail
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            safeCopy(buildExplainText(active, { lane: answers.lane }));
                            pushToast({ title: "Copied", message: "Full term notes copied.", tone: "success" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                        >
                          <Copy className="h-4 w-4" />
                          Copy notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(() => {
                    const s = termSummary(active);
                    return (
                      <>
                        <MiniStat label="Seller items" value={String(s.sellerCount)} icon={Package} tone="green" />
                        <MiniStat label="Buyer items" value={String(s.buyerCount)} icon={Truck} tone="slate" />
                        <MiniStat label="Shared" value={String(s.sharedCount)} icon={ShieldCheck} tone="orange" />
                      </>
                    );
                  })()}
                </div>
              </GlassCard>

              <MiniNote
                tone="orange"
                title="EVzone integration"
                text="Use Incoterms selection to auto-fill quote cost lines (freight, insurance, duty exposure) and to set buyer expectations."
                icon={Info}
              />

              <MiniNote
                tone="slate"
                title="Suggested seller policy"
                text="For new B2B buyers, consider FCA/CPT/CIP with clear insurance coverage and document checklist."
                icon={ClipboardList}
              />

              {answers.container ? (
                <MiniNote
                  tone="orange"
                  title="Container shipment tip"
                  text="If this is a container shipment, FCA is often preferred over FOB to avoid handover ambiguity."
                  icon={AlertTriangle}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        title={`${active.code} · ${active.name}`}
        subtitle={`Group ${active.group} · ${active.mode === "Sea" ? "Sea only" : "Any mode"}`}
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900">Transfer point</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{active.transfer}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Responsibilities</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Who handles and pays each step (summary).</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  safeCopy(buildExplainText(active, { lane: answers.lane }));
                  pushToast({ title: "Copied", message: "Responsibilities copied.", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {RESPONSIBILITIES.map((r) => (
                <ResponsibilityRow key={r.key} label={r.label} who={active.resp[r.key]} />
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <div className="text-sm font-black text-emerald-900">Best for</div>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-emerald-900/80">
                {active.bestFor.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-700" />
                <div className="text-sm font-black text-orange-900">Avoid if</div>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-orange-900/80">
                {active.avoidIf.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black text-rose-900">Caution</div>
                <div className="mt-1 text-xs font-semibold text-rose-900/70">{active.warning}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Typical documents</div>
              <span className="ml-auto"><Badge tone="slate">Checklist</Badge></span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {active.docs.map((d) => (
                <span key={d} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">EVzone system mapping</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Where this connects in your Wholesale flow.</div>
              </div>
              <Badge tone="slate">Demo</Badge>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <MapCard title="Quotes" icon={FileText} text="Store Incoterm on quote, show it on PDF, and compute cost line items." />
              <MapCard title="Shipping Profiles" icon={Truck} text="Map allowed Incoterms per lane and carrier capability." />
              <MapCard title="Checkout" icon={Package} text="Explain to buyer who pays duties, insurance, and delivery legs." />
              <MapCard title="Disputes" icon={ShieldCheck} text="If disputes occur, show the responsibilities timeline clearly." />
            </div>
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div className={cx("grid h-11 w-11 place-items-center rounded-2xl", tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
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

function MapCard({ title, text, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-black text-slate-900">{title}</div>
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-500">{text}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cx(
        "flex items-center justify-between rounded-3xl border bg-white dark:bg-slate-900/70 px-4 py-3 text-left transition",
        value ? "border-emerald-200" : "border-slate-200/70 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      <div className="text-xs font-extrabold text-slate-800">{label}</div>
      <div
        className={cx(
          "h-6 w-11 rounded-full border p-0.5 transition",
          value ? "border-emerald-200 bg-emerald-50" : "border-slate-200/70 bg-white dark:bg-slate-900"
        )}
      >
        <div
          className={cx(
            "h-5 w-5 rounded-full transition",
            value ? "translate-x-5 bg-emerald-500" : "translate-x-0 bg-slate-300"
          )}
        />
      </div>
    </button>
  );
}

function ChipRow({ label, options, value, onChange, icon: Icon }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                  value === o.value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChooserPanel({ answers, setAnswers, recs, onOpenTerm, onCopy, onToast }) {
  const top = recs.slice(0, 3);

  const summaryText = useMemo(() => {
    const best = top[0];
    if (!best) return "";
    const t = best.term;
    const why = best.reasons.map((x) => `- ${x}`).join("\n");
    return `Recommended Incoterm: ${t.code} (${t.name})\nTransfer point: ${t.transfer}\n\nWhy\n${why}`;
  }, [top]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Quick chooser</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Answer a few questions and get the top recommended terms.</div>
          </div>
          <button
            type="button"
            onClick={() => onCopy(summaryText)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
          >
            <Copy className="h-4 w-4" />
            Copy result
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div className="text-[11px] font-extrabold text-slate-600">Lane label</div>
            <input
              value={answers.lane}
              onChange={(e) => setAnswers((s) => ({ ...s, lane: e.target.value }))}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              placeholder="China → Africa"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ChipRow
              label="Transport mode"
              icon={Globe}
              value={answers.transportMode}
              onChange={(v) => setAnswers((s) => ({ ...s, transportMode: v }))}
              options={[
                { label: "Any", value: "Any" },
                { label: "Sea", value: "Sea" },
              ]}
            />

            <ChipRow
              label="Shipment type"
              icon={Ship}
              value={answers.container ? "Container" : "Non-container"}
              onChange={(v) => setAnswers((s) => ({ ...s, container: v === "Container" }))}
              options={[
                { label: "Container", value: "Container" },
                { label: "Non-container", value: "Non-container" },
              ]}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Seller handles export clearance" value={answers.sellerExports} onChange={(v) => setAnswers((s) => ({ ...s, sellerExports: v }))} />
            <Toggle label="Seller pays main carriage" value={answers.sellerPaysMainCarriage} onChange={(v) => setAnswers((s) => ({ ...s, sellerPaysMainCarriage: v }))} />
            <Toggle label="Seller provides insurance" value={answers.sellerProvidesInsurance} onChange={(v) => setAnswers((s) => ({ ...s, sellerProvidesInsurance: v }))} />
            <Toggle label="Deliver to destination place" value={answers.deliverToDestination} onChange={(v) => setAnswers((s) => ({ ...s, deliverToDestination: v }))} />
            <Toggle label="Seller unloads at destination" value={answers.sellerUnloads} onChange={(v) => setAnswers((s) => ({ ...s, sellerUnloads: v }))} />
            <Toggle label="Seller handles import and duties" value={answers.sellerImports} onChange={(v) => setAnswers((s) => ({ ...s, sellerImports: v }))} />
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-700">Seller risk appetite</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500">Lower means seller wants less responsibility.</div>
              </div>
              <Badge tone="slate">{answers.sellerRisk}</Badge>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={answers.sellerRisk}
              onChange={(e) => setAnswers((s) => ({ ...s, sellerRisk: Number(e.target.value) }))}
              className="mt-3 w-full"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Low obligation</span>
              <span>High obligation</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">Top recommendations</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Open details for responsibilities and docs.</div>
          </div>
          <Badge tone="slate">Top 3</Badge>
        </div>

        <div className="mt-3 grid gap-2">
          {top.map((r, idx) => (
            <button
              key={r.term.code}
              type="button"
              onClick={() => onOpenTerm(r.term.code)}
              className={cx(
                "rounded-3xl border bg-white dark:bg-slate-900 p-4 text-left transition hover:bg-gray-50 dark:bg-slate-950",
                idx === 0 ? "border-emerald-200" : "border-slate-200/70"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cx("grid h-11 w-11 place-items-center rounded-3xl", idx === 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                  {r.term.mode === "Sea" ? <Ship className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{r.term.code}</div>
                    <Badge tone="slate">{r.term.name}</Badge>
                    <span className="ml-auto"><Badge tone={idx === 0 ? "green" : "slate"}>{idx === 0 ? "Best" : "Alt"}</Badge></span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Transfer: {r.term.transfer}</div>
                  <ScoreBar score={r.score} />
                  <div className="mt-2 text-[11px] font-semibold text-slate-600">
                    {r.reasons.slice(0, 3).join(" ")}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          ))}
          {top.length === 0 ? <EmptyState title="No recommendations" message="Adjust the chooser inputs." /> : null}
        </div>

        <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-orange-900">Tip</div>
              <div className="mt-1 text-xs font-semibold text-orange-900/70">
                Always put the named place clearly (for example, "FCA Shanghai Terminal" or "DAP Kampala Warehouse").
              </div>
              <button
                type="button"
                onClick={() => onToast({ title: "Tip saved", message: "Add this to your quote template.", tone: "success" })}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-800"
              >
                <Check className="h-4 w-4" />
                Save to template
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareTable({ terms, onOpen }) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">Compare responsibilities</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Scroll horizontally to view all terms.</div>
          </div>
          <Badge tone="slate">Matrix</Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
              <div className="col-span-4">Responsibility</div>
              <div className="col-span-8">Terms</div>
            </div>

            <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3">
              <div className="col-span-4" />
              <div className="col-span-8">
                <div className="flex flex-wrap gap-2">
                  {terms.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => onOpen(t.code)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:bg-slate-950"
                    >
                      <Badge tone={groupTone(t.group)}>{t.code}</Badge>
                      <span className="hidden sm:inline">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {RESPONSIBILITIES.map((r) => (
                <div key={r.key} className="grid grid-cols-12 gap-2 px-4 py-3">
                  <div className="col-span-4">
                    <div className="text-xs font-extrabold text-slate-800">{r.label}</div>
                  </div>
                  <div className="col-span-8">
                    <div className="flex flex-wrap gap-2">
                      {terms.map((t) => {
                        const pill = personPill(t.resp[r.key]);
                        return (
                          <span
                            key={`${t.code}_${r.key}`}
                            className={cx(
                              "inline-flex items-center rounded-2xl border px-3 py-2 text-[11px] font-extrabold",
                              pill.tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-800",
                              pill.tone === "orange" && "border-orange-200 bg-orange-50 text-orange-800",
                              pill.tone === "slate" && "border-slate-200/70 bg-gray-50 dark:bg-slate-950 text-slate-700"
                            )}
                          >
                            {t.code}: {pill.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-emerald-900">Policy suggestion</div>
            <div className="mt-1 text-xs font-semibold text-emerald-900/70">
              If you offer DDP, require a duty buffer line and a clear clause for customs reclassification.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheatSheet({ terms, onOpen }) {
  const grouped = useMemo(() => {
    const m = new Map();
    terms.forEach((t) => {
      const k = t.group;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
    });
    return ["E", "F", "C", "D"].filter((k) => m.has(k)).map((k) => ({ group: k, items: m.get(k) }));
  }, [terms]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Cheat sheet</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Fast overview grouped by E, F, C, D.</div>
          </div>
          <Badge tone="slate">Reference</Badge>
        </div>
      </div>

      {grouped.map((g) => (
        <div key={g.group} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            <Badge tone={groupTone(g.group)}>{`Group ${g.group}`}</Badge>
            <div className="text-xs font-extrabold text-slate-700">{g.group === "E" ? "Pickup" : g.group === "F" ? "Main carriage unpaid" : g.group === "C" ? "Carriage paid" : "Arrive"}</div>
            <span className="ml-auto"><Badge tone="slate">{g.items.length}</Badge></span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {g.items.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => onOpen(t.code)}
                className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4 text-left transition hover:bg-gray-50 dark:bg-slate-950"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                    {t.mode === "Sea" ? <Ship className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-black text-slate-900">{t.code}</div>
                      <Badge tone="slate">{t.name}</Badge>
                      <span className="ml-auto"><Badge tone={modeBadge(t.mode).tone}>{modeBadge(t.mode).label}</Badge></span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-500">{t.transfer}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(t.bestFor || []).slice(0, 2).map((x) => (
                        <span key={x} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] font-extrabold text-slate-700">
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-orange-900">Reminder</div>
            <div className="mt-1 text-xs font-semibold text-orange-900/70">
              Incoterms define delivery, risk, and cost split. They do not define payment terms or transfer of title.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqPanel({ mistakes, onOpen }) {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-slate-100 text-slate-700">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">FAQ and common mistakes</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">High-impact issues that cause disputes.</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {mistakes.map((m, idx) => (
          <div key={m.title} className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setOpenIdx((v) => (v === idx ? -1 : idx))}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              <div className={cx("grid h-10 w-10 place-items-center rounded-3xl", m.tone === "danger" ? "bg-rose-50 text-rose-700" : m.tone === "orange" ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700")}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{m.title}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Click to expand</div>
              </div>
              <ChevronDown className={cx("h-4 w-4 text-slate-400 transition", openIdx === idx && "rotate-180")} />
            </button>

            <AnimatePresence initial={false}>
              {openIdx === idx ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm font-semibold text-slate-700">{m.body}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-emerald-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-emerald-900">Which term should I use for containers?</div>
            <div className="mt-1 text-xs font-semibold text-emerald-900/70">Often FCA is safer than FOB for containers. Open FCA details to confirm responsibilities.</div>
            <button
              type="button"
              onClick={() => onOpen("FCA")}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-emerald-800"
            >
              Open FCA
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
