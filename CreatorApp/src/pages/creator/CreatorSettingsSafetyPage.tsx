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
  Pencil,
  Trash2,
  Upload,
  User,
  Users,
  X
} from "lucide-react";
import { creatorApi } from "../../lib/creatorApi";

/**
 * Creator Settings & Safety (Premium)
 * - Designed to work with the Premium Onboarding flow (v2.5) using backend onboarding + workflow state.
 * - Uses Orange as the primary color to match Roles & Permissions.
 * - Adds a compliance-friendly "scroll-to-bottom to enable consent" pattern for policy review inside Settings.
 *
 * NOTE: This is a UI preview. Replace policy text with final legal copy before production.
 */

const ORANGE = "#f77f00";
const GREEN = "#03cd8c";
// const LIGHT_GREY = "#f2f2f2"; // Kept for reference but often overridden by dark mode classes


const SETTINGS_SCREEN_STATE_KEY = "creator-settings";

function cx(...xs: (string | undefined | null | false)[]) {
  return xs.filter(Boolean).join(" ");
}

function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function lookupLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const record = entry as Record<string, unknown>;
        return String(record.label || record.title || record.value || "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function lookupPayoutMethodCards(
  value: unknown
): Array<{ key: string; title: string; desc: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const key = String(record.key || record.value || "").trim();
      const title = String(record.title || record.label || key).trim();
      const desc = String(record.desc || record.helper || "").trim();
      if (!key || !title) return null;
      return { key, title, desc };
    })
    .filter((entry): entry is { key: string; title: string; desc: string } => Boolean(entry));
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

interface UploadedFileRef {
  id: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  extension?: string;
  storageKey?: string;
  url?: string | null;
  status?: string;
  createdAt?: string;
  purpose?: string;
  fieldKey?: string;
  previewUrl?: string | null;
}

interface SettingsForm {
  profile: Profile;
  socials: Socials;
  preferences: Preferences;
  kyc: Kyc;
  payout: Payout;
  settings: Settings;
  review: Review;
  uploads: Record<string, UploadedFileRef>;
}

type LegacyOnboardingCompat = SettingsForm & {
  docs?: {
    list?: Array<Record<string, unknown>>;
  };
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

interface EditableFieldShellProps {
  editing: boolean;
  value: string;
  placeholder: string;
  onEdit: () => void;
  onDone: () => void;
  multiline?: boolean;
  children: React.ReactNode;
}

function EditableFieldShell({
  editing,
  value,
  placeholder,
  onEdit,
  onDone,
  multiline = false,
  children
}: EditableFieldShellProps) {
  const hasValue = String(value || "").trim().length > 0;

  if (editing) {
    return (
      <div className="space-y-2">
        {children}
        <div className="flex justify-end">
          <GhostButton className="px-2.5 py-1.5 text-xs" onClick={onDone}>
            <Check className="h-3.5 w-3.5" /> Done
          </GhostButton>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cx(
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-amber-300 hover:bg-amber-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-amber-700 dark:hover:bg-slate-800",
        multiline ? "min-h-[124px]" : "min-h-[44px]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cx(
            "min-w-0 text-sm",
            hasValue ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500",
            multiline ? "whitespace-pre-wrap pr-2" : "truncate"
          )}
        >
          {hasValue ? value : placeholder}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Pencil className="h-3 w-3" /> Edit
        </span>
      </div>
    </button>
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
  previewUrl?: string | null;
  mimeType?: string;
  onPick: (val: string) => void;
  onFilePick?: (file: File) => void;
  accept?: string;
}

function UploadMini({ title, helper, value, previewUrl, mimeType, onPick, onFilePick, accept = "*/*" }: UploadMiniProps) {
  const previewHref = typeof previewUrl === "string" ? previewUrl.trim() : "";
  const canPreviewImage = Boolean(previewHref) && isImageLike(mimeType, value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-amber-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
          {helper ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{helper}</div> : null}
          {canPreviewImage ? (
            <div className="mt-3 h-28 w-full max-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <img src={previewHref} alt={`${title} preview`} className="h-full w-full object-cover" />
            </div>
          ) : null}
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
              if (file) {
                onPick(file.name);
                onFilePick?.(file);
              }
              // reset so the same file can be picked again
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function fileKindFromMime(mimeType: string) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.includes("pdf") || normalized.startsWith("text/") || normalized.includes("document")) return "document";
  return "other";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImagePreviewDataUrl(file: File): Promise<string> {
  const isImage = String(file.type || "").toLowerCase().startsWith("image/");
  if (!isImage) return Promise.resolve("");

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxSide = 1200;
        const longest = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1);
        const scale = Math.min(1, maxSide / longest);
        const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
        const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve("");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const preview = canvas.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(objectUrl);
        resolve(preview.startsWith("data:image/") ? preview : "");
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve("");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("");
    };
    img.src = objectUrl;
  });
}

function formatFileSize(sizeBytes?: number) {
  if (!sizeBytes || sizeBytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = sizeBytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isImageLike(mimeType?: string, fileName?: string) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = String(fileName || "").toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".avif"].some((ext) => name.endsWith(ext));
}

interface FileDetailItem {
  label: string;
  fieldKey: string;
  fileName?: string;
}

