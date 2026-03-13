import React, { useEffect, useMemo, useRef, useState } from "react";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierAssetLibraryPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: AssetLibraryPage.tsx (Creator)
 *
 * Mirror-first preserved:
 * - Top header + brand strip
 * - Context banner when opened as picker (query params)
 * - Controls card: search + creator/supplier/campaign selectors + filter chips
 * - Main split: Assets grid (left) + Preview/Details (right) with mobile preview modal
 * - Collections section + mini analytics card
 * - Add Content drawer with rights/licensing safeguards + size validations (hero 1920×1080, poster 500×500)
 *
 * Supplier adaptations (required):
 * - Supplier is the reviewer for Creator-submitted assets.
 * - Review actions exist and change status:
 *   pending_supplier → pending_admin (Approve)
 *   pending_supplier → changes_requested (Recommend changes)
 *   pending_supplier → rejected (Reject)
 * - Review note + recommended fix list is captured per asset (demo state).
 * - Campaign-level setting simulated: “Supplier manual review” vs “Auto-approval to Admin”.
 *   Auto mode skips pending_supplier and submits directly to pending_admin.
 *
 * Notes:
 * - Self-contained for canvas. Replace toast-based navigation with react-router in app.
 * - Icons are emoji/ASCII to avoid external icon deps.
 */

const ORANGE = "#f77f00";

const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 };
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 };

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function useQueryParams() {
  const [params, setParams] = useState(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""));
  useEffect(() => {
    const onPop = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const dealId = params.get("dealId") || "";
  const mode = params.get("mode") || ""; // picker
  const target = params.get("target") || ""; // live|shoppable
  const returnTo = params.get("returnTo") || "";
  const applyTo = params.get("applyTo") || "";

  return { dealId, mode, target, returnTo, applyTo };
}

function safeCopy(text) {
  try {
    navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* --------------------------------- Domain -------------------------------- */

const MEDIA_TYPES = ["video", "image", "overlay", "template", "script", "link", "doc"];
const SOURCES = ["creator", "supplier", "catalog"];

function statusLabel(s) {
  switch (s) {
    case "draft":
      return "Draft";
    case "pending_supplier":
      return "Supplier Review";
    case "pending_admin":
      return "Admin Review";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "rejected":
      return "Rejected";
    default:
      return String(s || "—");
  }
}

function statusStyles(s) {
  switch (s) {
    case "approved":
      return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800";
    case "pending_supplier":
    case "pending_admin":
      return "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800";
    case "changes_requested":
      return "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800";
    case "rejected":
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 ring-1 ring-zinc-200 dark:ring-zinc-700";
    case "draft":
    default:
      return "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700";
  }
}

function mediaLabel(mt) {
  switch (mt) {
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "overlay":
      return "Overlay";
    case "template":
      return "Template";
    case "script":
      return "Script";
    case "link":
      return "Link";
    case "doc":
      return "Doc";
    default:
      return String(mt || "—");
  }
}

function sourceLabel(src) {
  if (src === "creator") return "Creator";
  if (src === "supplier") return "Supplier";
  return "Catalog";
}

function mediaEmoji(mt) {
  switch (mt) {
    case "video":
      return "🎬";
    case "image":
      return "🖼️";
    case "overlay":
      return "🧩";
    case "template":
      return "📐";
    case "script":
      return "📝";
    case "link":
      return "🔗";
    case "doc":
      return "📄";
    default:
      return "📦";
  }
}

const EMPTY_ASSET_LIBRARY_CONTEXT = {
  creators: [],
  suppliers: [],
  campaigns: [],
  deliverables: []
};

function mapBackendAsset(asset) {
  const metadata = asset?.metadata && typeof asset.metadata === "object" ? asset.metadata : {};
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map((tag) => String(tag)) : [];
  const width = Number(metadata.width);
  const height = Number(metadata.height);
  const previewKind = String(metadata.previewKind || (asset.kind === "video" ? "video" : "image"));
  return {
    id: String(asset.id || ""),
    creatorScope: String(metadata.creatorScope || "all"),
    title: String(asset.name || "Untitled asset"),
    subtitle: String(metadata.subtitle || ""),
    campaignId: String(metadata.campaignId || ""),
    supplierId: String(metadata.supplierId || ""),
    brand: String(metadata.brand || ""),
    tags,
    mediaType: String(asset.kind || metadata.mediaType || "image"),
    source: String(metadata.source || "supplier"),
    ownerLabel: String(metadata.ownerLabel || `Owner: ${metadata.owner || "Supplier"}`),
    status: String(metadata.status || "draft"),
    lastUpdatedLabel: `Last updated: ${new Date(asset.updatedAt || asset.createdAt || Date.now()).toLocaleString()}`,
    thumbnailUrl: String(metadata.thumbnailUrl || metadata.posterUrl || asset.url || ""),
    previewUrl: String(asset.url || metadata.previewUrl || metadata.posterUrl || ""),
    previewKind,
    dimensions:
      Number.isFinite(width) && Number.isFinite(height)
        ? { width, height }
        : undefined,
    role: typeof metadata.role === "string" ? metadata.role : undefined,
    aspect: typeof metadata.aspect === "string" ? metadata.aspect : undefined,
    desktopMode: typeof metadata.desktopMode === "string" ? metadata.desktopMode : undefined,
    usageNotes: typeof metadata.usageNotes === "string" ? metadata.usageNotes : "",
    restrictions: typeof metadata.restrictions === "string" ? metadata.restrictions : "",
  };
}

function buildAssetMetadata(asset, note) {
  return {
    creatorScope: asset.creatorScope || "all",
    subtitle: asset.subtitle || "",
    campaignId: asset.campaignId || "",
    supplierId: asset.supplierId || "",
    brand: asset.brand || "",
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    source: asset.source || "supplier",
    ownerLabel: asset.ownerLabel || "Owner: Supplier",
    status: asset.status || "draft",
    previewKind: asset.previewKind || (asset.mediaType === "video" ? "video" : "image"),
    thumbnailUrl: asset.thumbnailUrl || "",
    posterUrl: asset.thumbnailUrl || "",
    role: asset.role || null,
    aspect: asset.aspect || null,
    desktopMode: asset.desktopMode || null,
    usageNotes: asset.usageNotes || "",
    restrictions: asset.restrictions || "",
    width: asset.dimensions?.width ?? null,
    height: asset.dimensions?.height ?? null,
    reviewNote: typeof note === "string" ? note : "",
  };
}

const smartPacks = [
  {
    id: "pk_1",
    name: "Starter pack (hero + poster + overlay)",
    campaignId: "cp_1",
    brand: "GlowUp",
    autoGrouped: true,
    items: [
      { title: "Featured item poster", assetId: "as_2" },
      { title: "Price drop overlay", assetId: "as_4" }
    ]
  }
];

/* --------------------------------- UI Primitives -------------------------- */

function Pill({ tone = "neutral", children, title }) {
  const cls =
    tone === "brand"
      ? "text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
          : tone === "bad"
            ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            : "bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function StatusPill({ status }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs", statusStyles(status))}>{statusLabel(status)}</span>;
}

function SourcePill({ source }) {
  const tone = source === "creator" ? "good" : source === "supplier" ? "brand" : "neutral";
  return (
    <Pill tone={tone}>
      {source === "creator" ? "👤" : source === "supplier" ? "🏷️" : "📚"} {sourceLabel(source)}
    </Pill>
  );
}

function MediaTypePill({ mediaType }) {
  return (
    <Pill tone="neutral">
      {mediaEmoji(mediaType)} {mediaLabel(mediaType)}
    </Pill>
  );
}

function Btn({ tone = "neutral", onClick, disabled, children, title, className }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors border disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "brand"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "danger"
        ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(base, cls, className)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </button>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80]">
      <div className="rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-lg">
        <div className="font-bold">{toast.title}</div>
        {toast.body ? <div className="mt-0.5 opacity-90">{toast.body}</div> : null}
      </div>
    </div>
  );
}

