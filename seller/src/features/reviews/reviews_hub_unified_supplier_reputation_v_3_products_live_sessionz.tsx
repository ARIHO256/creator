import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  Filter,
  Globe,
  Info,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";

/**
 * Reviews Hub — Unified Supplier Reputation (v3)
 * Route: /reviews
 * Changes:
 * 1) "Goods" renamed to "Products" everywhere.
 * 2) Added MyLiveDealz Live Sessionz ratings (separate surface under MyLiveDealz).
 *
 * Note: Role/Type chip strip remains removed; filters are compact dropdowns.
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type Tone = "slate" | "green" | "orange" | "danger";

type Role = "Seller" | "Provider";

type Channel = "Retail" | "Wholesale" | "CorporatePay" | "MyLiveDealz";

type ItemType = "Products" | "Services";

type ReviewStatus = "New" | "Replied" | "Flagged" | "Resolved";

type MldzSurface = "Live Sessionz" | "Shoppables";

type Review = {
  id: string;
  buyerName: string;
  buyerType: "Personal" | "Organization";
  roleTarget: Role;
  itemType: ItemType;
  channel: Channel;
  /**
   * For MyLiveDealz only: which surface is being rated.
   * - Live Sessionz: host performance, engagement, clarity
   * - Shoppables: items/ads experience
   */
  mldzSurface?: MldzSurface;
  marketplace: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
  reference: { kind: "Order" | "Booking" | "RFQ" | "Campaign" | "LiveSession"; id: string };
  tags: string[];
  status: ReviewStatus;
  sentiment: "Positive" | "Neutral" | "Negative";
  requiresResponse: boolean;
  response?: { at: string; by: string; text: string };
};

type Cluster = { label: string; count: number; tone: Tone };

type Template = { id: string; title: string; body: string; tags: string[] };

type RatingBucket = { stars: number; pct: number; count: number };

type TrendPoint = { day: string; rating: number; volume: number };

type Toast = {
  id: string;
  title: string;
  message?: string;
  tone?: "default" | "success" | "warning" | "danger";
  action?: { label: string; onClick: () => void };
};

const REVIEW_REPLY_TEMPLATES: Template[] = [
  { id: "TPL-01", title: "Thank you (positive)", tags: ["positive"], body: "Thank you for your review. We appreciate your support and are glad you had a good experience." },
  { id: "TPL-02", title: "Apology + fix steps (issue)", tags: ["negative", "issue"], body: "We are sorry for the experience. We are reviewing what happened and will propose a fix within 24 hours. Please share your reference ID and preferred resolution." },
  { id: "TPL-03", title: "CorporatePay response (organization)", tags: ["corporatepay", "wholesale"], body: "Thank you for the feedback. We will improve update frequency for your organization. We can also align on SLA and escalation contacts for future orders and RFQs." },
  { id: "TPL-04", title: "MyLiveDealz Live Sessionz reply", tags: ["mldz", "live"], body: "Thanks for joining the live. We appreciate your feedback. We will keep improving clarity, pacing, and Q&A in future sessions." },
  { id: "TPL-05", title: "MyLiveDealz Shoppables reply", tags: ["mldz", "shoppables"], body: "Thanks for the feedback. We will add clearer specs and sizing to the listing and highlight them in the next live." },
];

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "orange" && "bg-orange-50 text-orange-700",
        tone === "danger" && "bg-rose-50 text-rose-700",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 shadow-[0_12px_40px_rgba(2,16,23,0.06)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ label, onClick, children, danger }: { label: string; onClick?: (e?: any) => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-white dark:bg-slate-900/85 transition",
        danger ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-slate-200/70 text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[75] h-screen w-[96vw] max-w-[860px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/90 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900">{title}</div>
                    {subtitle ? <div className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</div> : null}
                  </div>
                  <IconButton label="Close" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function ToastCenter({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[95] flex w-[92vw] max-w-[420px] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx(
              "rounded-3xl border bg-white dark:bg-slate-900/95 p-4 shadow-[0_24px_80px_rgba(2,16,23,0.18)] backdrop-blur",
              t.tone === "success" && "border-emerald-200",
              t.tone === "warning" && "border-orange-200",
              t.tone === "danger" && "border-rose-200",
              (!t.tone || t.tone === "default") && "border-slate-200/70"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  t.tone === "success" && "bg-emerald-50 text-emerald-700",
                  t.tone === "warning" && "bg-orange-50 text-orange-700",
                  t.tone === "danger" && "bg-rose-50 text-rose-700",
                  (!t.tone || t.tone === "default") && "bg-slate-100 text-slate-700"
                )}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs font-semibold text-slate-500">{t.message}</div> : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-slate-800"
                  >
                    {t.action.label}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 text-slate-700 hover:bg-gray-50 dark:bg-slate-950"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 items-center rounded-full border transition",
        checked ? "border-emerald-200 bg-emerald-500" : "border-slate-200/70 bg-white dark:bg-slate-900"
      )}
    >
      <span className={cx("absolute h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow-sm transition", checked ? "left-[22px]" : "left-[2px]")} />
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  const hue = (initials.charCodeAt(0) * 37) % 360;
  const bg = `hsl(${hue} 70% 92%)`;
  const fg = `hsl(${hue} 55% 28%)`;
  return (
    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/70" style={{ background: bg, color: fg }}>
      <span className="text-xs font-black">{initials.toUpperCase()}</span>
    </div>
  );
}

function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  const v = clamp(Number(value || 0), 0, 5);
  const full = Math.floor(v);
  const half = v - full >= 0.5;
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = i === full && half;
        return (
          <span key={i} className={cx("inline-flex", isFull || isHalf ? "text-orange-500" : "text-slate-300")}>
            <Star width={size} height={size} strokeWidth={2} fill={isFull ? "currentColor" : "none"} style={isHalf ? { fill: "currentColor", opacity: 0.55 } : undefined} />
          </span>
        );
      })}
      <span className="ml-2 text-xs font-extrabold text-slate-700">{v.toFixed(1)}</span>
    </div>
  );
}

