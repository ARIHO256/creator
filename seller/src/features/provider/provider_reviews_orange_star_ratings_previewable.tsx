import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sellerBackendApi } from "../../lib/backendApi";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  Info,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";

/**
 * Provider Reviews (Previewable)
 * Route: /provider/reviews
 * Core:
 * - Rating trends
 * - Reply to reviews
 * Super premium:
 * - Sentiment clustering
 * - Response suggestions
 */

const TOKENS = {
  green: "#03CD8C",
  greenDeep: "#02B77E",
  orange: "#F77F00",
  black: "#0B0F14",
};

type ToastTone = "success" | "warning" | "danger" | "default" | "info";
type Toast = {
  id: string;
  tone?: ToastTone;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
};
type ReviewReply = { text: string; createdAt: string; visibility: "public" | "private" };
type Review = {
  id: string;
  buyer: string;
  rating: number;
  createdAt: string;
  source: string;
  topics: string[];
  text: string;
  sentiment: number;
  reply: ReviewReply | null;
};
type SentimentKey = "Positive" | "Neutral" | "Negative";
type SentimentLabel = { k: SentimentKey; tone: "green" | "orange" | "danger" };
type SuggestionTone = "danger" | "orange" | "green" | "slate";
type Suggestion = { id: string; tone: SuggestionTone; title: string; text: string };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeCopy(text: string) {
  try {
    navigator.clipboard?.writeText(String(text));
  } catch {
    // ignore
  }
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "green" | "orange" | "danger" | "slate";
}) {
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

function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

function Chip({
  active,
  onClick,
  children,
  tone = "green",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "green" | "orange";
}) {
  const activeCls =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "whitespace-nowrap rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
        active ? activeCls : "border-slate-200/70 bg-white dark:bg-slate-900/70 text-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900/80 text-slate-800 transition hover:bg-gray-50 dark:hover:bg-slate-800"
    >
      {children}
    </button>
  );
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  const r = clamp(Number(rating || 0), 0, 5);
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rating ${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= r;
        return (
          <Star
            key={i}
            className={cx("text-slate-300", filled && "text-[#F77F00]")}
            style={{ width: size, height: size }}
            fill={filled ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 260;
  const h = 70;
  const pad = 8;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const ys = points.map((p) => {
    const t = max === min ? 0.5 : (p - min) / (max - min);
    return h - pad - t * (h - pad * 2);
  });
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block text-slate-800">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`} fill="currentColor" opacity="0.08" />
    </svg>
  );
}

function ToastCenter({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-[92vw] max-w-[420px] flex-col gap-2">
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

function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed right-0 top-0 z-[85] h-screen w-[96vw] max-w-[720px] border-l border-slate-200/70 bg-white dark:bg-slate-900/95 shadow-2xl backdrop-blur"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200/70 px-4 py-3" style={{ background: "rgba(255,255,255,0.85)" }}>
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

function seedReviews(): Review[] {
  const now = Date.now();
  const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

  return [
    {
      id: "REV-10091",
      buyer: "Amina K.",
      rating: 5,
      createdAt: ago(65),
      source: "EVzone",
      topics: ["Communication", "Quality"],
      text: "Very professional and fast. Communication was clear and the work quality exceeded expectations.",
      sentiment: 0.86,
      reply: {
        text: "Thank you, Amina. We appreciate the trust and we are always here to support you.",
        createdAt: ago(22),
        visibility: "public",
      },
    },
    {
      id: "REV-10090",
      buyer: "Kato S.",
      rating: 4,
      createdAt: ago(140),
      source: "WhatsApp",
      topics: ["Delivery", "Communication"],
      text: "Good service overall. The delivery window was a bit tight, but the team updated me on time.",
      sentiment: 0.42,
      reply: null,
    },
    {
      id: "REV-10089",
      buyer: "Moses N.",
      rating: 2,
      createdAt: ago(420),
      source: "EVzone",
      topics: ["Pricing", "Support"],
      text: "Pricing was higher than expected and I did not get quick support after payment.",
      sentiment: -0.62,
      reply: null,
    },
    {
      id: "REV-10088",
      buyer: "Sarah T.",
      rating: 3,
      createdAt: ago(980),
      source: "API",
      topics: ["Quality"],
      text: "The job was done, but I expected better finishing details. It is okay, not great.",
      sentiment: -0.05,
      reply: null,
    },
    {
      id: "REV-10087",
      buyer: "Ibrahim H.",
      rating: 5,
      createdAt: ago(1680),
      source: "EVzone",
      topics: ["Support"],
      text: "Support was excellent. They guided me through every step and solved my issue quickly.",
      sentiment: 0.74,
      reply: {
        text: "Thank you, Ibrahim. We are glad the guidance helped. Feel free to reach out anytime.",
        createdAt: ago(1550),
        visibility: "public",
      },
    },
    {
      id: "REV-10086",
      buyer: "Chen L.",
      rating: 1,
      createdAt: ago(2920),
      source: "EVzone",
      topics: ["Delivery", "Support"],
      text: "The provider missed the agreed time and did not respond until the next day.",
      sentiment: -0.86,
      reply: null,
    },
  ];
}

function sentimentLabel(score: number): SentimentLabel {
  const s = Number(score);
  if (s >= 0.25) return { k: "Positive", tone: "green" };
  if (s <= -0.25) return { k: "Negative", tone: "danger" };
  return { k: "Neutral", tone: "orange" };
}

function clusterKey(topics: string[] = []) {
  const t = new Set((topics || []).map((x) => String(x).toLowerCase()));
  if (t.has("quality")) return "Quality";
  if (t.has("communication")) return "Communication";
  if (t.has("delivery")) return "Delivery";
  if (t.has("pricing")) return "Pricing";
  if (t.has("support")) return "Support";
  return "Other";
}

function buildSuggestions(review: Review | null): Suggestion[] {
  if (!review) return [];

  const { rating, topics = [] } = review;
  const t = new Set(topics.map((x) => String(x).toLowerCase()));
  const sent = sentimentLabel(review.sentiment).k;

  const base: Suggestion[] = [];

  const add = (tone: SuggestionTone, title: string, text: string) => {
    base.push({ id: makeId("sug"), tone, title, text });
  };

  if (rating >= 4) {
    add(
      "green",
      "Thank and reinforce trust",
      `Thank you for the feedback. We are glad you were satisfied. If you need support again, we are ready to help.`
    );
    if (t.has("communication")) {
      add(
        "green",
        "Highlight communication",
        `Thank you. We are happy our communication was clear. We will keep updates timely and easy to follow.`
      );
    }
    add(
      "orange",
      "Invite a follow up",
      `Thanks for choosing us. If there is anything you would like improved next time, please share and we will act on it.`
    );
  } else if (rating === 3) {
    add(
      "orange",
      "Acknowledge and ask for specifics",
      `Thank you for the honest review. Please share the specific areas we should improve, and we will address them quickly.`
    );
    if (t.has("quality")) {
      add(
        "orange",
        "Quality improvement",
        `Thank you. We will review the finishing details and improve our quality checks. If you can share a photo or detail, we will follow up.`
      );
    }
    add(
      "slate",
      "Offer a resolution path",
      `We appreciate the feedback. We can schedule a quick check-in to ensure everything meets your expectations.`
    );
  } else {
    add(
      "danger",
      "Apologize and take ownership",
      `We are sorry for the experience. This is not the standard we aim for. We will investigate and fix it, and follow up with you promptly.`
    );
    if (t.has("delivery")) {
      add(
        "danger",
        "Delivery issue response",
        `We apologize for missing the agreed time. We are improving scheduling and escalation to avoid delays. Please share your preferred time and we will prioritize a correction.`
      );
    }
    if (t.has("support")) {
      add(
        "orange",
        "Support escalation",
        `Thank you for raising this. We will escalate your case to support and ensure you get a response within a clear time window.`
      );
    }
    if (t.has("pricing")) {
      add(
        "orange",
        "Pricing clarity",
        `We understand pricing concerns. We will share a clear breakdown and options so you can choose what fits best next time.`
      );
    }
  }

  // Super premium: add a short AI style suggestion
  add(
    sent === "Negative" ? "danger" : sent === "Neutral" ? "orange" : "green",
    "Suggested tone",
    sent === "Negative"
      ? "Use a calm apology, confirm next steps, and offer a clear resolution timeline."
      : sent === "Neutral"
      ? "Use a warm thank you and ask one clear question for improvement details."
      : "Use a short thank you and invite future bookings."
  );

  return base.slice(0, 4);
}

export default function ProviderReviewsPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (t: Omit<Toast, "id">) => {
    const id = makeId("toast");
    setToasts((s) => [{ id, ...t }, ...s].slice(0, 4));
    window.setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: string) =>
    setToasts((s) => s.filter((x) => x.id !== id));

  const [reviews, setReviews] = useState<Review[]>([]);

  const [cluster, setCluster] = useState<string>("All");
  const [sentiment, setSentiment] = useState<string>("All");
  const [sort, setSort] = useState<string>("Newest");
  const [query, setQuery] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;

    void sellerBackendApi.getProviderReviews().then((payload) => {
      if (!active) return;
      const rows = Array.isArray((payload as { reviews?: unknown[] }).reviews)
        ? ((payload as { reviews?: Array<Record<string, unknown>> }).reviews ?? [])
        : [];
      setReviews(
        rows.map((row) => {
          const tags = Array.isArray(row.quickTags) ? row.quickTags.map((item) => String(item)) : [];
          return {
            id: String(row.id ?? ""),
            buyer: String(row.buyerName ?? "Customer"),
            rating: Number(row.ratingOverall ?? 0),
            createdAt: String(row.createdAt ?? new Date().toISOString()),
            source: String(row.channel ?? row.marketplace ?? "Seller"),
            topics: tags.length ? tags : ["Support"],
            text: String(row.reviewText ?? ""),
            sentiment:
              String(row.sentiment ?? "").toLowerCase() === "positive"
                ? 0.8
                : String(row.sentiment ?? "").toLowerCase() === "negative"
                  ? -0.8
                  : 0.1,
            reply: null,
          } satisfies Review;
        })
      );
    });

    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!reviews.find((r) => r.id === activeId)) setActiveId(reviews[0]?.id ?? null);
  }, [reviews, activeId]);

  const active = useMemo(() => reviews.find((r) => r.id === activeId) || null, [reviews, activeId]);

  const clusters = useMemo(() => {
    const map = new Map<string, number>();
    reviews.forEach((r) => {
      const k = clusterKey(r.topics);
      map.set(k, (map.get(k) || 0) + 1);
    });
    const entries = Array.from(map.entries()).map(([k, count]) => ({ k, count }));
    entries.sort((a, b) => b.count - a.count);
    return [{ k: "All", count: reviews.length }, ...entries];
  }, [reviews]);

  const ratingAvg = useMemo(() => {
    if (!reviews.length) return 0;
    const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const replyRate = useMemo(() => {
    if (!reviews.length) return 0;
    const replied = reviews.filter((r) => !!r.reply).length;
    return Math.round((replied / reviews.length) * 100);
  }, [reviews]);

  const sentimentCounts = useMemo(() => {
    const base = { Positive: 0, Neutral: 0, Negative: 0 };
    reviews.forEach((r) => {
      const k = sentimentLabel(r.sentiment).k;
      base[k] += 1;
    });
    return base;
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...reviews];

    if (cluster !== "All") list = list.filter((r) => clusterKey(r.topics) === cluster);
    if (sentiment !== "All") list = list.filter((r) => sentimentLabel(r.sentiment).k === sentiment);

    if (q) {
      list = list.filter((r) => {
        const hay = [r.id, r.buyer, r.source, (r.topics || []).join(" "), r.text].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    if (sort === "Newest") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "Highest") list.sort((a, b) => Number(b.rating) - Number(a.rating));
    if (sort === "Lowest") list.sort((a, b) => Number(a.rating) - Number(b.rating));
    if (sort === "Unreplied") list = list.filter((r) => !r.reply);

    return list;
  }, [reviews, cluster, sentiment, sort, query]);

  const trendPoints = useMemo(() => {
    // Demo trend: last 12 points derived from ratings + slight smoothing.
    const base = Array.from({ length: 12 }).map((_, i) => {
      const pick = reviews[(i * 7) % Math.max(1, reviews.length)];
      const v = pick ? Number(pick.rating) : 4;
      return clamp(v + (i % 3 === 0 ? 0.2 : i % 3 === 1 ? -0.15 : 0.05), 1, 5);
    });
    return base;
  }, [reviews]);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [visibility, setVisibility] = useState<ReviewReply["visibility"]>("public");

  useEffect(() => {
    if (!replyOpen) return;
    if (!active) return;
    setReplyDraft(active.reply?.text || "");
    setVisibility(active.reply?.visibility || "public");
  }, [replyOpen, active?.id]);

  const suggestions = useMemo<Suggestion[]>(() => buildSuggestions(active), [active?.id]);

  const sendReply = () => {
    if (!active) return;
    const text = replyDraft.trim();
    if (!text) {
      pushToast({ title: "Reply required", message: "Write a short reply first.", tone: "warning" });
      return;
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === active.id
          ? {
              ...r,
              reply: {
                text,
                createdAt: new Date().toISOString(),
                visibility,
              },
            }
          : r
      )
    );

    setReplyOpen(false);
    pushToast({ title: "Reply sent", message: `Reply published (${visibility}).`, tone: "success" });
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 520px at 18% -10%, rgba(3,205,140,0.18) 0%, rgba(3,205,140,0.0) 55%), radial-gradient(900px 420px at 110% 0%, rgba(247,127,0,0.08) 0%, rgba(247,127,0,0.0) 55%), var(--page-gradient-base)",
      }}
    >
      <div className="w-full px-[0.55%] py-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Reviews</div>
                <Badge tone="slate">/provider/reviews</Badge>
                <Badge tone="slate">Provider</Badge>
                <Badge tone="orange">Super premium</Badge>
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Rating trends, replies, sentiment clustering and response suggestions.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => pushToast({ title: "Export", message: "Wire export to PDF/CSV.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-2 text-xs font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <BarChart3 className="h-4 w-4" />
                Export
              </button>
              <button
                type="button"
                onClick={() => pushToast({ title: "Preferences", message: "Wire reply templates, categories, and SLA rules.", tone: "default" })}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                style={{ background: TOKENS.green }}
              >
                <Sparkles className="h-4 w-4" />
                Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-3 md:grid-cols-4">
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Average rating</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-2xl font-black text-slate-900">{ratingAvg}</div>
                  <StarRow rating={Math.round(ratingAvg)} size={14} />
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Reply rate</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{replyRate}%</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Total reviews</div>
                <div className="mt-1 text-2xl font-black text-slate-900">{reviews.length}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-600">Sentiment mix</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="green">Pos {sentimentCounts.Positive}</Badge>
                  <Badge tone="orange">Neu {sentimentCounts.Neutral}</Badge>
                  <Badge tone="danger">Neg {sentimentCounts.Negative}</Badge>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filters */}
        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <GlassCard className="p-4 lg:col-span-8">
            <div className="grid gap-2 md:grid-cols-12 md:items-center">
              <div className="relative md:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search buyer, topic, text, ID"
                  className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <div className="text-xs font-extrabold text-slate-700">Sort</div>
                  <div className="relative ml-auto">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="h-9 appearance-none rounded-xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 pr-8 text-xs font-extrabold text-slate-800"
                    >
                      {["Newest", "Highest", "Lowest", "Unreplied"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-3">
                <div className="flex flex-wrap gap-2">
                  {["All", "Positive", "Neutral", "Negative"].map((s) => (
                    <Chip key={s} active={sentiment === s} onClick={() => setSentiment(s)} tone={s === "Negative" ? "orange" : "green"}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {clusters.map((c) => (
                <Chip key={c.k} active={cluster === c.k} onClick={() => setCluster(c.k)}>
                  {c.k}
                  <span className="ml-2 text-slate-500">{c.count}</span>
                </Chip>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 lg:col-span-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-700" />
              <div className="text-sm font-black text-slate-900">Rating trends</div>
              <span className="ml-auto"><Badge tone="slate">Last 12</Badge></span>
            </div>
            <div className="mt-3"><Sparkline points={trendPoints} /></div>
            <div className="mt-2 text-xs font-semibold text-slate-500">Premium: segment by service type, region, and source.</div>
          </GlassCard>
        </div>

        {/* Content */}
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* List */}
          <GlassCard className="overflow-hidden lg:col-span-8">
            <div className="border-b border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-slate-700" />
                  <div className="text-sm font-black text-slate-900">Review inbox</div>
                  <Badge tone="slate">{filtered.length} shown</Badge>
                </div>
                <div className="text-xs font-semibold text-slate-500">Click a review to open suggestions</div>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {filtered.map((r) => {
                const isActive = r.id === activeId;
                const s = sentimentLabel(r.sentiment);
                const clusterName = clusterKey(r.topics);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={cx(
                      "w-full text-left px-4 py-4 transition",
                      isActive ? "bg-emerald-50/60" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                        <Star className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-black text-slate-900">{r.buyer}</div>
                          <StarRow rating={r.rating} size={14} />
                          <Badge tone={s.tone}>{s.k}</Badge>
                          <Badge tone="slate">{clusterName}</Badge>
                          {r.reply ? <Badge tone="green">Replied</Badge> : <Badge tone="orange">Unreplied</Badge>}
                          <span className="ml-auto text-[11px] font-semibold text-slate-500">{fmtTime(r.createdAt)}</span>
                        </div>

                        <div
                          className="mt-2 text-sm font-semibold text-slate-700"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        >
                          {r.text}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge tone="slate">{r.source}</Badge>
                          {(r.topics || []).slice(0, 3).map((t) => (
                            <Badge key={t} tone="slate">
                              {t}
                            </Badge>
                          ))}

                          <div className="ml-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCopy(r.id);
                                pushToast({ title: "Copied", message: "Review ID copied.", tone: "success" });
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                            >
                              <Copy className="h-4 w-4" />
                              Copy ID
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveId(r.id);
                                setReplyOpen(true);
                              }}
                              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                              style={{ background: TOKENS.green }}
                            >
                              <Send className="h-4 w-4" />
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-6">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-3xl bg-slate-100 text-slate-700">
                        <Filter className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-slate-900">No results</div>
                        <div className="mt-1 text-sm font-semibold text-slate-500">Try clearing filters or changing the search text.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setCluster("All");
                            setSentiment("All");
                            setSort("Newest");
                            pushToast({ title: "Filters cleared", tone: "default" });
                          }}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                          style={{ background: TOKENS.green }}
                        >
                          <Check className="h-4 w-4" />
                          Clear filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </GlassCard>

          {/* Right panel */}
          <div className="lg:col-span-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-900">Response suggestions</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">Super premium: clustered insights and fast replies.</div>
                </div>
                <Badge tone="slate">AI</Badge>
              </div>

              {!active ? (
                <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4 text-sm font-semibold text-slate-600">
                  Select a review to view suggestions.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-slate-700" />
                      <div className="text-sm font-black text-slate-900">Selected review</div>
                      <span className="ml-auto">
                        <Badge tone={active.reply ? "green" : "orange"}>{active.reply ? "Replied" : "Unreplied"}</Badge>
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{active.buyer}</div>
                    <div className="mt-1">
                      <StarRow rating={active.rating} size={14} />
                    </div>
                    <div
                      className="mt-2 text-xs font-semibold text-slate-600"
                      style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                    >
                      {active.text}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={sentimentLabel(active.sentiment).tone}>{sentimentLabel(active.sentiment).k}</Badge>
                      <Badge tone="slate">{clusterKey(active.topics)}</Badge>
                      <Badge tone="slate">{active.source}</Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: TOKENS.green }}
                      >
                        <Send className="h-4 w-4" />
                        Reply now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopy(active.text);
                          pushToast({ title: "Copied", message: "Review text copied.", tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                      >
                        <Copy className="h-4 w-4" />
                        Copy text
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-orange-200 bg-orange-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-3xl bg-white dark:bg-slate-900 text-orange-700">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-orange-900">Sentiment clustering</div>
                        <div className="mt-1 text-xs font-semibold text-orange-900/70">Topic clusters help you respond consistently and track issues.</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setReplyDraft(s.text);
                          pushToast({ title: "Suggestion loaded", message: s.title, tone: "success" });
                          setReplyOpen(true);
                        }}
                        className={cx(
                          "w-full rounded-3xl border bg-white dark:bg-slate-900/70 p-4 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800",
                          s.tone === "danger" && "border-rose-200",
                          s.tone === "orange" && "border-orange-200",
                          s.tone === "green" && "border-emerald-200",
                          s.tone === "slate" && "border-slate-200/70"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cx(
                              "grid h-11 w-11 place-items-center rounded-3xl",
                              s.tone === "danger" && "bg-rose-50 text-rose-700",
                              s.tone === "orange" && "bg-orange-50 text-orange-700",
                              s.tone === "green" && "bg-emerald-50 text-emerald-700",
                              s.tone === "slate" && "bg-slate-100 text-slate-700"
                            )}
                          >
                            {s.tone === "danger" ? <AlertTriangle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-black text-slate-900">{s.title}</div>
                            <div
                              className="mt-1 text-xs font-semibold text-slate-600"
                              style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            >
                              {s.text}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => pushToast({ title: "Response library", message: "Wire saved templates and auto-personalization.", tone: "default" })}
                    className="w-full rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 px-4 py-3 text-sm font-extrabold text-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    Open template library
                  </button>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      <Drawer
        open={replyOpen}
        title={active ? `Reply to ${active.buyer}` : "Reply"}
        subtitle={active ? `${active.id} · ${fmtTime(active.createdAt)} · Rating ${active.rating}/5` : ""}
        onClose={() => setReplyOpen(false)}
      >
        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white dark:bg-slate-900/70 p-4">
            {!active ? (
              <div className="text-sm font-semibold text-slate-600">Select a review first.</div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                    <Star className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-slate-900">{active.buyer}</div>
                      <StarRow rating={active.rating} size={14} />
                      <Badge tone={sentimentLabel(active.sentiment).tone}>{sentimentLabel(active.sentiment).k}</Badge>
                      <span className="ml-auto"><Badge tone="slate">{clusterKey(active.topics)}</Badge></span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-700">{active.text}</div>
                  </div>
                </div>

                <div className="mt-4 text-[11px] font-extrabold text-slate-600">Your reply</div>
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={7}
                  placeholder="Write a reply..."
                  className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraft((d) =>
                        d ? d : "Thank you for your feedback. We appreciate your time and we will follow up if needed."
                      );
                      pushToast({ title: "Draft generated", message: "A safe default reply was added.", tone: "success" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate draft
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraft("");
                      pushToast({ title: "Cleared", tone: "default" });
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-extrabold text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={sendReply}
                    className="ml-auto inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-extrabold text-white"
                    style={{ background: TOKENS.green }}
                  >
                    <Send className="h-4 w-4" />
                    Send reply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Drawer>

      <ToastCenter toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}
