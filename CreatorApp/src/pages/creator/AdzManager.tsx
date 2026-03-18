"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { PageHeader } from "../../components/PageHeader";
import AdBuilder from "./AdBuilder";
import { AdzPerformanceDrawer, PerformanceEntity, PerfPlatform } from "./AdzPerformance";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Timer,
} from "lucide-react";

/**
 * Adz Manager — Regenerated (Premium)
 * ----------------------------------
 * Purpose:
 * - Operational control center for Shoppable Adz (create/edit/duplicate, schedule, share links, approvals, performance)
 *
 * Important updates included:
 * - Terminology: "Supplier" (formerly Supplier)
 * - Products + Services support
 * - Retail + Wholesale support (primarily affects Product offers / Sellers)
 * - Compensation arrangement shown everywhere: Commission / Flat fee / Hybrid
 * - Share/copy link actions disabled until Ad is Generated
 * - Wiring points:
 *   - Open Ad Builder (independent page) → /ad-builder?adId=...
 *   - Open Adz Performance (dedicated page) → /adz-performance?adId=...
 *   - Optional: Open Adz Marketplace preview → /adz-marketplace?adId=...
 *
 * Notes:
 * - This is a premium UI shell with mock data. Replace with API calls and your routing system.
 */

const ORANGE = "#f77f00";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type AdStatus = "Draft" | "Scheduled" | "Live" | "Paused" | "Pending approval" | "Rejected" | "Ended";
type OfferType = "PRODUCT" | "SERVICE";
type SellingMode = "RETAIL" | "WHOLESALE";
type ViewerMode = "modal" | "fullscreen";

type Creator = { name: string; handle: string; avatarUrl: string; verified?: boolean };

type Compensation =
  | { type: "Commission"; commissionRate: number }
  | { type: "Flat fee"; flatFee: number; currency: "UGX" | "USD" | "GBP" }
  | { type: "Hybrid"; commissionRate: number; flatFee: number; currency: "UGX" | "USD" | "GBP" };

type WholesaleTier = { minQty: number; unitPrice: number };
type WholesalePricing = {
  moq: number;
  step: number;
  tiers: WholesaleTier[];
  leadTimeLabel?: string;
  businessOnly?: boolean;
};

type Offer = {
  id: string;
  type: OfferType;
  name: string;
  currency: "UGX" | "USD" | "GBP";
  price: number; // retail or service price
  basePrice?: number;
  stockLeft: number; // -1 unlimited or not applicable
  posterUrl: string; // 500×500 recommended
  videoUrl?: string;
  desktopMode?: ViewerMode;

  sellingModes?: SellingMode[]; // products mainly
  defaultSellingMode?: SellingMode;
  wholesale?: WholesalePricing;

  // For services (optional)
  serviceMeta?: { durationMins?: number; bookingType?: "Instant" | "Request" };
};

type Ad = {
  id: string;
  name: string;

  status: AdStatus;
  platforms: string[];

  supplier: { name: string; category: string; logoUrl: string };
  campaign: { name: string; subtitle: string };

  // schedule
  startISO: string;
  endISO: string;
  timezone: string;

  // media
  heroImageUrl: string; // 1920×1080 recommended
  heroIntroVideoUrl?: string;
  heroDesktopMode?: ViewerMode;

  creator: Creator;
  owner: string;

  compensation: Compensation;
  offers: Offer[];

  // trust signals
  hasBrokenLink: boolean;
  lowStock: boolean;
  needsApproval: boolean;
  lock?: { locked: boolean; label: string; reason: string };

  // analytics snapshot
  impressions: number;
  clicks: number;
  orders: number;
  earnings: number;

  // link state
  generated: boolean;
};

type DrawerKey = null | "schedule" | "performance" | "tracking" | "templates" | "builder";

