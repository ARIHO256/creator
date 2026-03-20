// Round 6 – Page 20: Promo Ad Detail Page (Creator View)
// Route: /creator/Shoppable-Adz/{promoId}
// Purpose: Single detail page for a Promo Ad, with two tabs:
//  • Share & Assets – Everything the creator needs to share the Promo correctly.
//  • Performance & Earnings – How this Promo is performing for the creator + guidance.
// Styling aligned with MyLiveDealz Creator pages, using orange (#f77f00) as the primary color.

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotification } from "../../contexts/NotificationContext";

import { PageHeader } from "../../components/PageHeader";
import { creatorApi } from "../../lib/creatorApi";

const EMPTY_PROMO: Promo = {
  id: "",
  name: "Promo",
  seller: "Seller",
  campaign: "Campaign",
  status: "Upcoming",
  compType: "Hybrid",
  compSummary: "Pending",
  earnings: 0,
  clicks: 0,
  purchases: 0,
  conversion: 0,
  category: "General",
  region: "Global",
  hasContract: false,
  hasLives: false
};


function PromoAdDetailPage() {

  const { showSuccess, showNotification } = useNotification();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("share"); // share | performance

  const [promo, setPromo] = useState<Promo>(() => location.state?.promo || EMPTY_PROMO);

  useEffect(() => {
    let cancelled = false;

    const search = new URLSearchParams(location.search);
    const queryPromoId = search.get("promoId") || search.get("adId") || search.get("id");
    const pathTail = location.pathname.split("/").filter(Boolean).pop() || "";
    const candidateId =
      location.state?.promo?.id ||
      queryPromoId ||
      (pathTail && !pathTail.includes("Shoppable-Adz") ? pathTail : "");

    if (!candidateId) return;

    const normalizeStatus = (value: unknown): Promo["status"] => {
      const normalized = String(value || "").toLowerCase();
      if (["ended", "archived", "inactive", "completed"].includes(normalized)) return "Ended";
      if (["active", "live", "published", "running"].includes(normalized)) return "Active";
      return "Upcoming";
    };

    void Promise.all([
      creatorApi.adzCampaign(candidateId),
      creatorApi.adzCampaignPerformance(candidateId).catch(() => ({}))
    ])
      .then(([campaign, performance]) => {
        if (cancelled) return;
        const data =
          campaign.data && typeof campaign.data === "object" && !Array.isArray(campaign.data)
            ? (campaign.data as Record<string, unknown>)
            : {};
        const perf =
          performance && typeof performance === "object" && !Array.isArray(performance)
            ? (performance as Record<string, unknown>)
            : {};
        const clicks = Number(perf.clicks ?? 0) || 0;
        const purchases = Number(perf.purchases ?? 0) || 0;
        const earnings = Number(perf.earnings ?? 0) || 0;
        const conversion = clicks > 0 ? (purchases / clicks) * 100 : 0;

        const sellerName = String(
          data.supplierName ||
            data.sellerName ||
            data.seller ||
            (promo.seller || "Seller")
        );

        setPromo({
          id: campaign.id,
          name: String(campaign.title || data.title || data.name || promo.name || "Promo"),
          seller: sellerName,
          campaign: String(data.campaignName || data.campaign || campaign.title || "Campaign"),
          status: normalizeStatus(campaign.status || data.status),
          compType: String(data.compType || data.compensationType || promo.compType || "Hybrid"),
          compSummary: String(data.compSummary || data.compensationSummary || promo.compSummary || "Pending"),
          earnings,
          clicks,
          purchases,
          conversion: Number(conversion.toFixed(1)),
          category: String(data.category || promo.category || "General"),
          region: String(data.region || promo.region || "Global"),
          hasContract: Boolean(data.contractId || data.hasContract),
          hasLives: Boolean(data.hasLives || data.liveSessionId || data.liveSessionIds)
        });
      })
      .catch(() => {
        // Keep the current UI payload when API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.state?.promo?.id]);


  const handleOpenCampaignsBoard = () => {
    showNotification("Opening Campaigns Board...");
  };

  const handleOpenContract = () => {
    showNotification("Opening contract details...");
  };

  const handleOpenLives = () => {
    showNotification("Viewing live sessions...");
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors overflow-x-hidden">
      <PageHeader
        pageTitle="Shoppable Ad Detail"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fff4e5] dark:bg-amber-900/30 text-[#8a4b00] dark:text-amber-400 border border-[#ffd19a] dark:border-amber-700 transition-colors">
            <span>📣</span>
            <span>Shoppable Ad · Share toolkit & earnings</span>
          </span>
        }
      />

      <main className="flex-1 flex flex-col w-full p-4 sm:p-6 lg:p-8 pt-6 gap-6 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-full flex flex-col gap-3">
          {/* Header bar above tabs */}
          <PromoHeader
            promo={promo}
            onOpenCampaignsBoard={handleOpenCampaignsBoard}
            onOpenContract={handleOpenContract}
            onOpenLives={handleOpenLives}
          />

          {/* Tabs */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm flex flex-col text-sm">
            <div className="border-b border-slate-100 dark:border-slate-700 px-3 md:px-4 pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 bg-[#fff4e5] dark:bg-amber-900/30 border border-[#ffd19a] dark:border-amber-700 rounded-full px-1 py-0.5 text-xs transition-colors">
                <button
                  className={`px-3 py-0.5 rounded-full ${activeTab === "share"
                    ? "bg-[#f77f00] text-white shadow-sm"
                    : "text-[#8a4b00] dark:text-amber-400 hover:bg-[#ffe8cc] dark:hover:bg-amber-900/40"
                    }`}
                  onClick={() => setActiveTab("share")}
                >
                  Share & assets
                </button>
                <button
                  className={`px-3 py-0.5 rounded-full ${activeTab === "performance"
                    ? "bg-[#f77f00] text-white shadow-sm"
                    : "text-[#8a4b00] dark:text-amber-400 hover:bg-[#ffe8cc] dark:hover:bg-amber-900/40"
                    }`}
                  onClick={() => setActiveTab("performance")}
                >
                  Performance & earnings
                </button>
              </div>
            </div>

            <div className="p-3 md:p-4">
              {activeTab === "share" ? (
                <ShareAssetsTab promo={promo} showToast={showNotification} />
              ) : (
                <PerformanceEarningsTab promo={promo} showToast={showNotification} />
              )}
            </div>
          </section>
        </div>
      </main>

    </div>
  );
}

type Promo = {
  id: string;
  name: string;
  seller: string;
  campaign: string;
  status: "Upcoming" | "Active" | "Ended";
  compType: string;
  compSummary: string;
  earnings: number;
  clicks: number;
  purchases: number;
  conversion: number;
  category: string;
  region: string;
  hasContract: boolean;
  hasLives: boolean;
};

type PromoHeaderProps = {
  promo: Promo;
  onOpenCampaignsBoard: () => void;
  onOpenContract: () => void;
  onOpenLives: () => void;
};

function PromoHeader({ promo, onOpenCampaignsBoard, onOpenContract, onOpenLives }: PromoHeaderProps) {
  const statusConfigMap: Record<"Upcoming" | "Active" | "Ended", { label: string; className: string }> = {
    Upcoming: {
      label: "Upcoming",
      className: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
    },
    Active: {
      label: "Active",
      className: "bg-[#fff4e5] text-[#f77f00] border-[#ffd19a]"
    },
    Ended: {
      label: "Ended",
      className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    }
  };

  const statusConfig = statusConfigMap[promo.status as keyof typeof statusConfigMap] || {
    label: promo.status,
    className: "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-3 md:p-4 flex flex-col gap-2 text-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#fff4e5] dark:bg-amber-900/40 flex items-center justify-center text-sm font-semibold dark:font-bold text-[#8a4b00] dark:text-amber-400">
            {promo.seller
              .split(" ")
              .map((w: string) => w[0])
              .join("")}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1">
              <h1 className="text-sm font-semibold dark:font-bold dark:text-slate-50 text-slate-900 mr-1">
                {promo.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-tiny ${statusConfig.className}`}
              >
                <span>●</span>
                <span>{statusConfig.label}</span>
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300">
              {promo.campaign} · {promo.seller} · {promo.category} · {promo.region}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-200 mt-1">
              <span className="font-medium text-[#8a4b00]">{promo.compType}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{promo.compSummary}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-300">Your earnings from this Promo</span>
            <span className="text-lg font-semibold dark:font-bold text-[#f77f00]">
              ${promo.earnings.toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            {promo.clicks.toLocaleString()} clicks ·{" "}
            {promo.purchases.toLocaleString()} purchases ·{" "}
            {promo.conversion.toFixed(1)}% conv
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-300">
          <button
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-800 hover:bg-[#fff4e5] dark:hover:bg-amber-900/30 transition-colors"
            onClick={onOpenCampaignsBoard}
          >
            <span>📊</span>
            <span>View in Campaigns Board</span>
          </button>
          {promo.hasContract && (
            <button
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-800 hover:bg-[#fff4e5] dark:hover:bg-amber-900/30 transition-colors"
              onClick={onOpenContract}
            >
              <span>📑</span>
              <span>Open contract</span>
            </button>
          )}
          {promo.hasLives && (
            <button
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-800 hover:bg-[#fff4e5] dark:hover:bg-amber-900/30 transition-colors"
              onClick={onOpenLives}
            >
              <span>📺</span>
              <span>View live sessionz tied to this Promo</span>
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-400">
          Route: <span className="font-mono">/creator/Shoppable-Adz/{"{promoId}"}</span>
        </div>
      </div>
    </section>
  );
}

type ShareAssetsTabProps = {
  promo: Promo;
  showToast: (msg: string) => void;
};

/* TAB 1 – Share & Assets */
function ShareAssetsTab({ promo: _promo, showToast }: ShareAssetsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Section 1 – Creator-specific links */}
      <section className="border border-[#ffd19a] dark:border-amber-900/50 rounded-2xl p-3 md:p-4 bg-[#fff7ef] dark:bg-slate-800 transition-colors">
        <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Your Promo links</h2>
        <p className="text-xs text-slate-600 dark:text-slate-200 mb-2">
          Use these links when sharing this Promo. All purchases through these links are
          attributed to you and counted towards your earnings.
        </p>
        <div className="space-y-2 text-xs">
          <LinkRow
            label="Primary tracking link"
            description="Best for most platforms. Tracks purchases and earnings for this Promo."
            url="https://mylivedealz.com/pr/PR-101?creator=ronald"
            onCopy={() => showToast("Primary link copied")}
          />
          <LinkRow
            label="Instagram Story link"
            description="Swipe-up / sticker link for stories."
            url="https://mldz.ly/pr101/ig-story"
            onCopy={() => showToast("IG Story link copied")}
          />
          <LinkRow
            label="Instagram Feed link"
            description="Use in your IG feed caption or bio link while this Promo is active."
            url="https://mldz.ly/pr101/ig-feed"
            onCopy={() => showToast("IG Feed link copied")}
          />
          <LinkRow
            label="TikTok profile link"
            description="Add to your TikTok bio during the campaign."
            url="https://mldz.ly/pr101/tt"
            onCopy={() => showToast("TikTok link copied")}
          />
          <LinkRow
            label="YouTube Shorts link"
            description="Use in Shorts descriptions or pinned comments."
            url="https://mldz.ly/pr101/yt-shorts"
            onCopy={() => showToast("Shorts link copied")}
          />
          <LinkRow
            label="WhatsApp / Telegram link"
            description="Use in WhatsApp status, broadcast lists or Telegram channels."
            url="https://mldz.ly/pr101/wa"
            onCopy={() => showToast("WhatsApp link copied")}
          />
        </div>

        {/* Region-specific variants */}
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <span className="font-medium text-slate-700 dark:text-slate-100 font-medium transition-colors">
            Region-specific variants
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">
            For some campaigns, links are optimised by region. Use the variant that matches where
            most of your audience is.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
              🌍 Africa link: <span className="font-mono">/africa</span>
            </span>
            <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
              🇬🇧 EU/UK link: <span className="font-mono">/eu-uk</span>
            </span>
            <span className="px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium transition-colors">
              🇨🇳 Asia link: <span className="font-mono">/asia</span>
            </span>
          </div>
        </div>

        {/* QR code */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <div className="flex items-center gap-1">
            <span className="text-slate-700 dark:text-slate-100 font-medium transition-colors">QR code</span>
            <span className="text-tiny text-slate-400 dark:text-slate-400">
              (for posters, live overlays, offline events)
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-16 w-16 rounded-lg bg-white dark:bg-slate-900 border border-[#ffd19a] flex items-center justify-center text-tiny text-slate-500 dark:text-slate-300 transition-colors">
              QR
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <button className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors" onClick={() => showToast("Downloading QR PNG...")}>
                Download QR as PNG
              </button>
              <button className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors" onClick={() => showToast("Added to Live Studio overlay")}>
                Add QR to Live Studio overlay
              </button>
              <button className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" onClick={() => showToast("QR copied to clipboard")}>
                Copy as inline image (posters, decks)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 – Co-branded share assets */}
      <section className="border border-slate-100 dark:border-slate-700 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-800 transition-colors">
        <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-1">Co-branded assets & captions</h2>
        <p className="text-xs text-slate-600 dark:text-slate-200 mb-2">
          Download visuals and captions tailored for different platforms. These are already branded
          as "Special via [you]" and set up for MyLiveDealz.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold dark:font-bold">Images & graphics</h3>
            <AssetTile
              label="IG Story – Co-branded frame"
              usage="Best for IG Story (1080×1920). Add your link sticker and mention the timer."
              onDownload={() => showToast("Download started: IG Story Frame")}
            />
            <AssetTile
              label="Instagram Feed – 1:1/poster"
              usage="Best for IG Feed (square). Good for before/after or shelf shots."
              onDownload={() => showToast("Download started: IG Feed Poster")}
            />
            <AssetTile
              label="TikTok / Shorts vertical cover"
              usage="Best for TikTok & Shorts thumbnails. Use as the first frame or cover."
              onDownload={() => showToast("Download started: Vertical Cover")}
            />
            <AssetTile
              label="WhatsApp Status banner"
              usage="Optimised for WhatsApp Status. Short, bold text."
              onDownload={() => showToast("Download started: WhatsApp Banner")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold dark:font-bold">Caption suggestions</h3>
            <CaptionBlock
              platform="Instagram Story caption"
              text="GlowUp serum is live on MyLiveDealz ✨ Tap my link and grab 20% OFF while the live is on! #ad #GlowUpHub"
              onCopy={() => showToast("IG Story caption copied")}
            />
            <CaptionBlock
              platform="Instagram Feed caption"
              text="My everyday glow routine now has a 20% OFF twist on MyLiveDealz. Save this post, then tap the link in my bio before the timer ends. #ad #BeautyFlash"
              onCopy={() => showToast("IG Feed caption copied")}
            />
            <CaptionBlock
              platform="TikTok script/description"
              text="POV: your glow routine finally fits your budget 😍 GlowUp serum is 20% OFF on MyLiveDealz – link in bio while stock lasts! #ad #GlowUpHub #BeautyFlash"
              onCopy={() => showToast("TikTok caption copied")}
            />
            <CaptionBlock
              platform="YouTube Shorts description"
              text="Quick glow tip ✨ I’m featuring GlowUp serum with 20% OFF on MyLiveDealz. Check the link in the first comment before the offer ends. #ad"
              onCopy={() => showToast("Shorts description copied")}
            />
            <CaptionBlock
              platform="WhatsApp broadcast snippet"
              text="Hey fam, I’m featuring GlowUp serum on MyLiveDealz with 20% OFF during today’s live. Tap my link and order before the timer ends. #ad"
              onCopy={() => showToast("WhatsApp snippet copied")}
            />
          </div>
        </div>
      </section>

      {/* Section 3 – Regulated content notice (Med/Edu/Faith) */}
      <section className="border border-amber-200 dark:border-amber-700 rounded-2xl p-3 md:p-4 bg-amber-50 dark:bg-amber-900/30 text-sm text-amber-900 dark:text-amber-300 transition-colors">
        <div className="flex items-start gap-2">
          <span>⚠️</span>
          <div>
            <h3 className="text-xs font-semibold dark:font-bold mb-1">Faith-compatible / Medical content guidelines</h3>
            <p className="text-xs mb-1">
              For Medical, Education or Faith-compatible campaigns, extra guidelines apply. You must
              review and acknowledge them before sharing.
            </p>
            <ul className="list-disc pl-4 text-xs space-y-0.5">
              <li>Do not promise cures or guaranteed outcomes.</li>
              <li>Include the exact required disclaimer in your caption where indicated.</li>
              <li>Avoid misleading, sensitive or conflicting phrasing.</li>
            </ul>
            <div className="mt-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-1 text-xs">
                <input type="checkbox" className="h-3 w-3" />
                <span>I understand and will comply with these guidelines.</span>
              </label>
              <button className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 text-xs hover:bg-[#fff4e5] transition-colors" onClick={() => showToast("Opening guidelines PDF...")}>
                View full desk guidelines
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Premium extras – Smart packs, AI helper, multi-language CTAs */}
      <SmartSharePacks showToast={showToast} />
      <AiCaptionHelper showToast={showToast} />
      <CtaMultilangPanel showToast={showToast} />
    </div>
  );
}

function SmartSharePacks({ showToast }: { showToast: (msg: string) => void }) {
  return (
    <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎁</span>
          <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50">Smart share packs</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">One-tap sharing per platform</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
        Each pack bundles the best asset, link and caption for that platform. Copy everything in
        one tap and paste directly into your app.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
          <span className="font-semibold text-slate-800 dark:text-slate-50">Instagram Story Share Pack</span>
          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-200 space-y-0.5">
            <li>IG Story co-branded frame</li>
            <li>Story caption + hashtags</li>
            <li>Primary tracking link</li>
          </ul>
          <button
            className="mt-1 self-start px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
            onClick={() => showToast("IG Story Pack copied!")}
          >
            Copy everything for IG Story
          </button>
        </div>
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
          <span className="font-semibold text-slate-800 dark:text-slate-50">TikTok Share Pack</span>
          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-200 space-y-0.5">
            <li>Vertical cover image</li>
            <li>Optimised TikTok caption</li>
            <li>TikTok bio/profile link</li>
          </ul>
          <button
            className="mt-1 self-start px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
            onClick={() => showToast("TikTok Pack copied!")}
          >
            Copy everything for TikTok
          </button>
        </div>
      </div>
    </section>
  );
}

function AiCaptionHelper({ showToast }: { showToast: (msg: string) => void }) {
  const [baseCaption, setBaseCaption] = useState(
    "GlowUp serum is live with 20% OFF on MyLiveDealz. Tap my link before the timer ends! #ad #GlowUpHub"
  );
  const [suggested, setSuggested] = useState("");

  const makeShortTikTok = () => {
    const trimmed = baseCaption.slice(0, 80);
    setSuggested(trimmed + (baseCaption.length > 80 ? "… #ad" : " #ad"));
  };

  const makeFaithTone = () => {
    setSuggested(
      baseCaption +
      "\n\n(Shared in a values-friendly way: focus on care, honesty and balance.)"
    );
  };

  const makeTranslated = (langLabel: string) => {
    const [beforeTags, ...rest] = baseCaption.split("#");
    const hashtags = rest.length ? "#" + rest.join("#") : "";
    const translated =
      `[${langLabel} version] ` + beforeTags.trim() + " " + hashtags.trim();
    setSuggested(translated.trim());
  };

  const handleCopySuggested = () => {
    if (!suggested) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(suggested).catch(() => { });
    }
    showToast("AI-suggested caption copied");
  };

  return (
    <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">AI caption helper</h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-300">Keep your voice, upgrade performance</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
        <div className="flex flex-col gap-1">
          <label className="font-medium text-xs">Base caption</label>
          <textarea
            rows={4}
            className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:border-[#f77f00] outline-none resize-none transition-colors"
            value={baseCaption}
            onChange={(e) => setBaseCaption(e.target.value)}
          />
          <div className="flex flex-wrap gap-1 mt-1 text-xs">
            <button
              className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
              onClick={makeShortTikTok}
            >
              Shorten for TikTok (≤ 80 chars)
            </button>
            <button
              className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
              onClick={makeFaithTone}
            >
              Adapt to Faith-compatible tone
            </button>
            <button
              className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
              onClick={() => makeTranslated("Swahili")}
            >
              Translate to Swahili (keep hashtags)
            </button>
            <button
              className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
              onClick={() => makeTranslated("French")}
            >
              Translate to French (keep hashtags)
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium text-xs">AI-suggested caption</label>
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 min-h-[80px] text-sm text-slate-700 dark:text-slate-100 whitespace-pre-line transition-colors">
            {suggested || (
              <span className="text-xs text-slate-400 dark:text-slate-400">
                Use the buttons on the left to generate a suggested caption.
              </span>
            )}
          </div>
          <button
            className="mt-1 self-start px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 text-xs hover:bg-[#fff4e5] transition-colors"
            onClick={handleCopySuggested}
          >
            Copy suggested caption
          </button>
        </div>
      </div>
    </section>
  );
}

function CtaMultilangPanel({ showToast }: { showToast: (msg: string) => void }) {
  const ctas = [
    { lang: "English", label: "Tap to shop" },
    { lang: "Swahili", label: "Bofya ununue" },
    { lang: "French", label: "Cliquez pour acheter" },
    { lang: "Arabic", label: "اضغط للشراء" },
    { lang: "Portuguese", label: "Toque para comprar" }
  ];

  const copyCta = (label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(label).catch(() => { });
    }
    showToast("CTA text copied: " + label);
  };

  return (
    <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-2 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Multi-language CTA labels</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Use these for overlay text in your Live Studio or when designing external posts.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
        {ctas.map((cta) => (
          <div
            key={cta.lang}
            className="border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 flex flex-col gap-0.5 transition-colors"
          >
            <span className="text-xs text-slate-500 dark:text-slate-300">{cta.lang}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {cta.label}
            </span>
            <button
              className="mt-1 self-start px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
              onClick={() => copyCta(cta.label)}
            >
              Copy for overlay
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type LinkRowProps = {
  label: string;
  description: string;
  url: string;
  onCopy?: () => void;
};

function LinkRow({ label, description, url, onCopy }: LinkRowProps) {
  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => { });
    }
    if (onCopy) onCopy();
    else console.log("Link copied");
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-1 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-200 mb-0.5">
          <span className="font-semibold text-slate-800 dark:text-slate-50">{label}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-300 mb-0.5 truncate md:whitespace-normal">
          {description}
        </p>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-300 truncate">{url}</p>
      </div>
      <div className="flex items-center gap-1 self-start md:self-center">
        <button
          className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 text-xs hover:bg-[#fff4e5] transition-colors"
          onClick={handleCopy}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}

type AssetTileProps = {
  label: string;
  usage: string;
  onDownload?: () => void;
};

function AssetTile({ label, usage, onDownload }: AssetTileProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-start gap-2 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-600 dark:text-slate-200 font-medium transition-colors">
        IMG
      </div>
      <div className="flex-1 flex flex-col gap-0.5 text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-50">{label}</span>
        <span className="text-slate-500 dark:text-slate-300">{usage}</span>
        <button className="mt-1 self-start px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors" onClick={onDownload ? onDownload : undefined}>
          Download
        </button>
      </div>
    </div>
  );
}

type CaptionBlockProps = {
  platform: string;
  text: string;
  onCopy?: () => void;
};

function CaptionBlock({ platform, text, onCopy }: CaptionBlockProps) {
  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => { });
    }
    if (onCopy) onCopy();
    else console.log("Caption copied");
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 flex flex-col gap-1 text-xs transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-800 dark:text-slate-50">{platform}</span>
        <button
          className="px-2.5 py-0.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
          onClick={handleCopy}
        >
          Copy caption
        </button>
      </div>
      <p className="text-slate-600 dark:text-slate-200 whitespace-pre-line">{text}</p>
    </div>
  );
}

/* TAB 2 – Performance & Earnings */
type PerformanceEarningsTabProps = {
  promo: Promo;
  showToast: (msg: string) => void;
};

function PerformanceEarningsTab({ promo, showToast: _showToast }: PerformanceEarningsTabProps) {
  const navigate = useNavigate();
  // Demo numbers
  const impressions = 12000;
  const flatFeePortion = 200;
  const commissionPortion = promo.earnings - flatFeePortion;
  const bonuses = 0;
  const expectedTotal = 1200; // expected earnings for this promo
  const progress = Math.min(promo.earnings / expectedTotal, 1);

  const earningsPerClick = promo.clicks > 0 ? promo.earnings / promo.clicks : 0;
  const earningsPerPurchase =
    promo.purchases > 0 ? promo.earnings / promo.purchases : 0;

  const ctr =
    impressions > 0 ? (promo.clicks / impressions) * 100 : 0;

  const avgPromoCTR = 3.8;
  const avgPromoConv = 4.0;
  const avgEPC = 0.25;
  const currentEPC = earningsPerClick;

  const links = [
    {
      id: 1,
      channel: "Instagram Story",
      clicks: 820,
      impressions: 6000,
      purchases: 48,
      sales: 2200
    },
    {
      id: 2,
      channel: "Instagram Feed",
      clicks: 380,
      impressions: 2600,
      purchases: 18,
      sales: 900
    },
    {
      id: 3,
      channel: "TikTok",
      clicks: 540,
      impressions: 2800,
      purchases: 26,
      sales: 1500
    },
    {
      id: 4,
      channel: "WhatsApp",
      clicks: 320,
      impressions: 1600,
      purchases: 22,
      sales: 1100
    }
  ];

  const bestLink = links.reduce(
    (best, link) => (link.sales > best.sales ? link : best),
    links[0]
  );

  const liveSplits = [
    {
      id: "live",
      label: "During live sessions",
      clicks: 900,
      purchases: 55,
      sales: 2600
    },
    {
      id: "replay",
      label: "Replays",
      clicks: 550,
      purchases: 28,
      sales: 1400
    },
    {
      id: "promo",
      label: "Promo-only shares (no live)",
      clicks: 400,
      purchases: 13,
      sales: 800
    }
  ];

  const [metric, setMetric] = useState<"clicks" | "sales" | "conv">("clicks");
  const [period, setPeriod] = useState("30d"); // 7d | 30d | full

  const trendData: Record<"clicks" | "sales" | "conv", number[]> = {
    clicks: [200, 260, 310, 280, 340, 390, 370],
    sales: [80, 90, 120, 110, 140, 160, 150],
    conv: [3.5, 3.8, 4.2, 3.9, 4.5, 4.8, 4.6]
  };

  const trendLabels = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
  const values = trendData[metric];
  const maxTrend = Math.max(...values, 1);

  const handleOpenRelatedLives = () => {
    navigate("/live-history");
  };

  const handleOpenCampaignBoard = () => {
    navigate("/creator-campaigns");
  };

  const handleOpenContractDetails = () => {
    navigate("/contracts");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section 1 – Promo earnings summary */}
      <section className="border border-[#ffd19a] dark:border-amber-900/50 rounded-2xl p-3 md:p-4 bg-[#fff7ef] dark:bg-slate-800 text-sm flex flex-col gap-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Earnings from this Promo Ad</h2>
            <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
              Your earnings from this specific Promo, broken down by flat fees, commission and
              bonuses.
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs text-slate-500 dark:text-slate-300">Total earned to date</span>
            <span className="text-base font-semibold text-[#f77f00]">
              ${promo.earnings.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900 flex flex-col gap-0.5 transition-colors">
            <span className="text-xs text-slate-500 dark:text-slate-300">Flat fee earned</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
              ${flatFeePortion.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300">Locked regardless of performance.</span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900 flex flex-col gap-0.5 transition-colors">
            <span className="text-xs text-slate-500 dark:text-slate-300">Commission earned</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
              ${commissionPortion.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Grows with every attributed order.
            </span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900 flex flex-col gap-0.5 transition-colors">
            <span className="text-xs text-slate-500 dark:text-slate-300">Bonuses</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
              ${bonuses.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Performance or one-off bonuses (if negotiated).
            </span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900 flex flex-col gap-0.5 transition-colors">
            <span className="text-xs text-slate-500 dark:text-slate-300">Expected total (projection)</span>
            <span className="text-md font-semibold text-slate-900 dark:text-slate-100">
              ~${expectedTotal.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Based on contract & estimated performance.
            </span>
          </div>
        </div>

        {/* Progress meter + next payout */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)] gap-3 mt-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Progress towards expected total
            </span>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden transition-colors">
              <div
                className="h-full rounded-full bg-[#f77f00]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
              You’ve reached{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-50">
                {(progress * 100).toFixed(1)}%
              </span>{" "}
              of the projected earnings for this Promo.
            </span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-900 flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-200 font-medium transition-colors">
            <span className="font-medium text-slate-800 dark:text-slate-50">Next payout</span>
            <span>Estimated date: Nov 15, 2025</span>
            <span>Method: Bank transfer · GlowUp Hub standard schedule</span>
            <span className="text-xs text-slate-500 dark:text-slate-300">
              Usually paid 7 days after month-end when minimum payout threshold is reached.
            </span>
          </div>
        </div>
      </section>

      {/* Section 2 – Attribution & funnel */}
      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Attribution & funnel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              From impressions to clicks to purchases – how this Promo is performing for you.
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            Earnings per click:{" "}
            <span className="font-medium text-[#f77f00]">
              ${earningsPerClick.toFixed(2)} / click
            </span>
            <span className="ml-2">
              Earnings per purchase:{" "}
              <span className="font-medium text-[#f77f00]">
                ${earningsPerPurchase.toFixed(2)} / order
              </span>
            </span>
          </div>
        </div>

        {/* Funnel summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
          <FunnelStep
            label="Impressions / views"
            value={impressions.toLocaleString()}
            sub="People who saw your Promo content"
          />
          <FunnelStep
            label="Link clicks"
            value={promo.clicks.toLocaleString()}
            sub="Traffic you drove to MyLiveDealz"
          />
          <FunnelStep
            label="Purchases"
            value={promo.purchases.toLocaleString()}
            sub="Orders attributed to your links"
          />
          <FunnelStep
            label="Conversion rate"
            value={`${promo.conversion.toFixed(1)}%`}
            sub="Purchases ÷ clicks"
          />
        </div>

        {/* Per-link breakdown */}
        <div className="mt-2">
          <h3 className="text-xs font-semibold mb-1">Per-link performance</h3>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
            <table className="min-w-full text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
              <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-medium transition-colors">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">Channel</th>
                  <th className="text-right px-2 py-1.5 font-medium">Impressions</th>
                  <th className="text-right px-2 py-1.5 font-medium">Clicks</th>
                  <th className="text-right px-2 py-1.5 font-medium">CTR</th>
                  <th className="text-right px-2 py-1.5 font-medium">Purchases</th>
                  <th className="text-right px-2 py-1.5 font-medium">Sales</th>
                  <th className="text-right px-2 py-1.5 font-medium">Tag</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const linkCtr =
                    link.impressions > 0
                      ? (link.clicks / link.impressions) * 100
                      : 0;
                  const isTop = link.id === bestLink.id;
                  return (
                    <tr
                      key={link.id}
                      className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-2 py-1.5">{link.channel}</td>
                      <td className="px-2 py-1.5 text-right">
                        {link.impressions.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {link.clicks.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {linkCtr.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {link.purchases.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        ${link.sales.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {isTop && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-tiny bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Top performer
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live vs non-live split */}
        <div className="mt-2">
          <h3 className="text-xs font-semibold mb-1">Live vs replays vs pure Promo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {liveSplits.map((s) => (
              <div
                key={s.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-900 flex flex-col gap-0.5 transition-colors"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-50">{s.label}</span>
                <span className="text-slate-600 dark:text-slate-200 font-medium">
                  {s.clicks.toLocaleString()} clicks ·{" "}
                  {s.purchases.toLocaleString()} purchases
                </span>
                <span className="text-slate-600 dark:text-slate-200 font-medium">
                  ${s.sales.toLocaleString()} sales
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 – Time-series / trend view */}
      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-3 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Trend over time</h2>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Lightweight trend view for this Promo – use it to spot spikes around lives and
              content changes.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-800 rounded-full transition-colors px-1 py-0.5">
              {["clicks", "sales", "conv"].map((m) => (
                <button
                  key={m}
                  className={`px-2.5 py-0.5 rounded-full ${metric === m
                    ? "bg-[#f77f00] text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                    }`}
                  onClick={() => setMetric(m as "clicks" | "sales" | "conv")}
                >
                  {m === "clicks"
                    ? "Clicks"
                    : m === "sales"
                      ? "Sales"
                      : "Conversion"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-800 rounded-full transition-colors px-1 py-0.5">
              <button
                className={`px-2.5 py-0.5 rounded-full ${period === "7d"
                  ? "bg-[#f77f00] text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                  }`}
                onClick={() => setPeriod("7d")}
              >
                Last 7 days
              </button>
              <button
                className={`px-2.5 py-0.5 rounded-full ${period === "30d"
                  ? "bg-[#f77f00] text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                  }`}
                onClick={() => setPeriod("30d")}
              >
                Last 30 days
              </button>
              <button
                className={`px-2.5 py-0.5 rounded-full ${period === "full"
                  ? "bg-[#f77f00] text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:bg-slate-700"
                  }`}
                onClick={() => setPeriod("full")}
              >
                Full campaign
              </button>
            </div>
          </div>
        </div>

        {/* Conceptual chart (bars) */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
          <div className="flex items-end gap-1 h-24">
            {values.map((v: number, idx: number) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-full flex items-end">
                  <div
                    className="w-full rounded-t-md bg-[#f77f00]"
                    style={{ height: `${(v / maxTrend) * 100}%` }}
                  />
                </div>
                <span className="text-tiny text-slate-500 dark:text-slate-300">{trendLabels[idx]}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-300">
            <span className="font-medium text-slate-700 dark:text-slate-100 mr-1">
              Annotations (conceptual):
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>"Live session here" marker on D3 and D6.</li>
              <li>"Caption changed" marker around D4.</li>
              <li>"New asset used" marker near D5.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 4 – AI suggestions, benchmarks & cross-links */}
      <section className="border border-slate-100 dark:border-slate-800 rounded-2xl p-3 md:p-4 bg-white dark:bg-slate-900 text-sm flex flex-col gap-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">AI suggestions & benchmarks</h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            Based on your Promo performance
          </span>
        </div>

        {/* AI suggestions */}
        <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-200 space-y-1">
          <li>
            Resharing this Promo on{" "}
            <span className="font-medium">IG Story + WhatsApp</span> twice during your usual
            peak window (20:00–21:00) could add approximately{" "}
            <span className="font-medium">$120–$180</span> in commission.
          </li>
          <li>
            Your best performing angle is{" "}
            <span className="font-medium">"glow in 7 days"</span>. Use that in your next{" "}
            <span className="font-medium">2 captions</span> and clips.
          </li>
          <li>
            Conversion here is about{" "}
            <span className="font-medium">1.3× your average in Beauty</span> – this brand
            appears to be a strong fit for your audience.
          </li>
        </ul>

        {/* Benchmarks vs other promos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
            <span className="block text-slate-500 dark:text-slate-300 mb-0.5">CTR vs your average</span>
            <span className="block text-md font-semibold text-slate-900 dark:text-slate-100">
              {ctr.toFixed(1)}% CTR
            </span>
            <span className="block text-slate-500 dark:text-slate-300">
              Your average Promo CTR: {avgPromoCTR.toFixed(1)}%
            </span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
            <span className="block text-slate-500 dark:text-slate-300 mb-0.5">Conversion vs Beauty baseline</span>
            <span className="block text-md font-semibold text-slate-900 dark:text-slate-100">
              {promo.conversion.toFixed(1)}% vs {avgPromoConv.toFixed(1)}%
            </span>
            <span className="block text-slate-500 dark:text-slate-300">
              CTR: top 25% of your Shoppable Adz; conversion slightly above your Beauty baseline.
            </span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors">
            <span className="block text-slate-500 dark:text-slate-300 mb-0.5">Earnings per click (EPC)</span>
            <span className="block text-md font-semibold text-slate-900 dark:text-slate-100">
              ${currentEPC.toFixed(2)} EPC
            </span>
            <span className="block text-slate-500 dark:text-slate-300">
              Your average Promo EPC: ${avgEPC.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Commission leverage hint & what-if scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-[#fff7ef] dark:bg-slate-800 transition-colors">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
              Commission leverage
            </span>
            <p className="text-slate-600 dark:text-slate-200 font-medium">
              This Promo pays <span className="font-medium">5% commission</span>. Based on
              creators with similar performance in Beauty (and your conversion percentile),
              a <span className="font-medium">7–8% commission rate</span> is commonly granted.
              Consider renegotiating before the next cycle with this brand.
            </p>
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col gap-1 transition-colors">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              What-if scenarios
            </span>
            <p className="text-slate-600 dark:text-slate-200 font-medium">
              +0.5 pt CTR → projected extra commission of{" "}
              <span className="font-medium">$60–$90</span> over the current campaign window.
            </p>
            <p className="text-slate-600 dark:text-slate-200 font-medium">
              One additional live tied to this Promo at your average performance → roughly{" "}
              <span className="font-medium">$100–$150</span> more in commission.
            </p>
          </div>
        </div>

        {/* Cross-links from Performance tab */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            className="px-3 py-1.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
            onClick={handleOpenRelatedLives}
          >
            See related lives & replays
          </button>
          <button
            className="px-3 py-1.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
            onClick={handleOpenCampaignBoard}
          >
            Open Campaign in Board
          </button>
          <button
            className="px-3 py-1.5 rounded-full border border-[#f77f00] text-[#f77f00] bg-white dark:bg-slate-900 hover:bg-[#fff4e5] transition-colors"
            onClick={handleOpenContractDetails}
          >
            Open contract details
          </button>
        </div>
      </section>
    </div>
  );
}

type FunnelStepProps = {
  label: string;
  value: string;
  sub: string;
};

function FunnelStep({ label, value, sub }: FunnelStepProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900 flex flex-col gap-0.5 transition-colors">
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <span className="text-md font-semibold text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{sub}</span>
    </div>
  );
}



export { PromoAdDetailPage };