function Progress({ value, tone }: { value: number; tone: Tone }) {
  const v = clamp(Number(value || 0), 0, 100);
  return (
    <div className="mt-2 h-2 rounded-full bg-slate-100">
      <div
        className={cx(
          "h-2 rounded-full",
          tone === "green" && "bg-emerald-500",
          tone === "orange" && "bg-orange-500",
          tone === "danger" && "bg-rose-500",
          tone === "slate" && "bg-slate-400"
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

function pctLabel(n: number) {
  const v = clamp(Math.round(n), 0, 100);
  return `${v}%`;
}

function channelTone(c: Channel): Tone {
  if (c === "MyLiveDealz") return "orange";
  if (c === "CorporatePay") return "orange";
  if (c === "Wholesale") return "slate";
  return "green";
}

function statusTone(s: ReviewStatus): Tone {
  if (s === "Replied") return "green";
  if (s === "Resolved") return "green";
  if (s === "Flagged") return "danger";
  return "orange";
}

function sentimentTone(s: Review["sentiment"]): Tone {
  if (s === "Positive") return "green";
  if (s === "Negative") return "danger";
  return "orange";
}

function trustScore(reviews: Review[]) {
  if (!reviews.length) return 0;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const repliedPct = (reviews.filter((r) => !!r.response).length / reviews.length) * 100;
  const negativePct = (reviews.filter((r) => r.sentiment === "Negative").length / reviews.length) * 100;
  return clamp(Math.round(avg * 16 + repliedPct * 0.35 - negativePct * 0.45), 0, 100);
}

function normalizeRoleTarget(value: unknown): Role {
  return String(value ?? "").toLowerCase() === "provider" ? "Provider" : "Seller";
}

function normalizeItemType(value: unknown): ItemType {
  return String(value ?? "").toLowerCase() === "services" ? "Services" : "Products";
}

function normalizeChannel(value: unknown): Channel {
  const raw = String(value ?? "").trim();
  if (raw === "Wholesale" || raw === "CorporatePay" || raw === "MyLiveDealz") return raw;
  return "Retail";
}

function normalizeMldzSurface(value: unknown): MldzSurface | undefined {
  const raw = String(value ?? "").trim();
  return raw === "Live Sessionz" || raw === "Shoppables" ? raw : undefined;
}

function normalizeBuyerType(value: unknown): Review["buyerType"] {
  return String(value ?? "").toLowerCase() === "organization" ? "Organization" : "Personal";
}

function normalizeSentiment(value: unknown): Review["sentiment"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "negative") return "Negative";
  if (raw === "neutral") return "Neutral";
  return "Positive";
}

function normalizeReviewStatus(row: Record<string, unknown>): ReviewStatus {
  if (row.resolvedAt) return "Resolved";
  if (String(row.status ?? "").toUpperCase() === "FLAGGED" || row.flaggedAt) return "Flagged";
  if (Array.isArray(row.replies) && row.replies.length > 0) return "Replied";
  return "New";
}

function buildReviewReference(row: Record<string, unknown>): Review["reference"] {
  if (row.orderId) return { kind: "Order", id: String(row.orderId) };
  if (row.sessionId) return { kind: "Booking", id: String(row.sessionId) };
  if (row.campaignId) {
    return {
      kind: normalizeMldzSurface(row.mldzSurface) === "Live Sessionz" ? "LiveSession" : "Campaign",
      id: String(row.campaignId),
    };
  }
  return { kind: "Order", id: String(row.subjectId ?? row.id ?? "") };
}

function mapBackendReview(row: Record<string, unknown>): Review {
  const replies = Array.isArray(row.replies) ? (row.replies as Array<Record<string, unknown>>) : [];
  const latestReply = replies[0];
  const tags = [
    ...(Array.isArray(row.quickTags) ? row.quickTags.map((item) => String(item)) : []),
    ...(Array.isArray(row.issueTags) ? row.issueTags.map((item) => String(item)) : []),
  ];
  return {
    id: String(row.id ?? ""),
    buyerName: String(row.buyerName ?? "Customer"),
    buyerType: normalizeBuyerType(row.buyerType),
    roleTarget: normalizeRoleTarget(row.roleTarget),
    itemType: normalizeItemType(row.itemType),
    channel: normalizeChannel(row.channel),
    mldzSurface: normalizeMldzSurface(row.mldzSurface),
    marketplace: String(row.marketplace ?? "Seller"),
    rating: Number(row.ratingOverall ?? 0),
    title: String(row.title ?? ""),
    body: String(row.reviewText ?? ""),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    verified: Boolean(row.orderId || row.sessionId || row.campaignId),
    reference: buildReviewReference(row),
    tags: tags.length ? tags : ["Support"],
    status: normalizeReviewStatus(row),
    sentiment: normalizeSentiment(row.sentiment),
    requiresResponse: Boolean(row.requiresResponse),
    response: latestReply
      ? {
          at: String(latestReply.createdAt ?? new Date().toISOString()),
          by: "Supplier Team",
          text: String(latestReply.body ?? ""),
        }
      : undefined,
  };
}

function buildClusters(reviews: Review[]): Cluster[] {
  const counts = new Map<string, number>();
  reviews.forEach((review) => {
    (review.tags || []).forEach((tag) => {
      const key = String(tag).trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({
      label,
      count,
      tone: /wrong|late|sla|issue|delay|return/i.test(label) ? "danger" : count >= 3 ? "green" : "orange",
    }));
}

function buildRatingBuckets(reviews: Review[]): RatingBucket[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => Math.ceil(review.rating) === stars).length;
    return {
      stars,
      count,
      pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });
}

function buildTrend(reviews: Review[]): TrendPoint[] {
  const buckets = new Map<string, { total: number; volume: number }>();
  reviews.forEach((review) => {
    const date = new Date(review.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const current = buckets.get(key) ?? { total: 0, volume: 0 };
    current.total += review.rating;
    current.volume += 1;
    buckets.set(key, current);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([day, bucket]) => ({
      day: new Date(day).toLocaleDateString(undefined, { weekday: "short" }),
      rating: bucket.volume ? Math.round((bucket.total / bucket.volume) * 10) / 10 : 0,
      volume: bucket.volume,
    }));
}

function buildReviews() {
  const now = Date.now();
  const agoH = (h: number) => new Date(now - h * 3600_000).toISOString();

  const reviews: Review[] = [
    {
      id: "REV-90121",
      buyerName: "Amina K.",
      buyerType: "Personal",
      roleTarget: "Seller",
      itemType: "Products",
      channel: "Retail",
      marketplace: "EVmart",
      rating: 4.6,
      title: "Great quality, fast support",
      body: "The charger arrived well packaged. Support answered quickly and helped with setup.",
      createdAt: agoH(14),
      verified: true,
      reference: { kind: "Order", id: "ORD-10512" },
      tags: ["quality", "support", "packaging"],
      status: "New",
      sentiment: "Positive",
      requiresResponse: true,
    },
    {
      id: "REV-90118",
      buyerName: "CorporatePay Org",
      buyerType: "Organization",
      roleTarget: "Seller",
      itemType: "Products",
      channel: "CorporatePay",
      marketplace: "Wholesale",
      rating: 3.2,
      title: "Quote was good, delivery updates slow",
      body: "Pricing is competitive but the delivery updates were not timely. Please improve status notifications.",
      createdAt: agoH(30),
      verified: true,
      reference: { kind: "RFQ", id: "RFQ-4101" },
      tags: ["communication", "delivery"],
      status: "New",
      sentiment: "Neutral",
      requiresResponse: true,
    },
    {
      id: "REV-90111",
      buyerName: "Mukasa Logistics",
      buyerType: "Organization",
      roleTarget: "Provider",
      itemType: "Services",
      channel: "Wholesale",
      marketplace: "ServiceMart",
      rating: 2.4,
      title: "Missed SLA",
      body: "The service team arrived late and the milestone was missed. We need clearer SLA commitments.",
      createdAt: agoH(54),
      verified: true,
      reference: { kind: "Booking", id: "BKG-221" },
      tags: ["SLA", "lateness", "planning"],
      status: "Flagged",
      sentiment: "Negative",
      requiresResponse: true,
    },
    {
      id: "REV-90103",
      buyerName: "Njeri M.",
      buyerType: "Personal",
      roleTarget: "Provider",
      itemType: "Services",
      channel: "Retail",
      marketplace: "ServiceMart",
      rating: 5,
      title: "Excellent consultation",
      body: "Very professional consultation. Clear, actionable advice and friendly approach.",
      createdAt: agoH(70),
      verified: true,
      reference: { kind: "Booking", id: "BKG-219" },
      tags: ["professional", "value"],
      status: "Replied",
      sentiment: "Positive",
      requiresResponse: false,
      response: { at: agoH(66), by: "Support Team", text: "Thank you for the kind feedback. We are glad it helped." },
    },

    // MyLiveDealz — Live Sessionz rating (new requirement)
    {
      id: "REV-90099",
      buyerName: "Live Viewer",
      buyerType: "Personal",
      roleTarget: "Seller",
      itemType: "Services",
      channel: "MyLiveDealz",
      mldzSurface: "Live Sessionz",
      marketplace: "MyLiveDealz",
      rating: 4.7,
      title: "Host was clear and helpful",
      body: "The live session was engaging and the host answered questions quickly. Great pacing.",
      createdAt: agoH(82),
      verified: false,
      reference: { kind: "LiveSession", id: "LIVE-102" },
      tags: ["live", "engagement", "clarity"],
      status: "New",
      sentiment: "Positive",
      requiresResponse: true,
    },

    // MyLiveDealz — Shoppables rating (extra completeness)
    {
      id: "REV-90098",
      buyerName: "Dealz Buyer",
      buyerType: "Personal",
      roleTarget: "Seller",
      itemType: "Products",
      channel: "MyLiveDealz",
      mldzSurface: "Shoppables",
      marketplace: "MyLiveDealz",
      rating: 4.0,
      title: "Good deal, add more specs",
      body: "Great price on the shoppable item. Please add clearer sizing/spec details in the listing.",
      createdAt: agoH(95),
      verified: true,
      reference: { kind: "Campaign", id: "CMP-880" },
      tags: ["shoppables", "clarity"],
      status: "New",
      sentiment: "Neutral",
      requiresResponse: true,
    },

    {
      id: "REV-90088",
      buyerName: "Kato S.",
      buyerType: "Personal",
      roleTarget: "Seller",
      itemType: "Products",
      channel: "Retail",
      marketplace: "ExpressMart",
      rating: 1.8,
      title: "Wrong item delivered",
      body: "I received a different cable length than ordered. Please fix and respond.",
      createdAt: agoH(130),
      verified: true,
      reference: { kind: "Order", id: "ORD-10488" },
      tags: ["wrong item", "returns"],
      status: "Flagged",
      sentiment: "Negative",
      requiresResponse: true,
    },
    {
      id: "REV-90072",
      buyerName: "Faith Community Group",
      buyerType: "Organization",
      roleTarget: "Provider",
      itemType: "Services",
      channel: "CorporatePay",
      marketplace: "FaithMart",
      rating: 4.4,
      title: "Great community workshop",
      body: "Workshop was well-run and respectful. Appreciate the careful content moderation.",
      createdAt: agoH(180),
      verified: true,
      reference: { kind: "Booking", id: "BKG-201" },
      tags: ["community", "trust"],
      status: "Resolved",
      sentiment: "Positive",
      requiresResponse: false,
      response: { at: agoH(175), by: "Provider Team", text: "Thank you. We value trust and respectful engagement." },
    },
  ];

  const clusters: Cluster[] = [
    { label: "Communication", count: 3, tone: "orange" },
    { label: "Quality", count: 2, tone: "green" },
    { label: "SLA and timeliness", count: 2, tone: "danger" },
    { label: "Wrong item", count: 1, tone: "danger" },
    { label: "Live clarity", count: 2, tone: "orange" },
  ];

  const templates: Template[] = [
    { id: "TPL-01", title: "Thank you (positive)", tags: ["positive"], body: "Thank you for your review. We appreciate your support and are glad you had a good experience." },
    { id: "TPL-02", title: "Apology + fix steps (issue)", tags: ["negative", "issue"], body: "We are sorry for the experience. We are reviewing what happened and will propose a fix within 24 hours. Please share your reference ID and preferred resolution." },
    { id: "TPL-03", title: "CorporatePay response (organization)", tags: ["corporatepay", "wholesale"], body: "Thank you for the feedback. We will improve update frequency for your organization. We can also align on SLA and escalation contacts for future orders and RFQs." },
    { id: "TPL-04", title: "MyLiveDealz Live Sessionz reply", tags: ["mldz", "live"], body: "Thanks for joining the live. We appreciate your feedback. We will keep improving clarity, pacing, and Q&A in future sessions." },
    { id: "TPL-05", title: "MyLiveDealz Shoppables reply", tags: ["mldz", "shoppables"], body: "Thanks for the feedback. We will add clearer specs and sizing to the listing and highlight them in the next live." },
  ];

  const ratingBuckets: RatingBucket[] = [
    { stars: 5, pct: 44, count: 44 },
    { stars: 4, pct: 28, count: 28 },
    { stars: 3, pct: 14, count: 14 },
    { stars: 2, pct: 8, count: 8 },
    { stars: 1, pct: 6, count: 6 },
  ];

  const trend: TrendPoint[] = [
    { day: "Mon", rating: 4.4, volume: 18 },
    { day: "Tue", rating: 4.2, volume: 22 },
    { day: "Wed", rating: 4.5, volume: 19 },
    { day: "Thu", rating: 4.3, volume: 24 },
    { day: "Fri", rating: 4.6, volume: 31 },
    { day: "Sat", rating: 4.1, volume: 26 },
    { day: "Sun", rating: 4.5, volume: 21 },
  ];

  return { reviews, clusters, templates, ratingBuckets, trend };
}

function KpiSimple({ icon: Icon, label, value, tone, sub }: { icon: any; label: string; value: string; tone: Tone; sub: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "grid h-11 w-11 place-items-center rounded-2xl",
            tone === "green" && "bg-emerald-50 text-emerald-700",
            tone === "orange" && "bg-orange-50 text-orange-700",
            tone === "danger" && "bg-rose-50 text-rose-700",
            tone === "slate" && "bg-slate-100 text-slate-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold text-slate-600">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function SelectPill<T extends string>({ label, value, onChange, options }: { label: string; value: T | "All"; onChange: (v: any) => void; options: Array<T | "All"> }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-3 py-2">
      <div className="text-[11px] font-extrabold text-slate-600">{label}</div>
      <div className="relative">
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
        >
          {options.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function EmptyState({ title, message, onClear }: { title: string; message: string; onClear: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm font-semibold text-slate-500">{message}</div>
          <button
            type="button"
            onClick={onClear}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
            style={{ background: TOKENS.green }}
          >
            <Check className="h-4 w-4" />
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsHubUnifiedSupplierReputationV3() {
  const templates = REVIEW_REPLY_TEMPLATES;

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) => setToasts((s) => s.filter((x) => x.id !== id));

  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const payload = await sellerBackendApi.getReviews("received");
        if (cancelled) return;
        const rows = Array.isArray(payload) ? payload : [];
        setReviews(rows.map((row) => mapBackendReview(row as Record<string, unknown>)));
      } catch {
        if (!cancelled) {
          setReviews([]);
          pushToast({ title: "Backend unavailable", message: "Could not fetch reviews.", tone: "warning" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clusters = useMemo(() => buildClusters(reviews), [reviews]);
  const ratingBuckets = useMemo(() => buildRatingBuckets(reviews), [reviews]);
  const trend = useMemo(() => buildTrend(reviews), [reviews]);

  // Filters
  const [role, setRole] = useState<Role | "All">("All");
  const [itemType, setItemType] = useState<ItemType | "All">("All");
  const [channel, setChannel] = useState<Channel | "All">("All");
  const [mldzSurface, setMldzSurface] = useState<MldzSurface | "All">("All");
  const [buyerType, setBuyerType] = useState<Review["buyerType"] | "All">("All");
  const [marketplace, setMarketplace] = useState<string | "All">("All");
  const [status, setStatus] = useState<ReviewStatus | "All">("All");
  const [minRating, setMinRating] = useState<number>(0);
  const [query, setQuery] = useState<string>("");

  const marketplaces = useMemo(() => {
    const set = new Set<string>(reviews.map((r) => r.marketplace));
    return ["All", ...Array.from(set).sort()];
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews
      .filter((r) => (role === "All" ? true : r.roleTarget === role))
      .filter((r) => (itemType === "All" ? true : r.itemType === itemType))
      .filter((r) => (channel === "All" ? true : r.channel === channel))
      .filter((r) => (mldzSurface === "All" ? true : r.mldzSurface === mldzSurface))
      .filter((r) => (buyerType === "All" ? true : r.buyerType === buyerType))
      .filter((r) => (marketplace === "All" ? true : r.marketplace === marketplace))
      .filter((r) => (status === "All" ? true : r.status === status))
      .filter((r) => r.rating >= minRating)
      .filter((r) => {
        if (!q) return true;
        const hay = [r.id, r.buyerName, r.title, r.body, r.reference.id, r.marketplace, r.channel, r.mldzSurface || "", r.tags.join(" ")].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews, role, itemType, channel, mldzSurface, buyerType, marketplace, status, minRating, query]);

  const kpis = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const responseRate = total ? Math.round((reviews.filter((r) => !!r.response).length / total) * 100) : 0;
    const flagged = reviews.filter((r) => r.status === "Flagged").length;
    const needsReply = reviews.filter((r) => r.requiresResponse && !r.response).length;
    const trust = trustScore(reviews);
    return { total, avg, responseRate, flagged, needsReply, trust };
  }, [reviews]);

  const mldz = useMemo(() => {
    const list = reviews.filter((r) => r.channel === "MyLiveDealz");
    const by = (s: MldzSurface) => list.filter((r) => r.mldzSurface === s);
    const avg = (arr: Review[]) => (arr.length ? arr.reduce((sum, r) => sum + r.rating, 0) / arr.length : 0);
    const live = by("Live Sessionz");
    const shop = by("Shoppables");
    return {
      liveAvg: Math.round(avg(live) * 10) / 10,
      liveCount: live.length,
      shopAvg: Math.round(avg(shop) * 10) / 10,
      shopCount: shop.length,
    };
  }, [reviews]);

  // Selection + bulk
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const selectedRows = useMemo(() => filtered.filter((r) => selectedIds.includes(r.id)), [filtered, selectedIds]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected[r.id]);

  const toggleAllVisible = () => {
    if (!filtered.length) return;
    const next = { ...selected };
    if (allVisibleSelected) filtered.forEach((r) => delete next[r.id]);
    else filtered.forEach((r) => (next[r.id] = true));
    setSelected(next);
  };

  const exportCsv = (rows: any[]) => {
    if (!Array.isArray(rows) || !rows.length) return "";
    const headers = ["id", "createdAt", "buyerName", "buyerType", "roleTarget", "itemType", "channel", "mldzSurface", "marketplace", "rating", "status", "referenceKind", "referenceId", "title"];
    const escape = (v: any) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push(
        headers
          .map((h) => {
            if (h === "referenceKind") return escape(r.reference?.kind);
            if (h === "referenceId") return escape(r.reference?.id);
            if (h === "mldzSurface") return escape(r.mldzSurface || "");
            return escape((r as any)[h]);
          })
          .join(",")
      );
    });
    return lines.join("\n");
  };

  const bulkActions = {
    markResolved: async () => {
      if (!selectedIds.length) return;
      try {
        await Promise.all(
          selectedIds.map((id) =>
            sellerBackendApi.patchReview(id, {
              status: "PUBLISHED",
              requiresResponse: false,
              resolvedAt: new Date().toISOString(),
            })
          )
        );
      } catch {
        pushToast({ title: "Update failed", message: "Could not mark selected reviews as resolved.", tone: "danger" });
        return;
      }
      setReviews((prev) => prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "Resolved", requiresResponse: false } : r)));
      setSelected({});
      pushToast({ title: "Resolved", message: "Selected reviews marked as resolved.", tone: "success" });
    },
    exportSelection: () => {
      if (!selectedRows.length) {
        pushToast({ title: "Select reviews", message: "Select one or more first.", tone: "warning" });
        return;
      }
      safeCopy(exportCsv(selectedRows));
      pushToast({ title: "CSV copied", message: "Selection exported (clipboard).", tone: "success" });
    },
    evidenceBundle: () => {
      if (!selectedRows.length) {
        pushToast({ title: "Select reviews", message: "Select one or more first.", tone: "warning" });
        return;
      }
      const bundle = {
        bundleId: `EVB-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`,
        createdAt: new Date().toISOString(),
        count: selectedRows.length,
        items: selectedRows.map((r) => ({ id: r.id, rating: r.rating, channel: r.channel, mldzSurface: r.mldzSurface || null, marketplace: r.marketplace, reference: r.reference, status: r.status })),
        note: "Demo evidence bundle. In production: PDFs, signatures, chain of custody.",
      };
      safeCopy(JSON.stringify(bundle, null, 2));
      pushToast({ title: "Evidence bundle ready", message: "Copied as JSON.", tone: "success" });
    },
  };

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const active = useMemo(() => reviews.find((r) => r.id === detailId) || null, [reviews, detailId]);

  const [reply, setReply] = useState<string>("");
  const [useAutoTranslate, setUseAutoTranslate] = useState<boolean>(false);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id || "");
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!detailOpen) return;
    setReply(active?.response?.text || "");
    setUseAutoTranslate(false);
    setTemplateId(templates[0]?.id || "");
    window.setTimeout(() => replyRef.current?.focus?.(), 80);
  }, [detailOpen, active?.id]);

  const applyTemplate = () => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setReply((prev) => (prev.trim() ? prev : tpl.body));
    pushToast({ title: "Template applied", message: tpl.title, tone: "success" });
  };

  const aiSuggest = () => {
    if (!active) return;
    const base =
      active.sentiment === "Negative"
        ? "We are sorry for the experience. We want to make it right."
        : active.sentiment === "Neutral"
        ? "Thanks for the feedback. We will improve the experience."
        : "Thank you for your review. We appreciate your support.";

    const add =
      active.channel === "CorporatePay"
        ? " We can align on SLA updates for your organization and set an escalation contact."
        : active.channel === "MyLiveDealz" && active.mldzSurface === "Live Sessionz"
        ? " We will keep improving live clarity, pacing and Q&A."
        : active.channel === "MyLiveDealz" && active.mldzSurface === "Shoppables"
        ? " We will add clearer specs and sizing to the listing and highlight them in the next live."
        : active.itemType === "Services"
        ? " We will improve scheduling and milestone communication."
        : " We will review packing and product accuracy checks.";

    const closing = " Please share your preferred resolution and reference ID so we can assist quickly.";

    setReply(`${base}${add}${closing}`);
    pushToast({ title: "AI suggestion", message: "Draft response generated.", tone: "default" });
  };

  const sendReply = async () => {
    if (!active) return;
    const text = reply.trim();
    if (!text) {
      pushToast({ title: "Reply required", message: "Write a response first.", tone: "warning" });
      return;
    }

    const final = useAutoTranslate ? `${text}\n\n(Translated automatically)` : text;

    try {
      await sellerBackendApi.replyReview(active.id, { body: final, visibility: "PUBLIC" });
      await sellerBackendApi.patchReview(active.id, {
        status: active.status === "Flagged" ? "FLAGGED" : "PUBLISHED",
        requiresResponse: false,
      });
    } catch {
      pushToast({ title: "Send failed", message: "Could not persist the response.", tone: "danger" });
      return;
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === active.id
          ? { ...r, status: r.status === "Flagged" ? "Flagged" : "Replied", requiresResponse: false, response: { at: new Date().toISOString(), by: "Supplier Team", text: final } }
          : r
      )
    );

    pushToast({ title: "Response sent", message: "Reply posted to buyer.", tone: "success" });
    setDetailOpen(false);
  };

  const ratingAvgTrend = useMemo(() => {
    const avg = trend.reduce((s, t) => s + t.rating, 0) / Math.max(1, trend.length);
    const last = trend[trend.length - 1]?.rating ?? avg;
    const delta = Math.round((last - avg) * 100) / 100;
    return { avg: Math.round(avg * 10) / 10, delta };
  }, [trend]);

  const background =
    "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.10) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)";

  const setMldzFocus = (surface: MldzSurface) => {
    setChannel("MyLiveDealz");
    setMldzSurface(surface);
    pushToast({ title: "MyLiveDealz filter", message: surface, tone: "default" });
  };

  return (
    <div className="min-h-screen" style={{ background }}>
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Reviews and Ratings</div>
                <Badge tone="slate">/reviews</Badge>
                <Badge tone="slate">SupplierHub</Badge>
                <Badge tone="orange">Unified</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Seller/Provider reputation across Products/Services, Retail/Wholesale/CorporatePay/MyLiveDealz.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  safeCopy(exportCsv(filtered));
                  pushToast({ title: "CSV copied", message: "Filtered reviews exported (clipboard).", tone: "success" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Refreshed", message: "Latest reviews loaded.", tone: "success" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => pushToast({ title: "Review policy", message: "Wire to review moderation policy.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <ShieldCheck className="h-4 w-4" />
                Policy
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <KpiSimple icon={Star} label="Average rating" value={kpis.avg.toFixed(1)} tone="orange" sub={`${kpis.total} total`} />
          <KpiSimple icon={MessageCircle} label="Needs reply" value={String(kpis.needsReply)} tone={kpis.needsReply ? "orange" : "green"} sub="Buyer expects a response" />
          <KpiSimple icon={AlertTriangle} label="Flagged" value={String(kpis.flagged)} tone={kpis.flagged ? "danger" : "green"} sub="Risk and disputes" />
          <KpiSimple icon={CheckCheck} label="Response rate" value={pctLabel(Math.round((reviews.filter((r) => !!r.response).length / Math.max(1, reviews.length)) * 100))} tone={kpis.responseRate >= 85 ? "green" : "orange"} sub="Replies posted" />
          <KpiSimple icon={ShieldCheck} label="Trust score" value={`${kpis.trust}/100`} tone={kpis.trust >= 85 ? "green" : kpis.trust >= 70 ? "orange" : "danger"} sub="Composite reputation" />
        </div>

        {/* Insights */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <GlassCard className="p-5 lg:col-span-7">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Ratings insight</div>
              <span className="ml-auto"><Badge tone="slate">Last 7 days</Badge></span>
            </div>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-extrabold text-slate-600">Distribution</div>
                <div className="mt-3 space-y-2">
                  {ratingBuckets.map((b) => (
                    <div key={b.stars} className="rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs font-black text-slate-800">{b.stars}</span>
                          <Star className="h-4 w-4 text-orange-500" fill="currentColor" />
                        </span>
                        <span className="ml-auto text-[11px] font-extrabold text-slate-600">{b.count}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-orange-500" style={{ width: `${clamp(b.pct, 0, 100)}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">{b.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-slate-600">Trend snapshot</div>
                <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">Avg rating</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{ratingAvgTrend.avg} / 5</div>
                    </div>
                    <div className={cx("text-xs font-extrabold", ratingAvgTrend.delta >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {ratingAvgTrend.delta >= 0 ? "+" : ""}
                      {ratingAvgTrend.delta.toFixed(2)}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {trend.map((t) => (
                      <div key={t.day} className="flex items-center gap-3">
                        <div className="w-10 text-[11px] font-extrabold text-slate-600">{t.day}</div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-slate-100">
                            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${clamp((t.rating / 5) * 100, 0, 100)}%` }} />
                          </div>
                        </div>
                        <div className="w-14 text-right text-[11px] font-extrabold text-slate-700">{t.rating.toFixed(1)}</div>
                        <Badge tone="slate">{t.volume}</Badge>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Cohorts", message: "Wire cohort and attribution analytics.", tone: "default" })}
                    className="mt-4 w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Open advanced analytics
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">Top themes</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Sentiment clusters and MyLiveDealz surface ratings.</div>
              </div>
              <Badge tone="orange">Premium</Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {clusters.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    setQuery(c.label);
                    pushToast({ title: "Filtered", message: `Showing: ${c.label}`, tone: "default" });
                  }}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold",
                    c.tone === "danger"
                      ? "border-rose-200 text-rose-700"
                      : c.tone === "orange"
                      ? "border-orange-200 text-orange-700"
                      : "border-emerald-200 text-emerald-700"
                  )}
                >
                  {c.label}
                  <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">{c.count}</span>
                </button>
              ))}
            </div>

            {/* MyLiveDealz ratings */}
            <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                  <Star className="h-5 w-5" fill="currentColor" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-900">MyLiveDealz ratings</div>
                  <div className="mt-1 text-xs font-semibold text-orange-900/70">Live Sessionz ratings are tracked separately from Shoppables.</div>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setMldzFocus("Live Sessionz")}
                      className="flex items-center justify-between rounded-3xl border border-orange-200 bg-white dark:bg-slate-900/70 p-3 text-left"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-700">Live Sessionz</div>
                        <div className="mt-1"><StarRating value={mldz.liveAvg} /></div>
                      </div>
                      <div className="text-right">
                        <Badge tone="slate">{mldz.liveCount} reviews</Badge>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMldzFocus("Shoppables")}
                      className="flex items-center justify-between rounded-3xl border border-orange-200 bg-white dark:bg-slate-900/70 p-3 text-left"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-slate-700">Shoppables</div>
                        <div className="mt-1"><StarRating value={mldz.shopAvg} /></div>
                      </div>
                      <div className="text-right">
                        <Badge tone="slate">{mldz.shopCount} reviews</Badge>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">How trust score works</div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">Trust score combines rating, response rate, and negative volume.</div>
              <Progress value={kpis.trust} tone={kpis.trust >= 85 ? "green" : kpis.trust >= 70 ? "orange" : "danger"} />
            </div>
          </GlassCard>
        </div>

        {/* Filters (compact) */}
        <div className="mt-4">
          <GlassCard className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Reviews</div>
                <Badge tone="slate">{filtered.length}</Badge>
                <Badge tone="slate">Star rating is orange</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search buyer, tags, reference"
                    className="h-10 w-[min(520px,82vw)] rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRole("All");
                    setItemType("All");
                    setChannel("All");
                    setMldzSurface("All");
                    setBuyerType("All");
                    setMarketplace("All");
                    setStatus("All");
                    setMinRating(0);
                    setQuery("");
                    setSelected({});
                    pushToast({ title: "Cleared", message: "Filters reset.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SelectPill label="Role" value={role} onChange={setRole} options={(["All", "Seller", "Provider"] as const) as any} />
              <SelectPill label="Type" value={itemType} onChange={setItemType} options={(["All", "Products", "Services"] as const) as any} />
              <SelectPill label="Channel" value={channel} onChange={setChannel} options={(["All", "Retail", "Wholesale", "CorporatePay", "MyLiveDealz"] as const) as any} />
              <SelectPill label="MLDz" value={mldzSurface} onChange={setMldzSurface} options={(["All", "Live Sessionz", "Shoppables"] as const) as any} />
              <SelectPill label="Buyer" value={buyerType} onChange={setBuyerType} options={(["All", "Personal", "Organization"] as const) as any} />
              <SelectPill label="Marketplace" value={marketplace} onChange={setMarketplace} options={marketplaces as any} />
              <SelectPill label="Status" value={status} onChange={setStatus} options={(["All", "New", "Replied", "Flagged", "Resolved"] as const) as any} />
              <span className="ml-auto"><Badge tone="slate">Compact</Badge></span>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-12 md:items-center">
              <div className="md:col-span-6">
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                  <div className="text-xs font-extrabold text-slate-600">Min rating</div>
                  <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="flex-1" />
                  <Badge tone="orange">{minRating.toFixed(1)}+</Badge>
                </div>
              </div>

              <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold",
                    allVisibleSelected ? "border-emerald-200 text-emerald-800" : "border-slate-200/70 text-slate-800"
                  )}
                >
                  <Check className="h-4 w-4" />
                  {allVisibleSelected ? "Unselect all" : "Select all"}
                </button>

                <button
                  type="button"
                  onClick={bulkActions.exportSelection}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Export selection
                </button>

                <button
                  type="button"
                  onClick={bulkActions.evidenceBundle}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                >
                  <BadgeCheck className="h-4 w-4" />
                  Evidence
                </button>

                <button
                  type="button"
                  onClick={bulkActions.markResolved}
                  className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark resolved
                </button>

                <span className="ml-auto md:ml-2"><Badge tone="slate">Selected {selectedIds.length}</Badge></span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Reviews table */}
        <div className="mt-4">
          <GlassCard className="overflow-hidden">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">All reviews</div>
                  <Badge tone="slate">{filtered.length}</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a row to open details and respond</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[1220px]">
                <div className="grid grid-cols-12 gap-2 border-b border-slate-200/70 px-4 py-3 text-[11px] font-extrabold text-slate-500">
                  <div className="col-span-1">Sel</div>
                  <div className="col-span-3">Buyer</div>
                  <div className="col-span-2">Rating</div>
                  <div className="col-span-3">Review</div>
                  <div className="col-span-2">Signals</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {filtered.map((r) => {
                    const checked = !!selected[r.id];
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setDetailId(r.id);
                          setDetailOpen(true);
                        }}
                        className={cx(
                          "grid w-full grid-cols-12 gap-2 px-4 py-3 text-left text-xs font-semibold text-slate-700 transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          r.status === "Flagged" && "bg-rose-50/30"
                        )}
                      >
                        <div className="col-span-1 flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected((m) => ({ ...m, [r.id]: !checked }));
                            }}
                            className={cx("grid h-9 w-9 place-items-center rounded-2xl border bg-white dark:bg-slate-900", checked ? "border-emerald-200" : "border-slate-200/70")}
                            aria-label={checked ? "Unselect" : "Select"}
                          >
                            {checked ? <Check className="h-4 w-4 text-emerald-700" /> : <span className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex items-start gap-3">
                            <Avatar name={r.buyerName} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-black text-slate-900">{r.buyerName}</div>
                                <Badge tone="slate">{r.buyerType}</Badge>
                                {r.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="slate">Unverified</Badge>}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                                <Badge tone="slate">{r.roleTarget}</Badge>
                                <Badge tone="slate">{r.itemType}</Badge>
                                <span className="ml-auto">{fmtTime(r.createdAt)}</span>
                              </div>
                              <div className="mt-1 text-[11px] font-semibold text-slate-500">Ref: {r.reference.kind} {r.reference.id}</div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                          <div>
                            <StarRating value={r.rating} />
                            <div className="mt-1 flex flex-wrap gap-2">
                              <Badge tone={sentimentTone(r.sentiment)}>{r.sentiment}</Badge>
                              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={channelTone(r.channel)}>{r.channel}</Badge>
                            {r.channel === "MyLiveDealz" && r.mldzSurface ? <Badge tone="orange">{r.mldzSurface}</Badge> : null}
                            <Badge tone="slate">{r.marketplace}</Badge>
                            {r.requiresResponse && !r.response ? <Badge tone="orange">Needs reply</Badge> : <Badge tone="green">OK</Badge>}
                          </div>
                          <div className="mt-2 truncate text-sm font-black text-slate-900">{r.title}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-600" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {r.body}
                          </div>
                        </div>

                        <div className="col-span-2 flex flex-wrap items-center gap-2">
                          {(r.tags || []).slice(0, 2).map((t) => (
                            <Badge key={t} tone="slate">{t}</Badge>
                          ))}
                          <Badge tone="slate">{r.id}</Badge>
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <IconButton
                            label="Copy"
                            onClick={(e?: any) => {
                              e?.stopPropagation?.();
                              safeCopy(r.id);
                              pushToast({ title: "Copied", message: "Review ID copied.", tone: "success" });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label="Open"
                            onClick={(e?: any) => {
                              e?.stopPropagation?.();
                              setDetailId(r.id);
                              setDetailOpen(true);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title="No reviews match"
                        message="Try clearing filters or searching for another buyer, tag, or reference."
                        onClear={() => {
                          setRole("All");
                          setItemType("All");
                          setChannel("All");
                          setMldzSurface("All");
                          setBuyerType("All");
                          setMarketplace("All");
                          setStatus("All");
                          setMinRating(0);
                          setQuery("");
                          setSelected({});
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Detail drawer */}
      <Drawer
        open={detailOpen}
        title={active ? `Review · ${active.id}` : "Review"}
        subtitle={active ? `${active.buyerName} · ${active.channel}${active.mldzSurface ? ` · ${active.mldzSurface}` : ""}` : ""}
        onClose={() => setDetailOpen(false)}
      >
        {!active ? (
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-5 text-sm font-semibold text-slate-600">Select a review.</div>
        ) : (
          <div className="space-y-3">
            <div className={cx("rounded-3xl border p-4", active.status === "Flagged" ? "border-rose-200 bg-rose-50/50" : "border-slate-200/70 bg-white dark:bg-slate-900/70")}>
              <div className="flex items-start gap-3">
                <Avatar name={active.buyerName} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-slate-900">{active.buyerName}</div>
                    <Badge tone="slate">{active.buyerType}</Badge>
                    {active.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="slate">Unverified</Badge>}
                    <Badge tone={channelTone(active.channel)}>{active.channel}</Badge>
                    {active.channel === "MyLiveDealz" && active.mldzSurface ? <Badge tone="orange">{active.mldzSurface}</Badge> : null}
                    <Badge tone="slate">{active.roleTarget}</Badge>
                    <Badge tone={statusTone(active.status)}>{active.status}</Badge>
                    <span className="ml-auto"><Badge tone="slate">{fmtTime(active.createdAt)}</Badge></span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StarRating value={active.rating} />
                    <Badge tone={sentimentTone(active.sentiment)}>{active.sentiment}</Badge>
                    <Badge tone="slate">{active.itemType}</Badge>
                    <Badge tone="slate">Ref {active.reference.kind} {active.reference.id}</Badge>
                  </div>

                  <div className="mt-3 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900 p-4">
                    <div className="text-sm font-black text-slate-900">{active.title}</div>
                    <div className="mt-2 text-sm font-semibold text-slate-700 whitespace-pre-wrap">{active.body}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(active.tags || []).map((t) => (
                        <Badge key={t} tone="slate">{t}</Badge>
                      ))}
                    </div>
                  </div>

                  {active.response ? (
                    <div className="mt-3 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCheck className="h-4 w-4 text-emerald-700" />
                        <div className="text-sm font-black text-emerald-900">Response</div>
                        <span className="ml-auto"><Badge tone="green">{fmtTime(active.response.at)}</Badge></span>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-emerald-900/70">By {active.response.by}</div>
                      <div className="mt-3 whitespace-pre-wrap rounded-3xl border border-emerald-200 bg-white dark:bg-slate-900 p-4 text-sm font-semibold text-slate-800">{active.response.text}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Reply */}
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <MessageCircle className="h-4 w-4 text-slate-700" />
                <div className="text-sm font-black text-slate-900">Reply</div>
                <Badge tone="orange">Super premium</Badge>
                <span className="ml-auto"><Badge tone="slate">Orange stars</Badge></span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-12 md:items-center">
                <div className="md:col-span-6">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Template</div>
                    <div className="relative ml-auto">
                      <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                      >
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <button
                      type="button"
                      onClick={applyTemplate}
                      className="ml-2 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                      style={{ background: TOKENS.green }}
                    >
                      <Plus className="h-4 w-4" />
                      Apply
                    </button>
                  </div>
                </div>

                <div className="md:col-span-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={aiSuggest}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-orange-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI suggestion
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                    <Globe className="h-4 w-4 text-slate-500" />
                    <div className="text-xs font-extrabold text-slate-700">Auto-translate</div>
                    <Switch checked={useAutoTranslate} onChange={setUseAutoTranslate} label="Auto translate" />
                  </div>
                </div>
              </div>

              <textarea
                ref={replyRef}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={6}
                placeholder="Write your response..."
                className="mt-3 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
              />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    safeCopy(reply);
                    pushToast({ title: "Copied", message: "Reply copied.", tone: "success" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReply("");
                    pushToast({ title: "Cleared", message: "Reply cleared.", tone: "default" });
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-extrabold text-slate-800"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sellerBackendApi.patchReview(active.id, {
                        status: "PUBLISHED",
                        requiresResponse: false,
                        resolvedAt: new Date().toISOString(),
                      });
                    } catch {
                      pushToast({ title: "Resolve failed", message: "Could not update review status.", tone: "danger" });
                      return;
                    }
                    setReviews((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: "Resolved", requiresResponse: false } : r)));
                    pushToast({ title: "Resolved", message: "Marked as resolved.", tone: "success" });
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark resolved
                </button>

                <button
                  type="button"
                  onClick={sendReply}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: TOKENS.green }}
                >
                  <Send className="h-4 w-4" />
                  Send reply
                </button>
              </div>

              <div className="mt-3 rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-orange-900">Guidance</div>
                    <div className="mt-1 text-xs font-semibold text-orange-900/70">Keep replies respectful. Offer clear next steps and request references when needed.</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
