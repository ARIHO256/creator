"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Info,
  Layers,
  Link2,
  Package,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  Upload,
  Video as VideoIcon,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { creatorApi, type AssetRecord, type MediaAssetRecord, type MediaWorkspaceResponse } from "../../lib/creatorApi";
import { readAuthSession } from "../../lib/authSession";

/**
 * Asset Library (Independent Premium Page)
 * - Aggregates assets from: Creator uploads, Supplier-provided, Catalog media
 * - Scopes by: Supplier -> Campaign (recommended)
 * - Creator chooses what to attach to dealz (shoppable or live)
 * - "+ Add Content" opens a premium submission drawer with Submit for Review flow
 * - Includes copyright & licensing safeguards
 *
 * Notes:
 * - This is a self-contained UI demo. Hook up data + uploads + review workflow to your backend.
 */

type MediaType = "video" | "image" | "template" | "script" | "overlay" | "link" | "doc";
type AssetSource = "creator" | "supplier" | "catalog";
type ReviewStatus = "draft" | "pending_supplier" | "pending_admin" | "approved" | "changes_requested" | "rejected";

// Product Catalog canonical hero size (selected from your supported sizes list)
// Used as: default hero poster size in builders + required size for "Hero image" uploads.
const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 } as const;

// Featured item poster size (selected from your supported sizes list)
// Used as: default poster for featured products/services in Ad Builder & Live Builder.
// This keeps play icons + overlays positioned consistently across devices.
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 } as const;

type Creator = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
};

type Supplier = {
  id: string;
  name: string;
  kind: "Seller" | "Provider";
  brand?: string;
};

type Campaign = {
  id: string;
  supplierId: string;
  name: string;
  brand: string;
  status: "Active" | "Paused";
};

type Deliverable = {
  id: string;
  campaignId: string;
  label: string;
  dueDateLabel: string;
};

type Asset = {
  id: string;
  creatorScope: "all" | string; // which creator library this asset is visible in
  title: string;
  subtitle?: string; // e.g. "Autumn Beauty Flash · GlowUp Hub"
  campaignId?: string;
  supplierId?: string;
  brand?: string;
  tags: string[];
  mediaType: MediaType;
  source: AssetSource;
  ownerLabel: string; // "Owner: Creator" etc
  status: ReviewStatus;
  lastUpdatedLabel: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  previewKind?: "image" | "video";
  /** Optional intrinsic dimensions (used for hero size validation + better previews) */
  dimensions?: { width: number; height: number };
  role?: "opener" | "hero" | "offer" | "item_poster" | "item_video" | "lower_third" | "overlay" | "script";
  usageNotes?: string;
  restrictions?: string;
  /** Viewer hints for downstream builders (demo) */
  desktopMode?: "fullscreen" | "modal";
  aspect?: "vertical" | "horizontal";
  // Optional deal linkage
  relatedDealId?: string;
};

type SmartPack = {
  id: string;
  name: string;
  campaignId: string;
  brand: string;
  items: { title: string; assetId: string }[];
  autoGrouped?: boolean;
};

