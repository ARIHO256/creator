'use client';

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import AdBuilder from "./AdBuilder_SupplierFacing";
import { LiveBuilderDrawer } from "./LiveBuilder2";
import { AdzPerformanceDrawer } from "./AdzPerformance";
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Copy,
  ExternalLink,
  Filter,
  Heart,
  Info,
  Layers,
  Link2,
  MoreHorizontal,
  Package,
  Play,
  Plus,
  Minus,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Timer,
  TrendingUp,
  Video,
  Wand2,
  Bell,
  BadgeCheck,
  MessageSquare,
  Send,
  ShoppingBag,
  X,
  Zap
} from "lucide-react";

/**
 * Dealz Marketplace (Premium) — Regenerated
 * ----------------------------------------
 * Hub for:
 * - Shoppable Adz
 * - Live Sessionz
 * - Live + Shoppables (Hybrid)
 *
 * This rebuild is aligned to:
 * - The latest Shoppable Ad template/preview used in Ad Builder (campaign-first, shareable preview, overlays, viewers)
 * - The Live Builder promo-link (live session invite) preview pattern (mobile-first phone mockup + item viewer)
 *
 * Wiring conventions used (update routes to match your app):
 * - /ad-builder?embed=drawer&returnTo=/dealz-marketplace            (Shoppable builder)
 * - /live-builder?embed=drawer&returnTo=/dealz-marketplace          (Live builder)
 * - /adz-performance?adId=...&returnTo=/dealz-marketplace           (Adz Performance for shoppable)
 */

const ORANGE = "#f77f00";
const cx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const ROUTES = {
  dealzMarketplace: "/dealz-marketplace",
  adBuilder: "/ad-builder",
  liveBuilder: "/live-builder",
  adzPerformance: "/adz-performance",
  assetLibrary: "/supplier/deliverables/assets"
};

// function safeNav(url: string) {
//   if (typeof window === "undefined") return;
//   window.location.assign(url);
// }

type ViewerMode = "fullscreen" | "modal";
type CountdownState = "upcoming" | "live" | "ended";

type Creator = { name: string; handle: string; avatarUrl: string; verified?: boolean };
type Supplier = { name: string; category: string; logoUrl: string };

type HostRole = "Creator" | "Supplier";
type CreatorUsageDecision = "I will use a Creator" | "I will NOT use a Creator" | "I am NOT SURE yet";
type CollaborationMode = "Open for Collabs" | "Invite-Only" | "(n/a)";
type ApprovalMode = "Manual" | "Auto";

type OfferType = "PRODUCT" | "SERVICE";

type Offer = {
  id: string;
  type: OfferType;
  name: string;
  price: number;
  basePrice?: number;
  currency: "UGX" | "USD";
  stockLeft: number; // -1 unlimited
  sold: number;
  posterUrl: string; // recommended: 500×500
  videoUrl?: string;
  desktopMode?: ViewerMode;
};

type ShoppableAd = {
  id: string;
  status: "Draft" | "Generated";
  campaignName: string;
  campaignSubtitle: string;
  supplier: Supplier;
  creator: Creator;
  platforms: string[];

  startISO: string;
  endISO: string;

  heroImageUrl: string; // required: 1920×1080
  heroIntroVideoUrl?: string;
  heroIntroVideoPosterUrl?: string;
  heroDesktopMode?: ViewerMode;

  offers: Offer[];

  ctaPrimaryLabel: string;
  ctaSecondaryLabel: string;

  kpis: Array<{ label: string; value: string }>;
};

type LiveItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  priceLabel: string;
  stockLeft: number; // -1 unlimited
  posterUrl: string; // recommended 500×500
  videoUrl?: string;
};

type LiveInvite = {
  id: string;
  status: "Draft" | "Scheduled" | "Live" | "Ended";
  title: string;
  description: string;
  host: Creator;
  supplier?: Supplier;
  platforms: string[];
  startISO: string;
  endISO: string;
  timezoneLabel: string;

  promoLink: string;

  heroImageUrl: string; // required 1920×1080
  heroVideoUrl?: string;
  heroDesktopMode?: ViewerMode;

  featured: LiveItem[];
};

type DealType = "Shoppable Adz" | "Live Sessionz" | "Live + Shoppables";
type Deal = {
  id: string;
  type: DealType;
  title: string;
  tagline: string;
  supplier: Supplier;
  creator: Creator;
  hostRole?: HostRole;
  creatorUsage?: CreatorUsageDecision;
  collabMode?: CollaborationMode;
  approvalMode?: ApprovalMode;
  startISO: string;
  endISO: string;

  shoppable?: ShoppableAd;
  live?: LiveInvite;

  notes?: string;
};

