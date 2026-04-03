import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../../../auth/session";
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
 * - Controls card: search + campaign/team/creator selectors + filter chips
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

/* --------------------------------- Data mapping ---------------------------------- */

const ALL_TEAM_ID = "all_team";
const ALL_CREATORS_ID = "all_creators";
const NO_CREATORS_ASSIGNED_ID = "no_creators_assigned";

function relativeUpdatedLabel(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Last updated: Recently";
  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 60 * 1000) return "Last updated: Just now";
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) return `Last updated: ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Last updated: ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Last updated: ${diffDays}d ago`;
  return "Last updated: Recently";
}

function normalizeMediaType(value) {
  const mediaType = String(value || "").toLowerCase();
  return MEDIA_TYPES.includes(mediaType) ? mediaType : "image";
}

function normalizeSource(value) {
  const source = String(value || "").toLowerCase();
  return SOURCES.includes(source) ? source : "supplier";
}

function normalizeAssetStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (!status) return "draft";
  if (status === "pending" || status === "in_review") return "pending_supplier";
  return status;
}

function mapCampaignRecord(record) {
  const data = record?.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data : {};
  const supplierId = String(
    record?.sellerId ||
      data?.sellerId ||
      record?.supplierId ||
      data?.supplierId ||
      record?.storeId ||
      data?.storeId ||
      "supplier"
  );
  const name = String(record?.title || data?.name || data?.title || "Untitled campaign");
  const brand = String(data?.brand || data?.brandName || name);
  return {
    id: String(record?.id || data?.id || `camp-${Math.random().toString(16).slice(2, 8)}`),
    supplierId,
    supplierName: String(data?.supplierName || data?.sellerName || "Supplier"),
    name,
    brand,
    status: String(record?.status || data?.status || "Draft").toLowerCase() === "active" ? "Active" : String(record?.status || data?.status || "Draft"),
    supplierReviewMode: String(data?.supplierReviewMode || data?.approvalMode || "Manual").toLowerCase() === "auto" ? "Auto" : "Manual",
  };
}

function mapWorkspaceCreators(workspace) {
  const asArray = Array.isArray(workspace?.creators)
    ? workspace.creators
    : Array.isArray(workspace?.recommendedCreators)
      ? workspace.recommendedCreators
      : [];
  return asArray
    .map((creator, index) => ({
      id: String(creator?.id || creator?.creatorId || `creator-${index + 1}`),
      name: String(creator?.name || creator?.displayName || "Creator"),
      handle: String(creator?.handle || creator?.username || "@creator"),
      avatarUrl: String(creator?.avatarUrl || creator?.imageUrl || ""),
    }))
    .filter((creator) => creator.id);
}

