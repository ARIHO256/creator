import React, { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import type { AssetMediaType, AssetRecord, AssetReviewStatus, CreateAssetInput } from "../../api/types";
import { useNotification } from "../../contexts/NotificationContext";
import { useAssetQuery, useAssetsQuery, useCreateAssetMutation, useUpdateAssetReviewMutation } from "../../hooks/api/useAssets";
import { useCampaignsQuery } from "../../hooks/api/useCampaigns";

const ASSET_PICK_KEY = "mldz:assetPicker:payload:v1";

const STATUS_OPTIONS: { value: AssetReviewStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_supplier", label: "Pending supplier" },
  { value: "pending_admin", label: "Pending admin" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "rejected", label: "Rejected" }
];

const MEDIA_TYPE_OPTIONS: { value: AssetMediaType | ""; label: string }[] = [
  { value: "", label: "All media" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "template", label: "Template" },
  { value: "script", label: "Script" },
  { value: "overlay", label: "Overlay" },
  { value: "link", label: "Link" },
  { value: "doc", label: "Doc" }
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_supplier":
      return "Pending supplier";
    case "pending_admin":
      return "Pending admin";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes requested";
    case "rejected":
      return "Rejected";
    default:
      return "Draft";
  }
}

function getStatusClasses(status: string | null | undefined): string {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    case "pending_supplier":
    case "pending_admin":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
    case "changes_requested":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200";
    case "rejected":
      return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
  }
}

function getMediaTypeLabel(value: string | null | undefined): string {
  return MEDIA_TYPE_OPTIONS.find((entry) => entry.value === value)?.label ?? String(value || "Asset");
}

function isVideoAsset(asset: Pick<AssetRecord, "mediaType" | "previewKind">): boolean {
  return asset.previewKind === "video" || asset.mediaType === "video";
}

function persistPickedAsset(asset: AssetRecord): void {
  const payload = {
    id: asset.id,
    title: asset.title,
    subtitle: asset.subtitle,
    campaignId: asset.campaignId,
    supplierId: asset.supplierId,
    brand: asset.brand,
    tags: asset.tags,
    mediaType: asset.mediaType,
    source: asset.source,
    ownerLabel: asset.ownerLabel,
    status: asset.status,
    previewKind: asset.previewKind || (isVideoAsset(asset) ? "video" : "image"),
    previewUrl: asset.previewUrl,
    thumbnailUrl: asset.thumbnailUrl,
    role: asset.role,
    usageNotes: asset.usageNotes,
    restrictions: asset.restrictions,
    desktopMode: isVideoAsset(asset) ? "fullscreen" : "modal",
    aspect: isVideoAsset(asset) ? "vertical" : "vertical"
  };

  sessionStorage.setItem(ASSET_PICK_KEY, JSON.stringify({ payload, ts: Date.now() }));
}

function navigateReturnTo(returnTo: string, extra?: Record<string, string>): void {
  const url = new URL(returnTo, window.location.origin);
  Object.entries(extra || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("restore", "1");
  const search = url.searchParams.toString();
  window.location.assign(url.pathname + (search ? `?${search}` : ""));
}

function getApplyChoices(asset: AssetRecord, target: string): { value: string; label: string }[] {
  const video = isVideoAsset(asset);
  if (target === "live") {
    return video
      ? [
          { value: "promoHeroVideo", label: "Live promo hero video" },
          { value: "featuredItemVideo", label: "Featured item video" }
        ]
      : [
          { value: "promoHeroImage", label: "Live promo hero image" },
          { value: "featuredItemPoster", label: "Featured item poster" },
          { value: "overlay", label: "Live overlay" }
        ];
  }

  return video
    ? [{ value: "hero_video", label: "Ad Builder hero video" }]
    : [{ value: "hero_image", label: "Ad Builder hero image" }];
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {helper ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</div> : null}
    </div>
  );
}