function money(currency: "UGX" | "USD" | "GBP", amount: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function fmtLocal(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function countdownLabel(nowMs: number, startMs: number, endMs: number) {
  const upcoming = nowMs < startMs;
  const live = nowMs >= startMs && nowMs <= endMs;
  const target = upcoming ? startMs : live ? endMs : endMs;
  const diff = Math.max(0, target - nowMs);
  const s = Math.floor(diff / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const label = upcoming ? "Starts in" : live ? "Ends in" : "Ended";
  return { label, hh, mm, ss, state: upcoming ? "upcoming" : live ? "live" : "ended" as const };
}

function enabledModesForOffer(o: Offer): SellingMode[] {
  if (o.type === "SERVICE") return ["RETAIL"];
  const ms = (o.sellingModes || []).filter(Boolean);
  return ms.length ? ms : ["RETAIL"];
}

function defaultModeForOffer(o: Offer): SellingMode {
  const ms = enabledModesForOffer(o);
  return o.defaultSellingMode && ms.includes(o.defaultSellingMode) ? o.defaultSellingMode : ms[0];
}

function wholesaleUnitPrice(o: Offer, qty: number): number | null {
  if (o.type !== "PRODUCT" || !o.wholesale?.tiers?.length) return null;
  const tiers = [...o.wholesale.tiers].sort((a, b) => a.minQty - b.minQty);
  let unit = tiers[0].unitPrice;
  for (const t of tiers) if (qty >= t.minQty) unit = t.unitPrice;
  return unit;
}

function compensationLabel(c: Compensation) {
  if (c.type === "Commission") return `Commission · ${(c.commissionRate * 100).toFixed(0)}%`;
  if (c.type === "Flat fee") return `Flat fee · ${money(c.currency, c.flatFee)}`;
  return `Hybrid · ${(c.commissionRate * 100).toFixed(0)}% + ${money(c.currency, c.flatFee)}`;
}

function Pill({
  tone = "neutral",
  children,
  title
}: {
  tone?: "neutral" | "brand" | "good" | "warn" | "bad" | "pro";
  children: React.ReactNode;
  title?: string;
}) {
  const cls =
    tone === "brand"
      ? "bg-orange-500 text-white border-transparent"
      : tone === "good"
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
        : tone === "warn"
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300"
          : tone === "bad"
            ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300"
            : tone === "pro"
              ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-300"
              : "bg-neutral-50 dark:bg-slate-800 border-neutral-200 dark:border-slate-700 text-neutral-800 dark:text-slate-300";
  return (
    <span
      title={title}
      className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-extrabold", cls)}
      style={tone === "brand" ? { background: ORANGE } : undefined}
    >
      {children}
    </span>
  );
}

function Btn({
  tone = "neutral",
  left,
  className,
  disabled,
  onClick,
  children,
  title
}: {
  tone?: "primary" | "neutral" | "danger";
  left?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed";
  const cls =
    tone === "primary"
      ? "border-transparent text-white hover:brightness-95"
      : tone === "danger"
        ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
        : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-900 dark:text-neutral-100";
  return (
    <button
      type="button"
      className={cx(base, cls, className)}
      style={tone === "primary" ? { background: ORANGE } : undefined}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {left}
      {children}
    </button>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
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
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-colors border-l border-neutral-200 dark:border-slate-800">
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-[13px] font-extrabold text-neutral-900 dark:text-slate-100">{title}</div>
          <button
            type="button"
            className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function Avatar({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="h-10 w-10 rounded-2xl object-cover ring-1 ring-neutral-200 dark:ring-slate-700" />;
}

/** ------------------------------ Page ------------------------------ */

const SAMPLE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEMO_ADS: Ad[] = [
  {
    id: "AD-10021",
    name: "Flash Dealz: Power Bank",
    status: "Live",
    platforms: ["TikTok"],
    supplier: {
      name: "BBS",
      category: "Electronics",
      logoUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=256&auto=format&fit=crop"
    },
    campaign: { name: "Flash Dealz", subtitle: "Limited-time drops" },
    startISO: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    endISO: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    timezone: "Africa/Kampala",
    heroImageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroDesktopMode: "fullscreen",
    creator: { name: "Kofi Mensah", handle: "@kofi_live", avatarUrl: "https://i.pravatar.cc/100?img=11", verified: true },
    owner: "Producer",
    compensation: { type: "Commission", commissionRate: 0.12 },
    offers: [
      {
        id: "O-1",
        type: "PRODUCT",
        name: "20,000mAh Power Bank",
        currency: "UGX",
        price: 65000,
        basePrice: 80000,
        stockLeft: 8,
        posterUrl: "https://images.unsplash.com/photo-1580915411954-282cb1f69d1c?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "RETAIL",
        wholesale: {
          moq: 10,
          step: 5,
          leadTimeLabel: "Ships in 2–4 days",
          tiers: [
            { minQty: 10, unitPrice: 56000 },
            { minQty: 25, unitPrice: 52000 },
            { minQty: 50, unitPrice: 49000 }
          ]
        }
      },
      {
        id: "O-2",
        type: "SERVICE",
        name: "Device setup support (15min)",
        currency: "UGX",
        price: 15000,
        stockLeft: -1,
        posterUrl: "https://images.unsplash.com/photo-1556741533-f6acd647d2c4?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        serviceMeta: { durationMins: 15, bookingType: "Instant" }
      }
    ],
    hasBrokenLink: false,
    lowStock: true,
    needsApproval: false,
    lock: { locked: true, label: "Locked by Ops", reason: "Live ads cannot be edited." },
    impressions: 182400,
    clicks: 9720,
    orders: 412,
    earnings: 1860,
    generated: true
  },
  {
    id: "AD-10022",
    name: "Beauty Drop: Glow Serum",
    status: "Pending approval",
    platforms: ["Instagram"],
    supplier: {
      name: "GlowCo",
      category: "Beauty",
      logoUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=256&auto=format&fit=crop"
    },
    campaign: { name: "Beauty Drop", subtitle: "Host-first content" },
    startISO: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    endISO: new Date(Date.now() + 37 * 60 * 60 * 1000).toISOString(),
    timezone: "Africa/Kampala",
    heroImageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroDesktopMode: "modal",
    creator: { name: "Nala Okoye", handle: "@nala.skin", avatarUrl: "https://i.pravatar.cc/100?img=32", verified: true },
    owner: "Editor",
    compensation: { type: "Flat fee", flatFee: 550, currency: "GBP" },
    offers: [
      {
        id: "O-3",
        type: "PRODUCT",
        name: "Vitamin C Serum",
        currency: "UGX",
        price: 38000,
        basePrice: 52000,
        stockLeft: 12,
        posterUrl: "https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL"],
        defaultSellingMode: "RETAIL"
      }
    ],
    hasBrokenLink: false,
    lowStock: false,
    needsApproval: true,
    impressions: 0,
    clicks: 0,
    orders: 0,
    earnings: 0,
    generated: false
  },
  {
    id: "AD-10023",
    name: "Home Picks: Blender",
    status: "Paused",
    platforms: ["YouTube"],
    supplier: {
      name: "HomePro",
      category: "Home",
      logoUrl: "https://images.unsplash.com/photo-1486611367184-17759508999c?q=80&w=256&auto=format&fit=crop"
    },
    campaign: { name: "Home Essentials", subtitle: "Kitchen upgrade" },
    startISO: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endISO: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    timezone: "Africa/Kampala",
    heroImageUrl: "https://images.unsplash.com/photo-1486611367184-17759508999c?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroDesktopMode: "modal",
    creator: { name: "Amina K.", handle: "@aminareviews", avatarUrl: "https://i.pravatar.cc/100?img=47" },
    owner: "Owner",
    compensation: { type: "Hybrid", commissionRate: 0.1, flatFee: 200, currency: "GBP" },
    offers: [
      {
        id: "O-4",
        type: "PRODUCT",
        name: "6-Speed Blender",
        currency: "UGX",
        price: 240000,
        stockLeft: 18,
        posterUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL", "WHOLESALE"],
        defaultSellingMode: "WHOLESALE",
        wholesale: {
          moq: 3,
          step: 1,
          leadTimeLabel: "Ships in 3–6 days",
          tiers: [
            { minQty: 3, unitPrice: 210000 },
            { minQty: 6, unitPrice: 199000 },
            { minQty: 12, unitPrice: 189000 }
          ]
        }
      }
    ],
    hasBrokenLink: true,
    lowStock: false,
    needsApproval: false,
    impressions: 60200,
    clicks: 1100,
    orders: 21,
    earnings: 95,
    generated: true
  },
  {
    id: "AD-10024",
    name: "EV Accessories: Helmet",
    status: "Rejected",
    platforms: ["TikTok"],
    supplier: {
      name: "MotoGear",
      category: "Auto",
      logoUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=256&auto=format&fit=crop"
    },
    campaign: { name: "EV Accessories", subtitle: "Safety picks" },
    startISO: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    endISO: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    timezone: "Africa/Kampala",
    heroImageUrl: "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?q=80&w=1600&auto=format&fit=crop",
    heroIntroVideoUrl: SAMPLE_VIDEO,
    heroDesktopMode: "modal",
    creator: { name: "Sade Bello", handle: "@sade.style", avatarUrl: "https://i.pravatar.cc/100?img=37" },
    owner: "Editor",
    compensation: { type: "Commission", commissionRate: 0.1 },
    offers: [
      {
        id: "O-5",
        type: "PRODUCT",
        name: "Rider Helmet (ECE)",
        currency: "UGX",
        price: 165000,
        stockLeft: 0,
        posterUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=900&auto=format&fit=crop",
        videoUrl: SAMPLE_VIDEO,
        desktopMode: "modal",
        sellingModes: ["RETAIL"],
        defaultSellingMode: "RETAIL"
      }
    ],
    hasBrokenLink: false,
    lowStock: false,
    needsApproval: false,
    impressions: 3000,
    clicks: 55,
    orders: 1,
    earnings: 4,
    generated: false
  }
];

export default function AdzManager() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const [ads, setAds] = useState<Ad[]>(DEMO_ADS);

  const [selectedId, setSelectedId] = useState<string>(DEMO_ADS[0]?.id || "");
  const selected = useMemo(() => ads.find((a) => a.id === selectedId) || ads[0], [ads, selectedId]);

  // filters
  const [statusTab, setStatusTab] = useState<AdStatus | "All">("All");
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("All");
  const [supplier, setSupplier] = useState<string>("All");
  const [offerKind, setOfferKind] = useState<"All" | OfferType>("All");
  const [sellingModeFilter, setSellingModeFilter] = useState<"All" | "Retail" | "Wholesale" | "Both">("All");

  const platforms = useMemo(() => {
    const s = new Set<string>();
    ads.forEach((a) => a.platforms.forEach((p) => s.add(p)));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    ads.forEach((a) => s.add(a.supplier.name));
    return ["All", ...Array.from(s)];
  }, [ads]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ads
      .filter((a) => (statusTab === "All" ? true : a.status === statusTab))
      .filter((a) => (platform === "All" ? true : a.platforms.includes(platform)))
      .filter((a) => (supplier === "All" ? true : a.supplier.name === supplier))
      .filter((a) => {
        if (offerKind === "All") return true;
        return a.offers.some((o) => o.type === offerKind);
      })
      .filter((a) => {
        if (sellingModeFilter === "All") return true;
        // only applies to products
        const productOffers = a.offers.filter((o) => o.type === "PRODUCT");
        if (!productOffers.length) return false;
        const flags = productOffers.map((o) => enabledModesForOffer(o));
        const hasRetail = flags.some((ms) => ms.includes("RETAIL"));
        const hasWholesale = flags.some((ms) => ms.includes("WHOLESALE"));
        if (sellingModeFilter === "Retail") return hasRetail && !hasWholesale;
        if (sellingModeFilter === "Wholesale") return hasWholesale && !hasRetail;
        return hasRetail && hasWholesale;
      })
      .filter((a) => {
        if (!query) return true;
        return (
          a.name.toLowerCase().includes(query) ||
          a.campaign.name.toLowerCase().includes(query) ||
          a.supplier.name.toLowerCase().includes(query) ||
          a.creator.handle.toLowerCase().includes(query)
        );
      });
  }, [ads, statusTab, platform, supplier, q, offerKind, sellingModeFilter]);

  // drawers
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [drawerData, setDrawerData] = useState<string | undefined>(undefined);

  // performance entities mapper
  const performanceEntities: PerformanceEntity[] = useMemo(() => {
    return ads.map((a) => ({
      id: a.id,
      kind: "ad",
      name: a.name,
      status: a.status,
      platforms: a.platforms as PerfPlatform[],
      items: a.offers.map((o) => ({
        id: o.id,
        kind: o.type === "PRODUCT" ? "product" : "service",
        name: o.name,
        price: o.price,
        imageUrl: o.posterUrl,
        videoUrl: o.videoUrl
      })),
      impressions: a.impressions,
      clicks: a.clicks,
      orders: a.orders,
      earnings: a.earnings,
      creator: { name: a.creator.name, handle: a.creator.handle, avatarUrl: a.creator.avatarUrl },
      compensation: a.compensation,
      hasBrokenLink: a.hasBrokenLink
    }));
  }, [ads]);

  // per-ad offer mode editing (manager can see defaults)
  const [modeByOffer, setModeByOffer] = useState<Record<string, SellingMode>>({});
  useEffect(() => {
    if (!selected) return;
    const init: Record<string, SellingMode> = {};
    selected.offers.forEach((o) => (init[o.id] = defaultModeForOffer(o)));
    setModeByOffer(init);
  }, [selected]); // Dependency changed from selectedId to selected

  function openAdBuilder(ad: Ad) {
    setDrawerData(ad.id);
    setDrawer("builder");
  }

  function openAdzMarketplacePreview(ad: Ad) {
    navigate(`/AdzMarketplace?adId=${encodeURIComponent(ad.id)}`);
  }

  function openAdzPerformance(ad: Ad) {
    setDrawerData(ad.id);
    setDrawer("performance");
  }

  function copyShareLink(ad: Ad) {
    const link = `https://mldz.link/${encodeURIComponent(ad.id)}`;
    try {
      navigator.clipboard?.writeText(link);
    } catch (err) {
      // ignore
    }
    setToast("Share link copied (demo).");
  }

  function generateAd(adId: string) {
    setAds((prev) =>
      prev.map((a) =>
        a.id === adId
          ? {
            ...a,
            status: a.status === "Draft" ? "Scheduled" : a.status,
            generated: true
          }
          : a
      )
    );
    setToast("Ad generated. Share links are now enabled.");
  }

  function updateOfferDefaultMode(offerId: string, mode: SellingMode) {
    setModeByOffer((prev) => ({ ...prev, [offerId]: mode }));
    // In a real app you would PATCH the offer config.
    setToast(`Default mode set: ${offerId} → ${mode === "WHOLESALE" ? "Wholesale" : "Retail"} (demo)`);
  }

  function statusPillTone(s: AdStatus): "neutral" | "good" | "warn" | "bad" {
    if (s === "Live") return "good";
    if (s === "Scheduled" || s === "Pending approval") return "warn";
    if (s === "Rejected") return "bad";
    return "neutral";
  }

  const startsAt = useMemo(() => (selected ? new Date(selected.startISO) : new Date()), [selected?.startISO]);
  const endsAt = useMemo(() => (selected ? new Date(selected.endISO) : new Date(Date.now() + 3600 * 1000)), [selected?.endISO]);
  // The countdown variable was unused, so it's removed to fix the warning.
  // const countdown = useMemo(() => countdownLabel(Date.now(), startsAt.getTime(), endsAt.getTime()), [startsAt, endsAt]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Adz Manager"
        rightContent={
          <div className="flex items-center gap-2">
            <Btn tone="neutral" left={<BarChart3 className="h-4 w-4" />} onClick={() => selected && openAdzPerformance(selected)}>
              Adz Performance
            </Btn>
            <Btn tone="primary" left={<Plus className="h-4 w-4" />} onClick={() => selected && openAdBuilder(selected)}>
              New / Edit in Ad Builder
            </Btn>
          </div>
        }
      />

      {/* Filters & Status Bar */}
      <div className="border-t border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search ads, campaigns..."
                className="w-full rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-10 py-2 text-[12px] font-extrabold focus:outline-none focus:ring-1 focus:ring-orange-500 dark:text-slate-100"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {platforms.map((p) => (
                <option key={p} value={p}>Platform: {p}</option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s} value={s}>Supplier: {s}</option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={offerKind}
              onChange={(e) => setOfferKind(e.target.value as OfferType | "All")}
            >
              <option value="All">Offer: All</option>
              <option value="PRODUCT">Offer: Product</option>
              <option value="SERVICE">Offer: Service</option>
            </select>
            <select
              className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold focus:outline-none dark:text-slate-100"
              value={sellingModeFilter}
              onChange={(e) => setSellingModeFilter(e.target.value as "All" | "Retail" | "Wholesale" | "Both")}
            >
              <option value="All">Mode: All</option>
              <option value="Retail">Mode: Retail only</option>
              <option value="Wholesale">Mode: Wholesale only</option>
              <option value="Both">Mode: Hybrid</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["All", "Draft", "Scheduled", "Live", "Paused", "Ended"] as Array<AdStatus | "All">).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setStatusTab(t)}
                className={cx(
                  "rounded-2xl border px-3 py-2 text-[12px] font-extrabold transition",
                  statusTab === t
                    ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                    : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-neutral-900 dark:text-slate-100 hover:bg-neutral-50 dark:hover:bg-slate-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-5 rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Your Adz</div>
              <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Select an ad to manage details.</div>
            </div>
            <Pill tone="neutral">{filtered.length} results</Pill>
          </div>

          <div className="p-3 max-h-[760px] overflow-auto space-y-2">
            {filtered.map((a) => {
              const active = a.id === selectedId;
              const hasWholesale = a.offers.some((o) => enabledModesForOffer(o).includes("WHOLESALE"));

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cx(
                    "w-full text-left rounded-3xl border p-3 transition",
                    active
                      ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50 dark:bg-orange-950 shadow-sm"
                      : "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-neutral-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar src={a.creator.avatarUrl} alt={a.creator.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={cx("truncate text-[12px] font-extrabold", active ? "text-orange-600 dark:text-orange-400" : "text-neutral-900 dark:text-slate-100")}>
                            {a.name}
                          </div>
                          <Pill tone={active ? "brand" : statusPillTone(a.status)}>{a.status}</Pill>
                        </div>
                        <div className={cx("mt-1 truncate text-[11px]", active ? "text-orange-600/80 dark:text-orange-400/80" : "text-neutral-600 dark:text-slate-400")}>
                          Campaign: {a.campaign.name} · Supplier: {a.supplier.name}
                        </div>
                        <div className={cx("mt-2 flex flex-wrap gap-2", active ? "text-orange-600/90 dark:text-orange-400/90" : "text-neutral-700 dark:text-slate-300")}>
                          <Pill tone={active ? "brand" : "neutral"}>
                            {a.platforms.join(", ")}
                          </Pill>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      {a.lock?.locked ? (
                        <Pill tone={active ? "brand" : "warn"}>Locked</Pill>
                      ) : null}
                      {hasWholesale ? (
                        <Pill tone={active ? "brand" : "pro"}>Wholesale</Pill>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-7 space-y-4">
          {!selected ? (
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">No ad selected</div>
              <div className="mt-1 text-xs text-neutral-600 dark:text-slate-400">Select an ad from the list to manage it.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Snapshot cards inserted here temporarily to fix the mess */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Impressions", value: selected.impressions.toLocaleString() },
                  { label: "Clicks", value: selected.clicks.toLocaleString() },
                  { label: "Orders", value: selected.orders.toLocaleString() },
                  { label: "Earnings", value: money("USD", selected.earnings) }
                ].map((k) => (
                  <div key={k.label} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">{k.label}</div>
                    <div className="mt-1 text-xl font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Overview */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold text-neutral-900 dark:text-slate-100">{selected.name}</div>
                      <Pill tone={statusPillTone(selected.status)}>{selected.status}</Pill>
                    </div>

                    <div className="mt-1 text-[12px] text-neutral-600 dark:text-slate-400">
                      Campaign: <span className="font-bold text-neutral-900 dark:text-slate-100">{selected.campaign.name}</span> · Supplier:{" "}
                      <span className="font-bold text-neutral-900 dark:text-slate-100">{selected.supplier.name}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill tone="neutral">{compensationLabel(selected.compensation)}</Pill>
                      <Pill tone="neutral">
                        <Timer className="h-3.5 w-3.5" />
                        {selected.timezone}
                      </Pill>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-3">
                        <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Starts</div>
                        <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(startsAt)}</div>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-3">
                        <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Ends</div>
                        <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(endsAt)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Btn tone="primary" left={<Sparkles className="h-4 w-4" />} onClick={() => generateAd(selected.id)} disabled={selected.generated}>
                      {selected.generated ? "Generated" : "Generate Ad"}
                    </Btn>
                    <Btn tone="neutral" left={<ExternalLink className="h-4 w-4" />} onClick={() => openAdzMarketplacePreview(selected)}>
                      Buyer preview
                    </Btn>
                    <Btn tone="neutral" left={<Pencil className="h-4 w-4" />} onClick={() => openAdBuilder(selected)}>
                      Edit
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Offer Overview */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-neutral-200 dark:border-slate-800">
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Offer Overview</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">
                    Offers can be Products or Services. Wholesale affects Products (MOQ, tiers).
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {selected.offers.map((o) => {
                    const modes = enabledModesForOffer(o);
                    const activeMode = modeByOffer[o.id] || defaultModeForOffer(o);
                    const hasWholesale = modes.includes("WHOLESALE");

                    return (
                      <div key={o.id} className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-3">
                        <div className="flex items-start gap-3">
                          <img src={o.posterUrl} alt={o.name} className="h-14 w-14 rounded-2xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{o.name}</div>
                              {hasWholesale ? <Pill tone="pro">Wholesale</Pill> : null}
                            </div>
                            <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">{money(o.currency, o.price)}</div>
                            <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">{o.type === "PRODUCT" ? `${o.stockLeft} left` : "Service"}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">More tools</div>
                    <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">Open drawers for scheduling, performance, tracking and templates.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn tone="neutral" left={<CalendarClock className="h-4 w-4" />} onClick={() => setDrawer("schedule")}>
                      Schedule
                    </Btn>
                    <Btn tone="neutral" left={<BarChart3 className="h-4 w-4" />} onClick={() => setDrawer("performance")}>
                      Performance
                    </Btn>
                    <Btn tone="neutral" left={<Link2 className="h-4 w-4" />} onClick={() => setDrawer("tracking")}>
                      Tracking
                    </Btn>
                    <Btn tone="neutral" left={<Sparkles className="h-4 w-4" />} onClick={() => setDrawer("templates")}>
                      Templates
                    </Btn>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawers */}
      <Drawer open={drawer === "schedule"} title="Schedule & Calendar" onClose={() => setDrawer(null)}>
        {selected ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4">
              <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Current schedule</div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] text-neutral-700 dark:text-slate-300">
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                  <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Starts</div>
                  <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(new Date(selected.startISO))}</div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                  <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Ends</div>
                  <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{fmtLocal(new Date(selected.endISO))}</div>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                  <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Timezone</div>
                  <div className="mt-1 font-extrabold text-neutral-900 dark:text-slate-100">{selected.timezone}</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-neutral-600 dark:text-slate-400">
                Scheduling edits are typically done inside Ad Builder (supports duration + timezone logic).
              </div>
            </div>

            <Btn tone="primary" left={<ArrowRight className="h-4 w-4" />} onClick={() => openAdBuilder(selected)}>
              Open Schedule in Ad Builder
            </Btn>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={drawer === "performance"} title="Adz Performance" onClose={() => setDrawer(null)}>
        {selected ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Performance snapshot</div>
                  <div className="mt-1 text-[11px] text-neutral-600 dark:text-slate-400">This is a light snapshot. Open the dedicated page for deep analytics.</div>
                </div>
                <Pill tone="brand">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Pro
                </Pill>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Impressions", value: selected.impressions.toLocaleString() },
                  { label: "Clicks", value: selected.clicks.toLocaleString() },
                  { label: "Orders", value: selected.orders.toLocaleString() },
                  { label: "Earnings", value: money("USD", selected.earnings) }
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
                    <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">{k.label}</div>
                    <div className="mt-1 text-[14px] font-extrabold text-neutral-900 dark:text-slate-100">{k.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Funnel (demo)</div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                  {[
                    { l: "Impr.", v: selected.impressions },
                    { l: "Clicks", v: selected.clicks },
                    { l: "Orders", v: selected.orders },
                    { l: "Earn", v: selected.earnings }
                  ].map((x) => (
                    <div key={x.l} className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-2">
                      <div className="text-neutral-600 dark:text-slate-400 font-bold">{x.l}</div>
                      <div className="mt-0.5 text-neutral-900 dark:text-slate-100 font-extrabold">{String(x.v).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Btn tone="primary" left={<ExternalLink className="h-4 w-4" />} onClick={() => openAdzPerformance(selected)}>
              Open Adz Performance page
            </Btn>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={drawer === "tracking"} title="Tracking & Integrations" onClose={() => setDrawer(null)}>
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Premium tracking</div>
          <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
            Pixel status, short links, monitoring history, payout timing reminders.
          </div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Pixel status</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Connect Meta/TikTok/Google (demo)</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Broken link monitor</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">History + auto-fix (demo)</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Attribution notes</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Payout timing reminders (demo)</div>
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer open={drawer === "templates"} title="Templates & Brand Kit" onClose={() => setDrawer(null)}>
        <div className="rounded-3xl border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-950 p-4">
          <div className="text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Templates & Brand Kit</div>
          <div className="mt-2 text-[12px] text-neutral-700 dark:text-slate-300">
            Saved templates, brand rules (fonts/colors/voice), approved copy blocks. Entry points should exist in Builder + Marketplace + Manager.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="pro">Pro</Pill>
            <Pill tone="neutral">Admin-approved packs</Pill>
          </div>
          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Start from template</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Create new ad from template (demo)</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 p-3">
              <div className="text-[11px] text-neutral-500 dark:text-slate-500 font-bold">Brand kit rules</div>
              <div className="mt-1 text-[12px] font-extrabold text-neutral-900 dark:text-slate-100">Fonts, colors, voice guidelines (demo)</div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Toast */}
      {
        toast ? (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90]">
            <div className="rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-[12px] font-extrabold shadow-sm text-neutral-900 dark:text-slate-100 transition-colors">
              {toast}
            </div>
          </div>
        ) : null
      }

      {/* integrated Drawers */}
      <AdzPerformanceDrawer
        open={drawer === "performance"}
        onClose={() => setDrawer(null)}
        entities={performanceEntities}
        defaultEntityId={drawerData}
        canView={true}
        entityLabelSingular="Ad"
        entityLabelPlural="Adz"
      />

      {
        drawer === "builder" ? (
          <AdBuilder isDrawer={true} onClose={() => setDrawer(null)} initialAdId={drawerData} />
        ) : null
      }
    </div >
  );
}