type SubmitDraft = {
  campaignId: string;
  deliverableId: string;
  title: string;
  caption: string;
  notes: string;
  tagsCsv: string;
  mediaType: MediaType;
  /** Optional placement/role — used for downstream builders + validations */
  role: "" | "opener" | "hero" | "offer" | "item_poster" | "item_video" | "lower_third" | "overlay" | "script";
  /** Only required when role=hero & mediaType=image, and we cannot auto-validate size */
  heroSizeConfirmed: boolean;
  /** Only required when role=item_poster & mediaType=image, and we cannot auto-validate size */
  itemPosterSizeConfirmed: boolean;
  linkUrl: string;
  files: File[];
  fromCamera: boolean;
  rightsConfirmed: boolean;
  noCopyrightedMusicConfirmed: boolean;
  disclosureConfirmed: boolean;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function formatShortTimeAgo(dateLike: string | null | undefined) {
  const value = typeof dateLike === "string" ? dateLike : "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Last updated: recently";
  return `Last updated: ${parsed.toLocaleDateString()}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function replaceFileExtension(fileName: string, nextExt: string) {
  const base = fileName.includes(".") ? fileName.slice(0, fileName.lastIndexOf(".")) : fileName;
  return `${base}.${nextExt}`;
}

function isImageLikeFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(file.name || "");
}

function readImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image file"));
    };
    image.src = objectUrl;
  });
}

async function normalizeImageForRequiredSize(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<{ name: string; dataUrl: string; mimeType: string; sizeBytes: number; extension: string }> {
  const image = await readImageFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available for image processing");

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = Math.round(sourceHeight * targetRatio);
    sx = Math.max(0, Math.floor((sourceWidth - sw) / 2));
  } else if (sourceRatio < targetRatio) {
    sh = Math.round(sourceWidth / targetRatio);
    sy = Math.max(0, Math.floor((sourceHeight - sh) / 2));
  }

  context.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  const outputMime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const outputExt = outputMime === "image/png" ? "png" : "jpg";
  const dataUrl = outputMime === "image/png"
    ? canvas.toDataURL(outputMime)
    : canvas.toDataURL(outputMime, 0.92);

  return {
    name: replaceFileExtension(file.name || "image", outputExt),
    dataUrl,
    mimeType: outputMime,
    sizeBytes: dataUrlBytes(dataUrl),
    extension: outputExt,
  };
}

function mediaTypeFromPayload(kindRaw: unknown, mimeRaw: unknown, metadataTypeRaw: unknown): MediaType {
  const metadataType = toStringValue(metadataTypeRaw, "").toLowerCase();
  if (metadataType === "video" || metadataType === "image" || metadataType === "template" || metadataType === "script" || metadataType === "overlay" || metadataType === "link" || metadataType === "doc") {
    return metadataType;
  }

  const kind = toStringValue(kindRaw, "").toLowerCase();
  const mime = toStringValue(mimeRaw, "").toLowerCase();
  if (kind.includes("video") || mime.startsWith("video/")) return "video";
  if (kind.includes("overlay")) return "overlay";
  if (kind.includes("script")) return "script";
  if (kind.includes("template")) return "template";
  if (kind.includes("link")) return "link";
  if (
    mime === "application/pdf" ||
    mime.includes("word") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.startsWith("text/")
  ) {
    return "doc";
  }
  if (kind.includes("doc")) return "doc";
  return "image";
}

function reviewStatusFromPayload(raw: unknown): ReviewStatus {
  const value = toStringValue(raw, "").toLowerCase();
  if (value === "approved") return "approved";
  if (value === "pending_supplier") return "pending_supplier";
  if (value === "pending_admin" || value === "pending" || value === "submitted" || value === "in_review") return "pending_admin";
  if (value === "changes_requested" || value === "needs_changes") return "changes_requested";
  if (value === "rejected") return "rejected";
  return "draft";
}

function sourceFromPayload(raw: unknown): AssetSource {
  const value = toStringValue(raw, "").toLowerCase();
  if (value === "supplier") return "supplier";
  if (value === "catalog") return "catalog";
  return "creator";
}

function collectionStatusMeta(statusRaw: string) {
  const status = statusRaw.toLowerCase();
  if (status === "ready" || status === "approved" || status === "published" || status === "active") {
    return {
      label: "Ready",
      className:
        "inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-700",
    };
  }
  return {
    label: "Needs review",
    className:
      "inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/30 px-2 py-1 text-xs text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700",
  };
}


function statusLabel(s: ReviewStatus) {
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
  }
}

function statusStyles(s: ReviewStatus) {
  switch (s) {
    case "approved":
      return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-700";
    case "pending_supplier":
    case "pending_admin":
      return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-700";
    case "changes_requested":
      return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-700";
    case "rejected":
      return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700";
    case "draft":
    default:
      return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700";
  }
}

function mediaLabel(mt: MediaType) {
  switch (mt) {
    case "video":
      return "Video";
    case "image":
      return "Image";
    case "template":
      return "Template";
    case "script":
      return "Script";
    case "overlay":
      return "Overlay";
    case "link":
      return "Link";
    case "doc":
      return "Doc";
  }
}

function mediaIcon(mt: MediaType, className?: string) {
  const cls = className ?? "h-4 w-4";
  switch (mt) {
    case "video":
      return <VideoIcon className={cls} />;
    case "image":
      return <ImageIcon className={cls} />;
    case "script":
    case "doc":
      return <ClipboardCheck className={cls} />;
    case "overlay":
      return <Layers className={cls} />;
    case "template":
      return <Sparkles className={cls} />;
    case "link":
      return <Link2 className={cls} />;
    default:
      return <Package className={cls} />;
  }
}

function isDisclosurePresent(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("#ad") ||
    t.includes("#sponsored") ||
    t.includes("paid partnership") ||
    t.includes("advertisement") ||
    t.includes("sponsored")
  );
}

function safeCopy(text: string) {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type PickerParams = {
  dealId?: string;
  mode?: string;
  target?: string;
  returnTo?: string;
  applyTo?: string;
  supplierId?: string;
  campaignId?: string;
  supplierName?: string;
  supplierKind?: string;
  supplierBrand?: string;
  campaignName?: string;
  campaignBrand?: string;
};

function useQueryParams() {
  const [params, setParams] = useState<PickerParams>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const dealId = sp.get("dealId") || undefined;
    const mode = sp.get("mode") || undefined; // e.g. "picker"
    const target = sp.get("target") || undefined; // e.g. "shoppable" | "live"
    const returnTo = sp.get("returnTo") || undefined;
    const applyTo = sp.get("applyTo") || undefined;
    const supplierId = sp.get("supplierId") || undefined;
    const campaignId = sp.get("campaignId") || undefined;
    const supplierName = sp.get("supplierName") || undefined;
    const supplierKind = sp.get("supplierKind") || undefined;
    const supplierBrand = sp.get("supplierBrand") || undefined;
    const campaignName = sp.get("campaignName") || undefined;
    const campaignBrand = sp.get("campaignBrand") || undefined;
    setParams({
      dealId,
      mode,
      target,
      returnTo,
      applyTo,
      supplierId,
      campaignId,
      supplierName,
      supplierKind,
      supplierBrand,
      campaignName,
      campaignBrand,
    });
  }, []);

  return params;
}

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "fixed inset-0 z-[80] transition",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cx(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute right-0 top-0 h-full w-full max-w-[560px] bg-white dark:bg-slate-900 shadow-2xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{title}</div>
                {subtitle ? <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">{subtitle}</div> : null}
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-5 py-4">{children}</div>

          {footer ? <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  widthClass = "max-w-xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}) {
  return (
    <div
      className={cx(
        "fixed inset-0 z-[90] transition",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cx(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cx(
          "absolute left-1/2 top-1/2 w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl transition",
          widthClass,
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div className="text-base font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{title}</div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReviewStatus }) {
  const icon =
    status === "approved" ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : (status === "pending_supplier" || status === "pending_admin") ? (
      <AlertTriangle className="h-4 w-4" />
    ) : status === "changes_requested" ? (
      <Info className="h-4 w-4" />
    ) : status === "rejected" ? (
      <XCircle className="h-4 w-4" />
    ) : (
      <Pencil className="h-4 w-4" />
    );

  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs", statusStyles(status))}>
      {icon}
      {statusLabel(status)}
    </span>
  );
}

function SourcePill({ source }: { source: AssetSource }) {
  const label = source === "creator" ? "Creator" : source === "supplier" ? "Supplier" : "Catalog";
  const style =
    source === "creator"
      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-500"
      : source === "supplier"
        ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-500"
        : "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-500";
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs", style)}>{label}</span>;
}

function MediaTypePill({ mediaType }: { mediaType: MediaType }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
      {mediaIcon(mediaType, "h-3.5 w-3.5")}
      {mediaLabel(mediaType)}
    </span>
  );
}

function CopyrightSafetyCallout() {
  return (
    <div className="rounded-xl border transition-colors border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
        <div>
          <div className="font-medium">Copyright & licensing reminder</div>
          <div className="mt-1 text-amber-800 dark:text-amber-300">
            Only upload content you own or have rights to use (including music, images, and brand assets). Avoid
            copyrighted audio unless you have a valid license. Keep proof of permission for brand review.
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyAssetPreview() {
  return (
    <div className="grid h-[220px] place-items-center rounded-xl border transition-colors border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-500 dark:text-slate-400">
      Preview space (image / video / template)
    </div>
  );
}

function PreviewPane({
  asset,
  smartPacks,
  onUseInShoppable,
  onUseInLive,
  onAttachToDeal,
  showPickerActions,
}: {
  asset: Asset | null;
  smartPacks: SmartPack[];
  onUseInShoppable: () => void;
  onUseInLive: () => void;
  onAttachToDeal: () => void;
  showPickerActions: boolean;
}) {
  if (!asset) {
    return (
      <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
        <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Preview</div>
        <div className="mt-3">{emptyAssetPreview()}</div>
        <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
          Select an asset to see its preview, usage notes, restrictions, and packs.
        </div>
      </div>
    );
  }

  const preview =
    asset.previewKind === "video" && asset.previewUrl ? (
      <video
        className="h-[220px] w-full rounded-xl bg-black object-cover"
        controls
        playsInline
        preload="metadata"
        src={asset.previewUrl}
      />
    ) : asset.previewUrl ? (
      <img className="h-[220px] w-full rounded-xl bg-slate-100 object-cover" src={asset.previewUrl} alt={asset.title} />
    ) : (
      emptyAssetPreview()
    );

  const pack = smartPacks.find((p) => p.campaignId === asset.campaignId);

  return (
    <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{asset.title}</div>
          {asset.subtitle ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">{asset.subtitle}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <StatusPill status={asset.status} />
          <MediaTypePill mediaType={asset.mediaType} />
          <SourcePill source={asset.source} />
        </div>
      </div>

      <div className="mt-3">{preview}</div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Owner</div>
          <div className="mt-1 text-slate-900 dark:text-slate-50">{asset.ownerLabel.replace("Owner: ", "")}</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Last updated</div>
          <div className="mt-1 text-slate-900 dark:text-slate-50">{asset.lastUpdatedLabel}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {asset.tags.slice(0, 10).map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-600"
          >
            <Tag className="h-3 w-3 text-slate-400" />
            {t}
          </span>
        ))}
        {asset.tags.length > 10 ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-600">
            +{asset.tags.length - 10}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border transition-colors bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Usage notes</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{asset.usageNotes || "—"}</div>
        </div>
        <div className="rounded-xl border transition-colors bg-white dark:bg-slate-900 p-3">
          <div className="text-xs font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Restrictions</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{asset.restrictions || "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => asset.previewUrl && safeCopy(asset.previewUrl)}
          title="Copy preview URL"
        >
          <Copy className="h-4 w-4" />
          Copy link
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => { }}
          title="Download (demo)"
        >
          <Download className="h-4 w-4" />
          Download
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {showPickerActions ? (
            <>
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                  asset.status === "approved"
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-100 text-slate-500 dark:text-slate-300"
                )}
                onClick={onAttachToDeal}
                disabled={asset.status !== "approved"}
                title={asset.status !== "approved" ? "Only approved assets can be attached" : "Attach to deal"}
              >
                <ArrowRight className="h-4 w-4" />
                Attach to deal
              </button>
            </>
          ) : (
            <>
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                  asset.status === "approved"
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-100 text-slate-500 dark:text-slate-300"
                )}
                onClick={onUseInShoppable}
                disabled={asset.status !== "approved"}
                title={asset.status !== "approved" ? "Only approved assets can be used in builders" : "Use in Shoppable Adz"}
              >
                <Zap className="h-4 w-4" />
                Use in Adz
              </button>
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
                  asset.status === "approved"
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-orange-100 text-orange-400"
                )}
                onClick={onUseInLive}
                disabled={asset.status !== "approved"}
                title={asset.status !== "approved" ? "Only approved assets can be used in builders" : "Use in Live Builder"}
              >
                <Play className="h-4 w-4" />
                Use in Live
              </button>
            </>
          )}
        </div>
      </div>

      {pack ? (
        <div className="mt-5 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Smart bundle: {pack.name}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                Campaign: <span className="font-medium text-slate-700 dark:text-slate-100">{pack.brand}</span>
              </div>
            </div>
            {pack.autoGrouped ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700 ring-1 ring-emerald-200">
                Auto-grouped
              </span>
            ) : null}
          </div>

          <div className="mt-3 space-y-2">
            {pack.items.map((it) => (
              <div key={it.assetId} className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm">
                <Package className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                <div className="text-slate-800 dark:text-slate-200">{it.title}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-300">
              You can still tweak this pack inside Live Builder or Ad Builder before publishing.
            </div>
            <button className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 sm:px-4 md:px-6 lg:px-8 py-2 text-sm font-semibold dark:font-bold text-white hover:bg-orange-700">
              Add this pack
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusTimeline({ status, autoApprove }: { status: ReviewStatus; autoApprove: boolean }) {
  const steps = [
    { id: "submitted", label: "Submitted", done: status !== "draft" },
    ...(autoApprove ? [] : [{ id: "pending_supplier", label: "Supplier Review", done: status === "pending_admin" || status === "approved" || status === "changes_requested" || status === "rejected", active: status === "pending_supplier" }]),
    { id: "pending_admin", label: "Admin Review", done: status === "approved" || status === "changes_requested" || status === "rejected", active: status === "pending_admin" },
    { id: "resolved", label: status === "changes_requested" ? "Changes Requested" : status === "rejected" ? "Rejected" : "Approved", done: status === "approved" || status === "changes_requested" || status === "rejected", active: status === "approved" || status === "changes_requested" || status === "rejected", color: status === "approved" ? "emerald" : status === "changes_requested" ? "rose" : status === "rejected" ? "zinc" : "emerald" },
  ];

  return (
    <div className="mt-6 mb-4">
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0" />
        {steps.map((s, i) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-1.5">
            <div className={cx(
              "h-5 w-5 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
              s.done ? "bg-emerald-500 border-emerald-500 text-white" : s.active ? "bg-white dark:bg-slate-900 border-amber-500 text-amber-500" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400"
            )}>
              {s.done ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
            </div>
            <div className={cx(
              "text-[10px] font-bold uppercase tracking-tight whitespace-nowrap",
              s.active ? "text-amber-600 dark:text-amber-400" : s.done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
            )}>
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
  onSetStatus,
  isAdminMode,
  autoApprove,
}: {
  status: ReviewStatus;
  onSetStatus: (s: ReviewStatus) => void;
  isAdminMode: boolean;
  autoApprove: boolean;
}) {
  const message =
    status === "pending_supplier"
      ? "Waiting for Supplier to approve this submission before it goes to Admin review."
      : status === "pending_admin"
        ? "Supplier has approved (or auto-approved). Final Admin review in progress."
        : status === "approved"
          ? "Approved and available to use in builders."
          : status === "changes_requested"
            ? "Reviewer requested changes. Update the submission and resubmit."
            : status === "draft"
              ? "Draft is private to you until you submit."
              : "Rejected. Please check feedback and resubmit.";

  return (
    <div className="rounded-2xl border transition-colors border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-400" />
          <div>
            <div className="font-semibold dark:font-bold text-amber-900 dark:text-amber-200">Review status: {statusLabel(status)}</div>
            <div className="mt-1 text-sm text-amber-800 dark:text-amber-300">{message}</div>
          </div>
        </div>

        <StatusTimeline status={status} autoApprove={autoApprove} />

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
          <div className="text-xs font-semibold text-amber-900/80 dark:text-amber-300/80">Reviewer actions:</div>

          {status === "pending_supplier" && (
            <>
              <button
                className="bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-700 hover:bg-emerald-50 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                onClick={() => onSetStatus("pending_admin")}
                title="Supplier Approve -> Move to Admin"
              >
                Supplier: Approve
              </button>
              <button
                className="bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-700 hover:bg-rose-50 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                onClick={() => onSetStatus("changes_requested")}
                title="Supplier Disapprove -> Changes Requested"
              >
                Supplier: Disapprove
              </button>
            </>
          )}

          {(status === "pending_admin" || (autoApprove && status === "pending_supplier")) && (
            <>
              <button
                className="bg-emerald-600 text-white rounded-full px-3 py-1 text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                onClick={() => isAdminMode && onSetStatus("approved")}
                disabled={!isAdminMode}
                title={!isAdminMode ? "Admin only" : "Admin: Complete Approval"}
              >
                Admin: Approve
              </button>
              <button
                className="bg-rose-600 text-white rounded-full px-3 py-1 text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
                onClick={() => isAdminMode && onSetStatus("changes_requested")}
                disabled={!isAdminMode}
                title={!isAdminMode ? "Admin only" : "Admin: Request Changes"}
              >
                Admin: Request Changes
              </button>
            </>
          )}

          {!["pending_supplier", "pending_admin", "approved", "changes_requested", "rejected"].includes(status) && (
            <div className="text-xs text-amber-700 italic">No available actions for current status.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dropzone({
  onFiles,
  helper,
  accept,
  multiple = true,
  cameraMode = false,
}: {
  onFiles: (files: File[], fromCamera?: boolean) => void;
  helper?: string;
  accept: string;
  multiple?: boolean;
  cameraMode?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="rounded-2xl border transition-colors border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Upload file(s)</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Drag & drop your video, image or doc here or click to choose.</div>
          {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">{helper}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Choose files
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Camera className="h-4 w-4" />
            Camera
            {/* camera capture on mobile */}
            <input
              className="hidden"
              type="file"
              accept={accept}
              multiple={false}
              capture={cameraMode ? "environment" : undefined}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) onFiles(files, true);
              }}
            />
          </label>

          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) onFiles(files, false);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MiniChart({ points, height = 54 }: { points: number[]; height?: number }) {
  // lightweight sparkline SVG
  const w = 220;
  const h = height;
  const pad = 6;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);

  const d = points
    .map((p, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
      const y = pad + (h - pad * 2) * (1 - (p - min) / range);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
    </svg>
  );
}

function creatorFromSession(): Creator | null {
  const session = readAuthSession();
  if (!session) return null;
  const raw = session as Record<string, unknown>;
  const id = toStringValue(raw.id, "").trim();
  const name = toStringValue(raw.name, "").trim();
  const handleRaw = toStringValue(raw.handle, "").trim();
  const handle = handleRaw ? (handleRaw.startsWith("@") ? handleRaw : `@${handleRaw}`) : "";
  const avatarUrl = toStringValue(raw.avatarUrl, "").trim();
  if (!id && !name && !handle) return null;
  return {
    id,
    name,
    handle,
    avatarUrl,
  };
}

function normalizeCreatorRow(row: unknown): Creator | null {
  const record = toRecord(row);
  if (!record) return null;
  const id = toStringValue(record.id, "").trim();
  const name = toStringValue(record.name, "").trim();
  if (!id || !name) return null;
  const handle = toStringValue(record.handle, "").trim();
  return {
    id,
    name,
    handle: handle.startsWith("@") ? handle : `@${handle}`,
    avatarUrl: toStringValue(record.avatarUrl, ""),
  };
}

function normalizeSupplierRow(row: unknown): Supplier | null {
  const record = toRecord(row);
  if (!record) return null;
  const id = toStringValue(record.id, "").trim();
  const name = toStringValue(record.name, "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    kind: /^provider$/i.test(toStringValue(record.kind, "")) ? "Provider" : "Seller",
    brand: toStringValue(record.brand, name),
  };
}

function normalizeCampaignRow(row: unknown): Campaign | null {
  const record = toRecord(row);
  if (!record) return null;
  const id = toStringValue(record.id, "").trim();
  const supplierId = toStringValue(record.supplierId, "").trim();
  const name = toStringValue(record.name, "").trim();
  if (!id || !supplierId || !name) return null;
  return {
    id,
    supplierId,
    name,
    brand: toStringValue(record.brand, ""),
    status: /^paused$/i.test(toStringValue(record.status, "")) ? "Paused" : "Active",
  };
}

function normalizeDeliverableRow(row: unknown): Deliverable | null {
  const record = toRecord(row);
  if (!record) return null;
  const id = toStringValue(record.id, "").trim();
  const campaignId = toStringValue(record.campaignId, "").trim();
  const label = toStringValue(record.label, "").trim();
  if (!id || !campaignId || !label) return null;
  return {
    id,
    campaignId,
    label,
    dueDateLabel: toStringValue(record.dueDateLabel, ""),
  };
}

function normalizeMediaAsset(row: MediaAssetRecord): Asset {
  const metadata = toRecord(row.metadata) ?? {};
  const mediaType = mediaTypeFromPayload(row.kind, row.mimeType, metadata.mediaType);
  const source = sourceFromPayload(metadata.source);
  const status = reviewStatusFromPayload(metadata.status);
  const role = toStringValue(metadata.role, "");
  const dimensions = toRecord(metadata.dimensions);
  const width = dimensions ? toNumberValue(dimensions.width, 0) : 0;
  const height = dimensions ? toNumberValue(dimensions.height, 0) : 0;

  return {
    id: row.id,
    creatorScope: toStringValue(metadata.creatorScope, "all"),
    title: toStringValue(metadata.title, row.name || ""),
    subtitle: toStringValue(metadata.subtitle, ""),
    campaignId: toStringValue(metadata.campaignId, ""),
    supplierId: toStringValue(metadata.supplierId, ""),
    brand: toStringValue(metadata.brand, ""),
    tags: toStringList(metadata.tags),
    mediaType,
    source,
    ownerLabel: toStringValue(
      metadata.ownerLabel,
      source === "creator" ? "Owner: Creator" : source === "supplier" ? "Owner: Supplier" : "Owner: Platform",
    ),
    status,
    lastUpdatedLabel: formatShortTimeAgo(toStringValue(row.updatedAt, toStringValue(row.createdAt, ""))),
    thumbnailUrl: toStringValue(metadata.thumbnailUrl, toStringValue(row.url, "")),
    previewUrl: toStringValue(metadata.previewUrl, toStringValue(row.url, "")),
    previewKind: toStringValue(metadata.previewKind, "") === "video" || mediaType === "video" ? "video" : "image",
    dimensions: width > 0 && height > 0 ? { width, height } : undefined,
    role: role ? (role as Asset["role"]) : undefined,
    usageNotes: toStringValue(metadata.usageNotes, ""),
    restrictions: toStringValue(metadata.restrictions, ""),
    desktopMode: toStringValue(metadata.desktopMode, "") === "fullscreen" ? "fullscreen" : "modal",
    aspect: toStringValue(metadata.aspect, "") === "horizontal" ? "horizontal" : "vertical",
    relatedDealId: toStringValue(metadata.relatedDealId, ""),
  };
}

function normalizeCollabAsset(row: AssetRecord): Asset {
  const metadata = toRecord(row.metadata) ?? {};
  const mediaType = mediaTypeFromPayload(row.assetType, row.mimeType, metadata.mediaType);
  const source = sourceFromPayload(metadata.source || "supplier");
  const status = reviewStatusFromPayload(metadata.status || row.status);
  const role = toStringValue(metadata.role, "");

  return {
    id: row.id,
    creatorScope: "all",
    title: toStringValue(metadata.title, toStringValue(row.title, "")),
    subtitle: toStringValue(metadata.subtitle, ""),
    campaignId: toStringValue(row.campaignId, toStringValue(metadata.campaignId, "")),
    supplierId: toStringValue(metadata.supplierId, ""),
    brand: toStringValue(metadata.brand, ""),
    tags: toStringList(metadata.tags),
    mediaType,
    source,
    ownerLabel: toStringValue(metadata.ownerLabel, source === "supplier" ? "Owner: Supplier" : "Owner: Platform"),
    status,
    lastUpdatedLabel: formatShortTimeAgo(toStringValue(row.updatedAt, toStringValue(row.createdAt, ""))),
    thumbnailUrl: toStringValue(metadata.thumbnailUrl, toStringValue(row.url, "")),
    previewUrl: toStringValue(metadata.previewUrl, toStringValue(row.url, "")),
    previewKind: toStringValue(metadata.previewKind, "") === "video" || mediaType === "video" ? "video" : "image",
    role: role ? (role as Asset["role"]) : undefined,
    usageNotes: toStringValue(metadata.usageNotes, ""),
    restrictions: toStringValue(metadata.restrictions, ""),
    desktopMode: toStringValue(metadata.desktopMode, "") === "fullscreen" ? "fullscreen" : "modal",
    aspect: toStringValue(metadata.aspect, "") === "horizontal" ? "horizontal" : "vertical",
    relatedDealId: toStringValue(metadata.relatedDealId, ""),
  };
}



export default function AssetLibraryPage() {
  const {
    dealId,
    mode,
    target,
    returnTo,
    applyTo,
    supplierId: pickerSupplierId,
    campaignId: pickerCampaignId,
    supplierName: pickerSupplierName,
    supplierKind: pickerSupplierKind,
    supplierBrand: pickerSupplierBrand,
    campaignName: pickerCampaignName,
    campaignBrand: pickerCampaignBrand,
  } = useQueryParams();
  const pickerMode = mode === "picker"; // when launched from builder to pick assets for a specific deal
  const pickerTarget = target === "live" ? "live" : target === "shoppable" ? "shoppable" : "shoppable";



  // ------ State ------
  const [assets, setAssets] = useState<Asset[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [smartPacks, setSmartPacks] = useState<SmartPack[]>([]);
  const [activityPoints, setActivityPoints] = useState<number[]>(Array.from({ length: 14 }, () => 0));
  const [activitySummary, setActivitySummary] = useState({ newCount: 0, approvedCount: 0, pendingCount: 0 });
  const [collectionSummary, setCollectionSummary] = useState({
    starterPack: { name: "", subtitle: "", assetCount: 0, status: "needs_review" },
    priceDropOverlays: { name: "", subtitle: "", assetCount: 0, status: "needs_review" },
  });
  const sessionCreator = useMemo(() => creatorFromSession(), []);
  const [selectedCreatorId, setSelectedCreatorId] = useState(sessionCreator?.id || "");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  const [search, setSearch] = useState("");
  const [filterMedia, setFilterMedia] = useState<MediaType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | "pending" | "all">("all");
  const [filterSource, setFilterSource] = useState<AssetSource | "all">("all");

  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);

  // Picker mini-step: choose where to apply the selected asset before returning to the builder.
  const [chooseApplyOpen, setChooseApplyOpen] = useState(false);
  const [chooseApplyValue, setChooseApplyValue] = useState<string>("");
  const [pendingPickAssetId, setPendingPickAssetId] = useState<string | null>(null);

  // Demo admin mode toggle (to show status updates in the drawer)
  const [adminMode, setAdminMode] = useState(false);
  const [supplierAutoApprove, setSupplierAutoApprove] = useState(false);
  const [viewSide, setViewSide] = useState<"creator" | "supplier">("creator");

  // Submission draft state
  const [submitStatus, setSubmitStatus] = useState<ReviewStatus>("draft");
  const [submitDraft, setSubmitDraft] = useState<SubmitDraft>({
    campaignId: "",
    deliverableId: "",
    title: "",
    caption: "",
    notes: "",
    tagsCsv: "",
    mediaType: "video",
    role: "hero",
    heroSizeConfirmed: false,
    itemPosterSizeConfirmed: false,
    linkUrl: "",
    files: [],
    fromCamera: false,
    rightsConfirmed: false,
    noCopyrightedMusicConfirmed: false,
    disclosureConfirmed: false,
  });

  // When submitting an image, we can detect pixel size for validations (e.g., Hero image requirement).
  const [submitImageMeta, setSubmitImageMeta] = useState<{ width: number; height: number } | null>(null);

  // Keep submit draft in sync with selected campaign (sensible default)
  useEffect(() => {
    setSubmitDraft((d) => ({
      ...d,
      campaignId: selectedCampaignId,
      deliverableId: deliverables.find((x) => x.campaignId === selectedCampaignId)?.id ?? d.deliverableId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  const pickerSupplierFallback = useMemo<Supplier | null>(() => {
    if (!pickerMode) return null;
    if (!pickerSupplierId) return null;
    const kind = /^provider$/i.test(pickerSupplierKind || "") ? "Provider" : "Seller";
    const name = pickerSupplierName || "";
    return {
      id: pickerSupplierId,
      name,
      kind,
      brand: pickerSupplierBrand || name,
    };
  }, [pickerMode, pickerSupplierBrand, pickerSupplierId, pickerSupplierKind, pickerSupplierName]);

  const pickerCampaignFallback = useMemo<Campaign | null>(() => {
    if (!pickerMode) return null;
    if (!pickerCampaignId) return null;
    const fallbackSupplierId = pickerSupplierId || "";
    if (!fallbackSupplierId) return null;
    return {
      id: pickerCampaignId,
      supplierId: fallbackSupplierId,
      name: pickerCampaignName || "",
      brand: pickerCampaignBrand || pickerSupplierBrand || pickerSupplierFallback?.brand || "",
      status: "Active",
    };
  }, [
    pickerMode,
    pickerCampaignBrand,
    pickerCampaignId,
    pickerCampaignName,
    pickerSupplierBrand,
    pickerSupplierFallback,
    pickerSupplierId,
  ]);

  const campaignsForSupplier = useMemo(() => {
    const base = campaigns.filter((campaign) => campaign.supplierId === selectedSupplierId);
    if (!pickerMode || !pickerCampaignFallback) return base;
    if (selectedSupplierId !== pickerCampaignFallback.supplierId) return base;
    if (base.some((campaign) => campaign.id === pickerCampaignFallback.id)) return base;
    return [pickerCampaignFallback, ...base];
  }, [campaigns, pickerCampaignFallback, pickerMode, selectedSupplierId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deliverablesForCampaign = useMemo(() => deliverables.filter((d) => d.campaignId === selectedCampaignId), [deliverables, selectedCampaignId]);

  const loadLibraryFromBackend = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const [workspaceRaw, mediaAssetsRaw, collabAssetsRaw] = await Promise.all([
        creatorApi.mediaWorkspace(),
        creatorApi.mediaAssets(),
        creatorApi.assets(),
      ]);

      const workspace = toRecord(workspaceRaw as MediaWorkspaceResponse) ?? {};
      const nextCreators = toArray(workspace.creators)
        .map((row) => normalizeCreatorRow(row))
        .filter((row): row is Creator => Boolean(row));
      const nextSuppliers = toArray(workspace.suppliers)
        .map((row) => normalizeSupplierRow(row))
        .filter((row): row is Supplier => Boolean(row));
      const nextCampaigns = toArray(workspace.campaigns)
        .map((row) => normalizeCampaignRow(row))
        .filter((row): row is Campaign => Boolean(row));
      const nextDeliverables = toArray(workspace.deliverables)
        .map((row) => normalizeDeliverableRow(row))
        .filter((row): row is Deliverable => Boolean(row));

      const mediaAssets = Array.isArray(mediaAssetsRaw)
        ? mediaAssetsRaw.map((row) => normalizeMediaAsset(row as MediaAssetRecord))
        : [];
      const collabAssets = Array.isArray(collabAssetsRaw)
        ? collabAssetsRaw.map((row) => normalizeCollabAsset(row as AssetRecord))
        : [];
      const mergedAssets = Array.from(
        new Map([...mediaAssets, ...collabAssets].map((asset) => [asset.id, asset])).values(),
      ).sort((left, right) => right.id.localeCompare(left.id));

      const collections = toRecord(workspace.collections) ?? {};
      const starterPack = toRecord(collections.starterPack) ?? {};
      const priceDropOverlays = toRecord(collections.priceDropOverlays) ?? {};
      const workspaceActivity = toRecord(workspace.activity) ?? {};
      const points = toArray(workspaceActivity.points)
        .map((point) => Number(point))
        .filter((point) => Number.isFinite(point));

      const groupedByCampaign = new Map<string, Asset[]>();
      mergedAssets.forEach((asset) => {
        if (!asset.campaignId || asset.status !== "approved") return;
        const current = groupedByCampaign.get(asset.campaignId) || [];
        current.push(asset);
        groupedByCampaign.set(asset.campaignId, current);
      });
      const nextSmartPacks: SmartPack[] = Array.from(groupedByCampaign.entries())
        .map(([campaignId, campaignAssets]) => {
          const campaign = nextCampaigns.find((entry) => entry.id === campaignId);
          return {
            id: `sp-${campaignId}`,
            name: "Show pack",
            campaignId,
            brand: campaign?.name || "",
            autoGrouped: true,
            items: campaignAssets.slice(0, 5).map((asset) => ({
              title: asset.title,
              assetId: asset.id,
            })),
          } satisfies SmartPack;
        })
        .filter((pack) => pack.items.length > 0);

      setCreators(nextCreators);
      setSuppliers(nextSuppliers);
      setCampaigns(nextCampaigns);
      setDeliverables(nextDeliverables);
      setAssets(mergedAssets);
      setSmartPacks(nextSmartPacks);
      setActivityPoints(points.length ? points : Array.from({ length: 14 }, () => 0));
      setActivitySummary({
        newCount: Math.max(0, toNumberValue(workspaceActivity.newCount, 0)),
        approvedCount: Math.max(0, toNumberValue(workspaceActivity.approvedCount, 0)),
        pendingCount: Math.max(0, toNumberValue(workspaceActivity.pendingCount, 0)),
      });
      setCollectionSummary({
        starterPack: {
          name: toStringValue(starterPack.name, ""),
          subtitle: toStringValue(starterPack.subtitle, ""),
          assetCount: Math.max(0, toNumberValue(starterPack.assetCount, 0)),
          status: toStringValue(starterPack.status, "needs_review"),
        },
        priceDropOverlays: {
          name: toStringValue(priceDropOverlays.name, ""),
          subtitle: toStringValue(priceDropOverlays.subtitle, ""),
          assetCount: Math.max(0, toNumberValue(priceDropOverlays.assetCount, 0)),
          status: toStringValue(priceDropOverlays.status, "needs_review"),
        },
      });

      setSelectedCreatorId((prev) => {
        if (prev && nextCreators.some((c) => c.id === prev)) return prev;
        if (sessionCreator?.id && nextCreators.some((c) => c.id === sessionCreator.id)) return sessionCreator.id;
        return sessionCreator?.id || "";
      });
      setSelectedSupplierId((prev) => {
        if (prev && nextSuppliers.some((p) => p.id === prev)) return prev;
        if (pickerSupplierId && nextSuppliers.some((p) => p.id === pickerSupplierId)) return pickerSupplierId;
        return "";
      });
      setSelectedCampaignId((prev) => {
        if (prev && nextCampaigns.some((c) => c.id === prev)) return prev;
        if (pickerCampaignId && nextCampaigns.some((c) => c.id === pickerCampaignId)) return pickerCampaignId;
        return "";
      });
      setActiveAssetId((prev) => (prev && mergedAssets.some((asset) => asset.id === prev) ? prev : null));
    } catch (error) {
      setToast({
        title: "Failed to load asset library",
        body: error instanceof Error ? error.message : "Could not fetch library data from backend.",
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [pickerCampaignId, pickerSupplierId, sessionCreator]);

  useEffect(() => {
    void loadLibraryFromBackend();
  }, [loadLibraryFromBackend]);

  useEffect(() => {
    if (!pickerMode) return;
    const hasPickerSupplierContext = Boolean(pickerSupplierId || pickerSupplierName);
    const hasPickerCampaignContext = Boolean(pickerCampaignId || pickerCampaignName);
    if (!hasPickerSupplierContext && !hasPickerCampaignContext) return;

    const hasSuppliers = suppliers.length > 0;
    const hasCampaigns = campaigns.length > 0;
    if (!hasSuppliers && !hasCampaigns && !pickerSupplierFallback && !pickerCampaignFallback) return;

    if (pickerSupplierId) {
      const supplierMatch = suppliers.find((supplier) => supplier.id === pickerSupplierId);
      if (supplierMatch) {
        setSelectedSupplierId(pickerSupplierId);

        if (pickerCampaignId) {
          const campaignMatch = campaigns.find(
            (campaign) => campaign.id === pickerCampaignId && campaign.supplierId === pickerSupplierId,
          );
          if (campaignMatch) {
            setSelectedCampaignId(campaignMatch.id);
            return;
          }
        }
        return;
      }
    }

    if (pickerCampaignId) {
      const campaignMatch = campaigns.find((campaign) => campaign.id === pickerCampaignId);
      if (campaignMatch) {
        setSelectedSupplierId(campaignMatch.supplierId);
        setSelectedCampaignId(campaignMatch.id);
        return;
      }
    }

    if (pickerSupplierFallback) {
      setSelectedSupplierId((prev) => (prev === pickerSupplierFallback.id ? prev : pickerSupplierFallback.id));
    }

    if (pickerCampaignFallback) {
      setSelectedCampaignId((prev) => (prev === pickerCampaignFallback.id ? prev : pickerCampaignFallback.id));
    }
  }, [
    campaigns,
    pickerCampaignFallback,
    pickerCampaignId,
    pickerCampaignName,
    pickerMode,
    pickerSupplierFallback,
    pickerSupplierId,
    pickerSupplierName,
    suppliers,
  ]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets
      .filter((a) => (selectedCampaignId ? a.campaignId === selectedCampaignId : true))
      .filter((a) => {
        if (!pickerMode || !dealId) return true;
        if (a.source !== "creator") return true;
        return a.relatedDealId === dealId;
      })
      .filter((a) => a.creatorScope === "all" || a.creatorScope === selectedCreatorId)
      .filter((a) => (filterMedia === "all" ? true : a.mediaType === filterMedia))
      .filter((a) => {
        if (filterStatus === "all") return true;
        if (filterStatus === "pending") return a.status === "pending_admin" || a.status === "pending_supplier";
        return a.status === filterStatus;
      })
      .filter((a) => (filterSource === "all" ? true : a.source === filterSource))
      .filter((a) => {
        if (!q) return true;
        const hay = `${a.title} ${a.subtitle ?? ""} ${a.tags.join(" ")} ${a.ownerLabel} ${a.brand ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [assets, dealId, filterMedia, filterSource, filterStatus, pickerMode, search, selectedCampaignId, selectedCreatorId]);

  const activeAsset = useMemo(() => assets.find((a) => a.id === activeAssetId) ?? null, [assets, activeAssetId]);

  const selectedCreator = useMemo(
    () => creators.find((c) => c.id === selectedCreatorId) ?? sessionCreator ?? null,
    [creators, selectedCreatorId, sessionCreator],
  );
  const selectedSupplier = useMemo(
    () =>
      suppliers.find((p) => p.id === selectedSupplierId) ??
      (pickerSupplierFallback && pickerSupplierFallback.id === selectedSupplierId ? pickerSupplierFallback : null) ??
      pickerSupplierFallback ??
      { id: "", name: "", kind: "Seller" as const, brand: "" },
    [pickerSupplierFallback, selectedSupplierId, suppliers],
  );
  const supplierOptions = useMemo(() => {
    if (!pickerMode || !pickerSupplierFallback) return suppliers;
    const contextSupplier = suppliers.find((supplier) => supplier.id === pickerSupplierFallback.id) || pickerSupplierFallback;
    return contextSupplier ? [contextSupplier] : suppliers;
  }, [pickerMode, pickerSupplierFallback, suppliers]);
  const selectedCampaign = useMemo(() => campaigns.find((c) => c.id === selectedCampaignId) ?? null, [campaigns, selectedCampaignId]);

  // If supplier changes, clear campaign when it no longer belongs to the selected supplier.
  useEffect(() => {
    if (!selectedCampaignId) return;
    const selectedCampaignRecord = campaigns.find((campaign) => campaign.id === selectedCampaignId);
    if (!selectedCampaignRecord) {
      setSelectedCampaignId("");
      return;
    }
    if (selectedCampaignRecord.supplierId !== selectedSupplierId) {
      setSelectedCampaignId("");
    }
  }, [campaigns, selectedCampaignId, selectedSupplierId]);

  const submitRoleOptions = useMemo(() => {
    const mt = submitDraft.mediaType;
    if (mt === "video") {
      return [
        { value: "hero", label: "Hero intro video" },
        { value: "item_video", label: "Featured item video" },
        { value: "opener", label: "Opener" },
      ];
    }
    if (mt === "image") {
      return [
        { value: "hero", label: `Hero image (${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height})` },
        { value: "item_poster", label: `Featured item poster (${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height})` },
        { value: "overlay", label: "Overlay" },
        { value: "lower_third", label: "Lower third" },
        { value: "offer", label: "Offer graphic" },
      ];
    }
    if (mt === "overlay") {
      return [
        { value: "overlay", label: "Overlay" },
        { value: "lower_third", label: "Lower third" },
        { value: "offer", label: "Offer graphic" },
      ];
    }
    if (mt === "script") {
      return [{ value: "script", label: "Script" }];
    }
    // template, link, doc...
    return [{ value: "", label: "—" }];
  }, [submitDraft.mediaType]);

  // Keep role reasonable when media type changes.
  useEffect(() => {
    const allowed = new Set(submitRoleOptions.map((x) => x.value));
    if (!allowed.has(submitDraft.role)) {
      setSubmitDraft((d) => ({ ...d, role: "" as SubmitDraft["role"] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitRoleOptions]);

  function openAsset(assetId: string) {
    setActiveAssetId(assetId);
    // On mobile, show preview modal
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsMobilePreviewOpen(true);
    }
  }

  function readImageMeta(file: File) {
    return new Promise<{ width: number; height: number } | null>((resolve) => {
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

  async function handleSubmitFiles(files: File[], fromCamera?: boolean) {
    setSubmitDraft((d) => ({
      ...d,
      files,
      fromCamera: Boolean(fromCamera),
      heroSizeConfirmed: false,
      itemPosterSizeConfirmed: false,
    }));
    setSubmitImageMeta(null);

    const first = files[0];
    if (first && isImageLikeFile(first)) {
      const meta = await readImageMeta(first);
      setSubmitImageMeta(meta);
      // If the user is uploading a correctly sized hero image or item poster, auto-confirm.
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

  function resetSubmitDraft() {
    setSubmitStatus("draft");
    setSubmitImageMeta(null);
    setSubmitDraft({
      campaignId: selectedCampaignId,
      deliverableId: "",
      title: "",
      caption: "",
      notes: "",
      tagsCsv: "",
      mediaType: "video",
      role: "hero",
      heroSizeConfirmed: false,
      itemPosterSizeConfirmed: false,
      linkUrl: "",
      files: [],
      fromCamera: false,
      rightsConfirmed: false,
      noCopyrightedMusicConfirmed: false,
      disclosureConfirmed: false,
    });
  }

  async function submitForReview() {
    // Validate basics
    const missingRights = !submitDraft.rightsConfirmed || !submitDraft.noCopyrightedMusicConfirmed;
    const hasAnyMedia = submitDraft.mediaType === "link" ? Boolean(submitDraft.linkUrl.trim()) : submitDraft.files.length > 0;

    const isHeroImage = submitDraft.mediaType === "image" && submitDraft.role === "hero";
    const isItemPosterImage = submitDraft.mediaType === "image" && submitDraft.role === "item_poster";

    if (missingRights) {
      setToast({
        title: "Confirm rights & licensing",
        body: "Please confirm you own/have rights for this media and that any music is licensed.",
      });
      return;
    }
    if (!submitDraft.campaignId) {
      setToast({ title: "Select a campaign", body: "Choose the campaign this submission belongs to." });
      return;
    }
    if (!hasAnyMedia) {
      setToast({ title: "Add media", body: "Upload a file or provide an asset URL to submit for review." });
      return;
    }

    // Required: Hero images must be the canonical size. We can auto-check uploaded files.
    if (isHeroImage) {
      if (submitDraft.files.length > 0) {
        const hasNonImageFile = submitDraft.files.some((file) => !isImageLikeFile(file));
        if (hasNonImageFile) {
          setToast({
            title: "Image file required",
            body: "Hero image uploads must be image files.",
          });
          return;
        }
      } else {
        if (!submitDraft.heroSizeConfirmed) {
          setToast({
            title: "Confirm hero image size",
            body: `Hero images must be ${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height}px. Check the confirmation box to proceed.`,
          });
          return;
        }
      }
    }

    // Required: Featured item posters must be the canonical size (500×500).
    if (isItemPosterImage) {
      if (submitDraft.files.length > 0) {
        const hasNonImageFile = submitDraft.files.some((file) => !isImageLikeFile(file));
        if (hasNonImageFile) {
          setToast({
            title: "Image file required",
            body: "Featured item poster uploads must be image files.",
          });
          return;
        }
      } else {
        if (!submitDraft.itemPosterSizeConfirmed) {
          setToast({
            title: "Confirm featured item poster size",
            body: `Featured item posters must be ${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height}px. Check the confirmation box to proceed.`,
          });
          return;
        }
      }
    }

    const finalStatus: ReviewStatus = "approved";
    setSubmitStatus(finalStatus);

    const subtitle = [selectedCampaign?.name, selectedSupplier?.name].filter(Boolean).join(" · ");
    const tags = submitDraft.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const resolvedTitle =
      submitDraft.title.trim() ||
      submitDraft.files[0]?.name?.trim() ||
      submitDraft.linkUrl.trim() ||
      "";

    const metadata: Record<string, unknown> = {
      title: resolvedTitle,
      subtitle,
      campaignId: submitDraft.campaignId,
      supplierId: selectedSupplierId,
      brand: selectedCampaign?.brand ?? selectedSupplier?.brand,
      tags,
      mediaType: submitDraft.mediaType,
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: finalStatus,
      role: submitDraft.role || (submitDraft.mediaType === "video" ? "hero" : ""),
      usageNotes: submitDraft.notes || "",
      restrictions: "Pending review.",
      relatedDealId: dealId || "",
      dealId: dealId || "",
      creatorScope: selectedCreatorId || "all",
      caption: submitDraft.caption || "",
      deliverableId: submitDraft.deliverableId || "",
      desktopMode: submitDraft.mediaType === "video" ? "fullscreen" : "modal",
      aspect:
        submitDraft.mediaType === "image" && isHeroImage
          ? "horizontal"
          : submitDraft.mediaType === "image" && isItemPosterImage
            ? "horizontal"
            : submitImageMeta && submitImageMeta.width >= submitImageMeta.height
              ? "horizontal"
              : "vertical",
      dimensions:
        submitDraft.mediaType === "image" && isHeroImage
          ? { width: HERO_IMAGE_REQUIRED.width, height: HERO_IMAGE_REQUIRED.height }
          : submitDraft.mediaType === "image" && isItemPosterImage
            ? { width: ITEM_POSTER_REQUIRED.width, height: ITEM_POSTER_REQUIRED.height }
            : submitDraft.mediaType === "image" && submitImageMeta
              ? { width: submitImageMeta.width, height: submitImageMeta.height }
          : undefined,
    };

    try {
      if (submitDraft.mediaType === "link") {
        await creatorApi.createMediaAsset({
          name: resolvedTitle,
          kind: "link",
          mimeType: "text/uri-list",
          url: submitDraft.linkUrl.trim(),
          metadata,
        });
      } else {
        for (const file of submitDraft.files) {
          const preparedUpload = submitDraft.mediaType === "image" && isHeroImage
            ? await normalizeImageForRequiredSize(file, HERO_IMAGE_REQUIRED.width, HERO_IMAGE_REQUIRED.height)
            : submitDraft.mediaType === "image" && isItemPosterImage
              ? await normalizeImageForRequiredSize(file, ITEM_POSTER_REQUIRED.width, ITEM_POSTER_REQUIRED.height)
              : null;
          const dataUrl = preparedUpload ? preparedUpload.dataUrl : await fileToDataUrl(file);
          const extension = preparedUpload
            ? preparedUpload.extension
            : file.name.includes(".")
              ? file.name.split(".").pop()
              : undefined;
          await creatorApi.uploadMediaFile({
            name: preparedUpload?.name || file.name || submitDraft.title || "submission",
            dataUrl,
            kind: submitDraft.mediaType,
            mimeType: preparedUpload?.mimeType || file.type || undefined,
            sizeBytes: preparedUpload?.sizeBytes || file.size || undefined,
            extension,
            visibility: "PRIVATE",
            purpose: "asset_library",
            metadata,
          });
        }
      }

      await loadLibraryFromBackend();
      setToast({
        title: "Asset ready",
        body: "Your upload was approved automatically and is ready to attach/use in builders.",
      });
      setIsSubmitOpen(false);
      setTimeout(() => resetSubmitDraft(), 250);
    } catch (error) {
      setToast({
        title: "Submission failed",
        body: error instanceof Error ? error.message : "Could not submit to backend.",
      });
    }
  }
  function navigateReturnTo(extra?: Record<string, string>) {
    if (!returnTo) return;
    try {
      const url = new URL(returnTo, window.location.origin);
      const contextParams: Record<string, string> = {};
      if (dealId) contextParams.dealId = dealId;
      if (pickerSupplierId) contextParams.supplierId = pickerSupplierId;
      if (pickerCampaignId) contextParams.campaignId = pickerCampaignId;
      if (pickerSupplierName) contextParams.supplierName = pickerSupplierName;
      if (pickerSupplierKind) contextParams.supplierKind = pickerSupplierKind;
      if (pickerSupplierBrand) contextParams.supplierBrand = pickerSupplierBrand;
      if (pickerCampaignName) contextParams.campaignName = pickerCampaignName;
      if (pickerCampaignBrand) contextParams.campaignBrand = pickerCampaignBrand;
      Object.entries(contextParams).forEach(([k, v]) => url.searchParams.set(k, v));
      Object.entries(extra || {}).forEach(([k, v]) => url.searchParams.set(k, v));
      url.searchParams.set("restore", "1");
      const qs = url.searchParams.toString();
      window.location.assign(url.pathname + (qs ? `?${qs}` : ""));
    } catch {
      window.location.assign(returnTo);
    }
  }

  function attachToDeal() {
    if (!activeAsset) return;

    if (activeAsset.status !== "approved") {
      setToast({ title: "Approval required", body: "Only approved assets can be attached/used in builders." });
      return;
    }

    // Picker-mode: return selection to the caller (Ad Builder / Live Builder)
    if (pickerMode) {
      if (!returnTo) {
        setToast({ title: "No return route", body: "This picker was opened without a returnTo parameter." });
        return;
      }

      // Mini-step: choose where to apply this asset (prevents Live Builder quick-action from defaulting incorrectly).
      if (!applyTo || applyTo === "choose") {
        setPendingPickAssetId(activeAsset.id);
        // Pick a sensible default based on media kind + target.
        const kind = activeAsset.previewKind || (activeAsset.mediaType === "video" ? "video" : "image");
        const defaultChoice = pickerTarget === "live" ? (kind === "video" ? "promoHeroVideo" : "promoHeroImage") : "variant:A";
        setChooseApplyValue(defaultChoice);
        setChooseApplyOpen(true);
        return;
      }

      navigateReturnTo({ assetId: activeAsset.id, ...(applyTo ? { applyTo } : {}) });
      return;
    }

    // Library-mode: attach to a deal (demo)
    if (!dealId) {
      setToast({ title: "No deal context", body: "Open Asset Library from a deal to attach items." });
      return;
    }

    setToast({ title: "Attached to deal", body: `${activeAsset.title} attached to deal ${dealId}.` });
  }

  function useInAdz() {
    if (!activeAsset) return;
    setToast({ title: "Sent to Ad Builder", body: `${activeAsset.title} selected for Shoppable Adz creative.` });
  }

  function handleUseInLive() {
    if (!activeAsset) return;
    setToast({ title: "Sent to Live Builder", body: `${activeAsset.title} selected for Live session creative.` });
  }

  const pendingPickAsset = useMemo(() => {
    if (!pendingPickAssetId) return null;
    return assets.find((a) => a.id === pendingPickAssetId) || null;
  }, [assets, pendingPickAssetId]);

  const applyOptions = useMemo(() => {
    const a = pendingPickAsset;
    const kind = a?.previewKind || (a?.mediaType === "video" ? "video" : a?.mediaType === "image" ? "image" : undefined);

    if (pickerTarget === "live") {
      const base = [
        {
          value: "promoHeroVideo",
          label: "Promo hero — Intro video",
          desc: "Plays when buyers tap the hero play icon on the promo link.",
          requires: "video" as const,
        },
        {
          value: "promoHeroImage",
          label: `Promo hero — Poster image (${HERO_IMAGE_REQUIRED.width}×${HERO_IMAGE_REQUIRED.height})`,
          desc: "Cover image behind the play icon. Used across mobile and desktop.",
          requires: "image" as const,
        },
        {
          value: "featuredItemPoster",
          label: `Featured item — Poster image (${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height})`,
          desc: "Poster behind the play icon for a featured product/service. (Applied to your currently selected item in Live Builder.)",
          requires: "image" as const,
        },
        {
          value: "featuredItemVideo",
          label: "Featured item — Video",
          desc: "Plays when buyers tap a featured item’s play icon.",
          requires: "video" as const,
        },
        {
          value: "opener",
          label: "Show opener",
          desc: "Intro bumper for the run-of-show.",
          requires: "video" as const,
        },
        {
          value: "lowerThird",
          label: "Lower third",
          desc: "Ticker / identity strip overlay.",
          requires: "image" as const,
        },
        {
          value: "overlay",
          label: "Overlay",
          desc: "On-screen badges (price drop, countdown frame, etc.).",
          requires: "image" as const,
        },
      ];

      // If we know the kind, hide incompatible targets to keep this step small.
      if (kind === "video") return base.filter((x) => x.requires === "video");
      if (kind === "image") return base.filter((x) => x.requires === "image");
      return base;
    }

    // Shoppable (Ad Builder) generally passes applyTo explicitly, so this is rarely used.
    return [
      { value: "variant:A", label: "Ad creative — Variant A", desc: "Sets the hero intro/thumbnail for variant A." },
      { value: "variant:B", label: "Ad creative — Variant B", desc: "Sets the hero intro/thumbnail for variant B." },
    ];
  }, [pendingPickAsset, pickerTarget]);

  function confirmApplyWhere() {
    if (!pendingPickAsset || !returnTo) return;
    navigateReturnTo({ assetId: pendingPickAsset.id, ...(chooseApplyValue ? { applyTo: chooseApplyValue } : {}) });
    setChooseApplyOpen(false);
    setPendingPickAssetId(null);
  }

  const starterCollectionStatus = collectionStatusMeta(collectionSummary.starterPack.status);
  const priceDropCollectionStatus = collectionStatusMeta(collectionSummary.priceDropOverlays.status);

  // ---- Render ----
  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-x-hidden transition-colors">
      {/* Top header */}
      <div className="border-b bg-white dark:bg-slate-900 transition-colors">
        <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-3 sm:px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <img src="/MyliveDealz PNG Icon 1.png" alt="LiveDealz" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
            <div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">Asset Library</div>
              <div className="text-sm text-slate-500 dark:text-slate-300">
                Creator-first library for campaigns & dealz — approved assets are ready for Ad Builder and Live Builder.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
              <button
                onClick={() => setViewSide("creator")}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  viewSide === "creator"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Creator Side
              </button>
              <button
                onClick={() => setViewSide("supplier")}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  viewSide === "supplier"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Supplier Side
              </button>
            </div>

            <button
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-orange-600" />
              Seller assets & Creator templates
            </button>

            <button
              onClick={() => {
                resetSubmitDraft();
                setIsSubmitOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 sm:px-4 md:px-6 lg:px-8 py-2 text-sm font-semibold dark:font-bold text-white hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" />
              Add Content
            </button>
          </div>
        </div>
      </div>

      {/* Context banner when opened as picker */}
      {(pickerMode || dealId) && (
        <div className="mx-auto max-w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-4">
          <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-slate-700 dark:text-slate-200" />
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    {dealId ? `Picking assets for deal ${dealId}` : "Asset picker mode"}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                    Approved assets can be attached to this deal. You can also add new content and submit it for review.
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
                  <button
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:bg-slate-800"
                    onClick={() => navigateReturnTo()}
                    title="Back to the builder"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                ) : null}
                <button
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:bg-slate-800"
                  onClick={() => safeCopy(window.location.href)}
                >
                  <Share2 className="h-4 w-4" />
                  Share link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
          <div className="grid gap-3 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                        alt={selectedCreator.name}
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" aria-hidden="true" />
                    )}
                    <select
                      value={selectedCreatorId}
                      onChange={(e) => setSelectedCreatorId(e.target.value)}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {creators.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.handle})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* supplier selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {supplierOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          Supplier: {p.name} ({p.kind})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>

                  {/* Campaign selector */}
                  <div className="flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-colors max-w-full">
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="bg-transparent text-sm text-slate-900 dark:text-slate-50 outline-none w-full truncate"
                    >
                      {campaignsForSupplier.map((c) => (
                        <option key={c.id} value={c.id}>
                          Campaign: {c.name} · {c.brand} ({c.status})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-300">Full-text search active</div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as "all" | "creator" | "supplier" | "catalog")}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Source: All</option>
                <option value="creator">Source: Creator</option>
                <option value="supplier">Source: Supplier</option>
                <option value="catalog">Source: Catalog</option>
              </select>

              <select
                value={filterMedia}
                onChange={(e) => setFilterMedia(e.target.value as MediaType | "all")}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Type: All</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="overlay">Overlay</option>
                <option value="template">Template</option>
                <option value="script">Script</option>
                <option value="link">Link</option>
                <option value="doc">Doc</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReviewStatus | "pending" | "all")}
                className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none transition-colors"
              >
                <option value="all">Status: All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending review</option>
                <option value="changes_requested">Changes requested</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select>
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
            <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Assets</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                    Content from creator, supplier, and catalog is channelled into the creator’s library for this campaign.
                  </div>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Star className="h-4 w-4" />
                    Saved packs
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2" data-loading={isLoadingLibrary ? "true" : "false"}>
                {filteredAssets.map((a) => {
                  const selected = a.id === activeAssetId;
                  const thumb =
                    a.thumbnailUrl || a.previewUrl ? (
                      <img
                        src={a.thumbnailUrl || a.previewUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        {mediaIcon(a.mediaType, "h-5 w-5")}
                      </div>
                    );

                  return (
                    <button
                      key={a.id}
                      onClick={() => openAsset(a.id)}
                      className={cx(
                        "text-left rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors p-3 sm:p-4",
                        selected ? "border-orange-400 dark:border-orange-500 bg-orange-50/30 dark:bg-orange-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">{thumb}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{a.title}</div>
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
                            {a.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600"
                              >
                                #{t}
                              </span>
                            ))}
                            {a.tags.length > 3 ? (
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
                  <div className="col-span-full rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors border-dashed bg-slate-50 dark:bg-slate-800 p-6 text-center text-sm text-slate-700 dark:text-slate-200">
                    No assets match your filters.
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                      Try clearing filters or uploading new content for this campaign.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Collections (premium extra) */}
            <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Collections</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Group assets into reusable packs for Adz or Live.</div>
                </div>
                <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Plus className="h-4 w-4" />
                  New collection
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                        {collectionSummary.starterPack.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                        {collectionSummary.starterPack.assetCount} assets
                        {collectionSummary.starterPack.subtitle ? ` · ${collectionSummary.starterPack.subtitle}` : ""}
                      </div>
                    </div>
                    <span className={starterCollectionStatus.className}>
                      {starterCollectionStatus.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-300">{collectionSummary.starterPack.subtitle}</div>
                    <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold dark:font-bold text-white hover:bg-slate-800">
                      Use pack <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                        {collectionSummary.priceDropOverlays.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                        {collectionSummary.priceDropOverlays.assetCount} assets
                        {collectionSummary.priceDropOverlays.subtitle ? ` · ${collectionSummary.priceDropOverlays.subtitle}` : ""}
                      </div>
                    </div>
                    <span className={priceDropCollectionStatus.className}>
                      {priceDropCollectionStatus.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-300">{collectionSummary.priceDropOverlays.subtitle}</div>
                    <button className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold dark:font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                      Open <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview / details */}
          <div className="lg:col-span-5">
            <PreviewPane
              asset={activeAsset}
              smartPacks={smartPacks}
              showPickerActions={Boolean(dealId) || pickerMode}
              onAttachToDeal={() => {
                if (pickerMode) attachToDeal();
                else if (pickerTarget === "live") handleUseInLive();
                else attachToDeal();
              }}
              onUseInShoppable={useInAdz}
              onUseInLive={handleUseInLive}
            />

            {/* Mini analytics (premium trust signal) */}
            <div className="mt-6 rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Library activity</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">Uploads + approvals trend for this campaign.</div>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                  Last 14 days
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-slate-700 dark:text-slate-100">
                <MiniChart points={activityPoints} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">New</div>
                  <div className="mt-1 font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    +{activitySummary.newCount}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">Approved</div>
                  <div className="mt-1 font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    {activitySummary.approvedCount}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-300">Pending</div>
                  <div className="mt-1 font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    {activitySummary.pendingCount}
                  </div>
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
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsMobilePreviewOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-3 sm:px-4 md:px-6 lg:px-8 py-2 text-sm font-semibold transition-colors",
                  activeAsset?.status === "approved"
                    ? "bg-slate-900 dark:bg-orange-600 text-white hover:bg-slate-800 dark:hover:bg-orange-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}
                onClick={() => (pickerMode ? attachToDeal() : pickerTarget === "live" ? handleUseInLive() : attachToDeal())}
                disabled={activeAsset?.status !== "approved"}
              >
                <ArrowRight className="h-4 w-4" />
                {dealId || pickerMode ? "Use" : "Attach"}
              </button>
            </div>
          </div>
        }
      >
        <PreviewPane
          asset={activeAsset}
          smartPacks={smartPacks}
          showPickerActions={Boolean(dealId) || pickerMode}
          onAttachToDeal={() => {
            if (pickerMode) attachToDeal();
            else if (pickerTarget === "live") handleUseInLive();
            else attachToDeal();
          }}
          onUseInShoppable={useInAdz}
          onUseInLive={handleUseInLive}
        />
      </Modal>

      {/* Picker mini-step: choose where to apply this asset */}
      <Modal
        open={chooseApplyOpen}
        title="Choose where to apply this asset"
        onClose={() => {
          setChooseApplyOpen(false);
          setPendingPickAssetId(null);
        }}
        footer={
          <div className="flex items-center justify-between gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-3 sm:px-4 md:px-6 lg:px-8 py-2 text-sm font-semibold dark:font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => {
                setChooseApplyOpen(false);
                setPendingPickAssetId(null);
              }}
            >
              Cancel
            </button>
            <button
              className={cx(
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                chooseApplyValue ? "bg-slate-900 dark:bg-orange-600 text-white hover:bg-slate-800 dark:hover:bg-orange-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              )}
              disabled={!chooseApplyValue}
              onClick={confirmApplyWhere}
            >
              Apply & return
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{pendingPickAsset?.title || "Selected asset"}</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  Choose how this asset should be applied when you return to {pickerTarget === "live" ? "Live Builder" : "Ad Builder"}.
                </div>
              </div>
              {pendingPickAsset?.status ? (
                <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs", statusStyles(pendingPickAsset.status))}>
                  {statusLabel(pendingPickAsset.status)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-4">
            <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Apply to</div>
            <div className="mt-2 space-y-2">
              {applyOptions.map((opt) => {
                const selected = chooseApplyValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChooseApplyValue(opt.value)}
                    className={cx(
                      "w-full rounded-xl border transition-colors px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800",
                      selected ? "border-slate-900 dark:border-orange-500 ring-4 ring-slate-100 dark:ring-orange-900/30" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{opt.label}</div>
                        <div className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{opt.desc}</div>
                      </div>
                      <div className={cx("mt-1 h-5 w-5 rounded-full border", selected ? "bg-slate-900 dark:bg-orange-500 border-slate-900 dark:border-orange-500" : "border-slate-300 dark:border-slate-600")} />
                    </div>
                  </button>
                );
              })}
            </div>

            {pickerTarget === "live" ? (
              <div className="mt-3 rounded-xl border transition-colors border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-100">
                Tip: hero poster images should be {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px.
              </div>
            ) : null}
          </div>
        </div>
      </Modal>

      {/* Content submission drawer */}
      <Drawer
        open={isSubmitOpen}
        onClose={() => setIsSubmitOpen(false)}
        title="Add content"
        subtitle="Upload or link media, then submit for review — approved assets become available in builders."
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
              <ShieldAlert className="h-4 w-4 text-amber-700" />
              Uploading implies you have rights to use this content.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setIsSubmitOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-3 sm:px-4 md:px-6 lg:px-8 py-2 text-sm font-semibold dark:font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitForReview}
                className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold dark:font-bold text-white hover:bg-orange-700"
              >
                <Send className="h-4 w-4" />
                Submit for review
              </button>
            </div>
          </div>
        }
      >
        <ReviewStatusRibbon
          status={submitStatus}
          onSetStatus={setSubmitStatus}
          isAdminMode={adminMode}
          autoApprove={supplierAutoApprove}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Submission details</div>
          {viewSide === "supplier" && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500"
                  checked={supplierAutoApprove}
                  onChange={(e) => setSupplierAutoApprove(e.target.checked)}
                />
                Supplier Auto-Approve (ON/OFF)
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500"
                  checked={adminMode}
                  onChange={(e) => setAdminMode(e.target.checked)}
                />
                Admin mode (demo)
              </label>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-3 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Supplier</div>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-600">
                  <BadgeCheck className="h-4 w-4 text-slate-700 dark:text-slate-100" />
                </span>
                {selectedSupplier?.name} ({selectedSupplier?.kind})
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Campaign</div>
              <select
                value={submitDraft.campaignId}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, campaignId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                {campaignsForSupplier.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.brand} · {c.status}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">Brand: {selectedCampaign?.brand} · {selectedCampaign?.status}</div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Deliverable (from contract)</div>
              <select
                value={submitDraft.deliverableId}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, deliverableId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
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
              <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Media type</div>
              <select
                value={submitDraft.mediaType}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, mediaType: e.target.value as MediaType }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="overlay">Overlay</option>
                <option value="template">Template</option>
                <option value="script">Script</option>
                <option value="link">Link / URL</option>
                <option value="doc">Document</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Placement / role</div>
              <select
                value={submitDraft.role}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, role: e.target.value as SubmitDraft["role"] }))}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              >
                {submitRoleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {submitDraft.mediaType === "image" && submitDraft.role === "hero" ? (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  Hero images are required at {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px.
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Title</div>
            <input
              value={submitDraft.title}
              onChange={(e) => setSubmitDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="e.g., Autumn Beauty opener — take 2"
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
          <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Content submission</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Upload the final file. The brand will review and either approve or request changes.
          </div>

          <div className="mt-3 space-y-3">
            <Dropzone
              accept="*/*"
              helper="Supported: MP4, MOV, JPG, PNG, PDF · Max 500MB (demo)"
              onFiles={(files, fromCamera) => handleSubmitFiles(files, fromCamera)}
              cameraMode
            />

            {submitDraft.mediaType === "link" ? (
              <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-100">Asset URL</div>
                <input
                  value={submitDraft.linkUrl}
                  onChange={(e) => setSubmitDraft((d) => ({ ...d, linkUrl: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
                />
              </div>
            ) : null}

            <div className="text-xs text-slate-500 dark:text-slate-300">
              Tip: if you upload a file, keep a clean filename (campaign + date + take number).
            </div>
          </div>

          {submitDraft.mediaType === "image" && submitDraft.role === "hero" ? (
            <div className="mt-3 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Hero image requirement</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    Required size: {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px. This is the canonical hero size for Live Builder and Ad Builder.
                  </div>
                </div>
                {(() => {
                  const ok = Boolean(
                    submitImageMeta &&
                    submitImageMeta.width === HERO_IMAGE_REQUIRED.width &&
                    submitImageMeta.height === HERO_IMAGE_REQUIRED.height
                  );
                  return (
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        ok ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-700" : "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700"
                      )}
                    >
                      {ok ? "OK" : "Needed"}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-100">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Detected size</div>
                  <div className="mt-1 font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    {submitImageMeta ? `${submitImageMeta.width}×${submitImageMeta.height}px` : "Not detected (URL-only or non-image upload)"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">We auto-detect when you upload an image file.</div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-100">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Why this matters</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                    Ensures overlays (play icon, countdown, CTA buttons) land consistently and look crisp on both mobile and desktop.
                  </div>
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={submitDraft.heroSizeConfirmed}
                  onChange={(e) => setSubmitDraft((d) => ({ ...d, heroSizeConfirmed: e.target.checked }))}
                />
                <span>
                  I confirm this hero image is {HERO_IMAGE_REQUIRED.width}×{HERO_IMAGE_REQUIRED.height}px (or will be provided from Product Catalog at this size).
                </span>
              </label>
            </div>
          ) : null}

          {submitDraft.mediaType === "image" && submitDraft.role === "item_poster" ? (
            <div className="mt-3 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Featured item poster requirement</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                    Required size: {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}px. This is the canonical size for featured product/service posters in Live Builder &amp; Ad Builder.
                  </div>
                </div>
                {(() => {
                  const ok = Boolean(
                    submitImageMeta &&
                    submitImageMeta.width === ITEM_POSTER_REQUIRED.width &&
                    submitImageMeta.height === ITEM_POSTER_REQUIRED.height
                  );
                  return (
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                        ok ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-700" : "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700"
                      )}
                    >
                      {ok ? "OK" : "Needed"}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-100">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Detected size</div>
                  <div className="mt-1 font-semibold dark:font-bold text-slate-900 dark:text-slate-50">
                    {submitImageMeta ? `${submitImageMeta.width}×${submitImageMeta.height}px` : "Not detected (URL-only or non-image upload)"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">We auto-detect when you upload an image file.</div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-100">
                  <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Why this matters</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-100">
                    Keeps the product/service play icon centered and ensures Buy/Add overlays are placed correctly across mobile and desktop.
                  </div>
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={submitDraft.itemPosterSizeConfirmed}
                  onChange={(e) => setSubmitDraft((d) => ({ ...d, itemPosterSizeConfirmed: e.target.checked }))}
                />
                <span>
                  I confirm this featured item poster is {ITEM_POSTER_REQUIRED.width}×{ITEM_POSTER_REQUIRED.height}px (or will be provided from Product Catalog at this size).
                </span>
              </label>
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Draft caption / post text</div>
                <span className="text-xs text-slate-500 dark:text-slate-300">auto-checks for disclosures</span>
              </div>
              <textarea
                value={submitDraft.caption}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, caption: e.target.value }))}
                placeholder="Write your caption…"
                className="mt-2 h-28 w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              />

              {!isDisclosurePresent(submitDraft.caption) ? (
                <div className="mt-3 rounded-xl border transition-colors border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <div>
                      We couldn't detect a disclosure like <span className="font-semibold">#ad</span> or{" "}
                      <span className="font-semibold">#sponsored</span> in this caption.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border transition-colors border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    <div>Disclosure detected. Nice.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
              <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Notes for the brand / reviewer</div>
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                Explain how this content fits the brief, any variations you tried, etc.
              </div>
              <textarea
                value={submitDraft.notes}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Notes…"
                className="mt-2 h-28 w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
              />

              <div className="mt-3">
                <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Tags</div>
                <input
                  value={submitDraft.tagsCsv}
                  onChange={(e) => setSubmitDraft((d) => ({ ...d, tagsCsv: e.target.value }))}
                  placeholder="beauty,serum,flash dealz"
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 px-3 py-2 text-sm outline-none ring-orange-100 focus:border-orange-300 focus:ring-4"
                />
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">Comma-separated tags help reviewers find assets faster.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Rights & compliance */}
        <div className="mt-4 rounded-2xl border transition-colors bg-white dark:bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Rights & compliance</div>
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                These safeguards help you and the brand stay legally compliant. (Required to submit.)
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
              <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              Required
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-3 text-sm">
              <input
                type="checkbox"
                checked={submitDraft.rightsConfirmed}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, rightsConfirmed: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50">I own this media or I have a license/permission to use it.</div>
                <div className="mt-0.5 text-slate-700 dark:text-slate-200">
                  Includes visuals, logos, scripts, and any third-party content.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-3 text-sm">
              <input
                type="checkbox"
                checked={submitDraft.noCopyrightedMusicConfirmed}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, noCopyrightedMusicConfirmed: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50">Any background music is licensed or royalty-free.</div>
                <div className="mt-0.5 text-slate-700 dark:text-slate-200">
                  If unsure, remove the audio track or use platform-cleared sounds.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-3 text-sm">
              <input
                type="checkbox"
                checked={submitDraft.disclosureConfirmed}
                onChange={(e) => setSubmitDraft((d) => ({ ...d, disclosureConfirmed: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-50">I included required disclosures where applicable.</div>
                <div className="mt-0.5 text-slate-700 dark:text-slate-200">
                  For example: <span className="font-medium">#ad</span>, <span className="font-medium">#sponsored</span>, or “Paid partnership”.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Optional: Add more premium hints */}
        <div className="mt-4 rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-slate-50 dark:bg-slate-800 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-orange-600" />
            <div className="text-sm text-slate-700 dark:text-slate-100">
              <span className="font-semibold dark:font-bold text-slate-900 dark:text-slate-50">Premium:</span> Automatic policy checks + restricted terms detection can run here after upload (claims, medical, pricing).
            </div>
          </div>
        </div>
      </Drawer>

      {/* Toast */}
      <div className={cx("fixed bottom-4 right-4 z-[100] w-[92vw] max-w-sm transition", toast ? "opacity-100" : "opacity-0 pointer-events-none")}>
        {toast ? (
          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold dark:font-bold text-slate-900 dark:text-slate-50">{toast.title}</div>
                {toast.body ? <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{toast.body}</div> : null}
              </div>
              <button
                className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setToast(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