function CreateAssetDialog({
  open,
  campaigns,
  onClose,
  onSubmit,
  isSubmitting
}: {
  open: boolean;
  campaigns: { id: string; title: string; seller: string }[];
  onClose: () => void;
  onSubmit: (payload: CreateAssetInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<AssetMediaType>("image");
  const [campaignId, setCampaignId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setMediaType("image");
    setCampaignId("");
    setPreviewUrl("");
    setTags("");
    setNotes("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create asset</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This creates a real asset metadata record in the backend.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <form
          className="mt-5 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit({
              title,
              mediaType,
              campaignId: campaignId || undefined,
              previewUrl: previewUrl || undefined,
              tags: tags
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              notes,
              status: "pending_supplier"
            });
          }}
        >
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Media type
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as AssetMediaType)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {MEDIA_TYPE_OPTIONS.filter((entry) => entry.value).map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Campaign
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">No campaign linked</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.title} — {campaign.seller}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Preview URL
            <input
              value={previewUrl}
              onChange={(event) => setPreviewUrl(event.target.value)}
              placeholder="https://example.com/file.jpg"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Tags
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="hero, skincare, paid partnership"
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssetLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showError, showInfo, showSuccess } = useNotification();

  const pickerMode = searchParams.get("mode") === "picker";
  const pickerTarget = searchParams.get("target") || "live";
  const returnTo = searchParams.get("returnTo") || "";
  const requestedApplyTo = searchParams.get("applyTo") || "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetReviewStatus | "">("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<AssetMediaType | "">("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(searchParams.get("assetId")?.trim() || undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [chooseApplyOpen, setChooseApplyOpen] = useState(false);
  const [chooseApplyValue, setChooseApplyValue] = useState("");

  const campaignsQuery = useCampaignsQuery({ pageSize: 100 });
  const assetsQuery = useAssetsQuery({
    q: search.trim() || undefined,
    status: statusFilter || undefined,
    mediaType: mediaTypeFilter || undefined,
    campaignId: campaignFilter || undefined,
    source: sourceFilter || undefined,
    pageSize: 200
  });

  const assets = assetsQuery.data?.items ?? [];

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedAssetId(undefined);
      return;
    }
    const stillExists = selectedAssetId && assets.some((asset) => asset.id === selectedAssetId);
    if (!stillExists) {
      setSelectedAssetId(assets[0]?.id);
    }
  }, [assets, selectedAssetId]);

  const selectedAssetFromList = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );
  const assetDetailQuery = useAssetQuery(selectedAssetId, { enabled: Boolean(selectedAssetId) });
  const selectedAsset = assetDetailQuery.data ?? selectedAssetFromList;

  useEffect(() => {
    setReviewNote(selectedAsset?.reviewNote || "");
  }, [selectedAsset?.id, selectedAsset?.reviewNote]);

  const createAssetMutation = useCreateAssetMutation();
  const reviewMutation = useUpdateAssetReviewMutation();

  const approvedCount = useMemo(
    () => assets.filter((asset) => asset.status === "approved").length,
    [assets]
  );
  const reviewQueueCount = useMemo(
    () => assets.filter((asset) => asset.status === "pending_supplier" || asset.status === "pending_admin").length,
    [assets]
  );

  const handleUseSelectedAsset = (applyToOverride?: string) => {
    if (!selectedAsset) return;
    if (selectedAsset.status !== "approved") {
      showInfo("Only approved assets can be used in builder picker mode.");
      return;
    }
    if (!returnTo) {
      showError("This picker was opened without a return route.");
      return;
    }

    const applyTo = applyToOverride || (requestedApplyTo && requestedApplyTo !== "choose" ? requestedApplyTo : "");
    if (!applyTo) {
      const options = getApplyChoices(selectedAsset, pickerTarget);
      setChooseApplyValue(options[0]?.value || "");
      setChooseApplyOpen(true);
      return;
    }

    try {
      persistPickedAsset(selectedAsset);
      navigateReturnTo(returnTo, { assetId: selectedAsset.id, applyTo });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not return this asset to the builder.");
    }
  };

  const handleCreateAsset = async (payload: CreateAssetInput) => {
    try {
      const asset = await createAssetMutation.mutateAsync(payload);
      setCreateOpen(false);
      setSelectedAssetId(asset.id);
      showSuccess("Asset created.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create asset.");
    }
  };

  const handleReviewUpdate = async (status: AssetReviewStatus) => {
    if (!selectedAsset) return;
    try {
      await reviewMutation.mutateAsync({
        assetId: selectedAsset.id,
        payload: { status, note: reviewNote || undefined }
      });
      showSuccess(`Asset moved to ${getStatusLabel(status)}.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not update review status.");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-8 dark:bg-slate-950">
      <PageHeader
        pageTitle={pickerMode ? "Asset Picker" : "Asset Library"}
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {pickerMode ? `Picker mode • ${pickerTarget}` : "Backend driven • assets + review flow"}
          </span>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              New asset
            </button>
            {pickerMode ? (
              <button
                type="button"
                onClick={() => handleUseSelectedAsset()}
                disabled={!selectedAsset || selectedAsset.status !== "approved"}
                className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Use selected asset
              </button>
            ) : null}
          </div>
        }
      />

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-3 pt-4 sm:px-4 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Visible assets" value={String(assets.length)} helper="Current filtered list" />
            <SummaryCard label="Approved" value={String(approvedCount)} helper="Ready for builders" />
            <SummaryCard label="In review" value={String(reviewQueueCount)} helper="Supplier/Admin queue" />
            <SummaryCard label="Campaigns linked" value={String(new Set(assets.map((asset) => asset.campaignId).filter(Boolean)).size)} helper="Distinct campaign usage" />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_220px_160px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, tag, review note"
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AssetReviewStatus | "")}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((entry) => (
                <option key={entry.label} value={entry.value}>{entry.label}</option>
              ))}
            </select>
            <select
              value={mediaTypeFilter}
              onChange={(event) => setMediaTypeFilter(event.target.value as AssetMediaType | "")}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {MEDIA_TYPE_OPTIONS.map((entry) => (
                <option key={entry.label} value={entry.value}>{entry.label}</option>
              ))}
            </select>
            <select
              value={campaignFilter}
              onChange={(event) => setCampaignFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All campaigns</option>
              {(campaignsQuery.data?.items ?? []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All sources</option>
              <option value="creator">Creator</option>
              <option value="seller">Seller</option>
              <option value="platform">Platform</option>
            </select>
          </div>
        </section>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {assetsQuery.isLoading ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <CircularProgress size={28} />
              </div>
            ) : assets.length === 0 ? (
              <EmptyPanel title="No assets found" body="Create an asset or relax the filters to load more creative records." />
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => {
                  const isActive = asset.id === selectedAssetId;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${isActive ? "border-[#f77f00] bg-orange-50/70 dark:border-[#f77f00] dark:bg-orange-950/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800/60"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{asset.title}</div>
                            <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusClasses(asset.status)}`}>
                              {getStatusLabel(asset.status)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{asset.subtitle || asset.brand || "No subtitle"}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getMediaTypeLabel(asset.mediaType)} • {asset.source} • {asset.ownerLabel}</div>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <div>{asset.lastUpdatedLabel || formatDateTime(asset.updatedAt)}</div>
                          <div className="mt-1">{asset.tags.slice(0, 2).join(", ") || "No tags"}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            {selectedAsset ? (
              assetDetailQuery.isLoading && !selectedAssetFromList ? (
                <div className="flex min-h-[45vh] items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <CircularProgress size={28} />
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedAsset.title}</h2>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(selectedAsset.status)}`}>
                          {getStatusLabel(selectedAsset.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{selectedAsset.subtitle || selectedAsset.brand || "Creative asset"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getMediaTypeLabel(selectedAsset.mediaType)} • {selectedAsset.ownerLabel} • updated {formatDateTime(selectedAsset.updatedAt)}</p>
                    </div>
                    {pickerMode ? (
                      <button
                        type="button"
                        onClick={() => handleUseSelectedAsset()}
                        disabled={selectedAsset.status !== "approved"}
                        className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Use in builder
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void navigate("/task-board")}
                          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Open Task Board
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                    {selectedAsset.previewUrl ? (
                      isVideoAsset(selectedAsset) ? (
                        <video src={selectedAsset.previewUrl} controls className="max-h-[420px] w-full bg-black object-contain" />
                      ) : (
                        <img src={selectedAsset.previewUrl} alt={selectedAsset.title} className="max-h-[420px] w-full object-contain" />
                      )
                    ) : (
                      <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                        No preview URL recorded for this asset.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard label="Media type" value={getMediaTypeLabel(selectedAsset.mediaType)} />
                    <SummaryCard label="Source" value={selectedAsset.source || "creator"} />
                    <SummaryCard label="Campaign" value={selectedAsset.campaignId || "No campaign"} helper={selectedAsset.brand || "Unlinked"} />
                    <SummaryCard label="Tags" value={selectedAsset.tags.length ? String(selectedAsset.tags.length) : "0"} helper={selectedAsset.tags.join(", ") || "No tags"} />
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Usage and restrictions</h3>
                      <div className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Usage notes</div>
                          <div className="mt-1">{selectedAsset.usageNotes || "No usage notes recorded."}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Restrictions</div>
                          <div className="mt-1">{selectedAsset.restrictions || "No restrictions recorded."}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review note</div>
                          <div className="mt-1">{selectedAsset.reviewNote || "No reviewer note yet."}</div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Review controls</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">These buttons now call the asset review endpoint.</p>
                      <textarea
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        rows={4}
                        placeholder="Reviewer note"
                        className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void handleReviewUpdate("pending_supplier")} className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          Supplier review
                        </button>
                        <button type="button" onClick={() => void handleReviewUpdate("pending_admin")} className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                          Admin review
                        </button>
                        <button type="button" onClick={() => void handleReviewUpdate("approved")} className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                          Approve
                        </button>
                        <button type="button" onClick={() => void handleReviewUpdate("changes_requested")} className="rounded-full bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                          Request changes
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              )
            ) : (
              <EmptyPanel title="Select an asset" body="Pick an asset to preview it, review it, or return it to a builder in picker mode." />
            )}
          </section>
        </div>
      </div>

      <CreateAssetDialog
        open={createOpen}
        campaigns={(campaignsQuery.data?.items ?? []).map((campaign) => ({ id: campaign.id, title: campaign.title, seller: campaign.seller }))}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateAsset}
        isSubmitting={createAssetMutation.isPending}
      />

      {chooseApplyOpen && selectedAsset ? (
        <div className="fixed inset-0 z-[81] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Choose where to apply this asset</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This picker was opened without a specific apply target.</p>
            <select
              value={chooseApplyValue}
              onChange={(event) => setChooseApplyValue(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#f77f00] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {getApplyChoices(selectedAsset, pickerTarget).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChooseApplyOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setChooseApplyOpen(false);
                  handleUseSelectedAsset(chooseApplyValue);
                }}
                className="rounded-full bg-[#f77f00] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e26f00]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
