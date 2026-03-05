import React, { useEffect, useMemo, useState } from "react";
import { Link2, Plus, Sparkles, X } from "lucide-react";
import { useNotification } from "../../contexts/NotificationContext";
import { useCampaignsQuery } from "../../hooks/api/useCampaigns";
import { useAdzCampaignsQuery, useCreateLinkMutation } from "../../hooks/api/useAdzRuntime";
import type { LinkRecord } from "../../api/types";

export interface LinkToolsDrawerProps {
  open: boolean;
  onClose: () => void;
  initialCampaignId?: string;
  onCreated?: (link: LinkRecord) => void;
}

type LinkTab = "live" | "shoppable";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function buildDefaultChannels(primaryUrl: string, tab: LinkTab) {
  const url = primaryUrl.trim();
  if (!url) return [];

  if (tab === "live") {
    return [
      { name: "Instagram Story", url: `${url}${url.includes("?") ? "&" : "?"}ch=ig_story`, hint: "Best for Stories" },
      { name: "WhatsApp", url: `${url}${url.includes("?") ? "&" : "?"}ch=whatsapp`, hint: "Best for broadcasts" }
    ];
  }

  return [
    { name: "Instagram Story", url: `${url}${url.includes("?") ? "&" : "?"}ch=ig_story`, hint: "Swipe-up traffic" },
    { name: "TikTok Profile", url: `${url}${url.includes("?") ? "&" : "?"}ch=tiktok`, hint: "Best for reach" }
  ];
}

function buildDefaultSharePack(title: string, shortUrl: string) {
  return {
    headline: title,
    bullets: ["Tracked short link", "Creator attribution included", "Safe to paste across channels"],
    captions: [
      { platform: "Instagram", text: `Shop or join here: ${shortUrl || "{LINK}"}` },
      { platform: "WhatsApp", text: `My MyLiveDealz link: ${shortUrl || "{LINK}"}` }
    ],
    hashtags: ["#MyLiveDealz", "#TrackedLink"]
  };
}

export function LinkToolsDrawer({ open, onClose, initialCampaignId, onCreated }: LinkToolsDrawerProps) {
  const { showError, showSuccess } = useNotification();
  const createLinkMutation = useCreateLinkMutation();
  const liveCampaignsQuery = useCampaignsQuery({ pageSize: 50 });
  const adCampaignsQuery = useAdzCampaignsQuery({ pageSize: 50 });

  const [tab, setTab] = useState<LinkTab>("live");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId || "");
  const [campaignName, setCampaignName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierType, setSupplierType] = useState("Seller");
  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);

  const liveCampaignOptions = liveCampaignsQuery.data?.items ?? [];
  const adCampaignOptions = adCampaignsQuery.data?.items ?? [];

  const selectedCampaignLabel = useMemo(() => {
    if (tab === "shoppable") {
      return adCampaignOptions.find((item) => item.id === campaignId)?.campaignName || "";
    }
    return liveCampaignOptions.find((item) => item.id === campaignId)?.title || "";
  }, [adCampaignOptions, campaignId, liveCampaignOptions, tab]);

  useEffect(() => {
    if (!open) return;
    setCampaignId(initialCampaignId || "");
  }, [initialCampaignId, open]);

  useEffect(() => {
    if (!selectedCampaignLabel) return;
    if (!campaignName) setCampaignName(selectedCampaignLabel);
  }, [campaignName, selectedCampaignLabel]);

  const resetState = () => {
    setTab("live");
    setTitle("");
    setSubtitle("");
    setPrimaryUrl("");
    setShortUrl("");
    setCampaignId(initialCampaignId || "");
    setCampaignName("");
    setSupplierName("");
    setSupplierType("Seller");
    setStatus("active");
    setNote("");
    setPinned(false);
  };

  const handleClose = () => {
    if (createLinkMutation.isPending) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !primaryUrl.trim()) {
      showError("Title and primary URL are required.");
      return;
    }

    const effectiveShortUrl = shortUrl.trim() || primaryUrl.trim();
    try {
      const link = await createLinkMutation.mutateAsync({
        payload: {
          tab,
          title: title.trim(),
          subtitle: subtitle.trim(),
          status,
          campaign: {
            id: campaignId.trim(),
            name: campaignName.trim() || selectedCampaignLabel || title.trim()
          },
          supplier: {
            name: supplierName.trim(),
            type: supplierType
          },
          primaryUrl: primaryUrl.trim(),
          shortUrl: effectiveShortUrl,
          channels: buildDefaultChannels(primaryUrl, tab),
          sharePack: buildDefaultSharePack(title.trim(), effectiveShortUrl),
          pinned,
          note: note.trim()
        }
      });
      showSuccess("Tracked link created in the backend.");
      onCreated?.(link);
      handleClose();
    } catch {
      showError("Tracked link could not be created.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 md:items-center">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-colors">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 p-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/20 dark:text-orange-300">
              <Sparkles className="h-4 w-4" />
              Backend-driven link creation
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900 dark:text-slate-100">Create tracked link</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This saves directly to /api/links so Link Tools, promo detail, and reporting stay in sync.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTab("live")}
              className={cx(
                "rounded-3xl border px-4 py-3 text-left",
                tab === "live"
                  ? "border-[#f77f00] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                  : "border-slate-200 dark:border-slate-700"
              )}
            >
              <div className="font-bold">Live / Replay link</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">For live sessions, replays, and clip distribution.</div>
            </button>
            <button
              type="button"
              onClick={() => setTab("shoppable")}
              className={cx(
                "rounded-3xl border px-4 py-3 text-left",
                tab === "shoppable"
                  ? "border-[#f77f00] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                  : "border-slate-200 dark:border-slate-700"
              )}
            >
              <div className="font-bold">Shoppable ad link</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">For promo ads, tracked offers, and commerce reporting.</div>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Link title
              <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Subtitle
              <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Primary URL
              <input value={primaryUrl} onChange={(event) => setPrimaryUrl(event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Short URL
              <input value={shortUrl} onChange={(event) => setShortUrl(event.target.value)} placeholder="Optional short URL" className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Campaign ID
              <input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
              Campaign name
              <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder={selectedCampaignLabel || "Campaign label"} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
              Supplier / seller
              <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Supplier type
              <select value={supplierType} onChange={(event) => setSupplierType(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                <option value="Seller">Seller</option>
                <option value="Provider">Provider</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="draft">Draft</option>
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Internal note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          </label>

          <button
            type="button"
            onClick={() => setPinned((current) => !current)}
            className={cx(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              pinned
                ? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            )}
          >
            <Plus className="h-4 w-4" />
            {pinned ? "Pinned for quick access" : "Pin after creation"}
          </button>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Suggested channels</div>
            <div className="mt-2 space-y-1">
              {buildDefaultChannels(primaryUrl, tab).map((channel) => (
                <div key={channel.name} className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[#f77f00]" />
                  <span>{channel.name}</span>
                  <span className="text-xs">- {channel.hint}</span>
                </div>
              ))}
              {!primaryUrl.trim() ? <div>Add a primary URL to see default channel variants.</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button type="button" onClick={handleClose} className="rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLinkMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewLinkPagePreview(): JSX.Element {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 p-8">
      <button type="button" onClick={() => setOpen(true)} className="rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white">
        Open link tools drawer
      </button>
      <LinkToolsDrawer open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