function mapMediaAssetRecord(record, campaignById, supplierId) {
  const data = record?.data && typeof record.data === "object" && !Array.isArray(record.data) ? record.data : {};
  const campaignId = String(record?.campaignId || data?.campaignId || data?.campaign?.id || "");
  const campaign = campaignById.get(campaignId);
  const source = normalizeSource(record?.source || data?.source || data?.ownerType);
  const mediaType = normalizeMediaType(record?.mediaType || data?.mediaType || data?.kind);
  const previewUrl = String(record?.previewUrl || data?.previewUrl || record?.url || data?.url || data?.fileUrl || "");
  const thumbnailUrl = String(record?.thumbnailUrl || data?.thumbnailUrl || previewUrl || "");
  const creatorScope = String(record?.creatorId || data?.creatorId || "all");
  const status = normalizeAssetStatus(record?.status || data?.status);
  const dimensionsRaw = data?.dimensions && typeof data.dimensions === "object" ? data.dimensions : null;
  const width = Number(dimensionsRaw?.width);
  const height = Number(dimensionsRaw?.height);
  return {
    id: String(record?.id || data?.id || ""),
    creatorScope,
    teamScope: ALL_TEAM_ID,
    title: String(record?.title || data?.title || data?.name || "Untitled asset"),
    subtitle: `${campaign?.name || "Campaign"} · ${campaign?.brand || "Brand"}`,
    campaignId,
    supplierId: String(record?.supplierId || data?.supplierId || campaign?.supplierId || supplierId || "supplier"),
    brand: String(campaign?.brand || data?.brand || "Brand"),
    tags: Array.isArray(record?.tags) ? record.tags.map((tag) => String(tag)) : Array.isArray(data?.tags) ? data.tags.map((tag) => String(tag)) : [],
    mediaType,
    source,
    ownerLabel: source === "creator" ? "Owner: Creator" : source === "catalog" ? "Owner: Catalog" : "Owner: Supplier",
    status,
    lastUpdatedLabel: relativeUpdatedLabel(record?.updatedAt || data?.updatedAt || record?.createdAt || data?.createdAt),
    thumbnailUrl,
    previewUrl,
    previewKind: mediaType === "video" ? "video" : "image",
    dimensions: Number.isFinite(width) && Number.isFinite(height) ? { width, height } : undefined,
    role: String(data?.role || record?.role || ""),
    aspect: String(data?.aspect || ""),
    desktopMode: String(data?.desktopMode || "modal"),
    usageNotes: String(data?.usageNotes || ""),
    restrictions: String(data?.restrictions || ""),
  };
}

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
  const session = useSession();

  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [creators, setCreators] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(ALL_TEAM_ID);
  const [selectedCreatorId, setSelectedCreatorId] = useState(ALL_CREATORS_ID);

  const [search, setSearch] = useState("");
  const [filterMedia, setFilterMedia] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // includes "pending" alias
  const [filterSource, setFilterSource] = useState("all");

  const [activeAssetId, setActiveAssetId] = useState(null);

  const [toast, setToast] = useState(null);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const suppliers = useMemo(() => {
    const entries = new Map();
    campaigns.forEach((campaign) => {
      const supplierId = String(campaign.supplierId || "");
      if (!supplierId) return;
      if (entries.has(supplierId)) return;
      entries.set(supplierId, {
        id: supplierId,
        name: String(campaign.supplierName || "Supplier"),
        kind: "Seller",
        brand: String(campaign.brand || campaign.name || "Brand"),
      });
    });
    return Array.from(entries.values());
  }, [campaigns]);
  const campaignById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns]);

  const implicitSupplierId = useMemo(() => {
    const sessionLike = session || {};
    const supplierKeys = ["supplierId", "sellerId", "storeId", "brandId"];
    for (const key of supplierKeys) {
      const value = sessionLike[key];
      if (typeof value === "string" && suppliers.some((supplier) => supplier.id === value)) {
        return value;
      }
    }
    return campaigns[0]?.supplierId || suppliers[0]?.id || "";
  }, [session, suppliers, campaigns]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      sellerBackendApi.getMediaAssets(),
      sellerBackendApi.getCampaigns(),
      sellerBackendApi.getMyCreatorsWorkspace(),
    ])
      .then(([mediaRows, campaignRows, creatorWorkspace]) => {
        if (!mounted) return;
        const mappedCampaigns = Array.isArray(campaignRows) ? campaignRows.map(mapCampaignRecord).filter((campaign) => campaign.id) : [];
        const campaignById = new Map(mappedCampaigns.map((campaign) => [campaign.id, campaign]));
        const defaultSupplierId = mappedCampaigns[0]?.supplierId || "";
        const mappedAssets = Array.isArray(mediaRows)
          ? mediaRows
              .map((row) => mapMediaAssetRecord(row, campaignById, defaultSupplierId))
              .filter((asset) => asset.id)
          : [];
        const mappedCreators = mapWorkspaceCreators(creatorWorkspace);
        setCampaigns(mappedCampaigns);
        setAssets(mappedAssets);
        setCreators(mappedCreators);
        setActiveAssetId((prev) => (prev && mappedAssets.some((asset) => asset.id === prev) ? prev : mappedAssets[0]?.id || null));
      })
      .catch(() => {
        if (!mounted) return;
        setCampaigns([]);
        setAssets([]);
        setCreators([]);
        setActiveAssetId(null);
        setToast({
          title: "Load failed",
          body: "Unable to load campaign assets right now.",
          tone: "warn",
        });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const campaignTeams = useMemo(
    () =>
      campaigns.map((campaign) => ({
        id: `tm_${campaign.id}_content`,
        campaignId: campaign.id,
        name: "Content Team",
        creatorIds: creators.map((creator) => creator.id),
      })),
    [campaigns, creators]
  );

  const deliverables = useMemo(
    () =>
      campaigns.map((campaign) => ({
        id: `dv_${campaign.id}_asset_submission`,
        campaignId: campaign.id,
        label: "Campaign asset submission",
        dueDateLabel: "TBD",
      })),
    [campaigns]
  );

  const campaignsForSupplier = useMemo(
    () => campaigns.filter((campaign) => campaign.supplierId === implicitSupplierId),
    [campaigns, implicitSupplierId]
  );
  const deliverablesForCampaign = useMemo(
    () => deliverables.filter((deliverable) => deliverable.campaignId === selectedCampaignId),
    [deliverables, selectedCampaignId]
  );
  const teamsForCampaign = useMemo(
    () => campaignTeams.filter((team) => team.campaignId === selectedCampaignId),
    [campaignTeams, selectedCampaignId]
  );

  const creatorsForScope = useMemo(() => {
    if (!selectedCampaignId) return [];
    const ids = new Set();
    const scopedTeams =
      selectedTeamId === ALL_TEAM_ID ? teamsForCampaign : teamsForCampaign.filter((team) => team.id === selectedTeamId);
    scopedTeams.forEach((team) => {
      (team.creatorIds || []).forEach((id) => ids.add(id));
    });
    assets.forEach((asset) => {
      if (asset.campaignId !== selectedCampaignId || asset.creatorScope === "all") return;
      if (selectedTeamId !== ALL_TEAM_ID && asset.teamScope !== ALL_TEAM_ID && asset.teamScope !== selectedTeamId) return;
      ids.add(asset.creatorScope);
    });
    return creators.filter((creator) => ids.has(creator.id));
  }, [selectedCampaignId, selectedTeamId, teamsForCampaign, assets, creators]);

  const selectedCreator = useMemo(() => creators.find((c) => c.id === selectedCreatorId) || null, [selectedCreatorId, creators]);
  const selectedSupplier = useMemo(() => suppliers.find((s) => s.id === implicitSupplierId) || suppliers[0], [implicitSupplierId, suppliers]);
  const selectedCampaign = useMemo(
    () => campaignsForSupplier.find((c) => c.id === selectedCampaignId) || campaignsForSupplier[0],
    [selectedCampaignId, campaignsForSupplier]
  );

  // Ensure campaign is always in supplier scope and defaults to active.
  useEffect(() => {
    if (!campaignsForSupplier.length) {
      if (selectedCampaignId) setSelectedCampaignId("");
      if (selectedTeamId !== ALL_TEAM_ID) setSelectedTeamId(ALL_TEAM_ID);
      if (selectedCreatorId !== ALL_CREATORS_ID) setSelectedCreatorId(ALL_CREATORS_ID);
      return;
    }
    const inScope = campaignsForSupplier.some((campaign) => campaign.id === selectedCampaignId);
    if (!inScope) {
      const nextDefault = campaignsForSupplier.find((campaign) => campaign.status === "Active") || campaignsForSupplier[0];
      if (nextDefault?.id) setSelectedCampaignId(nextDefault.id);
      if (selectedTeamId !== ALL_TEAM_ID) setSelectedTeamId(ALL_TEAM_ID);
      if (selectedCreatorId !== ALL_CREATORS_ID) setSelectedCreatorId(ALL_CREATORS_ID);
    }
  }, [campaignsForSupplier, selectedCampaignId, selectedTeamId, selectedCreatorId]);

  // Reset Team/Creators if campaign scope changes.
  useEffect(() => {
    if (selectedTeamId !== ALL_TEAM_ID && !teamsForCampaign.some((team) => team.id === selectedTeamId)) {
      setSelectedTeamId(ALL_TEAM_ID);
      if (selectedCreatorId !== ALL_CREATORS_ID) setSelectedCreatorId(ALL_CREATORS_ID);
    }
  }, [teamsForCampaign, selectedTeamId, selectedCreatorId]);

  // Reset creator to All if creator no longer belongs to current scope.
  useEffect(() => {
    if (selectedCreatorId === ALL_CREATORS_ID) return;
    if (!creatorsForScope.some((creator) => creator.id === selectedCreatorId)) {
      setSelectedCreatorId(ALL_CREATORS_ID);
    }
  }, [creatorsForScope, selectedCreatorId]);

  function handleCampaignChange(nextCampaignId) {
    setSelectedCampaignId(nextCampaignId);
    setSelectedTeamId(ALL_TEAM_ID);
    setSelectedCreatorId(ALL_CREATORS_ID);
  }

  function handleTeamChange(nextTeamId) {
    setSelectedTeamId(nextTeamId);
    setSelectedCreatorId(ALL_CREATORS_ID);
  }

  const pendingSupplierCount = useMemo(
    () => assets.filter((a) => a.campaignId === selectedCampaignId && a.status === "pending_supplier").length,
    [assets, selectedCampaignId]
  );

  const supplierAutoApprove = useMemo(() => selectedCampaign?.supplierReviewMode === "Auto", [selectedCampaign]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter((a) => (selectedCampaignId ? a.campaignId === selectedCampaignId : true))
      .filter((a) => (selectedTeamId === ALL_TEAM_ID ? true : a.teamScope === ALL_TEAM_ID || a.teamScope === selectedTeamId))
      .filter((a) => (selectedCreatorId === ALL_CREATORS_ID ? true : a.creatorScope === "all" || a.creatorScope === selectedCreatorId))
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
  }, [assets, selectedCampaignId, selectedTeamId, selectedCreatorId, filterMedia, filterStatus, filterSource, search]);

  const activeAsset = useMemo(() => assets.find((a) => a.id === activeAssetId) || null, [assets, activeAssetId]);

  // Supplier review note per asset (demo)
  const [reviewNotes, setReviewNotes] = useState(() => ({}));
  const activeReviewNote = reviewNotes[activeAssetId || ""] || "";

  function openAsset(assetId) {
    setActiveAssetId(assetId);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setIsMobilePreviewOpen(true);
  }

  async function setStatus(assetId, status, note) {
    try {
      await sellerBackendApi.patchMediaAsset(assetId, {
        status,
        reviewNote: note || undefined,
      });
      setAssets((prev) => prev.map((asset) => (asset.id === assetId ? { ...asset, status } : asset)));
      if (note != null) setReviewNotes((prev) => ({ ...prev, [assetId]: note }));
      return true;
    } catch {
      setToast({ title: "Update failed", body: "Could not update asset status. Please retry." });
      return false;
    }
  }

  async function supplierApprove(asset) {
    const next = supplierAutoApprove ? "pending_admin" : "pending_admin";
    const ok = await setStatus(asset.id, next, activeReviewNote);
    if (ok) {
      setToast({ title: "Approved", body: "Sent to Admin review." });
    }
  }

  async function supplierRequestChanges(asset) {
    const ok = await setStatus(asset.id, "changes_requested", activeReviewNote);
    if (ok) {
      setToast({ title: "Changes requested", body: "The creator must update and resubmit." });
    }
  }

  async function supplierReject(asset) {
    const ok = await setStatus(asset.id, "rejected", activeReviewNote);
    if (ok) {
      setToast({ title: "Rejected", body: "Submission rejected. Creator can submit a new version." });
    }
  }

  function onUseActive() {
    if (!activeAsset) return;
    if (activeAsset.status !== "approved") {
      setToast({ title: "Not available", body: "Only approved assets can be used in builders." });
      return;
    }

    if (pickerMode) {
      setToast({ title: "Use asset", body: `Return to builder with assetId=${activeAsset.id} (demo)` });
      return;
    }

    setToast({ title: "Attached", body: `Asset ${activeAsset.id} attached (demo).` });
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
  }, [selectedCampaignId, deliverables]);

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

    const finalStatus = "pending_admin";
    setSubmitStatus(finalStatus);

    const tags = (submitDraft.tagsCsv || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const previewUrl =
      submitDraft.mediaType === "link" ? submitDraft.linkUrl : submitDraft.files[0] ? URL.createObjectURL(submitDraft.files[0]) : submitDraft.postUrl;
    const dims = submitImageMeta ? { width: submitImageMeta.width, height: submitImageMeta.height } : undefined;
    try {
      const created = await sellerBackendApi.createMediaAsset({
        title: submitDraft.title || "Untitled submission",
        campaignId: submitDraft.campaignId,
        supplierId: implicitSupplierId,
        mediaType: submitDraft.mediaType,
        source: "supplier",
        status: finalStatus,
        role: submitDraft.role || undefined,
        tags,
        previewUrl,
        thumbnailUrl: submitDraft.mediaType === "video" ? undefined : previewUrl,
        dimensions: dims,
        usageNotes: submitDraft.notes || "",
        restrictions: submitDraft.disclosureConfirmed ? "Disclosure confirmed" : "Disclosure may be required",
        rightsConfirmed: submitDraft.rightsConfirmed,
        noCopyrightedMusicConfirmed: submitDraft.noCopyrightedMusicConfirmed,
        disclosureConfirmed: submitDraft.disclosureConfirmed,
        fileNames: (submitDraft.files || []).map((file) => file?.name).filter(Boolean),
      });
      const createdId = String(created?.id || created?.data?.id || "");
      const refreshedRows = await sellerBackendApi.getMediaAssets();
      const refreshedAssets = Array.isArray(refreshedRows)
        ? refreshedRows
            .map((row) => mapMediaAssetRecord(row, campaignById, implicitSupplierId))
            .filter((asset) => asset.id)
        : [];
      setAssets(refreshedAssets);
      setActiveAssetId((prev) => {
        if (createdId && refreshedAssets.some((asset) => asset.id === createdId)) return createdId;
        if (prev && refreshedAssets.some((asset) => asset.id === prev)) return prev;
        return refreshedAssets[0]?.id || null;
      });
      setToast({ title: "Submitted", body: "Supplier content submitted for Admin review." });
      setIsSubmitOpen(false);
    } catch {
      setToast({ title: "Submit failed", body: "Could not submit content. Please retry." });
    }
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
              onClick={() => setToast({ title: "Info", body: "Seller assets & creator templates (demo)" })}
              className="hidden sm:inline-flex"
            >
              <span aria-hidden="true">✨</span>
              <span>Open Creative Editor</span>
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
                  <Btn tone="neutral" onClick={() => setToast({ title: "Back", body: "Return to builder (demo)" })}>
                    ← Back
                  </Btn>
                ) : null}
                <Btn
                  tone="neutral"
                  onClick={() => {
                    safeCopy(window.location.href);
                    setToast({ title: "Shared", body: "Link copied (demo)." });
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
                  {/* Campaign selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <span className="text-slate-400">🎯</span>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => handleCampaignChange(e.target.value)}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {campaignsForSupplier.length ? (
                        campaignsForSupplier.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            Campaign: {campaign.name} · {campaign.brand} ({campaign.status})
                          </option>
                        ))
                      ) : (
                        <option value="">
                          Campaign: No campaigns available
                        </option>
                      )}
                    </select>
                    <span className="text-slate-400">▾</span>
                  </div>

                  {/* Team selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <span className="text-slate-400">🧩</span>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => handleTeamChange(e.target.value)}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      <option value={ALL_TEAM_ID}>Team: All Team</option>
                      {teamsForCampaign.map((team) => (
                        <option key={team.id} value={team.id}>
                          Team: {team.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-400">▾</span>
                  </div>

                  {/* Creators selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    {selectedCreatorId !== ALL_CREATORS_ID && selectedCreator ? (
                      <img src={selectedCreator.avatarUrl} alt={selectedCreator.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-300">
                        👥
                      </span>
                    )}
                    <select
                      value={creatorsForScope.length ? selectedCreatorId : NO_CREATORS_ASSIGNED_ID}
                      onChange={(e) => setSelectedCreatorId(e.target.value)}
                      disabled={!creatorsForScope.length}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {creatorsForScope.length ? (
                        <>
                          <option value={ALL_CREATORS_ID}>Creators: All Creators</option>
                          {creatorsForScope.map((creator) => (
                            <option key={creator.id} value={creator.id}>
                              Creators: {creator.name} ({creator.handle})
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value={NO_CREATORS_ASSIGNED_ID}>No creators assigned</option>
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
                  <Btn tone="neutral" onClick={() => setToast({ title: "Saved packs", body: "Open saved packs (demo)" })}>
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
                <Btn tone="neutral" onClick={() => setToast({ title: "New collection", body: "Create a new collection (demo)" })}>
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
                    <Btn tone="neutral" onClick={() => setToast({ title: "Use pack", body: "Applied pack (demo)" })}>
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
                    <Btn tone="neutral" onClick={() => setToast({ title: "Open", body: "Open collection (demo)" })}>
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
        subtitle="Upload or link media, then submit for review. Supplier uploads go to Admin review by default (demo)."
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
