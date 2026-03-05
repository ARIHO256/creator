import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HelpCircle,
  IdCard,
  Info,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X
} from "lucide-react";
import { useCreateUploadMutation } from "../../hooks/api/useCreatorWorkflow";
import {
  useRemoveSettingsDeviceMutation,
  useSendPayoutVerificationCodeMutation,
  useSettingsQuery,
  useSignOutAllSettingsDevicesMutation,
  useUpdateSettingsMutation,
  useVerifyPayoutSettingsMutation
} from "../../hooks/api/useSettings";
import type { CreatorSettings } from "../../api/types";

/**
 * Creator Settings & Safety (Premium)
 * - Now backed by the dedicated Creator Settings domain and settings APIs.
 * - Uses Orange as the primary color to match Roles & Permissions.
 * - Adds a compliance-friendly "scroll-to-bottom to enable consent" pattern for policy review inside Settings.
 *
 * NOTE: Replace policy/legal placeholder copy before production.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";
// const LIGHT_GREY = "#f2f2f2"; // Kept for reference but often overridden by dark mode classes
function cx(...xs: (string | undefined | null | false)[]) {
  return xs.filter(Boolean).join(" ");
}

function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(base: any, patch: any): any {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(base) && Array.isArray(patch)) return patch;
  if (typeof base === "object" && base && typeof patch === "object" && patch && !Array.isArray(patch)) {
    const out = { ...base };
    Object.keys(patch).forEach((k) => {
      out[k] = deepMerge(base[k], patch[k]);
    });
    return out;
  }
  return patch;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setDeep(obj: any, path: string, value: any): any {
  if (!path) return value;
  const parts = path.split(".");
  const head = parts[0];
  const tail = parts.slice(1).join(".");
  if (!tail) return { ...obj, [head]: value };
  return { ...obj, [head]: setDeep(obj[head] || {}, tail, value) };
}

function nowLabel() {
  const d = new Date();
  return d.toLocaleString();
}

/* ---------- Interfaces ---------- */

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warn" | "info";
}

interface Profile {
  name: string;
  handle: string;
  tagline: string;
  country: string;
  timezone: string;
  currency: string;
  bio: string;
  email: string;
  phone: string;
  whatsapp: string;
  contentLanguages: string[];
  audienceRegions: string[];
  profilePhotoName?: string;
  mediaKitName?: string;
  creatorType: "Individual" | "Team" | "Agency";
  team: {
    name: string;
    type: string;
    size: string;
    website: string;
    logoName?: string;
  };
  agency: {
    name: string;
    type: string;
    website: string;
    logoName?: string;
  };
}

interface ExtraSocial {
  platform: string;
  handle: string;
}

interface Socials {
  primaryPlatform: string;
  primaryOtherPlatform: string;
  primaryOtherCustomName: string;
  primaryOtherHandle: string;
  primaryOtherFollowers: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  extra: ExtraSocial[];
}

interface RateCard {
  flatFee: string | number;
  commissionPct: string | number;
}

interface Availability {
  days: string[];
  timeWindow: string;
}

interface Preferences {
  lines: string[];
  models: string[];
  formats: string[];
  rateCard: RateCard;
  inviteRules: string;
  supplierType: string;
  availability: Availability;
}

interface KycOrg {
  registrationName?: string;
  registrationUploaded: boolean;
  taxName?: string;
  taxUploaded: boolean;
  authorizationName?: string;
  authorizationUploaded: boolean;
}

interface Kyc {
  status: "unverified" | "in_review" | "verified" | "rejected";
  documentType: string;
  idFileName?: string;
  idUploaded: boolean;
  selfieFileName?: string;
  selfieUploaded: boolean;
  addressFileName?: string;
  addressUploaded: boolean;
  org: KycOrg;
}

interface PayoutBank {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swift: string;
}

interface PayoutMobile {
  provider: string;
  number: string;
}

interface PayoutWallet {
  provider: string;
  email: string;
}

interface PayoutAlipay {
  name: string;
  accountId: string;
}

interface PayoutWechat {
  name: string;
  accountId: string;
  phone: string;
}

interface PayoutVerification {
  status: "unverified" | "code_sent" | "verified";
  lastSentTo?: string;
}

interface PayoutTax {
  residency: string;
  taxId: string;
}

interface Payout {
  method: string;
  currency: string;
  schedule: string;
  minThreshold: string | number;
  bank: PayoutBank;
  mobile: PayoutMobile;
  wallet: PayoutWallet;
  alipay: PayoutAlipay;
  wechat: PayoutWechat;
  verification: PayoutVerification;
  tax: PayoutTax;
  acceptPayoutPolicy: boolean;
}

interface Device {
  id: string;
  name: string;
  lastActive: string;
}

interface AuditLog {
  id: string;
  what: string;
  when: string;
  meta?: string;
}

interface Notifs {
  proposals: boolean;
  liveReminders: boolean;
  payouts: boolean;
  securityAlerts: boolean;
  calendarUpdates: boolean;
  platformNews: boolean;
}

interface Settings {
  calendar: {
    shareAvailability: boolean;
    visibility: string;
    googleConnected: boolean;
  };
  notifications: Notifs;
  privacy: {
    profileVisibility: string;
    allowDMsFrom: string;
    allowExternalGuests: boolean;
    blockedSellers: string[];
  };
  devices: Device[];
  audit: AuditLog[];
}

interface SeenPolicies {
  platform: boolean;
  content: boolean;
  payout: boolean;
  [key: string]: boolean;
}

interface Review {
  acceptTerms: boolean;
  acceptedAt?: string;
  confirmMultiUserCompliance: boolean;
  seenPolicies: SeenPolicies;
  scrolledToBottom: boolean;
}

interface SettingsForm {
  profile: Profile;
  socials: Socials;
  preferences: Preferences;
  kyc: Kyc;
  payout: Payout;
  settings: Settings;
  review: Review;
}

type LegacyOnboardingCompat = SettingsForm & {
  kyc?: {
    org?: {
      registrationFileName?: string;
      taxFileName?: string;
      authorizationFileName?: string;
    };
  };
  payout?: {
    mobile?: { phone?: string };
    alipay?: { account?: string };
    wechat?: { wechatId?: string };
    verificationContactValue?: string;
  };
};

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warn" | "info";
}

interface ToastStackProps {
  toasts: Toast[];
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (message: string, type: Toast["type"] = "info") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "pointer-events-auto min-w-[300px] rounded-2xl border p-4 shadow-xl transition-all animate-in slide-in-from-right-10 fade-in duration-300",
            t.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200"
              : t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200"
                : t.type === "warn"
                  ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200"
                  : "bg-white border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          )}
        >
          <div className="flex items-start gap-3">
            {t.type === "success" ? (
              <Check className="h-5 w-5 shrink-0" />
            ) : t.type === "error" ? (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            ) : t.type === "warn" ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <Info className="h-5 w-5 shrink-0" />
            )}
            <div className="text-sm font-medium leading-relaxed">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

function Modal({ open, title, subtitle, onClose, footer, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-4 md:p-5">
          <div className="px-6 pb-4 flex flex-col items-center text-center">
            <h2 className="text-xl font-bold dark:text-white">{title}</h2>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-5 overflow-auto custom-scrollbar text-slate-900 dark:text-slate-200">{children}</div>
        {footer && <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-4 md:p-5">{footer}</div>}
      </div>
    </div>
  );
}

interface BadgeProps {
  tone?: "good" | "warn" | "neutral" | "bad";
  children: React.ReactNode;
}

function Badge({ tone = "neutral", children }: BadgeProps) {
  const styles =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
        : tone === "bad"
          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800"
          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles)}>{children}</span>;
}

interface CardProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}

function Card({ id, title, subtitle, icon, right, children }: CardProps) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-500 dark:text-slate-400">{icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="self-start">{right}</div>}
      </div>
      {children}
    </section>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}

function PrimaryButton({ className, style, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "px-4 py-2 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-2",
        "hover:brightness-95 active:brightness-90 transition-all",
        className
      )}
      style={{ background: ORANGE, ...(style || {}) }}
      {...props}
    />
  );
}

function SoftButton({ className, style, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "px-4 py-2 rounded-2xl text-sm inline-flex items-center gap-2 border transition-all",
        "hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700",
        className
      )}
      style={{ borderColor: ORANGE, color: ORANGE, ...(style || {}) }}
      {...props}
    />
  );
}

function GhostButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        "px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm hover:bg-slate-50 inline-flex items-center gap-2 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cx(
        "w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 text-sm dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800/50 transition-all",
        className
      )}
      {...props}
    />
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cx(
        "w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 text-sm dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800/50 transition-all resize-none",
        className
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cx(
        "w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 text-sm dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800/50 transition-all appearance-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, hint, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className={cx("flex items-start justify-between gap-3 rounded-2xl border p-3 transition-colors", disabled ? "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-700")}>
      <div className="min-w-0">
        <div className={cx("text-sm font-semibold", disabled ? "text-slate-500" : "text-slate-900 dark:text-slate-200")}>{label}</div>
        {hint ? <div className="text-xs mt-0.5">{hint}</div> : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cx(
          "h-8 w-14 rounded-full border relative transition-all flex-shrink-0",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          checked ? "border-transparent bg-[#f77f00]" : "bg-slate-200 border-transparent dark:bg-slate-700"
        )}
        aria-label="toggle"
      >
        <span className={cx("absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all", checked ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}

interface ChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function Chip({ active, label, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
        active ? "text-white border-transparent shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
      style={active ? { background: ORANGE } : undefined}
    >
      {label}
    </button>
  );
}

interface UploadMiniProps {
  title: string;
  helper?: string;
  value?: string;
  onPick: (file: File) => void | Promise<void>;
  accept?: string;
}

function UploadMini({ title, helper, value, onPick, accept = "*/*" }: UploadMiniProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-amber-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          {helper ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helper}</div> : null}
          <div className="mt-2 text-xs text-slate-700 truncate font-medium flex items-center gap-1.5">
            {value ? <Check className="h-3 w-3 text-emerald-500" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
            {value || "No file selected"}
          </div>
        </div>
        <label className="shrink-0 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
          <Upload className="h-3.5 w-3.5" /> Choose
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) void onPick(file);
              // reset so the same file can be picked again
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------- Options (mirrors Onboarding v2.5) ---------- */

const LANGUAGE_OPTIONS = ["English", "Swahili", "French", "Arabic", "Chinese", "Portuguese"];
const REGION_OPTIONS = ["East Africa", "Southern Africa", "West Africa", "North Africa", "Asia", "Europe", "North America"];

const TEAM_TYPES = ["Seller team", "Provider team", "Production crew", "Brand team", "Other"];
const AGENCY_TYPES = ["Talent / influencer agency", "Marketing agency", "Seller network", "Provider network", "Other"];
const ORG_SIZES = ["1–5", "6–15", "16–50", "51–200", "200+"];

const OTHER_SOCIAL_OPTIONS = ["Facebook", "X (Twitter)", "Snapchat", "Kwai", "LinkedIn", "Twitch", "Pinterest", "Other"];

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

const CONTENT_FORMATS = ["Live Sessionz", "Shoppable Adz", "Short-form (Reels/Shorts)", "Long-form (YouTube)", "UGC (brand content)", "Livestream co-hosting"];

const PAYOUT_METHODS = [
  { key: "Bank", title: "Bank", desc: "Best for high volume and stable settlements." },
  { key: "Mobile Money", title: "Mobile Money", desc: "Fast and popular across Africa." },
  { key: "PayPal / Wallet", title: "PayPal / Wallet", desc: "Use existing wallets in supported regions." },
  { key: "AliPay", title: "AliPay", desc: "China payment method for creators and cross-border payments." },
  { key: "WeChat Pay", title: "WeChat Pay", desc: "China payment method for creators and cross-border payments." }
];

interface PolicySection {
  h: string;
  items: string[];
}

interface Policy {
  title: string;
  subtitle: string;
  bullets: string[];
  sections: PolicySection[];
}

// Policies (summaries visible on-page; full text shown in a modal)
const POLICY_LIBRARY: Record<string, Policy> = {
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
        items: ["No counterfeit, restricted, or illegal items.", "No fraud, impersonation, or misleading identity.", "Respectful behaviour is required (no harassment or hate)."]
      },
      {
        h: "Marketplace fairness",
        items: ["Use clear pricing and avoid bait‑and‑switch offers.", "Disclose sponsored or paid partnerships where required.", "Follow supplier rules for brand assets, claims, and product usage."]
      },
      {
        h: "Enforcement",
        items: ["Violations can result in content removal, payout holds, or account actions.", "Repeated violations may lead to suspension.", "Appeals can be requested via Creator Success."]
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
        items: ["No nudity, sexual content, hate speech, or harassment.", "No encouragement of dangerous behaviour.", "Moderation tools may be used to keep sessionz safe."]
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

function defaultSettings(): Settings {
  return {
    calendar: {
      shareAvailability: true,
      visibility: "Admins only",
      googleConnected: false
    },
    notifications: {
      proposals: true,
      liveReminders: true,
      payouts: true,
      securityAlerts: true,
      calendarUpdates: true,
      platformNews: false
    },
    privacy: {
      profileVisibility: "Public",
      allowDMsFrom: "All suppliers",
      allowExternalGuests: true,
      blockedSellers: ["Fake Dealz Ltd"]
    },
    devices: [
      { id: "d1", name: "iPhone 14 • Kampala", lastActive: "2m ago" },
      { id: "d2", name: "Chrome • MacBook Pro", lastActive: "Yesterday" }
    ],
    audit: [
      { id: "s1", when: nowLabel(), what: "Settings initialized", meta: "Premium Settings & Safety" }
    ]
  };
}

// Mirrors Onboarding v2.5 defaultForm (and extends it with settings)
function defaultForm(): SettingsForm {
  return {
    profile: {
      name: "",
      handle: "",
      creatorType: "Individual", // Individual | Team | Agency
      tagline: "",
      bio: "",
      email: "",
      phone: "",
      whatsapp: "",
      country: "",
      timezone: "Africa/Kampala",
      currency: "UGX",
      contentLanguages: ["English"],
      audienceRegions: ["East Africa"],
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
      primaryPlatform: "",
      primaryOtherPlatform: "Facebook",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: [] // [{ platform, handle }]
    },
    kyc: {
      status: "unverified", // unverified | in_review | verified | rejected
      documentType: "National ID",
      idFileName: "",
      selfieFileName: "",
      addressFileName: "",
      idUploaded: false,
      selfieUploaded: false,
      addressUploaded: false,
      org: {
        registrationName: "",
        taxName: "",
        authorizationName: "",
        registrationUploaded: false,
        taxUploaded: false,
        authorizationUploaded: false
      }
    },
    payout: {
      method: "",
      currency: "UGX",
      schedule: "Weekly",
      minThreshold: 100000,
      acceptPayoutPolicy: false,
      verification: {
        status: "unverified", // unverified | code_sent | verified
        lastSentTo: ""
      },
      bank: { bankName: "", accountName: "", accountNumber: "", swift: "" },
      mobile: { provider: "MTN", number: "" },
      wallet: { provider: "PayPal", email: "" },
      alipay: { name: "", accountId: "" },
      wechat: { name: "", accountId: "", phone: "" },
      tax: { residency: "", taxId: "" }
    },
    preferences: {
      lines: ["Electronics"],
      formats: ["Live Sessionz"],
      models: ["Commission"],
      availability: {
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        timeWindow: "18:00–22:00"
      },
      rateCard: { flatFee: 0, commissionPct: 10 },
      inviteRules: "All",
      supplierType: "Sellers + Providers"
    },
    review: {
      seenPolicies: { platform: false, content: false, payout: false },
      scrolledToBottom: false,
      confirmMultiUserCompliance: false,
      acceptTerms: false,
      acceptedAt: ""
    },
    settings: defaultSettings()
  };
}

function isFilled(v: unknown): boolean {
  return String(v || "").trim().length > 0;
}

function clampNumber(n: number | string, min: number, max: number): number {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function normalizePrimaryPlatform(value: string): "instagram" | "tiktok" | "youtube" | "other" {
  const v = String(value || "").trim().toLowerCase();
  if (v === "instagram" || v === "ig") return "instagram";
  if (v === "tiktok" || v === "tik tok") return "tiktok";
  if (v === "youtube" || v === "yt") return "youtube";
  if (v === "other") return "other";
  return "other";
}

function normalizeFormFromOnboarding(input: SettingsForm): SettingsForm {
  const next = deepClone(input);
  // Some legacy onboarding payloads store primaryPlatform at the root level.
  // We prioritize the modern nested path but fall back to root for backwards compatibility.
  const rawPlatformFromNested = String(next.socials.primaryPlatform || "").trim();
  const rawPlatformFromRoot = String((input as { primaryPlatform?: unknown }).primaryPlatform || "").trim();

  const rawPrimaryPlatform = rawPlatformFromNested || rawPlatformFromRoot;
  const normalizedPrimary = normalizePrimaryPlatform(rawPrimaryPlatform);
  next.socials.primaryPlatform = normalizedPrimary;

  // Sync missing / renamed fields from onboarding payload
  const rawInput = input as LegacyOnboardingCompat;

  // KYC org filenames
  if (rawInput.kyc?.org?.registrationFileName) next.kyc.org.registrationName = rawInput.kyc.org.registrationFileName;
  if (rawInput.kyc?.org?.taxFileName) next.kyc.org.taxName = rawInput.kyc.org.taxFileName;
  if (rawInput.kyc?.org?.authorizationFileName) next.kyc.org.authorizationName = rawInput.kyc.org.authorizationFileName;

  // Payout renamed fields
  if (rawInput.payout?.mobile?.phone) next.payout.mobile.number = rawInput.payout.mobile.phone;
  if (rawInput.payout?.alipay?.account) next.payout.alipay.accountId = rawInput.payout.alipay.account;
  if (rawInput.payout?.wechat?.wechatId) next.payout.wechat.accountId = rawInput.payout.wechat.wechatId;
  if (rawInput.payout?.verificationContactValue) next.payout.verification.lastSentTo = rawInput.payout.verificationContactValue;

  // Preferences (Days / Time Window might need conversion if structures differ, but they match)

  // If a non-standard platform was selected in onboarding (e.g., Facebook),
  // preserve it as the "Other" custom platform so the overview can render it.
  if (
    normalizedPrimary === "other" &&
    rawPrimaryPlatform &&
    rawPrimaryPlatform.toLowerCase() !== "other" &&
    !String(next.socials.primaryOtherPlatform || "").trim() &&
    !String(next.socials.primaryOtherCustomName || "").trim()
  ) {
    next.socials.primaryOtherPlatform = "Other";
    next.socials.primaryOtherCustomName = rawPrimaryPlatform;
  }

  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeFormFromSettingsRecord(input: CreatorSettings): SettingsForm {
  const raw = isRecord(input) ? input : {};
  const merged = deepMerge(defaultForm(), raw);
  const normalized = normalizeFormFromOnboarding(merged as SettingsForm);

  const rootNotifications = isRecord(raw.notifications) ? raw.notifications : {};
  const nestedSettings = isRecord(raw.settings) ? raw.settings : {};
  const nestedNotifications = isRecord(nestedSettings.notifications) ? nestedSettings.notifications : {};
  const nestedCalendar = isRecord(nestedSettings.calendar) ? nestedSettings.calendar : {};
  const nestedPrivacy = isRecord(nestedSettings.privacy) ? nestedSettings.privacy : {};
  const rootSecurity = isRecord(raw.security) ? raw.security : {};
  const rootDevices = Array.isArray(rootSecurity.devices) ? (rootSecurity.devices as Device[]) : [];
  const nestedDevices = Array.isArray(nestedSettings.devices) ? (nestedSettings.devices as Device[]) : [];
  const nestedAudit = Array.isArray(nestedSettings.audit) ? (nestedSettings.audit as AuditLog[]) : [];

  normalized.settings = {
    ...defaultSettings(),
    ...normalized.settings,
    calendar: {
      ...defaultSettings().calendar,
      ...normalized.settings.calendar,
      ...nestedCalendar
    },
    notifications: {
      ...defaultSettings().notifications,
      ...normalized.settings.notifications,
      ...nestedNotifications,
      ...rootNotifications
    },
    privacy: {
      ...defaultSettings().privacy,
      ...normalized.settings.privacy,
      ...nestedPrivacy
    },
    devices: nestedDevices.length > 0 ? nestedDevices : rootDevices.length > 0 ? rootDevices : normalized.settings.devices,
    audit: nestedAudit.length > 0 ? nestedAudit : normalized.settings.audit
  };

  return normalized;
}

function buildSettingsPayload(form: SettingsForm): Partial<CreatorSettings> {
  const updatedAt = new Date().toISOString();
  const audit = Array.isArray(form.settings.audit) ? form.settings.audit.slice(0, 50) : [];

  return {
    profile: form.profile as unknown as Record<string, unknown>,
    socials: form.socials as unknown as Record<string, unknown>,
    preferences: form.preferences as unknown as Record<string, unknown>,
    kyc: form.kyc as unknown as Record<string, unknown>,
    payout: form.payout as unknown as Record<string, unknown>,
    review: form.review as unknown as Record<string, unknown>,
    notifications: form.settings.notifications as unknown as Record<string, unknown>,
    security: {
      devices: form.settings.devices,
      updatedAt
    },
    settings: {
      calendar: form.settings.calendar,
      notifications: form.settings.notifications,
      privacy: form.settings.privacy,
      devices: form.settings.devices,
      audit,
      updatedAt
    },
    updatedAt
  };
}

function getPrimaryPlatformName(form: SettingsForm): string {
  const sp = normalizePrimaryPlatform(form.socials.primaryPlatform);
  if (sp === "instagram") return "Instagram";
  if (sp === "tiktok") return "TikTok";
  if (sp === "youtube") return "YouTube";
  if (form.socials.primaryOtherPlatform === "Other") return String(form.socials.primaryOtherCustomName || "").trim();
  return String(form.socials.primaryOtherPlatform || "").trim();
}

interface SelectedSocialPlatform {
  name: string;
  handle: string;
}

function getSelectedSocialPlatforms(socials: Socials): SelectedSocialPlatform[] {
  const map = new Map<string, SelectedSocialPlatform>();
  const upsert = (name: string, handle?: string, force = false) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const cleanHandle = String(handle || "").trim();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { name: cleanName, handle: cleanHandle });
      return;
    }
    if (!prev.handle && cleanHandle) {
      map.set(key, { ...prev, handle: cleanHandle });
      return;
    }
    if (force && !prev.handle && !cleanHandle) {
      map.set(key, { ...prev });
    }
  };

  const primary = normalizePrimaryPlatform(socials.primaryPlatform);
  if (primary === "instagram") upsert("Instagram", socials.instagram, true);
  if (primary === "tiktok") upsert("TikTok", socials.tiktok, true);
  if (primary === "youtube") upsert("YouTube", socials.youtube, true);
  if (primary === "other") {
    const otherName =
      socials.primaryOtherPlatform === "Other"
        ? String(socials.primaryOtherCustomName || "").trim()
        : String(socials.primaryOtherPlatform || "").trim();
    upsert(otherName, socials.primaryOtherHandle, true);
  }

  if (String(socials.instagram || "").trim()) upsert("Instagram", socials.instagram);
  if (String(socials.tiktok || "").trim()) upsert("TikTok", socials.tiktok);
  if (String(socials.youtube || "").trim()) upsert("YouTube", socials.youtube);

  (socials.extra || []).forEach((row) => {
    const name = String(row.platform || "").trim();
    if (!name) return;
    upsert(name, row.handle, true);
  });

  return Array.from(map.values());
}

function kycTone(status: string): "good" | "warn" | "bad" | "neutral" {
  if (status === "verified") return "good";
  if (status === "in_review") return "warn";
  if (status === "rejected") return "bad";
  return "neutral";
}

function payoutTone(status: string): "good" | "warn" | "neutral" {
  if (status === "verified") return "good";
  if (status === "code_sent") return "warn";
  return "neutral";
}

function policyAllSeen(form: SettingsForm): boolean {
  const payoutPolicySeen = !!form.payout.acceptPayoutPolicy || !!form.review.seenPolicies.payout;
  const openAll = !!form.review.seenPolicies.platform && !!form.review.seenPolicies.content && payoutPolicySeen;
  return !!form.review.scrolledToBottom || openAll;
}



export default function CreatorSettingsSafetyPremium() {
  const navigate = useNavigate();
  const { toasts, push } = useToasts();
  const settingsQuery = useSettingsQuery();
  const updateSettingsMutation = useUpdateSettingsMutation();
  const createUploadMutation = useCreateUploadMutation();
  const sendPayoutVerificationMutation = useSendPayoutVerificationCodeMutation();
  const verifyPayoutMutation = useVerifyPayoutSettingsMutation();
  const removeSettingsDeviceMutation = useRemoveSettingsDeviceMutation();
  const signOutAllDevicesMutation = useSignOutAllSettingsDevicesMutation();
  const hydratedRef = useRef(false);

  const [form, setForm] = useState<SettingsForm>(() => defaultForm());
  const [saved, setSaved] = useState(true);

  // Policy modal + scroll-to-bottom gate
  const [openPolicy, setOpenPolicy] = useState<string | null>(null); // "platform" | "content" | "payout" | "full" | null
  const [policyScrollPct, setPolicyScrollPct] = useState(0);
  const [policyScrollOk, setPolicyScrollOk] = useState(false);
  const policyScrollRef = useRef<HTMLDivElement>(null);

  // UI helpers
  const [newBlockedSeller, setNewBlockedSeller] = useState("");

  const creatorType = form.profile.creatorType;
  const primaryPlatformName = useMemo(() => getPrimaryPlatformName(form), [form]);
  const selectedSocialPlatforms = useMemo(
    () => getSelectedSocialPlatforms(form.socials),
    [form.socials]
  );
  const normalizedPrimaryPlatform = useMemo(
    () => normalizePrimaryPlatform(form.socials.primaryPlatform),
    [form.socials.primaryPlatform]
  );
  const allPoliciesSeen = policyAllSeen(form);



  const completeness = useMemo(() => {
    const checks = [
      isFilled(form.profile.name),
      isFilled(form.profile.handle),
      isFilled(form.profile.country),
      isFilled(primaryPlatformName),
      form.kyc.idUploaded,
      form.kyc.selfieUploaded,
      !!form.payout.method,
      !!form.payout.acceptPayoutPolicy,
      !!form.review.acceptTerms
    ];
    const done = checks.filter(Boolean).length;
    const total = checks.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [form, primaryPlatformName]);

  // Load from the dedicated settings domain
  useEffect(() => {
    if (settingsQuery.data && !hydratedRef.current) {
      setForm(normalizeFormFromSettingsRecord(settingsQuery.data));
      hydratedRef.current = true;
      push("Settings loaded from your backend profile.", "success");
      return;
    }

    if (!settingsQuery.isLoading && !hydratedRef.current) {
      hydratedRef.current = true;
    }
  }, [settingsQuery.data, settingsQuery.isLoading, push]);

  // Autosave
  useEffect(() => {
    if (!hydratedRef.current) return undefined;

    setSaved(false);
    const t = setTimeout(() => {
      void updateSettingsMutation
        .mutateAsync(buildSettingsPayload(form))
        .then(() => setSaved(true))
        .catch(() => {
          setSaved(true);
          push("Could not save settings to the backend settings API.", "error");
        });
    }, 450);
    return () => clearTimeout(t);
  }, [form, push, updateSettingsMutation]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function update(path: string, value: any) {
    setForm((prev) => setDeep(prev, path, value));
  }

  async function handleWorkflowUpload(
    file: File,
    options: { purpose: string; namePath: string; uploadedPath?: string; successMessage: string }
  ) {
    try {
      const upload = await createUploadMutation.mutateAsync({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        purpose: options.purpose,
        relatedEntityType: "settings",
        relatedEntityId: settingsQuery.data?.userId || "current"
      });

      update(options.namePath, upload.name || file.name);
      if (options.uploadedPath) update(options.uploadedPath, true);
      push(options.successMessage, "success");
    } catch (error) {
      console.error(error);
      push("Upload failed. Please try again.", "error");
    }
  }

  function toggleInArray(path: string, value: string) {
    setForm((prev) => {
      const next = deepClone(prev);
      const parts = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      const k = parts[parts.length - 1];
      const arr = Array.isArray(cur[k]) ? cur[k] : [];
      cur[k] = arr.includes(value) ? arr.filter((x: string) => x !== value) : [...arr, value];
      return next;
    });
  }

  function addAudit(what: string, meta?: string) {
    setForm((prev) => {
      const next = deepClone(prev);
      const entry: AuditLog = { id: `${Date.now()}_${Math.random()}`, when: nowLabel(), what, meta };
      const arr = Array.isArray(next.settings.audit) ? next.settings.audit : [];
      next.settings.audit = [entry, ...arr].slice(0, 20);
      return next;
    });
  }



  function handlePolicyScroll() {
    const el = policyScrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? Math.round((el.scrollTop / max) * 100) : 100;
    setPolicyScrollPct(pct);
    if (pct >= 98) {
      setPolicyScrollOk(true);
      update("review.scrolledToBottom", true);
    }
  }

  function openPolicyModal(key: string | null) {
    setOpenPolicy(key);
    setPolicyScrollPct(0);
    setPolicyScrollOk(false);
    setTimeout(() => {
      // reset scroll position when opened
      if (policyScrollRef.current) policyScrollRef.current.scrollTop = 0;
    }, 0);
  }

  function markPolicySeen(key: string) {
    if (key === "platform") update("review.seenPolicies.platform", true);
    if (key === "content") update("review.seenPolicies.content", true);
    if (key === "payout") update("review.seenPolicies.payout", true);
  }

  function acceptPayoutPolicy() {
    update("payout.acceptPayoutPolicy", true);
    update("review.seenPolicies.payout", true);
    addAudit("Payout policy accepted", form.payout.method || "method not selected");
    push("Payout policy accepted.", "success");
  }



  function addBlockedSeller() {
    const name = newBlockedSeller.trim();
    if (!name) return;
    const existing = form.settings.privacy.blockedSellers || [];
    if (existing.includes(name)) {
      push("That seller is already blocked.", "warn");
      return;
    }
    update("settings.privacy.blockedSellers", [name, ...existing]);
    setNewBlockedSeller("");
    addAudit("Seller blocked", name);
    push("Seller blocked.", "success");
  }

  function removeBlockedSeller(name: string) {
    const next = (form.settings.privacy.blockedSellers || []).filter((x) => x !== name);
    update("settings.privacy.blockedSellers", next);
    addAudit("Seller unblocked", name);
    push("Seller unblocked.", "success");
  }

  async function logoutDevice(deviceId: string) {
    try {
      const updatedSettings = await removeSettingsDeviceMutation.mutateAsync(deviceId);
      setForm(normalizeFormFromSettingsRecord(updatedSettings));
      push("Device signed out.", "success");
    } catch (error) {
      console.error(error);
      push(error instanceof Error ? error.message : "Could not sign out that device.", "error");
    }
  }

  async function signOutEverywhere() {
    try {
      const updatedSettings = await signOutAllDevicesMutation.mutateAsync();
      setForm(normalizeFormFromSettingsRecord(updatedSettings));
      push("All devices signed out.", "success");
    } catch (error) {
      console.error(error);
      push(error instanceof Error ? error.message : "Could not sign out all devices.", "error");
    }
  }

  function downloadData() {
    addAudit("Data export requested", "JSON");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "creator_settings_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    push("Data export started.", "success");
  }

  function copyPrimary() {
    navigator.clipboard?.writeText(primaryPlatformName || "");
    push("Copied.", "success");
  }




  /* ---------- Modals: policies ---------- */

  const policyKey = openPolicy === "platform" || openPolicy === "content" || openPolicy === "payout" ? openPolicy : null;

  const policyTitle = policyKey ? POLICY_LIBRARY[policyKey]?.title : openPolicy === "full" ? "Full policy document" : "";
  const policySubtitle = policyKey ? POLICY_LIBRARY[policyKey]?.subtitle : openPolicy === "full" ? "Scroll to the bottom to enable consent." : "";

  const policyFooter = (
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs text-slate-500">
        Scroll progress:{" "}
        <span className={cx("font-semibold", policyScrollOk ? "text-emerald-700" : "text-amber-700")}>
          {policyScrollOk ? "Confirmed" : `${policyScrollPct}%`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {policyKey ? (
          <button
            type="button"
            className={cx(
              "px-4 py-2 rounded-2xl text-sm inline-flex items-center gap-2 border",
              policyScrollOk ? "bg-white hover:bg-slate-50" : "bg-slate-50 text-slate-400 cursor-not-allowed"
            )}
            style={policyScrollOk ? { borderColor: ORANGE, color: ORANGE } : undefined}
            disabled={!policyScrollOk}
            onClick={() => {
              markPolicySeen(policyKey);
              addAudit("Policy reviewed", policyTitle);
              push("Marked as reviewed.", "success");
              setOpenPolicy(null);
            }}
          >
            <Check className="h-4 w-4" /> Mark reviewed
          </button>
        ) : null}

        {policyKey === "payout" ? (
          <PrimaryButton
            disabled={!policyScrollOk}
            className={cx(!policyScrollOk ? "opacity-60 cursor-not-allowed" : "")}
            onClick={() => {
              if (!policyScrollOk) return;
              acceptPayoutPolicy();
              setOpenPolicy(null);
            }}
          >
            <ShieldCheck className="h-4 w-4" /> Accept payout policy
          </PrimaryButton>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#f2f2f2] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-orange-400/5 dark:bg-orange-500/5 blur-[120px]" />
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/5 dark:bg-blue-500/5 blur-[100px]" />
      </div>

      <ToastStack toasts={toasts} />

      <Modal open={!!openPolicy} title={policyTitle} subtitle={policySubtitle} onClose={() => setOpenPolicy(null)} footer={policyFooter}>
        <div
          ref={policyScrollRef}
          onScroll={handlePolicyScroll}
          className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800 custom-scrollbar"
        >
          {openPolicy === "full" ? (
            <div className="space-y-3">
              {["platform", "content", "payout"].map((k) => {
                const p = POLICY_LIBRARY[k];
                return (
                  <div key={k} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm">{p.title}</div>
                      <Badge tone="neutral">Section</Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.subtitle}</div>
                    <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {p.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {p.sections.map((sec) => (
                        <div key={sec.h} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                          <div className="text-sm font-semibold">{sec.h}</div>
                          <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <div className="font-semibold">Compliance note</div>
                <div className="mt-1">
                  This is a product UI preview. Replace this copy with your final legal text when publishing. Scrolling is recorded to unlock consent.
                </div>
              </div>

              {/* Filler paragraphs to make scroll-to-bottom meaningful in preview */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {Array.from({ length: 10 }).map((_, i) => (
                  <p key={i}>
                    Additional legal and operational detail placeholder. In production, include jurisdiction-specific terms, dispute resolution, supplier responsibilities,
                    platform enforcement rights, and payout eligibility criteria.
                  </p>
                ))}
              </div>
            </div>
          ) : policyKey ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Quick summary</div>
                <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  {POLICY_LIBRARY[policyKey].bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              {POLICY_LIBRARY[policyKey].sections.map((sec) => (
                <div key={sec.h} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm">{sec.h}</div>
                  <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    {sec.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 space-y-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {Array.from({ length: 6 }).map((_, i) => (
                  <p key={i}>
                    Detailed terms placeholder. Add your final legal text here for {policyKey}. This scroll area is intentionally long to support scroll-to-bottom
                    confirmation.
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Header */}
      <header className="shrink-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200 dark:bg-slate-950/85 dark:border-slate-800">
        <div className="w-full px-3 md:px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/MyliveDealz PNG Icon 1.png" alt="Icon" className="h-10 w-10 object-contain" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50">Settings & Safety</h1>
              <div className="text-sm text-slate-500 dark:text-slate-400">Manage your profile, verification, payouts, policies and security.</div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={saved ? "good" : "warn"}>
                  <span className={cx("h-1.5 w-1.5 rounded-full", saved ? "bg-emerald-500" : "bg-amber-500")} />
                  {saved ? "Saved" : "Saving…"}
                </Badge>

                <Badge tone="neutral">
                  <Users className="h-3.5 w-3.5" />
                  {creatorType}
                </Badge>

                <Badge tone={kycTone(form.kyc.status)}>
                  <IdCard className="h-3.5 w-3.5" />
                  KYC: {form.kyc.status.replace("_", " ")}
                </Badge>

                <Badge tone={payoutTone(form.payout.verification.status)}>
                  <CreditCard className="h-3.5 w-3.5" />
                  Payout: {form.payout.verification.status.replace("_", " ")}
                </Badge>

                <Badge tone={form.review.acceptTerms ? "good" : "warn"}>
                  <ScrollText className="h-3.5 w-3.5" />
                  Terms: {form.review.acceptTerms ? "Accepted" : "Pending"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GhostButton
              onClick={() => {
                window.open("https://support.mylivedealz.com", "_blank");
              }}
            >
              <HelpCircle className="h-4 w-4" /> Help
            </GhostButton>

            <GhostButton
              onClick={() => {
                navigate("/onboarding-wizard");
              }}
            >
              <ExternalLink className="h-4 w-4" /> Open onboarding
            </GhostButton>

            <PrimaryButton onClick={downloadData}>
              <Download className="h-4 w-4" /> Export data
            </PrimaryButton>
          </div>
        </div>

        <div className="w-full px-3 md:px-4 pb-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Account completeness</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {completeness.done}/{completeness.total} completed · Unlocks more campaigns and faster payouts.
                </div>
              </div>
              <Badge tone={completeness.pct >= 80 ? "good" : completeness.pct >= 50 ? "warn" : "neutral"}>{completeness.pct}%</Badge>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <div className="h-full" style={{ width: `${completeness.pct}%`, background: completeness.pct >= 80 ? GREEN : ORANGE }} />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="hidden md:block w-64 shrink-0 overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 px-3 md:px-4 pt-4 pb-8 space-y-8">
          <div>
            <div className="px-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Settings</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 px-2 mb-3">Jump to a section</div>
            <div className="flex flex-col gap-1">
              {[
                { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
                { id: "profile", label: "Profile", icon: <FileText className="h-4 w-4" /> },
                { id: "team", label: "Team & Access", icon: <Users className="h-4 w-4" /> },
                { id: "socials", label: "Socials", icon: <Globe className="h-4 w-4" /> },
                { id: "collab", label: "Collaboration", icon: <Sparkles className="h-4 w-4" /> },
                { id: "availability", label: "Availability", icon: <Calendar className="h-4 w-4" /> },
                { id: "kyc", label: "Verification & Security", icon: <IdCard className="h-4 w-4" /> },
                { id: "payouts", label: "Payouts & Tax", icon: <CreditCard className="h-4 w-4" /> },
                { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
                { id: "privacy", label: "Privacy & Blocking", icon: <Lock className="h-4 w-4" /> },
                { id: "policies", label: "Policies & Consent", icon: <ScrollText className="h-4 w-4" /> },
                { id: "data", label: "Data & Support", icon: <Download className="h-4 w-4" /> }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:shadow-sm transition-all"
                >
                  {item.icon}
                  {item.label}
                  <ChevronRight className="ml-auto h-3 w-3 opacity-0 group-hover:opacity-50" />
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-4 pt-4 pb-20 space-y-4">
          {/* Account */}
          < Card
            id="account"
            title="Account overview"
            subtitle="Your onboarding details power Roles & Permissions, Crew Management, payouts, and supplier trust."
            icon={< BadgeCheck className="h-5 w-5" />}
            right={
              < div className="flex items-center gap-2" >
                {
                  primaryPlatformName ? (
                    <GhostButton onClick={copyPrimary} >
                      <Copy className="h-4 w-4" /> Copy primary
                    </GhostButton>
                  ) : null}
              </div >
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Creator</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{form.profile.name || "(name missing)"}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">@{form.profile.handle || "handle"}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Primary platform</div>
                {primaryPlatformName ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{primaryPlatformName}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedSocialPlatforms.map((platform) => (
                        <span
                          key={platform.name}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {platform.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    onClick={() => {
                      document.getElementById("socials")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      push("Set your primary platform in Social accounts.", "warn");
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    Set Primary Platform
                  </button>
                )}
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">Country: {form.profile.country || "(not set)"}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Payout method</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{form.payout.method || "(not selected)"}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">Schedule: {form.payout.schedule}</div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Workspace mode</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {creatorType === "Individual"
                      ? "Individual accounts can still invite session co-hosts. Team/Agency accounts unlock multi-user roles & audit controls."
                      : "Multi-user accounts should manage access via Roles & Permissions and assign staff via Crew Management."}
                  </div>
                </div>
                {creatorType !== "Individual" ? (
                  <SoftButton
                    onClick={() => {
                      navigate("/roles-permissions");
                    }}
                  >
                    <Users className="h-4 w-4" /> Roles & Permissions
                  </SoftButton>
                ) : (
                  <SoftButton
                    onClick={() => {
                      navigate("/subscription");
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Upgrade
                  </SoftButton>
                )}
              </div>
            </div>
          </Card >

          {/* Profile */}
          < Card id="profile" title="Profile & brand" subtitle="These details appear on your Creator profile and in supplier proposals." icon={< User className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Display name *">
                <Input value={form.profile.name} onChange={(e) => update("profile.name", e.target.value)} placeholder="Your name / brand" />
              </Field>
              <Field label="Handle *" hint="Used in your profile URL (letters, numbers, underscores).">
                <Input value={form.profile.handle} onChange={(e) => update("profile.handle", e.target.value)} placeholder="example: mylivedealzcreator" />
              </Field>
              <Field label="Primary email address *">
                <Input
                  value={form.profile.email}
                  onChange={(e) => {
                    update("profile.email", e.target.value);
                    addAudit("Email updated", e.target.value);
                    push("Email updated. Verification link sent.", "success");
                  }}
                  placeholder="your@email.com"
                />
              </Field>
              <Field label="Primary phone contact *">
                <Input
                  value={form.profile.phone}
                  onChange={(e) => {
                    update("profile.phone", e.target.value);
                    addAudit("Phone updated", e.target.value);
                    push("Phone updated. OTP sent for verification.", "success");
                  }}
                  placeholder="+256 700 000 000"
                />
              </Field>
              <Field label="WhatsApp number">
                <Input
                  value={form.profile.whatsapp}
                  onChange={(e) => update("profile.whatsapp", e.target.value)}
                  placeholder="+256 700 000 000"
                />
              </Field>
              <Field label="Tagline">
                <Input value={form.profile.tagline} onChange={(e) => update("profile.tagline", e.target.value)} placeholder="Example: Premium electronics creator for East Africa" />
              </Field>
              <Field label="Country *">
                <Input value={form.profile.country} onChange={(e) => update("profile.country", e.target.value)} placeholder="Uganda" />
              </Field>
              <Field label="Timezone">
                <Input value={form.profile.timezone} onChange={(e) => update("profile.timezone", e.target.value)} placeholder="Africa/Kampala" />
              </Field>
              <Field label="Currency">
                <Select value={form.profile.currency} onChange={(e) => update("profile.currency", e.target.value)}>
                  {["UGX", "KES", "TZS", "USD", "EUR"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Field label="Bio">
                  <Textarea value={form.profile.bio} onChange={(e) => update("profile.bio", e.target.value)} placeholder="Tell suppliers what you sell, who you reach, and how you convert." rows={5} />
                </Field>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Content languages</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Shown to suppliers and used for matchmaking.</div>
                  </div>
                  <Badge tone="neutral">{(form.profile.contentLanguages || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <Chip key={l} label={l} active={(form.profile.contentLanguages || []).includes(l)} onClick={() => toggleInArray("profile.contentLanguages", l)} />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Audience regions</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Helps route you to the right sellers/providers.</div>
                  </div>
                  <Badge tone="neutral">{(form.profile.audienceRegions || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((r) => (
                    <Chip key={r} label={r} active={(form.profile.audienceRegions || []).includes(r)} onClick={() => toggleInArray("profile.audienceRegions", r)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <UploadMini
                title="Profile photo"
                helper="JPG/PNG, 1:1 recommended."
                value={form.profile.profilePhotoName}
                onPick={async (file) => {
                  await handleWorkflowUpload(file, {
                    purpose: "settings_profile_photo",
                    namePath: "profile.profilePhotoName",
                    successMessage: "Profile photo uploaded."
                  });
                  addAudit("Profile photo uploaded", file.name);
                }}
                accept="image/*"
              />
              <UploadMini
                title="Media kit"
                helper="PDF recommended; use for supplier pitches."
                value={form.profile.mediaKitName}
                onPick={async (file) => {
                  await handleWorkflowUpload(file, {
                    purpose: "settings_media_kit",
                    namePath: "profile.mediaKitName",
                    successMessage: "Media kit uploaded."
                  });
                  addAudit("Media kit uploaded", file.name);
                }}
                accept=".pdf,application/pdf"
              />
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Creator type</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Individual, Team, or Agency. Multi-user accounts require policy confirmation.</div>
                </div>
                <Badge tone={creatorType === "Individual" ? "neutral" : "warn"}>{creatorType}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                {["Individual", "Team", "Agency"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      update("profile.creatorType", t);
                      // changing creator type should re-check compliance confirmation
                      if (t === "Individual") update("review.confirmMultiUserCompliance", false);
                      addAudit("Creator type changed", t);
                      push("Creator type updated.", "success");
                    }}
                    className={cx(
                      "px-4 py-3 rounded-3xl border text-left transition",
                      creatorType === t ? "bg-orange-50 dark:bg-orange-950" : "bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
                    )}
                    style={creatorType === t ? { borderColor: ORANGE } : undefined}
                  >
                    <div className="text-sm">{t}</div>
                    <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                      {t === "Individual"
                        ? "Solo creator account."
                        : t === "Team"
                          ? "Seller/provider team with internal staff."
                          : "Agency managing multiple creators."}
                    </div>
                  </button>
                ))}
              </div>

              {creatorType === "Team" ? (
                <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" /> Team profile
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Team name">
                      <Input value={form.profile.team.name} onChange={(e) => update("profile.team.name", e.target.value)} placeholder="Example: Acme Seller Team" />
                    </Field>
                    <Field label="Team type">
                      <Select value={form.profile.team.type} onChange={(e) => update("profile.team.type", e.target.value)}>
                        <option value="">Select type</option>
                        {TEAM_TYPES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Team size">
                      <Select value={form.profile.team.size} onChange={(e) => update("profile.team.size", e.target.value)}>
                        {ORG_SIZES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Website">
                      <Input value={form.profile.team.website} onChange={(e) => update("profile.team.website", e.target.value)} placeholder="https://example.com" />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <UploadMini
                      title="Team logo"
                      helper="Optional. Used in proposals and shared sessions."
                      value={form.profile.team.logoName}
                      onPick={async (file) => {
                        await handleWorkflowUpload(file, {
                          purpose: "settings_team_logo",
                          namePath: "profile.team.logoName",
                          successMessage: "Team logo uploaded."
                        });
                        addAudit("Team logo uploaded", file.name);
                      }}
                      accept="image/*"
                    />
                  </div>
                </div>
              ) : null}

              {creatorType === "Agency" ? (
                <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" /> Agency profile
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Agency name">
                      <Input value={form.profile.agency.name} onChange={(e) => update("profile.agency.name", e.target.value)} placeholder="Example: Prime Talent Agency" />
                    </Field>
                    <Field label="Agency type">
                      <Select value={form.profile.agency.type} onChange={(e) => update("profile.agency.type", e.target.value)}>
                        <option value="">Select type</option>
                        {AGENCY_TYPES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Website">
                      <Input value={form.profile.agency.website} onChange={(e) => update("profile.agency.website", e.target.value)} placeholder="https://example.com" />
                    </Field>
                    <div />
                  </div>
                  <div className="mt-3">
                    <UploadMini
                      title="Agency logo"
                      helper="Optional. Used in proposals and shared sessions."
                      value={form.profile.agency.logoName}
                      onPick={async (file) => {
                        await handleWorkflowUpload(file, {
                          purpose: "settings_agency_logo",
                          namePath: "profile.agency.logoName",
                          successMessage: "Agency logo uploaded."
                        });
                        addAudit("Agency logo uploaded", file.name);
                      }}
                      accept="image/*"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="min-w-0">
                <div className="text-sm font-semibold">AI profile helper</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Generate a premium bio and tagline aligned to your niche.</div>
              </div>
              <SoftButton
                onClick={() => {
                  const region = (form.profile.audienceRegions || ["Global"])[0] || "Global";
                  const langs = (form.profile.contentLanguages || ["English"]).join(", ");
                  const line = (form.preferences.lines || ["Electronics"])[0] || "Electronics";
                  update("profile.tagline", `${line} creator for ${region}`);
                  update(
                    "profile.bio",
                    `I create premium content in ${langs} focused on ${line}. I help suppliers (Sellers and Providers) tell clear stories that convert through Live Sessionz and Shoppable Adz.`
                  );
                  addAudit("AI profile helper used", line);
                  push("Bio and tagline suggested.", "success");
                }}
              >
                <Sparkles className="h-4 w-4" /> Suggest bio
              </SoftButton>
            </div>
          </Card >

          {/* Team & Access */}
          < Card id="team" title="Team & access" subtitle="Configure multi-user access and premium security posture." icon={< Users className="h-5 w-5" />}>
            {creatorType === "Individual" ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">You’re on an Individual account.</div>
                    <div className="text-xs text-slate-600 mt-1 dark:text-slate-400">
                      You can still invite session co-hosts, but roles/permissions, staff assignments, and availability visibility become premium with Team/Agency mode.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Roles & Permissions</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Control who can invite co-hosts, manage sessions, view availability, and approve payouts.
                      </div>
                    </div>
                    <PrimaryButton
                      onClick={() => {
                        navigate("/roles-permissions");
                      }}
                    >
                      <Users className="h-4 w-4" /> Open
                    </PrimaryButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Crew Management</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Assign Producers/Moderators per session, detect conflicts, and keep a clean audit trail.
                      </div>
                    </div>
                    <PrimaryButton
                      onClick={() => {
                        navigate("/Crew-manager");
                      }}
                    >
                      <Calendar className="h-4 w-4" /> Open
                    </PrimaryButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm font-semibold">Compliance confirmation</div>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                    Required for Team/Agency accounts. Confirms all staff/creators under your account follow platform rules.
                  </div>
                  <label className="mt-2 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!form.review.confirmMultiUserCompliance}
                      onChange={(e) => {
                        update("review.confirmMultiUserCompliance", e.target.checked);
                        addAudit("Multi-user compliance updated", e.target.checked ? "confirmed" : "not confirmed");
                      }}
                    />
                    <span>
                      I confirm all team members / creators under this {creatorType.toLowerCase()} account have read and agreed to platform policies and terms.
                    </span>
                  </label>
                  {!form.review.confirmMultiUserCompliance ? (
                    <div className="mt-2 text-xs text-rose-600">This is required to accept final terms for multi-user accounts.</div>
                  ) : null}
                </div>
              </div>
            )}
          </Card >

          {/* Socials */}
          < Card id="socials" title="Social accounts" subtitle="Used for trust, matchmaking, and supplier verification." icon={< Globe className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold">Primary platform</div>
                <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">This is the main account we show in your review and profile.</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { key: "instagram", label: "Instagram" },
                    { key: "tiktok", label: "TikTok" },
                    { key: "youtube", label: "YouTube" },
                    { key: "other", label: "Other" }
                  ].map((x) => (
                    <button
                      key={x.key}
                      type="button"
                      className={cx(
                        "px-3 py-2 rounded-2xl border text-sm",
                        normalizedPrimaryPlatform === x.key
                          ? "text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      )}
                      style={
                        normalizedPrimaryPlatform === x.key
                          ? { background: ORANGE, borderColor: ORANGE }
                          : undefined
                      }
                      onClick={() => update("socials.primaryPlatform", x.key)}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>

                {normalizedPrimaryPlatform === "other" ? (
                  <div className="mt-3 space-y-2">
                    <Field label="Select platform">
                      <Select value={form.socials.primaryOtherPlatform} onChange={(e) => update("socials.primaryOtherPlatform", e.target.value)}>
                        {OTHER_SOCIAL_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {form.socials.primaryOtherPlatform === "Other" ? (
                      <Field label="Custom platform name">
                        <Input
                          value={form.socials.primaryOtherCustomName}
                          onChange={(e) => update("socials.primaryOtherCustomName", e.target.value)}
                          placeholder="Example: Telegram"
                        />
                      </Field>
                    ) : null}
                    <Field label="Handle / URL">
                      <Input value={form.socials.primaryOtherHandle} onChange={(e) => update("socials.primaryOtherHandle", e.target.value)} placeholder="@handle or URL" />
                    </Field>
                    <Field label="Followers (optional)">
                      <Input
                        type="number"
                        value={form.socials.primaryOtherFollowers}
                        onChange={(e) => update("socials.primaryOtherFollowers", e.target.value)}
                        placeholder="10000"
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Connected accounts</div>
                <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">Add your main socials (even if the primary is “Other”).</div>
                {selectedSocialPlatforms.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedSocialPlatforms.map((platform) => (
                      <span
                        key={`selected-${platform.name}`}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      >
                        {platform.name}
                        {platform.handle ? ` (${platform.handle})` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 space-y-2">
                  <Field label="Instagram">
                    <Input value={form.socials.instagram} onChange={(e) => update("socials.instagram", e.target.value)} placeholder="@handle" />
                  </Field>
                  <Field label="TikTok">
                    <Input value={form.socials.tiktok} onChange={(e) => update("socials.tiktok", e.target.value)} placeholder="@handle" />
                  </Field>
                  <Field label="YouTube">
                    <Input value={form.socials.youtube} onChange={(e) => update("socials.youtube", e.target.value)} placeholder="Channel URL or @handle" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Extra accounts</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Optional. Helps suppliers find you across platforms.</div>
                </div>
                <SoftButton
                  onClick={() => {
                    const extra = Array.isArray(form.socials.extra) ? form.socials.extra : [];
                    update("socials.extra", [...extra, { platform: "Facebook", handle: "" }]);
                    push("Extra account added.", "success");
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Add
                </SoftButton>
              </div>

              <div className="mt-3 space-y-2">
                {(form.socials.extra || []).length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No extra accounts.</div>
                ) : (
                  (form.socials.extra || []).map((row, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-2 dark:border-slate-700 dark:bg-slate-800">
                      <Select
                        value={row.platform}
                        onChange={(e) => {
                          const extra = deepClone(form.socials.extra || []);
                          extra[idx].platform = e.target.value;
                          update("socials.extra", extra);
                        }}
                      >
                        {OTHER_SOCIAL_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={row.handle}
                        onChange={(e) => {
                          const extra = deepClone(form.socials.extra || []);
                          extra[idx].handle = e.target.value;
                          update("socials.extra", extra);
                        }}
                        placeholder="@handle or URL"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm hover:bg-slate-50 text-rose-600 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700"
                        onClick={() => {
                          const extra = (form.socials.extra || []).filter((_, i) => i !== idx);
                          update("socials.extra", extra);
                          push("Removed.", "success");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card >

          {/* Collaboration */}
          < Card id="collab" title="Collaboration & matchmaking" subtitle="These preferences affect which sellers/providers can invite you." icon={< Sparkles className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Product / service lines</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Choose what you sell or promote.</div>
                  </div>
                  <Badge tone="neutral">{(form.preferences.lines || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRODUCT_SERVICE_LINES.map((x) => (
                    <Chip key={x} label={x} active={(form.preferences.lines || []).includes(x)} onClick={() => toggleInArray("preferences.lines", x)} />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Collaboration models</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">How you prefer to be paid.</div>
                  </div>
                  <Badge tone="neutral">{(form.preferences.models || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLLAB_MODELS.map((x) => (
                    <Chip key={x} label={x} active={(form.preferences.models || []).includes(x)} onClick={() => toggleInArray("preferences.models", x)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Content formats</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Used for routing invitations and session suggestions.</div>
                </div>
                <Badge tone="neutral">{(form.preferences.formats || []).length}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTENT_FORMATS.map((x) => (
                  <Chip key={x} label={x} active={(form.preferences.formats || []).includes(x)} onClick={() => toggleInArray("preferences.formats", x)} />
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Rate card</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Optional. Helps suppliers propose realistic budgets.</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Flat fee">
                    <Input
                      type="number"
                      value={form.preferences.rateCard.flatFee}
                      onChange={(e) => update("preferences.rateCard.flatFee", clampNumber(e.target.value, 0, 100000000))}
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Commission %">
                    <Input
                      type="number"
                      value={form.preferences.rateCard.commissionPct}
                      onChange={(e) => update("preferences.rateCard.commissionPct", clampNumber(e.target.value, 0, 90))}
                      placeholder="10"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Invite filtering</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Premium controls to reduce noise.</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Field label="Who can invite you?">
                    <Select value={form.preferences.inviteRules} onChange={(e) => update("preferences.inviteRules", e.target.value)}>
                      {["All", "Verified suppliers only", "Invite-only"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Supplier type">
                    <Select value={form.preferences.supplierType} onChange={(e) => update("preferences.supplierType", e.target.value)}>
                      {["Sellers + Providers", "Sellers only", "Providers only"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </div>
          </Card >

          {/* Availability */}
          < Card id="availability" title="Availability & calendar" subtitle="Used by Crew Management and suppliers to schedule sessionz without conflicts." icon={< Calendar className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Default availability</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Your personal availability window (can be overridden per session).</div>

                <div className="mt-3">
                  <div className="text-sm">Days</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <Chip key={d} label={d} active={(form.preferences.availability.days || []).includes(d)} onClick={() => toggleInArray("preferences.availability.days", d)} />
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <Field label="Time window">
                    <Input value={form.preferences.availability.timeWindow} onChange={(e) => update("preferences.availability.timeWindow", e.target.value)} placeholder="18:00–22:00" />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm">Availability visibility</div>
                <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">Controls who can see your availability calendar.</div>

                <div className="mt-3 space-y-2">
                  <ToggleRow
                    label="Share availability calendar"
                    hint="Required for conflict detection and premium scheduling."
                    checked={!!form.settings.calendar.shareAvailability}
                    onChange={(v) => {
                      update("settings.calendar.shareAvailability", v);
                      addAudit("Availability sharing updated", v ? "on" : "off");
                    }}
                  />
                  <Field label="Visibility">
                    <Select value={form.settings.calendar.visibility} onChange={(e) => update("settings.calendar.visibility", e.target.value)}>
                      {["Admins only", "Admins + Producers", "Anyone with permission"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <ToggleRow
                    label="Google Calendar sync"
                    hint="Optional. Helps detect conflicts with external events."
                    checked={!!form.settings.calendar.googleConnected}
                    onChange={(v) => {
                      update("settings.calendar.googleConnected", v);
                      addAudit("Calendar sync updated", v ? "connected" : "disconnected");
                      push(v ? "Calendar sync preference saved." : "Calendar sync preference saved.", "success");
                    }}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <div className="font-semibold">Premium behaviour</div>
                  <ul className="mt-1 list-disc pl-4 space-y-1">
                    <li>Producers see warnings if you’re already booked in another live session.</li>
                    <li>Owners can see team availability if they have permission (“View team availability”).</li>
                    <li>External guest co-hosts can share availability without full workspace access.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card >

          {/* KYC & Security */}
          < Card
            id="kyc"
            title="Verification"
            subtitle="KYC helps protect payouts and reduce platform risk."
            icon={< IdCard className="h-5 w-5" />}
            right={
              < Badge tone={kycTone(form.kyc.status)} >
                <IdCard className="h-3.5 w-3.5" />
                {form.kyc.status.replace("_", " ")}
              </Badge >
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Identity verification</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Upload documents to unlock verified badge review.</div>
                  </div>
                  <SoftButton
                    onClick={() => {
                      update("kyc.status", "in_review");
                      addAudit("KYC submitted", "in_review");
                      push("KYC submitted for review.", "success");
                    }}
                  >
                    <BadgeCheck className="h-4 w-4" /> Submit
                  </SoftButton>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Document type">
                    <Select value={form.kyc.documentType} onChange={(e) => update("kyc.documentType", e.target.value)}>
                      {["National ID", "Passport", "Driver’s license"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div />

                  <UploadMini
                    title="ID document"
                    helper={form.kyc.idUploaded ? "Uploaded" : "Required"}
                    value={form.kyc.idFileName}
                    onPick={async (file) => {
                      await handleWorkflowUpload(file, {
                        purpose: "settings_kyc_id",
                        namePath: "kyc.idFileName",
                        uploadedPath: "kyc.idUploaded",
                        successMessage: "ID document uploaded."
                      });
                      addAudit("KYC doc uploaded", "ID document");
                    }}
                  />
                  <UploadMini
                    title="Selfie"
                    helper={form.kyc.selfieUploaded ? "Uploaded" : "Required"}
                    value={form.kyc.selfieFileName}
                    onPick={async (file) => {
                      await handleWorkflowUpload(file, {
                        purpose: "settings_kyc_selfie",
                        namePath: "kyc.selfieFileName",
                        uploadedPath: "kyc.selfieUploaded",
                        successMessage: "Selfie uploaded."
                      });
                      addAudit("KYC doc uploaded", "Selfie");
                    }}
                  />
                  <UploadMini
                    title="Address proof"
                    helper={form.kyc.addressUploaded ? "Uploaded" : "Optional"}
                    value={form.kyc.addressFileName}
                    onPick={async (file) => {
                      await handleWorkflowUpload(file, {
                        purpose: "settings_kyc_address",
                        namePath: "kyc.addressFileName",
                        uploadedPath: "kyc.addressUploaded",
                        successMessage: "Address proof uploaded."
                      });
                      addAudit("KYC doc uploaded", "Address proof");
                    }}
                  />
                </div>

                {creatorType !== "Individual" ? (
                  <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="text-sm">Organization documents</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Recommended for Team/Agency payouts.</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <UploadMini
                        title="Registration"
                        value={form.kyc.org.registrationName}
                        onPick={async (file) => {
                          await handleWorkflowUpload(file, {
                            purpose: "settings_org_registration",
                            namePath: "kyc.org.registrationName",
                            uploadedPath: "kyc.org.registrationUploaded",
                            successMessage: "Registration document uploaded."
                          });
                          addAudit("Org doc uploaded", "Registration");
                        }}
                      />
                      <UploadMini
                        title="Tax certificate"
                        value={form.kyc.org.taxName}
                        onPick={async (file) => {
                          await handleWorkflowUpload(file, {
                            purpose: "settings_org_tax",
                            namePath: "kyc.org.taxName",
                            uploadedPath: "kyc.org.taxUploaded",
                            successMessage: "Tax certificate uploaded."
                          });
                          addAudit("Org doc uploaded", "Tax");
                        }}
                      />
                      <UploadMini
                        title="Authorization letter"
                        value={form.kyc.org.authorizationName}
                        onPick={async (file) => {
                          await handleWorkflowUpload(file, {
                            purpose: "settings_org_authorization",
                            namePath: "kyc.org.authorizationName",
                            uploadedPath: "kyc.org.authorizationUploaded",
                            successMessage: "Authorization letter uploaded."
                          });
                          addAudit("Org doc uploaded", "Authorization");
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm">Devices</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Manage active sessions.</div>
                    </div>
                    <GhostButton onClick={() => {
                      void signOutEverywhere();
                    }}>
                      <Lock className="h-4 w-4" /> Sign out all
                    </GhostButton>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(form.settings.devices || []).length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No active devices.</div>
                    ) : (
                      (form.settings.devices || []).map((d) => (
                        <div key={d.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-2 dark:border-slate-700 dark:bg-slate-800">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-900 truncate dark:text-white">{d.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Last active: {d.lastActive}</div>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700"
                            onClick={() => {
                              void logoutDevice(d.id);
                            }}
                          >
                            Sign out
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card >

          {/* Payouts */}
          < Card
            id="payouts"
            title="Payouts & tax"
            subtitle="Configure where you get paid and review settlement rules before accepting."
            icon={< CreditCard className="h-5 w-5" />}
            right={
              < Badge tone={payoutTone(form.payout.verification.status)} >
                <CreditCard className="h-3.5 w-3.5" />
                {form.payout.verification.status.replace("_", " ")}
              </Badge >
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm">Payout method</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Choose where your earnings should go.</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PAYOUT_METHODS.map((m) => {
                    const active = form.payout.method === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        className={cx(
                          "rounded-3xl border p-3 text-left transition",
                          active ? "bg-orange-50 dark:bg-orange-950" : "bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
                        )}
                        style={active ? { borderColor: ORANGE } : undefined}
                        onClick={() => {
                          update("payout.method", m.key);
                          addAudit("Payout method selected", m.key);
                          push("Payout method updated.", "success");
                        }}
                      >
                        <div className="text-sm">{m.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Field label="Currency">
                    <Select value={form.payout.currency} onChange={(e) => update("payout.currency", e.target.value)}>
                      {["UGX", "KES", "TZS", "USD", "EUR"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Schedule">
                    <Select value={form.payout.schedule} onChange={(e) => update("payout.schedule", e.target.value)}>
                      {["Weekly", "Bi-weekly", "Monthly"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Minimum threshold">
                    <Input
                      type="number"
                      value={form.payout.minThreshold}
                      onChange={(e) => update("payout.minThreshold", clampNumber(e.target.value, 0, 100000000))}
                      placeholder="100000"
                    />
                  </Field>
                  <div />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm">Method details</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Shown only for the selected method.</div>

                  {form.payout.method === "Bank" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Bank name">
                        <Input value={form.payout.bank.bankName} onChange={(e) => update("payout.bank.bankName", e.target.value)} placeholder="Bank" />
                      </Field>
                      <Field label="Account name">
                        <Input value={form.payout.bank.accountName} onChange={(e) => update("payout.bank.accountName", e.target.value)} placeholder="Name" />
                      </Field>
                      <Field label="Account number">
                        <Input value={form.payout.bank.accountNumber} onChange={(e) => update("payout.bank.accountNumber", e.target.value)} placeholder="000000000" />
                      </Field>
                      <Field label="SWIFT (optional)">
                        <Input value={form.payout.bank.swift} onChange={(e) => update("payout.bank.swift", e.target.value)} placeholder="ABCDEFXX" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "Mobile Money" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Provider">
                        <Select value={form.payout.mobile.provider} onChange={(e) => update("payout.mobile.provider", e.target.value)}>
                          {["MTN", "Airtel", "Vodacom", "Safaricom"].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Number">
                        <Input value={form.payout.mobile.number} onChange={(e) => update("payout.mobile.number", e.target.value)} placeholder="+256..." />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "PayPal / Wallet" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Provider">
                        <Select value={form.payout.wallet.provider} onChange={(e) => update("payout.wallet.provider", e.target.value)}>
                          {["PayPal", "Wise", "Payoneer"].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Email">
                        <Input value={form.payout.wallet.email} onChange={(e) => update("payout.wallet.email", e.target.value)} placeholder="email@domain.com" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "AliPay" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Account name">
                        <Input value={form.payout.alipay.name} onChange={(e) => update("payout.alipay.name", e.target.value)} placeholder="Full name" />
                      </Field>
                      <Field label="AliPay account ID">
                        <Input value={form.payout.alipay.accountId} onChange={(e) => update("payout.alipay.accountId", e.target.value)} placeholder="AliPay ID" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "WeChat Pay" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Account name">
                        <Input value={form.payout.wechat.name} onChange={(e) => update("payout.wechat.name", e.target.value)} placeholder="Full name" />
                      </Field>
                      <Field label="WeChat Pay account ID">
                        <Input value={form.payout.wechat.accountId} onChange={(e) => update("payout.wechat.accountId", e.target.value)} placeholder="WeChat ID" />
                      </Field>
                      <Field label="Phone number">
                        <Input value={form.payout.wechat.phone} onChange={(e) => update("payout.wechat.phone", e.target.value)} placeholder="+86..." />
                      </Field>
                    </div>
                  ) : null}

                  {!form.payout.method ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Select a payout method to enter details.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm">Verification</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Helps reduce holds on first payouts.</div>
                    </div>
                    <Badge tone={payoutTone(form.payout.verification.status)}>{form.payout.verification.status.replace("_", " ")}</Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <GhostButton
                      onClick={() => {
                        if (!form.payout.method) {
                          push("Select a payout method first.", "error");
                          return;
                        }

                        void sendPayoutVerificationMutation
                          .mutateAsync({ payout: form.payout as unknown as Record<string, unknown> })
                          .then((updatedSettings) => {
                            setForm(normalizeFormFromSettingsRecord(updatedSettings));
                            push("Verification code sent.", "success");
                          })
                          .catch((error) => {
                            console.error(error);
                            push(error instanceof Error ? error.message : "Could not send the verification code.", "error");
                          });
                      }}
                      disabled={sendPayoutVerificationMutation.isPending}
                    >
                      <Upload className="h-4 w-4" /> {sendPayoutVerificationMutation.isPending ? "Sending…" : "Send code"}
                    </GhostButton>

                    <PrimaryButton
                      onClick={() => {
                        if (!form.payout.method) {
                          push("Select a payout method first.", "error");
                          return;
                        }

                        void verifyPayoutMutation
                          .mutateAsync({ payout: form.payout as unknown as Record<string, unknown> })
                          .then((updatedSettings) => {
                            setForm(normalizeFormFromSettingsRecord(updatedSettings));
                            push("Payout method verified.", "success");
                          })
                          .catch((error) => {
                            console.error(error);
                            push(error instanceof Error ? error.message : "Could not verify the payout method.", "error");
                          });
                      }}
                      disabled={verifyPayoutMutation.isPending}
                    >
                      <Check className="h-4 w-4" /> {verifyPayoutMutation.isPending ? "Verifying…" : "Mark verified"}
                    </PrimaryButton>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="Tax residency">
                      <Input value={form.payout.tax.residency} onChange={(e) => update("payout.tax.residency", e.target.value)} placeholder="Uganda" />
                    </Field>
                    <Field label="Tax ID (optional)">
                      <Input value={form.payout.tax.taxId} onChange={(e) => update("payout.tax.taxId", e.target.value)} placeholder="TIN..." />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout policy */}
            <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Payout policy & settlement rules</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Premium transparency: review this before accepting payouts.</div>
                </div>
                {form.payout.acceptPayoutPolicy ? <Badge tone="good">Accepted</Badge> : <Badge tone="warn">Not accepted</Badge>}
              </div>

              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <div className="font-semibold">At a glance</div>
                <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Settlements typically occur after buyer protection/dispute windows.</li>
                  <li>Refunds/chargebacks can reduce eligible earnings.</li>
                  <li>Policy violations can place holds on payouts.</li>
                </ul>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <GhostButton
                  onClick={() => {
                    update("review.seenPolicies.payout", true);
                    openPolicyModal("payout");
                    addAudit("Opened payout policy", "Read full");
                  }}
                >
                  <ExternalLink className="h-4 w-4" /> Read full payout policy
                </GhostButton>

                <PrimaryButton
                  disabled={form.payout.acceptPayoutPolicy}
                  className={cx(form.payout.acceptPayoutPolicy ? "opacity-60 cursor-not-allowed" : "")}
                  onClick={() => {
                    if (form.payout.acceptPayoutPolicy) return;
                    push("Please read the payout policy and scroll to the bottom before accepting.", "warn");
                    openPolicyModal("payout");
                  }}
                >
                  <ShieldCheck className="h-4 w-4" /> Accept
                </PrimaryButton>
              </div>
            </div>
          </Card >

          {/* Notifications */}
          < Card id="notifications" title="Notifications" subtitle="Control what we send you and your team." icon={< Bell className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ToggleRow
                label="New proposals & invites"
                hint="Seller/provider invites and collaboration proposals."
                checked={!!form.settings.notifications.proposals}
                onChange={(v) => {
                  update("settings.notifications.proposals", v);
                  addAudit("Notifications updated", `proposals: ${v ? "on" : "off"}`);
                }}
              />
              <ToggleRow
                label="Live session reminders"
                hint="Calendar reminders, call time alerts, and rehearsal prompts."
                checked={!!form.settings.notifications.liveReminders}
                onChange={(v) => {
                  update("settings.notifications.liveReminders", v);
                  addAudit("Notifications updated", `liveReminders: ${v ? "on" : "off"}`);
                }}
              />
              <ToggleRow
                label="Payout updates"
                hint="Settlement, payout runs, holds, and payout confirmations."
                checked={!!form.settings.notifications.payouts}
                onChange={(v) => {
                  update("settings.notifications.payouts", v);
                  addAudit("Notifications updated", `payouts: ${v ? "on" : "off"}`);
                }}
              />
              <ToggleRow
                label="Security alerts"
                hint="New sign-ins, device changes, and suspicious activity."
                checked={!!form.settings.notifications.securityAlerts}
                onChange={(v) => {
                  update("settings.notifications.securityAlerts", v);
                  addAudit("Notifications updated", `securityAlerts: ${v ? "on" : "off"}`);
                }}
              />
              <ToggleRow
                label="Calendar updates"
                hint="Changes to sessionz you’re assigned to (reschedules, cancellations)."
                checked={!!form.settings.notifications.calendarUpdates}
                onChange={(v) => {
                  update("settings.notifications.calendarUpdates", v);
                  addAudit("Notifications updated", `calendarUpdates: ${v ? "on" : "off"}`);
                }}
              />
              <ToggleRow
                label="Platform news"
                hint="Product updates and Creator Success announcements."
                checked={!!form.settings.notifications.platformNews}
                onChange={(v) => {
                  update("settings.notifications.platformNews", v);
                  addAudit("Notifications updated", `platformNews: ${v ? "on" : "off"}`);
                }}
              />
            </div>
          </Card >

          {/* Privacy */}
          < Card id="privacy" title="Privacy & blocking" subtitle="Control visibility and manage blocked sellers/providers." icon={< Lock className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm">Visibility</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Who can see your profile and send invites.</div>

                <div className="mt-3 space-y-2">
                  <Field label="Profile visibility">
                    <Select value={form.settings.privacy.profileVisibility} onChange={(e) => update("settings.privacy.profileVisibility", e.target.value)}>
                      {["Public", "suppliers only", "Private"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Direct messages">
                    <Select value={form.settings.privacy.allowDMsFrom} onChange={(e) => update("settings.privacy.allowDMsFrom", e.target.value)}>
                      {["All suppliers", "Verified only", "None"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <ToggleRow
                    label="Allow external guest co-hosts"
                    hint="Enable inviting sellers/providers to join sessionz as guest co-hosts with limited access."
                    checked={!!form.settings.privacy.allowExternalGuests}
                    onChange={(v) => {
                      update("settings.privacy.allowExternalGuests", v);
                      addAudit("External guest access updated", v ? "on" : "off");
                    }}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Blocked sellers/providers</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">They won’t be able to invite you or message you.</div>
                  </div>
                  <Badge tone="neutral">{(form.settings.privacy.blockedSellers || []).length}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Input value={newBlockedSeller} onChange={(e) => setNewBlockedSeller(e.target.value)} placeholder="Type seller/provider name" />
                  <PrimaryButton onClick={addBlockedSeller}>Block</PrimaryButton>
                </div>

                <div className="mt-3 space-y-2">
                  {(form.settings.privacy.blockedSellers || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No blocked sellers.</div>
                  ) : (
                    (form.settings.privacy.blockedSellers || []).map((s) => (
                      <div key={s} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-2 dark:border-slate-700 dark:bg-slate-800">
                        <div className="text-sm text-slate-900 truncate dark:text-white">{s}</div>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700"
                          onClick={() => removeBlockedSeller(s)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card >

          {/* Policies */}
          < Card id="policies" title="Policies & consent" subtitle="Review policies and manage consent (with scroll-to-bottom confirmation)." icon={< ScrollText className="h-5 w-5" />}>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Policy sections</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Open each policy section or scroll the full document to the end to enable final consent (common compliance pattern).
                  </div>
                </div>
                <Badge tone={allPoliciesSeen ? "good" : "warn"}>{allPoliciesSeen ? "Ready" : "Review required"}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">
                {["platform", "content", "payout"].map((k) => {
                  const seen = k === "payout" ? !!form.payout.acceptPayoutPolicy || !!form.review.seenPolicies.payout : !!form.review.seenPolicies[k];
                  const lib = POLICY_LIBRARY[k];
                  const icon = k === "platform" ? <ShieldCheck className="h-4 w-4" /> : k === "content" ? <Globe className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />;

                  return (
                    <div key={k} className={cx("rounded-3xl border p-3", seen ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-7 w-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                              {icon}
                            </span>
                            <div className="text-sm text-slate-900 dark:text-white">{lib.title}</div>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lib.subtitle}</div>
                        </div>

                        <Badge tone={seen ? "good" : "neutral"}>
                          <span className={cx("h-1.5 w-1.5 rounded-full", seen ? "bg-emerald-500" : "bg-slate-400")} />
                          {seen ? "Seen" : "Open"}
                        </Badge>
                      </div>

                      <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        {lib.bullets.slice(0, 2).map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm hover:bg-slate-50 inline-flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                          onClick={() => {
                            markPolicySeen(k);
                            openPolicyModal(k);
                            addAudit("Opened policy", lib.title);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" /> Read
                        </button>

                        {k === "payout" ? (
                          <button
                            type="button"
                            className={cx(
                              "px-4 py-2 rounded-2xl border text-sm font-semibold inline-flex items-center gap-2",
                              form.payout.acceptPayoutPolicy ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "text-white hover:brightness-95"
                            )}
                            style={!form.payout.acceptPayoutPolicy ? { background: ORANGE } : undefined}
                            disabled={form.payout.acceptPayoutPolicy}
                            onClick={() => {
                              if (form.payout.acceptPayoutPolicy) return;
                              push("Scroll to bottom to enable acceptance.", "warn");
                              openPolicyModal("payout");
                            }}
                          >
                            {form.payout.acceptPayoutPolicy ? "Signed" : "Sign"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <PrimaryButton
                  onClick={() => {
                    window.open("https://support.mylivedealz.com", "_blank");
                    push("Support center opened.", "success");
                    addAudit("Support contacted", "Creator Success");
                  }}
                >
                  <HelpCircle className="h-4 w-4" /> Contact support
                </PrimaryButton>
              </div>
            </div>
          </Card >

          <footer className="py-6 text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} MyLiveDealz · Premium Settings & Safety
          </footer>
        </main>
      </div>
    </div>
  );
}
