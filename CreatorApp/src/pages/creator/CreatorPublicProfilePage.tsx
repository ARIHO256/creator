// Round 1 – Page 3: Public Creator Profile & Portfolio Page
// Premium "mini-site" view for sellers browsing creators.
// EVzone colours: Orange #f77f00, Green #03cd8c, Light Grey #f2f2f2

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { CircularProgress } from "@mui/material";

function CreatorPublicProfilePage() {
  const navigate = useNavigate();
  const { showSuccess, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();

  const [isFollowing, setIsFollowing] = useState(false);

  const toggleFollow = () => {
    run(async () => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 800));
      const newState = !isFollowing;
      setIsFollowing(newState);
    }, { successMessage: !isFollowing ? "You are now following Ronald! 🎉" : "Unfollowed creator" });
  };

  const handleDownloadDeck = () => {
    run(async () => {
      // Simulate a file download
      await new Promise(r => setTimeout(r, 1200));
      const dummyContent = "Creator Description Deck\n\nName: Ronald Isabirye\nStats: ...";
      const blob = new Blob([dummyContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Ronald_Creator_Deck.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, { successMessage: "Download complete! ⬇️" });
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

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f2f2f2] dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors relative">
      <PageHeader
        pageTitle="Public Profile"
        mobileViewType="inline-right"
        rightContent={
          <button
            className={`px-3 py-1 rounded-full border text-sm transition-colors flex items-center gap-2 ${isFollowing
              ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
              : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
              }`}
            onClick={toggleFollow}
            disabled={isPending}
          >
            {isPending && <CircularProgress size={12} color="inherit" />}
            {followLabel}
          </button>
        }
      />

      {/* Hero section */}
      <main className="flex-1 flex flex-col pb-24">
        <section className="relative">
          {/* Banner */}
          <div className="h-20 md:h-24 bg-gradient-to-r from-[#f77f00] via-[#03cd8c] to-[#f77f00]" />
          {/* Hero card */}
          <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 -mt-8 pb-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center md:items-end">
              <div className="flex items-end gap-3 w-full md:w-auto">
                <div className="relative">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-white bg-slate-200 dark:bg-slate-600 transition-colors flex items-center justify-center text-lg md:text-xl font-semibold text-slate-600 dark:text-slate-300">
                    RI
                  </div>
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-[#03cd8c] border-2 border-white flex items-center justify-center text-xs text-white">
                    ✓
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base md:text-lg font-semibold dark:font-bold leading-tight">
                      Ronald Isabirye
                    </h1>
                    <span className="text-sm text-slate-500 dark:text-slate-300">@ronald.creates</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 transition-colors">
                      ⭐ Silver Tier
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 transition-colors">
                      ✓ KYC Verified
                    </span>
                    <span className="text-slate-500 dark:text-slate-300">EVs · Tech · Commerce</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Based in East Africa · Audience in Africa, Asia &amp; Global EV community
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Followers (all platforms)</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">128k+</span>
                  </div>
                  <div className="flex flex-col items-start md:items-end">
                    <span className="text-xs text-slate-500 dark:text-slate-300">Avg live viewers</span>
                    <span className="text-sm font-semibold dark:font-bold dark:text-slate-50">3.2k</span>
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
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-full border text-sm transition-colors flex items-center justify-center gap-2 ${isFollowing
                      ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100"
                      }`}
                    onClick={toggleFollow}
                    disabled={isPending}
                  >
                    {isPending && <CircularProgress size={12} color="inherit" />}
                    {followLabel}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                  <SocialStat icon="📷" label="Instagram" value="48k" />
                  <SocialStat icon="🎵" label="TikTok" value="62k" />
                  <SocialStat icon="▶️" label="YouTube" value="18k" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main body sections */}
        <section className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 items-start">
            {/* Left column: about + performance + portfolio */}
            <div className="flex flex-col gap-4">
              {/* About & positioning */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">About this creator</h2>
                <p className="text-sm text-slate-700 dark:text-slate-100 mb-2">
                  Ronald is a creator focused on electric mobility, tech and cross-border commerce.
                  He blends product education with live shopping to help brands launch into Africa
                  and Asia.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                      Languages &amp; markets
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-200 font-medium">
                      English, basic Swahili · East Africa, Southern Africa, China-facing buyers.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold dark:font-bold text-slate-500 dark:text-slate-300 uppercase mb-1">
                      Category focus
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip>Beauty &amp; Skincare</Chip>
                      <Chip>Tech Gadgets</Chip>
                      <Chip>EV &amp; Mobility</Chip>
                      <Chip>Faith-compatible</Chip>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance snapshot */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">Performance snapshot</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <MetricCard
                    label="Total sales driven"
                    value="$180k+"
                    sub="Across 40+ campaigns"
                  />
                  <MetricCard label="Avg live viewers" value="3.2k" sub="Top 10% in region" />
                  <MetricCard
                    label="Conversion rate"
                    value="4.8%"
                    sub="3.1× platform avg in beauty"
                  />
                  <MetricCard
                    label="Completed collabs"
                    value="38"
                    sub="Across 21 brands"
                  />
                  <MetricCard
                    label="Average rating"
                    value="4.9/5"
                    sub="23 seller reviews"
                  />
                  <MetricCard
                    label="Return customer rate"
                    value="62%"
                    sub="Strong retention"
                  />
                </div>
              </div>

              {/* Campaign portfolio */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <h2 className="text-sm font-semibold dark:font-bold dark:text-slate-50 mb-2">Campaign portfolio</h2>
                <div className="space-y-2.5">
                  <PortfolioCard
                    brand="GlowUp Hub"
                    category="Beauty & Skincare"
                    title="Beauty Flash – 500 units in 45 mins"
                    body="Designed a timed flash segment with tiered bundles. Achieved 2.7× expected sell-through in the first run."
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioCard
                    brand="GadgetMart Africa"
                    category="Tech & Gadgets"
                    title="Tech Friday Mega Live"
                    body="Weekly tech format focused on unboxings and Q&A. Added educational blocks on EV charging."
                    onAction={() => handleAction("View Dealz")}
                  />
                  <PortfolioCard
                    brand="Grace Living Store"
                    category="Faith-compatible wellness"
                    title="Faith & Wellness Morning Dealz"
                    body="Soft-sell morning sessionz for faith-compatible wellness products with high trust and low return rates."
                    onAction={() => handleAction("View Dealz")}
                  />
                </div>
              </div>

              {/* Upcoming & recent lives */}
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
                  <LiveSlotCard
                    label="Upcoming"
                    title="Beauty Flash – Autumn drop"
                    time="Fri · 20:00 EAT"
                    cta="Set reminder"
                    onAction={() => handleAction("Reminder set! ⏰")}
                  />
                  <LiveSlotCard
                    label="Upcoming"
                    title="Tech Friday – EV gadgets"
                    time="Sat · 19:30 EAT"
                    cta="Set reminder"
                    onAction={() => handleAction("Reminder set! ⏰")}
                  />
                  <LiveSlotCard
                    label="Replay"
                    title="Faith & Wellness Morning Dealz"
                    time="Last week · 10:00"
                    cta="Watch replay"
                    onAction={() => handleAction("View replay")}
                  />
                </div>
              </div>

              {/* Reviews & endorsements */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold dark:text-slate-50 dark:font-bold">Reviews &amp; endorsements</h2>
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <span>★★★★★</span>
                    <span className="text-slate-500 dark:text-slate-300">4.9 average (23 reviews)</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  <Review
                    brand="GlowUp Hub"
                    quote="Ronald understands how to keep momentum and still honour our brand voice. Our launch exceeded expectations."
                  />
                  <Review
                    brand="GadgetMart Africa"
                    quote="Great at explaining technical details in simple language. Viewers stayed engaged until the final call-to-action."
                  />
                  <Review
                    brand="Grace Living Store"
                    quote="Very respectful of our faith-compatible guidelines and excellent with community Q&A."
                  />
                </ul>
              </div>
            </div>

            {/* Right column: social + past campaigns + interest tags + compatibility + quick facts */}
            <aside className="flex flex-col gap-4">
              <SocialLinksCard onAction={handleAction} />
              <PastCampaignsCard onAction={handleAction} />
              <InterestTagsCard />
              <CompatibilityCard onAction={() => handleAction("compatibility")} />
              <QuickFactsCard onAction={handleAction} />
            </aside>
          </div>
        </section>
      </main>

    </div>
  );
}

function SocialLinksCard({ onAction }: { onAction: (msg: string) => void }) {
  const socials = [
    {
      id: "tiktok",
      name: "TikTok",
      handle: "@lilianbeauty",
      tag: "TT",
      color: "bg-slate-900"
    },
    {
      id: "instagram",
      name: "Instagram",
      handle: "@lilianbeauty.glow",
      tag: "IG",
      color: "bg-pink-500"
    },
    {
      id: "youtube",
      name: "YouTube",
      handle: "Lilian Beauty Plug",
      tag: "YT",
      color: "bg-red-600"
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-sm font-semibold tracking-tight mb-2 uppercase text-slate-600 dark:text-slate-200 font-medium">
        Social links
      </h2>
      <div className="space-y-1.5">
        {socials.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            onClick={() => {
              // In real app, window.open(...)
              onAction(`Opening ${s.name} profile... ↗`);
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold text-white ${s.color}`}
              >
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

function PastCampaignsCard({ onAction }: { onAction: (msg: string) => void }) {
  const campaigns = [
    {
      id: 1,
      title: "Glow Essentials – Serum + Toner Bundle",
      period: "Mar 14 – Mar 18 · Host",
      gmv: "$6,200",
      ctr: "4.1%",
      conv: "2.8%"
    },
    {
      id: 2,
      title: "Weekend Mask Bar Live",
      period: "Feb 3 – Feb 4 · Guest creator",
      gmv: "$4,200",
      ctr: "3.5%",
      conv: "2.2%"
    },
    {
      id: 3,
      title: "Black Friday Beauty Mega Stream",
      period: "Nov 23 – Nov 25 · Lead host",
      gmv: "$11,150",
      ctr: "4.8%",
      conv: "3.1%"
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold tracking-tight uppercase text-slate-600 dark:text-slate-200 font-medium">
          Past campaigns
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-300">{campaigns.length} Dealz</span>
      </div>
      <div className="space-y-1.5">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="border border-slate-100 dark:border-slate-700 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-800 flex items-start justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                {c.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-300 mb-1">{c.period}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-200 font-medium">
                <span>
                  <span className="font-semibold">GMV {c.gmv}</span>
                </span>
                <span>CTR {c.ctr}</span>
                <span>Conv {c.conv}</span>
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
      </div>
    </div>
  );
}

function InterestTagsCard() {
  const tags = ["#Skincare", "#Serums", "#Live tutorials", "#Discount hunts"];

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
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-300">
        These tags are used by MyLiveDealz to match this creator to relevant Dealz across beauty,
        wellness and lifestyle categories.
      </p>
    </div>
  );
}

function CompatibilityCard({ onAction }: { onAction: (msg: string) => void }) {
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
            82%
          </div>
        </div>
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-200 font-medium">
          <p className="mb-1">
            Strong fit for <span className="font-semibold">beauty</span> and{" "}
            <span className="font-semibold">tech gadget</span> campaigns targeting East Africa and
            cross‑border buyers.
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>High conversions in flash dealz.</li>
            <li>Audience overlap with your markets.</li>
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

function QuickFactsCard({ onAction }: { onAction: (msg: string) => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl transition-colors shadow-sm p-4 md:p-5 text-sm">
      <h2 className="text-xs font-semibold mb-2">Quick collaboration facts</h2>
      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200 font-medium">
        <li>Typical live duration: 60–90 minutes.</li>
        <li>Preferred collaboration: flat fee + performance bonus.</li>
        <li>Comfortable with multi-language guidance (EN + local notes).</li>
        <li>Open to long-term partnerships and product series.</li>
      </ul>
      <button
        className="mt-3 w-full py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 transition-colors"
        onClick={() => onAction("Downloading deck... ⬇️")}
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

export { CreatorPublicProfilePage };
