import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Building2,
  Camera,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  IdCard,
  Link as LinkIcon,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  Users,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

// Creator Onboarding v2.5 (Premium Wizard)
// Improvements implemented from the attached requirements:
// 1) Profile → Creator Type: richer Team/Agency options + org fields + light org-doc uploads (recommended, not heavy).
// 2) Socials → Primary Platform Selection: when "Other" is chosen, platform options appear immediately + primary handle fields.
// 3) Payout Details: payout policy + settlement rules surfaced *inside* payout step (summary + full modal).
// 4) Review Step: clearly shows the Primary Social Account.
// 5) Policies & Terms (Completion): expandable policy sections + “seen” gating.
// 6) Added: scroll-to-bottom acknowledgement option to unlock final consent (common compliance pattern).
//    - Optional enhancement included: Team/Agency additional compliance confirmation.

/* ---------- Interfaces ---------- */

interface Toast {
  id: string;
  message: string;
  tone: "success" | "error" | "warn" | "info" | "default";
}

interface Profile {
  name: string;
  handle: string;
  tagline: string;
  country: string;
  timezone: string;
  currency: string;
  bio: string;
  contentLanguages: string[];
  audienceRegions: string[];
  creatorType: "Individual" | "Team" | "Agency";
  email: string;
  phone: string;
  whatsapp: string;
  profilePhotoName: string;
  mediaKitName: string;
  team: {
    name: string;
    type: string;
    size: string;
    website: string;
    logoName: string;
  };
  agency: {
    name: string;
    type: string;
    website: string;
    logoName: string;
  };
}

interface ExtraSocial {
  platform: string;
  otherName?: string;
  handle: string;
  followers: string;
}

interface Socials {
  instagram: string;
  tiktok: string;
  youtube: string;
  primaryPlatform: string;
  primaryOtherPlatform: string;
  primaryOtherCustomName: string;
  primaryOtherHandle: string;
  primaryOtherFollowers: string;
  extra: ExtraSocial[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow indexing
}

interface KycOrg {
  registrationFileName: string;
  taxFileName: string;
  authorizationFileName: string;
  registrationUploaded: boolean;
  taxUploaded: boolean;
  authorizationUploaded: boolean;
}

interface Kyc {
  status: "pending" | "verified" | "rejected";
  documentType: string;
  idFileName: string;
  selfieFileName: string;
  addressFileName: string;
  idUploaded: boolean;
  selfieUploaded: boolean;
  addressUploaded: boolean;
  org: KycOrg;
}

interface PayoutVerification {
  status: "not_started" | "code_sent" | "verified";
  code: string;
}

interface PayoutBank {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swift: string;
}

interface PayoutMobile {
  provider: string;
  phone: string;
}

interface PayoutWallet {
  email: string;
}

interface PayoutAlipay {
  name: string;
  account: string;
}

interface PayoutWechat {
  name: string;
  wechatId: string;
  phone: string;
}

interface PayoutTax {
  residencyCountry: string;
  taxId: string;
}

interface Payout {
  method: string;
  currency: string;
  schedule: string;
  minThreshold: number;
  acceptPayoutPolicy: boolean;
  verificationDeliveryMethod: string;
  verificationContactValue: string;
  verification: PayoutVerification;
  bank: PayoutBank;
  mobile: PayoutMobile;
  wallet: PayoutWallet;
  alipay: PayoutAlipay;
  wechat: PayoutWechat;
  tax: PayoutTax;
  scrolledToBottomPayout: boolean;
}

interface RateCard {
  minFlatFee: string;
  preferredCommissionPct: string;
  notes: string;
}

interface Availability {
  days: string[];
  timeWindow: string;
}

interface Preferences {
  lines: string[];
  formats: string[];
  models: string[];
  availability: Availability;
  rateCard: RateCard;
  inviteRules: string;
  supplierType: string;
}

interface SeenPolicies {
  platform: boolean;
  content: boolean;
  payout: boolean;
}

interface Review {
  seenPolicies: SeenPolicies;
  scrolledToBottom: boolean;
  confirmMultiUserCompliance: boolean;
  acceptTerms: boolean;
}

interface OnboardingForm {
  profile: Profile;
  socials: Socials;
  kyc: Kyc;
  payout: Payout;
  preferences: Preferences;
  review: Review;
}

/* ---------- Prop Interfaces ---------- */

interface ToastStackProps {
  toasts: Toast[];
}

interface ConfirmModalProps {
  open: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
}

interface ModalProps {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
}

interface TopBarProps {
  saved: boolean;
  onExit: () => void;
  onReset: () => void;
  onHelp: () => void;
}

interface StepperProps {
  stepIndex: number;
  maxUnlocked: number;
  onJump: (index: number) => void;
}

interface StickyFooterProps {
  stepIndex: number;
  canContinue: boolean;
  isLast: boolean;
  onBack: () => void;
  onSaveExit: () => void;
  onNext: () => void;
}

interface SectionCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: "orange" | "green";
}

interface UploadMiniProps {
  title: string;
  helper?: string;
  value?: string;
  onPick: (val: string) => void;
  accept?: string;
}

interface UploadBoxProps {
  title: string;
  subtitle: string;
  fileName: string;
  onPick: (name: string) => void;
  onSample?: () => void;
  required?: boolean;
  error?: string;
  accept?: string;
}

interface SocialConnectProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (val: string) => void;
  onConnect: () => void;
}

interface TrustMeterProps {
  score: number;
  unlocks: string[];
}