function Modal({ open, title, children, footer, onClose }) {
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-hidden bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{title}</div>
          <button
            type="button"
            className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 dark:border-slate-800 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function Drawer({ open, title, subtitle, children, footer, onClose }) {
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalDocOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{title}</div>
              {subtitle ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 dark:border-slate-800 p-4">{footer}</div> : null}
      </aside>
    </div>
  );
}

function MiniChart({ points }) {
  const w = 560;
  const h = 140;
  const pad = 14;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v) => {
    const t = (v - min) / Math.max(1e-9, max - min);
    return h - pad - t * (h - pad * 2);
  };
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[140px] w-full">
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={pad}
          y1={pad + t * (h - pad * 2)}
          x2={w - pad}
          y2={pad + t * (h - pad * 2)}
          strokeWidth="1"
          className="stroke-slate-900/10 dark:stroke-slate-100/10"
        />
      ))}
      <path d={d} fill="none" stroke={ORANGE} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

function CopyrightSafetyCallout() {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">🛡️</div>
        <div>
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Copyright & licensing safeguards</div>
          <div className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Confirm that uploaded media is owned or properly licensed. Avoid copyrighted music unless you have rights.
            Non-compliant assets may be rejected by Supplier or Admin.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="warn">✅ Rights confirmation required</Pill>
            <Pill tone="warn">🎵 Licensed music only</Pill>
            <Pill tone="neutral">🏷️ Disclosure templates supported</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Review Ribbon -------------------------- */

function StatusTimeline({ status, supplierAutoApprove }) {
  const steps = [
    { id: "submitted", label: "Submitted", done: status !== "draft" },
    ...(supplierAutoApprove
      ? []
      : [
          {
            id: "pending_supplier",
            label: "Supplier Review",
            done: ["pending_admin", "approved", "changes_requested", "rejected"].includes(status),
            active: status === "pending_supplier"
          }
        ]),
    {
      id: "pending_admin",
      label: "Admin Review",
      done: ["approved", "changes_requested", "rejected"].includes(status),
      active: status === "pending_admin"
    },
    {
      id: "resolved",
      label: status === "changes_requested" ? "Changes" : status === "rejected" ? "Rejected" : "Approved",
      done: ["approved", "changes_requested", "rejected"].includes(status),
      active: ["approved", "changes_requested", "rejected"].includes(status)
    }
  ];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
        {steps.map((s) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5">
            <div
              className={cx(
                "h-5 w-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                s.done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : s.active
                    ? "bg-white dark:bg-slate-900 border-amber-500 text-amber-500"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400"
              )}
            >
              {s.done ? "✓" : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <div
              className={cx(
                "text-[10px] font-bold uppercase tracking-tight whitespace-nowrap",
                s.active
                  ? "text-amber-700 dark:text-amber-300"
                  : s.done
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 dark:text-slate-400"
              )}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStatusRibbon({
  status,
  supplierAutoApprove,
  supplierReviewNote,
  onChangeNote,
  onApprove,
  onRequestChanges,
  onReject
}) {
  const message =
    status === "pending_supplier"
      ? "Waiting for you (Supplier) to approve this submission before it goes to Admin review."
      : status === "pending_admin"
        ? "Supplier has approved (or auto-approved). Admin review in progress."
        : status === "approved"
          ? "Approved and available to use in builders."
          : status === "changes_requested"
            ? "Changes were requested. The creator must resubmit before approval."
            : status === "draft"
              ? "Draft is private until submitted."
              : "Rejected. The creator can revise and resubmit with new media.";

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-2">
        <div className="mt-0.5">📋</div>
        <div className="min-w-0">
          <div className="font-extrabold text-amber-900 dark:text-amber-200">Review status: {statusLabel(status)}</div>
          <div className="mt-1 text-sm text-amber-800 dark:text-amber-300">{message}</div>
        </div>
      </div>

      <StatusTimeline status={status} supplierAutoApprove={supplierAutoApprove} />

      <div className="mt-4 rounded-xl border border-amber-200/60 dark:border-amber-800/60 bg-white/70 dark:bg-slate-900/60 p-3">
        <div className="text-xs font-extrabold text-amber-900 dark:text-amber-200">Supplier review note</div>
        <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
          Use this to request adjustments (hook, price overlay, disclaimer, dimensions, music) or to document approval.
        </div>
        <textarea
          rows={3}
          className="mt-2 w-full rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30"
          placeholder="e.g. Please add price overlay at 00:05 and include disclaimer text at the end…"
          value={supplierReviewNote}
          onChange={(e) => onChangeNote(e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="text-xs font-extrabold text-amber-900/80 dark:text-amber-300/80">Actions:</div>

        {status === "pending_supplier" ? (
          <>
            <Btn tone="brand" onClick={onApprove} title="Approve: send to Admin review">
              ✅ Approve
            </Btn>
            <Btn tone="danger" onClick={onRequestChanges} title="Recommend changes: send back to creator">
              ✏️ Recommend changes
            </Btn>
            <Btn tone="neutral" onClick={onReject} title="Reject: stop this submission">
              ⛔ Reject
            </Btn>
          </>
        ) : (
          <div className="text-xs text-amber-800 dark:text-amber-300 italic">No Supplier actions for this status.</div>
        )}

        {supplierAutoApprove ? (
          <Pill tone="warn" title="Auto-approval skips Supplier review stage">Auto-approval ON</Pill>
        ) : (
          <Pill tone="neutral">Manual review ON</Pill>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Dropzone ------------------------------- */

function Dropzone({ onFiles, helper, accept, multiple = true }) {
  const inputRef = useRef(null);

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Upload file(s)</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Drag & drop here or click to choose.</div>
          {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{helper}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Btn tone="neutral" onClick={() => inputRef.current?.click()}>
            ⬆️ Choose files
          </Btn>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || []);
          if (list.length) onFiles(list);
        }}
      />
    </div>
  );
}

/* --------------------------------- Preview Pane --------------------------- */

function PreviewPane({
  asset,
  selectedCampaign,
  supplierAutoApprove,
  reviewNote,
  onChangeReviewNote,
  onSupplierApprove,
  onSupplierRequestChanges,
  onSupplierReject,
  showPickerActions,
  onUse
}) {
  if (!asset) {
    return (
      <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">No asset selected</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Select an asset to preview details and perform reviews.</div>
      </div>
    );
  }

  const canUse = asset.status === "approved";
  const needsSupplierReview = asset.status === "pending_supplier";

  const dims = asset.dimensions ? `${asset.dimensions.width}×${asset.dimensions.height}` : "—";

  const primaryBtnLabel = showPickerActions ? "Use" : "Attach";

  return (
    <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{mediaEmoji(asset.mediaType)}</span>
            <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{asset.title}</div>
          </div>
          {asset.subtitle ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 truncate">{asset.subtitle}</div> : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={asset.status} />
            <MediaTypePill mediaType={asset.mediaType} />
            <SourcePill source={asset.source} />
            {selectedCampaign?.supplierReviewMode === "Auto" ? <Pill tone="warn">Supplier Auto Review</Pill> : <Pill tone="neutral">Supplier Manual Review</Pill>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Btn
            tone={canUse ? "brand" : "neutral"}
            disabled={!canUse}
            onClick={onUse}
            title={!canUse ? "Only approved assets can be used in builders" : "Use this asset"}
          >
            ➕ {primaryBtnLabel}
          </Btn>
          <Btn
            tone="neutral"
            onClick={() => {
              const ok = safeCopy(asset.previewUrl || "");
              // no toast here; caller handles
            }}
          >
            📋 Copy link
          </Btn>
          <Btn
            tone="neutral"
            onClick={() => {
              if (!asset.previewUrl) return;
              window.open(asset.previewUrl, "_blank", "noreferrer");
            }}
            title="Download"
          >
            ⬇️ Download
          </Btn>
        </div>
      </div>

      {/* Supplier Review Ribbon */}
      {needsSupplierReview ? (
        <div className="mt-4">
          <ReviewStatusRibbon
            status={asset.status}
            supplierAutoApprove={supplierAutoApprove}
            supplierReviewNote={reviewNote}
            onChangeNote={onChangeReviewNote}
            onApprove={onSupplierApprove}
            onRequestChanges={onSupplierRequestChanges}
            onReject={onSupplierReject}
          />
        </div>
      ) : null}

      {/* Preview area */}
      <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 overflow-hidden">
        {asset.previewKind === "video" && asset.previewUrl ? (
          <div className="relative aspect-video bg-black">
            <video
              src={asset.previewUrl}
              poster={asset.thumbnailUrl}
              className="absolute inset-0 h-full w-full object-contain"
              controls
              playsInline
            />
          </div>
        ) : asset.previewKind === "image" && asset.previewUrl ? (
          <div className="relative aspect-video bg-slate-200">
            <img src={asset.previewUrl} alt={asset.title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-600 dark:text-slate-300">No preview available.</div>
        )}
      </div>

      {/* Details */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-300">Owner</div>
          <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{asset.ownerLabel}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-300">Last updated</div>
          <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{asset.lastUpdatedLabel.replace("Last updated: ", "")}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-300">Role / placement</div>
          <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{asset.role || "—"}</div>
          {asset.role === "hero" ? (
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Hero images should be {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px.</div>
          ) : asset.role === "item_poster" ? (
            <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Item posters should be {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}px.</div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-300">Dimensions</div>
          <div className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{dims}</div>
        </div>
      </div>

      {asset.usageNotes || asset.restrictions ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Usage notes</div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.usageNotes || "—"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Restrictions</div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{asset.restrictions || "—"}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Tags</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(asset.tags || []).map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Supplier reminders */}
      <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Supplier review checklist</div>
        <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
          • Correct dimensions (hero/poster). • Clear CTA and price overlay. • Disclosure & policy compliance. • Licensed music only.
          • No competitor logos. • Links resolve and open fast.
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function SupplierAssetLibraryPage() {
  const { dealId, mode, target, returnTo, applyTo } = useQueryParams();
  const pickerMode = mode === "picker";
  const pickerTarget = target === "live" ? "live" : "shoppable";

  const [assets, setAssets] = useState([]);
  const [workspace, setWorkspace] = useState(EMPTY_ASSET_LIBRARY_CONTEXT);

  const creators = Array.isArray(workspace.creators) ? workspace.creators : [];
  const suppliers = Array.isArray(workspace.suppliers) ? workspace.suppliers : [];
  const campaigns = Array.isArray(workspace.campaigns) ? workspace.campaigns : [];
  const deliverables = Array.isArray(workspace.deliverables) ? workspace.deliverables : [];

  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  const [search, setSearch] = useState("");
  const [filterMedia, setFilterMedia] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // includes "pending" alias
  const [filterSource, setFilterSource] = useState("all");

  const [activeAssetId, setActiveAssetId] = useState(null);

  const [toast, setToast] = useState(null);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const campaignsForSupplier = useMemo(() => campaigns.filter((c) => c.supplierId === selectedSupplierId), [selectedSupplierId]);
  const deliverablesForCampaign = useMemo(() => deliverables.filter((d) => d.campaignId === selectedCampaignId), [selectedCampaignId]);

  const selectedCreator = useMemo(
    () => creators.find((c) => c.id === selectedCreatorId) || creators[0] || null,
    [creators, selectedCreatorId]
  );
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0] || null,
    [selectedSupplierId, suppliers]
  );
  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) || campaignsForSupplier[0] || null,
    [campaigns, campaignsForSupplier, selectedCampaignId]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [workspacePayload, assetPayload] = await Promise.all([
          sellerBackendApi.getMediaWorkspace(),
          sellerBackendApi.getMediaAssets()
        ]);
        if (cancelled) return;
        const rows = Array.isArray(assetPayload) ? assetPayload : [];
        setWorkspace({
          creators: Array.isArray(workspacePayload?.creators) ? workspacePayload.creators : [],
          suppliers: Array.isArray(workspacePayload?.suppliers) ? workspacePayload.suppliers : [],
          campaigns: Array.isArray(workspacePayload?.campaigns) ? workspacePayload.campaigns : [],
          deliverables: Array.isArray(workspacePayload?.deliverables) ? workspacePayload.deliverables : []
        });
        setAssets(rows.map(mapBackendAsset));
      } catch {
        if (!cancelled) {
          setWorkspace(EMPTY_ASSET_LIBRARY_CONTEXT);
          setAssets([]);
          setToast({ title: "Backend unavailable", body: "Could not fetch media assets." });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCreatorId && creators[0]?.id) {
      setSelectedCreatorId(creators[0].id);
    }
  }, [creators, selectedCreatorId]);

  useEffect(() => {
    if (!selectedSupplierId && suppliers[0]?.id) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [selectedSupplierId, suppliers]);

  useEffect(() => {
    if (!activeAssetId && assets[0]?.id) {
      setActiveAssetId(assets[0].id);
    }
  }, [activeAssetId, assets]);

  // Auto-select first campaign when supplier changes
  useEffect(() => {
    const first = campaigns.find((c) => c.supplierId === selectedSupplierId);
    if (first && first.id !== selectedCampaignId) {
      setSelectedCampaignId(first.id);
      return;
    }
    if (!first && selectedCampaignId) {
      setSelectedCampaignId("");
    }
  }, [campaigns, selectedCampaignId, selectedSupplierId]);

  const pendingSupplierCount = useMemo(
    () => assets.filter((a) => a.campaignId === selectedCampaignId && a.status === "pending_supplier").length,
    [assets, selectedCampaignId]
  );

  const supplierAutoApprove = useMemo(() => selectedCampaign?.supplierReviewMode === "Auto", [selectedCampaign]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter((a) => (selectedCampaignId ? a.campaignId === selectedCampaignId : true))
      .filter((a) => a.creatorScope === "all" || a.creatorScope === selectedCreatorId)
      .filter((a) => (filterMedia === "all" ? true : a.mediaType === filterMedia))
      .filter((a) => {
        if (filterStatus === "all") return true;
        if (filterStatus === "pending") return a.status === "pending_supplier" || a.status === "pending_admin";
        return a.status === filterStatus;
      })
      .filter((a) => (filterSource === "all" ? true : a.source === filterSource))
      .filter((a) => {
        if (!q) return true;
        const hay = `${a.title} ${a.subtitle || ""} ${(a.tags || []).join(" ")} ${a.ownerLabel || ""} ${a.brand || ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [assets, selectedCampaignId, selectedCreatorId, filterMedia, filterStatus, filterSource, search]);

  const activeAsset = useMemo(() => assets.find((a) => a.id === activeAssetId) || null, [assets, activeAssetId]);

  // Supplier review note per asset
  const [reviewNotes, setReviewNotes] = useState(() => ({}));
  const activeReviewNote = reviewNotes[activeAssetId || ""] || "";

  function openAsset(assetId) {
    setActiveAssetId(assetId);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setIsMobilePreviewOpen(true);
  }

  async function setStatus(assetId, status, note) {
    const current = assets.find((asset) => asset.id === assetId);
    if (!current) return;
    const nextAsset = { ...current, status };
    try {
      await sellerBackendApi.patchMediaAsset(assetId, {
        name: nextAsset.title,
        kind: nextAsset.mediaType,
        url: nextAsset.previewUrl,
        metadata: buildAssetMetadata(nextAsset, note),
      });
    } catch {
      setToast({ title: "Update failed", body: "Could not persist asset review status." });
      return;
    }
    setAssets((prev) => prev.map((a) => (a.id === assetId ? nextAsset : a)));
    if (note != null) setReviewNotes((prev) => ({ ...prev, [assetId]: note }));
  }

  function supplierApprove(asset) {
    // Supplier approves a creator submission: move to Admin review.
    const next = supplierAutoApprove ? "pending_admin" : "pending_admin";
    void setStatus(asset.id, next, activeReviewNote);
    setToast({ title: "Approved", body: "Sent to Admin review." });
  }

  function supplierRequestChanges(asset) {
    void setStatus(asset.id, "changes_requested", activeReviewNote);
    setToast({ title: "Changes requested", body: "The creator must update and resubmit." });
  }

  function supplierReject(asset) {
    void setStatus(asset.id, "rejected", activeReviewNote);
    setToast({ title: "Rejected", body: "Submission rejected. Creator can submit a new version." });
  }

  function onUseActive() {
    if (!activeAsset) return;
    if (activeAsset.status !== "approved") {
      setToast({ title: "Not available", body: "Only approved assets can be used in builders." });
      return;
    }

    if (pickerMode) {
      setToast({ title: "Use asset", body: `Return to builder with assetId=${activeAsset.id}` });
      return;
    }

    setToast({ title: "Attached", body: `Asset ${activeAsset.id} attached.` });
  }

  // ---------------- Submission drawer (Supplier uploads) ----------------
  const [submitStatus, setSubmitStatus] = useState("draft");
  const [submitImageMeta, setSubmitImageMeta] = useState(null);
  const [submitDraft, setSubmitDraft] = useState(() => {
    const firstDeliverable = deliverables.find((d) => d.campaignId === selectedCampaignId)?.id || "";
    return {
      campaignId: selectedCampaignId,
      deliverableId: firstDeliverable,
      title: "",
      postUrl: "",
      caption: "",
      notes: "",
      tagsCsv: "",
      mediaType: "video",
      role: "hero",
      heroSizeConfirmed: false,
      itemPosterSizeConfirmed: false,
      linkUrl: "",
      files: [],
      rightsConfirmed: false,
      noCopyrightedMusicConfirmed: false,
      disclosureConfirmed: false
    };
  });

  useEffect(() => {
    // Keep submit draft campaign aligned
    setSubmitDraft((d) => ({
      ...d,
      campaignId: selectedCampaignId,
      deliverableId: deliverables.find((x) => x.campaignId === selectedCampaignId)?.id || d.deliverableId
    }));
  }, [selectedCampaignId]);

  function resetSubmitDraft() {
    const firstDeliverable = deliverables.find((d) => d.campaignId === selectedCampaignId)?.id || "";
    setSubmitStatus("draft");
    setSubmitImageMeta(null);
    setSubmitDraft({
      campaignId: selectedCampaignId,
      deliverableId: firstDeliverable,
      title: "",
      postUrl: "",
      caption: "",
      notes: "",
      tagsCsv: "",
      mediaType: "video",
      role: "hero",
      heroSizeConfirmed: false,
      itemPosterSizeConfirmed: false,
      linkUrl: "",
      files: [],
      rightsConfirmed: false,
      noCopyrightedMusicConfirmed: false,
      disclosureConfirmed: false
    });
  }

  function readImageMeta(file) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          resolve(null);
          URL.revokeObjectURL(url);
        };
        img.src = url;
      } catch {
        resolve(null);
      }
    });
  }

  async function handleSubmitFiles(files) {
    setSubmitDraft((d) => ({
      ...d,
      files,
      heroSizeConfirmed: false,
      itemPosterSizeConfirmed: false
    }));
    setSubmitImageMeta(null);

    const first = files[0];
    if (first && first.type.startsWith("image/")) {
      const meta = await readImageMeta(first);
      setSubmitImageMeta(meta);
      if (meta) {
        if (meta.width === HERO_IMAGE_REQUIRED.width && meta.height === HERO_IMAGE_REQUIRED.height) {
          setSubmitDraft((d) => ({ ...d, heroSizeConfirmed: true }));
        }
        if (meta.width === ITEM_POSTER_REQUIRED.width && meta.height === ITEM_POSTER_REQUIRED.height) {
          setSubmitDraft((d) => ({ ...d, itemPosterSizeConfirmed: true }));
        }
      }
    }
  }

  async function submitForReview() {
    const missingRights = !submitDraft.rightsConfirmed || !submitDraft.noCopyrightedMusicConfirmed;
    const hasAnyMedia =
      submitDraft.mediaType === "link" ? Boolean((submitDraft.linkUrl || "").trim()) : submitDraft.files.length > 0 || Boolean((submitDraft.postUrl || "").trim());

    const isHeroImage = submitDraft.mediaType === "image" && submitDraft.role === "hero";
    const isItemPosterImage = submitDraft.mediaType === "image" && submitDraft.role === "item_poster";

    if (missingRights) {
      setToast({ title: "Confirm rights & licensing", body: "Please confirm you own/have rights and that music is licensed." });
      return;
    }
    if (!submitDraft.campaignId) {
      setToast({ title: "Select a campaign", body: "Choose the campaign this submission belongs to." });
      return;
    }
    if (!hasAnyMedia) {
      setToast({ title: "Add media", body: "Upload a file or add a draft URL to submit." });
      return;
    }

    if (isHeroImage) {
      const canAutoValidate = submitDraft.files.length > 0 && submitImageMeta;
      if (canAutoValidate) {
        const ok = submitImageMeta.width === HERO_IMAGE_REQUIRED.width && submitImageMeta.height === HERO_IMAGE_REQUIRED.height;
        if (!ok) {
          setToast({
            title: "Hero image size mismatch",
            body: `Hero must be ${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height}px. Detected ${submitImageMeta.width}×${submitImageMeta.height}px.`
          });
          return;
        }
      } else if (!submitDraft.heroSizeConfirmed) {
        setToast({ title: "Confirm hero image size", body: `Check confirmation: ${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height}px.` });
        return;
      }
    }

    if (isItemPosterImage) {
      const canAutoValidate = submitDraft.files.length > 0 && submitImageMeta;
      if (canAutoValidate) {
        const ok = submitImageMeta.width === ITEM_POSTER_REQUIRED.width && submitImageMeta.height === ITEM_POSTER_REQUIRED.height;
        if (!ok) {
          setToast({
            title: "Poster size mismatch",
            body: `Poster must be ${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height}px. Detected ${submitImageMeta.width}×${submitImageMeta.height}px.`
          });
          return;
        }
      } else if (!submitDraft.itemPosterSizeConfirmed) {
        setToast({ title: "Confirm poster size", body: `Check confirmation: ${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height}px.` });
        return;
      }
    }

    // Supplier uploads: go straight to Admin review (or approved depending on your policy).
    const finalStatus = "pending_admin";
    setSubmitStatus(finalStatus);

    const id = `as_${Math.random().toString(16).slice(2, 7)}`;
    const tags = (submitDraft.tagsCsv || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const previewKind = submitDraft.mediaType === "video" ? "video" : "image";
    const previewUrl =
      submitDraft.mediaType === "link" ? submitDraft.linkUrl : submitDraft.files[0] ? URL.createObjectURL(submitDraft.files[0]) : submitDraft.postUrl;

    const dims = submitImageMeta ? { width: submitImageMeta.width, height: submitImageMeta.height } : undefined;

    const nextAsset = {
      id,
      creatorScope: "all",
      title: submitDraft.title || "Untitled submission",
      subtitle: `${selectedCampaign?.name || "Campaign"} · ${selectedSupplier?.brand || selectedSupplier?.name}`,
      campaignId: submitDraft.campaignId,
      supplierId: selectedSupplierId,
      brand: selectedSupplier?.brand || selectedSupplier?.name,
      tags,
      mediaType: submitDraft.mediaType,
      source: "supplier",
      ownerLabel: "Owner: Supplier",
      status: finalStatus,
      lastUpdatedLabel: "Last updated: Just now",
      thumbnailUrl: previewKind === "image" ? previewUrl : undefined,
      previewUrl,
      previewKind,
      dimensions: dims,
      role: submitDraft.role || undefined,
      usageNotes: submitDraft.notes,
      restrictions: submitDraft.disclosureConfirmed ? "Disclosure confirmed" : "Disclosure may be required"
    };

    try {
      const created = await sellerBackendApi.createMediaAsset({
        name: nextAsset.title,
        kind: nextAsset.mediaType,
        url: nextAsset.previewUrl,
        isPublic: false,
        metadata: buildAssetMetadata(nextAsset, ""),
      });
      setAssets((prev) => [mapBackendAsset(created), ...prev]);
      setActiveAssetId(String(created.id || nextAsset.id));
    } catch {
      setToast({ title: "Submit failed", body: "Could not persist the media asset." });
      return;
    }

    setToast({ title: "Submitted", body: "Supplier content submitted for Admin review." });
    setIsSubmitOpen(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 overflow-x-hidden transition-colors">
      {/* Top header */}
      <div className="border-b bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-[0.55%] py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">⚡</div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">Asset Library</div>
              <div className="text-sm text-slate-500 dark:text-slate-300">
                Supplier library for campaigns & dealz. Review creator submissions, approve/reject, and maintain reusable packs.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Btn
              tone="neutral"
              onClick={() => setToast({ title: "Info", body: "Seller assets & creator templates" })}
              className="hidden sm:inline-flex"
            >
              ✨ Supplier assets & Creator templates
            </Btn>

            <Btn
              tone="brand"
              onClick={() => {
                resetSubmitDraft();
                setIsSubmitOpen(true);
              }}
            >
              ➕ Add Content
            </Btn>
          </div>
        </div>
      </div>

      {/* Context banner when opened as picker */}
      {(pickerMode || dealId) ? (
        <div className="w-full px-[0.55%] pt-4">
          <div className="rounded-2xl border bg-white dark:bg-slate-900 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <div className="mt-0.5">ℹ️</div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                    {dealId ? `Picking assets for deal ${dealId}` : "Asset picker mode"}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                    Only approved assets can be attached. Pending items must pass Supplier/Admin review.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                  Target: {pickerTarget === "live" ? "Live Builder" : "Ad Builder"}
                </span>
                {applyTo ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                    Apply: {applyTo}
                  </span>
                ) : null}
                {returnTo ? (
                  <Btn tone="neutral" onClick={() => setToast({ title: "Back", body: "Return to builder" })}>
                    ← Back
                  </Btn>
                ) : null}
                <Btn
                  tone="neutral"
                  onClick={() => {
                    safeCopy(window.location.href);
                    setToast({ title: "Shared", body: "Link copied." });
                  }}
                >
                  ↗ Share link
                </Btn>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full px-[0.55%] py-6">
        {/* Controls */}
        <div className="rounded-2xl border bg-white dark:bg-slate-900 p-4">
          <div className="grid gap-3 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets by name, tag, brand…"
                  className="w-full rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 py-2 pl-10 pr-3 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4 transition-colors"
                />
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Creator selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    {selectedCreator?.avatarUrl ? (
                      <img
                        src={selectedCreator.avatarUrl}
                        alt={selectedCreator.name || "Creator"}
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {selectedCreator?.name?.slice(0, 1)?.toUpperCase() || "C"}
                      </div>
                    )}
                    <select
                      value={selectedCreatorId}
                      onChange={(e) => setSelectedCreatorId(e.target.value)}
                      disabled={creators.length === 0}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {creators.length > 0 ? (
                        creators.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.handle})
                          </option>
                        ))
                      ) : (
                        <option value="">No creators available</option>
                      )}
                    </select>
                  </div>

                  {/* Supplier selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <span className="text-slate-400">🧰</span>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      disabled={suppliers.length === 0}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {suppliers.length > 0 ? (
                        suppliers.map((p) => (
                          <option key={p.id} value={p.id}>
                            Supplier: {p.name} ({p.kind})
                          </option>
                        ))
                      ) : (
                        <option value="">No suppliers available</option>
                      )}
                    </select>
                    <span className="text-slate-400">▾</span>
                  </div>

                  {/* Campaign selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      disabled={campaignsForSupplier.length === 0}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {campaignsForSupplier.length > 0 ? (
                        campaignsForSupplier.map((c) => (
                          <option key={c.id} value={c.id}>
                            Campaign: {c.name} · {c.brand} ({c.status})
                          </option>
                        ))
                      ) : (
                        <option value="">No campaigns available</option>
                      )}
                    </select>
                    <span className="text-slate-400">▾</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-300">Full-text search active</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
              🧪 Filters
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Source: All</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    Source: {sourceLabel(s)}
                  </option>
                ))}
              </select>

              <select
                value={filterMedia}
                onChange={(e) => setFilterMedia(e.target.value)}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Type: All</option>
                {MEDIA_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mediaLabel(mt)}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Status: All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending review</option>
                <option value="pending_supplier">Supplier review</option>
                <option value="pending_admin">Admin review</option>
                <option value="changes_requested">Changes requested</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select>

              <Btn
                tone={pendingSupplierCount ? "brand" : "neutral"}
                onClick={() => setFilterStatus("pending_supplier")}
                title="Show only items waiting for Supplier review"
              >
                🧾 Review queue {pendingSupplierCount ? `(${pendingSupplierCount})` : ""}
              </Btn>
            </div>

            <div className="ml-auto text-sm text-slate-500 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-100">{filteredAssets.length}</span> of{" "}
              <span className="font-medium text-slate-700 dark:text-slate-100">{assets.length}</span>
            </div>
          </div>

          <div className="mt-4">
            <CopyrightSafetyCallout />
          </div>
        </div>

        {/* Main split */}
        <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-12">
          {/* Assets list */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Assets</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                    Content from creators, suppliers, and catalog is aggregated per campaign. Supplier review gates usage.
                  </div>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <Btn tone="neutral" onClick={() => setToast({ title: "Saved packs", body: "Open saved packs" })}>
                    ⭐ Saved packs
                  </Btn>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {filteredAssets.map((a) => {
                  const selected = a.id === activeAssetId;
                  const thumb = a.thumbnailUrl || a.previewUrl ? (
                    <img src={a.thumbnailUrl || a.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <span className="text-lg">{mediaEmoji(a.mediaType)}</span>
                    </div>
                  );

                  return (
                    <button
                      key={a.id}
                      onClick={() => openAsset(a.id)}
                      className={cx(
                        "text-left rounded-2xl border border-slate-300 dark:border-slate-700 p-3 sm:p-4 transition-colors",
                        selected
                          ? "border-orange-400 dark:border-orange-500 bg-orange-50/30 dark:bg-orange-900/20"
                          : "hover:bg-gray-50 dark:bg-slate-950 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">{thumb}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{a.title}</div>
                              {a.subtitle ? <div className="truncate text-xs text-slate-500 dark:text-slate-300">{a.subtitle}</div> : null}
                            </div>
                            <div className="shrink-0">
                              <MediaTypePill mediaType={a.mediaType} />
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusPill status={a.status} />
                            <SourcePill source={a.source} />
                            <span className="text-xs text-slate-500 dark:text-slate-300">{a.lastUpdatedLabel.replace("Last updated: ", "")}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600">
                              {a.ownerLabel}
                            </span>
                            {(a.tags || []).slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600"
                              >
                                #{t}
                              </span>
                            ))}
                            {(a.tags || []).length > 3 ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600">
                                +{a.tags.length - 3}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredAssets.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-slate-300 dark:border-slate-700 border-dashed bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-6 text-center text-sm text-slate-700 dark:text-slate-200">
                    No assets match your filters.
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">Try clearing filters or uploading new content for this campaign.</div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Collections (premium extra) */}
            <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Collections</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Group assets into reusable packs for Adz or Live.</div>
                </div>
                <Btn tone="neutral" onClick={() => setToast({ title: "New collection", body: "Create a new collection" })}>
                  ➕ New collection
                </Btn>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Starter pack</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">2 assets · poster + overlay</div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
                      Ready
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-300">Use for shoppable ads and short lives.</div>
                    <Btn tone="neutral" onClick={() => setToast({ title: "Use pack", body: "Applied pack" })}>
                      Use pack →
                    </Btn>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Price-drop overlays</div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">2 assets · overlay variants</div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-xs text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">
                      Needs review
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-300">Complete review to unlock this collection.</div>
                    <Btn tone="neutral" onClick={() => setToast({ title: "Open", body: "Open collection" })}>
                      Open ↗
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview / details */}
          <div className="lg:col-span-5">
            <PreviewPane
              asset={activeAsset}
              selectedCampaign={selectedCampaign}
              supplierAutoApprove={supplierAutoApprove}
              reviewNote={activeReviewNote}
              onChangeReviewNote={(txt) => setReviewNotes((prev) => ({ ...prev, [activeAssetId || ""]: txt }))}
              onSupplierApprove={() => activeAsset && supplierApprove(activeAsset)}
              onSupplierRequestChanges={() => activeAsset && supplierRequestChanges(activeAsset)}
              onSupplierReject={() => activeAsset && supplierReject(activeAsset)}
              showPickerActions={Boolean(dealId) || pickerMode}
              onUse={() => {
                // copy link on action button inside preview is not toasty; keep here.
                onUseActive();
              }}
            />

            {/* Mini analytics */}
            <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Library activity</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Uploads + approvals trend for this campaign.</div>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                  Last 14 days
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-100">
                <MiniChart points={[4, 3, 2, 5, 7, 6, 5, 8, 7, 6, 9, 10, 8, 11]} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">New</div>
                  <div className="mt-1 font-extrabold text-slate-900 dark:text-slate-50">+11</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">Approved</div>
                  <div className="mt-1 font-extrabold text-slate-900 dark:text-slate-50">8</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">Pending</div>
                  <div className="mt-1 font-extrabold text-slate-900 dark:text-slate-50">3</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile preview modal */}
      <Modal
        open={isMobilePreviewOpen}
        title="Asset preview"
        onClose={() => setIsMobilePreviewOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2">
            <Btn tone="neutral" onClick={() => setIsMobilePreviewOpen(false)}>
              ← Back
            </Btn>
            <div className="flex flex-wrap items-center gap-2">
              <Btn
                tone={activeAsset?.status === "approved" ? "brand" : "neutral"}
                onClick={() => {
                  setIsMobilePreviewOpen(false);
                  onUseActive();
                }}
                disabled={activeAsset?.status !== "approved"}
                title={activeAsset?.status !== "approved" ? "Only approved assets can be used" : "Use"}
              >
                ➕ {dealId || pickerMode ? "Use" : "Attach"}
              </Btn>
            </div>
          </div>
        }
      >
        <PreviewPane
          asset={activeAsset}
          selectedCampaign={selectedCampaign}
          supplierAutoApprove={supplierAutoApprove}
          reviewNote={activeReviewNote}
          onChangeReviewNote={(txt) => setReviewNotes((prev) => ({ ...prev, [activeAssetId || ""]: txt }))}
          onSupplierApprove={() => activeAsset && supplierApprove(activeAsset)}
          onSupplierRequestChanges={() => activeAsset && supplierRequestChanges(activeAsset)}
          onSupplierReject={() => activeAsset && supplierReject(activeAsset)}
          showPickerActions={Boolean(dealId) || pickerMode}
          onUse={onUseActive}
        />
      </Modal>

      {/* Content submission drawer */}
      <Drawer
        open={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title="Add content"
        subtitle="Upload or link media, then submit for review. Supplier uploads go to Admin review by default."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              🛡️ Uploading implies you have rights to use this content.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="neutral" onClick={() => setIsSubmitOpen(false)}>
                Cancel
              </Btn>
              <Btn tone="brand" onClick={submitForReview}>
                📤 Submit for review
              </Btn>
            </div>
          </div>
        }
      >
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Submission status</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Supplier uploads go to <b>Admin Review</b> by default. (Your production rules may differ.)
              </div>
            </div>
            <StatusPill status={submitStatus} />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white dark:bg-slate-900 p-4">
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-50">Submission details</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Supplier</div>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 px-3 py-2 text-sm">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600">
                  ✅
                </span>
                {selectedSupplier?.name} ({selectedSupplier?.kind})
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Campaign</div>
              <select
                value={submitDraft.campaignId}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, campaignId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                {campaignsForSupplier.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.brand} · {c.status}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                Brand: {selectedCampaign?.brand} · {selectedCampaign?.status}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Deliverable (from contract)</div>
              <select
                value={submitDraft.deliverableId}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, deliverableId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                {deliverablesForCampaign.length ? (
                  deliverablesForCampaign.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.dueDateLabel})
                    </option>
                  ))
                ) : (
                  <option value="">No deliverables set</option>
                )}
              </select>
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Media type</div>
              <select
                value={submitDraft.mediaType}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, mediaType: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                {MEDIA_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mediaLabel(mt)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Title</div>
              <input
                value={submitDraft.title}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Hero intro video (v2)"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              />
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Role / placement</div>
              <select
                value={submitDraft.role}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, role: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                <option value="hero">Hero</option>
                <option value="item_poster">Featured item poster</option>
                <option value="offer">Offer</option>
                <option value="overlay">Overlay</option>
                <option value="lower_third">Lower third</option>
                <option value="opener">Opener</option>
                <option value="script">Script</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Tags (comma-separated)</div>
              <input
                value={submitDraft.tagsCsv}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, tagsCsv: e.target.value }))}
                placeholder="hero, intro, glow"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              />
            </div>

            <div className="sm:col-span-2">
              {submitDraft.mediaType === "link" ? (
                <>
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Link URL</div>
                  <input
                    value={submitDraft.linkUrl}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, linkUrl: e.target.value }))}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
                  />
                </>
              ) : (
                <Dropzone
                  accept={submitDraft.mediaType === "video" ? "video/*" : submitDraft.mediaType === "image" || submitDraft.mediaType === "overlay" ? "image/*" : "*"}
                  helper={
                    submitDraft.role === "hero" && submitDraft.mediaType === "image"
                      ? `Hero image must be ${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height}px.`
                      : submitDraft.role === "item_poster" && submitDraft.mediaType === "image"
                        ? `Poster must be ${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height}px.`
                        : "Upload media that matches this deliverable."
                  }
                  onFiles={handleSubmitFiles}
                />
              )}

              {submitImageMeta ? (
                <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3 text-sm text-slate-700 dark:text-slate-200">
                  Detected image size: <b>{submitImageMeta.width}×{submitImageMeta.height}</b>
                </div>
              ) : null}

              {submitDraft.mediaType === "image" && submitDraft.role === "hero" && !submitDraft.heroSizeConfirmed ? (
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitDraft.heroSizeConfirmed}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, heroSizeConfirmed: e.target.checked }))}
                    className="rounded border-slate-300 dark:border-slate-600 text-orange-600"
                  />
                  I confirm this hero image is {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px.
                </label>
              ) : null}

              {submitDraft.mediaType === "image" && submitDraft.role === "item_poster" && !submitDraft.itemPosterSizeConfirmed ? (
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitDraft.itemPosterSizeConfirmed}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, itemPosterSizeConfirmed: e.target.checked }))}
                    className="rounded border-slate-300 dark:border-slate-600 text-orange-600"
                  />
                  I confirm this poster is {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}px.
                </label>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Notes</div>
              <textarea
                rows={3}
                value={submitDraft.notes}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="What’s included, what to check, placement notes…"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              />
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 p-3">
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Rights & compliance</div>
              <div className="mt-2 grid gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitDraft.rightsConfirmed}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, rightsConfirmed: e.target.checked }))}
                    className="rounded border-slate-300 dark:border-slate-600 text-orange-600"
                  />
                  I own/have rights to use this media.
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitDraft.noCopyrightedMusicConfirmed}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, noCopyrightedMusicConfirmed: e.target.checked }))}
                    className="rounded border-slate-300 dark:border-slate-600 text-orange-600"
                  />
                  Any music is licensed for commercial use.
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitDraft.disclosureConfirmed}
                    onChange={(e) => setSubmitDraft((d) => ({ ...d, disclosureConfirmed: e.target.checked }))}
                    className="rounded border-slate-300 dark:border-slate-600 text-orange-600"
                  />
                  Disclosure/claim rules have been applied where needed.
                </label>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`AssetLibrary test failed: ${msg}`);
  };

  // cx
  assert(cx("a", false && "b", "c") === "a c", "cx joins truthy");

  // statusLabel
  assert(statusLabel("pending_supplier") === "Supplier Review", "statusLabel pending_supplier");

  // filterStatus pending alias behavior
  const sample = [
    { id: "1", status: "pending_supplier" },
    { id: "2", status: "pending_admin" },
    { id: "3", status: "approved" }
  ];
  const pending = sample.filter((a) => a.status === "pending_supplier" || a.status === "pending_admin");
  assert(pending.length === 2, "pending includes supplier + admin");

  // required sizes
  assert(HERO_IMAGE_REQUIRED.width === 1920 && HERO_IMAGE_REQUIRED.height === 1080, "hero size constant");
  assert(ITEM_POSTER_REQUIRED.width === 500 && ITEM_POSTER_REQUIRED.height === 500, "poster size constant");

  console.log("✅ SupplierAssetLibraryPage self-tests passed");
}
