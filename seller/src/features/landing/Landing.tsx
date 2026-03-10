import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useThemeMode as useAppThemeMode, type ThemeMode as AppThemeMode } from "../../theme/themeMode";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Globe,
  GraduationCap,
  Headphones,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  LineChart,
  Lock,
  MessageCircle,
  Moon,
  Package,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Truck,
  Users,
  Video,
  Zap,
  Menu,
  X,
} from "lucide-react";

/**
 * EVzone + MyLiveDealz Seller Landing Page (Enterprise v3 Full)
 *
 * Highlights
 * - Dark + Light mode (persisted)
 * - Commission-based pricing (no monthly subscriptions for now)
 * - 11 marketplaces
 * - Enterprise tone + premium visuals + subtle motion
 * - Images show Chinese/Asian sellers engaging Black and White buyers (cross-border selling)
 */

const BRAND = {
  green: "#03CD8C",
  orange: "#F77F00",
};

const THEMES = {
  dark: {
    bg: "#061512",
    bg2: "#071A16",
    card: "rgba(255,255,255,0.04)",
    card2: "rgba(255,255,255,0.06)",
    stroke: "rgba(255,255,255,0.12)",
    text: "#EAFBF4",
    muted: "rgba(234,251,244,0.72)",
    surface: "rgba(6,21,18,0.66)",
    surface2: "rgba(6,21,18,0.78)",
    hover: "rgba(255,255,255,0.05)",
    divider: "rgba(255,255,255,0.10)",
    dot: { color: "rgba(255,255,255,0.07)", opacity: 0.18 },
    glow: {
      green: "radial-gradient(circle, rgba(3,205,140,0.30), rgba(3,205,140,0.0) 62%)",
      orange: "radial-gradient(circle, rgba(247,127,0,0.22), rgba(247,127,0,0.0) 62%)",
      neutral: "radial-gradient(circle, rgba(255,255,255,0.06), rgba(255,255,255,0.0) 65%)",
    },
  },
  light: {
    bg: "#F6FFFB",
    bg2: "#ECFAF4",
    card: "rgba(6,21,18,0.03)",
    card2: "rgba(6,21,18,0.05)",
    stroke: "rgba(6,21,18,0.14)",
    text: "#061512",
    muted: "rgba(6,21,18,0.70)",
    surface: "rgba(246,255,251,0.84)",
    surface2: "rgba(246,255,251,0.90)",
    hover: "rgba(6,21,18,0.05)",
    divider: "rgba(6,21,18,0.10)",
    dot: { color: "rgba(6,21,18,0.10)", opacity: 0.10 },
    glow: {
      green: "radial-gradient(circle, rgba(3,205,140,0.22), rgba(3,205,140,0.0) 62%)",
      orange: "radial-gradient(circle, rgba(247,127,0,0.16), rgba(247,127,0,0.0) 62%)",
      neutral: "radial-gradient(circle, rgba(6,21,18,0.06), rgba(6,21,18,0.0) 65%)",
    },
  },
};