interface PayoutMethodCardProps {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

interface ReviewRowProps {
  title: string;
  status: "ok" | "warn" | "miss";
  onEdit: () => void;
}

interface PolicyDisclosureProps {
  policyKey: "platform" | "content" | "payout";
  title: string;
  subtitle: string;
  bullets: string[];
  seen: boolean;
  onSeen: () => void;
  onOpenFull: () => void;
}

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";
// const LIGHT_GREY = "#f2f2f2";

const STORAGE_KEY = "mldz_creator_onboarding_v2_4";
const STORAGE_KEY_LEGACY = "mldz_creator_onboarding_v2_3";

const STEPS = [
  { key: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  { key: "socials", label: "Socials", icon: <LinkIcon className="h-4 w-4" /> },
  { key: "kyc", label: "KYC", icon: <IdCard className="h-4 w-4" /> },
  { key: "payout", label: "Payout", icon: <CreditCard className="h-4 w-4" /> },
  { key: "preferences", label: "Preferences", icon: <Users className="h-4 w-4" /> },
  { key: "review", label: "Review & Terms", icon: <ScrollText className="h-4 w-4" /> }
];

const LANGUAGE_OPTIONS = ["English", "Swahili", "French", "Arabic", "Chinese", "Portuguese"];
const REGION_OPTIONS = ["East Africa", "Southern Africa", "West Africa", "North Africa", "Asia", "Europe", "North America"];

const TEAM_TYPES = ["Seller team", "Provider team", "Production crew", "Brand team", "Other"];
const AGENCY_TYPES = ["Talent / influencer agency", "Marketing agency", "Seller network", "Provider network", "Other"];
const ORG_SIZES = ["1–5", "6–15", "16–50", "51–200", "200+"];

const SOCIAL_PRIMARY = [
  { key: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "@yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "Channel URL or @handle" }
];

const OTHER_SOCIAL_OPTIONS = ["Facebook", "X (Twitter)", "Snapchat", "Kwai", "LinkedIn", "Twitch", "Pinterest", "Other"];

// Product/Service lines
const PRODUCT_SERVICE_LINES = [
  "Services",
  "Electronics",
  "Fashion & Beauty",
  "Food & Groceries",
  "General Supplies",
  "Home & Living",
  "Properties & Supplies",
  "EV & Mobility",
  "Medical & Health",
  "Education",
  "Faith",
  "Travel & Tourism"
];

const COLLAB_MODELS = ["Flat fee", "Commission", "Hybrid"];

const CONTENT_FORMATS = [
  "Live Sessionz",
  "Shoppable Adz",
  "Short-form (Reels/Shorts)",
  "Long-form (YouTube)",
  "UGC (brand content)",
  "Livestream co-hosting"
];

const PAYOUT_METHODS = [
  { key: "Bank", title: "Bank", desc: "Best for high volume and stable settlements." },
  { key: "Mobile Money", title: "Mobile Money", desc: "Fast and popular across Africa." },
  { key: "PayPal / Wallet", title: "PayPal / Wallet", desc: "Use existing wallets in supported regions." },
  { key: "AliPay", title: "AliPay", desc: "China payment method for creators and cross-border payments." },
  { key: "WeChat Pay", title: "WeChat Pay", desc: "China payment method for creators and cross-border payments." }
];

// Policies (summaries must be visible on-page; full text shown in a modal)
const POLICY_LIBRARY = {
  platform: {
    title: "Platform policies",
    subtitle: "Safety, integrity, and what’s allowed on MyLiveDealz.",
    bullets: [
      "Only list and promote products/services that are legal, authentic, and accurately described.",
      "No harassment, hate, explicit content, or deceptive behaviour (including fake engagement).",
      "Keep supplier and buyer communication professional; follow moderation guidance during Live Sessionz."
    ],
    sections: [
      {
        h: "Safety and integrity",
        items: [
          "No counterfeit, restricted, or illegal items.",
          "No fraud, impersonation, or misleading identity.",
          "Respectful behaviour is required (no harassment or hate)."
        ]
      },
      {
        h: "Marketplace fairness",
        items: [
          "Use clear pricing and avoid bait‑and‑switch offers.",
          "Disclose sponsored or paid partnerships where required.",
          "Follow supplier rules for brand assets, claims, and product usage."
        ]
      },
      {
        h: "Enforcement",
        items: [
          "Violations can result in content removal, payout holds, or account actions.",
          "Repeated violations may lead to suspension.",
          "Appeals can be requested via Creator Success."
        ]
      }
    ]
  },
  content: {
    title: "Content rules",
    subtitle: "How to create compliant, high‑converting content.",
    bullets: [
      "Be honest: avoid exaggerated claims (especially medical/financial); disclose limitations and terms.",
      "Respect copyright: only use music/video/assets you have rights to.",
      "Protect buyers: do not share personal data; follow community and moderation standards."
    ],
    sections: [
      {
        h: "Claims and disclosures",
        items: [
          "Avoid medical, health, or financial claims that can’t be supported.",
          "Disclose sponsorships/commissions in a clear way when applicable.",
          "Call out key conditions: delivery timelines, warranty, returns, and price changes."
        ]
      },
      {
        h: "Community safety",
        items: [
          "No nudity, sexual content, hate speech, or harassment.",
          "No encouragement of dangerous behaviour.",
          "Moderation tools may be used to keep sessionz safe."
        ]
      },
      {
        h: "IP and brand assets",
        items: [
          "Only use copyrighted music, images, and logos with permission.",
          "Follow supplier brand guidelines for product demos and packaging.",
          "Do not reuse private supplier materials without approval."
        ]
      }
    ]
  },
  payout: {
    title: "Payout terms",
    subtitle: "How settlement works and when you get paid.",
    bullets: [
      "Settlements typically occur after the buyer protection / dispute window (timing can vary by supplier and method).",
      "Refunds, chargebacks, cancellations, and policy violations can delay or reduce payouts.",
      "Payouts run on your selected schedule once the minimum threshold is reached (tax info may be required)."
    ],
    sections: [
      {
        h: "Settlement window",
        items: [
          "Earnings settle after an order completes and the buyer protection window passes.",
          "Some suppliers may have longer settlement periods for certain categories.",
          "Verification can reduce holds on first payouts."
        ]
      },
      {
        h: "Adjustments and holds",
        items: [
          "Refunds/chargebacks reduce eligible earnings.",
          "Suspected fraud or policy violations may place a temporary hold.",
          "We may request additional verification for high‑risk payouts."
        ]
      },
      {
        h: "Payout processing",
        items: [
          "Payouts run Weekly, Bi‑weekly, or Monthly based on your settings.",
          "A minimum payout threshold applies (you can adjust it).",
          "Your payout method must be active and able to receive transfers."
        ]
      }
    ]
  }
};

function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge<T extends object>(base: T, patch: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(base) && Array.isArray(patch)) return patch as unknown as T;
  if (typeof base === "object" && base && typeof patch === "object" && patch && !Array.isArray(patch)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = { ...base } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = patch as any;
    Object.keys(p).forEach((k) => {
      out[k] = deepMerge(out[k], p[k]);
    });
    return out as T;
  }
  return patch;
}

function clampNumber(n: number | string, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function parseFollowersString(str: string | number): number {
  if (!str) return 0;
  const trimmed = String(str).trim().toLowerCase();
  const match = trimmed.match(/^([0-9.,]+)\s*([km]?)$/);
  if (!match) return 0;
  const numPart = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(numPart)) return 0;
  const suffix = match[2];
  if (suffix === "k") return Math.round(numPart * 1000);
  if (suffix === "m") return Math.round(numPart * 1000000);
  return Math.round(numPart);
}

function isEmailLike(v: unknown): boolean {
  const s = String(v || "").trim();
  return /.+@.+\..+/.test(s);
}

function isFilled(v: unknown): boolean {
  return String(v || "").trim().length > 0;
}

function isDigits(v: unknown): boolean {
  const s = String(v || "").trim();
  return /^\d+$/.test(s);
}

function isE164(v: unknown): boolean {
  const s = String(v || "").trim();
  // Validates + followed by 1 to 14 digits (Total 2-15 characters)
  return /^\+[1-9]\d{1,14}$/.test(s);
}

function chipClass(selected: boolean, color: "orange" | "green" = "orange") {
  if (!selected) return "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
  if (color === "green") return "bg-[#03cd8c] border-[#03cd8c] text-white";
  return "bg-[#f77f00] border-[#f77f00] text-white";
}

function defaultForm(): OnboardingForm {
  return {
    profile: {
      name: "",
      handle: "",
      tagline: "",
      bio: "",
      timezone: "Africa/Kampala (EAT)",
      currency: "USD",
      contentLanguages: ["English"],
      audienceRegions: ["East Africa"],
      country: "",
      creatorType: "Individual", // Individual | Team | Agency
      email: "",
      phone: "",
      whatsapp: "",
      profilePhotoName: "",
      mediaKitName: "",
      team: {
        name: "",
        type: "",
        size: "1–5",
        website: "",
        logoName: ""
      },
      agency: {
        name: "",
        type: "",
        website: "",
        logoName: ""
      }
    },
    socials: {
      instagram: "",
      tiktok: "",
      youtube: "",
      primaryPlatform: "Instagram",
      // Used only when primaryPlatform === "Other"
      primaryOtherPlatform: "",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: [] // { platform, otherName, handle, followers }
    },
    kyc: {
      status: "pending",
      documentType: "National ID",
      idFileName: "",
      selfieFileName: "",
      addressFileName: "",
      idUploaded: false,
      selfieUploaded: false,
      addressUploaded: false,
      // Light org documents (recommended)
      org: {
        registrationFileName: "",
        taxFileName: "",
        authorizationFileName: "",
        registrationUploaded: false,
        taxUploaded: false,
        authorizationUploaded: false
      }
    },
    payout: {
      method: "",
      currency: "USD",
      schedule: "Weekly",
      minThreshold: 50,
      acceptPayoutPolicy: false,
      verificationDeliveryMethod: "",
      verificationContactValue: "",
      verification: {
        status: "not_started", // not_started | code_sent | verified
        code: ""
      },
      bank: { bankName: "", accountName: "", accountNumber: "", swift: "" },
      mobile: { provider: "", phone: "" },
      wallet: { email: "" },
      alipay: { name: "", account: "" },
      wechat: { name: "", wechatId: "", phone: "" },
      tax: { residencyCountry: "", taxId: "" },
      scrolledToBottomPayout: false
    },
    preferences: {
      lines: [],
      formats: ["Live Sessionz"],
      models: ["Flat fee"],
      availability: {
        days: ["Mon", "Tue", "Wed"],
        timeWindow: "18:00 - 22:00"
      },
      rateCard: {
        minFlatFee: "",
        preferredCommissionPct: "",
        notes: ""
      },
      inviteRules: "All suppliers (Sellers + Providers)",
      supplierType: "Both" // Sellers | Providers | Both
    },
    review: {
      seenPolicies: {
        platform: false,
        content: false,
        payout: false
      },
      scrolledToBottom: false,
      confirmMultiUserCompliance: false,
      acceptTerms: false
    }
  };
}

function getPrimarySocialDisplay(socials: Socials) {
  const s = socials;
  const primary = s.primaryPlatform || "Instagram";

  if (primary === "Instagram") return { platform: "Instagram", handle: s.instagram || "", followers: "" };
  if (primary === "TikTok") return { platform: "TikTok", handle: s.tiktok || "", followers: "" };
  if (primary === "YouTube") return { platform: "YouTube", handle: s.youtube || "", followers: "" };

  const chosen = String(s.primaryOtherPlatform || "").trim();
  const platform = chosen === "Other" ? String(s.primaryOtherCustomName || "").trim() : chosen;
  return {
    platform: platform || "Other",
    handle: s.primaryOtherHandle || "",
    followers: s.primaryOtherFollowers || ""
  };
}

function StepValidity(stepKey: string, form: OnboardingForm) {
  const profile = form.profile;
  const socials = form.socials;
  const kyc = form.kyc;
  const payout = form.payout;
  const preferences = form.preferences;
  const review = form.review;
  const creatorType = profile.creatorType || "Individual";

  // Profile: require basics, plus org details for Team/Agency
  if (stepKey === "profile") {
    const baseOk =
      isFilled(profile.name) &&
      isFilled(profile.handle) &&
      isFilled(profile.email) &&
      isEmailLike(profile.email) &&
      isFilled(profile.phone) &&
      isE164(profile.phone) &&
      isFilled(profile.country) &&
      isFilled(profile.timezone) &&
      isFilled(profile.currency);

    if (!baseOk) return false;

    if (creatorType === "Team") {
      return isFilled(profile.team?.name) && isFilled(profile.team?.type);
    }
    if (creatorType === "Agency") {
      return isFilled(profile.agency?.name) && isFilled(profile.agency?.type);
    }
    return true;
  }


  // Socials: optional overall, but:
  // - If primary platform = Other, they must pick a platform and provide a handle/URL.
  // - If extra socials added, each row must be valid.
  if (stepKey === "socials") {
    if (socials.primaryPlatform === "Other") {
      if (!isFilled(socials.primaryOtherPlatform)) return false;
      if (socials.primaryOtherPlatform === "Other" && !isFilled(socials.primaryOtherCustomName)) return false;
      if (!isFilled(socials.primaryOtherHandle)) return false;
    }

    const extraOk = (socials.extra || []).every((acc) => {
      if (!isFilled(acc.platform)) return false;
      if (acc.platform === "Other" && !isFilled(acc.otherName)) return false;
      if (!isFilled(acc.handle)) return false;
      return true;
    });

    const hasExtra = (socials.extra || []).length > 0;
    return !hasExtra || extraOk;
  }

  // KYC: require ID + selfie uploaded. Address proof optional.
  if (stepKey === "kyc") {
    return !!kyc.idUploaded && !!kyc.selfieUploaded && isFilled(kyc.documentType);
  }

  // Payout: require method, currency, policy acceptance, verification delivery method, and method-specific required fields.
  if (stepKey === "payout") {
    if (!isFilled(payout.method)) return false;
    if (!isFilled(payout.currency)) return false;
    if (!payout.acceptPayoutPolicy) return false;
    if (!payout.scrolledToBottomPayout) return false;
    if (!isFilled(payout.verificationDeliveryMethod)) return false;
    if (!isFilled(payout.verificationContactValue)) return false;

    // Contact format validation
    if (payout.verificationDeliveryMethod === "Email" && !isEmailLike(payout.verificationContactValue)) return false;
    if ((payout.verificationDeliveryMethod === "SMS" || payout.verificationDeliveryMethod === "WhatsApp") && !isE164(payout.verificationContactValue)) return false;

    if (payout.method === "Bank") {
      return isFilled(payout.bank?.bankName) && isFilled(payout.bank?.accountName) && isFilled(payout.bank?.accountNumber);
    }

    if (payout.method === "Mobile Money") {
      return isFilled(payout.mobile?.provider) && isFilled(payout.mobile?.phone);
    }

    if (payout.method === "PayPal / Wallet") {
      return isEmailLike(payout.wallet?.email);
    }

    if (payout.method === "AliPay") {
      return isFilled(payout.alipay?.name) && isFilled(payout.alipay?.account);
    }

    if (payout.method === "WeChat Pay") {
      return isFilled(payout.wechat?.name) && (isFilled(payout.wechat?.wechatId) || isFilled(payout.wechat?.phone));
    }

    return false;
  }

  // Preferences: require at least one product/service line and one format
  if (stepKey === "preferences") {
    return (preferences.lines || []).length > 0 && (preferences.formats || []).length > 0;
  }

  // Review: require policies to be reviewed (expand sections OR scroll-to-bottom) + final consent
  if (stepKey === "review") {
    const seen = review.seenPolicies;
    const payoutSeen = !!payout.acceptPayoutPolicy || !!seen.payout;
    const scrolled = !!review.scrolledToBottom;
    const allPoliciesSeen = scrolled || (!!seen.platform && !!seen.content && payoutSeen);

    if (!allPoliciesSeen) return false;

    if (creatorType !== "Individual" && !review.confirmMultiUserCompliance) return false;

    return !!review.acceptTerms;
  }

  return true;
}

function computeTrustScore(form: OnboardingForm) {
  const profile = form.profile;
  const socials = form.socials;
  const kyc = form.kyc;
  // const payout = form.payout; // unused directly here
  const preferences = form.preferences;
  const creatorType = profile.creatorType || "Individual";

  let score = 0;

  // Profile (20 + up to 5 bonus for org)
  if (isFilled(profile.name) && isFilled(profile.handle)) score += 10;
  if (isFilled(profile.country) && isFilled(profile.timezone) && isFilled(profile.currency)) score += 10;

  if (creatorType === "Team" && isFilled(profile.team?.name) && isFilled(profile.team?.type)) score += 5;
  if (creatorType === "Agency" && isFilled(profile.agency?.name) && isFilled(profile.agency?.type)) score += 5;

  // Socials (20)
  const primaryCount = [socials.instagram, socials.tiktok, socials.youtube].filter(isFilled).length;
  const extraCount = (socials.extra || []).length;
  const hasOtherPrimary = socials.primaryPlatform === "Other" && isFilled(socials.primaryOtherHandle);
  if (primaryCount > 0 || extraCount > 0 || hasOtherPrimary) score += 20;

  // KYC (30)
  if (kyc.idUploaded && kyc.selfieUploaded) score += 30;

  // Org docs (bonus up to 5)
  const org = kyc.org;
  if (creatorType !== "Individual" && (org.registrationUploaded || org.taxUploaded || org.authorizationUploaded)) score += 5;

  // Payout (20)
  if (StepValidity("payout", form)) score += 20;

  // Preferences (10)
  if ((preferences.lines || []).length > 0 && (preferences.formats || []).length > 0) score += 10;

  return Math.min(100, score);
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (message: string, tone: Toast["tone"] = "default") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }: ToastStackProps) {
  return (
    <div className="fixed top-16 right-3 md:right-6 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-24px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl border px-3 py-2 text-[12px] shadow-sm bg-white dark:bg-slate-800 ${t.tone === "success"
            ? "border-emerald-200 dark:border-emerald-800"
            : t.tone === "error"
              ? "border-rose-200 dark:border-rose-800"
              : "border-slate-200 dark:border-slate-700"
            }`}
        >
          <div className="flex items-start gap-2">
            <span
              className={`mt-1 h-2 w-2 rounded-full ${t.tone === "success" ? "bg-emerald-500" : t.tone === "error" ? "bg-rose-500" : "bg-amber-500"
                }`}
            />
            <div className="text-slate-700 dark:text-slate-200">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ open, title, description, confirmText, onConfirm, onClose }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4">
        <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-400">{description}</div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-200"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({ open, title, subtitle, children, onClose }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{title}</div>
            {subtitle ? <div className="text-[11px] text-slate-600 dark:text-slate-300">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[12px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto text-slate-900 dark:text-slate-200">{children}</div>
      </div>
    </div>
  );
}

function TopBar({ saved, onExit, onReset, onHelp }: TopBarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          <img
            src="/MyliveDealz PNG Logo 2 Black.png"
            alt="MyLiveDealz"
            className="h-8 w-auto block dark:hidden"
          />
          <img
            src="/MyliveDealz PNG Logo 2 light.png"
            alt="MyLiveDealz"
            className="h-8 w-auto hidden dark:block"
          />
        </div>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
        <div className="flex flex-col leading-tight hidden sm:flex">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">Creator Onboarding</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px]">
        <button
          onClick={useTheme().toggleTheme}
          className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          {useTheme().theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <button
          type="button"
          className="hidden sm:block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          onClick={onHelp}
        >
          Help
        </button>

        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span className={`h-1.5 w-1.5 rounded-full ${saved ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span>{saved ? "Progress saved" : "Saving"}</span>
        </span>

        <button className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" onClick={onExit} type="button">
          Exit
        </button>

        <button className="hidden sm:block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" onClick={onReset} type="button">
          Reset
        </button>
      </div>
    </header>
  );
}

function Stepper({ stepIndex, maxUnlocked, onJump }: StepperProps) {
  return (
    <div className="px-2 md:px-3 pt-4 pb-2 bg-slate-50 dark:bg-slate-900/50">
      <div className="w-full">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {STEPS.map((s, index) => {
            const active = index === stepIndex;
            const completed = index < stepIndex;
            const clickable = index <= maxUnlocked;

            return (
              <div key={s.key} className="flex items-center min-w-fit">
                <button
                  type="button"
                  onClick={() => clickable && onJump(index)}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${clickable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" : "cursor-not-allowed opacity-50"}`}
                  aria-label={`Go to ${s.label}`}
                >
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-full border-2 text-xs font-bold transition-all ${completed
                      ? "bg-[#03cd8c] border-[#03cd8c] text-white"
                      : active
                        ? "bg-[#f77f00] border-[#f77f00] text-white scale-110 shadow-lg"
                        : "bg-white dark:bg-slate-800 border-slate-400 dark:border-slate-500 text-slate-900 dark:text-white"
                      }`}
                  >
                    {completed ? "✓" : index + 1}
                  </div>
                  <span className={`text-sm whitespace-nowrap hidden sm:block ${active ? "text-slate-900 dark:text-white font-bold" : "text-slate-700 dark:text-slate-300 font-semibold"}`}>{s.label}</span>
                </button>

                {index < STEPS.length - 1 ? <div className="flex-1 w-8 h-0.5 bg-slate-400 dark:bg-slate-600 mx-2 hidden sm:block transition-colors" /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StickyFooter({ stepIndex, canContinue, isLast, onBack, onSaveExit, onNext }: StickyFooterProps) {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-[55] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-2 md:px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2 py-2 text-sm">
        <div className="hidden sm:flex flex-col">
          <span className="font-semibold text-sm text-slate-900 dark:text-white">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300">Profile, Socials, KYC, Payout, Preferences, Review & Terms</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={onBack}
            disabled={stepIndex === 0}
            type="button"
          >
            Back
          </button>
          <button className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={onSaveExit} type="button">
            Save & exit
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${canContinue ? "bg-[#f77f00] text-white hover:bg-[#e26f00]" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 dark:text-slate-300 cursor-not-allowed"
              }`}
            onClick={onNext}
            disabled={!canContinue}
            type="button"
          >
            {isLast ? "Submit for approval" : "Continue"}
          </button>
        </div>
      </div>
    </footer>
  );
}

function SectionCard({ title, subtitle, children, right }: SectionCardProps) {
  return (
    <section className={`grid grid-cols-1 ${right ? "lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]" : ""} gap-4 items-start`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3 md:p-4 flex flex-col gap-3 md:gap-4 border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-semibold mb-1 text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="text-base text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
        </div>
        {children}
      </div>
      {right ? <aside className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 md:p-5 border border-slate-200 dark:border-slate-700 sticky top-20">{right}</aside> : null}
    </section>
  );
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1 text-base">
      <label className="font-medium text-slate-900 dark:text-slate-200">{label}</label>
      {children}
      {hint ? <p className="text-sm text-slate-600 dark:text-slate-300">{hint}</p> : null}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: InputProps) {
  return (
    <input
      type={type}
      className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-base bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 dark:focus:border-slate-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-300"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-base bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 dark:focus:border-slate-500 outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-300"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-base bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 dark:focus:border-slate-500 outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Chip({ label, selected, onClick, color }: ChipProps) {
  return (
    <button type="button" onClick={onClick} className={`px-2.5 py-1 rounded-full text-base border transition-colors ${selected ? chipClass(selected, color) : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
      {label}
    </button>
  );
}

function PayoutMethodCard({ label, description, selected, onSelect }: PayoutMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left border rounded-2xl p-3 flex flex-col gap-1 text-[11px] transition-colors ${selected ? "border-[#f77f00] bg-amber-50/40 dark:bg-amber-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
        }`}
    >
      <span className="text-[12px] font-semibold text-slate-900 dark:text-white">{label}</span>
      <span className="text-[10px] text-slate-600 dark:text-slate-300">{description}</span>
    </button>
  );
}

function UploadBox({ title, subtitle, fileName, onPick, onSample: _onSample, required, error, accept }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="font-medium text-slate-900 dark:text-slate-200">
        {title}
        {required ? " *" : ""}
      </label>
      <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-2 py-4 flex flex-col items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <span>{subtitle}</span>
        </div>
        <span className="text-[9px] text-slate-400 dark:text-slate-600 dark:text-slate-300 mt-1">JPEG, PNG or PDF · max 10 MB</span>

        {fileName ? (
          <span className="mt-2 text-[10px] text-slate-700 dark:text-slate-300">
            Selected: <span className="font-semibold">{fileName}</span>
          </span>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button className="px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300" type="button" onClick={() => inputRef.current?.click()}>
            Choose file
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept || "image/*,application/pdf"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onPick(f.name);
          }}
        />
      </div>
      {error ? <p className="mt-1 text-[10px] text-red-500">{error}</p> : null}
    </div>
  );
}

function ReviewRow({ title, status, onEdit }: ReviewRowProps) {
  const ok = status === "ok";
  const warn = status === "warn";
  return (
    <div className="flex items-start justify-between gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-start gap-2">
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${ok ? "bg-emerald-500 text-white" : warn ? "bg-amber-500 text-white" : "bg-slate-300 dark:bg-slate-600 text-white"
            }`}
        >
          {ok ? <Check className="h-4 w-4" /> : warn ? "!" : "•"}
        </div>
        <div>
          <div className="text-base font-semibold text-slate-900 dark:text-white">{title}</div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{ok ? "Complete" : warn ? "Recommended" : "Missing"}</div>
        </div>
      </div>
      <button className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" type="button" onClick={onEdit}>
        Edit
      </button>
    </div>
  );
}

function PolicyDisclosure({ policyKey, title, subtitle, bullets, seen, onSeen, onOpenFull }: PolicyDisclosureProps) {
  return (
    <details
      className={`rounded-xl border overflow-hidden ${seen ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`}
      onToggle={(e) => {
        if (e.currentTarget.open && !seen) onSeen();
      }}
    >
      <summary className="list-none cursor-pointer px-3 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {policyKey === "platform" ? <ShieldCheck className="h-4 w-4" /> : policyKey === "content" ? <Globe className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            </span>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{title}</div>
          </div>
          {subtitle ? <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{subtitle}</div> : null}
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] ${seen ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
            }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${seen ? "bg-emerald-500" : "bg-slate-400"}`} />
          {seen ? "Seen" : "Open"}
        </span>
      </summary>

      <div className="px-3 pb-3">
        <ul className="mt-1 list-disc pl-4 text-sm text-slate-600 dark:text-slate-400 space-y-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-slate-600 dark:text-slate-300">This is a summary. Read the full text for details.</span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-2"
            onClick={onOpenFull}
          >
            <ExternalLink className="h-4 w-4" /> Read full
          </button>
        </div>
      </div>
    </details>
  );
}

export default function CreatorOnboardingWorldClassV25() {
  const { toasts, push } = useToasts();
  const navigate = useNavigate();

  const [saved, setSaved] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [maxUnlocked, setMaxUnlocked] = useState(0);

  const [confirmReset, setConfirmReset] = useState(false);

  const [openPolicy, setOpenPolicy] = useState<"platform" | "content" | "payout" | null>(null);

  const [editingVerificationContact, setEditingVerificationContact] = useState(false);

  const [form, setForm] = useState<OnboardingForm>(() => defaultForm());

  const prevMethodRef = useRef<string>("");

  // Scroll-to-bottom consent gate (optional alternative to expanding each policy section)
  const termsScrollRef = useRef<HTMLDivElement>(null);
  const [termsScrollPct, setTermsScrollPct] = useState(0);

  const creatorType = form.profile.creatorType;

  // Load (v2.4+ key, with v2.3 fallback)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY_LEGACY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(deepMerge(defaultForm(), parsed));
        push("Progress restored.", "success");
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-populate Email/Phone from EVzone if empty
  useEffect(() => {
    const mockFetchEvzoneAccount = async () => {
      // simulate API delay
      await new Promise(r => setTimeout(r, 800));
      update("profile.email", "ronald.isabirye@evzone.test");
      update("profile.phone", "+256 700 000 000");
      update("profile.whatsapp", ""); // Empty to test fallback
      push("Profile details pre-populated from EVzone Accounts.", "success");
    };

    if (!form.profile.email || !form.profile.phone) {
      mockFetchEvzoneAccount();
    }
  }, []);

  // Pre-populate Verification Contact Value based on method
  useEffect(() => {
    const method = form.payout.verificationDeliveryMethod;
    if (!method) {
      prevMethodRef.current = "";
      return;
    }

    // Only auto-fill if the method has changed
    if (method !== prevMethodRef.current) {
      let newValue = "";
      if (method === "Email") {
        newValue = form.profile.email;
      } else if (method === "SMS") {
        newValue = form.profile.phone;
      } else if (method === "WhatsApp") {
        newValue = form.profile.whatsapp || form.profile.phone;
      }

      if (newValue) {
        update("payout.verificationContactValue", newValue);
      }
      prevMethodRef.current = method;
    }
  }, [form.payout.verificationDeliveryMethod, form.profile.email, form.profile.phone]);

  // Auto-save
  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      } catch {
        // ignore
      }
      setSaved(true);
    }, 350);
    return () => clearTimeout(t);
  }, [form]);

  const stepKey = STEPS[stepIndex].key;
  const isLast = stepIndex === STEPS.length - 1;
  const canContinue = StepValidity(stepKey, form);
  const trustScore = useMemo(() => computeTrustScore(form), [form]);

  const primarySocial = useMemo(() => getPrimarySocialDisplay(form.socials), [form.socials]);

  const policySeen = form.review.seenPolicies || { platform: false, content: false, payout: false };
  const scrolledToBottom = !!form.review.scrolledToBottom;
  const allPoliciesSeen = scrolledToBottom;

  useEffect(() => {
    setMaxUnlocked((m) => Math.max(m, stepIndex));
  }, [stepIndex]);

  const update = (path: string, value: unknown) => {
    setForm((prev) => {
      const next = deepClone(prev);
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const toggleInArray = (path: string, item: string) => {
    setForm((prev) => {
      const next = deepClone(prev);
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      const key = parts[parts.length - 1];
      const arr = Array.isArray(cur[key]) ? cur[key] : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cur[key] = arr.includes(item) ? arr.filter((x: string) => x !== item) : [...arr, item];
      return next;
    });
  };

  const addExtraSocial = () => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.socials.extra.push({ platform: "", handle: "", followers: "" });
      return next;
    });
    push("Added a social account row.", "success");
  };

  const updateExtraSocial = (index: number, patch: Partial<ExtraSocial>) => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.socials.extra[index] = { ...next.socials.extra[index], ...patch };
      if (patch.platform && patch.platform !== "Other") next.socials.extra[index].otherName = "";
      return next;
    });
  };

