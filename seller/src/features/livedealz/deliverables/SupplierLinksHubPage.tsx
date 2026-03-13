import React, { useEffect, useMemo, useState } from "react";
import SupplierLinkToolsOrangePrimaryPreviewable from "../+NewLink";

/**
 * SupplierLinksHubPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: creator_links_hub_v_3_fixed_real_qr_region_metrics_pinned (1).tsx
 *
 * Mirror-first preserved:
 * - Header (Orange + Black badge) + primary CTA (New link)
 * - Tabs: Live Sessionz / Shoppable Adz
 * - Search + status filter + group-by + type filter + mobile filter drawer
 * - Pinned links carousel
 * - Main split: Link groups (left) + detail (right sticky)
 * - Detail: Multi-region selector, panels (Links / Share pack / Tracking)
 * - Per-channel variants, copy/share/WhatsApp actions everywhere
 * - Region-specific metrics + link health
 * - Toast system (global event)
 *
 * Supplier adaptations (required):
 * - Supplier owns/controls tracked links. Links may be created by Supplier or submitted by Creators.
 * - Manual review workflow (Supplier) for Creator-submitted link packs:
 *   reviewStatus: Pending Supplier → Approved / Changes Requested / Rejected
 * - Governance pills: hostRole, creatorUsage, collabMode, approvalMode
 * - Creator assignments: send link pack to creators and track by creator (demo)
 *
 * QR Notes:
 * - To stay dependency-free in the canvas, QR uses a remote QR image endpoint.
 * - In your Vite project you can replace RemoteQR with a local QR generator (e.g. qrcode library) like the Creator build.
 */

const ORANGE = "#f77f00";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

/* -------------------------------- Domain -------------------------------- */

const HUB_TABS = ["live", "shoppable"];
const REGIONS = ["Global", "Africa", "EU/UK", "Asia", "China"];

function statusPill(status) {
  if (status === "Active") return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (status === "Scheduled") return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (status === "Paused") return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  return "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
}

function reviewPill(reviewStatus) {
  if (reviewStatus === "Approved") return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  if (reviewStatus === "Pending Supplier") return "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  if (reviewStatus === "Changes Requested") return "bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700";
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString();
}

function sum(nums) {
  return (nums || []).reduce((a, b) => a + (Number(b) || 0), 0);
}

function buildWhatsAppMessage(item, link) {
  const wa = (item.sharePack?.captions || []).find((c) => c.platform === "WhatsApp")?.text;
  return (wa || "Check this out: {LINK}").replace("{LINK}", link);
}

function buildFullShareDump(item, link) {
  const lines = [];
  lines.push(item.title);
  lines.push(item.subtitle);
  lines.push("Link: " + link);
  lines.push("");
  lines.push("Captions:");
  (item.sharePack?.captions || []).forEach((c) => {
    lines.push(`- ${c.platform}: ${String(c.text || "").replace("{LINK}", link)}`);
  });
  lines.push("");
  lines.push("Hashtags: " + (item.sharePack?.hashtags || []).join(" "));
  return lines.join("\n");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Copied!");
  }
}

async function shareNative({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // canceled
    }
  } else {
    await copyToClipboard(text);
    toast("Share not supported here. Copied message instead.");
  }
}

function shareWhatsApp(text) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank", "noreferrer");
}

function healthWidth(item) {
  if (item.status === "Active") return "92%";
  if (item.status === "Scheduled") return "70%";
  if (item.status === "Paused") return "40%";
  return "18%";
}

/* -------------------------------- UI Primitives -------------------------- */

function PageHeader({ pageTitle, badge, rightContent }) {
  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900/80 dark:bg-slate-950/70 backdrop-blur border-b border-slate-200/60 dark:border-slate-800">
      <div className="w-full px-[0.55%] py-3 flex items-start md:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{pageTitle}</h1>
          {badge ? <div className="mt-1">{badge}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">{rightContent}</div>
      </div>
    </header>
  );
}

function Dot({ color }) {
  return <span className="h-2 w-2 rounded-full" style={{ background: color }} />;
}