type LandingThemeMode = "dark" | "light";
type ButtonVariant = "cta" | "primary" | "outline" | "ghost";
type CardGlow = "none" | "green" | "orange";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(value: number, currency: string) {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${currency} ${safe.toFixed(2)}`;
  }
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ animation: `fadeUp 0.55s ease ${delay}s both` }}>
      {children}
    </div>
  );
}

function Pill({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "orange" | "neutral" }) {
  const style =
    tone === "green"
      ? {
        backgroundColor: "rgba(3,205,140,0.12)",
        borderColor: "rgba(3,205,140,0.35)",
        color: "var(--text)",
      }
      : tone === "orange"
        ? {
          backgroundColor: "rgba(247,127,0,0.12)",
          borderColor: "rgba(247,127,0,0.35)",
          color: "var(--text)",
        }
        : {
          backgroundColor: "var(--card2)",
          borderColor: "var(--stroke)",
          color: "var(--text)",
        };

  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={style}>
      {children}
    </span>
  );
}

function Button({
  children,
  variant = "cta",
  onClick,
  href,
  className,
  ...rest
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  href?: string;
  className?: string;
  [key: string]: unknown;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[4px] px-5 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[rgba(3,205,140,0.35)]";

  const stylesByVariant = {
    cta: {
      backgroundColor: BRAND.orange,
      color: "#0B0F0E",
      boxShadow: "0 18px 45px rgba(247,127,0,0.18)",
    },
    primary: {
      backgroundColor: BRAND.green,
      color: "#04100C",
      boxShadow: "0 18px 45px rgba(3,205,140,0.16)",
    },
    outline: {
      backgroundColor: "var(--card)",
      border: "1px solid var(--stroke)",
      color: "var(--text)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--text)",
    },
  };

  const hoverByVariant = {
    cta: "hover:brightness-[0.98] hover:translate-y-[-1px]",
    primary: "hover:brightness-[0.98] hover:translate-y-[-1px]",
    outline: "hover:translate-y-[-1px]",
    ghost: "",
  };

  const navigate = useNavigate();
  const location = useLocation();
  const authIntent = typeof rest["data-auth-intent"] === "string" ? String(rest["data-auth-intent"]) : null;
  const handleClick = () => {
    if (typeof onClick === "function") {
      onClick();
      return;
    }
    if (authIntent && location.pathname === "/landing") {
      navigate(`/auth?intent=${authIntent}`);
    }
  };

  const Comp = href ? "a" : "button";
  return (
    <Comp
      href={href}
      onClick={handleClick}
      className={cx(base, hoverByVariant[variant], className)}
      style={stylesByVariant[variant]}
      {...rest}
      onMouseEnter={(e) => {
        if (variant === "outline" || variant === "ghost") e.currentTarget.style.backgroundColor = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (variant === "outline") e.currentTarget.style.backgroundColor = "var(--card)";
        if (variant === "ghost") e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </Comp>
  );
}

function Card({
  className,
  children,
  glow = "none",
}: {
  className?: string;
  children: React.ReactNode;
  glow?: CardGlow;
}) {
  const glowStyle =
    glow === "green"
      ? { boxShadow: "0 18px 70px rgba(3,205,140,0.10)" }
      : glow === "orange"
        ? { boxShadow: "0 18px 70px rgba(247,127,0,0.10)" }
        : {};

  return (
    <div
      className={cx("rounded-3xl border p-5 sm:p-6", "backdrop-blur-xl", className)}
      style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)", ...glowStyle }}
    >
      {children}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id?: string;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mx-auto w-full max-w-full px-4 sm:px-6">
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">{eyebrow}</div>
          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
      <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: "rgba(3,205,140,0.12)", border: "1px solid rgba(3,205,140,0.20)" }}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{value}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full" style={{ backgroundColor: "var(--divider)" }} />;
}

function ThemeToggle({ mode, setMode }: { mode: LandingThemeMode; setMode: (mode: AppThemeMode) => void }) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-[4px] border px-3 py-2 text-xs font-semibold transition-all"
      style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)", color: "var(--text)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--card)")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" style={{ color: BRAND.orange }} /> : <Moon className="h-4 w-4" style={{ color: BRAND.green }} />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

function Chip({
  active,
  label,
  icon,
  onClick,
}: {
  active?: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all"
      style={{
        borderColor: active ? "rgba(3,205,140,0.55)" : "var(--stroke)",
        backgroundColor: active ? "rgba(3,205,140,0.14)" : "var(--card)",
        color: "var(--text)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "var(--card)";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full rounded-3xl border p-5 text-left transition-all"
      style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--card)")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{q}</div>
        <ChevronDown
          className={cx("mt-0.5 h-5 w-5 transition-transform", open ? "rotate-180" : "")}
          style={{ color: "var(--muted)" }}
        />
      </div>
      {open ? (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {a}
        </p>
      ) : null}
    </button>
  );
}

function MotionImageTile({
  src,
  alt,
  className,
  delay = 0,
}: {
  src: string;
  alt: string;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-3xl border", className)}
      style={{
        borderColor: "var(--stroke)",
        animation: `fadeUp 0.6s ease ${delay}s both`,
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.00) 25%, rgba(0,0,0,0.30) 100%)" }} />
    </div>
  );
}

function AvatarGroup({
  title,
  subtitle,
  images,
}: {
  title: string;
  subtitle: string;
  images: Array<{ src: string; alt: string }>;
}) {
  return (
    <div className="rounded-3xl border p-5" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)" }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</div>
          <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{subtitle}</div>
        </div>
        <div className="flex -space-x-2">
          {images.slice(0, 5).map((img, idx) => (
            <img
              key={idx}
              src={img.src}
              alt={img.alt}
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full border object-cover"
              style={{ borderColor: "var(--stroke)" }}
              loading="lazy"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatingCTA({ scrollTo }: { scrollTo: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 mx-auto max-w-full px-4 sm:px-6">
      <div
        className="flex flex-col gap-3 rounded-3xl border p-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        style={{ borderColor: "var(--stroke)", backgroundColor: "var(--surface2)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl"
            style={{ backgroundColor: "rgba(3,205,140,0.12)", border: "1px solid rgba(3,205,140,0.22)" }}
          >
            <Sparkles className="h-5 w-5" style={{ color: BRAND.green }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Ready to onboard your business?</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Commission-based. MyLiveDealz is optional and included.</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => scrollTo("faq")}>FAQ</Button>
          <Button variant="cta" data-auth-intent="signup">Start Seller Onboarding <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

export default function EVzoneMyLiveDealzSellerLandingEnterpriseV3Full() {
  const navigate = useNavigate();
  const { resolvedMode, setMode } = useAppThemeMode();
  const landingMode: LandingThemeMode = resolvedMode === "dark" ? "dark" : "light";
  const theme = THEMES[landingMode];

  const themeVars = {
    "--bg": theme.bg,
    "--bg2": theme.bg2,
    "--card": theme.card,
    "--card2": theme.card2,
    "--stroke": theme.stroke,
    "--text": theme.text,
    "--muted": theme.muted,
    "--surface": theme.surface,
    "--surface2": theme.surface2,
    "--hover": theme.hover,
    "--divider": theme.divider,
  } as React.CSSProperties;

  const [activeSection, setActiveSection] = useState("top");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sellerMode, setSellerMode] = useState("Products");
  const [myLiveDealzEnabled, setMyLiveDealzEnabled] = useState(true);
  const [activeMarketplaceKey, setActiveMarketplaceKey] = useState("evmart");

  // Commission calculator (example only)
  const [currency, setCurrency] = useState("UGX");
  const [sellerPrice, setSellerPrice] = useState(100000);
  const [commissionPct, setCommissionPct] = useState(5);

  const commissionValue = useMemo(() => (sellerPrice * commissionPct) / 100, [sellerPrice, commissionPct]);
  const buyerPays = useMemo(() => sellerPrice + commissionValue, [sellerPrice, commissionValue]);

  const sectionIds = useMemo(
    () => ["top", "platform", "marketplaces", "enterprise", "mylivedealz", "how", "pricing", "trust", "faq"],
    []
  );

  const navItems = useMemo(
    () => [
      { id: "platform", label: "Platform" },
      { id: "marketplaces", label: "Marketplaces" },
      { id: "enterprise", label: "Enterprise" },
      { id: "mylivedealz", label: "MyLiveDealz" },
      { id: "pricing", label: "Pricing" },
      { id: "trust", label: "Security" },
      { id: "faq", label: "FAQ" },
    ],
    []
  );

  const marketplaces = useMemo(
    () => [
      {
        key: "evmart",
        name: "EVmart",
        tagline: "EVs, chargers, parts, accessories, and energy technology.",
        icon: <Zap className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Variant-rich listings for EV parts and accessories",
          "Installation, maintenance, and after-sales workflows",
          "B2B and B2C pricing including tiered pricing",
        ],
      },
      {
        key: "gadgetmart",
        name: "GadgetMart",
        tagline: "Electronics, devices, and smart tech.",
        icon: <Smartphone className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Warranty and returns-friendly product structure",
          "Bundles, add-ons, and accessories mapping",
          "High quality media and spec sheets",
        ],
      },
      {
        key: "livingmart",
        name: "LivingMart",
        tagline: "Home, furniture, appliances, and lifestyle essentials.",
        icon: <Home className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Large item shipping patterns and delivery scheduling",
          "Room-based collections and cross-sell",
          "Service add-ons like installation and setup",
        ],
      },
      {
        key: "stylemart",
        name: "StyleMart",
        tagline: "Fashion, footwear, accessories, and beauty.",
        icon: <Package className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Variant-first listings (size, color, materials)",
          "Lookbooks and curated bundles",
          "Returns and exchanges workflows",
        ],
      },
      {
        key: "propertymart",
        name: "PropertyMart",
        tagline: "Buy, sell, and rent properties with trust.",
        icon: <Building2 className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Verified listings and document workflows",
          "Appointments and broker collaboration",
          "Lead capture and follow-up patterns",
        ],
      },
      {
        key: "healthmart",
        name: "HealthMart",
        tagline: "Health and wellness products and services.",
        icon: <HeartPulse className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Category-aware policy and trust indicators",
          "Service bookings and consultation flows",
          "Structured product information and compliance controls",
        ],
      },
      {
        key: "edumart",
        name: "EduMart",
        tagline: "Courses, training, education products, and services.",
        icon: <GraduationCap className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Bookings, schedules, and enrollment patterns",
          "Digital products and service bundles",
          "Verification and proof of delivery for outcomes",
        ],
      },
      {
        key: "faithmart",
        name: "FaithMart",
        tagline: "Faith-based products, services, and community offerings.",
        icon: <Landmark className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Trust-first storefront presentation",
          "Event services and booking workflows",
          "Clear policies and category moderation patterns",
        ],
      },
      {
        key: "generalmart",
        name: "GeneralMart",
        tagline: "Broad marketplace categories for everyday commerce.",
        icon: <Boxes className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Flexible categories and attributes",
          "Promotions, coupons, and flash deals",
          "Unified order and fulfillment flows",
        ],
      },
      {
        key: "expressmart",
        name: "ExpressMart",
        tagline: "Fast delivery for groceries and essentials.",
        icon: <Truck className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Same-day and scheduled delivery windows",
          "Batch picking and substitutions",
          "Local inventory and stock sync patterns",
        ],
      },
      {
        key: "servicemart",
        name: "ServiceMart",
        tagline: "Professional services, bookings, and quotes.",
        icon: <CalendarClock className="h-4 w-4" style={{ color: BRAND.green }} />,
        highlights: [
          "Request booking, assessment, and quotation flows",
          "Deposits, milestones, and pay-after-confirmation",
          "Service SLAs, schedules, and team availability",
        ],
      },
    ],
    []
  );

  const activeMarketplace = useMemo(
    () => marketplaces.find((m) => m.key === activeMarketplaceKey) ?? marketplaces[0],
    [marketplaces, activeMarketplaceKey]
  );

  const modeCopy = useMemo(() => {
    const common = {
      title: "One seller account. Many marketplaces.",
      bulletA: "List once, distribute across the marketplaces you choose",
      bulletB: "Unified orders, settlements, analytics, and support workflows",
      bulletC: "MyLiveDealz is optional and included with the same commission model",
    };

    if (sellerMode === "Services") {
      return {
        ...common,
        sub: "Built for providers who need booking requests, assessments, quotations, and structured fulfillment.",
        highlight: "Service selling is first-class: bookings, quotes, schedules, and approvals.",
      };
    }
    if (sellerMode === "Wholesale") {
      return {
        ...common,
        sub: "Designed for B2B pricing, MOQ, tiered price breaks, and negotiation-friendly order flows.",
        highlight: "Run wholesale and retail side-by-side with clean pricing rules.",
      };
    }
    if (sellerMode === "Creators") {
      return {
        ...common,
        sub: "A creator-ready commerce layer for shoppable content, collaborations, and live selling.",
        highlight: "Enable creator collabs and live sessions without rebuilding your inventory.",
      };
    }
    return {
      ...common,
      sub: "Ideal for product sellers who want premium listings, secure checkout, and multi-channel growth.",
      highlight: "Turn listings into shoppable links, then scale with live commerce when ready.",
    };
  }, [sellerMode]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  // Scroll spy
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const els = sectionIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        if (visible[0]?.target?.id) setActiveSection(visible[0].target.id);
      },
      { root: null, threshold: [0.18, 0.22, 0.28, 0.35] }
    );

    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [sectionIds]);

  // Cross-border imagery (Chinese/Asian sellers + Black and White buyers)
  const HERO_IMAGES = useMemo(
    () => [
      {
        src: "https://images.pexels.com/photos/7414215/pexels-photo-7414215.jpeg?cs=srgb&dl=pexels-rdne-7414215.jpg&fm=jpg",
        alt: "Chinese/Asian seller discussing a deal with a White business buyer",
      },
      {
        src: "https://images.pexels.com/photos/8922210/pexels-photo-8922210.jpeg?cs=srgb&dl=pexels-ron-lach-8922210.jpg&fm=jpg",
        alt: "Chinese/Asian seller meeting a Black business buyer during negotiation",
      },
      {
        src: "https://images.pexels.com/photos/6348100/pexels-photo-6348100.jpeg?cs=srgb&dl=pexels-liza-summer-6348100.jpg&fm=jpg",
        alt: "Chinese/Asian seller preparing parcels for international delivery",
      },
    ],
    []
  );

  const AVATARS = useMemo(
    () => [
      { src: "https://images.pexels.com/photos/17049766/pexels-photo-17049766.jpeg?cs=srgb&dl=pexels-kooldark-17049766.jpg&fm=jpg", alt: "Chinese/Asian seller portrait" },
      { src: "https://images.pexels.com/photos/15399144/pexels-photo-15399144.jpeg?cs=srgb&dl=pexels-monirathnak-15399144.jpg&fm=jpg", alt: "Chinese/Asian seller portrait" },
      { src: "https://images.pexels.com/photos/27117681/pexels-photo-27117681.jpeg?cs=srgb&dl=pexels-bello-olamide-38387724-27117681.jpg&fm=jpg", alt: "Black buyer portrait" },
      { src: "https://images.pexels.com/photos/8560308/pexels-photo-8560308.jpeg?cs=srgb&dl=pexels-timur-weber-8560308.jpg&fm=jpg", alt: "White buyer portrait" },
      { src: "https://images.pexels.com/photos/30033725/pexels-photo-30033725.jpeg?cs=srgb&dl=pexels-mustapha-damilola-458083529-30033725.jpg&fm=jpg", alt: "Black buyer portrait" },
    ],
    []
  );

  // Global base container
  return (
    <div className="min-h-screen" style={themeVars} data-theme={landingMode}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
        <div className="sticky top-0 z-40" style={{ backgroundColor: "var(--surface2)" }}>
          {/* Announcement */}
          <div className="border-b" style={{ borderColor: "var(--divider)", backgroundColor: "var(--card2)" }}>
            <div className="mx-auto flex max-w-full flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="green">
                  <Sparkles className="h-4 w-4" style={{ color: BRAND.green }} />
                  Enterprise Seller Platform
                </Pill>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  Commission-based. No monthly subscriptions (current model). MyLiveDealz promos are included.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle mode={landingMode} setMode={setMode} />
                <Button variant="cta" data-auth-intent="signup" className="px-4 py-2 text-xs rounded-[4px]">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Navbar */}
          <div className="border-b backdrop-blur-xl" style={{ borderColor: "var(--divider)", backgroundColor: "var(--surface2)" }}>
            <div className="mx-auto flex max-w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-2xl"
                  style={{ backgroundColor: "var(--surface-1)", border: "1px solid rgba(3,205,140,0.22)" }}
                >
                  <Store className="h-5 w-5" style={{ color: BRAND.green }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "var(--text)" }}>EVzone Seller</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>One account. Many marketplaces. Optional live commerce.</div>
                </div>
              </div>

              <div className="hidden items-center gap-1 lg:flex">
                {navItems.map((it) => {
                  const active = activeSection === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => scrollTo(it.id)}
                      className="rounded-full px-3 py-2 text-xs font-semibold transition-all"
                      style={{
                        color: active ? "var(--text)" : "var(--muted)",
                        backgroundColor: active ? "rgba(3,205,140,0.12)" : "transparent",
                        border: active ? "1px solid rgba(3,205,140,0.30)" : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = "var(--hover)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 rounded-[4px] border border-transparent bg-[rgba(255,255,255,0.12)] px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-current"
                  style={{ color: "var(--text)" }}
                  aria-expanded={mobileNavOpen}
                  aria-controls="mobile-nav"
                >
                  <Menu className="h-4 w-4" style={{ color: "var(--text)" }} />
                  Menu
                </button>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button variant="cta" data-auth-intent="signin" className="w-full sm:w-auto px-4 py-2 text-xs">
                    Sign In
                  </Button>
                  <Button variant="cta" data-auth-intent="signup" className="w-full sm:w-auto px-4 py-2 text-xs">
                    Create Seller Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {mobileNavOpen && (
            <div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/40 px-4 py-6 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-[14px] border p-6 shadow-2xl"
                style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Navigation</div>
                  <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setMobileNavOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition"
                    style={{ borderColor: "var(--stroke)", color: "var(--text)" }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  {navItems.map((it) => {
                    const active = activeSection === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          scrollTo(it.id);
                          setMobileNavOpen(false);
                        }}
                        className="w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition"
                        style={{
                          borderColor: active ? "rgba(3,205,140,0.4)" : "var(--stroke)",
                          color: active ? "var(--text)" : "var(--muted)",
                          backgroundColor: active ? "rgba(3,205,140,0.1)" : "var(--card)",
                        }}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <Button variant="ghost" data-auth-intent="signin" className="w-full px-4 py-2 text-xs">
                    Sign In
                  </Button>
                  <Button variant="cta" data-auth-intent="signup" className="w-full px-4 py-2 text-xs">
                    Create Seller Account
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Hero */}
          <section id="top" className="scroll-mt-24">
            <div className="mx-auto w-full max-w-full px-4 pt-10 sm:px-6 sm:pt-14">
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="green"><Globe className="h-4 w-4" style={{ color: BRAND.green }} />Cross-border selling</Pill>
                    <Pill tone="orange"><Video className="h-4 w-4" style={{ color: BRAND.orange }} />MyLiveDealz included</Pill>
                    <Pill tone="neutral"><ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} />Trust controls</Pill>
                  </div>

                  <h1
                    className="mt-5 text-3xl font-extrabold leading-tight sm:text-5xl"
                    style={{ color: "var(--text)", animation: "fadeUp 0.6s ease 0s both" }}
                  >
                    Sell across <span style={{ color: BRAND.green }}>all EVzone Marketplaces</span>,
                    <span className="block">then scale with <span style={{ color: BRAND.orange }}>MyLiveDealz</span>.</span>
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    Built for global sellers  expanding into Africa and global markets, with professional operations, unified catalog distribution,
                    and optional shoppable promos and live commerce.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="cta" data-auth-intent="signup" className="w-full sm:w-auto">
                      Start Seller Onboarding <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => scrollTo("marketplaces")} className="w-full sm:w-auto">
                      Explore Marketplaces <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <Stat label="Unified seller identity" value="One account" icon={<BadgeCheck className="h-5 w-5" style={{ color: BRAND.green }} />} />
                    <Stat label="Pricing model" value="Commission" icon={<CreditCard className="h-5 w-5" style={{ color: BRAND.green }} />} />
                    <Stat label="MyLiveDealz" value="Included" icon={<Video className="h-5 w-5" style={{ color: BRAND.orange }} />} />
                  </div>

                  <div className="mt-8">
                    <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Choose your selling style</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["Products", "Services", "Wholesale", "Creators"]).map((m) => (
                        <Chip
                          key={m}
                          active={sellerMode === m}
                          label={m}
                          onClick={() => setSellerMode(m)}
                          icon={
                            m === "Products" ? (
                              <Package className="h-4 w-4" style={{ color: sellerMode === m ? BRAND.green : "var(--muted)" }} />
                            ) : m === "Services" ? (
                              <CalendarClock className="h-4 w-4" style={{ color: sellerMode === m ? BRAND.green : "var(--muted)" }} />
                            ) : m === "Wholesale" ? (
                              <Boxes className="h-4 w-4" style={{ color: sellerMode === m ? BRAND.green : "var(--muted)" }} />
                            ) : (
                              <Users className="h-4 w-4" style={{ color: sellerMode === m ? BRAND.green : "var(--muted)" }} />
                            )
                          }
                        />
                      ))}
                    </div>

                    <Card className="mt-4" glow="green">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{modeCopy.title}</div>
                          <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>{modeCopy.sub}</div>
                          <div className="mt-3 flex flex-col gap-2 text-xs" style={{ color: "var(--muted)" }}>
                            {[modeCopy.bulletA, modeCopy.bulletB, modeCopy.bulletC].map((b, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-3xl border p-4" style={{ borderColor: "rgba(247,127,0,0.25)", backgroundColor: "rgba(247,127,0,0.06)" }}>
                          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                            <Rocket className="h-5 w-5" style={{ color: BRAND.orange }} />Enterprise growth
                          </div>
                          <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{modeCopy.highlight}</div>
                          <div className="mt-3">
                            <Button variant="cta" className="w-full" onClick={() => scrollTo("mylivedealz")}>
                              Explore MyLiveDealz <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <AvatarGroup
                      title="Cross-border teams"
                      subtitle="global sellers  connecting with Black and White buyers across markets."
                      images={AVATARS}
                    />
                    <div className="rounded-3xl border p-5" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)" }}>
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                        <ShieldCheck className="h-5 w-5" style={{ color: BRAND.green }} />
                        Enterprise-ready controls
                      </div>
                      <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                        Role-based access, audit logs, approvals, and policy enforcement patterns to support professional operations.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hero visuals */}
                <div>
                  <Reveal>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MotionImageTile src={HERO_IMAGES[0].src} alt={HERO_IMAGES[0].alt} className="h-[220px] sm:h-[260px]" delay={0.02} />
                      <div className="grid gap-3">
                        <MotionImageTile src={HERO_IMAGES[1].src} alt={HERO_IMAGES[1].alt} className="h-[130px]" delay={0.06} />
                        <MotionImageTile src={HERO_IMAGES[2].src} alt={HERO_IMAGES[2].alt} className="h-[130px]" delay={0.10} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Card glow="orange">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-bold" style={{ color: "var(--text)" }}>Enterprise Seller Console</div>
                            <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Unified analytics, payouts, governance, and optional live commerce.</div>
                          </div>
                          <Pill tone="orange"><LineChart className="h-4 w-4" style={{ color: BRAND.orange }} />Insight</Pill>
                        </div>
                        <Divider />
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                              <BarChart3 className="h-5 w-5" style={{ color: BRAND.green }} />Unified analytics
                            </div>
                            <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                              Marketplace performance, conversion, campaign ROI, and trend analysis.
                            </div>
                          </div>
                          <div className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                              <Lock className="h-5 w-5" style={{ color: BRAND.green }} />Audit-ready
                            </div>
                            <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                              Approvals, event history, and accountability for sensitive actions.
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          <div className="py-10" />

          {/* Platform */}
          <Section
            id="platform"
            eyebrow={
              <>
                <Pill tone="green"><HeartHandshake className="h-4 w-4" style={{ color: BRAND.green }} />Why sell on EVzone</Pill>
                <Pill tone="neutral">Enterprise-ready marketplace operations</Pill>
              </>
            }
            title={<>A seller platform built for <span style={{ color: BRAND.green }}>scale, trust, and performance</span>.</>}
            subtitle="Everything you need to list, promote, sell, and fulfil with role-aware workflows for products, services, wholesale, and creators."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Reveal>
                <Card glow="green">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <ClipboardList className="h-5 w-5" style={{ color: BRAND.green }} />Listing excellence
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Rich attributes, variants, bundles, and reusable templates. Improve conversion with clear specs, policies, and media.
                  </div>
                  <div className="mt-4 space-y-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Guided listing structure and quality checks</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Wholesale and retail pricing on the same catalog</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Stock-aware promos and structured fulfilment</div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.05}>
                <Card glow="orange">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <Video className="h-5 w-5" style={{ color: BRAND.orange }} />MyLiveDealz (optional)
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Activate shoppable links, live sessions, and creator collaborations without creating a separate store.
                  </div>
                  <div className="mt-4 space-y-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Shoppable Adz landing pages and QR codes</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Live sessions with countdown timers and stock counters</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Creator collaboration terms and performance reporting</div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.10}>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <ShieldCheck className="h-5 w-5" style={{ color: BRAND.green }} />Trust and governance
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Verification, policy enforcement, dispute workflows, and auditability built into the seller journey.
                  </div>
                  <div className="mt-4 space-y-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Seller verification patterns (KYC/KYB-ready)</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Dispute handling with evidence and timelines</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Audit-friendly event history</div>
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Reveal>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <BarChart3 className="h-5 w-5" style={{ color: BRAND.green }} />Unified analytics
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    See performance across marketplaces and MyLiveDealz: traffic, conversion, cancellations, refunds, and trends.
                  </div>
                </Card>
              </Reveal>
              <Reveal delay={0.05}>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <MessageCircle className="h-5 w-5" style={{ color: BRAND.green }} />Unified communication
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Unified inbox patterns for buyer chat, order notes, templates, escalation paths, and optional call centre operations.
                  </div>
                </Card>
              </Reveal>
            </div>
          </Section>

          <div className="py-12" />

          {/* Marketplaces */}
          <Section
            id="marketplaces"
            eyebrow={
              <>
                <Pill tone="green"><Boxes className="h-4 w-4" style={{ color: BRAND.green }} />EVzone Marketplaces</Pill>
                <Pill tone="neutral">Choose where you sell</Pill>
              </>
            }
            title={<>Your catalog can power <span style={{ color: BRAND.green }}>11 marketplaces</span>.</>}
            subtitle="Select a marketplace to preview how EVzone supports your selling and fulfillment requirements."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Marketplaces</div>
                <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Expand later without re-onboarding.</div>
                <div className="mt-4 grid gap-2">
                  {marketplaces.map((m) => {
                    const active = m.key === activeMarketplaceKey;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setActiveMarketplaceKey(m.key)}
                        className="flex w-full items-start justify-between gap-3 rounded-3xl border p-4 text-left transition-all"
                        style={{
                          borderColor: active ? "rgba(3,205,140,0.40)" : "var(--stroke)",
                          backgroundColor: active ? "rgba(3,205,140,0.10)" : "var(--card)",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.backgroundColor = "var(--hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.backgroundColor = "var(--card)";
                        }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-2xl" style={{ backgroundColor: "var(--card2)", border: "1px solid var(--stroke)" }}>
                              {m.icon}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{m.name}</span>
                          </div>
                          <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{m.tagline}</div>
                        </div>
                        <ArrowRight className="mt-2 h-4 w-4" style={{ color: active ? BRAND.green : "var(--muted)" }} />
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="lg:col-span-2" glow="green">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-2xl" style={{ backgroundColor: "rgba(3,205,140,0.12)", border: "1px solid rgba(3,205,140,0.24)" }}>{activeMarketplace.icon}</span>
                      <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{activeMarketplace.name}</div>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{activeMarketplace.tagline}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="green">Unified catalog</Pill>
                    <Pill tone="green">Unified settlements</Pill>
                    <Pill tone="green">Unified support</Pill>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {activeMarketplace.highlights.map((h, idx) => (
                    <div key={idx} className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />
                        <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{h}</div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-3xl border p-4" style={{ borderColor: "rgba(247,127,0,0.22)", backgroundColor: "rgba(247,127,0,0.06)" }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                      <Video className="h-5 w-5" style={{ color: BRAND.orange }} />MyLiveDealz boost
                    </div>
                    <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Add shoppable links and live commerce without extra subscription fees.</div>
                    <div className="mt-3"><Button variant="cta" onClick={() => scrollTo("mylivedealz")} className="w-full">Explore MyLiveDealz <ArrowRight className="h-4 w-4" /></Button></div>
                  </div>

                  <div className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                      <Globe className="h-5 w-5" style={{ color: BRAND.green }} />Expansion-ready
                    </div>
                    <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Add more marketplaces later without re-listing or rebuilding your operations.</div>
                  </div>
                </div>
              </Card>
            </div>
          </Section>

          <div className="py-12" />

          {/* Enterprise */}
          <Section
            id="enterprise"
            eyebrow={
              <>
                <Pill tone="green"><ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} />Enterprise</Pill>
                <Pill tone="neutral">Controls for serious operations</Pill>
              </>
            }
            title={<>Enterprise-grade capabilities for <span style={{ color: BRAND.green }}>teams, governance, and scale</span>.</>}
            subtitle="Run multi-user selling with approvals, audit trails, and trust indicators that build buyer confidence."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Reveal>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <Users className="h-5 w-5" style={{ color: BRAND.green }} />Teams and roles
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Invite staff and assign role-based permissions for listings, fulfillment, support, and finance.
                  </div>
                </Card>
              </Reveal>
              <Reveal delay={0.05}>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <Lock className="h-5 w-5" style={{ color: BRAND.green }} />Auditability
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Track sensitive actions with event history designed for accountability and compliance.
                  </div>
                </Card>
              </Reveal>
              <Reveal delay={0.10}>
                <Card>
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <Zap className="h-5 w-5" style={{ color: BRAND.green }} />Integrations-ready
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Payment, logistics, messaging, analytics, and CRM integration patterns designed for scale.
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Reveal>
                <Card glow="green">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <BarChart3 className="h-5 w-5" style={{ color: BRAND.green }} />Reporting and analytics
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Unified reporting across marketplaces, campaigns, and optional live commerce to support data-driven decisions.
                  </div>
                </Card>
              </Reveal>
              <Reveal delay={0.05}>
                <Card glow="orange">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                    <Headphones className="h-5 w-5" style={{ color: BRAND.orange }} />Support operations
                  </div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Unified inbox patterns, dispute flows, and escalation tooling to keep service levels high.
                  </div>
                </Card>
              </Reveal>
            </div>
          </Section>

          <div className="py-12" />

          {/* MyLiveDealz */}
          <Section
            id="mylivedealz"
            eyebrow={
              <>
                <Pill tone="orange"><Video className="h-4 w-4" style={{ color: BRAND.orange }} />MyLiveDealz</Pill>
                <Pill tone="neutral">Optional and included</Pill>
              </>
            }
            title={<>MyLiveDealz turns listings into <span style={{ color: BRAND.orange }}>shoppable experiences</span>.</>}
            subtitle="Enable it when you are ready. There are no monthly subscriptions for MyLiveDealz, and no extra promo fees. The commission model stays the same."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Reveal>
                  <Card glow="orange">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Enable MyLiveDealz (optional)</div>
                        <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                          Switch it on to unlock Shoppable Adz, live sessions, and creator collaborations without changing your catalog.
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone="orange">Included</Pill>
                        <Pill tone="green">Commission-based</Pill>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setMyLiveDealzEnabled(!myLiveDealzEnabled)}
                        className="w-full rounded-3xl border p-5 text-left transition-all"
                        style={{
                          borderColor: myLiveDealzEnabled ? "rgba(247,127,0,0.35)" : "var(--stroke)",
                          backgroundColor: myLiveDealzEnabled ? "rgba(247,127,0,0.08)" : "var(--card)",
                        }}
                        onMouseEnter={(e) => {
                          if (!myLiveDealzEnabled) e.currentTarget.style.backgroundColor = "var(--hover)";
                        }}
                        onMouseLeave={(e) => {
                          if (!myLiveDealzEnabled) e.currentTarget.style.backgroundColor = "var(--card)";
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Enable MyLiveDealz for this seller account</div>
                              {myLiveDealzEnabled ? <Pill tone="orange">Enabled</Pill> : <Pill tone="neutral">Optional</Pill>}
                            </div>
                            <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                              When enabled, you can create Shoppable Adz links, host live sessions, and invite creators. No extra promo subscription fees.
                            </div>
                          </div>
                          <div
                            className="relative h-7 w-12 rounded-full border transition-all"
                            style={{
                              borderColor: myLiveDealzEnabled ? "rgba(247,127,0,0.40)" : "var(--stroke)",
                              backgroundColor: myLiveDealzEnabled ? "rgba(247,127,0,0.25)" : "var(--card2)",
                            }}
                          >
                            <div
                              className="absolute top-1 h-5 w-5 rounded-full transition-all"
                              style={{ left: myLiveDealzEnabled ? "26px" : "4px", backgroundColor: myLiveDealzEnabled ? BRAND.orange : "rgba(255,255,255,0.65)" }}
                            />
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          title: "Shoppable Adz",
                          icon: <Zap className="h-5 w-5" style={{ color: BRAND.orange }} />,
                          bullets: [
                            "Multiple products and services in one link",
                            "Tiered pricing, stock counters, and urgency signals",
                            "No login required to view; login only at checkout",
                          ],
                        },
                        {
                          title: "Live sessions",
                          icon: <Video className="h-5 w-5" style={{ color: BRAND.orange }} />,
                          bullets: [
                            "Flash deals with countdown timers",
                            "Stock-aware buyer CTAs",
                            "Host and co-host with chat and audio requests",
                          ],
                        },
                        {
                          title: "Creator collaborations",
                          icon: <Users className="h-5 w-5" style={{ color: BRAND.orange }} />,
                          bullets: [
                            "Revenue share, flat fee, and hybrid terms",
                            "Performance attribution and reporting",
                            "Creator badge and trust indicators",
                          ],
                        },
                        {
                          title: "Performance engine",
                          icon: <BarChart3 className="h-5 w-5" style={{ color: BRAND.orange }} />,
                          bullets: [
                            "Campaign analytics and attribution",
                            "Share links, QR codes, and embeds",
                            "Event logs and moderation patterns",
                          ],
                        },
                      ].map((f, idx) => (
                        <div key={idx} className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                            {f.icon}
                            {f.title}
                          </div>
                          <div className="mt-3 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                            {f.bullets.map((b, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </Reveal>
              </div>

              <div className="lg:col-span-1">
                <Reveal delay={0.05}>
                  <Card>
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Quick actions</div>
                    <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                      Use these CTAs on your website, in ads, and in your seller portal.
                    </div>

                    <div className="mt-4 grid gap-2">
                      <Button variant="cta" data-auth-intent="signup" className="w-full">Start Seller Onboarding <ArrowRight className="h-4 w-4" /></Button>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/contact/support")}
                        className="w-full"
                      >
                        Request a Demo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = `https://wa.me/?text=${encodeURIComponent("Hi EVzone team — I would like a demo.")}`;
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="w-full"
                      >
                        Chat on WhatsApp <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-5 rounded-3xl border p-4" style={{ borderColor: "rgba(3,205,140,0.22)", backgroundColor: "rgba(3,205,140,0.06)" }}>
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
                        <ShieldCheck className="h-5 w-5" style={{ color: BRAND.green }} />Commission model
                      </div>
                      <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                        You set your base price. EVzone adds a commission on top at checkout. Your base price remains yours.
                      </div>
                    </div>
                  </Card>
                </Reveal>
              </div>
            </div>
          </Section>

          <div className="py-12" />

          {/* How it works */}
          <Section
            id="how"
            eyebrow={
              <>
                <Pill tone="green"><Rocket className="h-4 w-4" style={{ color: BRAND.green }} />How it works</Pill>
                <Pill tone="neutral">Structured onboarding</Pill>
              </>
            }
            title={<>From onboarding to fulfilment in <span style={{ color: BRAND.green }}>4 steps</span>.</>}
            subtitle="A modern seller journey designed for verification, approvals, and reliable operations."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { n: "1", title: "Create seller account", desc: "Business profile, seller type, and marketplace selection.", icon: <Store className="h-5 w-5" style={{ color: BRAND.green }} /> },
                { n: "2", title: "Verification and setup", desc: "Submit documents, add settlement details, and configure fulfilment.", icon: <ShieldCheck className="h-5 w-5" style={{ color: BRAND.green }} /> },
                { n: "3", title: "List and publish", desc: "Create listings, set your base prices, and publish with quality checks.", icon: <ClipboardList className="h-5 w-5" style={{ color: BRAND.green }} /> },
                { n: "4", title: "Enable MyLiveDealz", desc: "Optional: shoppable links, live sessions, and creator collaborations.", icon: <Video className="h-5 w-5" style={{ color: BRAND.orange }} /> },
              ].map((s, idx) => (
                <Reveal key={s.n} delay={idx * 0.04}>
                  <Card glow={s.n === "4" ? "orange" : "green"}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-2xl" style={{ backgroundColor: "var(--card2)", border: "1px solid var(--stroke)" }}>{s.icon}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.title}</span>
                      </div>
                      <Pill tone={s.n === "4" ? "orange" : "green"}>Step {s.n}</Pill>
                    </div>
                    <div className="mt-3 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{s.desc}</div>
                    <div className="mt-4">
                      <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--card2)" }}>
                        <div className="h-1.5 rounded-full" style={{ width: s.n === "1" ? "25%" : s.n === "2" ? "50%" : s.n === "3" ? "75%" : "100%", backgroundColor: s.n === "4" ? BRAND.orange : BRAND.green }} />
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </Section>

          <div className="py-12" />

          {/* Pricing */}
          <Section
            id="pricing"
            eyebrow={
              <>
                <Pill tone="green"><CreditCard className="h-4 w-4" style={{ color: BRAND.green }} />Pricing</Pill>
                <Pill tone="neutral">Commission-based</Pill>
              </>
            }
            title={<>Pricing that is <span style={{ color: BRAND.green }}>simple and seller-friendly</span>.</>}
            subtitle="There are no monthly subscriptions right now. You set your base price. EVzone adds a commission on top at checkout. MyLiveDealz is included with the same commission model."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Reveal>
                <Card glow="green">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>No subscriptions</div>
                    <Pill tone="green">$0 monthly</Pill>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold" style={{ color: "var(--text)" }}>Free</div>
                  <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>No monthly platform fee (current model)</div>
                  <div className="mt-4 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Seller onboarding and verification patterns</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />List across selected marketplaces</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Orders, settlements, and analytics</div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.05}>
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>You set the price</div>
                    <Pill tone="green">Seller-first</Pill>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold" style={{ color: "var(--text)" }}>100%</div>
                  <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>You keep your set base price</div>
                  <div className="mt-4 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Your base price is preserved</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />EVzone commission is added on top at checkout</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.green }} />Commission schedule is visible in the seller console</div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.10}>
                <Card glow="orange">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>MyLiveDealz included</div>
                    <Pill tone="orange">No extra fees</Pill>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold" style={{ color: "var(--text)" }}>Included</div>
                  <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Same commission model</div>
                  <div className="mt-4 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Shoppable Adz pages and tracking</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Live sessions with stock-aware urgency</div>
                    <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4" style={{ color: BRAND.orange }} />Creator collaborations and attribution</div>
                  </div>
                </Card>
              </Reveal>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Reveal>
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Commission calculator (example)</div>
                      <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Buyer pays: Seller base price + EVzone commission. Seller receives: Seller base price.</div>
                    </div>
                    <Pill tone="green">On-top pricing</Pill>
                  </div>
                  <Divider />

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Currency</div>
                      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)", color: "var(--text)" }}>
                        {[
                          { code: "UGX", label: "UGX" },
                          { code: "USD", label: "USD" },
                          { code: "KES", label: "KES" },
                          { code: "NGN", label: "NGN" },
                          { code: "ZAR", label: "ZAR" },
                        ].map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Seller base price</div>
                      <input type="number" value={sellerPrice} onChange={(e) => setSellerPrice(Math.max(0, Number(e.target.value) || 0))} className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)", color: "var(--text)" }} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Commission (example)</div>
                      <input type="number" value={commissionPct} onChange={(e) => setCommissionPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="mt-2 w-full rounded-2xl border px-3 py-2 text-sm" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card)", color: "var(--text)" }} />
                      <div className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>Example only. Actual commission can vary by category.</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl border p-4" style={{ borderColor: "var(--stroke)", backgroundColor: "var(--card2)" }}>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>EVzone commission</div>
                      <div className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{formatMoney(commissionValue, currency)}</div>
                    </div>
                    <div className="rounded-3xl border p-4" style={{ borderColor: "rgba(247,127,0,0.25)", backgroundColor: "rgba(247,127,0,0.06)" }}>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>Buyer pays</div>
                      <div className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{formatMoney(buyerPays, currency)}</div>
                    </div>
                    <div className="rounded-3xl border p-4" style={{ borderColor: "rgba(3,205,140,0.25)", backgroundColor: "rgba(3,205,140,0.06)" }}>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>Seller receives</div>
                      <div className="mt-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{formatMoney(sellerPrice, currency)}</div>
                    </div>
                  </div>
                </Card>
              </Reveal>

              <Reveal delay={0.05}>
                <Card>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Professional pricing language</div>
                  <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Sellers set base prices. EVzone commissions are added on top at checkout. MyLiveDealz uses the same commission model, with no extra promo subscription fees.
                  </div>
                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => navigate("/finance")}>View Commission Schedule</Button>
                    <Button variant="cta" data-auth-intent="signup">Start Now <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </Card>
              </Reveal>
            </div>
          </Section>

          <div className="py-12" />

          {/* Trust */}
          <Section
            id="trust"
            eyebrow={
              <>
                <Pill tone="green"><ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} />Security and trust</Pill>
                <Pill tone="neutral">Buyer confidence built-in</Pill>
              </>
            }
            title={<>Trust is a <span style={{ color: BRAND.green }}>platform capability</span>.</>}
            subtitle="Operational controls for verification, policies, disputes, and auditability across marketplaces and MyLiveDealz."
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Reveal><Card><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><BadgeCheck className="h-5 w-5" style={{ color: BRAND.green }} />Verification</div><div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Seller verification patterns to improve conversion and buyer confidence.</div></Card></Reveal>
              <Reveal delay={0.05}><Card><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><ShieldCheck className="h-5 w-5" style={{ color: BRAND.green }} />Policy enforcement</div><div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Returns, refunds, disputes, and moderation patterns designed for fairness.</div></Card></Reveal>
              <Reveal delay={0.10}><Card><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><Lock className="h-5 w-5" style={{ color: BRAND.green }} />Audit trail</div><div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Event history and logs for sensitive actions and accountability.</div></Card></Reveal>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-2">
              <Reveal><Card glow="green"><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><HeartHandshake className="h-5 w-5" style={{ color: BRAND.green }} />Buyer confidence</div><div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Trust indicators can appear on buyer pages: verification status, policy links, ratings, and support contacts.</div></Card></Reveal>
              <Reveal delay={0.05}><Card glow="orange"><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}><Video className="h-5 w-5" style={{ color: BRAND.orange }} />Live commerce safety</div><div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>Moderation patterns, session rules, and stock-aware urgency designed for trustworthy live selling.</div></Card></Reveal>
            </div>
          </Section>

          <div className="py-12" />

          {/* FAQ */}
          <Section
            id="faq"
            eyebrow={
              <>
                <Pill tone="green"><MessageCircle className="h-4 w-4" style={{ color: BRAND.green }} />FAQ</Pill>
                <Pill tone="neutral">Clear answers for sellers</Pill>
              </>
            }
            title={<>Common questions, <span style={{ color: BRAND.green }}>enterprise-ready answers</span>.</>}
            subtitle="Use this section to reduce friction and improve seller conversion."
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <FAQItem q="Do you charge monthly subscriptions?" a="Not currently. Sellers set their base price. EVzone adds a commission on top at checkout. MyLiveDealz is included and does not add extra subscription fees." />
              <FAQItem q="Do I need a separate account for MyLiveDealz?" a="No. MyLiveDealz is an optional capability for every EVzone seller. Your catalog remains unified across marketplaces." />
              <FAQItem q="Can I sell both products and services?" a="Yes. EVzone supports hybrid selling with structured flows for bookings, assessments, quotations, deposits, and pay-after-confirmation." />
              <FAQItem q="How does seller verification work?" a="You create a seller profile, submit required documents, and follow the approval process. Verification can improve trust indicators across buyer pages and shoppable links." />
              <FAQItem q="Can I do wholesale and retail at the same time?" a="Yes. Use tiered pricing and clear rules to support MOQ, price breaks, and retail pricing in the same catalog where applicable." />
              <FAQItem q="What payment methods are supported?" a="EVzone is designed to integrate multiple payment rails. You can list your supported methods on the final landing page once integrations are selected." />
            </div>

            <div className="mt-8 rounded-3xl border p-6" style={{ borderColor: "rgba(247,127,0,0.25)", backgroundColor: "rgba(247,127,0,0.06)" }}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>Ready to join EVzone as a seller?</div>
                  <div className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                    Create your seller account, choose your marketplaces, then optionally enable MyLiveDealz when you want to scale through shoppable ads and live commerce.
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => scrollTo("pricing")}>View Pricing</Button>
                  <Button variant="cta" data-auth-intent="signup">Create Seller Account <ArrowRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Footer */}
          <div className="mt-14 border-t" style={{ borderColor: "var(--divider)" }}>
            <div className="mx-auto max-w-full px-4 py-10 sm:px-6">
              <div className="grid gap-8 md:grid-cols-4">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ backgroundColor: "rgba(3,205,140,0.14)", border: "1px solid rgba(3,205,140,0.22)" }}>
                      <Store className="h-5 w-5" style={{ color: BRAND.green }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "var(--text)" }}>EVzone Seller</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>Multi-marketplace selling with optional MyLiveDealz.</div>
                    </div>
                  </div>
                  <p className="mt-4 max-w-xl text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    Replace demo alerts with real navigation and routes. Connect onboarding to your verification and approvals flow, and link your final commission schedule.
                  </p>
                </div>

                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Quick links</div>
                  <div className="mt-3 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    {navItems.map((it) => (
                      <button key={it.id} className="text-left hover:underline" onClick={() => scrollTo(it.id)}>
                        {it.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>Seller support</div>
                  <div className="mt-3 grid gap-2 text-xs" style={{ color: "var(--muted)" }}>
                    <button
                      className="text-left hover:underline"
                      onClick={() => navigate("/contact/support")}
                      type="button"
                    >
                      Contact sales
                    </button>
                    <button
                      className="text-left hover:underline"
                      onClick={() => navigate("/help-support")}
                      type="button"
                    >
                      Help center
                    </button>
                    <button
                      className="text-left hover:underline"
                      onClick={() => navigate("/compliance")}
                      type="button"
                    >
                      Policies
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--divider)", color: "var(--muted)" }}>
                <div>© {new Date().getFullYear()} EVzone. All rights reserved.</div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{ color: BRAND.green }} />Security-first</span>
                  <span className="inline-flex items-center gap-2"><BarChart3 className="h-4 w-4" style={{ color: BRAND.green }} />Reporting-ready</span>
                  <span className="inline-flex items-center gap-2"><Video className="h-4 w-4" style={{ color: BRAND.orange }} />MyLiveDealz included</span>
                </div>
              </div>
            </div>
          </div>

          <FloatingCTA scrollTo={scrollTo} />
          <div className="h-28" />
        </div>
      </div>
    </div>
  );
}