  const removeExtraSocial = (index: number) => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.socials.extra = next.socials.extra.filter((_, i) => i !== index);
      return next;
    });
    push("Removed social account.", "success");
  };

  const totalExtraReach = useMemo(() => {
    const extra = (form.socials.extra || []).reduce((sum, acc) => sum + parseFollowersString(acc.followers), 0);
    const primaryOther = form.socials.primaryPlatform === "Other" ? parseFollowersString(form.socials.primaryOtherFollowers) : 0;
    return extra + primaryOther;
  }, [form.socials.extra, form.socials.primaryPlatform, form.socials.primaryOtherFollowers]);

  const sendVerification = () => {
    if (!isFilled(form.payout.method)) {
      push("Select a payout method first.", "error");
      return;
    }
    update("payout.verification.status", "code_sent");
    update("payout.verification.code", "");
    push(`Verification code sent to ${form.payout.verificationContactValue}.`, "success");
  };

  const verify = () => {
    const code = String(form.payout.verification.code || "").trim();
    if (!code || code.length < 4 || !isDigits(code)) {
      push("Enter a valid verification code.", "error");
      return;
    }
    update("payout.verification.status", "verified");
    push("Payout method verified.", "success");
  };

  const makeAiProfile = () => {
    const region = (form.profile.audienceRegions || ["Global"])[0] || "Global";
    const langs = (form.profile.contentLanguages || ["English"]).join(", ");
    const line = (form.preferences.lines || ["Electronics"])[0] || "Electronics";

    update("profile.tagline", `${line} creator for ${region}`);
    update(
      "profile.bio",
      `I create premium content in ${langs} focused on ${line}. I help suppliers (Sellers and Providers) tell clear stories that convert through Live Sessionz and Shoppable Adz.`
    );
    push("Bio and tagline suggested.", "success");
  };

  const trustUnlocks = useMemo(() => {
    const unlocks = [];
    if (trustScore >= 30) unlocks.push("Access more campaigns");
    if (trustScore >= 50) unlocks.push("Eligible for verified badge review");
    if (trustScore >= 70) unlocks.push("Higher budget invites");
    if (trustScore >= 85) unlocks.push("Creator Success priority support");
    return unlocks;
  }, [trustScore]);

  const goNext = () => {
    if (!canContinue) {
      push("Complete required fields to continue.", "error");
      return;
    }
    if (!isLast) {
      setStepIndex((i) => i + 1);
      push("Step completed.", "success");
    } else {
      push("Account created! Please sign in to continue.", "success");
      // Clear session to force re-login
      localStorage.removeItem("creatorPlatformEntered");
      localStorage.removeItem("mldz_creator_approval_status");
      setTimeout(() => navigate("/"), 1500);
    }
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const exitOnboarding = () => {
    push("Progress saved. You can resume anytime.", "success");
    navigate("/auth");
  };

  const saveExit = () => {
    push("Saved. You can resume later.", "success");
    navigate("/auth");
  };

  const openHelp = () => {
    push("Help Center is available in Settings. For now, this is a preview.", "success");
  };

  const reset = () => setConfirmReset(true);

  const confirmResetNow = () => {
    setConfirmReset(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      localStorage.removeItem("mldz_creator_approval_status");
    } catch {
      // ignore
    }
    setStepIndex(0);
    setMaxUnlocked(0);
    setForm(defaultForm());
    push("Onboarding reset.", "success");
  };

  const onJump = (idx: number) => {
    setStepIndex(idx);
    push(`Opened ${STEPS[idx].label}.`, "success");
  };

  const connectPrimary = (label: string, key: string) => {
    const current = String(form.socials[key] || "").trim();
    if (current) {
      push(`${label} is already filled.`, "success");
      return;
    }
    const suggestion = label === "YouTube" ? "https://youtube.com/@yourchannel" : "@yourhandle";
    update(`socials.${key}`, suggestion);
    push(`${label} connected.`, "success");
  };

  const connectOtherPrimary = () => {
    if (isFilled(form.socials.primaryOtherHandle)) {
      push("Primary handle is already filled.", "success");
      return;
    }
    update("socials.primaryOtherHandle", "@yourhandle");
    push("Primary platform handle added.", "success");
  };

  const markPoliciesSeenByScroll = () => {
    setForm((prev) => {
      const next = deepClone(prev);
      next.review.scrolledToBottom = true;
      next.review.seenPolicies.platform = true;
      next.review.seenPolicies.content = true;
      next.review.seenPolicies.payout = true;
      return next;
    });
    push("Policies reviewed. Consent unlocked.", "success");
  };

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const pct = max === 0 ? 100 : Math.round((el.scrollTop / max) * 100);
    setTermsScrollPct(pct);

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (nearBottom && !form.review.scrolledToBottom) {
      markPoliciesSeenByScroll();
    }
  };

  // When entering the Review step, compute current scroll progress (and auto-unlock if no scrolling is needed)
  useEffect(() => {
    if (stepKey !== "review") return;
    const el = termsScrollRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    const pct = max === 0 ? 100 : Math.round((el.scrollTop / max) * 100);
    setTermsScrollPct(pct);
    if (max === 0 && !form.review.scrolledToBottom) {
      markPoliciesSeenByScroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100 bg-[#f2f2f2] dark:bg-slate-950">
      <TopBar saved={saved} onExit={exitOnboarding} onReset={reset} onHelp={openHelp} />
      <Stepper stepIndex={stepIndex} maxUnlocked={maxUnlocked} onJump={onJump} />

      <ToastStack toasts={toasts} />

      <ConfirmModal
        open={confirmReset}
        title="Reset onboarding?"
        description="This will clear your saved progress and all entered details."
        confirmText="Reset"
        onConfirm={confirmResetNow}
        onClose={() => setConfirmReset(false)}
      />

      <Modal
        open={!!openPolicy}
        title={openPolicy ? POLICY_LIBRARY[openPolicy]?.title : ""}
        subtitle={openPolicy ? POLICY_LIBRARY[openPolicy]?.subtitle : ""}
        onClose={() => setOpenPolicy(null)}
      >
        {openPolicy ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 text-[11px] text-slate-700 dark:text-slate-200">
              <div className="font-semibold text-slate-900 dark:text-white">Quick summary</div>
              <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                {POLICY_LIBRARY[openPolicy].bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>

            {POLICY_LIBRARY[openPolicy].sections.map((sec) => (
              <div key={sec.h} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-3">
                <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{sec.h}</div>
                <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  {sec.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3 text-[10px] text-slate-600 dark:text-slate-300">
              Note: This is a product UI preview. Replace this copy with your final legal text when publishing.
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Main */}
      <main className="flex-1 flex flex-col px-2 md:px-3 pt-2 pb-28">
        <div className="w-full flex flex-col gap-4">
          {stepKey === "profile" ? (
            <SectionCard
              title="Profile basics"
              subtitle="This is what suppliers and buyers will see on your public Creator profile."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">AI profile builder</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Optional, recommended for a premium profile.</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 text-[10px]">
                    <p className="text-slate-600 dark:text-slate-300 mb-1">What it helps with</p>
                    <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5">
                      <li>Suggests a strong tagline and bio.</li>
                      <li>Aligns your profile with your niche and regions.</li>
                      <li>You can edit everything before publishing.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="w-full py-1.5 rounded-full bg-[#f77f00] text-white text-[11px] font-semibold hover:bg-[#e26f00]"
                    onClick={makeAiProfile}
                  >
                    Suggest bio and tagline
                  </button>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full name *">
                  <Input value={form.profile.name} onChange={(v) => update("profile.name", v)} placeholder="Your full name" />
                </Field>
                <Field label="Creator handle *" hint="Example: @yourhandle">
                  <Input value={form.profile.handle} onChange={(v) => update("profile.handle", v)} placeholder="@yourhandle" />
                </Field>
              </div>

              <Field label="Tagline" hint="Short line that describes your niche">
                <Input value={form.profile.tagline} onChange={(v) => update("profile.tagline", v)} placeholder="Electronics creator" />
              </Field>

              <Field label="Bio" hint="Keep it clear, premium and specific.">
                <Textarea value={form.profile.bio} onChange={(v) => update("profile.bio", v)} placeholder="Tell suppliers what you do and who you reach." rows={4} />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Email *">
                  <Input value={form.profile.email} onChange={(v) => update("profile.email", v)} placeholder="your@email.com" type="email" />
                  {isFilled(form.profile.email) && !isEmailLike(form.profile.email) && (
                    <div className="text-[10px] text-red-500 italic mt-0.5">Invalid email format.</div>
                  )}
                </Field>
                <Field label="Primary phone contact *">
                  <Input value={form.profile.phone} onChange={(v) => update("profile.phone", v)} placeholder="+256 700 000 000" type="tel" />
                  {isFilled(form.profile.phone) && !isE164(form.profile.phone) && (
                    <div className="text-[10px] text-red-500 italic mt-0.5">Use international format (e.g. +256...).</div>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Country *">
                  <Input value={form.profile.country} onChange={(v) => update("profile.country", v)} placeholder="Uganda" />
                </Field>
                <Field label="Creator type *" hint="Choose how you operate (individual vs multi‑user account).">
                  <Select value={form.profile.creatorType} onChange={(v) => update("profile.creatorType", v)} options={["Individual", "Team", "Agency"]} />
                </Field>
              </div>

              {/* Team / Agency details */}
              {creatorType === "Team" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Team details</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">
                        Used for invites, role management, and business verification. Keep it accurate.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Team name *">
                      <Input value={form.profile.team.name} onChange={(v) => update("profile.team.name", v)} placeholder="Example: Acme Live Crew" />
                      {!isFilled(form.profile.team.name) ? <div className="text-[10px] text-red-500">Team name is required.</div> : null}
                    </Field>
                    <Field label="Team type *">
                      <Select value={form.profile.team.type} onChange={(v) => update("profile.team.type", v)} options={["", ...TEAM_TYPES]} />
                      {!isFilled(form.profile.team.type) ? <div className="text-[10px] text-red-500">Select a team type.</div> : null}
                    </Field>
                    <Field label="Team size">
                      <Select value={form.profile.team.size} onChange={(v) => update("profile.team.size", v)} options={ORG_SIZES} />
                    </Field>
                    <Field label="Website (optional)">
                      <Input value={form.profile.team.website} onChange={(v) => update("profile.team.website", v)} placeholder="https://..." />
                    </Field>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UploadMini
                      title="Team logo (optional)"
                      value={form.profile.team.logoName}
                      onPick={(name) => {
                        update("profile.team.logoName", name);
                        push("Team logo selected.", "success");
                      }}
                      helper="Optional. Used on shared invites and session cards."
                      accept="image/*"
                    />
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-[10px] text-slate-600 dark:text-slate-400">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Premium tip</div>
                      <div className="mt-1">
                        Team accounts work best with <span className="font-semibold text-slate-900 dark:text-white">Roles & Permissions</span>. You can invite producers and moderators after onboarding.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {creatorType === "Agency" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Agency details</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">
                        Agencies can manage multiple creators. We ask for just enough info to verify the organisation.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Agency name *">
                      <Input value={form.profile.agency.name} onChange={(v) => update("profile.agency.name", v)} placeholder="Example: Bright Talent" />
                      {!isFilled(form.profile.agency.name) ? <div className="text-[10px] text-red-500">Agency name is required.</div> : null}
                    </Field>
                    <Field label="Agency type *">
                      <Select value={form.profile.agency.type} onChange={(v) => update("profile.agency.type", v)} options={["", ...AGENCY_TYPES]} />
                      {!isFilled(form.profile.agency.type) ? <div className="text-[10px] text-red-500">Select an agency type.</div> : null}
                    </Field>
                    <Field label="Website (optional)">
                      <Input value={form.profile.agency.website} onChange={(v) => update("profile.agency.website", v)} placeholder="https://..." />
                    </Field>
                    <UploadMini
                      title="Agency logo (optional)"
                      value={form.profile.agency.logoName}
                      onPick={(name) => {
                        update("profile.agency.logoName", name);
                        push("Agency logo selected.", "success");
                      }}
                      helper="Optional. Used on shared invites and agency profile."
                      accept="image/*"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Time zone *">
                  <Select
                    value={form.profile.timezone}
                    onChange={(v) => update("profile.timezone", v)}
                    options={["Africa/Kampala (EAT)", "Africa/Nairobi", "Asia/Shanghai", "UTC"]}
                  />
                </Field>
                <Field label="Base currency *">
                  <Select value={form.profile.currency} onChange={(v) => update("profile.currency", v)} options={["USD", "UGX", "KES", "CNY", "EUR"]} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <UploadMini
                  title="Profile photo"
                  value={form.profile.profilePhotoName}
                  onPick={(name) => {
                    update("profile.profilePhotoName", name);
                    push("Profile photo selected.", "success");
                  }}
                  helper="Optional, recommended for a premium profile."
                />
                <UploadMini
                  title="Media kit (PDF)"
                  value={form.profile.mediaKitName}
                  onPick={(name) => {
                    update("profile.mediaKitName", name);
                    push("Media kit selected.", "success");
                  }}
                  helper="Optional. Upload a one-page kit for high-budget suppliers."
                  accept="application/pdf"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[11px]">Content languages</label>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <Chip
                        key={lang}
                        label={lang}
                        selected={(form.profile.contentLanguages || []).includes(lang)}
                        onClick={() => toggleInArray("profile.contentLanguages", lang)}
                        color="green"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[11px]">Audience regions</label>
                  <div className="flex flex-wrap gap-1.5">
                    {REGION_OPTIONS.map((r) => (
                      <Chip key={r} label={r} selected={(form.profile.audienceRegions || []).includes(r)} onClick={() => toggleInArray("profile.audienceRegions", r)} />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-600 dark:text-slate-300">Languages and regions improve campaign matching.</p>
            </SectionCard>
          ) : null}

          {stepKey === "socials" ? (
            <SectionCard
              title="Link social accounts"
              subtitle="Connect all channels you actively use."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Reach snapshot</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Helps seed matching and rank.</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Added platforms reach</div>
                    <div className="text-[16px] font-semibold" style={{ color: ORANGE }}>
                      {totalExtraReach.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">followers (approx.)</div>
                  </div>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SOCIAL_PRIMARY.map((p) => (
                  <SocialConnect
                    key={p.key}
                    label={p.label}
                    value={form.socials[p.key]}
                    placeholder={p.placeholder}
                    onChange={(v) => update(`socials.${p.key}`, v)}
                    onConnect={() => connectPrimary(p.label, p.key)}
                  />
                ))}

                <Field label="Primary platform" hint="Helps us prioritise campaigns and session invites.">
                  <Select
                    value={form.socials.primaryPlatform}
                    onChange={(v) => {
                      update("socials.primaryPlatform", v);
                      if (v !== "Other") {
                        // clear other-primary fields when not used
                        update("socials.primaryOtherPlatform", "");
                        update("socials.primaryOtherCustomName", "");
                        update("socials.primaryOtherHandle", "");
                        update("socials.primaryOtherFollowers", "");
                      }
                    }}
                    options={["Instagram", "TikTok", "YouTube", "Other"]}
                  />
                </Field>

                {/* NEW: show platform options immediately when "Other" is chosen */}
                {form.socials.primaryPlatform === "Other" ? (
                  <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Primary platform (Other)</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">
                          Choose your platform below (no need to add an extra row first).
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                        onClick={connectOtherPrimary}
                      >
                        Connect
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Platform *">
                        <select
                          className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-500 outline-none"
                          value={form.socials.primaryOtherPlatform}
                          onChange={(e) => update("socials.primaryOtherPlatform", e.target.value)}
                        >
                          <option value="">Select platform</option>
                          {OTHER_SOCIAL_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        {!isFilled(form.socials.primaryOtherPlatform) ? <p className="text-[10px] text-red-500">Select a platform.</p> : null}
                      </Field>

                      {form.socials.primaryOtherPlatform === "Other" ? (
                        <Field label="Specify *" hint="If your platform isn’t listed, type it here.">
                          <Input
                            value={form.socials.primaryOtherCustomName}
                            onChange={(v) => update("socials.primaryOtherCustomName", v)}
                            placeholder="Platform name"
                          />
                          {!isFilled(form.socials.primaryOtherCustomName) ? <p className="text-[10px] text-red-500">Required for “Other”.</p> : null}
                        </Field>
                      ) : (
                        <div />
                      )}

                      <Field label="Handle or URL *" hint="This is your primary account for matching.">
                        <Input
                          value={form.socials.primaryOtherHandle}
                          onChange={(v) => update("socials.primaryOtherHandle", v)}
                          placeholder="@handle or full URL"
                        />
                        {!isFilled(form.socials.primaryOtherHandle) ? <p className="text-[10px] text-red-500">Handle or URL is required.</p> : null}
                      </Field>

                      <Field label="Followers (optional)" hint="Used only for matching; you can update anytime.">
                        <Input
                          value={form.socials.primaryOtherFollowers}
                          onChange={(v) => update("socials.primaryOtherFollowers", v)}
                          placeholder="e.g. 12k"
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Other platforms</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Add as many as you need. If you pick "Other", you must specify.</div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-[#f77f00] text-[11px] text-[#f77f00] hover:bg-orange-50 dark:hover:bg-orange-900/20 font-semibold"
                    onClick={addExtraSocial}
                  >
                    + Add account
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {(form.socials.extra || []).map((acc, idx) => {
                    const needOther = acc.platform === "Other";
                    const otherMissing = needOther && !isFilled(acc.otherName);
                    const platformMissing = !isFilled(acc.platform);
                    const handleMissing = !isFilled(acc.handle);

                    return (
                      <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800 flex flex-col gap-2">
                        <div className="flex flex-col md:flex-row gap-2">
                          <div className="md:w-44 flex flex-col gap-1">
                            <label className="text-[10px] text-slate-600 dark:text-slate-400">Platform *</label>
                            <select
                              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-500 outline-none"
                              value={acc.platform}
                              onChange={(e) => updateExtraSocial(idx, { platform: e.target.value })}
                            >
                              <option value="">Select platform</option>
                              {OTHER_SOCIAL_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            {platformMissing ? <p className="text-[10px] text-red-500">Select a platform.</p> : null}
                          </div>

                          {needOther ? (
                            <div className="md:w-44 flex flex-col gap-1">
                              <label className="text-[10px] text-slate-600">Specify *</label>
                              <input
                                className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white focus:border-slate-400 outline-none"
                                placeholder="Platform name"
                                value={acc.otherName}
                                onChange={(e) => updateExtraSocial(idx, { otherName: e.target.value })}
                              />
                              {otherMissing ? <p className="text-[10px] text-red-500">Required for "Other".</p> : null}
                            </div>
                          ) : null}

                          <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] text-slate-600 dark:text-slate-400">Handle or URL *</label>
                            <input
                              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-500 outline-none"
                              placeholder="@handle or full URL"
                              value={acc.handle}
                              onChange={(e) => updateExtraSocial(idx, { handle: e.target.value })}
                            />
                            {handleMissing ? <p className="text-[10px] text-red-500">Handle or URL is required.</p> : null}
                          </div>

                          <div className="md:w-36 flex flex-col gap-1">
                            <label className="text-[10px] text-slate-600 dark:text-slate-400">Followers</label>
                            <input
                              className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-500 outline-none"
                              placeholder="e.g. 12k"
                              value={acc.followers}
                              onChange={(e) => updateExtraSocial(idx, { followers: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600 dark:text-slate-300">You can hide platforms later in Settings.</span>
                          <button className="text-slate-400 hover:text-slate-700" type="button" onClick={() => removeExtraSocial(idx)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          ) : null}

          {stepKey === "kyc" ? (
            <SectionCard
              title="Verify your identity"
              subtitle="KYC keeps the platform safe. Review is typically fast."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Verification unlocks</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">What you get after approval.</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { t: "Go Live access", d: "Unlock Live Sessionz studio." },
                      { t: "Higher budgets", d: "Access more premium campaigns." },
                      { t: "Trust badge review", d: "Eligible for verified badge review." }
                    ].map((x) => (
                      <div key={x.t} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800">
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{x.t}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">{x.d}</div>
                      </div>
                    ))}
                  </div>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] ${form.kyc.status === "verified" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${form.kyc.status === "verified" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>{form.kyc.status === "verified" ? "KYC verified" : "KYC pending"}</span>
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300">Your information is encrypted and protected.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Document type *">
                  <Select value={form.kyc.documentType} onChange={(v) => update("kyc.documentType", v)} options={["National ID", "Passport", "Driver License"]} />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <UploadBox
                  title="Government ID"
                  subtitle="Upload a clear photo or PDF"
                  fileName={form.kyc.idFileName}
                  required
                  accept="image/*,application/pdf"
                  onPick={(name) => {
                    update("kyc.idFileName", name);
                    update("kyc.idUploaded", true);
                    push("ID uploaded.", "success");
                  }}
                  error={!form.kyc.idUploaded ? "Please upload a clear image of your government ID." : ""}
                />

                <UploadBox
                  title="Selfie verification"
                  subtitle="Take or upload a selfie"
                  fileName={form.kyc.selfieFileName}
                  required
                  accept="image/*"
                  onPick={(name) => {
                    update("kyc.selfieFileName", name);
                    update("kyc.selfieUploaded", true);
                    push("Selfie uploaded.", "success");
                  }}
                  error={!form.kyc.selfieUploaded ? "Please provide a selfie for verification." : ""}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <UploadBox
                  title="Address proof (optional)"
                  subtitle="Utility bill or bank statement"
                  fileName={form.kyc.addressFileName}
                  accept="image/*,application/pdf"
                  onPick={(name) => {
                    update("kyc.addressFileName", name);
                    update("kyc.addressUploaded", true);
                    push("Address proof uploaded.", "success");
                  }}
                />

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-[10px] h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Privacy note</div>
                    <ShieldCheck className="h-4 w-4" style={{ color: ORANGE }} />
                  </div>
                  <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-1">
                    <li>Only compliance teams can view your documents.</li>
                    <li>We never share KYC files with suppliers.</li>
                    <li>You can request deletion after account closure.</li>
                  </ul>
                </div>
              </div>

              {/* NEW: Org docs (recommended, light-touch) */}
              {creatorType !== "Individual" ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Organisation documents (recommended)</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">
                        For Team/Agency accounts we request just enough to verify the organisation. Optional unless requested by Compliance.
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                      <FileText className="h-4 w-4" /> Premium
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <UploadBox
                      title={creatorType === "Agency" ? "Agency registration (recommended)" : "Business registration (optional)"}
                      subtitle="Registration certificate or company document"
                      fileName={form.kyc.org.registrationFileName}
                      accept="image/*,application/pdf"
                      onPick={(name) => {
                        update("kyc.org.registrationFileName", name);
                        update("kyc.org.registrationUploaded", true);
                        push("Organisation document uploaded.", "success");
                      }}
                    />

                    <UploadBox
                      title="Tax document (optional)"
                      subtitle="Tax certificate / TIN letter / proof of tax"
                      fileName={form.kyc.org.taxFileName}
                      accept="image/*,application/pdf"
                      onPick={(name) => {
                        update("kyc.org.taxFileName", name);
                        update("kyc.org.taxUploaded", true);
                        push("Tax document uploaded.", "success");
                      }}
                    />
                  </div>

                  {creatorType === "Agency" ? (
                    <div className="mt-3">
                      <UploadBox
                        title="Letter of authorisation (optional)"
                        subtitle="If you manage creators on their behalf"
                        fileName={form.kyc.org.authorizationFileName}
                        accept="image/*,application/pdf"
                        onPick={(name) => {
                          update("kyc.org.authorizationFileName", name);
                          update("kyc.org.authorizationUploaded", true);
                          push("Authorisation letter uploaded.", "success");
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300">
                    Tip: Uploading org docs can speed up verification for multi‑user accounts.
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  onClick={() => {
                    update("kyc.status", form.kyc.status === "verified" ? "pending" : "verified");
                    push("KYC status updated.", "success");
                  }}
                >
                  Toggle verification status
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-[#f77f00] text-[11px] hover:bg-orange-50 dark:hover:bg-orange-900/20 text-[#f77f00] font-semibold"
                  onClick={() => push("Camera capture opened.", "success")}
                >
                  <span className="inline-flex items-center gap-2">
                    <Camera className="h-4 w-4" /> Use camera
                  </span>
                </button>
              </div>
            </SectionCard>
          ) : null}

          {stepKey === "payout" ? (
            <SectionCard
              title="Payout details"
              subtitle="Choose how you want to get paid. You can add more payout methods later."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Payout readiness</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Verification can reduce payout holds.</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Verification status</div>
                    <div className="mt-1 inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      <span
                        className={`h-2 w-2 rounded-full ${form.payout.verification.status === "verified"
                          ? "bg-emerald-500"
                          : form.payout.verification.status === "code_sent"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                          }`}
                      />
                      <span className="font-semibold">
                        {form.payout.verification.status === "verified"
                          ? "Verified"
                          : form.payout.verification.status === "code_sent"
                            ? "Code sent"
                            : "Not started"}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300">Tip: verify for fewer holds.</div>
                  </div>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {PAYOUT_METHODS.map((m) => (
                  <PayoutMethodCard
                    key={m.key}
                    label={m.title}
                    description={m.desc}
                    selected={form.payout.method === m.key}
                    onSelect={() => {
                      update("payout.method", m.key);
                      push(`${m.title} selected.`, "success");
                    }}
                  />
                ))}
              </div>

              {!isFilled(form.payout.method) ? <p className="text-[10px] text-red-500">Please select a payout method.</p> : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Payout currency *" hint="You can add more currencies later.">
                  <Select value={form.payout.currency} onChange={(v) => update("payout.currency", v)} options={["USD", "UGX", "KES", "CNY", "EUR"]} />
                </Field>

                <Field label="Payout schedule" hint="Choose how often you want payouts.">
                  <Select value={form.payout.schedule} onChange={(v) => update("payout.schedule", v)} options={["Weekly", "Bi-weekly", "Monthly"]} />
                </Field>
              </div>

              <Field label="Minimum payout threshold" hint="Payouts are sent when available balance reaches this amount.">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={500}
                    value={form.payout.minThreshold}
                    onChange={(e) => update("payout.minThreshold", clampNumber(e.target.value, 10, 500))}
                    className="flex-1"
                  />
                  <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-semibold text-slate-900 dark:text-white">{form.payout.minThreshold}</div>
                </div>
              </Field>

              {/* Method-specific details */}
              {form.payout.method === "Bank" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Bank name *">
                    <Input value={form.payout.bank.bankName} onChange={(v) => update("payout.bank.bankName", v)} placeholder="Bank name" />
                  </Field>
                  <Field label="Account name *">
                    <Input value={form.payout.bank.accountName} onChange={(v) => update("payout.bank.accountName", v)} placeholder="Account name" />
                  </Field>
                  <Field label="Account number *">
                    <Input value={form.payout.bank.accountNumber} onChange={(v) => update("payout.bank.accountNumber", v)} placeholder="Account number" />
                  </Field>
                  <Field label="SWIFT / Routing (optional)">
                    <Input value={form.payout.bank.swift} onChange={(v) => update("payout.bank.swift", v)} placeholder="SWIFT / routing" />
                  </Field>
                </div>
              ) : null}

              {form.payout.method === "Mobile Money" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Provider *">
                    <Input value={form.payout.mobile.provider} onChange={(v) => update("payout.mobile.provider", v)} placeholder="MTN / Airtel" />
                  </Field>
                  <Field label="Phone number *">
                    <Input value={form.payout.mobile.phone} onChange={(v) => update("payout.mobile.phone", v)} placeholder="+256..." />
                  </Field>
                </div>
              ) : null}

              {form.payout.method === "PayPal / Wallet" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Wallet email *" hint="Example: PayPal email">
                    <Input value={form.payout.wallet.email} onChange={(v) => update("payout.wallet.email", v)} placeholder="name@email.com" />
                  </Field>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-[10px]">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Wallet note</div>
                    <div className="mt-1 text-slate-600 dark:text-slate-300">Make sure the email is active and can receive payouts.</div>
                  </div>
                </div>
              ) : null}

              {form.payout.method === "AliPay" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="AliPay account name *">
                    <Input value={form.payout.alipay.name} onChange={(v) => update("payout.alipay.name", v)} placeholder="Full name" />
                  </Field>
                  <Field label="AliPay account *" hint="Phone number or AliPay ID">
                    <Input value={form.payout.alipay.account} onChange={(v) => update("payout.alipay.account", v)} placeholder="AliPay ID / phone" />
                  </Field>
                </div>
              ) : null}

              {form.payout.method === "WeChat Pay" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="WeChat Pay account name *">
                    <Input value={form.payout.wechat.name} onChange={(v) => update("payout.wechat.name", v)} placeholder="Full name" />
                  </Field>
                  <Field label="WeChat ID" hint="Provide either WeChat ID or phone number">
                    <Input value={form.payout.wechat.wechatId} onChange={(v) => update("payout.wechat.wechatId", v)} placeholder="WeChat ID" />
                  </Field>
                  <Field label="Phone number" hint="Provide either phone number or WeChat ID">
                    <Input value={form.payout.wechat.phone} onChange={(v) => update("payout.wechat.phone", v)} placeholder="+86..." />
                  </Field>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-[10px]">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">WeChat Pay note</div>
                    <div className="mt-1 text-slate-600 dark:text-slate-300">Ensure the wallet is active and can receive transfers.</div>
                  </div>
                </div>
              ) : null}

              {/* ENFORCED: Policy + settlement rules surfaced inside payout step */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Payout policy & settlement rules *</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">
                      Please scroll through the summary and rules below to unlock the agreement.
                    </div>
                  </div>
                  <div
                    className={`shrink-0 inline-flex items-center gap-2 px-2 py-0.5 rounded-full border text-[9px] font-bold ${form.payout.scrolledToBottomPayout ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                  >
                    <span className={`h-1 w-1 rounded-full ${form.payout.scrolledToBottomPayout ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {form.payout.scrolledToBottomPayout ? "Review confirmed" : "Please review"}
                  </div>
                </div>

                <div
                  className="mt-3 max-h-[160px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-inner custom-scrollbar"
                  onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    // Detect when the user has truly reached the bottom (with a small 2px threshold)
                    if (scrollHeight - scrollTop <= clientHeight + 2 && !form.payout.scrolledToBottomPayout) {
                      update("payout.scrolledToBottomPayout", true);
                    }
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">Quick Summary</h4>
                      <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                        {POLICY_LIBRARY.payout.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    {POLICY_LIBRARY.payout.sections.map((sec) => (
                      <div key={sec.h}>
                        <h4 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1.5">{sec.h}</h4>
                        <ul className="list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                          {sec.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="py-2 text-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black italic">
                        <Check className="h-3 w-3" />
                        End of payout policy. Thank you for reviewing.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Full details available in the modal.</span>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-2 shadow-sm transition-all"
                    onClick={() => {
                      setOpenPolicy("payout");
                    }}
                  >
                    <ExternalLink className="h-4 w-4" /> View Full Policy
                  </button>
                </div>
              </div>

              {/* Verification code delivery method */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Verification code delivery method *</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Choose how you want to receive your verification code.</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {["Email", "SMS", "WhatsApp"].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.payout.verificationDeliveryMethod === method
                        ? "border-[#f77f00] bg-orange-50 dark:bg-orange-900/20"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                    >
                      <input
                        type="radio"
                        name="verificationDeliveryMethod"
                        value={method}
                        checked={form.payout.verificationDeliveryMethod === method}
                        onChange={(e) => update("payout.verificationDeliveryMethod", e.target.value)}
                        className="h-4 w-4 text-[#f77f00] focus:ring-[#f77f00] focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-slate-900 dark:text-white">{method}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300">
                          {method === "Email" && "Receive code via email (usually within 1-2 minutes)"}
                          {method === "SMS" && "Receive code via text message (usually instant)"}
                          {method === "WhatsApp" && "Receive code via WhatsApp (usually instant)"}
                        </div>
                        {form.payout.verificationDeliveryMethod === method && (
                          <div className="mt-2 p-2 rounded-lg bg-orange-100/50 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800/50 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase font-bold text-[8px] tracking-wider">Contact:</span>
                                {editingVerificationContact ? (
                                  <input
                                    type={method === "Email" ? "email" : "tel"}
                                    value={form.payout.verificationContactValue}
                                    onChange={(e) => update("payout.verificationContactValue", e.target.value)}
                                    className="px-2 py-0.5 rounded border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 text-[10px] outline-none focus:ring-1 focus:ring-orange-500 w-full"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                                    {form.payout.verificationContactValue || "Not set"}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="shrink-0 text-[9px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingVerificationContact(!editingVerificationContact);
                                }}
                              >
                                {editingVerificationContact ? "Done" : "Edit / Change"}
                              </button>
                            </div>

                            {method === "WhatsApp" && !form.profile.whatsapp && form.payout.verificationContactValue === form.profile.phone && (
                              <div className="text-[8px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 w-fit font-bold uppercase tracking-tighter">
                                WhatsApp not found · Falling back to phone
                              </div>
                            )}

                            {editingVerificationContact && (
                              <div className="mt-0.5">
                                {method === "Email" && !isEmailLike(form.payout.verificationContactValue) && (
                                  <div className="text-[9px] text-red-500 font-bold italic">Invalid email format.</div>
                                )}
                                {(method === "SMS" || method === "WhatsApp") && !isE164(form.payout.verificationContactValue) && (
                                  <div className="text-[9px] text-red-500 font-bold italic">Use international format (e.g. +256...).</div>
                                )}
                              </div>
                            )}

                            {!editingVerificationContact && (
                              <div className="text-[9px] text-slate-500 dark:text-slate-400">
                                This contact will be used for code delivery.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {!isFilled(form.payout.verificationDeliveryMethod) ? (
                  <p className="text-[10px] text-red-500 mt-2">Please select a delivery method to continue.</p>
                ) : null}

                <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-[10px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: ORANGE }} />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Privacy & delivery:</span> Your contact information is encrypted and never shared with third parties. Codes typically arrive within 1-2 minutes. Standard messaging rates may apply for SMS.
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Payout verification</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Send a verification code to confirm your payout details.</div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    onClick={sendVerification}
                  >
                    Send code
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <Field label="Verification code" hint="Enter the code you receive">
                    <Input value={form.payout.verification.code} onChange={(v) => update("payout.verification.code", v)} placeholder="Code" />
                  </Field>
                  <button type="button" className="px-4 py-2 rounded-full bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800" onClick={verify}>
                    Verify
                  </button>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                    Status: <span className="font-semibold text-slate-900 dark:text-white">{form.payout.verification.status.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              {/* Tax */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Tax residency country (optional)">
                  <Input value={form.payout.tax.residencyCountry} onChange={(v) => update("payout.tax.residencyCountry", v)} placeholder="Uganda" />
                </Field>
                <Field label="Tax ID (optional)">
                  <Input value={form.payout.tax.taxId} onChange={(v) => update("payout.tax.taxId", v)} placeholder="TIN / Tax ID" />
                </Field>
              </div>

              <label className={`flex items-start gap-2 text-[11px] transition-opacity ${!form.payout.scrolledToBottomPayout ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  disabled={!form.payout.scrolledToBottomPayout}
                  checked={form.payout.acceptPayoutPolicy}
                  onChange={(e) => {
                    update("payout.acceptPayoutPolicy", e.target.checked);
                  }}
                />
                <span>I have read and agree to the payout policy and settlement rules.</span>
              </label>
              {!form.payout.scrolledToBottomPayout ? (
                <div className="text-[10px] text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30 flex items-center gap-1.5">
                  <ScrollText className="h-3 w-3" /> Please scroll the rules above to unlock agreement.
                </div>
              ) : !form.payout.acceptPayoutPolicy ? (
                <div className="text-[10px] text-red-500 font-medium">Required to continue.</div>
              ) : null}
            </SectionCard>
          ) : null}

          {stepKey === "preferences" ? (
            <SectionCard
              title="Preferences"
              subtitle="Tell us what you promote and how you like to work. This improves campaign matching."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <HelpCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Match quality</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">More detail equals better suppliers and higher conversion.</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Supplier preference</div>
                    <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-white">{form.preferences.supplierType}</div>
                    <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-300">Suppliers = Sellers + Providers</div>
                  </div>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="flex flex-col gap-1">
                <label className="font-medium text-[11px]">Product/Service lines *</label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_SERVICE_LINES.map((c) => (
                    <Chip key={c} label={c} selected={(form.preferences.lines || []).includes(c)} onClick={() => toggleInArray("preferences.lines", c)} />
                  ))}
                </div>
                <div className="mt-2">
                  <input
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 dark:focus:border-slate-500 outline-none text-slate-900 dark:text-white"
                    placeholder="Add a custom line and press Enter"
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const val = String(e.currentTarget.value || "").trim();
                      if (!val) return;
                      if (!(form.preferences.lines || []).includes(val)) toggleInArray("preferences.lines", val);
                      e.currentTarget.value = "";
                      push("Added custom line.", "success");
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[11px]">Collaboration models</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLLAB_MODELS.map((m) => (
                      <Chip
                        key={m}
                        label={m}
                        selected={(form.preferences.models || []).includes(m)}
                        onClick={() => toggleInArray("preferences.models", m)}
                        color="green"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-[11px]">Content formats *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTENT_FORMATS.map((f) => (
                      <Chip key={f} label={f} selected={(form.preferences.formats || []).includes(f)} onClick={() => toggleInArray("preferences.formats", f)} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Supplier type">
                  <Select value={form.preferences.supplierType} onChange={(v) => update("preferences.supplierType", v)} options={["Both", "Sellers", "Providers"]} />
                </Field>
                <Field label="Invite rules" hint="Control who can invite you.">
                  <Select
                    value={form.preferences.inviteRules}
                    onChange={(v) => update("preferences.inviteRules", v)}
                    options={["All suppliers (Sellers + Providers)", "Only suppliers I follow", "Only verified suppliers", "No inbound invites"]}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <Field label="Availability days" hint="Helps scheduling.">
                  <div className="flex flex-wrap gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <Chip key={d} label={d} selected={(form.preferences.availability.days || []).includes(d)} onClick={() => toggleInArray("preferences.availability.days", d)} color="green" />
                    ))}
                  </div>
                </Field>
                <Field label="Time window" hint="Example: 18:00 - 22:00">
                  <Input value={form.preferences.availability.timeWindow} onChange={(v) => update("preferences.availability.timeWindow", v)} placeholder="18:00 - 22:00" />
                </Field>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Rate card (optional, recommended)</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Set guidance for suppliers. You can negotiate per deal.</div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                    <FileText className="h-4 w-4" /> Premium
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Field label="Min flat fee">
                    <Input value={form.preferences.rateCard.minFlatFee} onChange={(v) => update("preferences.rateCard.minFlatFee", v)} placeholder="e.g. 250" />
                  </Field>
                  <Field label="Preferred commission %">
                    <Input value={form.preferences.rateCard.preferredCommissionPct} onChange={(v) => update("preferences.rateCard.preferredCommissionPct", v)} placeholder="e.g. 10" />
                  </Field>
                  <Field label="Notes">
                    <Input value={form.preferences.rateCard.notes} onChange={(v) => update("preferences.rateCard.notes", v)} placeholder="Delivery time, add-ons" />
                  </Field>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {stepKey === "review" ? (
            <SectionCard
              title="Review and submit"
              subtitle="Confirm your details, review policies, then finish onboarding."
              right={
                <div className="text-[11px] flex flex-col gap-3">
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Creator checklist</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">Complete these for premium campaigns.</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <ReviewRow title="Profile complete" status={StepValidity("profile", form) ? "ok" : "miss"} onEdit={() => setStepIndex(0)} />
                    <ReviewRow
                      title="Primary platform set"
                      status={(() => {
                        if (form.socials.primaryPlatform !== "Other") return "ok";
                        return isFilled(form.socials.primaryOtherPlatform) && isFilled(form.socials.primaryOtherHandle) ? "ok" : "miss";
                      })()}
                      onEdit={() => setStepIndex(1)}
                    />
                    <ReviewRow title="KYC uploaded" status={StepValidity("kyc", form) ? "ok" : "miss"} onEdit={() => setStepIndex(2)} />
                    <ReviewRow title="Payout setup" status={StepValidity("payout", form) ? "ok" : "miss"} onEdit={() => setStepIndex(3)} />
                    <ReviewRow title="Preferences" status={StepValidity("preferences", form) ? "ok" : "warn"} onEdit={() => setStepIndex(4)} />
                  </div>

                  <TrustMeter score={trustScore} unlocks={trustUnlocks} />
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <SummaryCard title="Profile" icon={<User className="h-4 w-4" />}>
                  <div className="text-[12px] font-semibold">{form.profile.name || "(name missing)"}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{form.profile.handle || "(handle missing)"}</div>
                  <div className="text-[10px] text-slate-600 mt-2">{form.profile.tagline || ""}</div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    {creatorType !== "Individual"
                      ? `${creatorType}: ${creatorType === "Team" ? form.profile.team.name : form.profile.agency.name}`
                      : "Individual"}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    {form.profile.country || ""} · {form.profile.timezone} · {form.profile.currency}
                  </div>
                </SummaryCard>

                <SummaryCard title="Socials" icon={<LinkIcon className="h-4 w-4" />}>
                  {/* NEW: Primary social account is clearly displayed */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">Primary social</div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">
                      {primarySocial.platform || "—"}{" "}
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 font-normal">
                        {isFilled(primarySocial.handle) ? primarySocial.handle : "(not connected)"}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                    <li>Instagram: {form.socials.instagram || "not connected"}</li>
                    <li>TikTok: {form.socials.tiktok || "not connected"}</li>
                    <li>YouTube: {form.socials.youtube || "not connected"}</li>
                    <li>Extra accounts: {(form.socials.extra || []).length}</li>
                  </ul>
                </SummaryCard>

                <SummaryCard title="KYC" icon={<IdCard className="h-4 w-4" />}>
                  <div className="text-[10px] text-slate-600">Document: {form.kyc.documentType}</div>
                  <div className="text-[10px] text-slate-600">ID: {form.kyc.idUploaded ? "Uploaded" : "Missing"}</div>
                  <div className="text-[10px] text-slate-600">Selfie: {form.kyc.selfieUploaded ? "Uploaded" : "Missing"}</div>
                  {creatorType !== "Individual" ? (
                    <div className="text-[10px] text-slate-600 mt-1">
                      Org docs:{" "}
                      {[form.kyc.org.registrationUploaded, form.kyc.org.taxUploaded, form.kyc.org.authorizationUploaded].filter(Boolean).length} uploaded
                    </div>
                  ) : null}
                </SummaryCard>

                <SummaryCard title="Payout" icon={<CreditCard className="h-4 w-4" />}>
                  <div className="text-[10px] text-slate-600">Method: {form.payout.method || "(not selected)"}</div>
                  <div className="text-[10px] text-slate-600">Currency: {form.payout.currency}</div>
                  <div className="text-[10px] text-slate-600">Schedule: {form.payout.schedule}</div>
                  <div className="text-[10px] text-slate-600">Threshold: {form.payout.minThreshold}</div>
                  <div className="text-[10px] text-slate-600">Verification: {form.payout.verification.status.replace("_", " ")}</div>
                </SummaryCard>
              </div>

              {/* Policies & Terms */}
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Policies & Terms</div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300">
                      Review the policies below. You can expand each section, or scroll the full document to the end to unlock consent.
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300">
                    <ScrollText className="h-4 w-4" /> Required
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  <PolicyDisclosure
                    policyKey="platform"
                    title={POLICY_LIBRARY.platform.title}
                    subtitle={POLICY_LIBRARY.platform.subtitle}
                    bullets={POLICY_LIBRARY.platform.bullets}
                    seen={scrolledToBottom}
                    onSeen={() => { }}
                    onOpenFull={() => {
                      setOpenPolicy("platform");
                    }}
                  />
                  <PolicyDisclosure
                    policyKey="content"
                    title={POLICY_LIBRARY.content.title}
                    subtitle={POLICY_LIBRARY.content.subtitle}
                    bullets={POLICY_LIBRARY.content.bullets}
                    seen={scrolledToBottom}
                    onSeen={() => { }}
                    onOpenFull={() => {
                      setOpenPolicy("content");
                    }}
                  />
                  <PolicyDisclosure
                    policyKey="payout"
                    title={POLICY_LIBRARY.payout.title}
                    subtitle={POLICY_LIBRARY.payout.subtitle}
                    bullets={POLICY_LIBRARY.payout.bullets}
                    seen={scrolledToBottom}
                    onSeen={() => { }}
                    onOpenFull={() => {
                      setOpenPolicy("payout");
                    }}
                  />
                </div>

                {/* NEW: Scroll-to-bottom acknowledgement (alternative consent gate) */}
                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Full policy document</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300">
                        Scroll to the bottom to confirm you’ve reviewed the document (a common compliance requirement on some platforms).
                      </div>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] ${scrolledToBottom ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400"
                        }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${scrolledToBottom ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {scrolledToBottom ? "Scroll confirmed" : `${termsScrollPct}%`}
                    </span>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${scrolledToBottom ? 100 : termsScrollPct}%`,
                        background: scrolledToBottom ? GREEN : ORANGE
                      }}
                    />
                  </div>

                  <div
                    ref={termsScrollRef}
                    onScroll={handleTermsScroll}
                    className="mt-3 max-h-64 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                  >
                    {(["platform", "content", "payout"] as const).map((k, idx) => {
                      const p = POLICY_LIBRARY[k];
                      return (
                        <div
                          key={k}
                          className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 ${idx !== 2 ? "mb-3" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{p.title}</div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-300">{p.subtitle}</div>
                            </div>
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-2"
                              onClick={() => {
                                setOpenPolicy(k as "platform" | "content" | "payout");
                              }}
                            >
                              <ExternalLink className="h-4 w-4" /> Full
                            </button>
                          </div>

                          <ul className="mt-2 list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                            {p.bullets.map((b) => (
                              <li key={b}>{b}</li>
                            ))}
                          </ul>

                          <div className="mt-3 space-y-2">
                            {p.sections.map((sec) => (
                              <div key={sec.h} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2">
                                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{sec.h}</div>
                                <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
                                  {sec.items.map((it) => (
                                    <li key={it}>{it}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-center text-[10px] text-slate-600 dark:text-slate-300">
                      End of document
                    </div>
                  </div>

                  {!scrolledToBottom ? (
                    <div className="mt-2 text-[10px] text-amber-700">Scroll to the end to unlock consent.</div>
                  ) : (
                    <div className="mt-2 text-[10px] text-emerald-700">Scroll confirmed. Consent unlocked.</div>
                  )}
                </div>

                {!allPoliciesSeen ? (
                  <div className="mt-2 text-[10px] text-amber-700">
                    Review required: expand the sections above or scroll the full document to unlock final consent.
                  </div>
                ) : null}
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 p-3">
                <div className="text-[12px] font-semibold">Final consent</div>

                {creatorType !== "Individual" ? (
                  <label className="mt-2 flex items-start gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={form.review.confirmMultiUserCompliance}
                      onChange={(e) => update("review.confirmMultiUserCompliance", e.target.checked)}
                    />
                    <span>
                      I confirm all team members / creators under this {creatorType.toLowerCase()} account have read and agreed to these policies and terms.
                    </span>
                  </label>
                ) : null}

                <label className={`mt-2 flex items-start gap-2 text-[11px] ${!allPoliciesSeen ? "opacity-60" : ""}`}>
                  <input
                    type="checkbox"
                    disabled={!allPoliciesSeen}
                    checked={form.review.acceptTerms}
                    onChange={(e) => update("review.acceptTerms", e.target.checked)}
                  />
                  <span>
                    I agree to the platform policies, content rules, and payout terms. I understand suppliers include Sellers and Providers.
                  </span>
                </label>

                {!allPoliciesSeen ? (
                  <div className="mt-2 text-[10px] text-slate-600">Review the policies above (expand or scroll) to enable consent.</div>
                ) : null}

                {creatorType !== "Individual" && !form.review.confirmMultiUserCompliance ? (
                  <div className="mt-2 text-[10px] text-red-500">Team/Agency confirmation is required.</div>
                ) : null}

                {allPoliciesSeen && !form.review.acceptTerms ? (
                  <div className="mt-2 text-[10px] text-red-500">You must accept to finish onboarding.</div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 inline-flex items-center justify-center gap-2"
                  onClick={() => push("Public profile preview opened.", "success")}
                >
                  <User className="h-4 w-4" /> Preview profile
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-white border border-slate-200 text-[12px] font-semibold hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center gap-2"
                  onClick={() => push("Creator Success contacted.", "success")}
                >
                  <HelpCircle className="h-4 w-4" /> Contact Creator Success
                </button>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </main>

      <StickyFooter stepIndex={stepIndex} canContinue={canContinue} isLast={isLast} onBack={goBack} onSaveExit={saveExit} onNext={goNext} />
    </div>
  );
}

function TrustMeter({ score, unlocks }: TrustMeterProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-900 dark:text-white">Trust meter</div>
        <span className="text-[12px] font-semibold" style={{ color: ORANGE }}>
          {score}%
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden">
        <div className="h-full" style={{ width: `${score}%`, background: score >= 80 ? GREEN : ORANGE }} />
      </div>
      <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-300">Unlocks based on completion:</div>
      <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5">
        {unlocks.length > 0 ? unlocks.map((u) => <li key={u}>{u}</li>) : <li>Complete more steps to unlock premium features.</li>}
      </ul>
    </div>
  );
}

function SocialConnect({ label, value, placeholder, onChange, onConnect }: SocialConnectProps) {
  return (
    <Field label={label} hint="Optional">
      <div className="flex items-center gap-2">
        <button type="button" className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300" onClick={onConnect}>
          Connect
        </button>
        <input
          className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-slate-400 dark:focus:border-slate-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 dark:text-slate-300"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function UploadMini({ title, value, onPick, helper, accept }: UploadMiniProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{title}</div>
          <div className="text-[10px] text-slate-600 dark:text-slate-300">{helper}</div>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 inline-flex items-center gap-2"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept || "image/*,application/pdf"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            onPick(f.name);
          }}
        />
      </div>
      <div className="mt-2 text-[10px] text-slate-600 dark:text-slate-400">
        {value ? (
          <span>
            Selected: <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
          </span>
        ) : (
          <span>No file selected</span>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-[#fff4e5] border border-[#ffd19a] dark:bg-orange-900/20 dark:border-orange-800/50 flex items-center justify-center" style={{ color: ORANGE }}>
          {icon}
        </div>
        <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{title}</div>
      </div>
      <div className="mt-2 text-slate-600 dark:text-slate-400">{children}</div>
    </div>
  );
}
