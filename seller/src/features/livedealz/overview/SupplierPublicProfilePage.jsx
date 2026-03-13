import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SupplierPublicProfilePage.jsx
 * Controlled Mirroring Mode (Creator ↔ Supplier)
 * ------------------------------------------------
 * Purpose:
 * - Public mini-site view for a SUPPLIER (seller/provider) as seen by Creators.
 * - Symmetric counterpart to CreatorPublicProfilePage.
 *
 * Mirror-first preserved (from CreatorPublicProfilePage patterns):
 * - PageHeader + gradient banner + hero card
 * - Left column: About, Performance snapshot, Portfolio, Open opportunities, Reviews
 * - Right column: Social links, Past campaigns, Tags, Compatibility score, Quick facts
 * - Premium UI: rounded-2xl cards, light grey background, orange/green accents
 *
 * Supplier adaptations (required):
 * - Creator-facing CTA: “Invite supplier” / “Request collaboration” (opens Invite drawer)
 * - Invite flow is acceptance-based: Supplier ACCEPTS invite to collaborate → Negotiation → Contract
 * - Invite drawer supports: campaign concept, deliverables, compensation model, attachments, region + schedule
 * - Optional preview toggle: Creator View vs Supplier Preview (role awareness)
 *
 * Canvas-safe:
 * - No external icon libs, no MUI.
 * - Uses lightweight toast + drawer.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function goTo(navigate, path) {
  try {
    if (!path) return;
    const target = /^https?:\/\//i.test(path) ? path : path.startsWith("/") ? path : `/${path}`;
    if (/^https?:\/\//i.test(target)) {
      window.open(target, "_blank", "noreferrer");
      return;
    }
    navigate(target);
  } catch {
    // ignore
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function money(currency, value) {
  const v = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(v);
  } catch {
    return `${currency || "USD"} ${v.toLocaleString()}`;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* ----------------------------- Toast ----------------------------- */

function Toast({ text, tone = "info", onClose }) {
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [text, onClose]);

  if (!text) return null;

  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "error"
          ? "bg-rose-500"
          : "bg-slate-400";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
      <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg flex items-center gap-2">
        <span className={cx("h-2 w-2 rounded-full", dot)} />
        <span>{text}</span>
      </div>
    </div>
  );
}

/* ----------------------------- UI atoms ----------------------------- */

function PageHeader({ pageTitle, subtitle, rightContent, onBack }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <button
            type="button"
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 transition-colors"
            title="Back"
            onClick={onBack}
          >
            ←
          </button>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 truncate">{pageTitle}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-300">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function Pill({ tone = "neutral", children, title, className = "" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
      : tone === "warn"
        ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400"
        : tone === "bad"
          ? "bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-400"
          : tone === "brand"
            ? "text-white border-transparent"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold", cls, className)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({ tone = "neutral", onClick, disabled, children, title, className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "ghost"
        ? "border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100"
        : tone === "danger"
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children, footer }) {
  return (
    <div className={cx("fixed inset-0 z-[70]", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      <div
        className={cx(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute top-0 right-0 h-full w-full sm:w-[560px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
            </div>
            <Btn tone="ghost" onClick={onClose}>
              ✕
            </Btn>
          </div>
          <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
          {footer ? (
            <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-900/30">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">{children}</h2>
      {right}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors">
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex flex-col justify-between transition-colors">
      <span className="text-xs text-slate-500 dark:text-slate-300 mb-0.5">{label}</span>
      <span className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-0.5">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{sub}</span>
    </div>
  );
}

/* ----------------------------- Cards ----------------------------- */

function SocialLinksCard({ onAction }) {
  const socials = [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">Social links</h2>
      <div className="space-y-1.5">
        {socials.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={() => onAction?.(`Opening ${s.name}… ↗`)}
          >
            <div className="flex items-center gap-2">
              <div className={cx("h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold text-white", s.color)}>
                {s.tag}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-50">{s.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">{s.handle}</span>
              </div>
            </div>
            <button className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-100 font-medium transition-colors">
              <span className="text-xs">↗</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PastCampaignsCard({ onAction }) {
  const campaigns = [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-slate-600 dark:text-slate-200 font-medium">Past campaigns</h2>
        <span className="text-xs text-slate-500 dark:text-slate-300">{campaigns.length} Dealz</span>
      </div>
      <div className="space-y-1.5">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex items-start justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{c.period}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span>
                  <span className="font-semibold">GMV {c.gmv}</span>
                </span>
                <span>Payout {c.payout}</span>
                <span>★ {c.rating}</span>
              </div>
            </div>
            <button
              className="text-xs whitespace-nowrap px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
              onClick={() => onAction?.("View Dealz")}
            >
              View Dealz ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagsCard() {
  const tags = [];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">Tags</h2>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        These tags help creators find suppliers aligned with their audience and style.
      </p>
    </div>
  );
}

function CompatibilityCard({ onAction }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold">Compatibility score</h2>
        <span className="text-xs text-slate-400 dark:text-slate-400">Creator-side estimate</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
        Based on category match, payout reliability, fulfillment signals, and audience overlap.
      </p>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors">
          <div className="h-11 w-11 rounded-full bg-[#03cd8c] text-white flex items-center justify-center text-sm font-semibold dark:text-slate-50 dark:font-bold">
            86%
          </div>
        </div>
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <p className="mb-1">
            Strong fit for creators who do <span className="font-semibold">beauty flash dealz</span> and short clips.
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Fast payouts and clear briefs.</li>
            <li>High conversion with bundles and discounts.</li>
          </ul>
        </div>
      </div>
      <button
        className="w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={() => onAction?.("compatibility")}
      >
        See full compatibility breakdown
      </button>
    </div>
  );
}

function QuickFactsCard({ onDownload }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-xs font-semibold mb-2">Quick collaboration facts</h2>
      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
        <li>KYB verified supplier account.</li>
        <li>Typical payout to creators: 48–72 hours after Admin approval.</li>
        <li>Strong preference: bundles, limited-time discounts, clear claims.</li>
        <li>Supports multi-creator campaigns and split deliverables.</li>
      </ul>
      <button
        className="mt-3 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={onDownload}
      >
        Download brand kit
      </button>
    </div>
  );
}

/* ----------------------------- Invite Drawer (Creator → Supplier) ----------------------------- */

function InviteSupplierDrawer({ open, onClose, supplier, toast }) {
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const [sending, setSending] = useState(false);
  const [record, setRecord] = useState(null);

  const [collabModel, setCollabModel] = useState("Hybrid");
  const [region, setRegion] = useState("East Africa");
  const [startDate, setStartDate] = useState(todayYMD());
  const [durationDays, setDurationDays] = useState(14);

  const [deliverables, setDeliverables] = useState("• 1x Live session (60–90 mins)\n• 3x Short clips (15–30s)\n• 2x Stories (pre + post)");
  const [fee, setFee] = useState(350);
  const [commission, setCommission] = useState(5);

  const [message, setMessage] = useState(
    `Hi ${supplier?.name || ""},\n\nI’d like to collaborate on a campaign for your brand. If you accept this invite to collaborate, we can open negotiation and finalize the contract.\n\nThanks!`
  );

  const fileRef = useRef(null);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSending(false);
    setRecord(null);
    setCollabModel("Hybrid");
    setRegion("East Africa");
    setStartDate(todayYMD());
    setDurationDays(14);
    setDeliverables("• 1x Live session (60–90 mins)\n• 3x Short clips (15–30s)\n• 2x Stories (pre + post)");
    setFee(350);
    setCommission(5);
    setMessage(
      `Hi ${supplier?.name || ""},\n\nI’d like to collaborate on a campaign for your brand. If you accept this invite to collaborate, we can open negotiation and finalize the contract.\n\nThanks!`
    );
    setAttachments([]);
  }, [open, supplier?.name]);

  const sendInvite = async () => {
    setSending(true);
    await sleep(950);
    const rec = {
      id: `INV-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
      status: "Pending supplier acceptance",
      createdAt: new Date().toLocaleString()
    };
    setRecord(rec);
    setSending(false);
    toast?.("Invite sent. Supplier must accept to open negotiation.", "success");
  };

  const markAccepted = () => {
    if (!record) return;
    setRecord({ ...record, status: "Accepted" });
    toast?.("Supplier accepted.", "success");
  };

  const openNegotiation = () => {
    if (!record) return;
    go(`/creator/negotiation-room?supplier=${encodeURIComponent(supplier?.handle || "@supplier")}&invite=${encodeURIComponent(record.id)}`);
    toast?.("Opening Negotiation Room…", "info");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Invite supplier"
      subtitle="Creator invite builder · Supplier accepts invite → Negotiation → Contract"
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {record ? (
              <>
                Status: <span className="font-extrabold">{record.status}</span> · {record.id}
              </>
            ) : (
              "Draft"
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={onClose}>Close</Btn>
            <Btn tone="primary" onClick={sendInvite} disabled={sending}>
              {sending ? "Sending…" : "Send invite"}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-extrabold text-slate-600 dark:text-slate-200">
              {supplier?.initials || "SP"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50 truncate">{supplier?.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300 truncate">{supplier?.handle} · {supplier?.type} · {supplier?.region}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Collaboration proposal</div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Collaboration model
              <select
                value={collabModel}
                onChange={(e) => setCollabModel(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              >
                {"Flat fee,Commission,Hybrid".split(",").map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Region
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              >
                {"East Africa,West Africa,Southern Africa,North Africa,Africa / Asia,Global".split(",").map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Duration (days)
              <input
                type="number"
                min={1}
                max={45}
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, Math.min(45, Number(e.target.value || 1))))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Flat fee
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Commission (%)
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
          </div>

          <label className="mt-3 block text-xs text-slate-600 dark:text-slate-300">
            Deliverables
            <textarea
              rows={5}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none resize-none"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Message</div>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm outline-none resize-none"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const arr = Array.from(e.target.files || []);
                if (!arr.length) return;
                setAttachments((prev) => [...prev, ...arr]);
              }}
            />
            <Btn onClick={() => fileRef.current?.click()}>📎 Attach media kit</Btn>
            {attachments.length ? (
              <Btn tone="danger" onClick={() => setAttachments([])}>
                Clear
              </Btn>
            ) : null}
            <div className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
              {attachments.length ? `${attachments.length} attachment(s)` : "No attachments"}
            </div>
          </div>

          {attachments.length ? (
            <div className="mt-2 space-y-1">
              {attachments.slice(0, 5).map((f) => (
                <div
                  key={f.name}
                  className="flex items-center justify-between text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/30"
                >
                  <span className="truncate max-w-[360px]">{f.name}</span>
                  <span className="text-slate-500">{Math.max(1, Math.round((f.size || 0) / (1024 * 1024)))}MB</span>
                </div>
              ))}
              {attachments.length > 5 ? <div className="text-[11px] text-slate-500">+{attachments.length - 5} more</div> : null}
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Workflow reminder</div>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              Invite flow: Creator sends invite → Supplier ACCEPTS invite to collaborate → Negotiation room opens → Contract → Content submission → Approvals → Execution.
            </div>
          </div>
        </div>

        {/* Simulation + next */}
        {record ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">Invite created</div>
                <div className="mt-1 text-[11px] text-emerald-900/80 dark:text-emerald-300/80">
                  {record.status} · {record.createdAt}
                </div>
              </div>
              <Pill tone="good">{record.id}</Pill>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {/* ✅ Keep simulation button */}
              <Btn onClick={markAccepted} disabled={record.status === "Accepted"} title="Simulate supplier acceptance">
                ✅ Mark Accepted
              </Btn>
              <Btn tone="primary" onClick={openNegotiation} disabled={record.status !== "Accepted"}>
                🗣️ Open Negotiation Room
              </Btn>
              <Btn
                onClick={() => {
                  go("/supplier/collabs/invites-from-creators");
                  toast?.("Opening supplier inbox…", "info");
                }}
              >
                📥 View Supplier Inbox
              </Btn>
            </div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/* ----------------------------- Main page ----------------------------- */

export default function SupplierPublicProfilePage() {
  const navigate = useNavigate();
  const go = (path) => goTo(navigate, path);
  const supplier = useMemo(
    () => ({
      name: "GlowUp Hub",
      handle: "@glowuphub",
      initials: "GH",
      type: "Products (Wholesale + Retail)",
      region: "East Africa",
      verified: true,
      kyb: true
    }),
    []
  );

  const [viewerMode, setViewerMode] = useState("Creator"); // Creator | Supplier

  const [isFollowing, setIsFollowing] = useState(false);
  const [pendingFollow, setPendingFollow] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);

  const [toastText, setToastText] = useState(null);
  const [toastTone, setToastTone] = useState("info");

  const toast = (msg, tone = "info") => {
    setToastTone(tone);
    setToastText(msg);
  };

  const toggleFollow = async () => {
    setPendingFollow(true);
    await sleep(650);
    setPendingFollow(false);
    setIsFollowing((s) => !s);
    toast(!isFollowing ? "Supplier saved to My Suppliers 🎉" : "Removed from My Suppliers", "success");
  };

  const downloadBrandKit = async () => {
    toast("Preparing brand kit…", "info");
    await sleep(850);
    const dummy = `Supplier Brand Kit\n\nBrand: ${supplier.name}\nHandle: ${supplier.handle}\n\nIncludes:\n- Logos\n- Color palette\n- Claims guidance\n- Product list summary\n`;
    const blob = new Blob([dummy], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${supplier.name.replace(/\s+/g, "_")}_BrandKit.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast("Download complete ⬇️", "success");
  };

  const handleAction = (action) => {
    if (String(action).includes("View Dealz")) {
      go("/supplier/dealz-marketplace");
      toast("Opening Dealz Marketplace…", "info");
    } else if (String(action).includes("compatibility")) {
      toast("Generating compatibility breakdown…", "info");
    } else {
      toast(action, "info");
    }
  };

  const followLabel = isFollowing ? "Unsave" : "Save";

  const headerRight = (
    <>
      <Btn tone="ghost" onClick={() => setViewerMode((m) => (m === "Creator" ? "Supplier" : "Creator"))}>
        👁️ {viewerMode === "Creator" ? "Creator view" : "Supplier preview"}
      </Btn>
      {viewerMode === "Creator" ? (
        <button
          className={cx(
            "px-3 py-1 rounded-full border text-sm transition-colors flex items-center gap-2",
            isFollowing
              ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
              : "border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
          )}
          onClick={toggleFollow}
          disabled={pendingFollow}
        >
          {followLabel}
        </button>
      ) : (
        <>
          <Btn
            onClick={() => {
              toast("Public link copied", "success");
            }}
          >
            🔗 Copy link
          </Btn>
          <Btn
            tone="primary"
            onClick={() => {
              toast("Opening profile editor", "info");
            }}
          >
            ✏️ Edit
          </Btn>
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors relative">
      <PageHeader
        pageTitle="Supplier Public Page"
        subtitle={viewerMode === "Creator" ? "Creator view · Supplier mini-site" : "Supplier preview · Public view"}
        rightContent={headerRight}
        onBack={() => {
          go(viewerMode === "Creator" ? "/creator/suppliers" : "/supplier/settings");
          toast("Back", "info");
        }}
      />

      {/* Hero section */}
      <main className="flex-1 flex flex-col pb-24">
        <section className="relative">
          <div className="h-20 md:h-24 bg-gradient-to-r from-[#f77f00] via-[#03cd8c] to-[#f77f00]" />

          <div className="w-full max-w-full px-[0.55%] -mt-8 pb-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center md:items-end">
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div className="relative">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-white bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-lg md:text-xl font-semibold text-slate-600 dark:text-slate-300">
                    {supplier.initials}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center text-xs text-white"
                    style={{ background: GREEN }}
                    title="Verified"
                  >
                    ✓
                  </span>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base md:text-lg font-semibold dark:font-bold leading-tight">{supplier.name}</h1>
                    <span className="text-sm text-slate-500 dark:text-slate-300">{supplier.handle}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 transition-colors">
                      🏷️ Premium Brand
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 transition-colors">
                      ✓ {supplier.kyb ? "KYB Verified" : "Verification pending"}
                    </span>
                    <span className="text-slate-500 dark:text-slate-300">Beauty · Skincare · Bundles</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">Based in {supplier.region} · Ships to Africa / Asia</div>
                </div>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Avg creator payout</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">48–72h</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Rating</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">4.8/5</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {viewerMode === "Creator" ? (
                    <button
                      className="flex-1 md:flex-none px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
                      onClick={() => setInviteOpen(true)}
                      title="Invite this supplier to collaborate"
                    >
                      Invite supplier
                    </button>
                  ) : (
                    <button
                      className="flex-1 md:flex-none px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
                      onClick={() => toast("Previewing as creator…", "info")}
                      title="Preview creator experience"
                    >
                      Preview as creator
                    </button>
                  )}

                  <button
                    className={cx(
                      "flex-1 md:flex-none px-3 py-1.5 rounded-full border text-sm transition-colors flex items-center justify-center gap-2",
                      isFollowing
                        ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
                    )}
                    onClick={toggleFollow}
                    disabled={pendingFollow || viewerMode !== "Creator"}
                    title={viewerMode !== "Creator" ? "Disabled in supplier preview" : "Save supplier"}
                  >
                    {followLabel}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                  <span className="inline-flex items-center gap-1">🚚 <span className="text-slate-500 dark:text-slate-300">Fulfillment</span> <span className="font-semibold">Fast</span></span>
                  <span className="inline-flex items-center gap-1">📦 <span className="text-slate-500 dark:text-slate-300">SKU</span> <span className="font-semibold">120+</span></span>
                  <span className="inline-flex items-center gap-1">💬 <span className="text-slate-500 dark:text-slate-300">Response</span> <span className="font-semibold">~2h</span></span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Pill tone="neutral" title="Workflow">
                    {viewerMode === "Creator" ? "Creator: Invite → Acceptance → Negotiate" : "Supplier: Receive invites in inbox"}
                  </Pill>
                  <Btn
                    tone="ghost"
                    onClick={() => {
                      go(viewerMode === "Creator" ? "/creator/my-suppliers" : "/supplier/team");
                      toast("Opening list…", "info");
                    }}
                  >
                    {viewerMode === "Creator" ? "🏷️ My Suppliers" : "👥 Team"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="w-full max-w-full px-[0.55%] py-4 md:py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 items-start">
            {/* Left */}
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>About this supplier</SectionTitle>
                <p className="text-sm text-slate-700 dark:text-slate-100 mb-2">
                  GlowUp Hub is a beauty and skincare brand specializing in bundle offers and flash discounts.
                  We collaborate with creators to launch seasonal drops, limited-time dealz, and education-driven live sessionz.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Collab preferences</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
                      Bundles + discounts, clear claims, before/after demos, and audience Q&A.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">Categories</h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>Beauty</Chip>
                      <Chip>Skincare</Chip>
                      <Chip>Bundles</Chip>
                      <Chip>Flash dealz</Chip>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Trust & compliance</div>
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    Supplier notes: avoid medical claims; use compliant language; link tracking is required for conversion attribution.
                    {viewerMode === "Supplier" ? " (Supplier can edit these guidelines in Settings.)" : ""}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle>Performance snapshot</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetricCard label="Creator payouts" value="48–72h" sub="After approval" />
                  <MetricCard label="Return rate" value="1.8%" sub="Low refunds" />
                  <MetricCard label="Avg conversion" value="3.9%" sub="Across campaigns" />
                  <MetricCard label="Completed collabs" value="42" sub="Across 27 creators" />
                  <MetricCard label="Creator rating" value="4.8/5" sub="31 reviews" />
                  <MetricCard label="Fulfillment SLA" value="24–48h" sub="In-region" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <button
                      className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-50"
                      onClick={() => handleAction("View Dealz")}
                    >
                      Browse dealz
                    </button>
                  }
                >
                  Supplier portfolio
                </SectionTitle>

                <div className="space-y-2.5">
                  <PortfolioRow
                    title="Autumn Beauty Flash"
                    meta="Combo · East Africa"
                    body="Bundles + 15% discount. Strong conversions in first 30 minutes."
                    kpis={["GMV $12.4k", "Payout <48h", "Rating 4.9"]}
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioRow
                    title="Weekend Mask Bar"
                    meta="Live Sessionz · East Africa"
                    body="Education-first demo. Low return rate and high repeat orders."
                    kpis={["GMV $7.8k", "Return 1.4%", "Rating 4.7"]}
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioRow
                    title="Holiday Bundle Drop"
                    meta="Shoppable Adz · Global"
                    body="Short clips + CTA pack. Best performing SKU was the serum duo bundle."
                    kpis={["GMV $18.9k", "CTR 4.2%", "Conv 3.1%"]}
                    onAction={() => handleAction("View Dealz")}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <button
                      className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-50"
                      onClick={() => {
                        go("/creator/opportunities");
                        toast("Opening opportunities…", "info");
                      }}
                    >
                      View opportunities
                    </button>
                  }
                >
                  Open opportunities
                </SectionTitle>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {[
                    {
                      id: "OP-11",
                      title: "Serum Launch Live",
                      type: "Live Sessionz",
                      region: "East Africa",
                      budget: 800,
                      status: "Open for Collabs"
                    },
                    {
                      id: "OP-12",
                      title: "Bundle Discount Sprint",
                      type: "Shoppable Adz",
                      region: "Africa / Asia",
                      budget: 600,
                      status: "Open for Collabs"
                    }
                  ].map((op) => (
                    <div
                      key={op.id}
                      className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">{op.title}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {op.type} · {op.region} · Budget {money("USD", op.budget)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Pill tone="neutral">{op.status}</Pill>
                          <Pill tone="good">Fast payout</Pill>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Btn
                          onClick={() => {
                            toast("Opening pitch drawer", "info");
                            go(`/creator/opportunities/${op.id}`);
                          }}
                        >
                          ✍️ Pitch
                        </Btn>
                        {viewerMode === "Supplier" ? (
                          <Btn
                            tone="ghost"
                            onClick={() => toast("Edit opportunity", "info")}
                          >
                            ⚙️
                          </Btn>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Note: In production, open opportunities come from Supplier “Campaigns Board” and follow the workflow rules.
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <SectionTitle
                  right={
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <span>★★★★★</span>
                      <span className="text-slate-500 dark:text-slate-300">4.8 average (31 reviews)</span>
                    </div>
                  }
                >
                  Creator reviews
                </SectionTitle>
                <ul className="space-y-2">
                  <Review brand="Creator: @ayesha.live" quote="Clear briefs, fast payouts, and no last-minute changes. Loved the bundle strategy." />
                  <Review brand="Creator: @techmike" quote="They respect creator input and provide good tracking links. Easy negotiation." />
                  <Review brand="Creator: @faithstyle" quote="Brand guidelines were clear and compliant. Smooth approval process." />
                </ul>
              </div>
            </div>

            {/* Right */}
            <aside className="flex flex-col gap-4">
              <SocialLinksCard onAction={handleAction} />
              <PastCampaignsCard onAction={handleAction} />
              <TagsCard />
              <CompatibilityCard onAction={handleAction} />
              <QuickFactsCard onDownload={downloadBrandKit} />
            </aside>
          </div>
        </section>
      </main>

      <InviteSupplierDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} supplier={supplier} toast={toast} />

      <Toast text={toastText} tone={toastTone} onClose={() => setToastText(null)} />
    </div>
  );
}

function PortfolioRow({ title, meta, body, kpis, onAction }) {
  return (
    <article className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300 truncate">{meta}</span>
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
          onClick={onAction}
        >
          View dealz
        </button>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{body}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(kpis || []).map((k) => (
          <Chip key={k}>{k}</Chip>
        ))}
      </div>
    </article>
  );
}

function Review({ brand, quote }) {
  return (
    <li className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{brand}</span>
        <span className="text-xs text-amber-500 dark:text-amber-400">★★★★★</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">"{quote}"</p>
    </li>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierPublicProfile test failed: ${msg}`);
  };
  assert(typeof ORANGE === "string" && ORANGE.length > 0, "ORANGE exists");
  assert(typeof GREEN === "string" && GREEN.length > 0, "GREEN exists");
  assert(todayYMD().includes("-"), "todayYMD format");
  console.log("✅ SupplierPublicProfilePage self-tests passed");
}
