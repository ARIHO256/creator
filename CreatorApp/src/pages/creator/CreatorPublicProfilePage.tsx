import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useApiResource } from "../../hooks/useApiResource";
import { readAuthSession } from "../../lib/authSession";
import { creatorApi } from "../../lib/creatorApi";
import type { CreatorPublicProfileResponse } from "../../lib/creatorApi";

type SocialLink = {
  id: string;
  name: string;
  handle: string;
  tag: string;
  color: string;
  href?: string | null;
  followers?: string | number | null;
};

type PortfolioItem = {
  id: string;
  brand: string;
  category: string;
  title: string;
  body: string;
};

type LiveSlotItem = {
  id: string;
  label: string;
  title: string;
  time: string;
  cta: string;
};

type ReviewItem = {
  id: string;
  brand: string;
  quote: string;
};

type PastCampaignItem = {
  id: string;
  title: string;
  period: string;
  gmv: string;
  ctr: string;
  conv: string;
};

type PerformanceItem = {
  label: string;
  value: string;
  sub: string;
};

function CreatorPublicProfilePage() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();

  const session = readAuthSession();
  const profileUserId = session?.id ?? "";
  const hasSellerProfile = Boolean(
    session?.sellerProfile &&
    typeof session.sellerProfile === "object" &&
    Object.keys(session.sellerProfile).length > 0
  );

  const { data } = useApiResource<CreatorPublicProfileResponse>({
    enabled: Boolean(profileUserId),
    initialData: {},
    loader: async () => creatorApi.creatorPublicProfile(profileUserId),
    onError: () => {
      showNotification("Unable to load profile data right now.", "error");
    }
  });

  const creator = data.creator ?? {};

  const creatorName = creator.name || "";
  const creatorHandle = creator.handle || "";
  const creatorInitials = creator.initials || "";
  const creatorAvatarUrl = String(creator.avatarUrl || "").trim();
  const creatorTier = creator.tier || "";
  const creatorVerified = Boolean(creator.verified);
  const creatorBio = creator.bio || "";
  const creatorCategories = creator.categories?.length ? creator.categories : [];
  const creatorLanguages = creator.languages?.length ? creator.languages : [];
  const creatorMarkets = creator.markets?.length ? creator.markets : [];

  const performance = useMemo<PerformanceItem[]>(
    () =>
      data.performance?.length
        ? data.performance.map((item) => ({
            label: item.label || "",
            value: item.value || "",
            sub: item.sub || ""
          }))
        : [],
    [data.performance]
  );

  const portfolio = useMemo<PortfolioItem[]>(
    () =>
      data.portfolio?.length
        ? data.portfolio.map((item, index) => ({
            id: item.id || `portfolio-${index + 1}`,
            brand: item.brand || "",
            category: item.category || "",
            title: item.title || "",
            body: item.body || ""
          }))
        : [],
    [data.portfolio]
  );

  const liveSlots = useMemo<LiveSlotItem[]>(
    () =>
      data.liveSlots?.length
        ? data.liveSlots.map((item, index) => ({
            id: item.id || `live-slot-${index + 1}`,
            label: item.label || "Upcoming",
            title: item.title || "",
            time: item.time || "",
            cta: item.cta || "Set reminder"
          }))
        : [],
    [data.liveSlots]
  );

  const reviews = useMemo<ReviewItem[]>(
    () =>
      data.reviews?.length
        ? data.reviews.map((item, index) => ({
            id: item.id || `review-${index + 1}`,
            brand: item.brand || "",
            quote: item.quote || ""
          }))
        : [],
    [data.reviews]
  );

  const socials = useMemo<SocialLink[]>(
    () =>
      data.socials?.length
        ? data.socials.map((item, index) => ({
            id: item.id || `social-${index + 1}`,
            name: item.name || "",
            handle: item.handle || "",
            tag: item.tag || item.name?.slice(0, 2)?.toUpperCase() || "",
            color: item.color || "bg-slate-900",
            href: item.href || null,
            followers: item.followers
          }))
        : [],
    [data.socials]
  );

  const pastCampaigns = useMemo<PastCampaignItem[]>(
    () =>
      data.pastCampaigns?.length
        ? data.pastCampaigns.map((item, index) => ({
            id: item.id || `campaign-${index + 1}`,
            title: item.title || "",
            period: item.period || "",
            gmv: item.gmv || "",
            ctr: item.ctr || "",
            conv: item.conv || ""
          }))
        : [],
    [data.pastCampaigns]
  );

  const tags = data.tags?.length ? data.tags : [];
  const quickFacts = data.quickFacts?.length ? data.quickFacts : [];
  const compatibility = data.compatibility ?? {
    score: 0,
    summary: "Compatibility insights will appear once enough campaign and audience data is available.",
    bullets: ["No compatibility bullets yet."]
  };

  const rating = typeof creator.rating === "number" && creator.rating > 0 ? creator.rating : 0;
  const reviewCount = typeof creator.reviewCount === "number" && creator.reviewCount >= 0 ? creator.reviewCount : reviews.length;

  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    setIsFollowing(Boolean(creator.isFollowing));
  }, [creator.id, creator.isFollowing]);

  const handleDownloadDeck = () => {
    run(
      async () => {
        const content =
          data.deckContent ||
          [
            "Creator Description Deck",
            "",
            `Name: ${creatorName}`,
            `Handle: ${creatorHandle}`,
            `Tier: ${creatorTier}`,
            `Followers: ${creator.followersLabel || "—"}`,
            `Categories: ${creatorCategories.join(", ") || "—"}`,
            `Languages: ${creatorLanguages.join(", ") || "—"}`,
            `Markets: ${creatorMarkets.join(", ") || "—"}`
          ].join("\n");

        const blob = new Blob([content], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${creatorName.replace(/\s+/g, "_")}_Creator_Deck.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      { successMessage: "Download complete! ⬇️", errorMessage: "Unable to download description deck." }
    );
  };

  const toggleFollow = () => {
    if (!hasSellerProfile || (creator.id && creator.id === profileUserId)) {
      showNotification("Following creators is only available from a seller account.", "info");
      return;
    }
    const nextState = !isFollowing;
    run(
      async () => {
        const targetCreatorId = creator.id || profileUserId;
        if (targetCreatorId) {
          await creatorApi.followCreator(targetCreatorId, nextState);
        }
        setIsFollowing(nextState);
      },
      {
        successMessage: nextState ? `You are now following ${creatorName.split(" ")[0]}! 🎉` : "Unfollowed creator",
        errorMessage: "Unable to update follow status right now."
      }
    );
  };

  const handleInvite = () => {
    showNotification("Redirecting to invite page...", "info");
    setTimeout(() => navigate("/invites"), 500);
  };

  const handleAction = (action: string) => {
    if (action.includes("View Dealz")) {
      navigate("/creator-campaigns");
    } else if (action.includes("View replay")) {
      navigate("/live-history");
    } else if (action.includes("Calendar") || action.includes("Reminder")) {
      navigate("/live-schedule");
    } else if (action.includes("compatibility")) {
      navigate("/analytics");
    } else if (action.includes("Download deck")) {
      handleDownloadDeck();
    } else {
      showNotification(action, "info");
    }
  };

  const followLabel = isFollowing ? "Unfollow creator" : "Follow this creator";
  const heroSocials = socials.slice(0, 3);
  const canFollowCreator = hasSellerProfile && (!creator.id || creator.id !== profileUserId);

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors relative">
      <PageHeader
        pageTitle="Public Profile"
        mobileViewType="inline-right"
        rightContent={
          <button
            className={`px-3 py-1 rounded-full border text-sm transition-colors flex items-center gap-2 ${
              isFollowing
                ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
            }`}
            onClick={toggleFollow}
            disabled={isPending || !canFollowCreator}
          >
            {isPending && <CircularProgress size={12} color="inherit" />}
            {followLabel}
          </button>
        }
      />

      <main className="flex-1 flex flex-col pb-24">
        <section className="relative">
          <div className="h-20 md:h-24 bg-gradient-to-r from-[#f77f00] via-[#03cd8c] to-[#f77f00]" />
          <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 -mt-8 pb-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center md:items-end">
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div className="relative">
                  {creatorAvatarUrl ? (
                    <img
                      src={creatorAvatarUrl}
                      alt={creatorName}
                      className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-white object-cover bg-slate-200 dark:bg-slate-600 transition-colors"
                    />
                  ) : (
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-white bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-lg md:text-xl font-semibold text-slate-600 dark:text-slate-300">
                      {creatorInitials}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[#03cd8c] border-2 border-white flex items-center justify-center text-xs text-white">
                    {creatorVerified ? "✓" : "•"}
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base md:text-lg font-semibold dark:font-bold leading-tight">{creatorName}</h1>
                    <span className="text-sm text-slate-500 dark:text-slate-300">{creatorHandle}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 transition-colors">
                      ⭐ {creatorTier}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 transition-colors">
                      ✓ KYC Verified
                    </span>
                    <span className="text-slate-500 dark:text-slate-300">{creatorCategories.slice(0, 3).join(" · ") || "No categories yet"}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Based in {creator.region || "N/A"} · Audience in {creatorMarkets.slice(0, 3).join(", ") || "N/A"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Followers (all platforms)</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">{creator.followersLabel || "—"}</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Avg live viewers</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">{creator.avgLiveViewersLabel || "—"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <button
                    className="flex-1 md:flex-none px-3 py-1.5 rounded-full bg-[#f77f00] text-white text-sm font-semibold dark:font-bold hover:bg-[#e26f00]"
                    onClick={handleInvite}
                  >
                    Invite to collaborate
                  </button>
                  <button
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-full border text-sm transition-colors flex items-center justify-center gap-2 ${
                      isFollowing
                        ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
                    }`}
                    onClick={toggleFollow}
                    disabled={isPending || !canFollowCreator}
                  >
                    {isPending && <CircularProgress size={12} color="inherit" />}
                    {followLabel}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                  {heroSocials.map((social) => (
                    <SocialStat
                      key={social.id}
                      icon={resolveSocialIcon(social.name)}
                      label={social.name}
                      value={resolveSocialMetric(social)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 items-start">
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">About this creator</h2>
                <p className="text-sm text-slate-700 dark:text-slate-100 mb-2">{creatorBio}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                      Languages &amp; markets
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
                      {creatorLanguages.join(", ") || "N/A"} · {creatorMarkets.join(", ") || "N/A"}.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                      Category focus
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {creatorCategories.slice(0, 6).map((category) => (
                        <Chip key={category}>{category}</Chip>
                      ))}
                      {!creatorCategories.length && <Chip>N/A</Chip>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">Performance snapshot</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {performance.slice(0, 6).map((item, index) => (
                    <MetricCard key={`${item.label}-${index}`} label={item.label} value={item.value} sub={item.sub} />
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">Campaign portfolio</h2>
                <div className="space-y-2.5">
                  {portfolio.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      brand={item.brand}
                      category={item.category}
                      title={item.title}
                      body={item.body}
                      onAction={() => handleAction("View Dealz")}
                    />
                  ))}
                  {!portfolio.length && (
                    <PortfolioCard
                      brand="No campaign data"
                      category="N/A"
                      title="No campaign portfolio yet"
                      body="Campaign portfolio data will appear after campaigns are available."
                    />
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Upcoming &amp; recent lives</h2>
                  <button
                    className="text-xs text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:text-slate-50"
                    onClick={() => handleAction("Calendar")}
                  >
                    View calendar
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {liveSlots.map((item) => (
                    <LiveSlotCard
                      key={item.id}
                      label={item.label}
                      title={item.title}
                      time={item.time}
                      cta={item.cta}
                      onAction={() =>
                        item.cta.toLowerCase().includes("watch")
                          ? handleAction("View replay")
                          : handleAction("Reminder set! ⏰")
                      }
                    />
                  ))}
                  {!liveSlots.length && <LiveSlotCard label="Upcoming" title="No live slots yet" time="Schedule pending" cta="Set reminder" />}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Reviews &amp; endorsements</h2>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <span>★★★★★</span>
                    <span className="text-slate-500 dark:text-slate-300">
                      {rating.toFixed(1)} average ({reviewCount} reviews)
                    </span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {reviews.map((review) => (
                    <Review key={review.id} brand={review.brand} quote={review.quote} />
                  ))}
                  {!reviews.length && <Review brand="No reviews yet" quote="Reviews will appear after completed collaborations." />}
                </ul>
              </div>
            </div>

            <aside className="flex flex-col gap-4">
              <SocialLinksCard socials={socials} onAction={handleAction} />
              <PastCampaignsCard campaigns={pastCampaigns} onAction={handleAction} />
              <InterestTagsCard tags={tags} />
              <CompatibilityCard compatibility={compatibility} onAction={() => handleAction("compatibility")} />
              <QuickFactsCard facts={quickFacts} onAction={handleDownloadDeck} />
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function SocialLinksCard({ socials, onAction }: { socials: SocialLink[]; onAction: (msg: string) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">
        Social links
      </h2>
      <div className="space-y-1.5">
        {socials.map((social) => (
          <div
            key={social.id}
            className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={() => {
              if (social.href) {
                window.open(social.href, "_blank", "noopener,noreferrer");
                return;
              }
              onAction(`Opening ${social.name} profile... ↗`);
            }}
          >
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold text-white ${social.color}`}>
                {social.tag}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-50">{social.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">{social.handle}</span>
              </div>
            </div>
            <button className="h-7 w-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:text-slate-100 font-medium transition-colors">
              <span className="text-xs">↗</span>
            </button>
          </div>
        ))}
        {!socials.length && (
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-300">No social links yet</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PastCampaignsCard({
  campaigns,
  onAction
}: {
  campaigns: PastCampaignItem[];
  onAction: (msg: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-slate-600 dark:text-slate-200 font-medium">
          Past campaigns
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-300">{campaigns.length} Dealz</span>
      </div>
      <div className="space-y-1.5">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 flex items-start justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{campaign.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{campaign.period}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span>
                  <span className="font-semibold">GMV {campaign.gmv}</span>
                </span>
                <span>CTR {campaign.ctr}</span>
                <span>Conv {campaign.conv}</span>
              </div>
            </div>
            <button
              className="text-xs whitespace-nowrap px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-900 dark:hover:bg-slate-700 transition-colors"
              onClick={() => onAction("View Dealz")}
            >
              View Dealz ↗
            </button>
          </div>
        ))}
        {!campaigns.length && (
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-300">No past campaigns yet</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InterestTagsCard({ tags }: { tags: string[] }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">
        Interest tags
      </h2>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors"
          >
            {tag}
          </span>
        ))}
        {!tags.length && (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-100 font-medium transition-colors">
            N/A
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        These tags are used by MyLiveDealz to match this creator to relevant Dealz across beauty,
        wellness and lifestyle categories.
      </p>
    </div>
  );
}

function CompatibilityCard({
  compatibility,
  onAction
}: {
  compatibility: { score?: number; summary?: string; bullets?: string[] };
  onAction: (msg: string) => void;
}) {
  const score = typeof compatibility.score === "number" ? `${Math.max(0, Math.min(100, Math.round(compatibility.score)))}%` : "0%";
  const bullets = compatibility.bullets?.length ? compatibility.bullets : ["No compatibility bullets yet."];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold">Compatibility score</h2>
        <span className="text-xs text-slate-400 dark:text-slate-400">Visible to you only</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300 mb-2">
        Based on category, region, and audience match between your brand and this creator.
      </p>
      <div className="flex items-center gap-3 mb-2">
        <div className="relative h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-colors">
          <div className="h-11 w-11 rounded-full bg-[#f77f00] text-white flex items-center justify-center text-sm font-semibold dark:text-slate-50 dark:font-bold">
            {score}
          </div>
        </div>
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <p className="mb-1">{compatibility.summary || "Compatibility insights will appear once enough campaign and audience data is available."}</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {bullets.slice(0, 2).map((bullet, index) => (
              <li key={`${bullet}-${index}`}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>
      <button
        className="w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={() => onAction("Generating full report... 🧠")}
      >
        See full compatibility breakdown
      </button>
    </div>
  );
}

function QuickFactsCard({ facts, onAction }: { facts: string[]; onAction: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-xs font-semibold mb-2">Quick collaboration facts</h2>
      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
        {facts.slice(0, 4).map((fact, index) => (
          <li key={`${fact}-${index}`}>{fact}</li>
        ))}
      </ul>
      <button
        className="mt-3 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={onAction}
      >
        Download description deck
      </button>
    </div>
  );
}

type SocialStatProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function SocialStat({ icon, label, value }: SocialStatProps) {
  return (
    <div className="inline-flex items-center gap-1">
      <span>{icon}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

type ChipProps = {
  children: React.ReactNode;
};

function Chip({ children }: ChipProps) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 font-medium transition-colors">
      {children}
    </span>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  sub: string;
};

function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col justify-between transition-colors">
      <span className="text-xs text-slate-500 dark:text-slate-300 mb-0.5">{label}</span>
      <span className="text-sm font-semibold dark:text-slate-50 dark:font-bold mb-0.5">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-300">{sub}</span>
    </div>
  );
}

type PortfolioCardProps = {
  brand: string;
  category: string;
  title: string;
  body: string;
  onAction?: () => void;
};

function PortfolioCard({ brand, category, title, body, onAction }: PortfolioCardProps) {
  return (
    <article className="border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-slate-500 dark:text-slate-300">
            {brand} · {category}
          </span>
        </div>
        <button
          className="text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
          onClick={onAction}
        >
          View replay
        </button>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">{body}</p>
    </article>
  );
}

type LiveSlotCardProps = {
  label: string;
  title: string;
  time: string;
  cta: string;
  onAction?: () => void;
};

function LiveSlotCard({ label, title, time, cta, onAction }: LiveSlotCardProps) {
  return (
    <div className="min-w-[180px] border border-slate-100 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800 flex flex-col justify-between text-sm transition-colors">
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 mb-1 transition-colors">
          {label}
        </span>
        <h3 className="text-sm font-semibold mb-0.5">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-300">{time}</p>
      </div>
      <button
        className="mt-2 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={onAction}
      >
        {cta}
      </button>
    </div>
  );
}

type ReviewProps = {
  brand: string;
  quote: string;
};

function Review({ brand, quote }: ReviewProps) {
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

function resolveSocialIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("instagram")) return "📷";
  if (normalized.includes("tiktok")) return "🎵";
  if (normalized.includes("youtube")) return "▶️";
  return "🔗";
}

function resolveSocialMetric(link: SocialLink) {
  if (typeof link.followers === "number") {
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(link.followers);
  }
  if (typeof link.followers === "string" && link.followers.trim()) {
    return link.followers;
  }
  return "—";
}

export { CreatorPublicProfilePage };