function money(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d > 0 ? `${d}d ` : ""}${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function computeCountdownState(now: number, start: number, end: number): CountdownState {
  if (now < start) return "upcoming";
  if (now >= end) return "ended";
  return "live";
}

function useCountdown(targetISO: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const target = new Date(targetISO).getTime();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const sec = Math.floor((diff % (1000 * 60)) / 1000);
  return { d, h, m, sec, diff };
}


function supplierHandle(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `@${normalized || "supplier"}`;
}

function supplierAsHost(supplier: Supplier): Creator {
  return {
    name: supplier.name,
    handle: supplierHandle(supplier.name),
    avatarUrl: supplier.logoUrl,
    verified: true
  };
}

function getHostRole(deal: Deal): HostRole {
  return deal.hostRole || "Creator";
}

function getCreatorUsage(deal: Deal): CreatorUsageDecision {
  return deal.creatorUsage || "I will use a Creator";
}

function getCollabMode(deal: Deal): CollaborationMode {
  return deal.collabMode || "Open for Collabs";
}

function getApprovalMode(deal: Deal): ApprovalMode {
  return deal.approvalMode || "Manual";
}

function hostRoleLabel(deal: Deal) {
  return getHostRole(deal) === "Supplier" ? "Supplier-hosted" : "Creator-hosted";
}

function creatorUsageTone(value: CreatorUsageDecision): "neutral" | "good" | "warn" {
  if (value === "I will NOT use a Creator") return "warn";
  if (value === "I will use a Creator") return "good";
  return "neutral";
}

function hostRoleTone(value: HostRole): "brand" | "good" {
  return value === "Supplier" ? "brand" : "good";
}

function approvalTone(value: ApprovalMode): "good" | "warn" {
  return value === "Auto" ? "good" : "warn";
}

function GovernancePills({ deal }: { deal: Deal }) {
  const hostRole = getHostRole(deal);
  const creatorUsage = getCreatorUsage(deal);
  const collabMode = getCollabMode(deal);
  const approvalMode = getApprovalMode(deal);

  return (
    <>
      <Pill tone={hostRoleTone(hostRole)}>{hostRoleLabel(deal)}</Pill>
      <Pill tone={creatorUsageTone(creatorUsage)}>{creatorUsage}</Pill>
      <Pill tone="neutral">Collab: {collabMode}</Pill>
      <Pill tone={approvalTone(approvalMode)}>Approval: {approvalMode}</Pill>
    </>
  );
}

function applySupplierDealDefaults(deal: Deal): Deal {
  const supplierHostedDealIds = new Set(["deal_6", "deal_7", "deal_10"]);
  const hostRole: HostRole = supplierHostedDealIds.has(deal.id) ? "Supplier" : (deal.hostRole || "Creator");
  const creatorUsage: CreatorUsageDecision =
    deal.creatorUsage || (hostRole === "Supplier" ? "I will NOT use a Creator" : "I will use a Creator");
  const collabMode: CollaborationMode =
    deal.collabMode || (hostRole === "Supplier" ? "(n/a)" : deal.type === "Live Sessionz" ? "Invite-Only" : "Open for Collabs");
  const approvalMode: ApprovalMode =
    deal.approvalMode || (deal.type === "Live Sessionz" ? "Auto" : "Manual");
  const host = hostRole === "Supplier" ? supplierAsHost(deal.supplier) : deal.creator;

  return {
    ...deal,
    creator: host,
    hostRole,
    creatorUsage,
    collabMode,
    approvalMode,
    shoppable: deal.shoppable ? { ...deal.shoppable, creator: host } : deal.shoppable,
    live: deal.live ? { ...deal.live, host, supplier: deal.supplier } : deal.live
  };
}

const SUPPLIERS: Supplier[] = [
  { name: "Acme Co", category: "Retail", logoUrl: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop" },
  { name: "Global Traders", category: "Wholesale", logoUrl: "https://images.unsplash.com/photo-1554774853-719586f8c277?w=100&h=100&fit=crop" }
];

const CREATORS: Creator[] = [
  { name: "Jane Doe", handle: "@jane", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", verified: true },
  { name: "John Smith", handle: "@john", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" }
];

const DEALZ_SEED: Deal[] = [
  {
    id: "deal_1",
    type: "Shoppable Adz",
    title: "Summer Sale",
    tagline: "Best dealz of the season",
    supplier: SUPPLIERS[0],
    creator: CREATORS[0],
    startISO: new Date().toISOString(),
    endISO: new Date(Date.now() + 86400000).toISOString(),
    notes: "Sample deal",
    shoppable: {
      id: "ad_1",
      status: "Generated",
      campaignName: "Summer Sale",
      campaignSubtitle: "Best dealz",
      supplier: SUPPLIERS[0],
      creator: CREATORS[0],
      platforms: ["Instagram"],
      startISO: new Date().toISOString(),
      endISO: new Date(Date.now() + 86400000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
      ctaPrimaryLabel: "Shop Now",
      ctaSecondaryLabel: "Add to Cart",
      offers: [
        {
          id: "offer_1",
          type: "PRODUCT",
          name: "Summer Dress",
          price: 50,
          currency: "USD",
          stockLeft: 10,
          sold: 5,
          posterUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80"
        }
      ],
      kpis: [{ label: "CTR", value: "2.5%" }]
    }
  },
  {
    id: "deal_2",
    type: "Live Sessionz",
    title: "Tech Unboxing Live",
    tagline: "First look at the latest gadgets",
    supplier: SUPPLIERS[1],
    creator: CREATORS[1],
    startISO: new Date(Date.now() + 3600000).toISOString(),
    endISO: new Date(Date.now() + 7200000).toISOString(),
    live: {
      id: "live_2",
      status: "Scheduled",
      title: "Tech Unboxing Live",
      description: "Unboxing the newest smartphones and laptops from Global Traders.",
      host: CREATORS[1],
      supplier: SUPPLIERS[1],
      platforms: ["YouTube", "TikTok"],
      startISO: new Date(Date.now() + 3600000).toISOString(),
      endISO: new Date(Date.now() + 7200000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80",
      promoLink: "https://example.com/live/2",
      featured: [
        {
          id: "item_2_1",
          kind: "product",
          name: "Pro Smartphone X",
          priceLabel: "$999",
          stockLeft: 20,
          posterUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80"
        }
      ]
    }
  },
  {
    id: "deal_3",
    type: "Live + Shoppables",
    title: "Eco-Friendly Fashion",
    tagline: "Sustainable style for everyone",
    supplier: SUPPLIERS[0],
    creator: CREATORS[0],
    startISO: new Date().toISOString(),
    endISO: new Date(Date.now() + 172800000).toISOString(),
    shoppable: {
      id: "ad_3",
      status: "Generated",
      campaignName: "Eco Fashion Hub",
      campaignSubtitle: "Wear the future",
      supplier: SUPPLIERS[0],
      creator: CREATORS[0],
      platforms: ["Instagram", "Pinterest"],
      startISO: new Date().toISOString(),
      endISO: new Date(Date.now() + 172800000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
      ctaPrimaryLabel: "Shop Sustainable",
      ctaSecondaryLabel: "Sustainability Guide",
      offers: [
        {
          id: "offer_3_1",
          type: "PRODUCT",
          name: "Organic Cotton Tee",
          price: 35,
          currency: "USD",
          stockLeft: 50,
          sold: 12,
          posterUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80"
        }
      ],
      kpis: [{ label: "Conversion", value: "3.2%" }]
    },
    live: {
      id: "live_3",
      status: "Live",
      title: "Sustainable Styling",
      description: "Live styling session with eco-friendly clothes.",
      host: CREATORS[0],
      supplier: SUPPLIERS[0],
      platforms: ["Instagram"],
      startISO: new Date().toISOString(),
      endISO: new Date(Date.now() + 7200000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
      promoLink: "https://example.com/live/3",
      featured: [
        {
          id: "item_3_1",
          kind: "product",
          name: "Organic Cotton Tee",
          priceLabel: "$35",
          stockLeft: 50,
          posterUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80"
        }
      ]
    }
  },
  {
    id: "deal_4",
    type: "Shoppable Adz",
    title: "Masterclass: Video Editing",
    tagline: "Learn from the best",
    supplier: SUPPLIERS[1],
    creator: CREATORS[1],
    startISO: new Date(Date.now() - 86400000).toISOString(),
    endISO: new Date(Date.now() + 604800000).toISOString(),
    shoppable: {
      id: "ad_4",
      status: "Generated",
      campaignName: "Editor's Masterclass",
      campaignSubtitle: "Advanced techniques",
      supplier: SUPPLIERS[1],
      creator: CREATORS[1],
      platforms: ["LinkedIn", "YouTube"],
      startISO: new Date(Date.now() - 86400000).toISOString(),
      endISO: new Date(Date.now() + 604800000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80",
      ctaPrimaryLabel: "Enroll Now",
      ctaSecondaryLabel: "Free Preview",
      offers: [
        {
          id: "offer_4_1",
          type: "SERVICE",
          name: "Full Masterclass Access",
          price: 199,
          currency: "USD",
          stockLeft: -1,
          sold: 450,
          posterUrl: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=400&q=80"
        }
      ],
      kpis: [{ label: "ROAS", value: "4.8x" }]
    }
  },
  {
    id: "deal_5",
    type: "Live + Shoppables",
    title: "Gamer's Setup Live",
    tagline: "Performance gear for pros",
    supplier: SUPPLIERS[1],
    creator: CREATORS[1],
    startISO: new Date(Date.now() + 7200000).toISOString(),
    endISO: new Date(Date.now() + 10800000).toISOString(),
    shoppable: {
      id: "ad_5",
      status: "Generated",
      campaignName: "Gaming Excellence",
      campaignSubtitle: "Level up your game",
      supplier: SUPPLIERS[1],
      creator: CREATORS[1],
      platforms: ["Twitch", "YouTube"],
      startISO: new Date(Date.now() + 7200000).toISOString(),
      endISO: new Date(Date.now() + 10800000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
      ctaPrimaryLabel: "View Hardware",
      ctaSecondaryLabel: "Setup Guide",
      offers: [
        {
          id: "offer_5_1",
          type: "PRODUCT",
          name: "Mechanical Keyboard",
          price: 120,
          currency: "USD",
          stockLeft: 15,
          sold: 8,
          posterUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80"
        }
      ],
      kpis: [{ label: "CTR", value: "4.1%" }]
    },
    live: {
      id: "live_5",
      status: "Scheduled",
      title: "Pro Gaming Setup",
      description: "Live review of the best gaming peripherals available.",
      host: CREATORS[1],
      supplier: SUPPLIERS[1],
      platforms: ["Twitch"],
      startISO: new Date(Date.now() + 7200000).toISOString(),
      endISO: new Date(Date.now() + 10800000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
      promoLink: "https://example.com/live/5",
      featured: [
        {
          id: "item_5_1",
          kind: "product",
          name: "Mechanical Keyboard",
          priceLabel: "$120",
          stockLeft: 15,
          posterUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&q=80"
        }
      ]
    }
  },
  {
    id: "deal_6",
    type: "Shoppable Adz",
    title: "Organic Skincare Routine",
    tagline: "Glowing skin naturally",
    supplier: SUPPLIERS[0],
    creator: CREATORS[0],
    startISO: new Date(Date.now() - 43200000).toISOString(),
    endISO: new Date(Date.now() + 43200000).toISOString(),
    shoppable: {
      id: "ad_6",
      status: "Generated",
      campaignName: "Nature's Glow",
      campaignSubtitle: "Organic solutions",
      supplier: SUPPLIERS[0],
      creator: CREATORS[0],
      platforms: ["Instagram", "TikTok"],
      startISO: new Date(Date.now() - 43200000).toISOString(),
      endISO: new Date(Date.now() + 43200000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
      ctaPrimaryLabel: "Get Serum",
      ctaSecondaryLabel: "Routine Tips",
      offers: [
        {
          id: "offer_6_1",
          type: "PRODUCT",
          name: "Vitamin C Serum",
          price: 45,
          currency: "USD",
          stockLeft: 30,
          sold: 110,
          posterUrl: "https://images.unsplash.com/photo-1594125355935-db633f815b3c?w=400&q=80"
        }
      ],
      kpis: [{ label: "ROAS", value: "3.5x" }]
    }
  },
  {
    id: "deal_7",
    type: "Live Sessionz",
    title: "Home Office Refresh",
    tagline: "Workspace for productivity",
    supplier: SUPPLIERS[1],
    creator: CREATORS[0],
    startISO: new Date(Date.now() + 86400000).toISOString(),
    endISO: new Date(Date.now() + 90000000).toISOString(),
    live: {
      id: "live_7",
      status: "Scheduled",
      title: "Office Productivity Live",
      description: "Upgrade your home office with these professional tools.",
      host: CREATORS[0],
      supplier: SUPPLIERS[1],
      platforms: ["YouTube"],
      startISO: new Date(Date.now() + 86400000).toISOString(),
      endISO: new Date(Date.now() + 90000000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80",
      promoLink: "https://example.com/live/7",
      featured: [
        {
          id: "item_7_1",
          kind: "product",
          name: "Ergonomic Desk Chair",
          priceLabel: "$250",
          stockLeft: 5,
          posterUrl: "https://images.unsplash.com/photo-1505843490701-515a00ae48f0?w=400&q=80"
        }
      ]
    }
  },
  {
    id: "deal_8",
    type: "Shoppable Adz",
    title: "Healthy Cooking Masterclass",
    tagline: "Quick & delicious meals",
    supplier: SUPPLIERS[0],
    creator: CREATORS[1],
    startISO: new Date(Date.now() + 172800000).toISOString(),
    endISO: new Date(Date.now() + 259200000).toISOString(),
    shoppable: {
      id: "ad_8",
      status: "Generated",
      campaignName: "Healthy Eats",
      campaignSubtitle: "Cook like a pro",
      supplier: SUPPLIERS[0],
      creator: CREATORS[1],
      platforms: ["Facebook", "Instagram"],
      startISO: new Date(Date.now() + 172800000).toISOString(),
      endISO: new Date(Date.now() + 259200000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      ctaPrimaryLabel: "Browse Recipes",
      ctaSecondaryLabel: "Get Ingredients",
      offers: [
        {
          id: "offer_8_1",
          type: "SERVICE",
          name: "Live Cooking Class Access",
          price: 50,
          currency: "USD",
          stockLeft: 100,
          sold: 5,
          posterUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=80"
        }
      ],
      kpis: [{ label: "CTR", value: "2.8%" }]
    }
  },
  {
    id: "deal_9",
    type: "Live Sessionz",
    title: "Eco-Home Workshop",
    tagline: "Sustainable living tips",
    supplier: SUPPLIERS[0],
    creator: CREATORS[0],
    startISO: new Date(Date.now() + 345600000).toISOString(),
    endISO: new Date(Date.now() + 349200000).toISOString(),
    live: {
      id: "live_9",
      status: "Scheduled",
      title: "Eco-Home Workshop",
      description: "Learn how to make your home more sustainable with simple changes.",
      host: CREATORS[0],
      supplier: SUPPLIERS[0],
      platforms: ["LinkedIn"],
      startISO: new Date(Date.now() + 345600000).toISOString(),
      endISO: new Date(Date.now() + 349200000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80",
      promoLink: "https://example.com/live/9",
      featured: [
        {
          id: "item_9_1",
          kind: "product",
          name: "Bamboo Utensil Set",
          priceLabel: "$15",
          stockLeft: 100,
          posterUrl: "https://images.unsplash.com/photo-1610557870699-a46737482812?w=400&q=80"
        }
      ]
    }
  },
  {
    id: "deal_10",
    type: "Live + Shoppables",
    title: "Yoga & Mindfulness",
    tagline: "Find your balance",
    supplier: SUPPLIERS[1],
    creator: CREATORS[0],
    startISO: new Date().toISOString(),
    endISO: new Date(Date.now() + 604800000).toISOString(),
    shoppable: {
      id: "ad_10",
      status: "Generated",
      campaignName: "Zen Lifestyle",
      campaignSubtitle: "Mindful movements",
      supplier: SUPPLIERS[1],
      creator: CREATORS[0],
      platforms: ["Instagram", "Meta"],
      startISO: new Date().toISOString(),
      endISO: new Date(Date.now() + 604800000).toISOString(),
      heroImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
      ctaPrimaryLabel: "View Mats",
      ctaSecondaryLabel: "Free Session",
      offers: [
        {
          id: "offer_10_1",
          type: "PRODUCT",
          name: "Premium Yoga Mat",
          price: 60,
          currency: "USD",
          stockLeft: 40,
          sold: 150,
          posterUrl: "https://images.unsplash.com/photo-1592176372045-2199e8006241?w=400&q=80"
        }
      ],
      kpis: [{ label: "Conversion", value: "5.4%" }]
    },
    live: {
      id: "live_10",
      status: "Live",
      title: "Morning Yoga Flow",
      description: "Start your day with a calming yoga session.",
      host: CREATORS[0],
      supplier: SUPPLIERS[1],
      platforms: ["Instagram"],
      startISO: new Date().toISOString(),
      endISO: new Date(Date.now() + 3600000).toISOString(),
      timezoneLabel: "GMT+3",
      heroImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
      promoLink: "https://example.com/live/10",
      featured: [
        {
          id: "item_10_1",
          kind: "product",
          name: "Premium Yoga Mat",
          priceLabel: "$60",
          stockLeft: 40,
          posterUrl: "https://images.unsplash.com/photo-1592176372045-2199e8006241?w=400&q=80"
        }
      ]
    }
  }
].map((deal) => applySupplierDealDefaults(deal));

const shoppable1 = DEALZ_SEED[0].shoppable!;
const live1: LiveInvite = {
  id: "live_1",
  status: "Draft",
  title: "Summer Sale Live",
  description: "Join us for the summer sale live event!",
  supplier: SUPPLIERS[0],
  host: CREATORS[0],
  platforms: ["Instagram", "TikTok"],
  startISO: new Date().toISOString(),
  endISO: new Date(Date.now() + 3600000).toISOString(),
  heroImageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80",
  promoLink: "https://example.com/live/1",
  timezoneLabel: "GMT+3",
  featured: []
};

function Pill({
  tone = "neutral",
  children,
  title
}: {
  tone?: "neutral" | "good" | "warn" | "bad" | "brand" | "pro";
  children: React.ReactNode;
  title?: string;
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800"
        : tone === "bad"
          ? "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800"
          : tone === "pro"
            ? "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-800"
            : tone === "brand"
              ? "text-white"
              : "bg-neutral-100 text-neutral-800 ring-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  children,
  onClick,
  disabled,
  left,
  className,
  title
}: {
  tone?: "neutral" | "primary" | "ghost";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  left?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "text-white hover:brightness-95"
      : tone === "ghost"
        ? "bg-transparent text-neutral-900 hover:bg-neutral-100 dark:text-slate-100 dark:hover:bg-slate-800"
        : "bg-white text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700";

  return (
    <button
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
    >
      {left}
      {children}
    </button>
  );
}

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "w-full max-w-[980px]",
  zIndex = "z-[90]"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  zIndex?: string;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className={cx("fixed inset-0", zIndex)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cx(
              "absolute top-0 right-0 bottom-0 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors",
              width
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-neutral-200 dark:border-slate-800 px-5 py-4 shrink-0">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
                {subtitle ? <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400 truncate">{subtitle}</div> : null}
              </div>
              <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
                Close
              </Btn>
            </div>
            <div className="flex-1 overflow-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  mode = "modal"
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  mode?: ViewerMode;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
        window.removeEventListener("keydown", onKey);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute inset-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-slate-800 px-4 py-3 shrink-0">
          <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <Btn tone="ghost" onClick={onClose} left={<X className="h-4 w-4" />}>
            Close
          </Btn>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function AdBuilderDrawer({ open, onClose, adId }: { open: boolean; onClose: () => void; adId?: string }) {
  // AdBuilder typically uses URL search params or local storage for its context.
  // We can wrap it in a custom drawer.
  return (
    <Drawer open={open} onClose={onClose} title="Ad Builder (Supplier)" width="w-full max-w-[1240px]" zIndex="z-[100]">
      <AdBuilder />
    </Drawer>
  );
}

function PlayOverlayButton({
  onClick,
  label,
  size = "lg"
}: {
  onClick: () => void;
  label: string;
  size?: "lg" | "md";
}) {
  const outer = size === "md" ? "h-12 w-12" : "h-14 w-14";
  const inner = size === "md" ? "h-10 w-10" : "h-12 w-12";
  const icon = size === "md" ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute left-1/2 top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center active:scale-[0.99]"
    >
      <span className={cx(outer, "rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-neutral-200 dark:border-slate-700 grid place-items-center shadow transition-colors")}>
        <span className={cx(inner, "rounded-full bg-neutral-900 dark:bg-slate-100 grid place-items-center")}>
          <Play className={cx(icon, "text-white dark:text-slate-900")} fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

function StockBar({ sold, stockLeft }: { sold: number; stockLeft: number }) {
  if (stockLeft < 0) return null;
  const s = Math.max(0, sold);
  const left = Math.max(0, stockLeft);
  const total = Math.max(1, s + left);
  const pct = Math.min(1, s / total);
  return (
    <div className="mt-2 text-neutral-600 dark:text-slate-400">
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span>{left} left</span>
        <span>{s} sold</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-neutral-200 dark:bg-slate-800 overflow-hidden transition-colors">
        <div className="h-full rounded-full" style={{ width: `${Math.round(pct * 100)}%`, background: ORANGE }} />
      </div>
    </div>
  );
}

function CountdownPill({ startsAt, endsAt }: { startsAt: Date; endsAt: Date }) {
  const now = Date.now();
  const state = computeCountdownState(now, startsAt.getTime(), endsAt.getTime());
  const target = state === "upcoming" ? startsAt.toISOString() : endsAt.toISOString();
  const cd = useCountdown(target);
  const label = state === "upcoming" ? "Starts in" : state === "live" ? "Ends in" : "Ended";
  const tone = state === "upcoming" ? "good" : state === "live" ? "brand" : "neutral";

  return (
    <Pill tone={tone === "brand" ? "brand" : tone} title={label}>
      <Timer className="h-3.5 w-3.5" />
      {label}
      {state === "ended" ? null : (
        <span className="ml-1 font-extrabold">
          {cd.d > 0 ? `${cd.d}d ` : ""}
          {pad2(cd.h)}:{pad2(cd.m)}:{pad2(cd.sec)}
        </span>
      )}
    </Pill>
  );
}

/** ------------------------------ Unified Viewer ------------------------------ */

type ViewerCtx =
  | {
    domain: "shoppable";
    kind: "hero" | "offer";
    offerId?: string;
    title: string;
    videoUrl: string;
    posterUrl?: string;
    desktopMode?: ViewerMode;
  }
  | {
    domain: "live";
    kind: "hero" | "item";
    itemId?: string;
    title: string;
    videoUrl: string;
    posterUrl?: string;
    desktopMode?: ViewerMode;
  };

function UnifiedMediaViewer({
  open,
  onClose,
  ctx,
  mode,
  countdownState,
  countdownLabel,
  stockLabel,
  priceLabel,
  ctaPrimary,
  ctaSecondary,
  onBuyNow,
  onAddToCart,
  loved,
  onLove,
  onShare,
  chooser,
  chooserTitle
}: {
  open: boolean;
  onClose: () => void;
  ctx: ViewerCtx | null;
  mode: ViewerMode;
  countdownState: CountdownState;
  countdownLabel: string;
  stockLabel?: { tone: "warn" | "bad" | "neutral"; text: string } | null;
  priceLabel?: string;
  ctaPrimary: string;
  ctaSecondary: string;
  onBuyNow: () => void;
  onAddToCart: () => void;
  loved: boolean;
  onLove: () => void;
  onShare: () => void;
  chooser?: React.ReactNode;
  chooserTitle?: string;
}) {
  if (!ctx) return null;

  return (
    <Modal open={open} onClose={onClose} title={ctx.title} mode={mode}>
      <div className={cx("relative overflow-hidden rounded-3xl bg-black", mode === "fullscreen" ? "h-[70vh] md:h-[78vh]" : "aspect-video")}>
        <video src={ctx.videoUrl} poster={ctx.posterUrl} controls playsInline autoPlay className="absolute inset-0 h-full w-full object-contain bg-black" />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <Pill tone="brand">
              <Zap className="h-3.5 w-3.5" />
              {ctx.domain === "live" ? "Live Sessionz" : "Shoppable Adz"}
            </Pill>
            <Pill tone={countdownState === "live" ? "brand" : countdownState === "upcoming" ? "good" : "neutral"}>
              <Timer className="h-3.5 w-3.5" />
              {countdownLabel}
            </Pill>
            {stockLabel ? (
              <Pill tone={stockLabel.tone === "bad" ? "bad" : stockLabel.tone === "warn" ? "warn" : "neutral"}>
                <Info className="h-3.5 w-3.5" />
                {stockLabel.text}
              </Pill>
            ) : null}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onLove} left={<Heart className={cx("h-4 w-4", loved && "fill-red-500 text-red-500")} />}>
                {loved ? "Loved" : "Love"}
              </Btn>
            </span>
            <span className="pointer-events-auto">
              <Btn tone="ghost" onClick={onShare} left={<Share2 className="h-4 w-4" />}>
                Share
              </Btn>
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
            {priceLabel ? (
              <div className="mb-2 text-white">
                <div className="text-xs text-white/80">Selected</div>
                <div className="text-base md:text-lg font-extrabold">{priceLabel}</div>
              </div>
            ) : null}

            {chooser ? (
              <div className="mb-3">
                {chooserTitle ? <div className="text-xs font-bold text-white/80">{chooserTitle}</div> : null}
                <div className="mt-2">{chooser}</div>
              </div>
            ) : null}

            <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row">
              <Btn tone="primary" onClick={onBuyNow} left={<Zap className="h-4 w-4" />} className="w-full">
                {ctaPrimary}
              </Btn>
              <Btn tone="neutral" onClick={onAddToCart} left={<ShoppingCart className="h-4 w-4" />} className="w-full">
                {ctaSecondary}
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** ------------------------------ Shoppable Preview ------------------------------ */

function ShoppableAdPreview({
  ad,
  cart,
  shareEnabled = true,
  onPlayHero,
  onPlayOffer,
  onBuy,
  onAdd,
  onDecCart,
  onClearCart,
  onShare
}: {
  ad: ShoppableAd;
  cart: Record<string, number>;
  shareEnabled?: boolean;
  onPlayHero: () => void;
  onPlayOffer: (id: string) => void;
  onBuy: (id: string) => void;
  onAdd: (id: string) => void;
  onDecCart: (id: string) => void;
  onClearCart: () => void;
  onShare: () => void;
}) {
  // Match the Adz Builder preview format (phone frame + hero chips + offers grid + cart dock),
  // while keeping the Dealz Marketplace interactions unchanged (play, share, cart).
  const [saved, setSaved] = useState(false);
  const [lovedOfferIds, setLovedOfferIds] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const startsAt = useMemo(() => new Date(ad.startISO), [ad.startISO]);
  const endsAt = useMemo(() => new Date(ad.endISO), [ad.endISO]);

  const state = computeCountdownState(Date.now(), startsAt.getTime(), endsAt.getTime());
  const targetISO = state === "upcoming" ? ad.startISO : ad.endISO;
  const cd = useCountdown(targetISO);

  const countdownLabel = state === "upcoming" ? "Starts in" : state === "live" ? "Ends in" : "Session ended";

  const offers = ad.offers || [];
  const primaryOfferId = offers[0]?.id;

  const productsCount = offers.filter((o) => o.type === "PRODUCT").length;
  const servicesCount = offers.filter((o) => o.type === "SERVICE").length;
  const typeLabel = productsCount && servicesCount ? "Mixed" : productsCount ? "Products" : "Services";

  const heroIntroVideo = ad.heroIntroVideoUrl ? { url: ad.heroIntroVideoUrl, poster: ad.heroIntroVideoPosterUrl } : null;

  const perOfferPosterUrl = useMemo<Record<string, string>>(
    () => Object.fromEntries(offers.map((o) => [o.id, o.posterUrl])),
    [offers]
  );

  const perOfferVideo = useMemo<Record<string, { url: string } | undefined>>(
    () => Object.fromEntries(offers.map((o) => [o.id, o.videoUrl ? { url: o.videoUrl } : undefined])),
    [offers]
  );

  const toggleLoved = (id: string) =>
    setLovedOfferIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cartLines = useMemo(() => {
    return offers
      .filter((o) => cart[o.id])
      .map((offer) => ({
        offer,
        qty: cart[offer.id] || 0,
        poster: perOfferPosterUrl[offer.id] || offer.posterUrl || ad.heroImageUrl
      }));
  }, [offers, cart, perOfferPosterUrl, ad.heroImageUrl]);

  const cartCount = useMemo(() => cartLines.reduce((sum, l) => sum + l.qty, 0), [cartLines]);
  const currencies = useMemo(() => new Set(cartLines.map((l) => l.offer.currency)), [cartLines]);
  const multiCurrency = currencies.size > 1;
  const currency = cartLines[0]?.offer.currency || "USD";
  const cartTotal = cartLines.reduce((sum, l) => sum + l.offer.price * l.qty, 0);

  return (
    <div className="mx-auto w-full max-w-full sm:max-w-[440px] mt-4 mb-4 px-2 sm:px-0">
      <div className="rounded-[34px] bg-neutral-950 dark:bg-black p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors">
        <div className="relative overflow-hidden rounded-[28px] bg-neutral-50 dark:bg-slate-950 transition-colors">
          <div className="h-[760px] flex flex-col">
            {/* Top bar */}
            <div className="relative xl:sticky xl:top-0 z-20 border-b border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur transition-colors">
              <div className="px-4 py-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Back"
                  title="Back"
                >
                  <ChevronLeft className="h-5 w-5 text-neutral-900 dark:text-slate-100" />
                </button>

                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100 truncate">
                    {ad.campaignName || "Shoppable Adz"}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-slate-400 truncate">
                    Shared by {ad.creator?.handle || "@"} {ad.platforms?.length ? `· ${ad.platforms.join(" · ")}` : ""}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onShare}
                    disabled={!shareEnabled}
                    className={cx(
                      "rounded-full p-2 ring-1 transition-colors",
                      shareEnabled
                        ? "bg-white dark:bg-slate-900 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800"
                        : "bg-neutral-100 dark:bg-slate-900 ring-neutral-200 dark:ring-slate-800 opacity-50 cursor-not-allowed"
                    )}
                    aria-label="Share"
                    title="Share"
                  >
                    <Share2 className="h-5 w-5 text-neutral-900 dark:text-slate-100" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCartOpen((v) => !v)}
                    className="relative rounded-full p-2 bg-white dark:bg-slate-900 ring-1 ring-neutral-200 dark:ring-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Cart"
                    title="Cart"
                  >
                    <ShoppingCart className="h-5 w-5 text-neutral-900 dark:text-slate-100" />
                    {cartCount ? (
                      <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {/* Scroll content */}
            <div className="flex-1 overflow-y-auto">
              {/* Hero */}
              <div className="relative">
                <div className="relative aspect-[16/9] w-full bg-neutral-200 dark:bg-slate-800">
                  <img
                    src={ad.heroIntroVideoPosterUrl || ad.heroImageUrl}
                    alt={ad.campaignName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/70" />

                  {/* hero chips */}
                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">Top Shoppable Adz</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">{typeLabel}</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                      {countdownLabel}: {state === "ended" ? "—" : formatCountdown(cd.diff)}
                    </span>
                  </div>

                  {/* save icon INSIDE hero */}
                  <div className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={() => setSaved((s) => !s)}
                      className={cx(
                        "rounded-full p-2 backdrop-blur ring-1",
                        saved ? "bg-white/35 ring-white/40" : "bg-white/20 ring-white/30 hover:bg-white/30"
                      )}
                      aria-label="Save"
                      title={saved ? "Saved" : "Save"}
                    >
                      <Heart className={cx("h-4 w-4", saved ? "text-white fill-white" : "text-white")} />
                    </button>
                  </div>

                  {/* play */}
                  <PlayOverlayButton
                    onClick={onPlayHero}
                    label={heroIntroVideo ? "Play hero intro" : "Preview hero video"}
                    size="lg"
                  />

                  {/* bottom metrics chips (template-like) */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Views 410k</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Saves 18k</span>
                    <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold text-white">Conv 2.9%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pb-6">
                {/* Campaign details */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{ad.campaignName}</div>
                      <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                        <span>
                          Supplier: <span className="font-semibold text-neutral-800 dark:text-slate-200">{ad.supplier?.name || "—"}</span>
                        </span>
                        <span className="mx-2 text-neutral-300">•</span>
                        <span>Status: {ad.status}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {productsCount ? <Pill tone="neutral">{productsCount} products</Pill> : null}
                        {servicesCount ? <Pill tone="neutral">{servicesCount} services</Pill> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-neutral-700 dark:text-slate-300">{ad.campaignSubtitle || "Unbox + proof + clear CTA — shop featured dealz before they end."}</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-slate-400">
                    <span className="rounded-full bg-neutral-50 dark:bg-slate-900/50 px-3 py-1 ring-1 ring-neutral-200 dark:ring-slate-800">
                      Starts: <span className="font-semibold text-neutral-800 dark:text-slate-200">{fmtLocal(startsAt)}</span>
                    </span>
                    <span className="rounded-full bg-neutral-50 dark:bg-slate-900/50 px-3 py-1 ring-1 ring-neutral-200 dark:ring-slate-800">
                      Ends: <span className="font-semibold text-neutral-800 dark:text-slate-200">{fmtLocal(endsAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Featured offers (2 per row, 500×500 posters = square) */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {offers.map((o) => {
                    const poster = perOfferPosterUrl[o.id] || o.posterUrl || ad.heroImageUrl;
                    const isLoved = lovedOfferIds.includes(o.id);

                    const stockText =
                      o.stockLeft === 0
                        ? "Sold out"
                        : o.stockLeft > 0 && o.stockLeft <= 10
                          ? `Low (${o.stockLeft})`
                          : o.stockLeft > 10
                            ? `${o.stockLeft} left`
                            : o.stockLeft === -1
                              ? "In stock"
                              : "In stock";

                    const stockTone = o.stockLeft === 0 ? "bad" : o.stockLeft > 0 && o.stockLeft <= 10 ? "warn" : "neutral";

                    return (
                      <div key={o.id} className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-neutral-200 dark:ring-slate-800 hover:shadow-sm transition">
                        <div className="relative aspect-square bg-neutral-200 dark:bg-slate-800">
                          <img src={poster} alt={o.name} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/65" />

                          <PlayOverlayButton
                            onClick={() => onPlayOffer(o.id)}
                            label={perOfferVideo[o.id] ? `Play ${o.name}` : `Preview ${o.name}`}
                            size="md"
                          />

                          <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                            <Pill tone="neutral">{o.type === "SERVICE" ? "Service" : "Product"}</Pill>
                            <Pill tone={stockTone as "warn" | "bad" | "neutral"}>{stockText}</Pill>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleLoved(o.id)}
                            className={cx(
                              "absolute right-2 top-2 rounded-full p-2 backdrop-blur ring-1",
                              isLoved ? "bg-white/35 ring-white/40" : "bg-white/20 ring-white/30 hover:bg-white/30"
                            )}
                            aria-label={isLoved ? "Unsave" : "Save"}
                            title={isLoved ? "Saved" : "Save"}
                          >
                            <Heart className={cx("h-4 w-4", isLoved ? "text-white fill-white" : "text-white")} />
                          </button>

                          {primaryOfferId && o.id === primaryOfferId ? (
                            <div className="absolute bottom-2 left-2">
                              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur ring-1 ring-white/30">
                                Primary
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <div className="p-3">
                          <div className="line-clamp-2 text-sm font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{money(o.currency, o.price)}</div>
                            {o.basePrice && o.basePrice > o.price ? (
                              <div className="text-xs font-semibold text-neutral-500 line-through">{money(o.currency, o.basePrice)}</div>
                            ) : null}
                          </div>

                          <div className="mt-3 grid gap-2">
                            <Btn tone="primary" left={<Zap className="h-4 w-4" />} onClick={() => onBuy(o.id)}>
                              {ad.ctaPrimaryLabel}
                            </Btn>
                            <Btn
                              tone="neutral"
                              left={<ShoppingCart className="h-4 w-4" />}
                              onClick={() => onAdd(o.id)}
                              disabled={o.stockLeft === 0}
                              title={o.stockLeft === 0 ? "Sold out" : undefined}
                            >
                              {ad.ctaSecondaryLabel}
                            </Btn>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 text-center text-[11px] text-neutral-500">
                  Curated by the host. Media is approved before it can be attached to a deal.
                </div>
              </div>
            </div>

            {/* Cart dock INSIDE preview (matches Adz Builder preview) */}
            <div className="border-t border-neutral-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur transition-colors">
              <div className="px-3 py-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
                  onClick={() => setCartOpen((v) => !v)}
                  aria-label="Toggle cart"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <ShoppingCart className="h-5 w-5 text-neutral-800 dark:text-slate-200" />
                      {cartCount ? (
                        <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-[#f77f00] text-white text-[11px] font-extrabold grid place-items-center">
                          {cartCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate text-xs font-bold text-neutral-700 dark:text-slate-300">Cart</div>
                      <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">
                        {cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} added` : "No items yet"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-[11px] text-neutral-500 dark:text-slate-400">{multiCurrency ? "Multiple currencies" : "Subtotal"}</div>
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{multiCurrency ? "—" : money(currency, cartTotal)}</div>
                    </div>
                    <ChevronDown className={cx("h-5 w-5 text-neutral-600 dark:text-slate-400 transition", cartOpen ? "rotate-180" : "")} />
                  </div>
                </button>

                {cartOpen ? (
                  <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
                    {cartLines.length ? (
                      <div className="max-h-[220px] overflow-auto pr-1">
                        <div className="space-y-2">
                          {cartLines.map(({ offer, qty, poster }) => (
                            <div
                              key={offer.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 dark:bg-slate-900 p-2 ring-1 ring-neutral-200 dark:ring-slate-700 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={poster} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-slate-700" />
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-bold text-neutral-900 dark:text-slate-100">{offer.name}</div>
                                  <div className="text-[11px] text-neutral-600 dark:text-slate-400">
                                    {money(offer.currency, offer.price)} · {offer.type === "SERVICE" ? "Service" : "Product"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
                                  onClick={() => onDecCart(offer.id)}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-4 w-4 text-neutral-900 dark:text-slate-100" />
                                </button>
                                <div className="w-7 text-center text-xs font-extrabold text-neutral-900 dark:text-slate-100">{qty}</div>
                                <button
                                  type="button"
                                  className="rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
                                  onClick={() => onAdd(offer.id)}
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-4 w-4 text-neutral-900 dark:text-slate-100" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-neutral-50 dark:bg-slate-900 p-3 text-sm text-neutral-700 dark:text-slate-400 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                        Add items from the featured offers to build your cart.
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="text-xs font-bold text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200 transition-colors"
                        onClick={onClearCart}
                        disabled={!cartLines.length}
                      >
                        Clear cart
                      </button>
                      <Btn tone="primary" left={<Zap className="h-4 w-4" />} disabled={!cartLines.length} onClick={() => { }}>
                        Checkout
                      </Btn>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/** ------------------------------ Live Invite Preview ------------------------------ */

type LiveGiveaway = {
  id?: string;
  linkedItemId?: string;
  title?: string;
  imageUrl?: string;
  notes?: string;
  showOnPromo?: boolean;
  quantity?: number;
};

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit" });
}

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

function TimePill({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-white min-w-[42px]">
      <span className="tabular-nums font-mono">{pad2(n)}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

function HostPreviewCard({ host }: { host: Creator }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={host.avatarUrl} alt={host.name} className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
              {host.name} {host.verified ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : null}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{host.handle} • Host</div>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold bg-[#F77F00] text-white"
        >
          <Plus className="h-4 w-4" /> Follow
        </button>
      </div>
    </div>
  );
}

function SupplierPreviewCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={supplier.logoUrl} alt={supplier.name} className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{supplier.name}</div>
            <div className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-400">{supplier.category} • Supplier</div>
          </div>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold bg-slate-900 text-white">
          <ShoppingBag className="h-4 w-4" /> Follow
        </button>
      </div>
    </div>
  );
}

function LiveInvitePreviewPhone({
  live,
  cart,
  onDecCart,
  onClearCart,
  onPlayHero,
  onPlayItem,
  onSharePromo,
  onBuy,
  onAdd
}: {
  live: LiveInvite;
  cart: Record<string, number>;
  onDecCart: (id: string) => void;
  onClearCart: () => void;
  onPlayHero: () => void;
  onPlayItem: (id: string) => void;
  onSharePromo: () => void;
  onBuy: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  // NOTE: cart handlers are kept for compatibility with existing callers, but the promo link preview
  // matches the latest Live Builder preview format (no cart dock in the invite page).
  void cart;
  void onDecCart;
  void onClearCart;
  void onAdd;

  const startISO = live.startISO;
  const endISO = live.endISO;

  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const now = Date.now();

  const isLiveWindow = now >= startMs && now < endMs;
  const isEnded = now >= endMs;

  const targetISO = isLiveWindow ? endISO : startISO;
  const cd = useCountdown(targetISO);

  // Promo giveaways: from stored deal/session if present; otherwise none.
  const rawGiveaways = (live as any).giveaways as LiveGiveaway[] | undefined;
  const giveaways = Array.isArray(rawGiveaways) ? rawGiveaways : [];
  const promoGiveaways = useMemo(() => giveaways.filter((g) => g && (g.showOnPromo ?? true)), [giveaways]);

  const visibleItems = live.featured || [];
  const showSupplierCard = !!live.supplier && live.host.handle !== supplierAsHost(live.supplier).handle;

  return (
    <div className="mx-auto w-full max-w-full sm:max-w-[440px] mt-4 mb-4 px-2 sm:px-0">
      <div className="rounded-[34px] bg-neutral-950 dark:bg-black p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors">
        <div className="relative overflow-hidden rounded-[28px] bg-neutral-50 dark:bg-slate-950 transition-colors">
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-24 h-5 bg-black rounded-b-2xl" />

          <div className="h-[760px] overflow-y-auto">
            {/* Top bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between bg-white/90 dark:bg-slate-950/90 px-3 py-2 backdrop-blur shadow-sm transition-colors ring-1 ring-slate-100 dark:ring-slate-800">
              <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{live.title || "Untitled session"}</div>
              <button
                onClick={onSharePromo}
                aria-label="Share"
                className="rounded-xl border-2 border-[#F77F00] bg-white dark:bg-slate-900 p-2 text-[#F77F00] transition-colors"
                title="Copy promo link"
              >
                <Share2 size={18} />
              </button>
            </div>

            {/* Hero */}
            <div className="mt-2 relative overflow-hidden rounded-3xl bg-black text-white mx-3">
              <div className="aspect-[16/9] w-full">
                <img src={live.heroImageUrl} alt={live.title} loading="eager" className="h-full w-full object-cover" />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <PlayOverlayButton
                onClick={onPlayHero}
                label={live.heroVideoUrl ? "Play live hero video" : "Preview live hero video"}
                size="lg"
              />

              <div className="absolute inset-x-0 bottom-2 px-3">
                <div className="text-white/95 text-lg font-extrabold drop-shadow-sm line-clamp-2">{live.title}</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/95">
                  <Calendar size={16} /> {formatDateLabel(startISO)}
                </div>
                <div className="pl-6 text-[13px] font-semibold text-white/95">
                  {formatTimeLabel(startISO)} → {formatTimeLabel(endISO)}
                </div>
                <div className="pl-6 text-[11px] text-white/85">Duration: {formatDuration(startISO, endISO)}</div>
              </div>

              {/* Live/Countdown */}
              <div className="absolute left-3 top-3">
                {isLiveWindow ? (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-2 py-1 text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-white" /> Live now
                  </span>
                ) : isEnded ? (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 px-2 py-1 text-xs font-bold">Session ended</span>
                ) : (
                  <div className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur">
                    <TimePill n={cd.d} label="d" />:<TimePill n={cd.h} label="h" />:<TimePill n={cd.m} label="m" />:<TimePill n={cd.sec} label="s" />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-2xl bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur hover:bg-white/20"
                onClick={() => {
                  if (live.promoLink) window.open(live.promoLink, "_blank");
                }}
                title="Open live link"
              >
                <Play size={14} /> Live link
              </button>
            </div>

            {/* Host / supplier cards */}
            <div className="mt-2 grid grid-cols-1 gap-2 px-3">
              <HostPreviewCard host={live.host} />
              {showSupplierCard && live.supplier ? <SupplierPreviewCard supplier={live.supplier} /> : null}
            </div>

            {/* Description */}
            <p className="mt-2 px-3 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 transition-colors">
              {live.description || "Add a description to help buyers understand what’s happening."}
            </p>

            {/* Time + Platforms */}
            <div className="mt-2 px-3 grid grid-cols-1 gap-2 transition-colors">
              <div className="flex items-start gap-2 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                <Calendar size={18} className="mt-0.5 text-slate-900 dark:text-slate-100" />
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{formatDateLabel(startISO)}</div>
                  <div className="text-[14px] text-slate-800 dark:text-slate-300">
                    {formatTimeLabel(startISO)} → {formatTimeLabel(endISO)}
                  </div>
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    Duration: {formatDuration(startISO, endISO)} • {(live.timezoneLabel || "Local time")}
                  </div>
                  {(live.platforms || []).length ? (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Destinations: {live.platforms.join(" · ")}</div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Giveaways (shown on promo page) */}
            {promoGiveaways.length ? (
              <div className="mt-4 px-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">🎁 Giveaways</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Join live to enter</div>
                </div>

                <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                  {promoGiveaways.map((g, idx) => {
                    const linked = visibleItems.find((it) => it.id === g.linkedItemId);
                    const title = linked?.name || g.title || "Giveaway prize";
                    const image = linked?.posterUrl || g.imageUrl;
                    const qty = typeof g.quantity === "number" && g.quantity > 0 ? Math.floor(g.quantity) : 1;

                    return (
                      <div key={g.id || g.linkedItemId || g.title || `giveaway_${idx}`} className="min-w-[180px] max-w-[180px] rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                          {image ? (
                            <img src={image} alt={title} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center bg-slate-100 dark:bg-slate-800 text-2xl">🎁</div>
                          )}
                          <span className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            Giveaway • Qty {qty}
                          </span>
                        </div>

                        <div className="mt-2 line-clamp-2 text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">{title}</div>
                        {g.notes ? <div className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{g.notes}</div> : null}

                        <div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-extrabold bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm">
                          Join live to enter
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Featured items */}
            <div className="mt-4 px-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Featured Dealz</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400">Curated for this session</div>
              </div>

              <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                {visibleItems.map((it) => {
                  const soldOut = it.kind === "product" && it.stockLeft === 0;
                  const qtyText = it.stockLeft < 0 ? "Unlimited" : soldOut ? "Sold out" : it.stockLeft > 0 ? `${it.stockLeft} left` : "";
                  const ctaLabel = soldOut ? "Remind me" : it.kind === "service" ? "Book now" : "Buy now";

                  return (
                    <div key={it.id} className="min-w-[210px] max-w-[210px] rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        <img src={it.posterUrl} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
                        <PlayOverlayButton
                          onClick={() => onPlayItem(it.id)}
                          label={it.videoUrl ? `Play ${it.name}` : `Preview ${it.name}`}
                          size="md"
                        />

                        <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                            {it.kind === "service" ? "Service" : "Product"}
                          </span>
                          {qtyText ? (
                            <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-extrabold text-white backdrop-blur">
                              {qtyText}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 line-clamp-2 text-[13px] font-extrabold text-slate-900 dark:text-slate-100">{it.name}</div>
                      <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{it.priceLabel}</div>

                      <button
                        type="button"
                        className={cx(
                          "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-extrabold shadow-sm transition-colors",
                          soldOut ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500" : "bg-[#F77F00] text-white"
                        )}
                        onClick={() => !soldOut && onBuy(it.id)}
                        disabled={soldOut}
                      >
                        {ctaLabel}
                      </button>
                    </div>
                  );
                })}

                {!visibleItems.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-[12px] text-slate-600 dark:text-slate-400">
                    No featured items yet.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Ask host */}
            <div className="mt-4 px-3">
              <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">Ask the host</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Questions show up during the live.</div>
                  </div>
                  <MessageSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[12px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="Type a question…"
                    disabled
                  />
                  <button className="rounded-2xl bg-slate-900 text-white px-3 py-2 text-[12px] font-extrabold opacity-60 cursor-not-allowed">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky bottom bar */}
            <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 mt-6">
              <div className="px-3 py-3">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F77F00] text-white px-4 py-3 text-[14px] font-extrabold shadow-sm"
                  onClick={() => {
                    if (live.promoLink) window.open(live.promoLink, "_blank");
                  }}
                >
                  <Play className="h-4 w-4" /> Join live
                </button>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-900 dark:text-slate-100"
                    title="Remind me"
                  >
                    <Bell className="h-4 w-4" /> Remind
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-900 dark:text-slate-100"
                    title="Add to calendar"
                  >
                    <CalendarPlus className="h-4 w-4" /> +Cal
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-slate-900 dark:text-slate-100"
                    onClick={onSharePromo}
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Powered by Dealz Marketplace · Live session preview
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealDetailsDrawer({
  open,
  deal,
  onClose,
  onOpenAdBuilder,
  onOpenLiveBuilder,
  onOpenPerformance,
  onOpenLink
}: {
  open: boolean;
  deal: Deal | null;
  onClose: () => void;
  onOpenAdBuilder: () => void;
  onOpenLiveBuilder: () => void;
  onOpenPerformance: () => void;
  onOpenLink: (url: string) => void;
}) {
  if (!deal) return null;

  const start = new Date(deal.startISO);
  const end = new Date(deal.endISO);

  const sh = deal.shoppable;
  const lv = deal.live;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={deal.title}
      subtitle={`${deal.type} · Supplier: ${deal.supplier.name} · Host: ${deal.creator.handle}`}
      width="w-full max-w-[980px]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 transition-colors">
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Schedule</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone="neutral">
                <Calendar className="h-3.5 w-3.5" />
                Start: {fmtLocal(start)}
              </Pill>
              <Pill tone="neutral">
                <Calendar className="h-3.5 w-3.5" />
                End: {fmtLocal(end)}
              </Pill>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Governance</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <GovernancePills deal={deal} />
            </div>
          </div>

          {sh ? (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Shoppable Adz</div>
                <Pill tone={sh.status === "Generated" ? "good" : "warn"}>{sh.status}</Pill>
              </div>
              <div className="mt-2 text-sm text-neutral-700 dark:text-slate-300">
                Campaign: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{sh.campaignName}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-600 dark:text-slate-400">Platforms: {sh.platforms.join(", ")}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone="primary" onClick={onOpenAdBuilder} left={<Wand2 className="h-4 w-4" />}>
                  Open Ad Builder
                </Btn>
                <Btn tone="neutral" onClick={onOpenPerformance} left={<TrendingUp className="h-4 w-4" />}>
                  Adz Performance
                </Btn>
              </div>
            </div>
          ) : null}

          {lv ? (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Live Sessionz</div>
                <Pill tone={lv.status === "Live" ? "good" : lv.status === "Scheduled" ? "warn" : "neutral"}>{lv.status}</Pill>
              </div>
              <div className="mt-2 text-sm text-neutral-700 dark:text-slate-300">
                Session: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{lv.title}</span>
              </div>
              <div className="mt-2 text-xs text-neutral-600 dark:text-slate-400">Destinations: {lv.platforms.join(", ")}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone="primary" onClick={onOpenLiveBuilder} left={<Video className="h-4 w-4" />}>
                  Open Live Builder
                </Btn>
                <Btn tone="neutral" onClick={() => onOpenLink(lv.promoLink)} left={<ExternalLink className="h-4 w-4" />}>
                  Open Invite Link
                </Btn>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">People</div>
            <div className="mt-3 flex items-center gap-3">
              <img src={deal.creator.avatarUrl} alt={deal.creator.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-800" />
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{deal.creator.name}</div>
                <div className="truncate text-xs text-neutral-600 dark:text-slate-400">{deal.creator.handle} · Host</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <img src={deal.supplier.logoUrl} alt={deal.supplier.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-800" />
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{deal.supplier.name}</div>
                <div className="truncate text-xs text-neutral-600 dark:text-slate-400">{deal.supplier.category} · Supplier</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4 transition-colors">
            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Notes</div>
            <div className="mt-2 text-sm text-neutral-700 dark:text-slate-400">
              {deal.notes || "Supplier workspace: browse, preview, and handoff into the correct builders without changing buyer-facing preview surfaces."}
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/** ------------------------------ New Dealz Wizard ------------------------------ */

type WizardType = DealType | "";
function NewDealzWizard({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (d: Deal, behavior: "open-builder" | "stay") => void;
}) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<WizardType>("");
  const [supplierIdx, setSupplierIdx] = useState(0);
  const [campaignName, setCampaignName] = useState("New Campaign");

  // Default timing (next 24h) since selection is removed
  const [startISO] = useState(new Date(Date.now() + 24 * 3600 * 1000).toISOString());
  const [endISO] = useState(new Date(Date.now() + 25 * 3600 * 1000).toISOString());

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setType("");
    setSupplierIdx(0);
    setCampaignName("New Campaign");
  }, [open]);

  // Updated steps: 0=Type, 1=Supplier, 2=Campaign
  const canNext =
    (step === 0 && !!type) ||
    (step === 1 && supplierIdx >= 0) ||
    (step === 2 && campaignName.trim().length > 2);

  function next() {
    if (!canNext) return;
    setStep((s) => Math.min(2, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function create(behavior: "open-builder" | "stay") {
    if (!type) return;

    const supplier = SUPPLIERS[supplierIdx];
    const host = supplierAsHost(supplier);
    const id = `dz_${Math.floor(Date.now() / 1000)}`;

    const base: Deal = {
      id,
      type,
      title: type === "Shoppable Adz" ? campaignName : type === "Live Sessionz" ? `${campaignName} Live` : `${campaignName} Live + Drops`,
      tagline: type === "Shoppable Adz" ? "Supplier-managed shoppable clips" : type === "Live Sessionz" ? "Supplier-run live session" : "Supplier-run live session + shoppable clips",
      supplier,
      creator: host,
      hostRole: "Supplier",
      creatorUsage: "I will NOT use a Creator",
      collabMode: "(n/a)",
      approvalMode: "Manual",
      startISO,
      endISO,
      notes: "Created from +New Dealz (demo)."
    };

    const withShoppable =
      type === "Shoppable Adz" || type === "Live + Shoppables"
        ? {
          ...base,
          shoppable: {
            ...shoppable1,
            id: `ad_${id}`,
            status: "Draft",
            supplier,
            creator: host,
            startISO,
            endISO,
            campaignName,
            campaignSubtitle: "New deal draft",
            platforms: ["Instagram", "TikTok"]
          }
        }
        : base;

    const withLive =
      type === "Live Sessionz" || type === "Live + Shoppables"
        ? {
          ...withShoppable,
          live: {
            ...live1,
            id: `live_${id}`,
            status: "Draft",
            title: type === "Live Sessionz" ? `${campaignName} Live` : `${campaignName} Live + Drops`,
            description: "Draft live session created from Dealz Marketplace. Add run-of-show, featured items, and destinations in Live Builder.",
            supplier,
            host,
            startISO,
            endISO,
            promoLink: `https://mldz.link/live_${id}`
          }
        }
        : withShoppable;

    onCreate(withLive as Deal, behavior);
    onClose();
  }

  const supplier = SUPPLIERS[supplierIdx];
  const host = supplierAsHost(supplier);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="+ New Dealz"
      subtitle="Create supplier-managed Shoppable Adz, Live Sessionz, or hybrid dealz"
      width="w-full max-w-[980px]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Steps */}
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950/50 p-4 transition-colors">
          <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Steps</div>
          <div className="mt-3 space-y-2 text-xs">
            {[
              { t: "Deal type", d: "Shoppable / Live / Hybrid" },
              { t: "Supplier", d: "Seller or provider" },
              { t: "Campaign", d: "Name / scope" }
            ].map((s, i) => (
              <div
                key={s.t}
                className={cx(
                  "rounded-2xl border p-3 transition-colors",
                  step === i
                    ? "border-orange-200 bg-white dark:border-orange-900/50 dark:bg-slate-900"
                    : "border-neutral-200 bg-white/60 dark:border-slate-800/50 dark:bg-slate-900/40"
                )}
              >
                <div className="font-extrabold text-neutral-900 dark:text-slate-100 flex items-center justify-between">
                  <span>
                    {i + 1}. {s.t}
                  </span>
                  {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" /> : null}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-slate-400">{s.d}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Btn onClick={back} disabled={step === 0} left={<ChevronLeft className="h-4 w-4" />}>
              Back
            </Btn>
            {/* Logic: if step < 2, show Next. If step === 2, we show buttons inside the form (or could show Finish here).
                The design requested requires 'Create' buttons at the end. We'll hide Next on the last step. */}
            {step < 2 ? (
              <Btn tone="primary" onClick={next} disabled={!canNext} left={<Check className="h-4 w-4" />}>
                Next
              </Btn>
            ) : null}
          </div>
        </div>

        {/* Step content */}
        <div className="lg:col-span-2 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
          {step === 0 ? (
            <div>
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Choose deal type</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["Shoppable Adz", "Live Sessionz", "Live + Shoppables"] as DealType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cx(
                      "rounded-3xl border p-4 text-left hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors",
                      type === t ? "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20" : "border-neutral-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {t === "Shoppable Adz" ? <Wand2 className="h-4 w-4 text-neutral-700 dark:text-slate-300" /> : t === "Live Sessionz" ? <Video className="h-4 w-4 text-neutral-700 dark:text-slate-300" /> : <Layers className="h-4 w-4 text-neutral-700 dark:text-slate-300" />}
                      <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">{t}</div>
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                      {t === "Shoppable Adz"
                        ? "Supplier-managed shoppable clips + share links."
                        : t === "Live Sessionz"
                          ? "Promo link preview + multistream destinations."
                          : "Supplier-run live session + shoppable clips in one deal."}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Select supplier</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SUPPLIERS.map((s, i) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSupplierIdx(i)}
                    className={cx(
                      "rounded-3xl border p-4 text-left hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors",
                      supplierIdx === i ? "border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/20" : "border-neutral-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <img src={s.logoUrl} alt={s.name} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-800" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-extrabold text-neutral-900 dark:text-slate-100">{s.name}</div>
                        <div className="truncate text-[11px] text-neutral-600 dark:text-slate-400">{s.category}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Campaign</div>
              <div className="mt-3 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4 transition-colors">
                <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Campaign name</div>
                <input
                  className="mt-2 w-full rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-slate-700 text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-600 transition-all"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Valentine Glow Week"
                />
                <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
                  Supplier: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{supplier.name}</span>
                  <span className="mx-2 text-neutral-300">•</span>
                  Host: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{host.handle}</span>
                </div>
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-slate-400">
                  New deals default to supplier-hosted. You can attach a creator later in the supplier workflow if needed.
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                <div className="text-xs font-extrabold text-neutral-900 dark:text-slate-100">Create</div>
                <div className="mt-2 text-sm text-neutral-700 dark:text-slate-300">
                  Deal type: <span className="font-extrabold text-neutral-900 dark:text-slate-100">{type || "—"}</span> · Supplier:{" "}
                  <span className="font-extrabold text-neutral-900 dark:text-slate-100">{supplier.name}</span> · Host:{" "}
                  <span className="font-extrabold text-neutral-900 dark:text-slate-100">{host.handle}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="brand">Supplier-hosted</Pill>
                  <Pill tone="warn">I will NOT use a Creator</Pill>
                  <Pill tone="neutral">Collab: (n/a)</Pill>
                  <Pill tone="warn">Approval: Manual</Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn tone="primary" onClick={() => create("open-builder")} left={<Sparkles className="h-4 w-4" />}>
                    Create & open builder
                  </Btn>
                  <Btn onClick={() => create("stay")} left={<CheckCircle2 className="h-4 w-4" />}>
                    Create
                  </Btn>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}

/** ------------------------------ Page ------------------------------ */

export default function DealzMarketplace() {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [dealz, setDealz] = useState<Deal[]>(DEALZ_SEED);
  const [selectedId, setSelectedId] = useState<string>(DEALZ_SEED[0]?.id || "");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedHeroOfferId, setSelectedHeroOfferId] = useState<string>("");

  // Drawer states
  const [adBuilderOpen, setAdBuilderOpen] = useState(false);
  const [liveBuilderOpen, setLiveBuilderOpen] = useState(false);
  const [adzPerformanceOpen, setAdzPerformanceOpen] = useState(false);

  // Helper for opening drawers with context
  const openAdBuilderFor = (deal: Deal) => {
    setSelectedId(deal.id);
    setAdBuilderOpen(true);
  };
  const openLiveBuilderFor = (deal: Deal) => {
    setSelectedId(deal.id);
    setLiveBuilderOpen(true);
  };
  const openPerformanceFor = (deal: Deal) => {
    setSelectedId(deal.id);
    setAdzPerformanceOpen(true);
  };

  const selected = useMemo(() => dealz.find((d) => d.id === selectedId), [selectedId, dealz]);

  // Cart state for the Shoppable Ad preview (per selected deal)
  const [cart, setCart] = useState<Record<string, number>>({});
  // Cart state for the Live Session invite preview (per selected deal)
  const [liveCart, setLiveCart] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  function safeNav(url: string) {
    navigate(url);
  }

  useEffect(() => {
    // Reset carts when switching dealz
    setCart({});
    setLiveCart({});
  }, [selectedId]);

  function decCart(offerId: string) {
    setCart((prev) => {
      const next = { ...prev };
      const q = next[offerId] || 0;
      if (q <= 1) delete next[offerId];
      else next[offerId] = q - 1;
      return next;
    });
  }

  function clearCart() {
    setCart({});
  }

  function decLiveCart(itemId: string) {
    setLiveCart((prev) => {
      const next = { ...prev };
      const q = next[itemId] || 0;
      if (q <= 1) delete next[itemId];
      else next[itemId] = q - 1;
      return next;
    });
  }

  function clearLiveCart() {
    setLiveCart({});
  }


  // Segmented filter
  const [segment, setSegment] = useState<"All" | DealType>("All");
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("All");

  const platformsAll = useMemo(() => {
    const s = new Set<string>();
    dealz.forEach((d) => {
      d.shoppable?.platforms.forEach((p) => s.add(p));
      d.live?.platforms.forEach((p) => s.add(p));
    });
    return ["All", ...Array.from(s)];
  }, [dealz]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dealz
      .filter((d) => (segment === "All" ? true : d.type === segment))
      .filter((d) => {
        if (platformFilter === "All") return true;
        const ps = new Set([...(d.shoppable?.platforms || []), ...(d.live?.platforms || [])]);
        return ps.has(platformFilter);
      })
      .filter((d) => {
        if (!q) return true;
        return (
          d.title.toLowerCase().includes(q) ||
          d.supplier.name.toLowerCase().includes(q) ||
          d.creator.handle.toLowerCase().includes(q) ||
          hostRoleLabel(d).toLowerCase().includes(q) ||
          getCreatorUsage(d).toLowerCase().includes(q) ||
          getCollabMode(d).toLowerCase().includes(q) ||
          getApprovalMode(d).toLowerCase().includes(q) ||
          (d.shoppable?.campaignName || "").toLowerCase().includes(q) ||
          (d.live?.title || "").toLowerCase().includes(q)
        );
      });
  }, [dealz, segment, query, platformFilter]);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerCtx, setViewerCtx] = useState<ViewerCtx | null>(null);
  const [loved, setLoved] = useState(false);

  // chooser for shoppable hero viewer
  useEffect(() => {
    setSelectedHeroOfferId(selected?.shoppable?.offers[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Hybrid preview toggle
  const [hybridTab, setHybridTab] = useState<"shoppable" | "live">("shoppable");
  useEffect(() => {
    // reset for newly selected
    setHybridTab("shoppable");
  }, [selected?.id]);

  // Details + new wizard
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  // compute countdown for viewer
  const startISO = selected?.startISO || new Date().toISOString();
  const endISO = selected?.endISO || new Date(Date.now() + 3600 * 1000).toISOString();
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const countdownState = computeCountdownState(Date.now(), startMs, endMs);
  const countdownLabel = countdownState === "upcoming" ? "Starts in" : countdownState === "live" ? "Ends in" : "Session ended";

  const viewerMode: ViewerMode = useMemo(() => {
    const preferred = viewerCtx?.desktopMode || "modal";
    // mobile responsiveness
    if (typeof window !== "undefined" && window.innerWidth < 768) return "fullscreen";
    return preferred;
  }, [viewerCtx?.desktopMode]);

  function copy(text: string, label: string) {
    navigator.clipboard?.writeText(text).catch(() => { });
    setToast(label);
  }

  function shareShoppable(ad: ShoppableAd, platform?: string) {
    const base = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    const sp = new URLSearchParams();
    sp.set("utm_medium", "dealz_marketplace");
    sp.set("utm_campaign", ad.campaignName.toLowerCase().replace(/\s+/g, "-"));
    if (platform) sp.set("utm_source", platform.toLowerCase());
    const link = `${base}?${sp.toString()}`;
    copy(link, `Copied share link${platform ? ` for ${platform}` : ""}`);
  }

  function shareLivePromo(live: LiveInvite) {
    copy(live.promoLink, "Copied promo link");
  }

  function stockLabelForShoppable(ad: ShoppableAd, offerId: string) {
    const o = ad.offers.find((x) => x.id === offerId);
    if (!o) return null;
    if (countdownState === "ended") return { tone: "neutral" as const, text: "Session ended" };
    if (countdownState === "upcoming") return { tone: "neutral" as const, text: "Not started" };
    if (o.stockLeft === 0) return { tone: "bad" as const, text: "Sold out" };
    if (o.stockLeft > 0 && o.stockLeft <= 5) return { tone: "warn" as const, text: "Low stock" };
    if (o.stockLeft > 0) return { tone: "neutral" as const, text: `${o.stockLeft} left` };
    if (o.stockLeft < 0) return { tone: "neutral" as const, text: "Unlimited" };
    return null;
  }

  function stockLabelForLive(live: LiveInvite, itemId: string) {
    const it = live.featured.find((x) => x.id === itemId);
    if (!it) return null;
    if (countdownState === "ended") return { tone: "neutral" as const, text: "Session ended" };
    if (countdownState === "upcoming") return { tone: "neutral" as const, text: "Not started" };
    if (it.stockLeft === 0) return { tone: "bad" as const, text: "Sold out" };
    if (it.stockLeft > 0 && it.stockLeft <= 5) return { tone: "warn" as const, text: "Low stock" };
    if (it.stockLeft > 0) return { tone: "neutral" as const, text: `${it.stockLeft} left` };
    if (it.stockLeft < 0) return { tone: "neutral" as const, text: "Unlimited" };
    return null;
  }

  // viewer openers
  function playShoppableHero(ad: ShoppableAd) {
    if (!ad.heroIntroVideoUrl) return setToast("No intro video attached yet.");
    setViewerCtx({
      domain: "shoppable",
      kind: "hero",
      title: "Intro video (host)",
      videoUrl: ad.heroIntroVideoUrl,
      posterUrl: ad.heroIntroVideoPosterUrl || ad.heroImageUrl,
      desktopMode: ad.heroDesktopMode || "fullscreen"
    });
    setViewerOpen(true);
  }

  function playShoppableOffer(ad: ShoppableAd, offerId: string) {
    const o = ad.offers.find((x) => x.id === offerId);
    if (!o?.videoUrl) return setToast("No item video attached yet.");
    setViewerCtx({
      domain: "shoppable",
      kind: "offer",
      offerId,
      title: o.name,
      videoUrl: o.videoUrl,
      posterUrl: o.posterUrl,
      desktopMode: o.desktopMode || "modal"
    });
    setViewerOpen(true);
  }

  function playLiveHero(live: LiveInvite) {
    if (!live.heroVideoUrl) return setToast("No hero video attached yet.");
    setViewerCtx({
      domain: "live",
      kind: "hero",
      title: "Live invite hero",
      videoUrl: live.heroVideoUrl,
      posterUrl: live.heroImageUrl,
      desktopMode: live.heroDesktopMode || "fullscreen"
    });
    setViewerOpen(true);
  }

  function playLiveItem(live: LiveInvite, itemId: string) {
    const it = live.featured.find((x) => x.id === itemId);
    if (!it?.videoUrl) return setToast("No item video attached yet.");
    setViewerCtx({
      domain: "live",
      kind: "item",
      itemId,
      title: it.name,
      videoUrl: it.videoUrl,
      posterUrl: it.posterUrl,
      desktopMode: "modal"
    });
    setViewerOpen(true);
  }

  // checkout/cart actions (demo)
  function shoppableBuy(ad: ShoppableAd, offerId: string) {
    const url = `/checkout?source=shoppable&adId=${encodeURIComponent(ad.id)}&offerId=${encodeURIComponent(offerId)}&qty=1`;
    setToast(`Checkout (demo): ${url}`);
  }
  function shoppableAdd(ad: ShoppableAd, offerId: string) {
    const o = ad.offers.find((x) => x.id === offerId);
    if (!o) return;

    setCart((prev) => ({ ...prev, [offerId]: (prev[offerId] || 0) + 1 }));
    setToast(`Added to cart: ${o.name}`);
  }
  function liveBuy(live: LiveInvite, itemId: string) {
    const url = `/checkout?source=live&sessionId=${encodeURIComponent(live.id)}&itemId=${encodeURIComponent(itemId)}&qty=1`;
    setToast(`Checkout (demo): ${url}`);
  }
  function liveAdd(live: LiveInvite, itemId: string) {
    const it = live.featured.find((x) => x.id === itemId);
    if (!it) return;
    setLiveCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    setToast(`Added to cart: ${it.name}`);
  }


  // viewer CTA targets
  const viewerPriceLabel = useMemo(() => {
    if (!viewerCtx || !selected) return "";
    if (viewerCtx.domain === "shoppable") {
      const ad = selected.shoppable;
      if (!ad) return "";
      const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
      const o = ad.offers.find((x) => x.id === offerId);
      return o ? `${o.name} · ${money(o.currency, o.price)}` : "";
    } else {
      const live = selected.live;
      if (!live) return "";
      const itemId = viewerCtx.kind === "hero" ? (live.featured[0]?.id || "") : viewerCtx.itemId;
      const it = live.featured.find((x) => x.id === itemId);
      return it ? `${it.name} · ${it.priceLabel}` : "";
    }
  }, [viewerCtx, selected?.id, selectedHeroOfferId]);

  const viewerStockLabel = useMemo(() => {
    if (!viewerCtx || !selected) return null;
    if (viewerCtx.domain === "shoppable") {
      const ad = selected.shoppable;
      if (!ad) return null;
      const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId || "";
      return stockLabelForShoppable(ad, offerId);
    } else {
      const live = selected.live;
      if (!live) return null;
      const itemId = viewerCtx.kind === "hero" ? (live.featured[0]?.id || "") : viewerCtx.itemId || "";
      return stockLabelForLive(live, itemId);
    }
  }, [viewerCtx, selected?.id, selectedHeroOfferId, countdownState]);

  const chooser = useMemo(() => {
    // only show chooser for shoppable hero viewer
    if (!viewerCtx || viewerCtx.domain !== "shoppable" || viewerCtx.kind !== "hero") return null;
    const ad = selected?.shoppable;
    if (!ad) return null;
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ad.offers.map((o) => {
          const active = o.id === selectedHeroOfferId;
          const stockNote = o.stockLeft === 0 ? "Sold out" : o.stockLeft > 0 && o.stockLeft <= 5 ? "Low stock" : o.stockLeft > 0 ? `${o.stockLeft} left` : "Unlimited";
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelectedHeroOfferId(o.id)}
              className={cx(
                "flex min-w-[240px] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left",
                active ? "border-white bg-white/15" : "border-white/20 bg-white/10 hover:bg-white/15"
              )}
            >
              <img src={o.posterUrl} className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" alt={o.name} />
              <div className="min-w-0 text-white">
                <div className="truncate text-sm font-extrabold">{o.name}</div>
                <div className="truncate text-xs text-white/80">
                  {o.type === "SERVICE" ? "Service" : "Product"} · {money(o.currency, o.price)} · {stockNote}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }, [viewerCtx, selected?.id, selectedHeroOfferId]);

  const viewerBuyNow = () => {
    if (!viewerCtx || !selected) return;

    if (viewerCtx.domain === "shoppable") {
      const ad = selected.shoppable;
      if (!ad) return;
      const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
      if (!offerId) return setToast("Choose an item first.");
      shoppableBuy(ad, offerId);
      return;
    }

    const live = selected.live;
    if (!live) return;
    const itemId = viewerCtx.kind === "hero" ? (live.featured[0]?.id || "") : viewerCtx.itemId;
    if (!itemId) return setToast("Choose an item first.");
    liveBuy(live, itemId);
  };

  const viewerAddToCart = () => {
    if (!viewerCtx || !selected) return;

    if (viewerCtx.domain === "shoppable") {
      const ad = selected.shoppable;
      if (!ad) return;
      const offerId = viewerCtx.kind === "hero" ? selectedHeroOfferId : viewerCtx.offerId;
      if (!offerId) return setToast("Choose an item first.");
      shoppableAdd(ad, offerId);
      return;
    }

    const live = selected.live;
    if (!live) return;
    const itemId = viewerCtx.kind === "hero" ? (live.featured[0]?.id || "") : viewerCtx.itemId;
    if (!itemId) return setToast("Choose an item first.");
    liveAdd(live, itemId);
  };

  // main header section tabs
  const segmentTabs: Array<{ key: "All" | DealType; label: string; icon: React.ReactNode }> = [
    { key: "All", label: "All", icon: <Layers className="h-4 w-4" /> },
    { key: "Shoppable Adz", label: "Shoppable Adz", icon: <Wand2 className="h-4 w-4" /> },
    { key: "Live Sessionz", label: "Live Sessionz", icon: <Video className="h-4 w-4" /> },
    { key: "Live + Shoppables", label: "Live + Shoppables", icon: <Sparkles className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Dealz Marketplace"
        rightContent={
          <div className="flex items-center gap-2">
            <Btn tone="neutral" onClick={() => safeNav(ROUTES.assetLibrary)} left={<ExternalLink className="h-4 w-4" />}>
              Asset Library
            </Btn>
            <Btn tone="primary" onClick={() => setNewOpen(true)} left={<Plus className="h-4 w-4" />}>
              New Dealz
            </Btn>
          </div>
        }
      />

      {/* Tabs + Filters */}
      <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {segmentTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSegment(t.key)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-extrabold ring-1 transition",
                    segment === t.key
                      ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100"
                      : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-neutral-50 dark:bg-slate-950 px-3 py-2 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                <Search className="h-4 w-4 text-neutral-500 dark:text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dealz, suppliers, hosts…"
                  className="w-full bg-transparent text-sm outline-none text-neutral-900 dark:text-slate-100 placeholder:text-neutral-500 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 px-3 py-2 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
                <Filter className="h-4 w-4 text-neutral-500 dark:text-slate-400" />
                <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="bg-transparent text-sm font-extrabold outline-none text-neutral-900 dark:text-slate-100 dark:bg-slate-900">
                  {platformsAll.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <Btn tone="ghost" onClick={() => setToast("More filters (demo)")} left={<MoreHorizontal className="h-4 w-4" />}>
                More
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Dealz</div>
            <Pill tone="neutral">
              <Package className="h-3.5 w-3.5" />
              {filtered.length}
            </Pill>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filtered.map((d) => {
              const start = new Date(d.startISO);
              const end = new Date(d.endISO);
              const state = computeCountdownState(Date.now(), start.getTime(), end.getTime());
              const selectedCard = d.id === selectedId;

              const platforms = Array.from(new Set([...(d.shoppable?.platforms || []), ...(d.live?.platforms || [])]));
              const itemsCount = (d.shoppable?.offers?.length || 0) + (d.live?.featured?.length || 0);

              const hero = d.shoppable?.heroImageUrl || d.live?.heroImageUrl || d.supplier.logoUrl;

              const isExpanded = d.id === expandedId;

              return (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedId(d.id);
                    if (window.innerWidth < 1024) {
                      setExpandedId(isExpanded ? null : d.id);
                    }
                  }}
                  className={cx(
                    "rounded-3xl p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition cursor-pointer",
                    selectedCard
                      ? "bg-orange-50 dark:bg-orange-900/10 ring-2"
                      : "bg-white dark:bg-slate-900"
                  )}
                  style={selectedCard ? { borderColor: ORANGE, boxShadow: `0 0 0 1px ${ORANGE}` } : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <div className="h-11 w-11 rounded-2xl overflow-hidden ring-1 ring-neutral-200 dark:ring-slate-700 bg-neutral-100 dark:bg-slate-800">
                        <img src={hero} alt={d.title} className="h-full w-full object-cover" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-neutral-900 dark:text-slate-100">{d.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-slate-400">
                          <span className="font-extrabold text-neutral-900 dark:text-slate-200">{d.supplier.name}</span>
                          <span>•</span>
                          <span>{d.supplier.category}</span>
                          <span>•</span>
                          <span className="truncate">Host: {d.creator.handle}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <CountdownPill startsAt={start} endsAt={end} />
                          <Pill tone="neutral">
                            <Package className="h-3.5 w-3.5" />
                            {itemsCount} items
                          </Pill>
                          <Pill tone={state === "live" ? "good" : state === "upcoming" ? "warn" : "neutral"}>
                            {state === "live" ? "Live" : state === "upcoming" ? "Scheduled" : "Ended"}
                          </Pill>
                          <Pill tone="pro">
                            <Sparkles className="h-3.5 w-3.5" />
                            {d.type}
                          </Pill>
                          <Pill tone={getHostRole(d) === "Supplier" ? "brand" : "good"}>
                            <BadgeCheck className="h-3.5 w-3.5" />
                            {hostRoleLabel(d)}
                          </Pill>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {platforms.slice(0, 4).map((p) => (
                            <Pill key={p} tone="neutral">
                              <Link2 className="h-3.5 w-3.5" />
                              {p}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Btn
                        tone="ghost"
                        onClick={() => {
                          setSelectedId(d.id);
                          if (window.innerWidth < 1024) {
                            setExpandedId(isExpanded ? null : d.id);
                          }
                        }}
                        left={<Layers className="h-4 w-4" />}
                      >
                        Preview
                      </Btn>
                      <Btn
                        tone="neutral"
                        onClick={() => {
                          setSelectedId(d.id);
                          if (window.innerWidth < 1024) {
                            setExpandedId(isExpanded ? null : d.id);
                          } else {
                            setDetailsOpen(true);
                          }
                        }}
                        left={<Info className="h-4 w-4" />}
                      >
                        Details
                      </Btn>
                      {d.shoppable ? (
                        <Btn tone="neutral" onClick={() => openAdBuilderFor(d)} left={<Wand2 className="h-4 w-4" />}>
                          Ad Builder
                        </Btn>
                      ) : null}
                      {d.live ? (
                        <Btn tone="neutral" onClick={() => openLiveBuilderFor(d)} left={<Video className="h-4 w-4" />}>
                          Live Builder
                        </Btn>
                      ) : null}
                    </div>
                  </div>

                  {/* Inline expansion for mobile */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 lg:hidden">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <GovernancePills deal={d} />
                      </div>
                      {d.type === "Live + Shoppables" && d.shoppable && d.live ? (
                        <div className="mb-3 flex gap-2 px-1">
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setHybridTab("shoppable"); }}
                            className={cx(
                              "flex-1 rounded-2xl px-3 py-2 text-sm font-extrabold ring-1 transition-all",
                              hybridTab === "shoppable" ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100" : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                            )}
                          >
                            Shoppable Adz
                          </button>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setHybridTab("live"); }}
                            className={cx(
                              "flex-1 rounded-2xl px-3 py-2 text-sm font-extrabold ring-1 transition-all",
                              hybridTab === "live" ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100" : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                            )}
                          >
                            Live Invite
                          </button>
                        </div>
                      ) : null}

                      <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        {d.id === selectedId && (
                          <div className="px-1">
                            {d.type === "Shoppable Adz" && d.shoppable ? (
                              <ShoppableAdPreview
                                ad={d.shoppable}
                                cart={cart}
                                shareEnabled={d.shoppable.status === "Generated"}
                                onPlayHero={() => playShoppableHero(d.shoppable!)}
                                onPlayOffer={(id) => playShoppableOffer(d.shoppable!, id)}
                                onBuy={(id) => shoppableBuy(d.shoppable!, id)}
                                onAdd={(id) => shoppableAdd(d.shoppable!, id)}
                                onDecCart={decCart}
                                onClearCart={clearCart}
                                onShare={() => shareShoppable(d.shoppable!)}
                              />
                            ) : null}

                            {d.type === "Live Sessionz" && d.live ? (
                              <LiveInvitePreviewPhone
                                live={d.live}
                                cart={liveCart}
                                onDecCart={decLiveCart}
                                onClearCart={clearLiveCart}
                                onPlayHero={() => playLiveHero(d.live!)}
                                onPlayItem={(id) => playLiveItem(d.live!, id)}
                                onSharePromo={() => shareLivePromo(d.live!)}
                                onBuy={(id) => liveBuy(d.live!, id)}
                                onAdd={(id) => liveAdd(d.live!, id)}
                              />
                            ) : null}

                            {d.type === "Live + Shoppables" && d.shoppable && d.live ? (
                              hybridTab === "shoppable" ? (
                                <ShoppableAdPreview
                                  ad={d.shoppable}
                                  onPlayHero={() => playShoppableHero(d.shoppable!)}
                                  onPlayOffer={(id) => playShoppableOffer(d.shoppable!, id)}
                                  onBuy={(id) => shoppableBuy(d.shoppable!, id)}
                                  onAdd={(id) => shoppableAdd(d.shoppable!, id)}
                                  onDecCart={decCart}
                                  onClearCart={clearCart}
                                  cart={cart}
                                  onShare={() => shareShoppable(d.shoppable!)}
                                />
                              ) : (
                                <LiveInvitePreviewPhone
                                  live={d.live}
                                  cart={liveCart}
                                  onDecCart={decLiveCart}
                                  onClearCart={clearLiveCart}
                                  onPlayHero={() => playLiveHero(d.live!)}
                                  onPlayItem={(id) => playLiveItem(d.live!, id)}
                                  onSharePromo={() => shareLivePromo(d.live!)}
                                  onBuy={(id) => liveBuy(d.live!, id)}
                                  onAdd={(id) => liveAdd(d.live!, id)}
                                />
                              )
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview panel */}
        <div className="hidden lg:block lg:col-span-5 space-y-3">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">Preview</div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                  Selected deal preview. Hybrid dealz can switch between Live Invite and Shoppable preview while supplier governance stays outside the buyer-facing shell.
                </div>
              </div>
              <Pill tone="neutral">
                <Sparkles className="h-3.5 w-3.5" />
                Buyer-first
              </Pill>
            </div>

            {selected ? (
              <div className="mt-3">
                {selected.type === "Live + Shoppables" && selected.shoppable && selected.live ? (
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHybridTab("shoppable")}
                      className={cx(
                        "flex-1 rounded-2xl px-3 py-2 text-sm font-extrabold ring-1 transition-all",
                        hybridTab === "shoppable" ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100" : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                      )}
                    >
                      Shoppable Adz
                    </button>
                    <button
                      type="button"
                      onClick={() => setHybridTab("live")}
                      className={cx(
                        "flex-1 rounded-2xl px-3 py-2 text-sm font-extrabold ring-1 transition-all",
                        hybridTab === "live" ? "bg-neutral-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-neutral-900 dark:ring-slate-100" : "bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 ring-neutral-200 dark:ring-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800"
                      )}
                    >
                      Live Invite
                    </button>
                  </div>
                ) : null}

                {/* Render preview based on deal type */}
                {selected.type === "Shoppable Adz" && selected.shoppable ? (
                  <ShoppableAdPreview
                    ad={selected.shoppable}
                    cart={cart}
                    shareEnabled={selected.shoppable.status === "Generated"}
                    onPlayHero={() => playShoppableHero(selected.shoppable!)}
                    onPlayOffer={(id) => playShoppableOffer(selected.shoppable!, id)}
                    onBuy={(id) => shoppableBuy(selected.shoppable!, id)}
                    onAdd={(id) => shoppableAdd(selected.shoppable!, id)}
                    onDecCart={decCart}
                    onClearCart={clearCart}
                    onShare={() => shareShoppable(selected.shoppable!)}
                  />
                ) : null}

                {selected.type === "Live Sessionz" && selected.live ? (
                  <LiveInvitePreviewPhone
                    live={selected.live}
                    cart={liveCart}
                    onDecCart={decLiveCart}
                    onClearCart={clearLiveCart}
                    onPlayHero={() => playLiveHero(selected.live!)}
                    onPlayItem={(id) => playLiveItem(selected.live!, id)}
                    onSharePromo={() => shareLivePromo(selected.live!)}
                    onBuy={(id) => liveBuy(selected.live!, id)}
                    onAdd={(id) => liveAdd(selected.live!, id)}
                  />
                ) : null}

                {selected.type === "Live + Shoppables" && selected.shoppable && selected.live ? (
                  hybridTab === "shoppable" ? (
                    <ShoppableAdPreview
                      ad={selected.shoppable}
                      onPlayHero={() => playShoppableHero(selected.shoppable!)}
                      onPlayOffer={(id) => playShoppableOffer(selected.shoppable!, id)}
                      onBuy={(id) => shoppableBuy(selected.shoppable!, id)}
                      onAdd={(id) => shoppableAdd(selected.shoppable!, id)}
                      onDecCart={decCart}
                      onClearCart={clearCart}
                      cart={cart}
                      onShare={() => shareShoppable(selected.shoppable!)}
                    />
                  ) : (
                    <LiveInvitePreviewPhone
                      live={selected.live}
                      cart={liveCart}
                      onDecCart={decLiveCart}
                      onClearCart={clearLiveCart}
                      onPlayHero={() => playLiveHero(selected.live!)}
                      onPlayItem={(id) => playLiveItem(selected.live!, id)}
                      onSharePromo={() => shareLivePromo(selected.live!)}
                      onBuy={(id) => liveBuy(selected.live!, id)}
                      onAdd={(id) => liveAdd(selected.live!, id)}
                    />
                  )
                ) : null}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-neutral-50 dark:bg-slate-950 p-4 text-sm text-neutral-700 dark:text-slate-400 ring-1 ring-neutral-200 dark:ring-slate-800 transition-colors">Select a deal to preview.</div>
            )}
          </div>

          {/* Context actions */}
          {selected ? (
            <div className="rounded-3xl bg-neutral-100 dark:bg-slate-950 p-4 text-neutral-900 dark:text-white ring-1 ring-neutral-200 dark:ring-white/5 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-600 dark:text-white/80">Selected deal</div>
                  <div className="truncate text-base font-extrabold">{selected.title}</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-white/70">
                    Supplier: {selected.supplier.name} · Host: {selected.creator.handle}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected.shoppable ? (
                    <Btn tone="primary" onClick={() => openAdBuilderFor(selected)} left={<Wand2 className="h-4 w-4" />}>
                      Open Ad Builder
                    </Btn>
                  ) : null}
                  {selected.live ? (
                    <Btn tone="primary" onClick={() => openLiveBuilderFor(selected)} left={<Video className="h-4 w-4" />}>
                      Open Live Builder
                    </Btn>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <GovernancePills deal={selected} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selected.shoppable ? (
                  <Btn
                    tone="neutral"
                    onClick={() => openPerformanceFor(selected)}
                    left={<TrendingUp className="h-4 w-4" />}
                    title="Opens Adz Performance for the shoppable part of this deal"
                  >
                    Adz Performance
                  </Btn>
                ) : null}

                {selected.shoppable ? (
                  <Btn tone="neutral" onClick={() => shareShoppable(selected.shoppable!)} left={<Copy className="h-4 w-4" />} disabled={selected.shoppable.status !== "Generated"} title={selected.shoppable.status !== "Generated" ? "Generate the ad first" : undefined}>
                    Copy supplier link
                  </Btn>
                ) : null}

                {selected.live ? (
                  <Btn tone="neutral" onClick={() => shareLivePromo(selected.live!)} left={<Copy className="h-4 w-4" />}>
                    Copy Live promo link
                  </Btn>
                ) : null}
              </div>

              {selected.shoppable && selected.shoppable.status !== "Generated" ? (
                <div className="mt-3 rounded-2xl bg-neutral-200 dark:bg-white/10 p-3">
                  <div className="text-xs font-extrabold">Shoppable share links are disabled</div>
                  <div className="mt-1 text-xs text-neutral-600 dark:text-white/70">Generate the Shoppable Ad in Supplier Ad Builder to enable platform share links.</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Details drawer */}
      <DealDetailsDrawer
        open={detailsOpen}
        deal={selected || null}
        onClose={() => setDetailsOpen(false)}
        onOpenAdBuilder={() => selected && openAdBuilderFor(selected)}
        onOpenLiveBuilder={() => selected && openLiveBuilderFor(selected)}
        onOpenPerformance={() => selected && openPerformanceFor(selected)}
        onOpenLink={safeNav}
      />

      {/* New Deal wizard */}
      <NewDealzWizard
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(d, behavior) => {
          setDealz((prev) => [d, ...prev]);
          setSelectedId(d.id);
          setToast("Deal created (demo).");
          if (behavior === "open-builder") {
            if (d.type === "Shoppable Adz") openAdBuilderFor(d);
            else if (d.type === "Live Sessionz") openLiveBuilderFor(d);
            else {
              // hybrid: open Ad Builder first, Live Builder is available in details/actions.
              openAdBuilderFor(d);
            }
          }
        }}
      />

      {/* Unified viewer */}
      <UnifiedMediaViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        ctx={viewerCtx}
        mode={viewerMode}
        countdownState={countdownState}
        countdownLabel={countdownLabel}
        stockLabel={viewerStockLabel}
        priceLabel={viewerPriceLabel}
        ctaPrimary={
          viewerCtx?.domain === "shoppable"
            ? selected?.shoppable?.ctaPrimaryLabel || "Buy now"
            : "Buy now"
        }
        ctaSecondary={
          viewerCtx?.domain === "shoppable"
            ? selected?.shoppable?.ctaSecondaryLabel || "Add to cart"
            : "Add to cart"
        }
        onBuyNow={viewerBuyNow}
        onAddToCart={viewerAddToCart}
        loved={loved}
        onLove={() => setLoved((v) => !v)}
        onShare={() => {
          if (!selected) return;
          if (viewerCtx?.domain === "shoppable" && selected.shoppable) shareShoppable(selected.shoppable);
          if (viewerCtx?.domain === "live" && selected.live) shareLivePromo(selected.live);
        }}
        chooser={chooser || undefined}
        chooserTitle={chooser ? "Choose item (hero viewer)" : undefined}
      />

      {/* Builder & Performance Drawers */}
      <AdBuilderDrawer
        open={adBuilderOpen}
        onClose={() => setAdBuilderOpen(false)}
        adId={selected?.shoppable?.id}
      />

      <LiveBuilderDrawer
        open={liveBuilderOpen}
        onClose={() => setLiveBuilderOpen(false)}
        dealId={selected?.id}
      />

      <AdzPerformanceDrawer
        open={adzPerformanceOpen}
        onClose={() => setAdzPerformanceOpen(false)}
        entities={selected ? [{
          id: selected.id,
          kind: "deal",
          name: selected.title,
          platforms: ["Instagram"],
          items: [],
          impressions: 1200,
          clicks: 340,
          orders: 12,
          earnings: 600
        }] : []}
        defaultEntityId={selected?.id}
      />

      {/* Toast */}
      {
        toast ? (
          <div className="fixed bottom-4 left-1/2 z-[120] -translate-x-1/2">
            <div className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white shadow-lg">{toast}</div>
          </div>
        ) : null
      }
    </div >
  );
}