function UploadedFilesPanel({
  title,
  items,
  uploads
}: {
  title: string;
  items: FileDetailItem[];
  uploads: Record<string, UploadedFileRef>;
}) {
  const rows = items.filter((item) => {
    const record = uploads[item.fieldKey];
    return Boolean(record?.name || item.fileName);
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        File IDs and upload details for currently selected documents.
      </div>
      {rows.length === 0 ? (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No file details yet.</div>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((item) => {
            const record = uploads[item.fieldKey];
            const createdAt = record?.createdAt ? new Date(record.createdAt).toLocaleString() : "—";
            const previewHref = record?.previewUrl || record?.url || "";
            const canPreviewImage = Boolean(previewHref) && isImageLike(record?.mimeType, record?.name || item.fileName);
            return (
              <div
                key={item.fieldKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.label}</div>
                <div className="mt-1 flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 flex-1">
                    <div>File ID: <span className="font-medium">{record?.id || "—"}</span></div>
                    <div>Name: <span className="font-medium">{record?.name || item.fileName || "—"}</span></div>
                    <div>Type: <span className="font-medium">{record?.mimeType || "—"}</span></div>
                    <div>Size: <span className="font-medium">{formatFileSize(record?.sizeBytes)}</span></div>
                    <div>Uploaded: <span className="font-medium">{createdAt}</span></div>
                    <div>Status: <span className="font-medium">{record?.status || "selected"}</span></div>
                    <div className="md:col-span-2">
                      Preview:
                      {previewHref ? (
                        <a
                          href={previewHref}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1 font-medium text-amber-700 dark:text-amber-400 underline"
                        >
                          Open file
                        </a>
                      ) : (
                        <span className="ml-1 font-medium">Unavailable</span>
                      )}
                    </div>
                  </div>
                  {canPreviewImage ? (
                    <div className="h-20 w-20 rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900">
                      <img
                        src={previewHref}
                        alt={`${item.label} preview`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Options (mirrors Onboarding v2.5) ---------- */

const TEAM_TYPES = ["Seller team", "Provider team", "Production crew", "Brand team", "Other"];
const AGENCY_TYPES = ["Talent / influencer agency", "Marketing agency", "Seller network", "Provider network", "Other"];
const ORG_SIZES = ["1–5", "6–15", "16–50", "51–200", "200+"];

const OTHER_SOCIAL_OPTIONS = ["Facebook", "X (Twitter)", "Snapchat", "Kwai", "LinkedIn", "Twitch", "Pinterest", "Other"];

const COLLAB_MODELS = ["Flat fee", "Commission", "Hybrid"];

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
      visibility: "",
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
      profileVisibility: "",
      allowDMsFrom: "",
      allowExternalGuests: true,
      blockedSellers: []
    },
    devices: [],
    audit: []
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
      timezone: "",
      currency: "",
      contentLanguages: [],
      audienceRegions: [],
      profilePhotoName: "",
      mediaKitName: "",
      team: {
        name: "",
        type: "",
        size: "",
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
      primaryOtherPlatform: "",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: [] // [{ platform, handle }]
    },
    kyc: {
      status: "unverified", // unverified | in_review | verified | rejected
      documentType: "",
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
      currency: "",
      schedule: "",
      minThreshold: "",
      acceptPayoutPolicy: false,
      verification: {
        status: "unverified", // unverified | code_sent | verified
        lastSentTo: ""
      },
      bank: { bankName: "", accountName: "", accountNumber: "", swift: "" },
      mobile: { provider: "", number: "" },
      wallet: { provider: "", email: "" },
      alipay: { name: "", accountId: "" },
      wechat: { name: "", accountId: "", phone: "" },
      tax: { residency: "", taxId: "" }
    },
    preferences: {
      lines: [],
      formats: [],
      models: [],
      availability: {
        days: [],
        timeWindow: ""
      },
      rateCard: { flatFee: "", commissionPct: "" },
      inviteRules: "",
      supplierType: ""
    },
    review: {
      seenPolicies: { platform: false, content: false, payout: false },
      scrolledToBottom: false,
      confirmMultiUserCompliance: false,
      acceptTerms: false,
      acceptedAt: ""
    },
    settings: defaultSettings(),
    uploads: {}
  };
}

function isFilled(v: unknown): boolean {
  return String(v || "").trim().length > 0;
}

function normalizeEmail(value: unknown): string | undefined {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return undefined;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  return ok ? text : undefined;
}

const RESERVED_SLUGS = new Set([
  "admin",
  "support",
  "help",
  "market",
  "marketplace",
  "seller",
  "buyers",
  "checkout",
  "evzone",
  "evzonepay",
  "terms",
  "privacy",
  "policies",
  "settings",
  "billing"
]);

function normalizeHandleToSlug(value: unknown) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!slug) return "creator";
  if (RESERVED_SLUGS.has(slug)) return `${slug}-creator`;
  return slug;
}

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function safeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeText(entry))
    .filter((entry) => entry.length > 0);
}

function safeFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const DOC_FIELD_KEY_MAP: Record<string, string> = {
  "government-id": "kyc.idFileName",
  government_id: "kyc.idFileName",
  "selfie-verification": "kyc.selfieFileName",
  selfie_verification: "kyc.selfieFileName",
  "address-proof": "kyc.addressFileName",
  address_proof: "kyc.addressFileName",
  "org-registration": "kyc.org.registrationName",
  organization_registration: "kyc.org.registrationName",
  "org-tax": "kyc.org.taxName",
  organization_tax: "kyc.org.taxName",
  "org-authorization": "kyc.org.authorizationName",
  organization_authorization: "kyc.org.authorizationName",
  profile_photo: "profile.profilePhotoName",
  media_kit: "profile.mediaKitName",
  team_logo: "profile.team.logoName",
  agency_logo: "profile.agency.logoName"
};

function mapDocFieldKey(doc: Record<string, unknown>) {
  const idKey = String(doc.id || "").trim().toLowerCase();
  if (idKey && DOC_FIELD_KEY_MAP[idKey]) {
    return DOC_FIELD_KEY_MAP[idKey];
  }
  const typeKey = String(doc.type || "").trim().toLowerCase();
  if (typeKey && DOC_FIELD_KEY_MAP[typeKey]) {
    return DOC_FIELD_KEY_MAP[typeKey];
  }
  return "";
}

function uploadedRefFromDoc(doc: Record<string, unknown>, fieldKey: string): UploadedFileRef {
  const fileUrl = typeof doc.fileUrl === "string" ? doc.fileUrl : null;
  return {
    id: String(doc.id || `${fieldKey}-${Date.now()}`),
    name: String(doc.name || doc.file || ""),
    mimeType: String(doc.mimeType || ""),
    sizeBytes: typeof doc.sizeBytes === "number" ? doc.sizeBytes : undefined,
    extension: String(doc.extension || ""),
    storageKey: String(doc.storageKey || ""),
    url: fileUrl,
    status: String(doc.status || "submitted"),
    createdAt: String(doc.uploadedAt || ""),
    purpose: String(doc.type || ""),
    fieldKey,
    previewUrl: fileUrl
  };
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

  if (!next.uploads || typeof next.uploads !== "object") {
    next.uploads = {};
  }

  const docList = Array.isArray(rawInput.docs?.list) ? rawInput.docs.list : [];
  docList.forEach((doc) => {
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) return;
    const row = doc as Record<string, unknown>;
    const fieldKey = mapDocFieldKey(row);
    if (!fieldKey) return;
    const fileName = String(row.name || row.file || "").trim();
    if (!fileName) return;
    if (fieldKey === "kyc.idFileName") {
      next.kyc.idFileName = fileName;
      next.kyc.idUploaded = true;
    } else if (fieldKey === "kyc.selfieFileName") {
      next.kyc.selfieFileName = fileName;
      next.kyc.selfieUploaded = true;
    } else if (fieldKey === "kyc.addressFileName") {
      next.kyc.addressFileName = fileName;
      next.kyc.addressUploaded = true;
    } else if (fieldKey === "kyc.org.registrationName") {
      next.kyc.org.registrationName = fileName;
      next.kyc.org.registrationUploaded = true;
    } else if (fieldKey === "kyc.org.taxName") {
      next.kyc.org.taxName = fileName;
      next.kyc.org.taxUploaded = true;
    } else if (fieldKey === "kyc.org.authorizationName") {
      next.kyc.org.authorizationName = fileName;
      next.kyc.org.authorizationUploaded = true;
    } else if (fieldKey === "profile.profilePhotoName") {
      next.profile.profilePhotoName = fileName;
    } else if (fieldKey === "profile.mediaKitName") {
      next.profile.mediaKitName = fileName;
    } else if (fieldKey === "profile.team.logoName") {
      next.profile.team.logoName = fileName;
    } else if (fieldKey === "profile.agency.logoName") {
      next.profile.agency.logoName = fileName;
    }
    next.uploads[fieldKey] = uploadedRefFromDoc(row, fieldKey);
  });

  if (isFilled(next.kyc.idFileName)) next.kyc.idUploaded = true;
  if (isFilled(next.kyc.selfieFileName)) next.kyc.selfieUploaded = true;
  if (isFilled(next.kyc.addressFileName)) next.kyc.addressUploaded = true;
  if (isFilled(next.kyc.org.registrationName)) next.kyc.org.registrationUploaded = true;
  if (isFilled(next.kyc.org.taxName)) next.kyc.org.taxUploaded = true;
  if (isFilled(next.kyc.org.authorizationName)) next.kyc.org.authorizationUploaded = true;

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

function payoutMethodToApi(method: string) {
  if (method === "Bank") return "bank_account";
  if (method === "Mobile Money") return "mobile_money";
  if (method === "AliPay") return "alipay";
  if (method === "WeChat Pay") return "wechat_pay";
  if (method === "PayPal / Wallet") return "other_local";
  return "";
}

function payoutMethodFromApi(method: string) {
  if (method === "bank_account") return "Bank";
  if (method === "mobile_money") return "Mobile Money";
  if (method === "alipay") return "AliPay";
  if (method === "wechat_pay") return "WeChat Pay";
  if (method === "other_local") return "PayPal / Wallet";
  return "";
}

function payoutRhythmToApi(schedule: string) {
  if (schedule === "Weekly") return "weekly";
  if (schedule === "Bi-weekly") return "biweekly";
  if (schedule === "Monthly") return "monthly";
  return "weekly";
}

function payoutRhythmFromApi(rhythm: string) {
  if (rhythm === "weekly") return "Weekly";
  if (rhythm === "biweekly") return "Bi-weekly";
  if (rhythm === "monthly") return "Monthly";
  return "";
}

function extractBackendSettingsForm(payload: unknown): Partial<SettingsForm> | null {
  const root = asRecord(payload);
  const metadata = asRecord(root?.metadata);
  const creatorForm = asRecord(metadata?.creatorForm);
  if (creatorForm) {
    return creatorForm as Partial<SettingsForm>;
  }
  if (!root) return null;

  const method = String(asRecord(root.payout)?.method || "");
  const rhythm = String(asRecord(root.payout)?.rhythm || "");
  const payout = asRecord(root.payout);
  const verification = asRecord(root.verification);
  const tax = asRecord(root.tax);

  return {
    profile: {
      name: String(root.owner || ""),
      handle: String(root.storeSlug || ""),
      bio: String(root.about || ""),
      country: String(asRecord(root.shipFrom)?.country || ""),
      timezone: String(asRecord(metadata)?.timezone || ""),
      currency: String(payout?.currency || ""),
      tagline: "",
      contentLanguages: Array.isArray(root.languages) ? root.languages.map((entry) => String(entry)) : [],
      audienceRegions: [],
      creatorType: "Individual",
      email: String(root.email || ""),
      phone: String(root.phone || ""),
      whatsapp: String(asRecord(root.support)?.whatsapp || ""),
      profilePhotoName: "",
      mediaKitName: "",
      team: { name: "", type: "", size: "", website: "", logoName: "" },
      agency: { name: "", type: "", website: "", logoName: "" }
    },
    kyc: {
      status:
        String(verification?.kycStatus || "").toUpperCase() === "VERIFIED"
          ? "verified"
          : String(verification?.kycStatus || "").toUpperCase() === "IN_REVIEW"
            ? "in_review"
            : String(verification?.kycStatus || "").toUpperCase() === "REJECTED"
              ? "rejected"
              : "unverified",
      documentType: "",
      idUploaded: false,
      selfieUploaded: false,
      addressUploaded: false,
      org: {
        registrationUploaded: false,
        taxUploaded: false,
        authorizationUploaded: false
      }
    },
    payout: {
      method: payoutMethodFromApi(method),
      currency: String(payout?.currency || ""),
      schedule: payoutRhythmFromApi(rhythm),
      minThreshold: Number(payout?.thresholdAmount || 0),
      bank: {
        bankName: String(payout?.bankName || ""),
        accountName: String(payout?.accountName || ""),
        accountNumber: String(payout?.accountNo || ""),
        swift: String(payout?.swiftBic || "")
      },
      mobile: {
        provider: String(payout?.mobileProvider || ""),
        number: String(payout?.mobileNo || "")
      },
      wallet: {
        provider: "",
        email: String(payout?.otherDetails || "")
      },
      alipay: {
        name: "",
        accountId: String(payout?.alipayLogin || "")
      },
      wechat: {
        name: "",
        accountId: String(payout?.wechatId || ""),
        phone: ""
      },
      verification: {
        status:
          String(verification?.otpStatus || "").toUpperCase() === "VERIFIED"
            ? "verified"
            : String(verification?.otpStatus || "").toUpperCase() === "SENT"
              ? "code_sent"
              : "unverified",
        lastSentTo: String(payout?.notificationsEmail || payout?.notificationsWhatsApp || "")
      },
      tax: {
        residency: String(tax?.taxCountry || ""),
        taxId: String(tax?.taxId || "")
      },
      acceptPayoutPolicy: Boolean(asRecord(root.acceptance)?.dataProcessing || payout?.confirmDetails)
    }
  };
}

function sanitizeSettingsFormForStorage(form: SettingsForm) {
  const copy = deepClone(form);
  const persistableUrl = (value: unknown) => {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return null;
    if (text.startsWith("/")) return text;
    if (/^https?:\/\//i.test(text)) return text;
    return null;
  };
  Object.keys(copy.uploads || {}).forEach((key) => {
    const row = copy.uploads[key];
    if (!row) return;
    row.url = persistableUrl(row.url);
    row.previewUrl = persistableUrl(row.previewUrl);
  });
  return copy;
}

function collectSettingsDocs(form: SettingsForm) {
  return [
    { id: "profile-photo", type: "profile_photo", fieldKey: "profile.profilePhotoName", name: form.profile.profilePhotoName },
    { id: "media-kit", type: "media_kit", fieldKey: "profile.mediaKitName", name: form.profile.mediaKitName },
    { id: "team-logo", type: "team_logo", fieldKey: "profile.team.logoName", name: form.profile.team.logoName },
    { id: "agency-logo", type: "agency_logo", fieldKey: "profile.agency.logoName", name: form.profile.agency.logoName },
    { id: "government-id", type: "government_id", fieldKey: "kyc.idFileName", name: form.kyc.idFileName },
    { id: "selfie-verification", type: "selfie_verification", fieldKey: "kyc.selfieFileName", name: form.kyc.selfieFileName },
    { id: "address-proof", type: "address_proof", fieldKey: "kyc.addressFileName", name: form.kyc.addressFileName },
    { id: "org-registration", type: "organization_registration", fieldKey: "kyc.org.registrationName", name: form.kyc.org.registrationName },
    { id: "org-tax", type: "organization_tax", fieldKey: "kyc.org.taxName", name: form.kyc.org.taxName },
    { id: "org-authorization", type: "organization_authorization", fieldKey: "kyc.org.authorizationName", name: form.kyc.org.authorizationName }
  ]
    .filter((entry) => isFilled(entry.name))
    .map((entry) => {
      const uploaded = form.uploads[entry.fieldKey];
      return {
        id: uploaded?.id || entry.id,
        type: entry.type,
        name: entry.name,
        file: entry.name,
        status: uploaded?.status || "submitted",
        uploadedAt: uploaded?.createdAt || new Date().toISOString(),
        mimeType: uploaded?.mimeType || undefined,
        storageKey: uploaded?.storageKey || undefined,
        fileUrl: uploadUrlForPersistence(uploaded) || undefined
      };
    });
}

function buildScreenStateSettingsPayload(form: SettingsForm) {
  const formForStorage = sanitizeSettingsFormForStorage(form);
  const docs = collectSettingsDocs(form);
  return {
    settingsForm: formForStorage,
    docs,
    updatedAt: new Date().toISOString()
  };
}

function kycStatusToApi(status: Kyc["status"]): "PENDING" | "IN_REVIEW" | "VERIFIED" | "REJECTED" {
  if (status === "verified") return "VERIFIED";
  if (status === "in_review") return "IN_REVIEW";
  if (status === "rejected") return "REJECTED";
  return "PENDING";
}

function otpStatusToApi(status: PayoutVerification["status"]): "NOT_STARTED" | "SENT" | "VERIFIED" {
  if (status === "verified") return "VERIFIED";
  if (status === "code_sent") return "SENT";
  return "NOT_STARTED";
}

function uploadUrlForPersistence(upload?: UploadedFileRef | null) {
  const direct = typeof upload?.url === "string" ? upload.url : "";
  if (direct && (direct.startsWith("/") || /^https?:\/\//i.test(direct))) return direct;
  const preview = typeof upload?.previewUrl === "string" ? upload.previewUrl : "";
  if (preview && (preview.startsWith("/") || /^https?:\/\//i.test(preview))) return preview;
  return "";
}

function buildBackendSettingsPatchPayload(form: SettingsForm) {
  const formForStorage = sanitizeSettingsFormForStorage(form);
  const docs = collectSettingsDocs(form);
  const creatorType = safeText(form.profile.creatorType) || "Individual";
  const primaryPlatformName = safeText(getPrimaryPlatformName(form));
  const primaryHandle =
    normalizePrimaryPlatform(form.socials.primaryPlatform) === "instagram"
      ? safeText(form.socials.instagram)
      : normalizePrimaryPlatform(form.socials.primaryPlatform) === "tiktok"
        ? safeText(form.socials.tiktok)
        : normalizePrimaryPlatform(form.socials.primaryPlatform) === "youtube"
          ? safeText(form.socials.youtube)
          : safeText(form.socials.primaryOtherHandle);
  const profilePhotoUrl = uploadUrlForPersistence(form.uploads["profile.profilePhotoName"]);
  const mediaKitUrl = uploadUrlForPersistence(form.uploads["profile.mediaKitName"]);
  const teamLogoUrl = uploadUrlForPersistence(form.uploads["profile.team.logoName"]);
  const agencyLogoUrl = uploadUrlForPersistence(form.uploads["profile.agency.logoName"]);
  const normalizedEmail = normalizeEmail(form.profile.email);
  const normalizedSupportEmail = normalizeEmail(form.profile.email);
  const normalizedNotificationsEmail = normalizeEmail(form.payout.wallet.email) || normalizedEmail;

  return {
    profileType: "CREATOR" as const,
    owner: safeText(form.profile.name),
    storeName: safeText(form.profile.name),
    storeSlug: normalizeHandleToSlug(form.profile.handle),
    email: normalizedEmail,
    phone: safeText(form.profile.phone),
    about: safeText(form.profile.bio),
    shipFrom: {
      country: safeText(form.profile.country)
    },
    channels: getSelectedSocialPlatforms(form.socials).map((entry) => entry.name),
    languages: safeStringList(form.profile.contentLanguages),
    docs: {
      list: docs
    },
    payout: {
      method: payoutMethodToApi(form.payout.method),
      currency: safeText(form.payout.currency),
      rhythm: payoutRhythmToApi(form.payout.schedule),
      thresholdAmount: safeFiniteNumber(form.payout.minThreshold, 0),
      bankName: safeText(form.payout.bank.bankName),
      accountName: safeText(form.payout.bank.accountName),
      accountNo: safeText(form.payout.bank.accountNumber),
      swiftBic: safeText(form.payout.bank.swift),
      mobileProvider: safeText(form.payout.mobile.provider),
      mobileNo: safeText(form.payout.mobile.number),
      alipayLogin: safeText(form.payout.alipay.accountId),
      wechatId: safeText(form.payout.wechat.accountId),
      otherProvider: form.payout.method === "PayPal / Wallet" ? safeText(form.payout.wallet.provider || "PayPal / Wallet") : "",
      otherDetails: safeText(form.payout.wallet.email),
      notificationsEmail: normalizedNotificationsEmail,
      notificationsWhatsApp: safeText(form.profile.whatsapp || form.profile.phone),
      confirmDetails: Boolean(form.payout.acceptPayoutPolicy)
    },
    tax: {
      legalName: safeText(form.profile.name),
      taxCountry: safeText(form.payout.tax.residency || form.profile.country),
      taxId: safeText(form.payout.tax.taxId)
    },
    support: {
      whatsapp: safeText(form.profile.whatsapp),
      email: normalizedSupportEmail,
      phone: safeText(form.profile.phone)
    },
    acceptance: {
      sellerTerms: Boolean(form.review.acceptTerms),
      contentPolicy: Boolean(form.review.seenPolicies.content),
      dataProcessing: Boolean(form.review.scrolledToBottom || form.payout.acceptPayoutPolicy)
    },
    verification: {
      verificationPhone: safeText(form.profile.phone),
      verificationEmail: normalizedEmail,
      kycStatus: kycStatusToApi(form.kyc.status),
      otpStatus: otpStatusToApi(form.payout.verification.status)
    },
    providerServices: safeStringList(form.preferences.lines),
    metadata: {
      creatorAvatarUrl: profilePhotoUrl || undefined,
      creatorForm: {
        ...formForStorage,
        profile: {
          ...formForStorage.profile,
          profilePhotoUrl,
          mediaKitUrl,
          team: {
            ...formForStorage.profile.team,
            logoUrl: teamLogoUrl
          },
          agency: {
            ...formForStorage.profile.agency,
            logoUrl: agencyLogoUrl
          }
        },
        socials: {
          ...formForStorage.socials,
          primaryPlatformName,
          primaryHandle
        }
      },
      settingsForm: formForStorage,
      preferences: {
        lines: safeStringList(form.preferences.lines),
        formats: safeStringList(form.preferences.formats),
        models: safeStringList(form.preferences.models)
      },
      docs,
      uploads: formForStorage.uploads,
      profile: {
        creatorType,
        primaryPlatformName,
        primaryHandle,
        profilePhotoUrl,
        mediaKitUrl,
        teamLogoUrl,
        agencyLogoUrl
      }
    }
  };
}

function extractScreenStateSettingsForm(payload: unknown): Partial<SettingsForm> | null {
  const root = asRecord(payload);
  if (!root) return null;

  const direct = asRecord(root.settingsForm) || asRecord(root.creatorForm);
  if (direct) {
    return direct as Partial<SettingsForm>;
  }

  const metadata = asRecord(root.metadata);
  const nested = asRecord(metadata?.settingsForm) || asRecord(metadata?.creatorForm);
  if (nested) {
    return nested as Partial<SettingsForm>;
  }

  return null;
}

function errorMessageFromUnknown(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const direct = "message" in error ? (error as { message?: unknown }).message : null;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (Array.isArray(direct) && direct.length) {
    return direct.map((entry) => String(entry)).join(", ");
  }
  const details = "details" in error ? (error as { details?: unknown }).details : null;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const message = (details as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
    if (Array.isArray(message) && message.length) {
      return message.map((entry) => String(entry)).join(", ");
    }
  }
  return "";
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

  const [lookups, setLookups] = useState<Record<string, unknown>>({});
  const [form, setForm] = useState<SettingsForm>(() => defaultForm());
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const hydratedRef = useRef(false);
  const objectUrlRef = useRef<Record<string, string>>({});

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
  const languageOptions = useMemo(() => lookupLabels(lookups.languages), [lookups.languages]);
  const regionOptions = useMemo(() => lookupLabels(lookups.supplierTargetRegions), [lookups.supplierTargetRegions]);
  const productServiceLines = useMemo(() => {
    const serviceCategories = lookupLabels(lookups.serviceCategories);
    const productCategories = lookupLabels(lookups.productCategories);
    return Array.from(new Set([...serviceCategories, ...productCategories]));
  }, [lookups.productCategories, lookups.serviceCategories]);
  const contentFormats = useMemo(() => lookupLabels(lookups.contentFormats), [lookups.contentFormats]);
  const payoutMethods = useMemo(
    () => lookupPayoutMethodCards(lookups.payoutMethodCards),
    [lookups.payoutMethodCards]
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

  // Load from backend onboarding record + workflow draft state.
  useEffect(() => {
    let cancelled = false;
    try {
      void creatorApi.onboardingLookups().then((payload) => {
        if (!cancelled && payload && typeof payload === "object" && !Array.isArray(payload)) {
          setLookups(payload as Record<string, unknown>);
        }
      }).catch(() => undefined);

      void creatorApi
        .onboarding()
        .then(async (payload) => {
          if (cancelled) return;
          const restored = extractBackendSettingsForm(payload);
          if (restored) {
            const merged = deepMerge(defaultForm(), restored as SettingsForm);
            const normalized = normalizeFormFromOnboarding(merged);
            setForm(normalized);
            push("Settings loaded from backend.", "success");
          }

          const screenState = await creatorApi.workflowScreenState(SETTINGS_SCREEN_STATE_KEY).catch(() => null);
          const savedSettingsForm = extractScreenStateSettingsForm(screenState);
          if (!cancelled && savedSettingsForm) {
            setForm((prev) => normalizeFormFromOnboarding(deepMerge(prev, savedSettingsForm as SettingsForm)));
            push("Settings loaded from saved draft.", "success");
          }

          const uploads = await creatorApi.uploads().catch(() => []);
          if (cancelled || !Array.isArray(uploads) || uploads.length === 0) return;
          setForm((prev) => {
            const next = deepClone(prev);
            uploads.forEach((upload) => {
              const meta =
                upload.metadata && typeof upload.metadata === "object" && !Array.isArray(upload.metadata)
                  ? (upload.metadata as Record<string, unknown>)
                  : null;
              const fieldKey = typeof meta?.fieldKey === "string" ? meta.fieldKey : "";
              if (!fieldKey) return;
              const previewDataUrl = typeof meta?.previewDataUrl === "string" ? meta.previewDataUrl : "";
              const persistedPreview = previewDataUrl.startsWith("data:image/") ? previewDataUrl : "";
              next.uploads[fieldKey] = {
                id: upload.id,
                name: upload.name,
                mimeType: upload.mimeType || "",
                sizeBytes: typeof upload.sizeBytes === "number" ? upload.sizeBytes : undefined,
                extension: upload.extension || "",
                storageKey: upload.storageKey || "",
                url: upload.url || persistedPreview || null,
                status: upload.status || "uploaded",
                createdAt: upload.createdAt || "",
                purpose: upload.purpose || "",
                fieldKey,
                previewUrl: upload.url || persistedPreview || null
              };

              if (fieldKey === "profile.profilePhotoName" && !next.profile.profilePhotoName) next.profile.profilePhotoName = upload.name;
              if (fieldKey === "profile.mediaKitName" && !next.profile.mediaKitName) next.profile.mediaKitName = upload.name;
              if (fieldKey === "profile.team.logoName" && !next.profile.team.logoName) next.profile.team.logoName = upload.name;
              if (fieldKey === "profile.agency.logoName" && !next.profile.agency.logoName) next.profile.agency.logoName = upload.name;
              if (fieldKey === "kyc.idFileName" && !next.kyc.idFileName) {
                next.kyc.idFileName = upload.name;
                next.kyc.idUploaded = true;
              }
              if (fieldKey === "kyc.selfieFileName" && !next.kyc.selfieFileName) {
                next.kyc.selfieFileName = upload.name;
                next.kyc.selfieUploaded = true;
              }
              if (fieldKey === "kyc.addressFileName" && !next.kyc.addressFileName) {
                next.kyc.addressFileName = upload.name;
                next.kyc.addressUploaded = true;
              }
              if (fieldKey === "kyc.org.registrationName" && !next.kyc.org.registrationName) {
                next.kyc.org.registrationName = upload.name;
                next.kyc.org.registrationUploaded = true;
              }
              if (fieldKey === "kyc.org.taxName" && !next.kyc.org.taxName) {
                next.kyc.org.taxName = upload.name;
                next.kyc.org.taxUploaded = true;
              }
              if (fieldKey === "kyc.org.authorizationName" && !next.kyc.org.authorizationName) {
                next.kyc.org.authorizationName = upload.name;
                next.kyc.org.authorizationUploaded = true;
              }
            });
            return next;
          });
        })
        .catch(() => {
          if (cancelled) return;
          void creatorApi
            .workflowScreenState(SETTINGS_SCREEN_STATE_KEY)
            .then((screenState) => {
              if (cancelled) return;
              const savedSettingsForm = extractScreenStateSettingsForm(screenState);
              if (!savedSettingsForm) return;
              setForm((prev) => normalizeFormFromOnboarding(deepMerge(prev, savedSettingsForm as SettingsForm)));
              push("Settings loaded from saved draft.", "success");
            })
            .catch(() => undefined);
        })
        .finally(() => {
          hydratedRef.current = true;
        });
    } catch {
      // ignore
      hydratedRef.current = true;
    }

    return () => {
      cancelled = true;
      hydratedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      Object.values(objectUrlRef.current).forEach((url) => {
        if (typeof url === "string" && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Draft autosave to backend workflow screen-state.
  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    setSaved(false);

    const autosaveTimer = window.setTimeout(() => {
      const payload = buildScreenStateSettingsPayload(form);
      void creatorApi.patchWorkflowScreenState(SETTINGS_SCREEN_STATE_KEY, payload).catch(() => undefined);
    }, 350);

    return () => {
      window.clearTimeout(autosaveTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function update(path: string, value: any) {
    setForm((prev) => setDeep(prev, path, value));
  }

  function openEditor(key: string) {
    setEditingFields((prev) => ({ ...prev, [key]: true }));
  }

  function closeEditor(key: string) {
    setEditingFields((prev) => ({ ...prev, [key]: false }));
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

  function registerUpload(fieldKey: string, file: File, purpose: string) {
    const isImage = String(file.type || "").toLowerCase().startsWith("image/");
    const shouldPersistPreview = isImage;

    const applyUpload = (persistedPreviewUrl: string) => {
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const safeName = file.name.replace(/\s+/g, "_");
      const storageKey = `creator/settings/${fieldKey.replace(/\./g, "_")}/${Date.now()}-${safeName}`;
      const previewUrl = URL.createObjectURL(file);
      const previousUrl = objectUrlRef.current[fieldKey];
      if (previousUrl && previousUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previousUrl);
      }
      objectUrlRef.current[fieldKey] = previewUrl;
      const displayUrl = persistedPreviewUrl || previewUrl;

      setForm((prev) => {
        const next = deepClone(prev);
        next.uploads[fieldKey] = {
          id: localId,
          name: file.name,
          mimeType: file.type || "",
          sizeBytes: file.size,
          extension: file.name.includes(".") ? file.name.split(".").pop() || "" : "",
          storageKey,
          url: displayUrl,
          status: "uploaded",
          createdAt: new Date().toISOString(),
          purpose,
          fieldKey,
          previewUrl: displayUrl
        };
        return next;
      });

      void readFileAsDataUrl(file)
        .then((dataUrl) =>
          creatorApi.uploadMediaFile({
            name: file.name,
            dataUrl,
            kind: fileKindFromMime(file.type || ""),
            mimeType: file.type || undefined,
            sizeBytes: file.size > 0 ? file.size : undefined,
            extension: file.name.includes(".") ? file.name.split(".").pop() || undefined : undefined,
            purpose,
            metadata: {
              fieldKey,
              source: "creator_settings",
              acceptedAt: new Date().toISOString()
            }
          })
        )
        .then((uploaded) => {
          const finalPreviewUrl = uploaded.url || persistedPreviewUrl || previewUrl;
          setForm((prev) => {
            const next = deepClone(prev);
            next.uploads[fieldKey] = {
              id: uploaded.id,
              name: uploaded.name,
              mimeType: uploaded.mimeType || file.type || "",
              sizeBytes: typeof uploaded.sizeBytes === "number" ? uploaded.sizeBytes : file.size,
              extension: uploaded.extension || "",
              storageKey: uploaded.storageKey || storageKey,
              url: finalPreviewUrl,
              status: "uploaded",
              createdAt: uploaded.createdAt || new Date().toISOString(),
              purpose,
              fieldKey,
              previewUrl: finalPreviewUrl
            };
            return next;
          });
        })
        .catch(() => {
          push("File selected, but upload failed.", "warn");
        });
    };

    if (shouldPersistPreview) {
      void readImagePreviewDataUrl(file)
        .then((preview) => {
          applyUpload(preview.startsWith("data:image/") ? preview : "");
        })
        .catch(() => {
          applyUpload("");
        });
      return;
    }

    applyUpload("");
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

  function logoutDevice(deviceId: string) {
    const next = (form.settings.devices || []).filter((d) => d.id !== deviceId);
    update("settings.devices", next);
    addAudit("Device signed out", deviceId);
    push("Device signed out.", "success");
  }

  function signOutEverywhere() {
    update("settings.devices", []);
    addAudit("Signed out everywhere", "All sessionz revoked");
    push("All devices signed out.", "success");
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

  async function saveSettings() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const screenStatePayload = buildScreenStateSettingsPayload(form);
      const onboardingPayload = buildBackendSettingsPatchPayload(form);
      await Promise.all([
        creatorApi.patchWorkflowScreenState(
          SETTINGS_SCREEN_STATE_KEY,
          screenStatePayload
        ),
        creatorApi.saveOnboarding(onboardingPayload)
      ]);
      setSaved(true);
      addAudit("Settings saved", "workflow screen-state + onboarding");
      push("Settings saved.", "success");
    } catch (error) {
      const backendMessage = errorMessageFromUnknown(error);
      push(backendMessage || "Failed to save settings to backend.", "error");
    } finally {
      setIsSaving(false);
    }
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

            <PrimaryButton
              onClick={() => {
                void saveSettings();
              }}
              disabled={isSaving || saved}
              className={cx(isSaving || saved ? "opacity-60 cursor-not-allowed" : "")}
            >
              <Check className="h-4 w-4" /> {isSaving ? "Saving..." : "Save changes"}
            </PrimaryButton>

            <GhostButton onClick={downloadData}>
              <Download className="h-4 w-4" /> Export data
            </GhostButton>
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
                      addAudit("Opened Roles & Permissions");
                      navigate("/roles-permissions");
                    }}
                  >
                    <Users className="h-4 w-4" /> Roles & Permissions
                  </SoftButton>
                ) : (
                  <SoftButton
                    onClick={() => {
                      addAudit("Opened subscription settings");
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
                <EditableFieldShell
                  editing={!!editingFields["profile.name"]}
                  value={form.profile.name}
                  placeholder="Your name / brand"
                  onEdit={() => openEditor("profile.name")}
                  onDone={() => closeEditor("profile.name")}
                >
                  <Input autoFocus value={form.profile.name} onChange={(e) => update("profile.name", e.target.value)} placeholder="Your name / brand" />
                </EditableFieldShell>
              </Field>
              <Field label="Handle *" hint="Used in your profile URL (letters, numbers, underscores).">
                <EditableFieldShell
                  editing={!!editingFields["profile.handle"]}
                  value={form.profile.handle}
                  placeholder="example: mylivedealzcreator"
                  onEdit={() => openEditor("profile.handle")}
                  onDone={() => closeEditor("profile.handle")}
                >
                  <Input autoFocus value={form.profile.handle} onChange={(e) => update("profile.handle", e.target.value)} placeholder="example: mylivedealzcreator" />
                </EditableFieldShell>
              </Field>
              <Field label="Primary email address *">
                <EditableFieldShell
                  editing={!!editingFields["profile.email"]}
                  value={form.profile.email}
                  placeholder="your@email.com"
                  onEdit={() => openEditor("profile.email")}
                  onDone={() => closeEditor("profile.email")}
                >
                  <Input
                    autoFocus
                    value={form.profile.email}
                    onChange={(e) => {
                      update("profile.email", e.target.value);
                      addAudit("Email updated", e.target.value);
                      push("Email updated. Verification link sent.", "success");
                    }}
                    placeholder="your@email.com"
                  />
                </EditableFieldShell>
              </Field>
              <Field label="Primary phone contact *">
                <EditableFieldShell
                  editing={!!editingFields["profile.phone"]}
                  value={form.profile.phone}
                  placeholder="+256 700 000 000"
                  onEdit={() => openEditor("profile.phone")}
                  onDone={() => closeEditor("profile.phone")}
                >
                  <Input
                    autoFocus
                    value={form.profile.phone}
                    onChange={(e) => {
                      update("profile.phone", e.target.value);
                      addAudit("Phone updated", e.target.value);
                      push("Phone updated. OTP sent for verification.", "success");
                    }}
                    placeholder="+256 700 000 000"
                  />
                </EditableFieldShell>
              </Field>
              <Field label="WhatsApp number">
                <EditableFieldShell
                  editing={!!editingFields["profile.whatsapp"]}
                  value={form.profile.whatsapp}
                  placeholder="+256 700 000 000"
                  onEdit={() => openEditor("profile.whatsapp")}
                  onDone={() => closeEditor("profile.whatsapp")}
                >
                  <Input
                    autoFocus
                    value={form.profile.whatsapp}
                    onChange={(e) => update("profile.whatsapp", e.target.value)}
                    placeholder="+256 700 000 000"
                  />
                </EditableFieldShell>
              </Field>
              <Field label="Tagline">
                <EditableFieldShell
                  editing={!!editingFields["profile.tagline"]}
                  value={form.profile.tagline}
                  placeholder="Example: Premium electronics creator for East Africa"
                  onEdit={() => openEditor("profile.tagline")}
                  onDone={() => closeEditor("profile.tagline")}
                >
                  <Input autoFocus value={form.profile.tagline} onChange={(e) => update("profile.tagline", e.target.value)} placeholder="Example: Premium electronics creator for East Africa" />
                </EditableFieldShell>
              </Field>
              <Field label="Country *">
                <EditableFieldShell
                  editing={!!editingFields["profile.country"]}
                  value={form.profile.country}
                  placeholder="Uganda"
                  onEdit={() => openEditor("profile.country")}
                  onDone={() => closeEditor("profile.country")}
                >
                  <Input autoFocus value={form.profile.country} onChange={(e) => update("profile.country", e.target.value)} placeholder="Uganda" />
                </EditableFieldShell>
              </Field>
              <Field label="Timezone">
                <EditableFieldShell
                  editing={!!editingFields["profile.timezone"]}
                  value={form.profile.timezone}
                  placeholder="Africa/Kampala"
                  onEdit={() => openEditor("profile.timezone")}
                  onDone={() => closeEditor("profile.timezone")}
                >
                  <Input autoFocus value={form.profile.timezone} onChange={(e) => update("profile.timezone", e.target.value)} placeholder="Africa/Kampala" />
                </EditableFieldShell>
              </Field>
              <Field label="Currency">
                <EditableFieldShell
                  editing={!!editingFields["profile.currency"]}
                  value={form.profile.currency}
                  placeholder="Select currency"
                  onEdit={() => openEditor("profile.currency")}
                  onDone={() => closeEditor("profile.currency")}
                >
                  <Select autoFocus value={form.profile.currency} onChange={(e) => update("profile.currency", e.target.value)}>
                    <option value="">Select currency</option>
                    {["UGX", "KES", "TZS", "USD", "EUR"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </EditableFieldShell>
              </Field>

              <div className="md:col-span-2">
                <Field label="Bio">
                  <EditableFieldShell
                    editing={!!editingFields["profile.bio"]}
                    value={form.profile.bio}
                    placeholder="Tell suppliers what you sell, who you reach, and how you convert."
                    onEdit={() => openEditor("profile.bio")}
                    onDone={() => closeEditor("profile.bio")}
                    multiline
                  >
                    <Textarea
                      autoFocus
                      value={form.profile.bio}
                      onChange={(e) => update("profile.bio", e.target.value)}
                      placeholder="Tell suppliers what you sell, who you reach, and how you convert."
                      rows={5}
                    />
                  </EditableFieldShell>
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
                  {languageOptions.map((l) => (
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
                  {regionOptions.map((r) => (
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
                previewUrl={form.uploads["profile.profilePhotoName"]?.previewUrl || form.uploads["profile.profilePhotoName"]?.url || null}
                mimeType={form.uploads["profile.profilePhotoName"]?.mimeType}
                onPick={(name) => update("profile.profilePhotoName", name)}
                onFilePick={(file) => {
                  registerUpload("profile.profilePhotoName", file, "creator_profile_photo");
                  addAudit("Profile photo uploaded", file.name);
                }}
                accept="image/*"
              />
              <UploadMini
                title="Media kit"
                helper="PDF recommended; use for supplier pitches."
                value={form.profile.mediaKitName}
                onPick={(name) => update("profile.mediaKitName", name)}
                onFilePick={(file) => {
                  registerUpload("profile.mediaKitName", file, "creator_media_kit");
                  addAudit("Media kit uploaded", file.name);
                }}
                accept=".pdf,application/pdf"
              />
            </div>

            <div className="mt-3">
              <UploadedFilesPanel
                title="Profile file details"
                uploads={form.uploads}
                items={[
                  { label: "Profile photo", fieldKey: "profile.profilePhotoName", fileName: form.profile.profilePhotoName },
                  { label: "Media kit", fieldKey: "profile.mediaKitName", fileName: form.profile.mediaKitName },
                  { label: "Team logo", fieldKey: "profile.team.logoName", fileName: form.profile.team.logoName },
                  { label: "Agency logo", fieldKey: "profile.agency.logoName", fileName: form.profile.agency.logoName }
                ]}
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
                        <option value="">Select size</option>
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
                      previewUrl={form.uploads["profile.team.logoName"]?.previewUrl || form.uploads["profile.team.logoName"]?.url || null}
                      mimeType={form.uploads["profile.team.logoName"]?.mimeType}
                      onPick={(name) => update("profile.team.logoName", name)}
                      onFilePick={(file) => {
                        registerUpload("profile.team.logoName", file, "creator_team_logo");
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
                      previewUrl={form.uploads["profile.agency.logoName"]?.previewUrl || form.uploads["profile.agency.logoName"]?.url || null}
                      mimeType={form.uploads["profile.agency.logoName"]?.mimeType}
                      onPick={(name) => update("profile.agency.logoName", name)}
                      onFilePick={(file) => {
                        registerUpload("profile.agency.logoName", file, "creator_agency_logo");
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
                  const region = (form.profile.audienceRegions || []).find((entry) => String(entry).trim()) || "";
                  const langs = (form.profile.contentLanguages || []).filter((entry) => String(entry).trim()).join(", ");
                  const line = (form.preferences.lines || []).find((entry) => String(entry).trim()) || "";
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
                        addAudit("Opened Roles & Permissions");
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
                        addAudit("Opened Crew Management");
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
                        <option value="">Select platform</option>
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
                    update("socials.extra", [...extra, { platform: "", handle: "" }]);
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
                        <option value="">Select platform</option>
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
                  {productServiceLines.map((x) => (
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
                {contentFormats.map((x) => (
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
                      <option value="">Select rule</option>
                      {["All", "Verified suppliers only", "Invite-only"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Supplier type">
                    <Select value={form.preferences.supplierType} onChange={(e) => update("preferences.supplierType", e.target.value)}>
                      <option value="">Select type</option>
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
                      <option value="">Select visibility</option>
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
                      push(v ? "Google Calendar connected." : "Google Calendar disconnected.", "success");
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
                      <option value="">Select document type</option>
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
                    previewUrl={form.uploads["kyc.idFileName"]?.previewUrl || form.uploads["kyc.idFileName"]?.url || null}
                    mimeType={form.uploads["kyc.idFileName"]?.mimeType}
                    onPick={(name) => {
                      update("kyc.idFileName", name);
                      update("kyc.idUploaded", true);
                      addAudit("KYC doc uploaded", "ID document");
                    }}
                    onFilePick={(file) => {
                      registerUpload("kyc.idFileName", file, "creator_kyc_document");
                    }}
                  />
                  <UploadMini
                    title="Selfie"
                    helper={form.kyc.selfieUploaded ? "Uploaded" : "Required"}
                    value={form.kyc.selfieFileName}
                    previewUrl={form.uploads["kyc.selfieFileName"]?.previewUrl || form.uploads["kyc.selfieFileName"]?.url || null}
                    mimeType={form.uploads["kyc.selfieFileName"]?.mimeType}
                    onPick={(name) => {
                      update("kyc.selfieFileName", name);
                      update("kyc.selfieUploaded", true);
                      addAudit("KYC doc uploaded", "Selfie");
                    }}
                    onFilePick={(file) => {
                      registerUpload("kyc.selfieFileName", file, "creator_kyc_selfie");
                    }}
                  />
                  <UploadMini
                    title="Address proof"
                    helper={form.kyc.addressUploaded ? "Uploaded" : "Optional"}
                    value={form.kyc.addressFileName}
                    previewUrl={form.uploads["kyc.addressFileName"]?.previewUrl || form.uploads["kyc.addressFileName"]?.url || null}
                    mimeType={form.uploads["kyc.addressFileName"]?.mimeType}
                    onPick={(name) => {
                      update("kyc.addressFileName", name);
                      update("kyc.addressUploaded", true);
                      addAudit("KYC doc uploaded", "Address proof");
                    }}
                    onFilePick={(file) => {
                      registerUpload("kyc.addressFileName", file, "creator_kyc_address");
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
                        previewUrl={form.uploads["kyc.org.registrationName"]?.previewUrl || form.uploads["kyc.org.registrationName"]?.url || null}
                        mimeType={form.uploads["kyc.org.registrationName"]?.mimeType}
                        onPick={(name) => {
                          update("kyc.org.registrationName", name);
                          update("kyc.org.registrationUploaded", true);
                          addAudit("Org doc uploaded", "Registration");
                        }}
                        onFilePick={(file) => {
                          registerUpload("kyc.org.registrationName", file, "creator_org_registration");
                        }}
                      />
                      <UploadMini
                        title="Tax certificate"
                        value={form.kyc.org.taxName}
                        previewUrl={form.uploads["kyc.org.taxName"]?.previewUrl || form.uploads["kyc.org.taxName"]?.url || null}
                        mimeType={form.uploads["kyc.org.taxName"]?.mimeType}
                        onPick={(name) => {
                          update("kyc.org.taxName", name);
                          update("kyc.org.taxUploaded", true);
                          addAudit("Org doc uploaded", "Tax");
                        }}
                        onFilePick={(file) => {
                          registerUpload("kyc.org.taxName", file, "creator_org_tax");
                        }}
                      />
                      <UploadMini
                        title="Authorization letter"
                        value={form.kyc.org.authorizationName}
                        previewUrl={form.uploads["kyc.org.authorizationName"]?.previewUrl || form.uploads["kyc.org.authorizationName"]?.url || null}
                        mimeType={form.uploads["kyc.org.authorizationName"]?.mimeType}
                        onPick={(name) => {
                          update("kyc.org.authorizationName", name);
                          update("kyc.org.authorizationUploaded", true);
                          addAudit("Org doc uploaded", "Authorization");
                        }}
                        onFilePick={(file) => {
                          registerUpload("kyc.org.authorizationName", file, "creator_org_authorization");
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <UploadedFilesPanel
                    title="Verification file details"
                    uploads={form.uploads}
                    items={[
                      { label: "ID document", fieldKey: "kyc.idFileName", fileName: form.kyc.idFileName },
                      { label: "Selfie", fieldKey: "kyc.selfieFileName", fileName: form.kyc.selfieFileName },
                      { label: "Address proof", fieldKey: "kyc.addressFileName", fileName: form.kyc.addressFileName },
                      { label: "Registration", fieldKey: "kyc.org.registrationName", fileName: form.kyc.org.registrationName },
                      { label: "Tax certificate", fieldKey: "kyc.org.taxName", fileName: form.kyc.org.taxName },
                      { label: "Authorization letter", fieldKey: "kyc.org.authorizationName", fileName: form.kyc.org.authorizationName }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
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
                            onClick={() => logoutDevice(d.id)}
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
                  {payoutMethods.map((m) => {
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
                      <option value="">Select currency</option>
                      {["UGX", "KES", "TZS", "USD", "EUR"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Schedule">
                    <Select value={form.payout.schedule} onChange={(e) => update("payout.schedule", e.target.value)}>
                      <option value="">Select schedule</option>
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
                          <option value="">Select provider</option>
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
                          <option value="">Select provider</option>
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
                      onClick={async () => {
                        if (!form.payout.method) {
                          push("Select a payout method first.", "error");
                          return;
                        }
                        try {
                          update("payout.verification.status", "code_sent");
                          update("payout.verification.lastSentTo", form.payout.method);
                          addAudit("Verification code sent", form.payout.method);
                          await creatorApi.sendPayoutCode({
                            method: form.payout.method,
                            channel: "app"
                          });
                          push("Verification code sent.", "success");
                        } catch {
                          push("Could not send verification code.", "error");
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" /> Send code
                    </GhostButton>

                    <PrimaryButton
                      onClick={async () => {
                        try {
                          update("payout.verification.status", "verified");
                          addAudit("Payout verified", form.payout.method || "method");
                          await creatorApi.verifyPayout({
                            method: form.payout.method || undefined,
                            channel: "app",
                            code: "confirmed"
                          });
                          push("Payout verified.", "success");
                        } catch {
                          push("Could not verify payout setup.", "error");
                        }
                      }}
                    >
                      <Check className="h-4 w-4" /> Mark verified
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
                      <option value="">Select visibility</option>
                      {["Public", "suppliers only", "Private"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Direct messages">
                    <Select value={form.settings.privacy.allowDMsFrom} onChange={(e) => update("settings.privacy.allowDMsFrom", e.target.value)}>
                      <option value="">Select direct-message rule</option>
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
                  onClick={async () => {
                    try {
                      const ticket = await creatorApi.createSupportTicket({
                        marketplace: "creator",
                        category: "settings",
                        subject: "Creator settings support request",
                        severity: "medium",
                        ref: "creator-settings"
                      });
                      addAudit("Support contacted", "Creator Success");
                      const ticketId = typeof ticket?.id === "string" ? ticket.id : "";
                      push(ticketId ? `Support ticket created: ${ticketId}` : "Support ticket created.", "success");
                    } catch {
                      push("Could not create support ticket.", "error");
                    }
                  }}
                >
                  <HelpCircle className="h-4 w-4" /> Contact support
                </PrimaryButton>
              </div>
            </div>
          </Card >

          <footer className="py-6 text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} MyLiveDealz · Premium Settings & Safety (preview)
          </footer>
        </main>
      </div>
    </div>
  );
}