function TabBtn({ label, active, onClick, icon }) {
  return (
    <button
      className={cx(
        "px-3 py-1 rounded-full inline-flex items-center gap-2 transition-colors font-extrabold text-[11px]",
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 p-4 text-center">
      <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}

function MiniMetric({ label, value, accent, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/40 px-2 py-1.5 transition-colors">
      <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className={cx("text-[11px] font-extrabold", accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100")}>{value}</div>
    </div>
  );
}

function IconBtn({ label, onClick, icon }) {
  return (
    <button
      className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function PillBtn({ label, onClick, icon }) {
  return (
    <button
      className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 inline-flex items-center gap-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 transition-colors"
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-extrabold dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function CodeRow({ value }) {
  return (
    <div className="mt-2 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 transition-colors">
      {value}
    </div>
  );
}

function BigMetric({ title, value, accent, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-3 transition-colors">
      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        {icon}
        <span>{title}</span>
      </div>
      <div className={cx("mt-1 text-[16px] font-extrabold", accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100")}>{value}</div>
    </div>
  );
}

function ShareButton({ label, icon, onClick, primary }) {
  return (
    <button
      className={cx(
        "px-3 py-2 rounded-2xl text-[11px] font-extrabold inline-flex items-center justify-center gap-2 transition-colors",
        primary ? "bg-[#f77f00] text-white hover:bg-[#e26f00]" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CaptionBlock({ platform, text, onCopy }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
          <span>📣</span>
          <span>{platform}</span>
        </div>
        <button
          className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-800 text-[10px] inline-flex items-center gap-2 transition-colors"
          onClick={() => onCopy(text)}
          type="button"
        >
          <span>📋</span>
          Copy
        </button>
      </div>
      <div className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{text}</div>
    </div>
  );
}

/* -------------------------------- QR ------------------------------------- */

function RemoteQR({ value, size = 180 }) {
  // Remote QR fallback. Replace with local QR generator in project if desired.
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900" style={{ width: size, height: size }}>
      <img src={src} alt="QR" width={size} height={size} className="rounded-2xl" />
    </div>
  );
}

function downloadQrRemote(value, filename) {
  // Cross-origin downloads may vary; we open in a new tab.
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(value)}`;
  toast("Opening QR (download from browser)");
  window.open(url, "_blank", "noreferrer");
}

/* -------------------------------- Toast ---------------------------------- */

let toastTimer = null;

function toast(message) {
  const ev = new CustomEvent("mldz-toast", { detail: message });
  window.dispatchEvent(ev);
}

function ToastArea() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const evt = e;
      setMsg(evt.detail);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setMsg(null), 1700);
    };
    window.addEventListener("mldz-toast", handler);
    return () => window.removeEventListener("mldz-toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] shadow-lg border border-slate-800 dark:border-slate-200 transition-colors">
        {msg}
      </div>
    </div>
  );
}

/* -------------------------------- Modal / Drawer -------------------------- */

function FilterDialog({ isOpen, onClose, status, setStatus, groupBy, setGroupBy, supplierType, setSupplierType }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[340px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-extrabold dark:text-white">Filters & Sort</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            type="button"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          <div className="space-y-5">
            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Status</label>
              <div className="flex flex-wrap gap-2">
                {["All", "Active", "Scheduled", "Paused", "Expired"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cx(
                      "px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all",
                      status === s
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                        : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    )}
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Group By</label>
              <div className="flex flex-wrap gap-2">
                {["Campaign", "Supplier", "Provider", "None"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={cx(
                      "px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all",
                      groupBy === g
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                        : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    )}
                    type="button"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Supplier Type</label>
              <div className="flex flex-wrap gap-2">
                {["All", "Seller", "Provider"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSupplierType(t)}
                    disabled={groupBy === "Provider"}
                    className={cx(
                      "px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all",
                      supplierType === t
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                        : "bg-white dark:bg-slate-900 border-slate-200 text-slate-600 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700",
                      groupBy === "Provider" ? "opacity-50 cursor-not-allowed" : ""
                    )}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {groupBy === "Provider" ? <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Provider grouping locks type to Provider.</div> : null}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <div className="space-y-5">
            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Date Range</label>
              <select className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>This month</option>
                <option>All time</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Most Clicks", active: false },
                  { label: "Newest First", active: true },
                  { label: "Highest Earnings", active: false },
                  { label: "Alphabetical", active: false }
                ].map((x) => (
                  <button
                    key={x.label}
                    className={cx(
                      "px-3 py-2.5 rounded-xl border text-[11px] font-extrabold text-left transition-colors",
                      x.active
                        ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[#f77f00]"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
                    )}
                    type="button"
                    onClick={() => toast(`Sort: ${x.label} (demo)`)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <button
            onClick={() => {
              setStatus("All");
              setGroupBy("Campaign");
              setSupplierType("All");
            }}
            className="text-xs font-extrabold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            type="button"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-extrabold hover:bg-black dark:hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Row Cards ------------------------------- */

function PinnedCard({ item, active, onSelect, onUnpin }) {
  const msg = buildWhatsAppMessage(item, item.shortUrl);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={cx(
        "min-w-[280px] rounded-2xl border p-3 text-left bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 transition-colors cursor-pointer",
        active ? "border-[#f77f00]" : "border-slate-200 dark:border-slate-700"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            {item.supplier.type}: {item.supplier.name} · {item.campaign.name}
          </div>
        </div>
        <button
          className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
            toast("Unpinned");
          }}
          title="Unpin"
          type="button"
        >
          📌
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <MiniMetric label="Clicks" value={fmtInt(item.metrics.clicks)} />
        <MiniMetric label="Purchases" value={fmtInt(item.metrics.purchases)} />
        <MiniMetric label="Earn" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent />
      </div>

      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <PillBtn label="Copy" icon={<span>📋</span>} onClick={() => copyToClipboard(item.shortUrl)} />
        <PillBtn label="Share" icon={<span>↗</span>} onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })} />
        <PillBtn label="WhatsApp" icon={<span>💬</span>} onClick={() => shareWhatsApp(msg)} />
      </div>
    </div>
  );
}

function LinkRow({ item, active, pinned, onTogglePin, onSelect }) {
  const msg = buildWhatsAppMessage(item, item.shortUrl);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={cx(
        "w-full text-left rounded-2xl border p-3 transition-colors cursor-pointer",
        active
          ? "border-[#f77f00] bg-white dark:bg-slate-900 dark:bg-slate-800"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[9px]">{item.supplier.type}</span>
            {pinned ? (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-orange-500/10 border border-[#ffd19a] dark:border-orange-500/30 text-[#8a4b00] dark:text-orange-300 text-[9px] inline-flex items-center gap-1">
                📌 Pinned
              </span>
            ) : null}
            <span className={cx("px-2.5 py-0.5 rounded-full text-[9px] border", reviewPill(item.reviewStatus))}>
              Review: {item.reviewStatus}
            </span>
          </div>

          <div className="text-[10px] text-slate-500 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.supplier.name}</span>
            <span className="mx-2">·</span>
            <span>{item.campaign.name}</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 truncate">
            ID: {item.id} · {item.createdAt}
            {item.expiresAt ? ` · Expires: ${item.expiresAt}` : ""}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
                toast(pinned ? "Unpinned" : "Pinned");
              }}
              title={pinned ? "Unpin" : "Pin"}
              type="button"
            >
              {pinned ? "📌" : "📍"}
            </button>

            <span className={cx("px-2.5 py-1 rounded-full text-[10px] border", statusPill(item.status))}>{item.status}</span>
          </div>

          <div className="hidden md:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <IconBtn label="Copy" onClick={() => copyToClipboard(item.shortUrl)} icon={<span className="text-sm">📋</span>} />
            <IconBtn
              label="Open"
              onClick={() => toast(`This would open the ${item.tab === "live" ? "Live" : "Shoppable"} destination.`)}
              icon={<span className="text-sm">↗</span>}
            />
            <IconBtn
              label="Share"
              onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })}
              icon={<span className="text-sm">🔗</span>}
            />
            <IconBtn label="WhatsApp" onClick={() => shareWhatsApp(msg)} icon={<span className="text-sm">💬</span>} />
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
        <MiniMetric label="Clicks" value={fmtInt(item.metrics.clicks)} icon={<span>📊</span>} />
        <MiniMetric label="Purchases" value={fmtInt(item.metrics.purchases)} icon={<span>✅</span>} />
        <MiniMetric label="Conv" value={`${Number(item.metrics.conversionPct || 0).toFixed(1)}%`} accent icon={<Dot color={ORANGE} />} />
        <MiniMetric label="Earn" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent icon={<Dot color={ORANGE} />} />
      </div>

      <div className="mt-2 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1 transition-colors">
        🔗 {item.shortUrl}
      </div>

      <div className="mt-2 flex md:hidden gap-2" onClick={(e) => e.stopPropagation()}>
        <PillBtn label="Copy" icon={<span>📋</span>} onClick={() => copyToClipboard(item.shortUrl)} />
        <PillBtn label="Share" icon={<span>↗</span>} onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })} />
        <PillBtn label="WhatsApp" icon={<span>💬</span>} onClick={() => shareWhatsApp(msg)} />
      </div>
    </div>
  );
}

/* -------------------------------- Detail --------------------------------- */

function ReviewRibbon({
  reviewStatus,
  createdBy,
  note,
  onChangeNote,
  onApprove,
  onRequestChanges,
  onReject
}) {
  const msg =
    reviewStatus === "Pending Supplier"
      ? "This link pack was submitted by a Creator. Approve to unlock it for use and forward it for Admin visibility."
      : reviewStatus === "Approved"
        ? "Approved. This link pack can be used in Adz/Live builders."
        : reviewStatus === "Changes Requested"
          ? "Changes requested. The Creator should update tracking parameters and resubmit."
          : "Rejected. A new submission is required.";

  const canAct = reviewStatus === "Pending Supplier";

  return (
    <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">🧾</div>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200">
            Supplier review · {reviewStatus} · Submitted by {createdBy}
          </div>
          <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">{msg}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-white dark:bg-slate-900/70 dark:bg-slate-900/60 p-3">
        <div className="text-[10px] font-extrabold text-amber-900 dark:text-amber-200">Supplier note</div>
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30"
          placeholder="e.g. Add UTM campaign, verify destination, add region variants, and include WhatsApp caption…"
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canAct ? (
          <>
            <button
              type="button"
              className="px-3 py-2 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold hover:bg-[#e26f00]"
              onClick={onApprove}
            >
              ✅ Approve
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold hover:bg-rose-50 dark:hover:bg-rose-900/20"
              onClick={onRequestChanges}
            >
              ✏️ Recommend changes
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] font-extrabold hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
              onClick={onReject}
            >
              ⛔ Reject
            </button>
          </>
        ) : (
          <div className="text-[11px] text-amber-800 dark:text-amber-300 italic">No Supplier actions for this status.</div>
        )}
      </div>

      <div className="mt-2 text-[10px] text-amber-800 dark:text-amber-300">
        Permission note: Only Supplier Owners/Admins can approve or reject Creator-submitted link packs.
      </div>
    </div>
  );
}

function LinkDetail({ item, pinned, onTogglePin, reviewNote, onChangeReviewNote, onReviewAction, onResendPack }) {
  const [activePanel, setActivePanel] = useState("links"); // links | share | tracking
  const [region, setRegion] = useState("Global");

  useEffect(() => {
    setActivePanel("links");
    setRegion("Global");
  }, [item?.id]);

  const regionUrl = useMemo(() => {
    const v = (item.regionVariants || []).find((x) => x.region === region);
    return v?.url || item.shortUrl;
  }, [item, region]);

  const regionMetric = useMemo(() => {
    return (item.regionMetrics || []).find((m) => m.region === region) || (item.regionMetrics || []).find((m) => m.region === "Global") || null;
  }, [item, region]);

  const whatsappText = useMemo(() => buildWhatsAppMessage(item, regionUrl), [item, regionUrl]);

  const share = async () => {
    await shareNative({ title: item.title, text: whatsappText, url: regionUrl });
  };

  const downloadQr = async () => {
    downloadQrRemote(regionUrl, `${item.id}-${region.replace("/", "-")}-qr.png`);
  };

  // Creator performance (demo) derived from assignments
  const creatorPerf = useMemo(() => {
    const rows = (item.creatorAssignments || []).map((a, idx) => {
      const baseClicks = Math.max(10, Math.round((item.metrics.clicks || 0) / (Math.max(1, item.creatorAssignments.length) + 0.6)));
      const clicks = baseClicks + idx * 13;
      const purchases = Math.max(0, Math.round(clicks * (Number(item.metrics.conversionPct || 0) / 100) * 0.9));
      const earnings = Math.max(0, Math.round((item.metrics.earnings || 0) / Math.max(1, item.creatorAssignments.length) * (0.85 + idx * 0.06)));
      return {
        id: a.id,
        creator: a.creator,
        status: a.status,
        region: a.region,
        lastSent: a.lastSent,
        clicks,
        purchases,
        earnings,
        currency: item.metrics.currency || "USD"
      };
    });
    return rows;
  }, [item]);

  return (
    <div className="text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[9px] inline-flex items-center gap-1">
              🤝 <span>Supplier</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300">
              {item.supplier.type}: {item.supplier.name}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300">
              Campaign: {item.campaign.name}
            </span>
            <span className={cx("px-2 py-0.5 rounded-full text-[9px] border", reviewPill(item.reviewStatus))}>Review: {item.reviewStatus}</span>
            {pinned ? (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-orange-500/10 border border-[#ffd19a] dark:border-orange-500/30 text-[#8a4b00] dark:text-orange-300 text-[9px] inline-flex items-center gap-1">
                📌 Pinned
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Pill tone={item.governance?.hostRole === "Supplier" ? "warn" : "good"}>{item.governance?.hostRole === "Supplier" ? "Supplier-hosted" : "Creator-hosted"}</Pill>
            <Pill tone="neutral">{item.governance?.creatorUsage || "—"}</Pill>
            <Pill tone="neutral">Collab: {item.governance?.collabMode || "—"}</Pill>
            <Pill tone={item.governance?.approvalMode === "Manual" ? "warn" : "good"}>Approval: {item.governance?.approvalMode || "—"}</Pill>
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            ID: {item.id} · Created: {item.createdAt}
            {item.expiresAt ? ` · Expires: ${item.expiresAt}` : ""}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
            onClick={() => {
              onTogglePin();
              toast(pinned ? "Unpinned" : "Pinned");
            }}
            title={pinned ? "Unpin" : "Pin"}
            type="button"
          >
            {pinned ? "📌" : "📍"}
          </button>
          <span className={cx("px-2.5 py-1 rounded-full text-[10px] border", statusPill(item.status))}>{item.status}</span>
        </div>
      </div>

      {/* Supplier Review */}
      {item.reviewStatus !== "Approved" ? (
        <ReviewRibbon
          reviewStatus={item.reviewStatus}
          createdBy={item.createdBy}
          note={reviewNote}
          onChangeNote={onChangeReviewNote}
          onApprove={() => onReviewAction("approve")}
          onRequestChanges={() => onReviewAction("changes")}
          onReject={() => onReviewAction("reject")}
        />
      ) : null}

      {/* Region selector */}
      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
              🌍 Multi-region link variants
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Choose a region to copy/share/QR the correct link.</div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
            Selected: <span className="font-extrabold">{region}</span>
          </span>
        </div>

        {regionMetric ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <MiniMetric label="Clicks" value={fmtInt(regionMetric.clicks)} />
            <MiniMetric label="Purchases" value={fmtInt(regionMetric.purchases)} />
            <MiniMetric label="Earn" value={`${regionMetric.currency} ${fmtInt(regionMetric.earnings)}`} accent />
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const active = region === r;
            return (
              <button
                key={r}
                className={cx(
                  "px-3 py-1.5 rounded-full border text-[10px] inline-flex items-center gap-2 transition-colors",
                  active
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                    : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                )}
                onClick={() => setRegion(r)}
                type="button"
              >
                🌐 {r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      <div className="mt-3 inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-[10px] transition-colors">
        <TabBtn label="Links" active={activePanel === "links"} onClick={() => setActivePanel("links")} icon={<span>🔗</span>} />
        <TabBtn label="Share pack" active={activePanel === "share"} onClick={() => setActivePanel("share")} icon={<span>📣</span>} />
        <TabBtn label="Tracking" active={activePanel === "tracking"} onClick={() => setActivePanel("tracking")} icon={<span>📊</span>} />
      </div>

      {activePanel === "links" ? (
        <div className="mt-3 space-y-3">
          <Card
            title="Primary link"
            subtitle="Tracks performance and payouts across all channels."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Copy" icon={<span>📋</span>} onClick={() => copyToClipboard(item.primaryUrl)} />
                <PillBtn label="Open" icon={<span>↗</span>} onClick={() => toast(`Opening destination for: ${item.title} (demo)`)} />
              </div>
            }
          >
            <CodeRow value={item.primaryUrl} />
          </Card>

          <Card
            title="Selected region short link"
            subtitle="Use this link in captions and for QR."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Copy" icon={<span>📋</span>} onClick={() => copyToClipboard(regionUrl)} />
                <PillBtn label="Share" icon={<span>🔗</span>} onClick={share} />
                <PillBtn label="WhatsApp" icon={<span>💬</span>} onClick={() => shareWhatsApp(whatsappText)} />
              </div>
            }
          >
            <CodeRow value={regionUrl} />
          </Card>

          <Card
            title="QR code"
            subtitle="Use for posters, flyers and on-screen overlays."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Download" icon={<span>⬇️</span>} onClick={downloadQr} />
                <PillBtn label="Add to overlay" icon={<span>🧩</span>} onClick={() => toast("QR added to Live Studio overlay (demo)")} />
              </div>
            }
          >
            <div className="mt-2 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 transition-colors">
                  🔳 QR for <span className="font-extrabold">{region}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-2xl">
                  <RemoteQR value={regionUrl} size={180} />
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Per-channel links"
            subtitle="Track performance by platform."
            right={<PillBtn label="Copy all" icon={<span>📋</span>} onClick={() => copyToClipboard((item.channels || []).map((c) => `${c.name}: ${c.url}`).join("\n"))} />}
          >
            <div className="mt-2 space-y-2">
              {(item.channels || []).map((c) => {
                const msg = buildWhatsAppMessage(item, c.url);
                return (
                  <div key={c.name} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-2 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">{c.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.hint}</div>
                        <div className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all">{c.url}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn label="Copy" icon={<span>📋</span>} onClick={() => copyToClipboard(c.url)} />
                        <IconBtn label="Open" icon={<span>↗</span>} onClick={() => toast(`Opening ${c.name} link (demo)`) } />
                        <IconBtn label="Share" icon={<span>🔗</span>} onClick={() => shareNative({ title: item.title, text: msg, url: c.url })} />
                        <IconBtn label="WhatsApp" icon={<span>💬</span>} onClick={() => shareWhatsApp(msg)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : null}

      {activePanel === "share" ? (
        <div className="mt-3 space-y-3">
          <Card
            title="Share pack"
            subtitle="Ready-to-use captions + key points."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Share" icon={<span>↗</span>} onClick={share} />
                <PillBtn label="WhatsApp" icon={<span>💬</span>} onClick={() => shareWhatsApp(whatsappText)} />
                <PillBtn label="Copy link" icon={<span>📋</span>} onClick={() => copyToClipboard(regionUrl)} />
              </div>
            }
          >
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">{item.sharePack.headline}</div>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                {(item.sharePack.bullets || []).map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-[10px]">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {(item.sharePack.hashtags || []).map((h) => (
                  <span
                    key={h}
                    className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {(item.sharePack.captions || []).map((c) => (
                <CaptionBlock
                  key={c.platform}
                  platform={c.platform}
                  text={String(c.text || "").replace("{LINK}", regionUrl)}
                  onCopy={(t) => copyToClipboard(t)}
                />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ShareButton label="Share (native)" icon={<span>↗</span>} onClick={share} primary />
              <ShareButton label="Copy everything" icon={<span>📋</span>} onClick={() => copyToClipboard(buildFullShareDump(item, regionUrl))} />
            </div>
          </Card>

          <Card
            title="Send pack to creators"
            subtitle="Assign the correct region link to each creator (demo)."
            right={<PillBtn label="Resend all" icon={<span>✉️</span>} onClick={() => onResendPack("all")} />}
          >
            {(item.creatorAssignments || []).length ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/60">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Creator</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Region</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Last sent</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.creatorAssignments || []).map((a) => (
                      <tr key={a.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          <div className="font-extrabold">{a.creator.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{a.creator.handle}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cx("px-2 py-0.5 rounded-full border text-[10px] font-extrabold", a.status === "Accepted" ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300")}> 
                            {a.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{a.region}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{a.lastSent}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-extrabold"
                              onClick={() => onResendPack(a.id)}
                            >
                              Resend
                            </button>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-200"
                              onClick={() => copyToClipboard(regionUrl)}
                            >
                              Copy link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">No creators assigned. This campaign appears to be Supplier-hosted.</div>
            )}

            <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
              Edge cases supported: Creator rejects proposal, renegotiation, multiple creators per campaign, switching collab mode before content submission.
            </div>
          </Card>
        </div>
      ) : null}

      {activePanel === "tracking" ? (
        <div className="mt-3 space-y-3">
          <Card title="Tracking preview" subtitle="Global snapshot + region metrics" right={<span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px]">Last 30 days</span>}>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BigMetric title="Clicks" value={fmtInt(item.metrics.clicks)} icon={<span>📊</span>} />
              <BigMetric title="Purchases" value={fmtInt(item.metrics.purchases)} icon={<span>✅</span>} />
              <BigMetric title="Conversion" value={`${Number(item.metrics.conversionPct || 0).toFixed(1)}%`} accent icon={<Dot color={ORANGE} />} />
              <BigMetric title="Earnings" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent icon={<Dot color={ORANGE} />} />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-extrabold inline-flex items-center gap-2 dark:text-slate-100">🌍 Region-specific metrics</div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">(Clicks, purchases, earnings)</span>
              </div>
              <div className="mt-2 space-y-2">
                {(item.regionMetrics || [])
                  .filter((r) => r.region !== "Global")
                  .map((r) => {
                    const conv = r.clicks > 0 ? (r.purchases / r.clicks) * 100 : 0;
                    return (
                      <div key={r.region} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 p-2 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100">{r.region}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Conv: <span className="font-extrabold text-slate-700 dark:text-slate-200">{conv.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-2 text-[10px]">
                          <MiniMetric label="Clicks" value={fmtInt(r.clicks)} />
                          <MiniMetric label="Purch" value={fmtInt(r.purchases)} />
                          <MiniMetric label="Earn" value={`${r.currency} ${fmtInt(r.earnings)}`} accent />
                          <MiniMetric label="Conv" value={`${conv.toFixed(1)}%`} accent />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="text-[11px] font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
                <Dot color={ORANGE} /> Link health
              </div>
              <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                Runtime status: <span className="font-extrabold text-slate-900 dark:text-slate-100">{item.status}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="h-full" style={{ width: healthWidth(item), background: ORANGE }} />
              </div>
              <div className="mt-2 text-[10px] text-slate-500">Tip: Share region links to match your audience geography.</div>
            </div>
          </Card>

          <Card
            title="Creator performance (demo)"
            subtitle="Track by creator assignment: clicks, purchases, earnings."
            right={<PillBtn label="Export" icon={<span>⬇️</span>} onClick={() => toast("Export CSV (demo)")} />}
          >
            {creatorPerf.length ? (
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-[11px]">
                  <thead className="bg-gray-50 dark:bg-slate-950 dark:bg-slate-900/60">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Creator</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Region</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Clicks</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Purchases</th>
                      <th className="px-3 py-2 font-extrabold text-slate-700 dark:text-slate-200">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creatorPerf.map((r) => (
                      <tr key={r.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          <div className="font-extrabold">{r.creator.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{r.creator.handle}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-extrabold">{r.region}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-extrabold">{fmtInt(r.clicks)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200 font-extrabold">{fmtInt(r.purchases)}</td>
                        <td className="px-3 py-2 text-[#f77f00] font-extrabold">{r.currency} {fmtInt(r.earnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">No creator assignments for this link.</div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "brand"
      ? "text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <span
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-extrabold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

/* -------------------------------- Main Page ------------------------------- */

export default function SupplierLinksHubPage() {
  const [showNewLinkOverlay, setShowNewLinkOverlay] = useState(false);
  const [tab, setTab] = useState("live");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [groupBy, setGroupBy] = useState("Campaign");
  const [supplierTypeFilter, setSupplierTypeFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const [items, setItems] = useState([]);

  // Review note per link
  const [reviewNotes, setReviewNotes] = useState({});

  // Effective supplier filter when groupBy=Provider (mirror behavior)
  useEffect(() => {
    if (groupBy === "Provider") setSupplierTypeFilter("Provider");
  }, [groupBy]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((x) => x.tab === tab)
      .filter((x) => (statusFilter === "All" ? true : x.status === statusFilter))
      .filter((x) => (supplierTypeFilter === "All" ? true : x.supplier.type === supplierTypeFilter))
      .filter((x) => {
        if (!q) return true;
        const hay = `${x.title} ${x.subtitle} ${x.id} ${x.campaign.name} ${x.supplier.name} ${x.supplier.type}`.toLowerCase();
        return hay.includes(q);
      });
  }, [items, tab, query, statusFilter, supplierTypeFilter]);

  const pinnedForTab = useMemo(() => {
    return items.filter((x) => x.tab === tab && pinnedIds.includes(x.id));
  }, [items, tab, pinnedIds]);

  const selected = useMemo(() => {
    const inView = selectedId ? visible.find((x) => x.id === selectedId) : null;
    return inView ?? pinnedForTab[0] ?? visible[0] ?? null;
  }, [visible, selectedId, pinnedForTab]);

  const togglePin = (id) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const groups = useMemo(() => {
    if (groupBy === "None") {
      return [
        {
          key: "__all__",
          title: "All links",
          subtitle: `${visible.length} item(s)`,
          items: visible
        }
      ];
    }

    const map = new Map();

    for (const it of visible) {
      let key = "";
      let title = "";
      let subtitle = "";

      if (groupBy === "Campaign") {
        key = `campaign:${it.campaign.id}`;
        title = it.campaign.name;
        subtitle = `${it.supplier.type}: ${it.supplier.name}`;
      } else if (groupBy === "Supplier") {
        key = `supplier:${it.supplier.name}`;
        title = it.supplier.name;
        subtitle = `${it.supplier.type} · ${it.campaign.name}`;
      } else {
        key = `provider:${it.supplier.name}`;
        title = it.supplier.name;
        subtitle = "Provider";
      }

      if (!map.has(key)) map.set(key, { title, subtitle, items: [] });
      map.get(key).items.push(it);
    }

    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v }));
  }, [visible, groupBy]);

  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.key] === undefined) next[g.key] = false;
      }
      return next;
    });
  }, [groups]);

  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const onReviewAction = (action) => {
    if (!selected) return;
    const id = selected.id;

    setItems((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        if (action === "approve") return { ...x, reviewStatus: "Approved" };
        if (action === "changes") return { ...x, reviewStatus: "Changes Requested" };
        return { ...x, reviewStatus: "Rejected" };
      })
    );

    if (action === "approve") toast("Approved. Link pack unlocked (demo)");
    if (action === "changes") toast("Changes requested. Creator must resubmit.");
    if (action === "reject") toast("Rejected.");
  };

  const onResendPack = (assignmentId) => {
    if (!selected) return;
    toast(assignmentId === "all" ? "Resent pack to all creators (demo)" : `Resent pack (${assignmentId}) (demo)`);
  };

  const headerTitle = "Links Hub";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors">
      <PageHeader
        pageTitle={headerTitle}
        badge={
          <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 items-center gap-2 text-[11px] font-extrabold border border-slate-800 dark:border-slate-700 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} />
            Orange + Black
          </span>
        }
        rightContent={
          <button
            className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] inline-flex items-center gap-2 transition-colors text-xs font-extrabold"
            onClick={() => setShowNewLinkOverlay(true)}
            type="button"
          >
            <span className="text-sm">＋</span>
            <span>New link</span>
          </button>
        }
      />

      <main className="w-full px-[0.55%] py-3 md:py-6">
        <section className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">Supplier Links Hub</div>
              <div className="text-xs text-slate-500 dark:text-slate-300">
                Copy links, generate QR, share packs, review Creator submissions, and preview performance.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full p-1 text-xs">
                <TabBtn label="Live Sessionz" active={tab === "live"} onClick={() => setTab("live")} icon={<Dot color={ORANGE} />} />
                <TabBtn label="Shoppable Adz" active={tab === "shoppable"} onClick={() => setTab("shoppable")} icon={<Dot color="#64748b" />} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-full px-3 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50">
                  <span className="text-slate-400">🔎</span>
                  <input
                    className="bg-transparent outline-none text-xs font-extrabold w-44 text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Search links…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-white focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All status</option>
                  <option value="Active">Active</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Paused">Paused</option>
                  <option value="Expired">Expired</option>
                </select>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-white focus:outline-none"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                >
                  <option value="Campaign">Group: Campaign</option>
                  <option value="Supplier">Group: Supplier</option>
                  <option value="Provider">Group: Provider</option>
                  <option value="None">No grouping</option>
                </select>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-xs font-extrabold text-slate-700 dark:text-white disabled:opacity-50 focus:outline-none"
                  value={supplierTypeFilter}
                  onChange={(e) => setSupplierTypeFilter(e.target.value)}
                  disabled={groupBy === "Provider"}
                >
                  <option value="All">All Types</option>
                  <option value="Seller">Sellers (Products)</option>
                  <option value="Provider">Providers (Services)</option>
                </select>

                <button
                  className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 text-xs font-extrabold"
                  onClick={() => setShowFilterDialog(true)}
                  type="button"
                >
                  <span>⚙️</span>
                  <span>Filters</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 transition-colors">
              <span>🧱</span>
              <span className="text-slate-500 dark:text-slate-400">Grouping:</span> <span className="font-extrabold text-slate-700 dark:text-slate-200">{groupBy}</span>
            </span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 transition-colors">
              <span>📊</span>
              <span className="text-slate-500 dark:text-slate-400">Showing</span> <span className="font-extrabold text-slate-700 dark:text-slate-200">{visible.length}</span> <span className="text-slate-500 dark:text-slate-400">link(s)</span>
            </span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <span>🌍</span>
              Multi-region variants: Africa · EU/UK · Asia · China
            </span>

            <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
              Supplier note: Creator-submitted links may require manual review before use.
            </span>
          </div>
        </section>

        {pinnedForTab.length > 0 ? (
          <section className="mt-4 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
                <span style={{ color: ORANGE }}>📌</span>
                Pinned links
              </div>
              <div className="text-xs font-semibold text-slate-500">Quick access</div>
            </div>
            <div className="mt-2 overflow-x-auto pb-1">
              <div className="flex gap-2 min-w-max">
                {pinnedForTab.map((x) => (
                  <PinnedCard
                    key={x.id}
                    item={x}
                    active={selected?.id === x.id}
                    onSelect={() => setSelectedId(x.id)}
                    onUnpin={() => togglePin(x.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4 items-start">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Link groups</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Select a link to view QR, share pack and metrics.</div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">{groups.length}</span> group(s)
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {groups.length === 0 ? (
                <EmptyState title="No links found" subtitle="Try changing filters or clearing the search." />
              ) : null}

              {groups.map((g) => (
                    <div
                      key={g.key}
                      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-700/30 transition-colors"
                    >
                      <button
                        className="w-full px-3 py-2 flex items-start justify-between gap-2"
                        onClick={() => toggleGroup(g.key)}
                        type="button"
                      >
                        <div className="min-w-0 text-left">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{g.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{g.subtitle}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Items: <span className="font-extrabold text-slate-700 dark:text-slate-200">{g.items.length}</span>
                            <span className="mx-2">·</span>
                            Clicks:{" "}
                            <span className="font-extrabold text-slate-700 dark:text-slate-200">{fmtInt(sum(g.items.map((x) => x.metrics.clicks)))}</span>
                            <span className="mx-2">·</span>
                            Earn:{" "}
                            <span className="font-extrabold" style={{ color: ORANGE }}>
                              {g.items[0]?.metrics.currency} {fmtInt(sum(g.items.map((x) => x.metrics.earnings)))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                            {groupBadge(g.items)}
                          </span>
                          <span className="text-slate-500">{collapsed[g.key] ? "▾" : "▴"}</span>
                        </div>
                      </button>

                      {!collapsed[g.key] ? (
                        <div className="px-2 pb-2 space-y-2">
                          {g.items.map((x) => (
                            <LinkRow
                              key={x.id}
                              item={x}
                              active={selected?.id === x.id}
                              pinned={pinnedIds.includes(x.id)}
                              onTogglePin={() => togglePin(x.id)}
                              onSelect={() => setSelectedId(x.id)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 lg:sticky lg:top-44 transition-colors">
            {!selected ? (
              <EmptyState title="Select a link" subtitle="Choose a link to see QR, share pack and tracking preview." />
            ) : (
              <LinkDetail
                item={selected}
                pinned={pinnedIds.includes(selected.id)}
                onTogglePin={() => togglePin(selected.id)}
                reviewNote={reviewNotes[selected.id] || ""}
                onChangeReviewNote={(txt) => setReviewNotes((prev) => ({ ...prev, [selected.id]: txt }))}
                onReviewAction={onReviewAction}
                onResendPack={onResendPack}
              />
            )}
          </div>
        </section>
      </main>

      <ToastArea />

      <FilterDialog
        isOpen={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        status={statusFilter}
        setStatus={setStatusFilter}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        supplierType={supplierTypeFilter}
        setSupplierType={setSupplierTypeFilter}
      />

      {showNewLinkOverlay ? (
        <div className="fixed inset-0 z-[120] bg-black/35 backdrop-blur-[1px] flex justify-end p-2 md:p-4">
          <div className="relative h-full max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] w-full max-w-[760px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-[130] rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 dark:bg-slate-900/90 px-3 py-1 text-xs font-bold"
              onClick={() => setShowNewLinkOverlay(false)}
            >
              Close
            </button>
            <div className="h-full overflow-auto">
              <SupplierLinkToolsOrangePrimaryPreviewable />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function groupBadge(items) {
  const hasProvider = items.some((x) => x.supplier.type === "Provider");
  const hasSeller = items.some((x) => x.supplier.type === "Seller");
  if (hasProvider && hasSeller) return "Seller + Provider";
  if (hasProvider) return "Provider";
  return "Seller";
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`LinksHub test failed: ${msg}`);
  };

  // cx
  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");

  // group badge logic
  assert(groupBadge([{ supplier: { type: "Seller" } }]) === "Seller", "groupBadge seller");
  assert(groupBadge([{ supplier: { type: "Provider" } }]) === "Provider", "groupBadge provider");
  assert(groupBadge([{ supplier: { type: "Provider" } }, { supplier: { type: "Seller" } }]) === "Seller + Provider", "groupBadge mixed");

  // wa message replacement
  const m = buildWhatsAppMessage({ sharePack: { captions: [{ platform: "WhatsApp", text: "Hi {LINK}" }] } }, "X");
  assert(m === "Hi X", "WhatsApp message replaces LINK");

  console.log("✅ SupplierLinksHubPage self-tests passed");
}
