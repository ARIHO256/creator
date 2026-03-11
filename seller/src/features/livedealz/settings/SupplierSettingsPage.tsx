import React, { useEffect, useMemo, useRef, useState } from "react";
import { sellerBackendApi } from "../../../lib/backendApi";

/**
 * SupplierSettingsSafetyPage.jsx
 * Controlled Mirroring Mode (Creator → Supplier)
 * ------------------------------------------------
 * Primary blueprint: CreatorSettingsSafetyPage.tsx
 *
 * Mirror-first preserved:
 * - ToastStack UX, Modal shell, Badge + Card system, premium spacing
 * - Sticky header with status badges + completeness progress
 * - Left anchor sidebar navigation with identical section depth
 * - Scroll-to-bottom policy review gating inside a modal (compliance-friendly)
 * - Autosave to backend settings + export data (JSON)
 * - Devices management + sign-out
 *
 * Supplier adaptations (minimal + required):
 * - Creator → Supplier terminology (Seller / Provider)
 * - KYC → KYB / business verification (still modeled similarly)
 * - Privacy blocking: blockedCreators instead of blockedSellers
 * - Collaboration & matchmaking reworked to Supplier campaign defaults:
 *    - Creator Usage Decision default (Use Creator / Do NOT use / Not sure)
 *    - Collaboration Mode default (Open for Collabs / Invite-only)
 *    - Content Approval default (Manual / Auto)
 *    - Multi-creator enablement + switching rules (pre-submission)
 * - Adds missing sections that the creator page’s sidebar implied but did not render:
 *    - Data & Support card (export, reset, support, incident)
 *    - Final Terms acceptance (gated by policy review + compliance)
 *
 * Notes:
 * - Canvas-safe: NO react-router, NO lucide-react. Uses emoji icon stubs.
 * - UI preview only: replace policy copy with final legal text.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";

/* ------------------------- Icon stubs (replace with your icon system in-app) ------------------------- */

const Icon = ({ children, className = "", title }) => (
  <span className={className} title={title} aria-hidden="true">
    {children}
  </span>
);

const AlertCircle = (p) => <Icon {...p}>🟠</Icon>;
const AlertTriangle = (p) => <Icon {...p}>⚠️</Icon>;
const BadgeCheck = (p) => <Icon {...p}>✅</Icon>;
const Bell = (p) => <Icon {...p}>🔔</Icon>;
const Building2 = (p) => <Icon {...p}>🏢</Icon>;
const Calendar = (p) => <Icon {...p}>🗓️</Icon>;
const Check = (p) => <Icon {...p}>✓</Icon>;
const ChevronRight = (p) => <Icon {...p}>›</Icon>;
const Copy = (p) => <Icon {...p}>⧉</Icon>;
const CreditCard = (p) => <Icon {...p}>💳</Icon>;
const Download = (p) => <Icon {...p}>⬇️</Icon>;
const ExternalLink = (p) => <Icon {...p}>↗</Icon>;
const FileText = (p) => <Icon {...p}>📄</Icon>;
const Globe = (p) => <Icon {...p}>🌐</Icon>;
const HelpCircle = (p) => <Icon {...p}>❓</Icon>;
const IdCard = (p) => <Icon {...p}>🪪</Icon>;
const Info = (p) => <Icon {...p}>ℹ️</Icon>;
const Lock = (p) => <Icon {...p}>🔒</Icon>;
const ScrollText = (p) => <Icon {...p}>📜</Icon>;
const ShieldCheck = (p) => <Icon {...p}>🛡️</Icon>;
const Sparkles = (p) => <Icon {...p}>✨</Icon>;
const Trash2 = (p) => <Icon {...p}>🗑️</Icon>;
const Upload = (p) => <Icon {...p}>⬆️</Icon>;
const User = (p) => <Icon {...p}>👤</Icon>;
const Users = (p) => <Icon {...p}>👥</Icon>;
const X = (p) => <Icon {...p}>✕</Icon>;

/* ------------------------- Utils ------------------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(base, patch) {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(base) && Array.isArray(patch)) return patch;
  if (typeof base === "object" && base && typeof patch === "object" && patch && !Array.isArray(patch)) {
    const out = { ...base };
    Object.keys(patch).forEach((k) => {
      out[k] = deepMerge(base?.[k], patch?.[k]);
    });
    return out;
  }
  return patch;
}

function setDeep(obj, path, value) {
  if (!path) return value;
  const parts = path.split(".");
  const head = parts[0];
  const tail = parts.slice(1).join(".");
  if (!tail) return { ...obj, [head]: value };
  return { ...obj, [head]: setDeep(obj?.[head] || {}, tail, value) };
}

function nowLabel() {
  return new Date().toLocaleString();
}

function isFilled(v) {
  return String(v || "").trim().length > 0;
}

function clampNumber(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/* ------------------------- Toasts ------------------------- */

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (message, type = "info") => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  return { toasts, push };
}

