import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Globe,
  GraduationCap,
  Layers,
  Megaphone,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  Wand2,
  Zap
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useMobile } from "../../hooks/useMobile";
import { formatCurrencyValue } from "../../utils/formatUtils";
import { motion } from "framer-motion";
import { getLandingPageTarget, IS_EVZONE_ACCOUNTS_CONNECTED } from "../../utils/accessControl";

// Creator Platform Website Landing - v3.4.2 (Previewable Canvas)
// ✅ Fixes the syntax error (Unexpected token, expected ",") by restoring valid objects
// ✅ Adz Builder removed
// ✅ suppliers language is correct everywhere:
//    suppliers = Sellers + Providers
//    Sellers = Suppliers of Products
//    Providers = Service Providers
// ✅ Live Studio preview is vertical on mobile
// ✅ Human images are unique (no repeats), with Chinese + Black African portraits included

const ORANGE = "#f77f00";
// const ORANGE_DARK = "#e26f00";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

function formatMoney(n: number, isMobile = false) {
  return formatCurrencyValue("USD", n, { isMobile, maximumFractionDigits: 0 });
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------------ Data ------------------------------ */

const IMAGES = {
  // Unique images: no repeats across the whole page
  // Includes Chinese + Black African portraits
  testimonialUganda:
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=70", // Black African
  testimonialKenya:
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=70", // Black African
  testimonialChina:
    "https://images.unsplash.com/photo-1544168190-79c17527004f?auto=format&fit=crop&w=1200&q=70", // Chinese/Asian

  creative01:
    "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70", // Chinese/Asian
  creative02:
    "https://images.unsplash.com/photo-1530785602389-07594beb8b73?auto=format&fit=crop&w=1200&q=70", // Black African
  creative03:
    "https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=1200&q=70", // Chinese/Asian
  creative04:
    "https://images.unsplash.com/photo-1532076904124-d4e8fe7fbbec?auto=format&fit=crop&w=1200&q=70" // Black African
};

const NAV = [
  { id: "features", label: "Features" },
  { id: "workflow", label: "Workflow" },
  { id: "studio", label: "Studio" },
  { id: "creative", label: "Creative Center" },
  { id: "money", label: "Money" },
  { id: "tiers", label: "Tiers" },
  { id: "trust", label: "Trust" },
  { id: "stories", label: "Stories" },
  { id: "faq", label: "FAQ" }
];

const FEATURES = [
  {
    tag: "Live Sessionz",
    icon: <Video className="h-5 w-5" />,
    title: "Live Sessionz Studio (best-in-class)",
    desc: "Creators make live shopping a premium experience for everyone: fun, trusted and conversion-ready.",
    bullets: [
      "Scenes and overlays presets (intro, deep-dive, countdown, Q&A)",
      "Live sales feed, stock counters, flash deal triggers",
      "Co-host and team roles: Creator, Producer, Moderator",
      "Private viewer attachments queue (approve before showing)",
      "Moment markers while live for instant clipping"
    ]
  },
  {
    tag: "Shoppable Adz",
    icon: <Megaphone className="h-5 w-5" />,
    title: "Shoppable Adz Toolkit",
    desc: "Everything you need to share high-quality products and services properly: links, assets, captions, compliance and performance.",
    bullets: [
      "Per-channel tracking links and short links (unlimited socials)",
      "Co-branded assets in all formats (Story, Feed, Shorts, WhatsApp)",
      "Compliance acknowledgements for sensitive categories",
      "Performance and earnings by link plus live vs replay split"
    ]
  },
  {
    tag: "AI",
    icon: <Wand2 className="h-5 w-5" />,
    title: "Creator AI Assistant (AI)",
    desc: "Daily plan, scripts, timing and performance hints that feel like a coach.",
    bullets: [
      "Today’s best move suggestions by fit and category",
      "Live prompts: objections to address, when to trigger dealz",
      "Caption helper plus multilingual CTAs for overlays",
      "What-if earnings projections and next-tier guidance"
    ]
  },
  {
    tag: "Pipeline",
    icon: <Layers className="h-5 w-5" />,
    title: "Campaigns Board (creator pipeline)",
    desc: "Creators need a pipeline, not scattered lists.",
    bullets: [
      "Leads → Pitches → Negotiating → Active contracts → Completed",
      "Value per stage plus quick filters and templates",
      "Relationship memory per supplier (seller/provider): notes, payout speed, outcomes",
      "Stage clicks jump into negotiation room"
    ]
  },
  {
    tag: "Revenue",
    icon: <DollarSign className="h-5 w-5" />,
    title: "Money-first earnings",
    desc: "Creators care about predictable payouts. We design for money clarity.",
    bullets: [
      "Global money bar: Available · Pending · Projected",
      "Payout schedule per supplier (seller/provider) plus statements and exports",
      "Multi-currency clarity with FX tooltips",
      "Commission leverage hints for smarter negotiations"
    ]
  },
  {
    tag: "Trust",
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Trust, safety and quality guardrails",
    desc: "Professional protection so creators, suppliers (sellers + providers) and buyers feel safe.",
    bullets: [
      "KYC verified badge plus dispute workflows",
      "Quality-first rules for products and services",
      "Contract audit trail and policy versioning",
      "Brand safety dashboard (warnings, guidelines, strikes)"
    ]
  }
];

// ✅ FIXED: valid objects
const TESTIMONIALS = [
  {
    name: "Amina",
    title: "Beauty Creator",
    country: "Uganda",
    stat: "+42% conversion",
    quote:
      "It feels like a real studio. The live sales feed and flash deal timing made my show cleaner and more profitable.",
    image: IMAGES.testimonialUganda
  },
  {
    name: "Jason",
    title: "Tech Creator",
    country: "Kenya",
    stat: "2.1× sales per live",
    quote:
      "The pipeline and negotiation flow keeps everything professional. I can forecast earnings before I accept.",
    image: IMAGES.testimonialKenya
  },
  {
    name: "Li Wei",
    title: "Cross-border Creator",
    country: "China",
    stat: "Faster collabs",
    quote:
      "Shoppable Adz makes attribution and sharing simple. suppliers trust the process and creators look premium.",
    image: IMAGES.testimonialChina
  }
];

// ✅ FIXED: valid objects
const CREATIVE_ITEMS = [
  {
    id: "CC-001",
    kind: "Top Live",
    line: "Products",
    title: "Unbox + proof + CTA in 60 seconds",
    hook: "Stop scrolling. Here is why this bundle is the best deal today.",
    metrics: ["Views 680k", "Watch 11m", "CTR 4.1%"],
    image: IMAGES.creative01
  },
  {
    id: "CC-002",
    kind: "Top Shoppable Adz",
    line: "Products",
    title: "Fit check + size guide + instant buy",
    hook: "If you wear 39, this is your perfect match.",
    metrics: ["Views 410k", "Saves 18k", "Shares 9k"],
    image: IMAGES.creative02
  },
  {
    id: "CC-003",
    kind: "Top Shoppable Adz",
    line: "Services",
    title: "Service booking: before/after + book now",
    hook: "Book in 10 seconds. Here is exactly what you get.",
    metrics: ["Views 220k", "Bookings 1.3k", "Conv 2.9%"],
    image: IMAGES.creative03
  },
  {
    id: "CC-004",
    kind: "Top Live",
    line: "Mixed",
    title: "Price breakdown + honest Q&A",
    hook: "Here is the real price breakdown and why it wins.",
    metrics: ["Views 1.2M", "CTR 3.6%", "Conv 2.2%"],
    image: IMAGES.creative04
  }
];

const FAQS = [
  {
    q: "What do creators do on MyLiveDealz?",
    a: "Creators work in two main areas: Live Sessionz (live shopping shows) and Shoppable Adz (shareable, trackable shoppable campaigns). Together, creators make live shopping a great experience for everyone and drive measurable results."
  },
  {
    q: "What does “Supplier” mean on MyLiveDealz?",
    a: "Supplier is the umbrella term for Sellers and Providers. Sellers supply products. Providers deliver services. Creators can collaborate with both depending on niche, audience and quality standards."
  },
  {
    q: "How do creators earn?",
    a: "Creators can earn through flat fees, commission, or hybrid. The platform shows money-first clarity: available, pending, projected, plus schedules and downloadable statements."
  },
  {
    q: "How is attribution tracked for Shoppable Adz?",
    a: "Shoppable Adz provides creator-specific tracking links per channel. Performance includes clicks, purchases, sales, and live vs replay splits."
  },
  {
    q: "Can creators use a team?",
    a: "Yes. Assign Producer and Moderator roles to manage scenes, products, chat moderation and attachments while you focus on camera and storytelling."
  }
];

/* ------------------------------ Workflow ------------------------------ */

function getWorkflow(track: string, mode: string) {
  const isCreator = track === "Creator";
  const isOpen = mode === "Open";

  if (isCreator && isOpen) {
    return {
      title: "Creator flow (Supplier open to collabs)",
      subtitle:
        "Creators pitch, suppliers (sellers and providers) review, then both move through contract and approvals.",
      steps: [
        {
          icon: "🧩",
          label: "Opportunities Board",
          desc: "Find campaigns looking for creators and submit pitches.",
          hot: true
        },
        {
          icon: "🤝",
          label: "Supplier accepts",
          desc: "A Seller or Provider accepts to start the collaboration space."
        },
        {
          icon: "📄",
          label: "Proposal Inbox",
          desc: "Receive offers, compare terms and confirm next steps."
        },
        {
          icon: "💬",
          label: "Negotiation Room",
          desc: "Adjust deliverables, timelines and compensation (audit trail).",
          hot: true
        },
        {
          icon: "📑",
          label: "Contracts",
          desc: "Final terms become a contract with milestones and pay schedule."
        },
        { icon: "📤", label: "Content Submission", desc: "Submit assets; iterate until approved." },
        {
          icon: "🛡️",
          label: "Approvals",
          desc: "Safety, compliance and quality checks (when applicable)."
        },
        {
          icon: "🗓️",
          label: "Scheduling",
          desc: "Schedule Live Sessionz and Shoppable Adz."
        },
        {
          icon: "📈",
          label: "Execution and Analysis",
          desc: "Deliver outcomes, review analytics, track earnings."
        }
      ]
    };
  }

  if (isCreator && !isOpen) {
    return {
      title: "Creator flow (Invite-only Supplier)",
      subtitle:
        "Invite-only suppliers (sellers and providers) send invitations and proposals to selected creators.",
      steps: [
        { icon: "📨", label: "Invite received", desc: "Accept the invite to proceed.", hot: true },
        {
          icon: "🤝",
          label: "Collaboration space",
          desc: "A trusted relationship is created for the campaign."
        },
        {
          icon: "📄",
          label: "Proposal Inbox",
          desc: "Review the offer and your expected earnings."
        },
        {
          icon: "💬",
          label: "Negotiation Room",
          desc: "Negotiate deliverables, schedule, pay and approvals.",
          hot: true
        },
        {
          icon: "📑",
          label: "Contracts",
          desc: "Contract created after approval; includes milestones."
        },
        { icon: "📤", label: "Content Submission", desc: "Submit content; iterate until approved." },
        {
          icon: "🛡️",
          label: "Approvals",
          desc: "Safety, compliance and quality checks (when applicable)."
        },
        {
          icon: "🗓️",
          label: "Scheduling",
          desc: "Schedule Live Sessionz and Shoppable Adz."
        },
        {
          icon: "📈",
          label: "Execution and Analysis",
          desc: "Deliver outcomes with analytics and earnings."
        }
      ]
    };
  }

  if (!isCreator && isOpen) {
    return {
      title: "Supplier flow (Open to collabs)",
      subtitle:
        "Post campaigns broadly; creators pitch; select and contract the best fit (Seller or Provider).",
      steps: [
        { icon: "📣", label: "Create campaign", desc: "Post a creator-wanted campaign.", hot: true },
        {
          icon: "🧠",
          label: "Review pitches",
          desc: "Compare creator profiles, compatibility scores and stats."
        },
        { icon: "🎯", label: "Select creators", desc: "Choose creators to proceed." },
        {
          icon: "💬",
          label: "Negotiation Room",
          desc: "Align deliverables, schedule and compensation.",
          hot: true
        },
        { icon: "📑", label: "Contracts", desc: "Contract created after both sides accept terms." },
        { icon: "📤", label: "Content Submission", desc: "Finalize content and compliance checks." },
        {
          icon: "🛡️",
          label: "Approvals",
          desc: "Safety, compliance and quality checks (when applicable)."
        },
        { icon: "🗓️", label: "Scheduling", desc: "Schedule Shoppable Adz and Live Sessionz." },
        { icon: "📈", label: "Execution and Analysis", desc: "Execute and measure outcomes." }
      ]
    };
  }

  return {
    title: "Supplier flow (Invite-only)",
    subtitle: "Pick specific creators and send invitations and proposals directly.",
    steps: [
      { icon: "👥", label: "Creator directory", desc: "Browse creators and save favorites.", hot: true },
      { icon: "📨", label: "Send invites", desc: "Invite selected creators to collaborate." },
      { icon: "📄", label: "Proposals", desc: "Send structured proposals with terms." },
      { icon: "💬", label: "Negotiation Room", desc: "Align terms with audit trail.", hot: true },
      { icon: "📑", label: "Contracts", desc: "Contract created after approval." },
      { icon: "📤", label: "Content Submission", desc: "Finalize content and compliance checks." },
      { icon: "🛡️", label: "Approvals", desc: "Safety, compliance and quality checks (when applicable)." },
      { icon: "🗓️", label: "Scheduling", desc: "Schedule Shoppable Adz and Live Sessionz." },
      { icon: "📈", label: "Execution and Analysis", desc: "Execute and measure outcomes." }
    ]
  };
}

/* ------------------------------ UI Bits ------------------------------ */

function Pill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] transition-colors">
      <span className="text-slate-700 dark:text-slate-300">{icon}</span>
      <span className="text-slate-700 dark:text-slate-300">{text}</span>
    </span>
  );
}

function MiniDefinitionCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
          <span className="text-[16px]">{icon}</span>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 transition-colors">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-[16px] font-semibold ${accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}

function FeatureCard({ f }: { f: { icon: React.ReactNode; tag: string; title: string; desc: string; bullets: string[] } }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 h-full transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center text-[#f77f00]">
          {f.icon}
        </div>
        <span className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px]">{f.tag}</span>
      </div>
      <div className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100">{f.title}</div>
      <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{f.desc}</div>
      <div className="mt-4 space-y-2">
        {f.bullets.map((b) => (
          <div key={b} className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-300">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center">
              <Check className="h-3 w-3" />
            </span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PillTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${active ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
    >
      {label}
    </button>
  );
}

function Accordion({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all active:scale-[0.99]">
      <button type="button" className="w-full px-4 py-4 flex items-center justify-between gap-3 active:bg-slate-50 dark:active:bg-slate-800 transition-colors" onClick={onToggle}>
        <div className="text-left">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{q}</div>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="px-4 pb-4 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{a}</div> : null}
    </div>
  );
}

/* ------------------------------ Studio Previews ------------------------------ */

function StudioPreviewLive({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-3">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-colors">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Live preview</div>
          <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            Live
          </span>
        </div>
        <div className="p-3">
          <div className="rounded-3xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Vertical on mobile (9:16) and widescreen on desktop (16:9) */}
            <div className="relative w-full pb-[177.777%] sm:pb-[56.25%]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/30 dark:from-black/20 dark:to-black/60" />

                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/60 border border-white/60 dark:border-white/10 text-[11px] text-slate-900 dark:text-white backdrop-blur-sm">3.4k watching</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 truncate">Pinned deal</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate">Buy now · Stock 38 · Timer running</div>
                    </div>
                    <button className="px-3 py-2 rounded-full bg-[#f77f00] text-white text-[11px] font-semibold hover:bg-[#e26f00] transition-all active:scale-95 active:opacity-90">Buy</button>
                  </div>
                </div>

                <div className="relative z-10 text-[12px] text-slate-700 dark:text-slate-300">Video surface (vertical on mobile)</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MetricCard label="Viewers" value="842" />
            <MetricCard label="Sales" value="37" accent />
            <MetricCard label="Timer" value="00:18:24" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Scenes and overlays</div>
          <div className="mt-2 space-y-2">
            {["Intro", "Deep-dive", "Countdown", "Q&A", "Offer"].map((x, i) => (
              <div key={x} className={`rounded-2xl border p-3 ${i === 2 ? "bg-[#fff4e5] dark:bg-orange-900/30 border-[#ffd19a] dark:border-orange-500/30 text-slate-900 dark:text-slate-100" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}>
                <div className="text-[12px] font-semibold">{x}</div>
                <div className="text-[11px] opacity-80 mt-1">Preset layout plus controls</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Live sales feed</div>
          <div className="mt-2 space-y-2 text-[12px]">
            {[
              { t: "18:41", m: "Order placed (product)" },
              { t: "18:39", m: "Service booking requested" },
              { t: "18:38", m: "Viewer added to cart" }
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-between transition-colors">
                <div className="text-slate-700 dark:text-slate-300">{x.m}</div>
                <div className="text-slate-400 dark:text-slate-500 text-[11px]">{x.t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioPreviewCampaigns({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Campaigns Board (pipeline)</div>
        <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Leads → Pitches → Negotiating → Active contracts → Completed</div>
        <div className="mt-3 space-y-2">
          {[
            { s: "Leads", c: "18", v: "$4.8k" },
            { s: "Pitches", c: "12", v: "$3.2k" },
            { s: "Negotiating", c: "6", v: "$2.1k" },
            { s: "Active", c: "3", v: "$1.4k" }
          ].map((x) => (
            <div key={x.s} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 flex items-center justify-between transition-colors">
              <div>
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{x.s}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{x.c} dealz · {x.v} value</div>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center">
                <ArrowRight className="h-5 w-5" style={{ color: ORANGE }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Relationship memory</div>
        <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Supplier notes (seller/provider), payout speed, past collaborations, private ratings.</div>
        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Example: Supplier</div>
          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">Avg payout: 7 days</div>
          <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Last collab: high conversion live</div>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[12px] text-slate-900 dark:text-slate-100">
            <span style={{ color: ORANGE }}>●</span>
            Trusted relationship
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioPreviewShoppable({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Share and assets</div>
        <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Tracking links, QR codes, captions, co-branded graphics and compliance gating.</div>
        <div className="mt-3 space-y-2">
          {["Primary tracking link", "Per-channel links", "Co-branded assets", "Smart share packs", "Rules and disclosures"].map((x) => (
            <div key={x} className="flex items-start gap-2">
              <span className="h-6 w-6 rounded-full bg-[#f77f00] text-white flex items-center justify-center"><Check className="h-4 w-4" /></span>
              <div className="text-[12px] text-slate-700 dark:text-slate-300">{x}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Performance and earnings</div>
        <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Attribution by link, live vs replay splits, trends and improvement hints.</div>
        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Your earnings</div>
            <div className="text-[14px] font-semibold" style={{ color: ORANGE }}>{formatMoney(820, isMobile)}</div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <MetricCard label="Clicks" value="1,850" />
            <MetricCard label="Purchases" value="96" />
            <MetricCard label="Conv" value="5.2%" accent />
          </div>
          <div className="mt-3 text-[12px] text-slate-600 dark:text-slate-400">
            AI hint: Reshare twice at peak time → projected upside <span className="font-semibold" style={{ color: ORANGE }}>+$140</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudioPreviewEarnings({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Money bar (global)</div>
        <div className="mt-2 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white p-4 flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] text-slate-300">Available</div>
            <div className="text-[14px] font-semibold">{formatMoney(720, isMobile)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-300">Pending</div>
            <div className="text-[14px] font-semibold">{formatMoney(1980, isMobile)}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-300">Projected</div>
            <div className="text-[14px] font-semibold text-amber-300">{formatMoney(3400, isMobile)}</div>
          </div>
          <button className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-semibold text-[12px] transition-all active:scale-95 active:bg-slate-100">View</button>
        </div>
        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Settlement follows your chosen payout method.</div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Statements and exports</div>
        <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Download statements, CSV exports, payout references for reconciliation.</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 transition-all active:scale-95 active:bg-slate-100 dark:active:bg-slate-700">Export CSV</button>
          <button className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-semibold transition-all active:scale-95 active:opacity-90">Download statement</button>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Multi-region clarity</div>
          <div className="mt-2 space-y-2 text-[12px]">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 transition-colors"><div className="text-slate-700 dark:text-slate-200">Africa</div><div className="font-semibold text-slate-900 dark:text-slate-100">USD 1,200 ≈ UGX 4.4M</div></div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 transition-colors"><div className="text-slate-700 dark:text-slate-200">Asia</div><div className="font-semibold text-slate-900 dark:text-slate-100">USD 850 ≈ CNY 6,000</div></div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 transition-colors"><div className="text-slate-700 dark:text-slate-200">EU/US</div><div className="font-semibold text-slate-900 dark:text-slate-100">USD 560</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Creative Center ------------------------------ */

interface CreativeCenterItem {
  id: string;
  kind: string;
  line: string;
  title: string;
  hook: string;
  metrics: string[];
  image: string;
}

function CreativeCenterCard({ item, rank, saved, onToggleSaved }: { item: CreativeCenterItem; rank: number; saved: boolean; onToggleSaved: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white overflow-hidden shadow-sm relative">
      <div className="relative w-full pb-[177.777%]">
        <img src={item.image} alt={item.title} className="absolute inset-0 h-full w-full object-cover opacity-85" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/85" />

        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-b from-[#f77f00] via-[#f77f00]/40 to-white/0 opacity-90" />

        <div className="absolute left-2 top-2 flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold">#{rank}</span>
          <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold">{item.kind}</span>
          <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold">{item.line}</span>
        </div>

        <button type="button" onClick={onToggleSaved} className="absolute right-2 top-2 h-10 w-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center transition-all active:scale-90 active:bg-white/25" aria-label={saved ? "Saved" : "Save"}>
          <Star className={`h-5 w-5 ${saved ? "text-[#f77f00] fill-[#f77f00]" : "text-white"}`} />
        </button>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <Video className="h-7 w-7" />
          </div>
        </div>

        <div className="absolute left-10 right-2 bottom-16 flex flex-wrap gap-1">
          {item.metrics.slice(0, 3).map((m) => (
            <span key={m} className="px-2 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-semibold">{m}</span>
          ))}
        </div>

        <div className="absolute left-10 right-2 bottom-2">
          <div className="text-[12px] font-semibold truncate">{item.title}</div>
          <div className="text-[11px] text-white/80 line-clamp-2">{item.hook}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Money ------------------------------ */

function MoneyModelCard({ icon, title, desc, bullets }: { icon: React.ReactNode; title: string; desc: string; bullets: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 h-full transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center text-[#f77f00]">{icon}</div>
        <span className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px]">Money</span>
      </div>
      <div className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{desc}</div>
      <div className="mt-4 space-y-2">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-300">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center"><Check className="h-3 w-3" /></span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RangeRow({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (v: number) => void }) {
  const display = suffix === "$" ? `$${value}` : suffix ? `${value}${suffix}` : String(value);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{label}</div>
        <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{display}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[#f77f00]" />
    </div>
  );
}

function BreakdownRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 transition-colors">
      <div className="text-[12px] text-slate-600 dark:text-slate-400">{k}</div>
      <div className={`text-[12px] font-semibold ${highlight ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"}`}>{v}</div>
    </div>
  );
}

/* ------------------------------ Added key sections ------------------------------ */

function IntegrationCard() {
  const integrations = ["Instagram", "TikTok", "YouTube", "Facebook", "Snapchat", "X (Twitter)", "Telegram", "WhatsApp", "WeChat", "Any platform"];

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 h-full transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            <Globe className="h-4 w-4" /> Socials
          </div>
          <div className="mt-3 text-[16px] font-semibold text-slate-900 dark:text-slate-100">Connect as many accounts as you have</div>
          <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">Unlimited socials. Shoppable Adz gives per-channel tracking links and share packs.</div>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center">
          <Zap className="h-5 w-5" style={{ color: ORANGE }} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {integrations.map((x) => (
          <span key={x} className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-700 dark:text-slate-300 transition-colors">{x}</span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 transition-colors">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Pro tip</div>
        <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Use smart share packs to copy the best link plus caption plus asset for each platform in one tap.</div>
      </div>
    </div>
  );
}

function EducationCard({ onNav }: { onNav: (p: string) => void }) {
  const lessons = [
    "How to run a flash deal",
    "How to structure a live shopping show",
    "How to write a converting caption",
    "Cross-border basics for creators",
    "Negotiation playbook for commission"
  ];

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 h-full transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            <GraduationCap className="h-4 w-4" style={{ color: ORANGE }} /> Playbooks
          </div>
          <div className="mt-3 text-[16px] font-semibold text-slate-900 dark:text-slate-100">Creator playbooks and training</div>
          <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">Learn how to run better Live Sessionz and convert more with Shoppable Adz.</div>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center">
          <TrendingUp className="h-5 w-5" style={{ color: ORANGE }} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {lessons.map((x) => (
          <div key={x} className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <div className="text-[12px] text-slate-700 dark:text-slate-300">{x}</div>
            <button className="text-[12px] font-semibold transition-all active:scale-90" style={{ color: ORANGE }} onClick={() => { }}>Open</button>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-semibold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all active:scale-[0.98] active:opacity-90" onClick={() => onNav("/home")}>Explore Creator Academy</button>
    </div>
  );
}

function SafetyCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 flex items-center justify-center" style={{ color: ORANGE }}>{icon}</div>
        <div>
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: { image: string; name: string; title: string; country: string; stat: string; quote: string } }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
      <div className="h-44 w-full overflow-hidden">
        <img src={t.image} alt={`${t.name} - creator`} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate text-slate-900 dark:text-slate-100">{t.name}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{t.title} · {t.country}</div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 text-[#8a4b00] dark:text-[#ffaa40] text-[12px] font-semibold whitespace-nowrap">{t.stat}</span>
        </div>
        <p className="mt-3 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">“{t.quote}”</p>
      </div>
    </div>
  );
}

function TierCardRank({ tier, desc, perks, featured, onNav }: { tier: string; desc: string; perks: string[]; featured?: boolean; onNav: (p: string) => void }) {
  return (
    <div className={`rounded-3xl border bg-white dark:bg-slate-900 shadow-sm p-5 ${featured ? "border-[#f77f00] dark:border-orange-500" : "border-slate-200 dark:border-slate-800"} transition-colors`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{tier}</div>
          <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{desc}</div>
        </div>
        <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center ${featured ? "bg-[#fff4e5] dark:bg-orange-900/30 border-[#ffd19a] dark:border-orange-500/30" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
          <Star className={`h-5 w-5 ${featured ? "text-[#f77f00]" : "text-slate-700 dark:text-slate-300"}`} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {perks.map((p) => (
          <div key={p} className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-300">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center"><Check className="h-3 w-3" /></span>
            <span>{p}</span>
          </div>
        ))}
      </div>

      <button className={`mt-5 w-full px-4 py-3 rounded-2xl font-semibold transition-all active:scale-[0.98] ${featured ? "bg-[#f77f00] text-white hover:bg-[#e26f00] active:opacity-90" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 active:bg-slate-100 dark:active:bg-slate-700"}`} onClick={() => onNav("/analytics")}>
        {featured ? "Most popular" : `Explore ${tier}`}
      </button>
    </div>
  );
}

// FooterCol removed (unused)

function CreatorChecklist({ onNav }: { onNav: (p: string) => void }) {
  const items = ["Set your niche categories", "Connect your socials", "Complete KYC", "Add payout method", "Start pitching campaigns"];

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Creator checklist</div>
      <div className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">Join and be ready to earn fast:</div>
      <div className="mt-4 space-y-2">
        {items.map((x) => (
          <div key={x} className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[#f77f00] text-white flex items-center justify-center"><Check className="h-4 w-4" /></span>
            <span className="text-[13px] text-slate-700 dark:text-slate-300">{x}</span>
          </div>
        ))}
      </div>
      <button className="mt-6 w-full px-4 py-3 rounded-2xl bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" onClick={() => onNav("/auth-redirect")}>Start onboarding</button>
      <div className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">Already a creator? <button className="text-[#f77f00] hover:underline" onClick={() => onNav("/auth-redirect")}>Sign in</button></div>
    </div>
  );
}

/* ------------------------------ App ------------------------------ */

export default function CreatorPlatformLanding({ onEnter: _onEnter }: { onEnter: () => void }) {
  const navigate = useNavigate();
  const isMobile = useMobile();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleNav = (path: string) => {
    // All sign-in and join actions route through the auth page
    if (IS_EVZONE_ACCOUNTS_CONNECTED) {
      window.location.href = `https://accounts.evzone.app?target=${encodeURIComponent(path)}`;
      return;
    }
    // INTERIM: Route to the auth redirect notice page so users go through
    // the proper sign-in / sign-up flow instead of being auto-approved.
    navigate("/auth-redirect");
  };

  const [demoTab, setDemoTab] = useState("Live Studio");

  const [workflowTrack, setWorkflowTrack] = useState("Creator");
  const [workflowMode, setWorkflowMode] = useState("Open");

  // Creative Center
  const [creativeLine, setCreativeLine] = useState("All");
  const [creativeSaved, setCreativeSaved] = useState<Record<string, boolean>>({});

  // Money planner
  const PLATFORM_FEE_PCT = 5;
  const [payModel, setPayModel] = useState("Commission");
  const [avgOrderValue, setAvgOrderValue] = useState(60);
  const [estSales, setEstSales] = useState(120);
  const [revSharePct, setRevSharePct] = useState(10);
  const [flatFee, setFlatFee] = useState(250);

  const creators = useCountUp(12000);
  const countries = useCountUp(28);
  const lift = useCountUp(31);

  const workflow = useMemo(() => getWorkflow(workflowTrack, workflowMode), [workflowTrack, workflowMode]);

  const creativeFiltered = useMemo(() => {
    if (creativeLine === "All") return CREATIVE_ITEMS;
    return CREATIVE_ITEMS.filter((x) => x.line === creativeLine);
  }, [creativeLine]);

  // const savedCount = useMemo(() => Object.values(creativeSaved).filter(Boolean).length, [creativeSaved]);

  const toggleSaved = (id: string) => setCreativeSaved((p) => ({ ...p, [id]: !p[id] }));

  const gross =
    payModel === "Flat fee"
      ? flatFee
      : avgOrderValue * estSales * (revSharePct / 100) + (payModel === "Hybrid" ? flatFee : 0);
  const platformFee = gross * (PLATFORM_FEE_PCT / 100);
  const net = gross - platformFee;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 w-full z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <button className="flex items-center gap-2 h-8 md:h-9" onClick={() => scrollToId("top")}>
            <img src="/MyliveDealz PNG Logo 2 Black.png" alt="MyLiveDealz" className="h-full w-auto object-contain dark:hidden" />
            <img src="/MyliveDealz PNG Logo 2 light.png" alt="MyLiveDealz" className="h-full w-auto object-contain hidden dark:block" />
          </button>

          <div className="hidden md:flex items-center gap-6">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollToId(n.id)} className="px-3 py-2 rounded-2xl text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {n.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all active:scale-[0.98] active:opacity-80" onClick={() => handleNav("/auth-redirect")}>
              Sign in <ArrowRight className="h-4 w-4" />
            </button>
            <button className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98] active:opacity-80" style={{ background: ORANGE }} onClick={() => handleNav("/auth-redirect")}>
              Join as a Creator <Sparkles className="h-4 w-4" />
            </button>

            <button className="md:hidden h-10 w-10 flex items-center justify-center rounded-full text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setMobileMenu((v) => !v)} aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenu ? (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
            <div className="max-w-[1600px] mx-auto px-4 py-3 grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => { scrollToId(n.id); setMobileMenu(false); }} className="px-3 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[12px] font-semibold text-slate-700 dark:text-slate-300 transition-all active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-700">
                  {n.label}
                </button>
              ))}
              <button className="col-span-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 transition-all active:scale-[0.98] active:opacity-80" onClick={() => handleNav("/auth-redirect")}>Sign in</button>
              <button className="col-span-1 px-4 py-3 rounded-2xl text-white font-semibold transition-all active:scale-[0.98] active:opacity-80" style={{ background: ORANGE }} onClick={() => handleNav("/auth-redirect")}>Join as a Creator</button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Hero */}
      <div id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff4e5] via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 transition-colors" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 dark:opacity-10 mix-blend-soft-light pointer-events-none" />
        <div className="relative max-w-[1600px] mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-8 md:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-8 items-center">
            <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="flex flex-wrap gap-2">
                <Pill icon={<Video className="h-4 w-4" />} text="Live Sessionz" />
                <Pill icon={<Megaphone className="h-4 w-4" />} text="Shoppable Adz" />
                <Pill icon={<ShieldCheck className="h-4 w-4" />} text="Trust and Quality" />
              </div>

              <h1 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                Creator Studio for premium <span style={{ color: ORANGE }}>Live Sessionz</span> and <span className="ml-2" style={{ color: ORANGE }}>Shoppable Adz</span>
              </h1>

              <p className="mt-4 text-[14px] md:text-[16px] text-slate-600 dark:text-slate-400 max-w-xl">
                Build world-class live shopping experiences and trackable shoppable campaigns. Work with{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">Suppliers (Sellers + Providers)</span>: Sellers supply products, Providers deliver services.
                Promote high-quality offerings and get money-first clarity.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button className="px-5 py-3 rounded-2xl text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" style={{ background: ORANGE }} onClick={() => handleNav("/auth-redirect")}>
                  Join as a Creator <ArrowRight className="h-4 w-4" />
                </button>
                <button className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold inline-flex items-center justify-center gap-2 text-slate-900 dark:text-slate-100 transition-all active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-700" onClick={() => scrollToId("studio")}>
                  See Studio preview <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <MiniDefinitionCard title="Suppliers" desc="Sellers + Providers." icon="🤝" />
                <MiniDefinitionCard title="Sellers" desc="Suppliers of products." icon="🧩" />
                <MiniDefinitionCard title="Providers" desc="Service providers." icon="🛠️" />
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
                <MetricCard label="Creators" value={`${creators.toLocaleString()}+`} accent />
                <MetricCard label="Countries" value={`${countries}+`} />
                <MetricCard label="Avg lift" value={`${lift}%`} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}>
              <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Premium creator workflow</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Built for sellers and providers</div>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px]">Demo</span>
                </div>

                <div className="p-4 grid grid-cols-1 gap-3">
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 transition-colors">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Today’s best move</div>
                    <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">AI suggests the next campaign that fits your audience.</div>
                    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3 flex items-center justify-between transition-colors">
                      <div>
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">High-fit Supplier campaign</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Products + Services · Money-first terms</div>
                      </div>
                      <button className="px-3 py-2 rounded-2xl text-white text-[12px] font-semibold transition-all active:scale-[0.98] active:opacity-90" style={{ background: ORANGE }} onClick={() => handleNav("/opportunities")}>Pitch</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-colors">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Live Sessionz</div>
                      <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Go live with scenes, dealz and moderation.</div>
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px] transition-all cursor-pointer active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/live-studio")}><Video className="h-4 w-4" /> Go Live</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-colors">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Shoppable Adz</div>
                      <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Links, assets and attribution per channel.</div>
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-600 text-[12px] text-slate-900 dark:text-slate-100 transition-all cursor-pointer active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-700" onClick={() => handleNav("/shoppable-marketplace")}><Megaphone className="h-4 w-4" /> Generate</div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 text-white p-4 transition-all cursor-pointer active:scale-[0.99] active:opacity-95" onClick={() => handleNav("/earnings")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-200 dark:text-slate-300">Money bar</div>
                        <div className="text-[16px] font-semibold">Available $720 · Pending $1,980 · Projected $3,400</div>
                      </div>
                      <TrendingUp className="h-5 w-5 text-amber-300" />
                    </div>
                    <div className="mt-2 text-[12px] text-slate-200 dark:text-slate-300">Designed for money-first clarity.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px]"><Sparkles className="h-4 w-4" /> What you get</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">A premium creator platform, end-to-end</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Built for creators who promote high-quality products and services. Clear workflows, trust guardrails and money-first design.</p>
        </motion.div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} f={f} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IntegrationCard />
          <EducationCard onNav={handleNav} />
        </div>
      </div>

      {/* Workflow */}
      <div id="workflow" className="bg-slate-50 dark:bg-slate-900/10 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"><Zap className="h-4 w-4" style={{ color: ORANGE }} /> Workflow</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">A clean flow for creators and suppliers</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Suppliers include <span className="font-semibold text-slate-900 dark:text-slate-100">Sellers (products)</span> and <span className="font-semibold text-slate-900 dark:text-slate-100">Providers (services)</span>. The workflow supports proposals, negotiation, contracts, content approvals, scheduling, execution and analysis.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 inline-flex transition-colors">
                <PillTab label="Creator track" active={workflowTrack === "Creator"} onClick={() => setWorkflowTrack("Creator")} />
                <PillTab label="Supplier track" active={workflowTrack === "Supplier"} onClick={() => setWorkflowTrack("Supplier")} />
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 inline-flex transition-colors">
                <PillTab label="Open to collabs" active={workflowMode === "Open"} onClick={() => setWorkflowMode("Open")} />
                <PillTab label="Invite-only" active={workflowMode === "Invite"} onClick={() => setWorkflowMode("Invite")} />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{workflow.title}</div>
                <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">{workflow.subtitle}</div>
              </div>
              <button className="px-4 py-2 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-semibold inline-flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/task-board")}>
                View full flow <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {workflow.steps.map((s) => (
                <div key={s.label} className={`rounded-3xl border p-4 transition-colors ${s.hot ? "bg-[#fff4e5] dark:bg-orange-900/30 border-[#ffd19a] dark:border-orange-500/30" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[18px]">{s.icon}</div>
                    {s.hot ? <span className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[11px]">Key</span> : null}
                  </div>
                  <div className="mt-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{s.label}</div>
                  <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Studio */}
      <div id="studio" className="max-w-[1600px] mx-auto px-4 md:px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[12px]"><Video className="h-4 w-4" /> Studio previews</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">See the platform, before you build</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Premium components that match how creators work: fast, clear and conversion-ready.</p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 inline-flex transition-colors">
            {["Live Studio", "Campaigns", "Shoppable Adz", "Earnings"].map((t) => (
              <PillTab key={t} label={t} active={demoTab === t} onClick={() => setDemoTab(t)} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          {demoTab === "Live Studio" ? <StudioPreviewLive isMobile={isMobile} /> : null}
          {demoTab === "Campaigns" ? <StudioPreviewCampaigns isMobile={isMobile} /> : null}
          {demoTab === "Shoppable Adz" ? <StudioPreviewShoppable isMobile={isMobile} /> : null}
          {demoTab === "Earnings" ? <StudioPreviewEarnings isMobile={isMobile} /> : null}
        </div>
      </div>

      {/* Creative Center */}
      <div id="creative" className="bg-slate-50 dark:bg-slate-900/50 py-12 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 text-[12px] font-semibold w-fit text-purple-700 dark:text-purple-300"><Wand2 className="h-4 w-4" /> AI and Inspiration</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Creative Center</h2>
            </div>
            <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
              {["All", "Products", "Services", "Mixed"].map((line) => (
                <button
                  key={line}
                  onClick={() => setCreativeLine(line)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${creativeLine === line ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {creativeFiltered.map((item, idx) => (
              <CreativeCenterCard key={item.id} item={item} rank={idx + 1} saved={!!creativeSaved[item.id]} onToggleSaved={() => toggleSaved(item.id)} />
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-colors">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Want the full Creative Center?</div>
              <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Search, filters, rankings, templates and one-click reuse into next live or ad.</div>
            </div>
            <button className="px-4 py-3 rounded-2xl text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" style={{ background: ORANGE }} onClick={() => handleNav("/asset-library")}>
              Open Creative Center <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Money */}
      <div id="money" className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300"><DollarSign className="h-4 w-4" style={{ color: ORANGE }} /> Money</div>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Money models plus Compensation Planner</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Make earnings predictable before you accept. Commission, flat fee or hybrid.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <MoneyModelCard icon={<TrendingUp className="h-5 w-5" />} title="Commission (Revenue share)" desc="Earn a percentage on every sale you drive." bullets={["Best for high-conversion creators", "Scales with performance", "Great for evergreen content"]} />
            <MoneyModelCard icon={<DollarSign className="h-5 w-5" />} title="Flat fee" desc="Get paid a fixed amount per campaign or live." bullets={["Guaranteed pay", "Ideal for launches", "Optional bonus later"]} />
            <MoneyModelCard icon={<Layers className="h-5 w-5" />} title="Hybrid" desc="Combine flat fee with revenue share." bullets={["Guaranteed base plus upside", "Best for premium creators", "Strong for recurring campaigns"]} />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Compensation planner</div>
                  <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Estimate gross, platform fee and net you receive.</div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 inline-flex transition-colors">
                  {["Commission", "Flat fee", "Hybrid"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayModel(m)}
                      className={`px-3 py-1 rounded-xl text-[12px] font-semibold transition-all ${payModel === m ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <RangeRow label="Avg order value" value={avgOrderValue} min={10} max={500} step={5} suffix="$" onChange={setAvgOrderValue} />
                <RangeRow label="Estimated sales" value={estSales} min={10} max={2000} step={10} onChange={setEstSales} />
                <RangeRow label="Revenue share" value={revSharePct} min={1} max={40} step={1} suffix="%" onChange={setRevSharePct} />
                <RangeRow label="Flat fee" value={flatFee} min={0} max={5000} step={50} suffix="$" onChange={setFlatFee} />
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 transition-colors">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Breakdown</div>
                <div className="mt-3 space-y-2">
                  <BreakdownRow k="Gross earnings" v={formatMoney(gross)} />
                  <BreakdownRow k={`Platform fee (example ${PLATFORM_FEE_PCT}%)`} v={formatMoney(platformFee)} />
                  <BreakdownRow k="Net you receive" v={formatMoney(net)} highlight />
                </div>
                <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-500">This is a planning preview. Real terms depend on contract and Supplier agreement.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-colors">
              <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Negotiation advantage</div>
              <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Use data to negotiate properly with Sellers and Providers.</div>

              <div className="mt-4 space-y-2">
                {[{ t: "Ask for hybrid", d: "Lock a base fee plus keep upside." }, { t: "Time your reshares", d: "Peak-time reshares improve conversion." }, { t: "Bundle products plus services", d: "Increase AOV and retention." }].map((x) => (
                  <div key={x.t} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{x.t}</div>
                    <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{x.d}</div>
                  </div>
                ))}
              </div>

              <button className="mt-5 w-full px-4 py-3 rounded-2xl text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" style={{ background: ORANGE }} onClick={() => handleNav("/earnings")}>Open Earnings Dashboard</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div id="tiers" className="bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold w-fit text-slate-700 dark:text-slate-300"><Star className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Creator tiers</div>
              <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Level up with performance</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Bronze → Silver → Gold rewards creators who deliver results and maintain trust. Each tier unlocks better campaigns, priority support and deeper tools.</p>
            </div>
            <button className="px-4 py-3 rounded-2xl bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/analytics")}>View rank requirements</button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <TierCardRank tier="Bronze" onNav={handleNav} desc="Start here. Build trust and consistency." perks={["Access to starter campaigns", "Basic analytics", "Standard support"]} />
            <TierCardRank tier="Silver" onNav={handleNav} featured desc="Your growth tier. More brands, faster dealz." perks={["Priority placement in searches", "Mid-tier budgets", "Better matching plus templates"]} />
            <TierCardRank tier="Gold" onNav={handleNav} desc="Elite tier. Best campaigns and premium support." perks={["Priority support", "High-budget campaigns", "Creator Success program"]} />
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Recommended: Rank criteria preview</div>
              <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Show creators exactly how to reach Silver and Gold: KYC, ratings, delivery quality and dispute rate.</div>
            </div>
            <button className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-semibold transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/analytics")}>Open criteria</button>
          </div>
        </div>
      </div>

      {/* Trust */}
      <div id="trust" className="max-w-[1600px] mx-auto px-4 md:px-6 py-12 transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#fff4e5] dark:bg-orange-900/30 border border-[#ffd19a] dark:border-orange-500/30 text-[12px] font-semibold w-fit text-slate-900 dark:text-slate-100"><ShieldCheck className="h-4 w-4 text-[#f77f00]" /> Trust and Safety</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Professional guardrails</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Premium creators care about protection: contracts, payouts, compliance and brand safety. Quality-first rules help creators promote high-quality products and services.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SafetyCard icon={<BadgeCheck className="h-5 w-5" />} title="KYC verified" desc="Unlock Go Live, higher budgets and trusted collaborations." />
              <SafetyCard icon={<ShieldCheck className="h-5 w-5" />} title="Policies and desks" desc="Clear guidelines and required disclosures where needed." />
              <SafetyCard icon={<Users className="h-5 w-5" />} title="Team roles" desc="Producer and Moderator permissions so you can scale." />
              <SafetyCard icon={<Zap className="h-5 w-5" />} title="Audit trail" desc="Negotiation changes and contract events logged." />
            </div>

            <div className="mt-6">
              <button className="px-4 py-3 rounded-2xl bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/settings")}>Explore safety tools</button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Trust dashboard</div>
                <div className="text-[12px] text-slate-500 dark:text-slate-400">Your safety and compliance status</div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white border border-slate-900 dark:border-slate-700 text-[12px]">Clean · 0 strikes</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Quality-first</div>
                  <span className="text-[12px] px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100">Standards</span>
                </div>
                <div className="mt-2 text-[12px] text-slate-600 dark:text-slate-400">Clear quality and disclosure standards protect creators and buyers.</div>
                <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden"><div className="h-full" style={{ width: "100%", background: ORANGE }} /></div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Account integrity</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3"><div className="text-slate-500 dark:text-slate-400">KYC</div><div className="mt-1 font-semibold" style={{ color: ORANGE }}>Verified</div></div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-3"><div className="text-slate-500 dark:text-slate-400">Security</div><div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">Enabled</div></div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 transition-colors">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Elite Creator program</div>
                <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">Unlock Gold to access priority support, early features and high-budget invites.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div id="stories" className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Creators winning with MyLiveDealz</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Real outcomes: stronger conversion, faster collaborations, clearer earnings.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900 text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 transition-colors">
            <div>
              <div className="text-[14px] font-semibold">Ready to become a top-tier creator?</div>
              <div className="text-[13px] text-slate-200 mt-1">Join MyLiveDealz Creator Studio and build a global creator business.</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className="px-5 py-3 rounded-2xl bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/onboarding")}>Join as a Creator</button>
              <button className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-700" onClick={() => handleNav("/settings")}>Talk to Creator Success</button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq" className="max-w-[1600px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300"><Users className="h-4 w-4" style={{ color: ORANGE }} /> FAQ</div>
            <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100">Frequently asked questions</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl">Everything you need to know before you join.</p>
          </div>
          <button className="px-4 py-3 rounded-2xl bg-[#f77f00] text-white font-semibold hover:bg-[#e26f00] transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/settings")}>Visit Help Center</button>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4 items-start">
          <div className="space-y-3"><FaqList items={FAQS} /></div>
          <CreatorChecklist onNav={handleNav} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex flex-col items-start gap-1 mb-4">
                <div className="h-12 w-auto flex items-center mb-1">
                  <img src="/MyliveDealz PNG Logo 2 Black.png" alt="MyLiveDealz" className="h-full w-auto object-contain dark:hidden" />
                  <img src="/MyliveDealz PNG Logo 2 light.png" alt="MyLiveDealz" className="h-full w-auto object-contain hidden dark:block" />
                </div>
                <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-slate-100 uppercase">Creator Studio</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm">
                The correct way to build a Creator business. Join thousands of creators earning with trust, safety and money-first clarity.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Platform</h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><button onClick={() => scrollToId("workflow")} className="hover:text-[#f77f00]">How it works</button></li>
                <li><button onClick={() => handleNav("/live-studio")} className="hover:text-[#f77f00]">Live Studio</button></li>
                <li><button onClick={() => handleNav("/shoppable-marketplace")} className="hover:text-[#f77f00]">Shoppable Adz</button></li>
                <li><button onClick={() => handleNav("/earnings")} className="hover:text-[#f77f00]">Pricing</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Company</h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-[#f77f00]">About us</a></li>
                <li><a href="#" className="hover:text-[#f77f00]">Careers</a></li>
                <li><a href="#" className="hover:text-[#f77f00]">Press</a></li>
                <li><a href="#" className="hover:text-[#f77f00]">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 dark:text-slate-400 gap-4">
            <div>© 2025 MyLiveDealz. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-200">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-200">Terms of Service</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-slate-200">Cookie Settings</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="rounded-3xl bg-slate-900 text-white border border-slate-800 p-3 flex items-center justify-between gap-2 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold truncate">Join Creator Studio</div>
            <div className="text-[11px] text-slate-300 truncate">Start onboarding and unlock Go Live</div>
          </div>
          <button className="px-4 py-2 rounded-2xl bg-[#f77f00] text-white font-semibold transition-all active:scale-[0.98] active:opacity-90" onClick={() => handleNav("/onboarding")}>Join as a Creator</button>
        </div>
      </div>
    </div>
  );
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      {items.map((f, idx) => (
        <Accordion key={f.q} q={f.q} a={f.a} open={open === idx} onToggle={() => setOpen((p) => (p === idx ? -1 : idx))} />
      ))}
    </div>
  );
}