function ToastStack({ toasts }) {
  if (!toasts?.length) return null;
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
                  : "bg-white dark:bg-slate-900 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
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

/* ------------------------- Modal ------------------------- */

function Modal({ open, title, subtitle, onClose, footer, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 p-4 md:p-5">
          <div className="px-6 pb-4 flex flex-col items-center text-center w-full">
            <h2 className="text-xl font-bold dark:text-white">{title}</h2>
            {subtitle ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 md:p-5 overflow-auto custom-scrollbar text-slate-900 dark:text-slate-200">{children}</div>
        {footer ? (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-800/50 p-4 md:p-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------- UI atoms ------------------------- */

function Badge({ tone = "neutral", children }) {
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

function Card({ id, title, subtitle, icon, right, children }) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6 shadow-sm"
    >
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
        </div>
        {right ? <div className="self-start">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function PrimaryButton({ className, style, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-2",
        "hover:brightness-95 active:brightness-90 transition-all",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className
      )}
      style={{ background: ORANGE, ...(style || {}) }}
      {...props}
    />
  );
}

function SoftButton({ className, style, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-sm inline-flex items-center gap-2 border transition-all",
        "hover:bg-gray-50 dark:bg-slate-950 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className
      )}
      style={{ borderColor: ORANGE, color: ORANGE, ...(style || {}) }}
      {...props}
    />
  );
}

function GhostButton({ className, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 text-sm hover:bg-gray-50 dark:bg-slate-950 inline-flex items-center gap-2 transition-all dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Input({ className, ...props }) {
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

function Textarea({ className, rows = 4, ...props }) {
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

function Select({ className, children, ...props }) {
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

function ToggleRow({ label, hint, checked, onChange, disabled }) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-3 rounded-2xl border p-3 transition-colors",
        disabled
          ? "bg-gray-50 dark:bg-slate-950 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
      )}
    >
      <div className="min-w-0">
        <div className={cx("text-sm font-semibold", disabled ? "text-slate-500" : "text-slate-900 dark:text-slate-200")}>{label}</div>
        {hint ? <div className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">{hint}</div> : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cx(
          "h-8 w-14 rounded-full border relative transition-all flex-shrink-0",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          checked ? "border-transparent" : "bg-slate-200 border-transparent dark:bg-slate-700"
        )}
        style={checked ? { background: ORANGE } : undefined}
        aria-label="toggle"
      >
        <span className={cx("absolute top-1 h-6 w-6 rounded-full bg-white dark:bg-slate-900 shadow-sm transition-all", checked ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}

function Chip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
        active
          ? "text-white border-transparent shadow-sm"
          : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      )}
      style={active ? { background: ORANGE } : undefined}
    >
      {label}
    </button>
  );
}

function UploadMini({ title, helper, value, onPick, accept = "*/*" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 transition-all hover:border-amber-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-amber-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          {helper ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helper}</div> : null}
          <div className="mt-2 text-xs text-slate-700 truncate font-medium flex items-center gap-1.5 dark:text-slate-200">
            {value ? <span className="text-emerald-500">✓</span> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
            {value || "No file selected"}
          </div>
        </div>
        <label className="shrink-0 px-3 py-1.5 rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 text-xs font-semibold hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
          <Upload className="h-3.5 w-3.5" /> Choose
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) onPick(file.name);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ------------------------- Options (Supplier) ------------------------- */

const LANGUAGE_OPTIONS = ["English", "Swahili", "French", "Arabic", "Chinese", "Portuguese"];
const REGION_OPTIONS = ["East Africa", "Southern Africa", "West Africa", "North Africa", "Asia", "Europe", "North America"];

const OTHER_SOCIAL_OPTIONS = ["Facebook", "X (Twitter)", "Snapchat", "Kwai", "LinkedIn", "Twitch", "Pinterest", "Other"];

const SUPPLIER_MODELS = ["Seller", "Provider", "Seller + Provider"];

const PRODUCT_CATEGORIES = [
  "Electronics",
  "Fashion & Beauty",
  "Food & Groceries",
  "Home & Living",
  "General Supplies",
  "EV & Mobility",
  "Medical & Health",
  "Education",
  "Travel & Tourism",
  "Properties & Supplies"
];

const SERVICE_CATEGORIES = [
  "Consultations",
  "Installation Services",
  "Maintenance",
  "Digital Marketing",
  "Construction & Engineering",
  "Creative & Design",
  "Education & Training",
  "Freelance & On-Demand"
];

const CONTENT_FORMATS = ["Live Sessionz", "Shoppable Adz", "Replays & Clips", "UGC (Brand Content)", "Short-form (Reels/Shorts)", "Long-form (YouTube)"];

const CREATOR_USAGE_DECISIONS = ["I will use a Creator", "I will NOT use a Creator", "I am NOT SURE yet"];
const COLLAB_MODES = ["Open for Collabs", "Invite-only"];
const APPROVAL_MODES = ["Manual Content Approval", "Auto Approval"];

const PAYOUT_METHODS = [
  { key: "Bank", title: "Bank", desc: "Best for stable settlements and high volume." },
  { key: "Mobile Money", title: "Mobile Money", desc: "Fast and popular across Africa." },
  { key: "PayPal / Wallet", title: "PayPal / Wallet", desc: "Use existing wallets in supported regions." },
  { key: "AliPay", title: "AliPay", desc: "China payment method for cross-border payments." },
  { key: "WeChat Pay", title: "WeChat Pay", desc: "China payment method for cross-border payments." }
];

/* ------------------------- Policies (Supplier summaries) ------------------------- */

const POLICY_LIBRARY = {
  platform: {
    title: "Platform policies",
    subtitle: "Safety, integrity, listings, and compliance for suppliers.",
    bullets: [
      "Only list and promote legal, authentic, accurately described products/services.",
      "No harassment, hate, explicit content, deceptive pricing, or fake engagement.",
      "Follow moderation guidance during Live Sessionz and comply with takedown actions."
    ],
    sections: [
      {
        h: "Supplier safety",
        items: [
          "No counterfeit, restricted, or illegal items.",
          "No fraud, impersonation, or misleading identity.",
          "Maintain respectful behavior and comply with enforcement decisions."
        ]
      },
      {
        h: "Marketplace fairness",
        items: [
          "Use clear pricing and avoid bait-and-switch offers.",
          "Disclose sponsored partnerships and creator incentives when required.",
          "Ensure returns/warranty policies are accurate and visible."
        ]
      },
      {
        h: "Enforcement",
        items: [
          "Violations may lead to ad/content removal, payout holds, or account actions.",
          "Repeated violations may lead to suspension.",
          "Appeals can be requested via Support."
        ]
      }
    ]
  },
  content: {
    title: "Content & advertising rules",
    subtitle: "Standards for Adz creatives, Live Sessionz claims, and creator content.",
    bullets: [
      "No exaggerated claims (medical/financial) without support; disclose conditions and limitations.",
      "Respect copyright; only use assets you own or have rights to.",
      "Protect user privacy; do not request or expose sensitive personal data."
    ],
    sections: [
      {
        h: "Claims and disclosures",
        items: [
          "Avoid claims that cannot be substantiated.",
          "Disclose commissions/sponsorships transparently.",
          "Include delivery timelines, warranty and return conditions in copy." 
        ]
      },
      {
        h: "Brand safety",
        items: [
          "No hate/harassment or harmful content.",
          "No nudity or explicit sexual content.",
          "Avoid unsafe challenges or dangerous instructions."
        ]
      }
    ]
  },
  payout: {
    title: "Settlement & payout policy",
    subtitle: "How payouts, disputes, and creator settlements work.",
    bullets: [
      "Payouts may be held for verification, chargebacks, disputes, or policy review.",
      "Creator payouts can be manual or auto depending on campaign settings.",
      "Disputes and renegotiations require evidence and timestamps."
    ],
    sections: [
      {
        h: "Settlement timing",
        items: [
          "Scheduled payouts follow your selected cadence and thresholds.",
          "High-risk events may delay settlement.",
          "FX conversion may apply based on selected currency."
        ]
      },
      {
        h: "Disputes",
        items: [
          "Disputes may pause payouts while investigated.",
          "Creators and suppliers can renegotiate prior to final approval.",
          "Admin decisions are final unless appealed through Support."
        ]
      }
    ]
  }
};

function kycTone(status) {
  if (status === "verified") return "good";
  if (status === "in_review") return "warn";
  if (status === "rejected") return "bad";
  return "neutral";
}

function payoutTone(status) {
  if (status === "verified") return "good";
  if (status === "code_sent") return "warn";
  return "neutral";
}

function getPrimarySocialDisplay(form) {
  const sp = form.socials.primaryPlatform;
  if (sp === "instagram") return form.socials.instagram || "";
  if (sp === "tiktok") return form.socials.tiktok || "";
  if (sp === "youtube") return form.socials.youtube || "";
  const name = form.socials.primaryOtherPlatform === "Other" ? form.socials.primaryOtherCustomName : form.socials.primaryOtherPlatform;
  return name && form.socials.primaryOtherHandle ? `${name}: ${form.socials.primaryOtherHandle}` : form.socials.primaryOtherHandle || "";
}

function policyAllSeen(form) {
  const payoutPolicySeen = !!form.payout.acceptPayoutPolicy || !!form.review.seenPolicies.payout;
  const openAll = !!form.review.seenPolicies.platform && !!form.review.seenPolicies.content && payoutPolicySeen;
  return !!form.review.scrolledToBottom || openAll;
}

/* ------------------------- Default form (Supplier) ------------------------- */

export function seedSupplierSettingsForm() {
  const base = {
    profile: {
      businessName: "",
      handle: "",
      tagline: "",
      supplierModel: "Seller",
      country: "Uganda",
      timezone: "Africa/Kampala",
      currency: "UGX",
      bio: "",
      brandLanguages: ["English"],
      targetRegions: ["East Africa"],
      logoName: undefined,
      brandKitName: undefined,
      accountType: "Individual", // Individual | Business | Enterprise
      business: {
        legalName: "",
        registrationNumber: "",
        website: "",
        size: "1–5",
        address: "",
        logoName: undefined
      },
      enterprise: {
        companyGroup: "",
        procurementContact: "",
        website: "",
        logoName: undefined
      }
    },
    socials: {
      primaryPlatform: "instagram",
      primaryOtherPlatform: "Facebook",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      instagram: "",
      tiktok: "",
      youtube: "",
      extra: [{ platform: "LinkedIn", handle: "" }]
    },
    preferences: {
      productCategories: ["Electronics"],
      serviceCategories: [],
      contentFormats: ["Live Sessionz", "Shoppable Adz"],
      budget: {
        flatFeeMin: 0,
        flatFeeMax: 0,
        commissionMin: 5,
        commissionMax: 20
      },
      inviteRules: "Verified creators only",
      creatorUsageDefault: "I will use a Creator",
      collabModeDefault: "Open for Collabs",
      approvalModeDefault: "Manual Content Approval",
      allowMultiCreator: true,
      allowModeSwitchBeforeSubmission: true,
      notesToCreators: ""
    },
    kyb: {
      status: "unverified", // unverified | in_review | verified | rejected
      entityType: "Business", // Individual | Business
      representativeName: "",
      documentType: "Business registration",
      idFileName: undefined,
      idUploaded: false,
      registrationFileName: undefined,
      registrationUploaded: false,
      taxFileName: undefined,
      taxUploaded: false,
      addressFileName: undefined,
      addressUploaded: false,
      authorizationFileName: undefined,
      authorizationUploaded: false,
      twoFactor: false
    },
    payout: {
      method: "",
      currency: "UGX",
      schedule: "Weekly",
      minThreshold: 0,
      bank: { bankName: "", accountName: "", accountNumber: "", swift: "" },
      mobile: { provider: "", number: "" },
      wallet: { provider: "", email: "" },
      alipay: { accountId: "" },
      wechat: { accountId: "" },
      verification: { status: "unverified", lastSentTo: "" },
      tax: { residency: "Uganda", taxId: "" },
      creatorPayoutRelease: "Manual", // Manual | Auto
      acceptPayoutPolicy: false
    },
    settings: {
      calendar: { shareAvailability: true, visibility: "Admins + Producers", googleConnected: false },
      notifications: {
        proposals: true,
        contracts: true,
        deliverables: true,
        liveReminders: true,
        payouts: true,
        securityAlerts: true,
        calendarUpdates: true,
        platformNews: true,
        weeklyDigest: true
      },
      privacy: {
        storeVisibility: "Public",
        allowDMsFrom: "Verified creators only",
        allowExternalGuests: true,
        blockedCreators: []
      },
      devices: [
        { id: "d1", name: "Chrome on Windows", lastActive: "Today" },
        { id: "d2", name: "Android App", lastActive: "Yesterday" }
      ],
      audit: []
    },
    review: {
      acceptTerms: false,
      acceptedAt: undefined,
      confirmMultiUserCompliance: false,
      seenPolicies: { platform: false, content: false, payout: false },
      scrolledToBottom: false
    }
  };

  return base;
}

/* ------------------------- Main page ------------------------- */

export default function SupplierSettingsSafetyPage() {
  const { toasts, push } = useToasts();

  const [form, setForm] = useState(seedSupplierSettingsForm());
  const [saved, setSaved] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const [openPolicy, setOpenPolicy] = useState(null); // platform | content | payout | full | null
  const [policyScrollPct, setPolicyScrollPct] = useState(0);
  const [policyScrollOk, setPolicyScrollOk] = useState(false);
  const policyScrollRef = useRef(null);

  const [newBlockedCreator, setNewBlockedCreator] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const accountType = form.profile.accountType;
  const primarySocial = useMemo(() => getPrimarySocialDisplay(form), [form]);
  const allPoliciesSeen = policyAllSeen(form);

  const completeness = useMemo(() => {
    const checks = [
      isFilled(form.profile.businessName),
      isFilled(form.profile.handle),
      isFilled(form.profile.country),
      isFilled(primarySocial),
      form.kyb.registrationUploaded || form.kyb.idUploaded,
      !!form.payout.method,
      !!form.payout.acceptPayoutPolicy,
      !!form.review.acceptTerms
    ];
    const done = checks.filter(Boolean).length;
    const total = checks.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  }, [form, primarySocial]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const payload = await sellerBackendApi.getSettings();
        if (cancelled) return;
        const nextForm =
          payload &&
          typeof payload === "object" &&
          payload.profile &&
          typeof payload.profile === "object" &&
          (payload.profile as { supplierSettings?: unknown }).supplierSettings &&
          typeof (payload.profile as { supplierSettings?: unknown }).supplierSettings === "object"
            ? deepMerge(seedSupplierSettingsForm(), (payload.profile as { supplierSettings: unknown }).supplierSettings)
            : seedSupplierSettingsForm();
        setForm(nextForm);
      } catch {
        if (!cancelled) {
          push("Could not load supplier settings from the backend.", "error");
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [push]);

  useEffect(() => {
    if (!hydrated) return;
    setSaved(false);
    const t = setTimeout(() => {
      void sellerBackendApi
        .patchSettings({
          profile: {
            supplierSettings: form,
          },
        })
        .then(() => setSaved(true))
        .catch(() => {
          push("Supplier settings could not be saved to the backend.", "error");
        });
    }, 450);
    return () => clearTimeout(t);
  }, [form, hydrated, push]);

  function update(path, value) {
    setForm((prev) => setDeep(prev, path, value));
  }

  function toggleInArray(path, value) {
    setForm((prev) => {
      const next = deepClone(prev);
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
      const k = parts[parts.length - 1];
      const arr = Array.isArray(cur[k]) ? cur[k] : [];
      cur[k] = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return next;
    });
  }

  function addAudit(what, meta) {
    setForm((prev) => {
      const next = deepClone(prev);
      const entry = { id: `${Date.now()}_${Math.random()}`, when: nowLabel(), what, meta };
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

  function openPolicyModal(key) {
    setOpenPolicy(key);
    setPolicyScrollPct(0);
    setPolicyScrollOk(false);
    setTimeout(() => {
      if (policyScrollRef.current) policyScrollRef.current.scrollTop = 0;
    }, 0);
  }

  function markPolicySeen(key) {
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

  function canAcceptFinalTerms() {
    const multiUserNeedsConfirm = accountType !== "Individual";
    const multiOk = !multiUserNeedsConfirm || !!form.review.confirmMultiUserCompliance;
    const payoutOk = !!form.payout.acceptPayoutPolicy;
    return allPoliciesSeen && payoutOk && multiOk;
  }

  function acceptFinalTerms() {
    if (!canAcceptFinalTerms()) {
      push("Review required policies (and confirm multi-user compliance if applicable) before accepting terms.", "warn");
      return;
    }
    update("review.acceptTerms", true);
    update("review.acceptedAt", nowLabel());
    addAudit("Final terms accepted", accountType);
    push("Terms accepted.", "success");
  }

  function addBlockedCreator() {
    const name = newBlockedCreator.trim();
    if (!name) return;
    const existing = form.settings.privacy.blockedCreators || [];
    if (existing.includes(name)) {
      push("That creator is already blocked.", "warn");
      return;
    }
    update("settings.privacy.blockedCreators", [name, ...existing]);
    setNewBlockedCreator("");
    addAudit("Creator blocked", name);
    push("Creator blocked.", "success");
  }

  function removeBlockedCreator(name) {
    const next = (form.settings.privacy.blockedCreators || []).filter((x) => x !== name);
    update("settings.privacy.blockedCreators", next);
    addAudit("Creator unblocked", name);
    push("Creator unblocked.", "success");
  }

  function logoutDevice(deviceId) {
    const next = (form.settings.devices || []).filter((d) => d.id !== deviceId);
    update("settings.devices", next);
    addAudit("Device signed out", deviceId);
    push("Device signed out.", "success");
  }

  function signOutEverywhere() {
    update("settings.devices", []);
    addAudit("Signed out everywhere", "All sessions revoked");
    push("All devices signed out.", "success");
  }

  function downloadData() {
    addAudit("Data export requested", "JSON");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(form, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "supplier_settings_" + new Date().toISOString() + ".json");
    document.body.appendChild(a);
    a.click();
    a.remove();
    push("Data export started.", "success");
  }

  function copyPrimary() {
    try {
      navigator.clipboard?.writeText(primarySocial || "");
      push("Copied.", "success");
    } catch {
      push("Copy failed.", "warn");
    }
  }

  function resetAll() {
    setForm(seedSupplierSettingsForm());
    addAudit("Settings reset", "Restored defaults");
    push("Settings reset to defaults.", "success");
    setConfirmReset(false);
  }

  function deleteWorkspace() {
    addAudit("Workspace delete requested", "Support ticket created");
    push("Delete request submitted to Support (demo).", "success");
    setConfirmDelete(false);
  }

  /* ---------- Policy modal helpers ---------- */

  const policyKey = openPolicy === "platform" || openPolicy === "content" || openPolicy === "payout" ? openPolicy : null;
  const policyTitle = policyKey ? POLICY_LIBRARY[policyKey]?.title : openPolicy === "full" ? "Full policy document" : "";
  const policySubtitle = policyKey ? POLICY_LIBRARY[policyKey]?.subtitle : openPolicy === "full" ? "Scroll to the bottom to enable consent." : "";

  const policyFooter = (
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs text-slate-500">
        Scroll progress:{" "}
        <span className={cx("font-semibold", policyScrollOk ? "text-emerald-700" : "text-amber-700")}>{policyScrollOk ? "Confirmed" : `${policyScrollPct}%`}</span>
      </div>
      <div className="flex items-center gap-2">
        {policyKey ? (
          <button
            type="button"
            className={cx(
              "px-4 py-2 rounded-2xl text-sm inline-flex items-center gap-2 border",
              policyScrollOk ? "bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950" : "bg-gray-50 dark:bg-slate-950 text-slate-400 cursor-not-allowed"
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
    <div className="h-screen w-full bg-gray-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors flex flex-col overflow-hidden">
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

      {/* Policy review modal */}
      <Modal open={!!openPolicy} title={policyTitle} subtitle={policySubtitle} onClose={() => setOpenPolicy(null)} footer={policyFooter}>
        <div
          ref={policyScrollRef}
          onScroll={handlePolicyScroll}
          className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800 custom-scrollbar"
        >
          {openPolicy === "full" ? (
            <div className="space-y-3">
              {Object.keys(POLICY_LIBRARY).map((k) => {
                const p = POLICY_LIBRARY[k];
                return (
                  <div key={k} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
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
                        <div key={sec.h} className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
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

              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <div className="font-semibold">Compliance note</div>
                <div className="mt-1">Replace this copy with final legal text before production. Scrolling is recorded to unlock consent.</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 space-y-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {Array.from({ length: 10 }).map((_, i) => (
                  <p key={i}>
                    Additional legal and operational detail placeholder. Include jurisdiction-specific terms, dispute resolution, chargeback handling,
                    creator settlement conditions, and enforcement rights.
                  </p>
                ))}
              </div>
            </div>
          ) : policyKey ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Quick summary</div>
                <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  {POLICY_LIBRARY[policyKey].bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              {POLICY_LIBRARY[policyKey].sections.map((sec) => (
                <div key={sec.h} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm">{sec.h}</div>
                  <ul className="mt-2 list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    {sec.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 space-y-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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

      {/* Confirm reset modal */}
      <Modal
        open={confirmReset}
        title="Reset settings"
        subtitle="This restores defaults and clears local draft values."
        onClose={() => setConfirmReset(false)}
        footer={
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setConfirmReset(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={resetAll}>
              <Trash2 className="h-4 w-4" /> Reset
            </PrimaryButton>
          </div>
        }
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
          This action resets your settings view. It does not delete your marketplace data (campaigns, orders, ad history).
        </div>
      </Modal>

      {/* Confirm delete modal */}
      <Modal
        open={confirmDelete}
        title="Delete workspace"
        subtitle="High impact. Creates a support ticket and revokes access (demo)."
        onClose={() => setConfirmDelete(false)}
        footer={
          <div className="flex justify-end gap-2">
            <GhostButton onClick={() => setConfirmDelete(false)}>Cancel</GhostButton>
            <button
              type="button"
              onClick={deleteWorkspace}
              className="px-4 py-2 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-2 hover:brightness-95 active:brightness-90"
              style={{ background: "#ef4444" }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
            Deleting a workspace affects roles, team access, payout settings, and live staffing configuration.
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Production behavior recommendation:
            <ul className="mt-2 list-disc pl-4 space-y-1">
              <li>Require Owner + 2FA + recent re-auth.</li>
              <li>Create an immutable audit record.</li>
              <li>Soft-delete first; allow recovery window.</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <header className="shrink-0 z-40 bg-white dark:bg-slate-900/85 backdrop-blur border-b border-slate-200 dark:bg-slate-950/85 dark:border-slate-800">
        <div className="w-full px-[0.55%] py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white font-extrabold flex items-center justify-center">ML</div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50">Supplier Settings</h1>
              <div className="text-sm text-slate-500 dark:text-slate-400">Manage your business profile, verification, payouts, policies and security.</div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={saved ? "good" : "warn"}>
                  <span className={cx("h-1.5 w-1.5 rounded-full", saved ? "bg-emerald-500" : "bg-amber-500")} />
                  {saved ? "Saved" : "Saving…"}
                </Badge>

                <Badge tone="neutral">
                  <Users className="h-3.5 w-3.5" />
                  {accountType}
                </Badge>

                <Badge tone={kycTone(form.kyb.status)}>
                  <IdCard className="h-3.5 w-3.5" />
                  KYB: {String(form.kyb.status).replace("_", " ")}
                </Badge>

                <Badge tone={payoutTone(form.payout.verification.status)}>
                  <CreditCard className="h-3.5 w-3.5" />
                  Payout: {String(form.payout.verification.status).replace("_", " ")}
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
                window.open("https://support.mylivedealz.com", "_blank", "noreferrer");
              }}
            >
              <HelpCircle className="h-4 w-4" /> Help
            </GhostButton>

            <GhostButton
              onClick={() => {
                push("Opening Supplier onboarding (demo).", "success");
              }}
            >
              <ExternalLink className="h-4 w-4" /> Open onboarding
            </GhostButton>

            <PrimaryButton onClick={downloadData}>
              <Download className="h-4 w-4" /> Export data
            </PrimaryButton>
          </div>
        </div>

        <div className="w-full px-[0.55%] pb-3">
          <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">Account completeness</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {completeness.done}/{completeness.total} completed · Unlocks more campaigns and faster settlement.
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
        <aside className="hidden md:block w-64 shrink-0 overflow-y-auto custom-scrollbar border-r border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 dark:bg-slate-900/20 px-[0.55%] pt-4 pb-8 space-y-8">
          <div>
            <div className="px-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Settings</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 px-2 mb-3">Jump to a section</div>
            <div className="flex flex-col gap-1">
              {[
                { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
                { id: "profile", label: "Business Profile", icon: <FileText className="h-4 w-4" /> },
                { id: "team", label: "Team & Access", icon: <Users className="h-4 w-4" /> },
                { id: "socials", label: "Socials", icon: <Globe className="h-4 w-4" /> },
                { id: "collab", label: "Campaign Defaults", icon: <Sparkles className="h-4 w-4" /> },
                { id: "availability", label: "Availability", icon: <Calendar className="h-4 w-4" /> },
                { id: "kyb", label: "Verification & Security", icon: <IdCard className="h-4 w-4" /> },
                { id: "payouts", label: "Payouts & Tax", icon: <CreditCard className="h-4 w-4" /> },
                { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
                { id: "privacy", label: "Privacy & Blocking", icon: <Lock className="h-4 w-4" /> },
                { id: "policies", label: "Policies & Consent", icon: <ScrollText className="h-4 w-4" /> },
                { id: "data", label: "Data & Support", icon: <Download className="h-4 w-4" /> }
              ].map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:shadow-sm transition-all"
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
        <main className="flex-1 overflow-y-auto custom-scrollbar px-[0.55%] pt-4 pb-20 space-y-4">
          {/* Account */}
          <Card
            id="account"
            title="Account overview"
            subtitle="These settings power Roles & Permissions, Crew Management, payouts, and supplier trust."
            icon={<BadgeCheck className="h-5 w-5" />}
            right={
              <div className="flex items-center gap-2">
                {primarySocial ? (
                  <GhostButton onClick={copyPrimary}>
                    <Copy className="h-4 w-4" /> Copy primary
                  </GhostButton>
                ) : null}
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Supplier</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{form.profile.businessName || "(business name missing)"}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">@{form.profile.handle || "handle"}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Primary channel</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{primarySocial || "(not set)"}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">Country: {form.profile.country || "(not set)"}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">Payout method</div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 dark:text-white">{form.payout.method || "(not selected)"}</div>
                <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">Schedule: {form.payout.schedule}</div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Workspace mode</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {accountType === "Individual"
                      ? "Individual suppliers can run campaigns, but multi-user access becomes premium with Business/Enterprise mode."
                      : "Multi-user suppliers should manage access via Roles & Permissions and assign staff via Crew Manager."}
                  </div>
                </div>
                {accountType !== "Individual" ? (
                  <SoftButton
                    onClick={() => {
                      window.location.assign("/mldz/team/roles-permissions");
                    }}
                  >
                    <Users className="h-4 w-4" /> Roles & Permissions
                  </SoftButton>
                ) : (
                  <SoftButton
                    onClick={() => {
                      window.location.assign("/mldz/settings/my-subscriptions");
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Upgrade
                  </SoftButton>
                )}
              </div>
            </div>
          </Card>

          {/* Profile */}
          <Card id="profile" title="Business profile & brand" subtitle="These details appear on your Supplier profile and in creator collaboration surfaces." icon={<User className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Business name *">
                <Input value={form.profile.businessName} onChange={(e) => update("profile.businessName", e.target.value)} placeholder="Your store / company" />
              </Field>
              <Field label="Handle *" hint="Used in your supplier URL (letters, numbers, underscores).">
                <Input value={form.profile.handle} onChange={(e) => update("profile.handle", e.target.value)} placeholder="example: mylivedealzsupplier" />
              </Field>
              <Field label="Tagline">
                <Input value={form.profile.tagline} onChange={(e) => update("profile.tagline", e.target.value)} placeholder="Example: Premium electronics supplier for East Africa" />
              </Field>
              <Field label="Supplier model">
                <Select value={form.profile.supplierModel} onChange={(e) => update("profile.supplierModel", e.target.value)}>
                  {SUPPLIER_MODELS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </Select>
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
                <Field label="Business bio">
                  <Textarea
                    value={form.profile.bio}
                    onChange={(e) => update("profile.bio", e.target.value)}
                    placeholder="Tell creators what you sell, your margins/terms, and how you want content to convert."
                    rows={5}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Brand languages</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Used for routing creators and customer trust.</div>
                  </div>
                  <Badge tone="neutral">{(form.profile.brandLanguages || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <Chip key={l} label={l} active={(form.profile.brandLanguages || []).includes(l)} onClick={() => toggleInArray("profile.brandLanguages", l)} />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Target regions</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Where you deliver and want to grow via MyLiveDealz.</div>
                  </div>
                  <Badge tone="neutral">{(form.profile.targetRegions || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((r) => (
                    <Chip key={r} label={r} active={(form.profile.targetRegions || []).includes(r)} onClick={() => toggleInArray("profile.targetRegions", r)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <UploadMini title="Brand logo" helper="PNG/SVG recommended." value={form.profile.logoName} onPick={(name) => update("profile.logoName", name)} accept="image/*" />
              <UploadMini title="Brand kit" helper="PDF recommended (product catalog, guidelines)." value={form.profile.brandKitName} onPick={(name) => update("profile.brandKitName", name)} accept=".pdf,application/pdf" />
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Account type</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Individual, Business, or Enterprise. Multi-user accounts require compliance confirmation.</div>
                </div>
                <Badge tone={accountType === "Individual" ? "neutral" : "warn"}>{accountType}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                {["Individual", "Business", "Enterprise"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      update("profile.accountType", t);
                      if (t === "Individual") update("review.confirmMultiUserCompliance", false);
                      addAudit("Account type changed", t);
                      push("Account type updated.", "success");
                    }}
                    className={cx(
                      "px-4 py-3 rounded-3xl border text-left transition",
                      accountType === t
                        ? "bg-orange-50 dark:bg-orange-950"
                        : "bg-white dark:bg-slate-900 hover:bg-gray-50 dark:bg-slate-950 border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
                    )}
                    style={accountType === t ? { borderColor: ORANGE } : undefined}
                  >
                    <div className="text-sm">{t}</div>
                    <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                      {t === "Individual" ? "Solo supplier account." : t === "Business" ? "Company with internal staff." : "Multi-branch operations and approvals."}
                    </div>
                  </button>
                ))}
              </div>

              {accountType === "Business" ? (
                <div className="mt-3 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" /> Business profile
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Legal name">
                      <Input value={form.profile.business.legalName} onChange={(e) => update("profile.business.legalName", e.target.value)} placeholder="Registered company name" />
                    </Field>
                    <Field label="Registration number">
                      <Input value={form.profile.business.registrationNumber} onChange={(e) => update("profile.business.registrationNumber", e.target.value)} placeholder="Business registration ID" />
                    </Field>
                    <Field label="Website">
                      <Input value={form.profile.business.website} onChange={(e) => update("profile.business.website", e.target.value)} placeholder="https://" />
                    </Field>
                    <Field label="Company size">
                      <Select value={form.profile.business.size} onChange={(e) => update("profile.business.size", e.target.value)}>
                        {["1–5", "6–15", "16–50", "51–200", "200+"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Business address">
                        <Input value={form.profile.business.address} onChange={(e) => update("profile.business.address", e.target.value)} placeholder="Street / City / Country" />
                      </Field>
                    </div>
                    <UploadMini
                      title="Business logo (optional)"
                      value={form.profile.business.logoName}
                      onPick={(name) => update("profile.business.logoName", name)}
                      accept="image/*"
                    />
                  </div>
                </div>
              ) : null}

              {accountType === "Enterprise" ? (
                <div className="mt-3 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" /> Enterprise profile
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Company group">
                      <Input value={form.profile.enterprise.companyGroup} onChange={(e) => update("profile.enterprise.companyGroup", e.target.value)} placeholder="Group or holding name" />
                    </Field>
                    <Field label="Procurement contact">
                      <Input value={form.profile.enterprise.procurementContact} onChange={(e) => update("profile.enterprise.procurementContact", e.target.value)} placeholder="Name / email" />
                    </Field>
                    <Field label="Website">
                      <Input value={form.profile.enterprise.website} onChange={(e) => update("profile.enterprise.website", e.target.value)} placeholder="https://" />
                    </Field>
                    <UploadMini
                      title="Enterprise logo (optional)"
                      value={form.profile.enterprise.logoName}
                      onPick={(name) => update("profile.enterprise.logoName", name)}
                      accept="image/*"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Team & Access */}
          <Card id="team" title="Team & access" subtitle="Configure multi-user access and premium security posture." icon={<Users className="h-5 w-5" />}>
            {accountType === "Individual" ? (
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold">You’re on an Individual account.</div>
                    <div className="text-xs text-slate-600 mt-1 dark:text-slate-400">
                      You can still run campaigns, but roles/permissions, staff approvals and audit controls become premium with Business/Enterprise mode.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Roles & Permissions</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Control who can approve assets, accept proposals, manage contracts and payouts.</div>
                    </div>
                    <PrimaryButton onClick={() => window.location.assign("/mldz/team/roles-permissions")}>
                      <Users className="h-4 w-4" /> Open
                    </PrimaryButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Crew Manager</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Assign producers/moderators per session, detect conflicts, and keep an audit trail.</div>
                    </div>
                    <PrimaryButton onClick={() => window.location.assign("/mldz/team/crew-manager")}>
                      <Calendar className="h-4 w-4" /> Open
                    </PrimaryButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm font-semibold">Compliance confirmation</div>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">Required for multi-user accounts. Confirms staff follow platform rules.</div>
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
                      I confirm all team members under this {accountType.toLowerCase()} account have read and agreed to platform policies and terms.
                    </span>
                  </label>
                  {!form.review.confirmMultiUserCompliance ? <div className="mt-2 text-xs text-rose-600">Required to accept final terms for multi-user accounts.</div> : null}
                </div>
              </div>
            )}
          </Card>

          {/* Socials */}
          <Card id="socials" title="Social accounts" subtitle="Used for trust, creator matchmaking, and supplier verification." icon={<Globe className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold">Primary platform</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Where creators can verify your brand presence.</div>

                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Field label="Platform">
                    <Select value={form.socials.primaryPlatform} onChange={(e) => update("socials.primaryPlatform", e.target.value)}>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>

                  {form.socials.primaryPlatform === "other" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Field label="Other platform">
                        <Select value={form.socials.primaryOtherPlatform} onChange={(e) => update("socials.primaryOtherPlatform", e.target.value)}>
                          {OTHER_SOCIAL_OPTIONS.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Custom name" hint="If platform is Other">
                        <Input value={form.socials.primaryOtherCustomName} onChange={(e) => update("socials.primaryOtherCustomName", e.target.value)} placeholder="Example: WhatsApp Channel" />
                      </Field>
                      <div className="md:col-span-2">
                        <Field label="Handle / URL">
                          <Input value={form.socials.primaryOtherHandle} onChange={(e) => update("socials.primaryOtherHandle", e.target.value)} placeholder="@handle or link" />
                        </Field>
                      </div>
                    </div>
                  ) : null}

                  <Field label="Instagram">
                    <Input value={form.socials.instagram} onChange={(e) => update("socials.instagram", e.target.value)} placeholder="@yourbrand" />
                  </Field>
                  <Field label="TikTok">
                    <Input value={form.socials.tiktok} onChange={(e) => update("socials.tiktok", e.target.value)} placeholder="@yourbrand" />
                  </Field>
                  <Field label="YouTube">
                    <Input value={form.socials.youtube} onChange={(e) => update("socials.youtube", e.target.value)} placeholder="Channel URL" />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Extra socials</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Optional additional presence.</div>
                  </div>
                  <SoftButton
                    onClick={() => {
                      const next = [...(form.socials.extra || [])];
                      next.push({ platform: "LinkedIn", handle: "" });
                      update("socials.extra", next);
                      addAudit("Added extra social", "row");
                      push("Added social row.", "success");
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Add
                  </SoftButton>
                </div>

                <div className="mt-3 space-y-2">
                  {(form.socials.extra || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      No extra socials.
                    </div>
                  ) : (
                    (form.socials.extra || []).map((row, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                          <Field label="Platform">
                            <Select
                              value={row.platform}
                              onChange={(e) => {
                                const next = deepClone(form.socials.extra || []);
                                next[idx].platform = e.target.value;
                                update("socials.extra", next);
                              }}
                            >
                              {OTHER_SOCIAL_OPTIONS.map((x) => (
                                <option key={x} value={x}>
                                  {x}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Handle / URL">
                            <Input
                              value={row.handle}
                              onChange={(e) => {
                                const next = deepClone(form.socials.extra || []);
                                next[idx].handle = e.target.value;
                                update("socials.extra", next);
                              }}
                              placeholder="@handle or link"
                            />
                          </Field>
                          <div className="flex justify-end">
                            <GhostButton
                              onClick={() => {
                                const next = (form.socials.extra || []).filter((_, i) => i !== idx);
                                update("socials.extra", next);
                                addAudit("Removed extra social", row.platform);
                                push("Removed.", "success");
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> Remove
                            </GhostButton>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Campaign defaults */}
          <Card id="collab" title="Campaign defaults & matchmaking" subtitle="These preferences affect how suppliers run campaigns and how creators engage." icon={<Sparkles className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Product categories</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Used to match creators and suggest campaign templates.</div>
                  </div>
                  <Badge tone="neutral">{(form.preferences.productCategories || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((x) => (
                    <Chip key={x} label={x} active={(form.preferences.productCategories || []).includes(x)} onClick={() => toggleInArray("preferences.productCategories", x)} />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Service categories</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">If you sell services/consultations, choose your focus areas.</div>
                  </div>
                  <Badge tone="neutral">{(form.preferences.serviceCategories || []).length}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICE_CATEGORIES.map((x) => (
                    <Chip key={x} label={x} active={(form.preferences.serviceCategories || []).includes(x)} onClick={() => toggleInArray("preferences.serviceCategories", x)} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Content formats</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Defaults for campaign builder suggestions.</div>
                </div>
                <Badge tone="neutral">{(form.preferences.contentFormats || []).length}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTENT_FORMATS.map((x) => (
                  <Chip key={x} label={x} active={(form.preferences.contentFormats || []).includes(x)} onClick={() => toggleInArray("preferences.contentFormats", x)} />
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Budget presets</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Optional. Helps set consistent proposal ranges.</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Field label="Flat fee min">
                    <Input type="number" value={form.preferences.budget.flatFeeMin} onChange={(e) => update("preferences.budget.flatFeeMin", clampNumber(e.target.value, 0, 100000000))} placeholder="0" />
                  </Field>
                  <Field label="Flat fee max">
                    <Input type="number" value={form.preferences.budget.flatFeeMax} onChange={(e) => update("preferences.budget.flatFeeMax", clampNumber(e.target.value, 0, 100000000))} placeholder="0" />
                  </Field>
                  <Field label="Commission % min">
                    <Input type="number" value={form.preferences.budget.commissionMin} onChange={(e) => update("preferences.budget.commissionMin", clampNumber(e.target.value, 0, 90))} placeholder="5" />
                  </Field>
                  <Field label="Commission % max">
                    <Input type="number" value={form.preferences.budget.commissionMax} onChange={(e) => update("preferences.budget.commissionMax", clampNumber(e.target.value, 0, 90))} placeholder="20" />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Campaign defaults</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Applied to new campaigns (editable per campaign).</div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Field label="Creator Usage Decision (default)" hint="Required during campaign creation.">
                    <Select value={form.preferences.creatorUsageDefault} onChange={(e) => update("preferences.creatorUsageDefault", e.target.value)}>
                      {CREATOR_USAGE_DECISIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Collaboration Mode (default)">
                    <Select value={form.preferences.collabModeDefault} onChange={(e) => update("preferences.collabModeDefault", e.target.value)}>
                      {COLLAB_MODES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Content Approval (default)" hint="Manual: supplier approves before Admin. Auto: goes direct to Admin.">
                    <Select value={form.preferences.approvalModeDefault} onChange={(e) => update("preferences.approvalModeDefault", e.target.value)}>
                      {APPROVAL_MODES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <ToggleRow
                    label="Allow multiple creators per campaign"
                    hint="Enables multi-creator assignment + split deliverables."
                    checked={!!form.preferences.allowMultiCreator}
                    onChange={(v) => {
                      update("preferences.allowMultiCreator", v);
                      addAudit("Multi-creator preference updated", v ? "on" : "off");
                    }}
                  />

                  <ToggleRow
                    label="Allow switching collab mode before submission"
                    hint="Supports switching Open Collabs ↔ Invite-only before content submission stage."
                    checked={!!form.preferences.allowModeSwitchBeforeSubmission}
                    onChange={(v) => {
                      update("preferences.allowModeSwitchBeforeSubmission", v);
                      addAudit("Mode switching updated", v ? "on" : "off");
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="text-sm">Notes to creators (default)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">This is shown in opportunity boards and invite-only proposals.</div>
              <div className="mt-2">
                <Textarea value={form.preferences.notesToCreators} onChange={(e) => update("preferences.notesToCreators", e.target.value)} placeholder="Example: Include pricing, key benefits, warranty, delivery timeline. Avoid medical claims." rows={4} />
              </div>
            </div>
          </Card>

          {/* Availability */}
          <Card id="availability" title="Availability & calendar" subtitle="Used by Crew Manager and creators to schedule live sessions without conflicts." icon={<Calendar className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm">Default availability</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Operational window (can be overridden per session).</div>

                <div className="mt-3">
                  <div className="text-sm">Days</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <Chip
                        key={d}
                        label={d}
                        active={(form.settings.calendar.days || []).includes?.(d) || false}
                        onClick={() => {
                          // Store days inside calendar for supplier
                          const path = "settings.calendar.days";
                          const current = Array.isArray(form.settings.calendar.days) ? form.settings.calendar.days : [];
                          const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
                          update(path, next);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <Field label="Time window">
                    <Input
                      value={form.settings.calendar.timeWindow || "18:00–22:00"}
                      onChange={(e) => update("settings.calendar.timeWindow", e.target.value)}
                      placeholder="18:00–22:00"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
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
                      push(v ? "Google Calendar connected (demo)." : "Google Calendar disconnected (demo).", "success");
                    }}
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  <div className="font-semibold">Premium behavior</div>
                  <ul className="mt-1 list-disc pl-4 space-y-1">
                    <li>Producers see warnings if a member is booked in another live session.</li>
                    <li>Owners can see team availability if they have permission ("View team availability").</li>
                    <li>Guest creators can share availability without full workspace access (policy-limited).</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* KYB & Security */}
          <Card
            id="kyb"
            title="Verification & security"
            subtitle="KYB and device security help protect settlements and reduce platform risk."
            icon={<IdCard className="h-5 w-5" />}
            right={
              <Badge tone={kycTone(form.kyb.status)}>
                <IdCard className="h-3.5 w-3.5" />
                {String(form.kyb.status).replace("_", " ")}
              </Badge>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Business verification</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Upload documents to unlock verified status and smoother payouts.</div>
                  </div>
                  <SoftButton
                    onClick={() => {
                      update("kyb.status", "in_review");
                      addAudit("KYB submitted", "in_review");
                      push("KYB submitted for review.", "success");
                    }}
                  >
                    <BadgeCheck className="h-4 w-4" /> Submit
                  </SoftButton>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Entity type">
                    <Select value={form.kyb.entityType} onChange={(e) => update("kyb.entityType", e.target.value)}>
                      {["Individual", "Business"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Representative name">
                    <Input value={form.kyb.representativeName} onChange={(e) => update("kyb.representativeName", e.target.value)} placeholder="Legal representative" />
                  </Field>

                  <UploadMini
                    title="Registration document"
                    helper={form.kyb.registrationUploaded ? "Uploaded" : "Required"}
                    value={form.kyb.registrationFileName}
                    onPick={(name) => {
                      update("kyb.registrationFileName", name);
                      update("kyb.registrationUploaded", true);
                      addAudit("KYB doc uploaded", "Registration");
                    }}
                  />
                  <UploadMini
                    title="Tax certificate"
                    helper={form.kyb.taxUploaded ? "Uploaded" : "Recommended"}
                    value={form.kyb.taxFileName}
                    onPick={(name) => {
                      update("kyb.taxFileName", name);
                      update("kyb.taxUploaded", true);
                      addAudit("KYB doc uploaded", "Tax");
                    }}
                  />
                  <UploadMini
                    title="Director/Owner ID"
                    helper={form.kyb.idUploaded ? "Uploaded" : "Required"}
                    value={form.kyb.idFileName}
                    onPick={(name) => {
                      update("kyb.idFileName", name);
                      update("kyb.idUploaded", true);
                      addAudit("KYB doc uploaded", "ID");
                    }}
                  />
                  <UploadMini
                    title="Address proof"
                    helper={form.kyb.addressUploaded ? "Uploaded" : "Optional"}
                    value={form.kyb.addressFileName}
                    onPick={(name) => {
                      update("kyb.addressFileName", name);
                      update("kyb.addressUploaded", true);
                      addAudit("KYB doc uploaded", "Address proof");
                    }}
                  />

                  {accountType !== "Individual" ? (
                    <UploadMini
                      title="Authorization letter"
                      helper={form.kyb.authorizationUploaded ? "Uploaded" : "Recommended"}
                      value={form.kyb.authorizationFileName}
                      onPick={(name) => {
                        update("kyb.authorizationFileName", name);
                        update("kyb.authorizationUploaded", true);
                        addAudit("KYB doc uploaded", "Authorization");
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-sm">Account security</div>
                  <div className="mt-2 space-y-2">
                    <ToggleRow
                      label="Two-factor authentication (2FA)"
                      hint="Recommended. Required for sensitive actions and payouts."
                      checked={!!form.kyb.twoFactor}
                      onChange={(v) => {
                        update("kyb.twoFactor", v);
                        addAudit("2FA updated", v ? "enabled" : "disabled");
                        push(v ? "2FA enabled." : "2FA disabled.", v ? "success" : "warn");
                      }}
                    />
                    {!form.kyb.twoFactor ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <div>
                          <div className="font-semibold">2FA is off</div>
                          <div className="mt-0.5">This can increase settlement holds and reduce trust score.</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm">Devices</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Manage active sessions.</div>
                    </div>
                    <GhostButton onClick={signOutEverywhere}>
                      <Lock className="h-4 w-4" /> Sign out all
                    </GhostButton>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(form.settings.devices || []).length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No active devices.</div>
                    ) : (
                      (form.settings.devices || []).map((d) => (
                        <div key={d.id} className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 flex items-center justify-between gap-2 dark:border-slate-700 dark:bg-slate-800">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-900 truncate dark:text-white">{d.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Last active: {d.lastActive}</div>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700"
                            onClick={() => logoutDevice(d.id)}
                          >
                            Sign out
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm font-semibold">Audit log (recent)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">High-signal events only (uploads, terms, policies, payouts).</div>
                  <div className="mt-3 space-y-2">
                    {(form.settings.audit || []).length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No events yet.</div>
                    ) : (
                      (form.settings.audit || []).slice(0, 6).map((a) => (
                        <div key={a.id} className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{a.what}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{a.when}</div>
                          </div>
                          {a.meta ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{a.meta}</div> : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Payouts */}
          <Card
            id="payouts"
            title="Payouts & tax"
            subtitle="Configure where you get paid and review settlement rules before accepting."
            icon={<CreditCard className="h-5 w-5" />}
            right={
              <Badge tone={payoutTone(form.payout.verification.status)}>
                <CreditCard className="h-3.5 w-3.5" />
                {String(form.payout.verification.status).replace("_", " ")}
              </Badge>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm">Payout method</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Choose where settlements should go.</div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PAYOUT_METHODS.map((m) => {
                    const active = form.payout.method === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        className={cx(
                          "rounded-3xl border p-3 text-left transition",
                          active
                            ? "bg-orange-50 dark:bg-orange-950"
                            : "bg-white dark:bg-slate-900 border-slate-200 hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800"
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

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Currency">
                    <Select value={form.payout.currency} onChange={(e) => update("payout.currency", e.target.value)}>
                      {["UGX", "KES", "TZS", "USD", "EUR", "CNY"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Schedule">
                    <Select value={form.payout.schedule} onChange={(e) => update("payout.schedule", e.target.value)}>
                      {["Daily", "Weekly", "Biweekly", "Monthly"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Minimum threshold">
                    <Input type="number" value={form.payout.minThreshold} onChange={(e) => update("payout.minThreshold", clampNumber(e.target.value, 0, 1000000000))} />
                  </Field>
                  <Field label="Creator payout release">
                    <Select value={form.payout.creatorPayoutRelease} onChange={(e) => update("payout.creatorPayoutRelease", e.target.value)}>
                      {["Manual", "Auto"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {form.payout.creatorPayoutRelease === "Manual" ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    Manual payout release recommended when you require supplier-side review of creator deliverables.
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Auto release sends creator payouts after required approvals are completed.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm font-semibold">Payout details</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Fields change based on the method chosen.</div>

                  {!form.payout.method ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Select a payout method to configure details.
                    </div>
                  ) : null}

                  {form.payout.method === "Bank" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Bank name">
                        <Input value={form.payout.bank.bankName} onChange={(e) => update("payout.bank.bankName", e.target.value)} placeholder="Bank" />
                      </Field>
                      <Field label="Account name">
                        <Input value={form.payout.bank.accountName} onChange={(e) => update("payout.bank.accountName", e.target.value)} placeholder="Name" />
                      </Field>
                      <Field label="Account number">
                        <Input value={form.payout.bank.accountNumber} onChange={(e) => update("payout.bank.accountNumber", e.target.value)} placeholder="123" />
                      </Field>
                      <Field label="SWIFT">
                        <Input value={form.payout.bank.swift} onChange={(e) => update("payout.bank.swift", e.target.value)} placeholder="SWIFT" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "Mobile Money" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Provider">
                        <Select value={form.payout.mobile.provider} onChange={(e) => update("payout.mobile.provider", e.target.value)}>
                          {["MTN", "Airtel", "M-Pesa", "Other"].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Number">
                        <Input value={form.payout.mobile.number} onChange={(e) => update("payout.mobile.number", e.target.value)} placeholder="+256" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "PayPal / Wallet" ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Wallet provider">
                        <Select value={form.payout.wallet.provider} onChange={(e) => update("payout.wallet.provider", e.target.value)}>
                          {["PayPal", "Stripe", "Wise", "Other"].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Email">
                        <Input value={form.payout.wallet.email} onChange={(e) => update("payout.wallet.email", e.target.value)} placeholder="email@" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "AliPay" ? (
                    <div className="mt-3">
                      <Field label="AliPay account ID">
                        <Input value={form.payout.alipay.accountId} onChange={(e) => update("payout.alipay.accountId", e.target.value)} placeholder="AliPay ID" />
                      </Field>
                    </div>
                  ) : null}

                  {form.payout.method === "WeChat Pay" ? (
                    <div className="mt-3">
                      <Field label="WeChat Pay account ID">
                        <Input value={form.payout.wechat.accountId} onChange={(e) => update("payout.wechat.accountId", e.target.value)} placeholder="WeChat ID" />
                      </Field>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">Payout verification</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Verification codes protect payouts and payout edits.</div>
                    </div>
                    <Badge tone={payoutTone(form.payout.verification.status)}>{form.payout.verification.status}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Code delivery method">
                      <Select
                        value={form.payout.verification.method || "Email"}
                        onChange={(e) => update("payout.verification.method", e.target.value)}
                      >
                        {["Email", "SMS", "WhatsApp"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Send to">
                      <Input
                        value={form.payout.verification.lastSentTo || ""}
                        onChange={(e) => update("payout.verification.lastSentTo", e.target.value)}
                        placeholder="email or phone"
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SoftButton
                      onClick={() => {
                        if (!form.payout.verification.lastSentTo) {
                          push("Enter where to send the verification code.", "warn");
                          return;
                        }
                        update("payout.verification.status", "code_sent");
                        addAudit("Verification code sent", `${form.payout.verification.method || "Email"} → ${form.payout.verification.lastSentTo}`);
                        push("Verification code sent (demo).", "success");
                      }}
                    >
                      <ShieldCheck className="h-4 w-4" /> Send code
                    </SoftButton>

                    <PrimaryButton
                      onClick={() => {
                        update("payout.verification.status", "verified");
                        addAudit("Payout method verified", form.payout.method || "" );
                        push("Payout verified.", "success");
                      }}
                      disabled={form.payout.verification.status === "verified"}
                    >
                      <Check className="h-4 w-4" /> Mark verified
                    </PrimaryButton>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Delivery guidance: Email is fastest. SMS/WhatsApp may depend on carrier and region.
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-sm font-semibold">Tax</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Tax residency">
                      <Input value={form.payout.tax.residency} onChange={(e) => update("payout.tax.residency", e.target.value)} placeholder="Country" />
                    </Field>
                    <Field label="Tax ID">
                      <Input value={form.payout.tax.taxId} onChange={(e) => update("payout.tax.taxId", e.target.value)} placeholder="TIN" />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card id="notifications" title="Notifications" subtitle="Control what we send you and your team." icon={<Bell className="h-5 w-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold">Core alerts</div>
                <div className="mt-3 space-y-2">
                  {[
                    ["proposals", "Proposals", "New proposals, counter-terms, and negotiation events."],
                    ["contracts", "Contracts", "Contract created, signed, or terminated."],
                    ["deliverables", "Deliverables", "Creator submissions, approvals, changes requested."],
                    ["liveReminders", "Live reminders", "Live schedule changes and go-live reminders."],
                    ["payouts", "Payouts", "Settlement and payout status changes."],
                    ["securityAlerts", "Security alerts", "Login alerts, device changes, 2FA events."],
                    ["calendarUpdates", "Calendar updates", "Staffing conflicts, calendar sync updates."],
                    ["weeklyDigest", "Weekly digest", "Summary of campaign performance and status."],
                    ["platformNews", "Platform news", "New features and policy updates." ]
                  ].map(([k, label, hint]) => (
                    <ToggleRow
                      key={k}
                      label={label}
                      hint={hint}
                      checked={!!form.settings.notifications[k]}
                      onChange={(v) => {
                        update(`settings.notifications.${k}`, v);
                        addAudit("Notification preference updated", `${label}: ${v ? "on" : "off"}`);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Delivery channels (preview)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Wire to Email/SMS/WhatsApp settings in production.</div>
                <div className="mt-3 space-y-2">
                  <ToggleRow label="Email" hint="Recommended" checked={true} onChange={() => push("Email channel is always enabled in this preview.", "info")} disabled />
                  <ToggleRow label="SMS" hint="Optional" checked={false} onChange={() => push("Configure SMS in integrations.", "info")} disabled />
                  <ToggleRow label="WhatsApp" hint="Optional" checked={false} onChange={() => push("Configure WhatsApp in integrations.", "info")} disabled />
                </div>
              </div>
            </div>
          </Card>

          {/* Privacy */}
          <Card id="privacy" title="Privacy & blocking" subtitle="Control visibility and manage blocked creators/agencies." icon={<Lock className="h-5 w-5" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold">Privacy controls</div>

                <div className="mt-3 space-y-2">
                  <Field label="Store visibility">
                    <Select value={form.settings.privacy.storeVisibility} onChange={(e) => update("settings.privacy.storeVisibility", e.target.value)}>
                      {["Public", "Creators only", "Private"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Direct messages">
                    <Select value={form.settings.privacy.allowDMsFrom} onChange={(e) => update("settings.privacy.allowDMsFrom", e.target.value)}>
                      {["All creators", "Verified creators only", "None"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <ToggleRow
                    label="Allow external guest co-hosts"
                    hint="Enable inviting creators to join Live sessions with limited access."
                    checked={!!form.settings.privacy.allowExternalGuests}
                    onChange={(v) => {
                      update("settings.privacy.allowExternalGuests", v);
                      addAudit("External guest access updated", v ? "on" : "off");
                    }}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm">Blocked creators/agencies</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">They won’t be able to pitch, invite, or message you.</div>
                  </div>
                  <Badge tone="neutral">{(form.settings.privacy.blockedCreators || []).length}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Input value={newBlockedCreator} onChange={(e) => setNewBlockedCreator(e.target.value)} placeholder="Type creator name" />
                  <PrimaryButton onClick={addBlockedCreator}>Block</PrimaryButton>
                </div>

                <div className="mt-3 space-y-2">
                  {(form.settings.privacy.blockedCreators || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">No blocked creators.</div>
                  ) : (
                    (form.settings.privacy.blockedCreators || []).map((s) => (
                      <div key={s} className="rounded-2xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 flex items-center justify-between gap-2 dark:border-slate-700 dark:bg-slate-800">
                        <div className="text-sm text-slate-900 truncate dark:text-white">{s}</div>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 text-sm hover:bg-gray-50 dark:bg-slate-950 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-700"
                          onClick={() => removeBlockedCreator(s)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Policies */}
          <Card id="policies" title="Policies & consent" subtitle="Review policies and manage consent (with scroll-to-bottom confirmation)." icon={<ScrollText className="h-5 w-5" />}>
            <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm">Policy sections</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Open each policy section or scroll the full document to the end to enable final consent.</div>
                </div>
                <Badge tone={allPoliciesSeen ? "good" : "warn"}>{allPoliciesSeen ? "Ready" : "Review required"}</Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">
                {Object.keys(POLICY_LIBRARY).map((k) => {
                  const seen = k === "payout" ? !!form.payout.acceptPayoutPolicy || !!form.review.seenPolicies.payout : !!form.review.seenPolicies[k];
                  const lib = POLICY_LIBRARY[k];
                  const icon = k === "platform" ? <ShieldCheck className="h-4 w-4" /> : k === "content" ? <Globe className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />;

                  return (
                    <div
                      key={k}
                      className={cx(
                        "rounded-3xl border p-3",
                        seen ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-7 w-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
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
                          className="px-3 py-2 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 text-sm hover:bg-gray-50 dark:bg-slate-950 inline-flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
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

              {/* Final terms acceptance (missing in Creator file; added here) */}
              <div className="mt-4 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Final consent</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Accept terms after reviewing policies. Multi-user accounts require compliance confirmation.
                    </div>
                  </div>
                  <Badge tone={form.review.acceptTerms ? "good" : canAcceptFinalTerms() ? "warn" : "neutral"}>
                    {form.review.acceptTerms ? "Accepted" : canAcceptFinalTerms() ? "Ready" : "Blocked"}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={!!form.review.acceptTerms}
                      onChange={(e) => {
                        if (e.target.checked) acceptFinalTerms();
                        else {
                          update("review.acceptTerms", false);
                          update("review.acceptedAt", undefined);
                          addAudit("Terms unaccepted", "toggled off");
                          push("Terms set to pending.", "warn");
                        }
                      }}
                      disabled={!form.review.acceptTerms && !canAcceptFinalTerms()}
                    />
                    <span>
                      I accept MyLiveDealz Supplier Terms and confirm I will enforce campaign-level approvals and creator collaboration rules.
                    </span>
                  </label>

                  <div className="flex gap-2 justify-end">
                    <GhostButton onClick={() => openPolicyModal("full")}>
                      <ScrollText className="h-4 w-4" /> Full doc
                    </GhostButton>
                    <PrimaryButton onClick={acceptFinalTerms} disabled={form.review.acceptTerms || !canAcceptFinalTerms()}>
                      <ShieldCheck className="h-4 w-4" /> Accept terms
                    </PrimaryButton>
                  </div>
                </div>

                {!canAcceptFinalTerms() && !form.review.acceptTerms ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    Required: review platform + content policies, accept payout policy, and (for Business/Enterprise) confirm multi-user compliance.
                  </div>
                ) : null}

                {form.review.acceptedAt ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Accepted at: {form.review.acceptedAt}</div> : null}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <GhostButton
                  onClick={() => {
                    push("Support chat opened (demo).", "success");
                    addAudit("Support contacted", "Supplier Success");
                  }}
                >
                  <HelpCircle className="h-4 w-4" /> Contact support
                </GhostButton>
              </div>
            </div>
          </Card>

          {/* Data & Support (missing in creator file; added here) */}
          <Card id="data" title="Data & support" subtitle="Export, reset, report issues, and manage critical actions." icon={<Download className="h-5 w-5" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Export</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Download your supplier settings (JSON).</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PrimaryButton onClick={downloadData}>
                    <Download className="h-4 w-4" /> Export JSON
                  </PrimaryButton>
                  <GhostButton
                    onClick={() => {
                      push("Copying JSON (demo).", "success");
                      try {
                        navigator.clipboard?.writeText(JSON.stringify(form, null, 2));
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copy JSON
                  </GhostButton>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gray-50 dark:bg-slate-950 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm font-semibold">Support</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Report policy issues, abuse, disputes, or payout problems.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <GhostButton onClick={() => window.open("https://support.mylivedealz.com", "_blank", "noreferrer")}>
                    <HelpCircle className="h-4 w-4" /> Open support
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      push("Incident report created (demo).", "success");
                      addAudit("Incident reported", "Deliverables / disputes");
                    }}
                  >
                    <AlertTriangle className="h-4 w-4" /> Report incident
                  </GhostButton>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold">Reset</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Restore defaults for this settings page.</div>
                <div className="mt-3">
                  <GhostButton onClick={() => setConfirmReset(true)}>
                    <Trash2 className="h-4 w-4" /> Reset settings
                  </GhostButton>
                </div>
              </div>

              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-900/10">
                <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">Danger zone</div>
                <div className="text-xs text-rose-800 dark:text-rose-300">High-impact actions should require re-auth + 2FA in production.</div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2 rounded-2xl text-white text-sm font-semibold inline-flex items-center gap-2 hover:brightness-95 active:brightness-90"
                    style={{ background: "#ef4444" }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete workspace
                  </button>
                </div>
              </div>
            </div>
          </Card>

          <footer className="py-6 text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} MyLiveDealz · Supplier Settings (controlled mirror preview)</footer>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------ Lightweight self-tests ------------------------------ */
// To run in dev console: window.__MLDZ_TESTS__ = true; location.reload();
if (typeof window !== "undefined" && window.__MLDZ_TESTS__) {
  const assert = (cond, msg) => {
    if (!cond) throw new Error(`SupplierSettingsSafetyPage test failed: ${msg}`);
  };

  assert(typeof ORANGE === "string" && ORANGE.length > 0, "orange exists");
  assert(typeof cx("a", false && "b", "c") === "string", "cx works");
  assert(typeof defaultForm === "function", "defaultForm exists");

  console.log("✅ SupplierSettingsSafetyPage self-tests passed");
}
