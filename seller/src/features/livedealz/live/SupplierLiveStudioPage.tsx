"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgress } from "@mui/material";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Gift,
  Heart,
  Grid3X3,
  Image as ImageIcon,
  Info,
  Layers,
  Link as LinkIcon,
  Lock,
  MessageSquare,
  Mic,
  MonitorPlay,
  Play,
  Plus,
  QrCode,
  Instagram,
  MessageCircle,
  Package,
  Radio,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";

function useNotification() {
  const show = useCallback((message: string, tone: "info" | "success" | "error" = "info") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("supplier-live-builder-toast", {
          detail: { message, tone },
        }),
      );
    }
  }, []);

  return {
    showNotification: (message: string) => show(message, "info"),
    showSuccess: (message: string) => show(message, "success"),
    showError: (message: string) => show(message, "error"),
  };
}

function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(async <T,>(
    fn: () => Promise<T> | T,
    opts?: { successMessage?: string; errorMessage?: string; onSuccess?: (value: T) => void; onError?: (error: unknown) => void },
  ) => {
    setIsPending(true);
    try {
      const value = await fn();
      opts?.onSuccess?.(value);
      return value;
    } catch (error) {
      opts?.onError?.(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { run, isPending };
}

// Product Catalog canonical hero size (chosen from the supported size set)
const HERO_IMAGE_REQUIRED = { width: 1920, height: 1080 } as const;

// Featured item poster size (selected from your supported sizes list)
// Used as: default poster for featured products/services (play icon sits on this image).
const ITEM_POSTER_REQUIRED = { width: 500, height: 500 } as const;

/**
 * Live Sessionz — Live Builder (Supplier-facing, Supplier can self-host or assign a Creator host)
 * -----------------------------------------------------------------------------
 * Controlled mirroring goals:
 * - Preserve the premium Live Builder structure, preview phone, Live Plan, polls, teleprompter,
 *   giveaway logic, segment timing, and Live Studio handoff.
 * - Convert Creator-facing setup and submission surfaces into Supplier App language and routing.
 * - Support both Supplier-hosted lives and Creator-hosted lives inside the same builder.
 * - Keep Platform=Other capture, scrollable time picker, preflight checklist, and Asset Library handoff.
 *
 * Usage:
 * 1) Dedicated page: default export <LiveBuilderPage />
 *    - Reads query params: ?sessionId=... or ?dealId=... (prefill)
 * 2) Drawer: <LiveBuilderDrawer open onClose sessionId/dealId />
 *
 * Dependencies:
 * - TailwindCSS classes assumed
 * - lucide-react icons
 * - No other external libs required (QR in preview is a placeholder block)
 */

const ORANGE = "#F77F00";
const SUPPLIER_SELF_HOST_ID = "__supplier_self__" as const;

const ROUTES = {
  liveDashboard: "/supplier/live/dashboard",
  liveBuilder: "/supplier/live/builder",
  liveStudio: "/supplier/live/studio",
  adzPerformance: "/supplier/analytics/status",
  linkTools: "/supplier/link-tools",
  assetLibrary: "/supplier/deliverables/assets",
};

const cx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");
const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");

function safeNav(url: string) {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}

function money(n: number, currency = "£") {
  const v = Number(n || 0);
  return `${currency}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function combineDateTime(dateISO: string, timeHHMM: string) {
  // dateISO: YYYY-MM-DD, timeHHMM: HH:MM
  const [y, m, d] = dateISO.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = timeHHMM.split(":").map((x) => parseInt(x, 10));
  const dt = new Date();
  dt.setFullYear(y, (m || 1) - 1, d || 1);
  dt.setHours(hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

/**
 * Mock backend validation call.
 */
function mockValidateSchedule(
  campaignId: string | undefined,
  startISO: string,
  startTime: string,
  endISO: string,
  endTime: string,
) {
  if (!campaignId) return { ok: false, error: "No campaign selected" };
  const campaign = campaignsSeed.find((c) => c.id === campaignId);
  if (!campaign) return { ok: false, error: "Invalid campaign selected" };

  const start = new Date(startISO + "T" + startTime);
  const end = new Date(endISO + "T" + endTime);
  const campStart = new Date(campaign.startsAtISO);
  const campEnd = new Date(campaign.endsAtISO);

  if (start < campStart) {
    return {
      ok: false,
      error: `Schedule starts before campaign window (${fmtDT(campaign.startsAtISO)})`,
    };
  }
  if (end > campEnd) {
    return {
      ok: false,
      error: `Schedule ends after campaign window (${fmtDT(campaign.endsAtISO)})`,
    };
  }
  if (start >= end) {
    return { ok: false, error: "Start time must be before end time" };
  }

  return { ok: true };
}

function parseSearch() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function useIsMobile(breakpointPx = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () =>
      setIsMobile(
        typeof window !== "undefined"
          ? window.innerWidth < breakpointPx
          : false,
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpointPx]);
  return isMobile;
}

function useCountdown(targetISO: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(targetISO).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  return { now, diff, days, hours, minutes, seconds };
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startISO: string, endISO: string) {
  const ms = Math.max(
    0,
    new Date(endISO).getTime() - new Date(startISO).getTime(),
  );
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function breakdownDiff(diffMs: number) {
  const diff = Math.max(0, diffMs);
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds };
}

/* -------------------------- Quantity helpers (UI) -------------------------- */

function sanitizeQuantityInput(raw: string) {
  const s = String(raw ?? "");
  // Prevent negatives and decimals by extracting the first integer chunk only.
  if (s.includes("-")) return "";
  const match = s.match(/\d+/);
  return match ? match[0] : "";
}

function parseQuantity(raw: string): number | null {
  const cleaned = sanitizeQuantityInput(raw);
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function clampQuantityInput(raw: string, maxAvailable: number) {
  if (maxAvailable <= 0) return "0";
  const cleaned = sanitizeQuantityInput(raw);
  if (!cleaned) return "1";
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 1) return "1";
  return String(Math.max(1, Math.min(Math.floor(n), maxAvailable)));
}

function toPositiveInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getLiveItemGiveawaySupplierTotal(item?: LiveItem | null) {
  if (!item) return 0;
  return toPositiveInt(
    (item as any).giveawayTotalQuantity ??
      (item as any).totalGiveawayQuantity ??
      (item as any).supplierGiveawayQuantity ??
      (item as any).giveawayAvailableQuantity ??
      (item as any).availableGiveawayQuantity ??
      0,
    0,
  );
}

function getLiveItemGiveawaySupplierAvailable(item?: LiveItem | null) {
  if (!item) return 0;
  const total = getLiveItemGiveawaySupplierTotal(item);
  const available = toPositiveInt(
    (item as any).giveawayAvailableQuantity ??
      (item as any).availableGiveawayQuantity ??
      (item as any).currentlyAvailableGiveawayQuantity ??
      total,
    total,
  );
  return Math.min(total || available, available);
}

function getPresetGiveawaySupplierTotal(
  preset?: SupplierCustomGiveawayPreset | null,
) {
  if (!preset) return 0;
  return toPositiveInt(
    (preset as any).totalQuantity ??
      (preset as any).totalGiveawayQuantity ??
      preset.quantity ??
      0,
    0,
  );
}

function getPresetGiveawaySupplierAvailable(
  preset?: SupplierCustomGiveawayPreset | null,
) {
  if (!preset) return 0;
  const total = getPresetGiveawaySupplierTotal(preset);
  const available = toPositiveInt(
    (preset as any).availableQuantity ??
      (preset as any).currentlyAvailableQuantity ??
      (preset as any).availableGiveawayQuantity ??
      total,
    total,
  );
  return Math.min(total || available, available);
}

function getRemainingGiveawayAvailability(
  supplierAvailable: number,
  allocatedInSession: number,
) {
  return Math.max(0, supplierAvailable - Math.max(0, allocatedInSession));
}

function getGiveawayAvailabilityTone(available: number) {
  if (available <= 0) return "danger" as const;
  if (available <= 3) return "warn" as const;
  return "good" as const;
}

function getGiveawayAvailabilityLabel(available: number) {
  if (available <= 0) return "Unavailable";
  if (available <= 3) return "Low availability";
  return "Available";
}

function getGiveawayDisplayMeta(giveaway: LiveGiveaway, items: LiveItem[] = []) {
  const linkedItem = items.find((item) => item.id === giveaway.linkedItemId);
  const quantity =
    typeof giveaway.quantity === "number" && giveaway.quantity > 0
      ? Math.floor(giveaway.quantity)
      : 1;
  return {
    id: giveaway.id,
    title: linkedItem?.name || giveaway.title || "Giveaway prize",
    quantity,
    sourceLabel: linkedItem ? "Featured Item Giveaway" : "Custom Giveaway",
  };
}

function formatMinutesLabel(totalMinutes: number) {
  const mins = Math.max(0, Math.floor(Number(totalMinutes || 0)));
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours && remaining) return `${hours}h ${remaining}m`;
  if (hours) return `${hours}h`;
  return `${remaining}m`;
}

function formatPlanTimecode(totalMinutes: number) {
  const mins = Math.max(0, Math.floor(Number(totalMinutes || 0)));
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return `${pad2(hours)}:${pad2(remaining)}:00`;
}

function formatSecondsLabel(totalSeconds: number) {
  const secs = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  if (mins && rem) return `${mins}m ${rem}s`;
  if (mins) return `${mins}m`;
  return `${rem}s`;
}

function createLivePlanPollOption(text = "") {
  return {
    id: `poll_opt_${Math.random().toString(16).slice(2, 8)}`,
    text,
  };
}

function ensureLivePlanPollOptions(options?: Array<{ id?: string; text?: string }>) {
  const cleaned = (Array.isArray(options) ? options : [])
    .filter(Boolean)
    .map((option, index) => ({
      id:
        typeof option?.id === "string" && option.id
          ? option.id
          : `poll_opt_${index}_${Math.random().toString(16).slice(2, 6)}`,
      text: typeof option?.text === "string" ? option.text : "",
    }))
    .slice(0, 4);

  while (cleaned.length < 2) {
    cleaned.push(createLivePlanPollOption(""));
  }

  return cleaned;
}

function normalizeLivePlanPolls(rawPolls: any[]) {
  return (Array.isArray(rawPolls) ? rawPolls : [])
    .filter((poll) => poll && typeof poll === "object")
    .map((poll, index) => ({
      id:
        typeof poll?.id === "string" && poll.id
          ? poll.id
          : `poll_${index}_${Math.random().toString(16).slice(2, 6)}`,
      question: typeof poll?.question === "string" ? poll.question : "",
      helperText:
        typeof poll?.helperText === "string" ? poll.helperText : undefined,
      options: ensureLivePlanPollOptions(poll?.options),
      launchMode: poll?.launchMode === "linked" ? "linked" : "manual",
      linkedSegmentId:
        typeof poll?.linkedSegmentId === "string"
          ? poll.linkedSegmentId
          : undefined,
      durationSec: Math.max(
        15,
        Math.floor(Number(poll?.durationSec || poll?.duration || 60)),
      ),
      showLiveResults: poll?.showLiveResults !== false,
      allowReopen: Boolean(poll?.allowReopen),
    }));
}

function normalizeRunOfShow(rawSegments: any[]) {
  return (Array.isArray(rawSegments) ? rawSegments : [])
    .filter((segment) => segment && typeof segment === "object")
    .map((segment, index) => ({
      id:
        typeof segment?.id === "string" && segment.id
          ? segment.id
          : `seg_${index}_${Math.random().toString(16).slice(2, 6)}`,
      type:
        typeof segment?.type === "string" && segment.type
          ? segment.type
          : "Custom",
      title:
        typeof segment?.title === "string" && segment.title.trim()
          ? segment.title
          : `Segment ${index + 1}`,
      durationMin: Math.max(1, Math.floor(Number(segment?.durationMin || 1))),
      notes: typeof segment?.notes === "string" ? segment.notes : "",
      teleprompterNote:
        typeof segment?.teleprompterNote === "string"
          ? segment.teleprompterNote
          : "",
      pinnedItemIds: Array.isArray(segment?.pinnedItemIds)
        ? segment.pinnedItemIds.filter((id: unknown) => typeof id === "string")
        : [],
      linkedGiveawayIds: Array.isArray(segment?.linkedGiveawayIds)
        ? segment.linkedGiveawayIds.filter((id: unknown) => typeof id === "string")
        : [],
      assetId:
        typeof segment?.assetId === "string" ? segment.assetId : undefined,
    }));
}

function buildDefaultLivePlanPoll(segments: RunSegment[], existing?: LivePlanPoll | null) {
  if (existing) {
    const options = ensureLivePlanPollOptions(existing.options).slice(0, 4);
    return {
      ...existing,
      options,
      launchMode: existing.launchMode === "linked" ? "linked" : "manual",
      linkedSegmentId:
        existing.launchMode === "linked"
          ? existing.linkedSegmentId || segments[0]?.id
          : existing.linkedSegmentId,
      durationSec: Math.max(15, Math.floor(Number(existing.durationSec || 60))),
      showLiveResults: existing.showLiveResults !== false,
      allowReopen: Boolean(existing.allowReopen),
    };
  }

  return {
    id: `poll_${Math.random().toString(16).slice(2, 8)}`,
    question: "",
    helperText: "",
    options: [createLivePlanPollOption(""), createLivePlanPollOption("")],
    launchMode: "manual" as const,
    linkedSegmentId: segments[0]?.id,
    durationSec: 60,
    showLiveResults: true,
    allowReopen: false,
  };
}

function buildLivePlanSegments(runOfShow: RunSegment[] = [], polls: LivePlanPoll[] = []) {
  let cursorMin = 0;
  return runOfShow.map((segment, index) => {
    const durationMin = Math.max(1, Math.floor(Number(segment.durationMin || 1)));
    const startOffsetMin = cursorMin;
    const endOffsetMin = startOffsetMin + durationMin;
    cursorMin = endOffsetMin;
    const linkedPolls = (polls || []).filter(
      (poll) => poll.launchMode === "linked" && poll.linkedSegmentId === segment.id,
    );

    return {
      ...segment,
      durationMin,
      number: index + 1,
      displayNumber: `${index + 1}.`,
      startOffsetMin,
      endOffsetMin,
      startTimecode: formatPlanTimecode(startOffsetMin),
      endTimecode: formatPlanTimecode(endOffsetMin),
      countdownSec: durationMin * 60,
      teleprompterTitle: `${index + 1}. ${segment.title || `Segment ${index + 1}`}`,
      teleprompterNote: segment.teleprompterNote || "",
      linkedPolls,
    };
  });
}

function buildLivePlanTiming(sessionDurationMin: number, segments: Array<{ durationMin: number }>) {
  const sessionMinutes = Math.max(1, Math.floor(Number(sessionDurationMin || 0)));
  const allocatedMin = segments.reduce((sum, segment) => sum + Math.max(1, Math.floor(Number(segment.durationMin || 0))), 0);
  const remainingMin = Math.max(0, sessionMinutes - allocatedMin);
  const overflowMin = Math.max(0, allocatedMin - sessionMinutes);
  return {
    sessionDurationMin: sessionMinutes,
    allocatedMin,
    remainingMin,
    overflowMin,
  };
}

function buildLivePlanSummaryData(
  draft: LiveSessionDraft,
  segments: ReturnType<typeof buildLivePlanSegments>,
  timing: ReturnType<typeof buildLivePlanTiming>,
) {
  return {
    sessionTitle: draft.title,
    introNote: draft.teleprompterScript || "",
    sessionDurationMin: timing.sessionDurationMin,
    allocatedMin: timing.allocatedMin,
    remainingMin: timing.remainingMin,
    overflowMin: timing.overflowMin,
    segments: segments.map((segment) => ({
      id: segment.id,
      number: segment.number,
      title: segment.title,
      type: segment.type,
      durationMin: segment.durationMin,
      durationLabel: formatMinutesLabel(segment.durationMin),
      startOffsetMin: segment.startOffsetMin,
      endOffsetMin: segment.endOffsetMin,
      timecode: `${segment.startTimecode} → ${segment.endTimecode}`,
      notes: segment.notes || "",
      teleprompterTitle: segment.teleprompterTitle,
      teleprompterNote: segment.teleprompterNote || "",
      attachedGiveaways: ((segment.linkedGiveawayIds || [])
        .map((giveawayId) => draft.giveaways.find((giveaway) => giveaway.id === giveawayId))
        .filter(Boolean) as LiveGiveaway[]).map((giveaway) =>
          getGiveawayDisplayMeta(giveaway, draft.products),
        ),
      linkedPolls: segment.linkedPolls.map((poll) => ({
        id: poll.id,
        question: poll.question,
      })),
    })),
    polls: (draft.livePlanPolls || []).map((poll) => ({
      ...poll,
      options: ensureLivePlanPollOptions(poll.options),
    })),
  };
}

function buildLiveStudioHandoffPayload(
  draft: LiveSessionDraft,
  segments: ReturnType<typeof buildLivePlanSegments>,
  timing: ReturnType<typeof buildLivePlanTiming>,
) {
  const summary = buildLivePlanSummaryData(draft, segments, timing);
  return {
    version: 1,
    generatedAtISO: new Date().toISOString(),
    label: "Live Plan",
    sessionId: draft.id,
    sessionTitle: draft.title,
    controls: {
      canLaunchPolls: true,
      canMonitorVotes: true,
      canClosePolls: true,
      canRevealResults: true,
      canFollowTimedSegments: true,
    },
    timing,
    summary,
    segments: segments.map((segment) => ({
      id: segment.id,
      number: segment.number,
      title: segment.title,
      type: segment.type,
      durationMin: segment.durationMin,
      countdownSec: segment.countdownSec,
      startOffsetMin: segment.startOffsetMin,
      endOffsetMin: segment.endOffsetMin,
      startTimecode: segment.startTimecode,
      endTimecode: segment.endTimecode,
      notes: segment.notes || "",
      teleprompterTitle: segment.teleprompterTitle,
      teleprompterNote: segment.teleprompterNote || "",
      linkedPollIds: segment.linkedPolls.map((poll) => poll.id),
      attachedGiveawayIds: segment.linkedGiveawayIds || [],
      attachedGiveaways: ((segment.linkedGiveawayIds || [])
        .map((giveawayId) => draft.giveaways.find((giveaway) => giveaway.id === giveawayId))
        .filter(Boolean) as LiveGiveaway[]).map((giveaway) =>
          getGiveawayDisplayMeta(giveaway, draft.products),
        ),
      pinnedItemIds: segment.pinnedItemIds || [],
    })),
    polls: (draft.livePlanPolls || []).map((poll) => ({
      ...poll,
      options: ensureLivePlanPollOptions(poll.options),
      linkedSegmentNumber:
        poll.launchMode === "linked"
          ? segments.find((segment) => segment.id === poll.linkedSegmentId)?.number
          : undefined,
    })),
    teleprompter: {
      introNote: draft.teleprompterScript || "",
      totalAllocatedMin: timing.allocatedMin,
      remainingAvailableMin: timing.remainingMin,
      stateDefinitions: {
        runningLabel: "LIVE NOW",
        upNextLabel: "UP NEXT",
        completedLabel: "Completed",
        summaryAvailableInStudio: true,
      },
      lines: segments.map((segment) => ({
        id: segment.id,
        number: segment.number,
        title: segment.teleprompterTitle,
        note: segment.teleprompterNote || "",
        timecode: `${segment.startTimecode} → ${segment.endTimecode}`,
        linkedPollIds: segment.linkedPolls.map((poll) => poll.id),
        attachedGiveawayIds: segment.linkedGiveawayIds || [],
      })),
    },
  };
}

/* ---------------------------------- Types --------------------------------- */

export type LivePlatform =
  | "TikTok Live"
  | "Instagram Live"
  | "YouTube Live"
  | "Facebook Live"
  | "Other";
export type LiveDesktopMode = "modal" | "fullscreen";
export type LiveStatus = "Draft" | "Ready" | "Scheduled" | "Live" | "Ended";
export type RankTier = "Bronze" | "Silver" | "Gold";
export type LiveGoalMetric =
  | "sold"
  | "cart"
  | "combined"
  | "booked"
  | "requests";

export type LiveGiveaway = {
  id: string;
  /** If set, the giveaway uses the linked featured item’s title/image on the promo page */
  linkedItemId?: string;
  /** Custom prize title (required for custom giveaways) */
  title?: string;
  imageUrl?: string;
  notes?: string;
  /** How many prizes are available (required) */
  quantity: number;
  /** Whether this giveaway is visible on the buyer promo page */
  showOnPromo: boolean;
};

export type SupplierCustomGiveawayPreset = {
  id: string;
  campaignId?: string;
  title: string;
  imageUrl?: string;
  notes?: string;
  quantity: number;
  totalQuantity?: number;
  availableQuantity?: number;
};

export type Supplier = {
  id: string;
  name: string;
  kind: "Seller" | "Provider";
  avatarUrl?: string;
  verified?: boolean;
  rating?: number;
  responseTime?: string;
};
export type Campaign = {
  id: string;
  supplierId: string;
  name: string;
  startsAtISO: string;
  endsAtISO: string;
};
export type Host = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  verified?: boolean;
  niche?: string;
  followers?: string;
};

export type LiveItem = {
  id: string;
  campaignId?: string;
  kind: "product" | "service";
  name: string;

  imageUrl: string;
  videoUrl?: string;
  /** Optional: the Asset Library id used as the poster image for this item */
  posterAssetId?: string;
  /** Optional: the Asset Library id used as the video for this item */
  videoAssetId?: string;

  badge?: string;

  // Product fields
  stock?: number;
  giveawayTotalQuantity?: number;
  giveawayAvailableQuantity?: number;
  retailPricePreview?: string; // e.g. "$59 → $44"
  wholesalePricePreview?: string; // e.g. "$41 → $44"
  wholesaleMoq?: number;

  // Optional numeric price fallback
  price?: number;
  currency?: string;

  // Service fields
  startingFrom?: string;
  durationMins?: number;
  bookingType?: "instant" | "request" | "quote";
  serviceMode?: "online" | "on-site";
  providerName?: string;

  // Commerce goal helpers (used by Live Studio HUD before/during the session)
  goalMetric?: LiveGoalMetric;
  goalTarget?: number;

  url?: string;
};

export type RunSegment = {
  id: string;
  type:
    | "Opener"
    | "Product demo"
    | "Q&A"
    | "Price drop"
    | "Flash Sale"
    | "Closing"
    | "Custom";
  title: string;
  durationMin: number;
  notes?: string;
  teleprompterNote?: string;
  pinnedItemIds?: string[];
  linkedGiveawayIds?: string[];
  assetId?: string; // optional linked asset (overlay/opener)
};

export type LivePlanPollOption = {
  id: string;
  text: string;
};

export type LivePlanPoll = {
  id: string;
  question: string;
  options: LivePlanPollOption[];
  helperText?: string;
  launchMode: "manual" | "linked";
  linkedSegmentId?: string;
  durationSec: number;
  showLiveResults: boolean;
  allowReopen: boolean;
};

export type LiveAssetType =
  | "Opener"
  | "Lower third"
  | "Overlay"
  | "Script"
  | "Template";
export type LiveAsset = {
  id: string;
  name: string;
  type: LiveAssetType;
  owner: "Host" | "Seller" | "Platform";
  tags: string[];
  lastUpdatedLabel: string;
  previewUrl: string;
  previewKind: "image" | "video";
  usageNotes?: string;
  restrictions?: string;
};

export type PromoAspect = "16:9" | "4:3" | "1:1" | "3:4";

export type LiveSessionDraft = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: LiveStatus;

  supplierId?: string;
  campaignId?: string;
  hostId?: string;

  platforms: LivePlatform[];
  platformOther?: string;

  // Promo/link page fields
  locationLabel: string;
  publicJoinUrl: string; // the "Live link" that buyers open
  heroAspect: PromoAspect;

  heroImageUrl: string;
  heroVideoUrl?: string;
  desktopMode: LiveDesktopMode;

  // Advanced scheduling
  scheduleAnchor: "start" | "end";
  durationMode: "preset" | "custom";
  durationMinutes: number;
  timezoneLabel: string;

  startDateISO: string;
  startTime: string;
  endDateISO: string;
  endTime: string;

  products: LiveItem[]; // featured items: products + services
  giveaways: LiveGiveaway[]; // optional prizes (linked to featured items or custom)

  // Live Plan helpers
  teleprompterScript: string;
  livePlanPolls: LivePlanPoll[];

  runOfShow: RunSegment[];

  creatives: {
    openerAssetId?: string;
    lowerThirdAssetId?: string;
    overlayAssetIds: string[];
  };

  stream: {
    ingestUrl: string;
    streamKey: string;
    simulcast: Record<Exclude<LivePlatform, "Other">, boolean>;
    autoStart: boolean;
    recording: boolean;
    lowLatency: boolean;
  };

  team: {
    moderators: Array<{ id: string; name: string; email: string }>;
    cohosts: Array<{ id: string; name: string; handle?: string }>;
    blockedTerms: string[];
    pinnedGuidelines: boolean;
  };

  compliance: {
    requiresDisclosure: boolean;
    disclosureText: string;
    restrictedTermsCheck: boolean;
    musicRightsConfirmed: boolean;
  };
};

/**
 * Supplier host support:
 * - A supplier can self-host the live when no external creator is engaged.
 * - A supplier can also assign a creator host while keeping the Supplier App as the planning surface.
 */
function deriveSupplierHost(supplier: Supplier): Host {
  const base =
    supplier.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 18) || supplier.id;

  return {
    id: `host_${supplier.id}`,
    name: supplier.name,
    handle: `@${base}`,
    avatarUrl: supplier.avatarUrl,
    verified: supplier.verified,
    niche:
      supplier.kind === "Provider"
        ? "Supplier host • services"
        : "Supplier host • product dealz",
    followers:
      supplier.kind === "Provider"
        ? "Growing service audience"
        : "Store followers",
  };
}

function getDefaultGoalMetric(kind: "product" | "service"): LiveGoalMetric {
  return kind === "service" ? "booked" : "sold";
}

function getGoalMetricOptions(
  kind: "product" | "service",
): Array<{ value: LiveGoalMetric; label: string }> {
  if (kind === "service") {
    return [
      { value: "booked", label: "Booked" },
      { value: "cart", label: "Added to cart" },
      { value: "combined", label: "Booked + cart" },
      { value: "requests", label: "Requests" },
    ];
  }
  return [
    { value: "sold", label: "Items sold" },
    { value: "cart", label: "Added to cart" },
    { value: "combined", label: "Sold + cart" },
  ];
}

function formatGoalTarget(
  metric: LiveGoalMetric,
  target: number,
  kind?: "product" | "service",
) {
  const qty = Math.max(1, Math.floor(Number(target || 0)));
  if (metric === "cart") return `${qty} added to cart`;
  if (metric === "booked") return `${qty} booked`;
  if (metric === "requests") return `${qty} requests`;
  if (metric === "combined")
    return kind === "service"
      ? `${qty} bookings + carts`
      : `${qty} sold + carts`;
  return `${qty} sold`;
}

function getGoalMetricDisplay(
  metric: LiveGoalMetric,
  kind: "product" | "service" = "product",
) {
  if (metric === "cart") {
    return {
      emoji: "🛒",
      label: "Added to cart",
      shortLabel: "Cart goal",
      hint: "Great when momentum and intent can build before checkout.",
    };
  }
  if (metric === "booked") {
    return {
      emoji: "📅",
      label: "Booked",
      shortLabel: "Booking goal",
      hint: "Ideal for appointments, consultations, and service slots.",
    };
  }
  if (metric === "requests") {
    return {
      emoji: "✉️",
      label: "Requests",
      shortLabel: "Request goal",
      hint: "Useful for quotes, callbacks, and follow-up demand.",
    };
  }
  if (metric === "combined") {
    return {
      emoji: "🎯",
      label: kind === "service" ? "Booked + cart" : "Sold + cart",
      shortLabel: "Combined goal",
      hint:
        kind === "service"
          ? "Blend direct bookings with add-to-cart intent in one premium target."
          : "Track both direct purchases and cart momentum in one premium target.",
    };
  }
  return {
    emoji: "📦",
    label: "Items sold",
    shortLabel: "Sales goal",
    hint: "Best when you want the live to drive direct purchases.",
  };
}

function getGoalTargetPresets(
  kind: "product" | "service",
  metric: LiveGoalMetric,
) {
  if (metric === "booked")
    return kind === "service" ? [3, 5, 10, 20, 100] : [5, 10, 15, 25, 100];
  if (metric === "requests") return [5, 10, 20, 30, 100];
  if (metric === "combined")
    return kind === "service" ? [5, 10, 20, 30, 100] : [10, 25, 50, 75, 100];
  if (metric === "cart")
    return kind === "service" ? [5, 10, 15, 25, 100] : [10, 25, 50, 100];
  return [5, 10, 25, 50, 100];
}

function getFeaturedItemRowKey(itemId: string, idx: number) {
  return `${itemId}__${idx}`;
}

/* --------------------------------- Seed data ------------------------------ */

// const SAMPLE_VIDEO_1 = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const SAMPLE_VIDEO_2 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/bee.mp4";

const suppliersSeed: Supplier[] = [
  {
    id: "pt_glowup",
    name: "GlowUp Hub",
    kind: "Seller",
    verified: true,
    rating: 4.8,
    responseTime: "Typically replies within 25 min",
    avatarUrl:
      "https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?auto=format&fit=crop&w=120&q=60",
  },
  {
    id: "pt_gadget",
    name: "GadgetMart Africa",
    kind: "Seller",
    verified: true,
    rating: 4.6,
    responseTime: "Typically replies within 40 min",
    avatarUrl:
      "https://images.unsplash.com/photo-1520975682031-a6ad56ae0f68?auto=format&fit=crop&w=120&q=60",
  },
  {
    id: "pt_grace",
    name: "Grace Living Studio",
    kind: "Provider",
    verified: true,
    rating: 4.9,
    responseTime: "Typically replies within 1 hr",
    avatarUrl:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=120&q=60",
  },
];

const campaignsSeed: Campaign[] = [
  {
    id: "cp_autumn_beauty",
    supplierId: "pt_glowup",
    name: "Autumn Beauty Flash",
    startsAtISO: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
  },
  {
    id: "cp_tech_friday",
    supplierId: "pt_gadget",
    name: "Tech Friday Mega",
    startsAtISO: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
  },
  {
    id: "cp_wellness",
    supplierId: "pt_grace",
    name: "Wellness Booking Sprint",
    startsAtISO: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    endsAtISO: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
  },
];

const supplierCustomGiveawayPresetsSeed: Record<
  string,
  SupplierCustomGiveawayPreset[]
> = {
  cp_autumn_beauty: [
    {
      id: "sgw_beauty_kit",
      campaignId: "cp_autumn_beauty",
      title: "GlowUp Night Routine Kit",
      imageUrl: `https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
      notes: "Supplier-set custom giveaway for top-engagement moments.",
      quantity: 6,
      totalQuantity: 6,
      availableQuantity: 3,
    },
    {
      id: "sgw_vanity_pouch",
      campaignId: "cp_autumn_beauty",
      title: "Premium Vanity Pouch",
      imageUrl: `https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
      notes: "Gift pouch supplied for live winners.",
      quantity: 10,
      totalQuantity: 10,
      availableQuantity: 5,
    },
  ],
  cp_tech_friday: [
    {
      id: "sgw_ring_light",
      campaignId: "cp_tech_friday",
      title: "Creator Ring Light Kit",
      imageUrl: `https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
      notes: "Supplier-approved creator kit giveaway.",
      quantity: 6,
      totalQuantity: 6,
      availableQuantity: 2,
    },
    {
      id: "sgw_gift_card",
      campaignId: "cp_tech_friday",
      title: "Tech Friday Gift Card",
      imageUrl: `https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
      notes: "Digital voucher for live-session winners.",
      quantity: 8,
      totalQuantity: 8,
      availableQuantity: 4,
    },
  ],
  cp_wellness: [
    {
      id: "sgw_consult_credit",
      campaignId: "cp_wellness",
      title: "Wellness Consultation Credit",
      imageUrl: `https://images.unsplash.com/photo-1515378791036-0648a814c963?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
      notes: "Supplier-set service credit for booked attendees.",
      quantity: 5,
      totalQuantity: 5,
      availableQuantity: 3,
    },
  ],
};

function normalizeSupplierCustomGiveawayPresets(
  rawGiveaways: any[],
  campaignId?: string,
): SupplierCustomGiveawayPreset[] {
  return (Array.isArray(rawGiveaways) ? rawGiveaways : [])
    .filter((g) => g && typeof g === "object")
    .filter(
      (g) =>
        (g?.source === "custom" || !g?.linkedItemId) &&
        String(g?.title || "").trim(),
    )
    .map((g, idx) => {
      const totalQuantity =
        typeof g?.totalQuantity === "number" && g.totalQuantity > 0
          ? Math.floor(g.totalQuantity)
          : typeof g?.totalGiveawayQuantity === "number" &&
              g.totalGiveawayQuantity > 0
            ? Math.floor(g.totalGiveawayQuantity)
            : typeof g?.quantity === "number" && g.quantity > 0
              ? Math.floor(g.quantity)
              : 1;
      const availableQuantity =
        typeof g?.availableQuantity === "number" && g.availableQuantity >= 0
          ? Math.floor(g.availableQuantity)
          : typeof g?.currentlyAvailableQuantity === "number" &&
              g.currentlyAvailableQuantity >= 0
            ? Math.floor(g.currentlyAvailableQuantity)
            : typeof g?.availableGiveawayQuantity === "number" &&
                g.availableGiveawayQuantity >= 0
              ? Math.floor(g.availableGiveawayQuantity)
              : totalQuantity;

      return {
        id: typeof g?.id === "string" && g.id ? g.id : `supplier_gw_${idx}`,
        campaignId,
        title: String(g?.title || "").trim(),
        imageUrl: typeof g?.imageUrl === "string" ? g.imageUrl : undefined,
        notes: typeof g?.notes === "string" ? g.notes : undefined,
        quantity: totalQuantity,
        totalQuantity,
        availableQuantity: Math.min(totalQuantity, availableQuantity),
      };
    })
    .filter((g) => g.title.length > 0);
}

const hostsSeed: Host[] = [
  {
    id: "cr_1",
    name: "Jane Doe",
    handle: "@janedoe",
    niche: "Live host • dealz",
    followers: "128k",
    avatarUrl:
      "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=256&q=60",
    verified: true,
  },
  {
    id: "cr_2",
    name: "Noah K.",
    handle: "@noahknows",
    niche: "Tech • gadgets",
    followers: "680k",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=60",
    verified: true,
  },
  {
    id: "cr_3",
    name: "Rina Vale",
    handle: "@rinavale",
    niche: "Services • wellness",
    followers: "220k",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=60",
    verified: false,
  },
];

const assetsSeed: LiveAsset[] = [
  {
    id: "as_opener_1",
    name: "Autumn Beauty opener sequence",
    type: "Opener",
    owner: "Seller",
    tags: ["Beauty", "Opener", "Flash"],
    lastUpdatedLabel: "2 days ago",
    previewUrl:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=60",
    previewKind: "image",
    usageNotes:
      "Intro bumper for Beauty Flash lives. Include for all serum-focused shows.",
    restrictions: "Use only for GlowUp campaigns.",
  },
  {
    id: "as_lower_1",
    name: "Deal ticker lower third",
    type: "Lower third",
    owner: "Platform",
    tags: ["Ticker", "Dealz", "Lower third"],
    lastUpdatedLabel: "1 week ago",
    previewUrl:
      "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=60",
    previewKind: "image",
    usageNotes: "Shows countdown + pinned item price.",
    restrictions: "Keep within safe area for mobile.",
  },
  {
    id: "as_overlay_1",
    name: "Universal price-drop overlay",
    type: "Overlay",
    owner: "Host",
    tags: ["Overlay", "Price drop"],
    lastUpdatedLabel: "3 days ago",
    previewUrl:
      "https://images.unsplash.com/photo-1518441902117-f0a80e5b0c17?auto=format&fit=crop&w=1200&q=60",
    previewKind: "image",
    usageNotes: "Use when dropping price or offering limited-time bonus.",
    restrictions: "Avoid restricted terms.",
  },
  {
    id: "as_script_1",
    name: "Host base script — Flash format",
    type: "Script",
    owner: "Host",
    tags: ["Template", "Script", "Flash"],
    lastUpdatedLabel: "Today",
    previewUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=60",
    previewKind: "image",
    usageNotes: "Includes opener, proof, CTA, objections, closing.",
    restrictions: "Keep claims compliant.",
  },
  {
    id: "as_opener_2",
    name: "Tech Friday live opener",
    type: "Opener",
    owner: "Seller",
    tags: ["Tech", "Opener"],
    lastUpdatedLabel: "Yesterday",
    previewUrl: SAMPLE_VIDEO_2,
    previewKind: "video",
    usageNotes: "Fast paced opener for electronics lives.",
    restrictions: "Avoid copyrighted music unless cleared.",
  },
];

const catalogSeed: LiveItem[] = [
  {
    id: "it_powerbank",
    campaignId: "cp_tech_friday",
    kind: "product",
    name: "VoltMax Pro - 30,000mAh",
    imageUrl: `https://images.unsplash.com/photo-1557180295-76eee20ae8aa?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Live-only 25% off",
    stock: 12,
    retailPricePreview: "$59 → $44",
    wholesalePricePreview: "$41 → $44",
    wholesaleMoq: 10,
    giveawayTotalQuantity: 12,
    giveawayAvailableQuantity: 7,
    url: "https://mylivedealz.com/deal/p1",
  },
  {
    id: "it_earbuds",
    campaignId: "cp_tech_friday",
    kind: "product",
    name: "Auralink TWS Buds (ANC)",
    imageUrl: `https://images.unsplash.com/photo-1518443854922-108a0e71c8bf?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Bundle & Save",
    stock: 0,
    retailPricePreview: "$79 → $55",
    wholesalePricePreview: "$49 → $52",
    wholesaleMoq: 20,
    giveawayTotalQuantity: 5,
    giveawayAvailableQuantity: 1,
    url: "https://mylivedealz.com/deal/p2",
  },
  {
    id: "it_cam",
    campaignId: "cp_tech_friday",
    kind: "product",
    name: "SnapCam 4K Action - Creator Kit",
    imageUrl: `https://images.unsplash.com/photo-1489769002049-ccd828976a6c?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Limited Stock",
    stock: 7,
    retailPricePreview: "$219 → $169",
    wholesalePricePreview: "$149 → $165",
    wholesaleMoq: 5,
    giveawayTotalQuantity: 8,
    giveawayAvailableQuantity: 3,
    url: "https://mylivedealz.com/deal/p3",
  },
  {
    id: "it_adapter",
    campaignId: "cp_tech_friday",
    kind: "product",
    name: "Smart Travel Adapter - 65W",
    imageUrl: `https://images.unsplash.com/photo-1582582421114-80f5a72ad1c8?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Hot pick",
    stock: 34,
    retailPricePreview: "$29 → $19",
    wholesalePricePreview: "$14 → $17",
    wholesaleMoq: 50,
    giveawayTotalQuantity: 10,
    giveawayAvailableQuantity: 0,
    url: "https://mylivedealz.com/deal/p4",
  },

  // Beauty
  {
    id: "it_serum",
    campaignId: "cp_autumn_beauty",
    kind: "product",
    name: "GlowUp Vitamin C Serum",
    imageUrl: `https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Flash deal",
    stock: 42,
    retailPricePreview: "£19 → £14",
    wholesalePricePreview: "£11 → £13",
    wholesaleMoq: 12,
    giveawayTotalQuantity: 9,
    giveawayAvailableQuantity: 4,
  },
  {
    id: "it_cleanser",
    campaignId: "cp_autumn_beauty",
    kind: "product",
    name: "Barrier Repair Cleanser",
    imageUrl: `https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "2‑pack",
    stock: 18,
    retailPricePreview: "£14 → £11",
    wholesalePricePreview: "£8 → £10",
    wholesaleMoq: 20,
    giveawayTotalQuantity: 7,
    giveawayAvailableQuantity: 5,
  },

  // Wellness services
  {
    id: "it_consult",
    campaignId: "cp_wellness",
    kind: "service",
    name: "Live Consultation - Gadget Setup",
    imageUrl: `https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Limited slots",
    startingFrom: "$15",
    durationMins: 20,
    serviceMode: "online",
    bookingType: "request",
    providerName: "VoltMall Tech Team",
    giveawayTotalQuantity: 5,
    giveawayAvailableQuantity: 2,
  },
  {
    id: "it_repair",
    campaignId: "cp_wellness",
    kind: "service",
    name: "On‑site Device Repair Quote",
    imageUrl: `https://images.unsplash.com/photo-1581091215367-59ab6b4d99a7?auto=format&fit=crop&w=${ITEM_POSTER_REQUIRED.width}&h=${ITEM_POSTER_REQUIRED.height}&q=60`,
    badge: "Needs assessment",
    startingFrom: "$0",
    durationMins: 0,
    serviceMode: "on-site",
    bookingType: "quote",
    providerName: "VoltMall Repairs",
    giveawayTotalQuantity: 4,
    giveawayAvailableQuantity: 1,
  },
];

function defaultDraft(seedId: string, dealId?: string): LiveSessionDraft {
  const now = new Date();
  const startDateISO = toISODate(now);
  const startTime = `${pad2(Math.min(23, now.getHours() + 1))}:00`;
  const endDateISO = startDateISO;
  const endTime = `${pad2(Math.min(23, now.getHours() + 2))}:30`;

  const title = dealId
    ? `Live session for dealz`
    : "Mega Live Dealz — Products + Consultation";

  return {
    id: seedId,
    title,
    description:
      "Join the live for product drops and a short consultation segment. Live-only bundles, Q&A, and limited slots.",
    tags: ["Live Demo", "Q&A", "Bundles", "Limited stock"],
    status: "Draft",

    supplierId: "pt_gadget",
    campaignId: "cp_tech_friday",
    hostId: SUPPLIER_SELF_HOST_ID,

    platforms: ["TikTok Live", "Instagram Live"],
    platformOther: "",

    locationLabel: "Online",
    publicJoinUrl: dealId
      ? `https://mylivedealz.com/live/${encodeURIComponent(dealId)}`
      : `https://mylivedealz.com/live/${seedId}`,
    heroAspect: "16:9",

    heroImageUrl: `https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=${HERO_IMAGE_REQUIRED.width}&h=${HERO_IMAGE_REQUIRED.height}&q=60`,
    heroVideoUrl:
      "https://cdn.coverr.co/videos/coverr-circuit-board-technology-9008/1080p.mp4",
    desktopMode: "modal",

    scheduleAnchor: "start",
    durationMode: "preset",
    durationMinutes: 60,
    timezoneLabel: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",

    startDateISO,
    startTime,
    endDateISO,
    endTime,

    products: catalogSeed
      .filter((it) => it.campaignId === "cp_tech_friday")
      .slice(0, 4),

    giveaways: [],

    teleprompterScript: "",
    livePlanPolls: [],

    runOfShow: [
      {
        id: "seg_1",
        type: "Opener",
        title: "Opener + hook",
        durationMin: 2,
        notes: "Set the promise. Tease the best deal.",
      },
      {
        id: "seg_2",
        type: "Product demo",
        title: "Demo: #1 best pick",
        durationMin: 8,
        pinnedItemIds: ["it_powerbank"],
      },
      {
        id: "seg_3",
        type: "Q&A",
        title: "Answer top objections",
        durationMin: 6,
      },
      {
        id: "seg_4",
        type: "Price drop",
        title: "Limited price drop + bonus",
        durationMin: 3,
        pinnedItemIds: ["it_powerbank", "it_adapter"],
      },
      { id: "seg_5", type: "Closing", title: "Closing + CTA", durationMin: 3 },
    ],

    creatives: {
      openerAssetId: "as_opener_2",
      lowerThirdAssetId: "as_lower_1",
      overlayAssetIds: ["as_overlay_1"],
    },

    stream: {
      ingestUrl: "rtmps://live.example.com/app",
      streamKey: "sk_live_****************",
      simulcast: {
        "TikTok Live": true,
        "Instagram Live": true,
        "YouTube Live": false,
        "Facebook Live": false,
      },
      autoStart: true,
      recording: true,
      lowLatency: true,
    },

    team: {
      moderators: [{ id: "md_1", name: "Ayo Mod", email: "ayo@moderation.io" }],
      cohosts: [{ id: "ch_1", name: "Guest Host", handle: "@guest" }],
      blockedTerms: ["guaranteed", "miracle", "cure"],
      pinnedGuidelines: true,
    },

    compliance: {
      requiresDisclosure: true,
      disclosureText: "Paid partnership. Some links may earn commission.",
      restrictedTermsCheck: true,
      musicRightsConfirmed: false,
    },
  };
}

/* ------------------------------ UI primitives ----------------------------- */

function Pill({
  text,
  tone = "neutral",
  icon,
}: {
  text: string;
  tone?: "neutral" | "good" | "warn" | "danger";
  icon?: React.ReactNode;
}) {
  const toneCls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-800 dark:text-amber-300"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold",
        toneCls,
      )}
    >
      {icon}
      {text}
    </span>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-semibold inline-flex items-center gap-2 border transition-colors",
        disabled
          ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "px-4 py-2 rounded-2xl text-[12px] font-semibold inline-flex items-center gap-2 border border-transparent text-white",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:opacity-95",
        className,
      )}
      style={{ background: ORANGE }}
    >
      {children}
    </button>
  );
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </div>
          {subtitle ? (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cx(
        "mt-1 w-full px-3 py-2 rounded-2xl border text-[12px] outline-none transition-colors",
        disabled
          ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-400 cursor-not-allowed"
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800",
      )}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
    />
  );
}

function TeleprompterRowsEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const lines = useMemo(() => {
    const raw = (value || "").split(/\r?\n/);
    return raw.length ? raw : [""];
  }, [value]);

  const lineRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const idx = pendingFocusIndex;
    setPendingFocusIndex(null);
    requestAnimationFrame(() => {
      const el = lineRefs.current[idx];
      if (el) {
        el.focus();
        el.select();
      }
    });
  }, [pendingFocusIndex, lines.length]);

  const commit = (nextLines: string[]) => {
    onChange(nextLines.join("\n"));
  };

  const updateLine = (idx: number, next: string) => {
    const nextLines = [...lines];
    nextLines[idx] = next;
    commit(nextLines);
  };

  const addLine = (afterIdx?: number) => {
    const nextLines = [...lines];
    const insertAt =
      typeof afterIdx === "number" ? afterIdx + 1 : nextLines.length;
    nextLines.splice(insertAt, 0, "");
    commit(nextLines);
    setPendingFocusIndex(insertAt);
  };

  const removeLine = (idx: number) => {
    const nextLines = lines.filter((_, i) => i !== idx);
    if (nextLines.length === 0) nextLines.push("");
    commit(nextLines);
    setPendingFocusIndex(Math.min(idx, nextLines.length - 1));
  };

  const clearAll = () => {
    commit([""]);
    setPendingFocusIndex(0);
  };

  const allEmpty = lines.every((l) => !l.trim());

  return (
    <div className="mt-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {lines.map((line, idx) => {
          const isUpNext = idx === 1;
          return (
            <div
              key={idx}
              className={cx(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors",
                isUpNext
                  ? "bg-[#f77f00]/20 dark:bg-[#f77f00]/20 text-slate-900 dark:text-slate-50"
                  : "bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200",
              )}
            >
              {isUpNext ? (
                <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-[#f77f00]">
                  UP NEXT:
                </span>
              ) : null}

              <input
                ref={(el) => {
                  lineRefs.current[idx] = el;
                }}
                value={line}
                onChange={(e) => updateLine(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLine(idx);
                  }
                }}
                placeholder={idx === 0 ? placeholder : "Add another line…"}
                className="flex-1 bg-transparent outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              <button
                type="button"
                className="shrink-0 inline-flex items-center justify-center rounded-lg p-1 text-slate-500 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 transition-colors disabled:opacity-40"
                onClick={() => removeLine(idx)}
                disabled={lines.length <= 1}
                title="Remove line"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SoftButton onClick={() => addLine()} className="px-3 py-1.5">
          <Plus className="h-4 w-4" /> Add line
        </SoftButton>

        <SoftButton
          onClick={clearAll}
          disabled={allEmpty}
          title="Clear script"
          className="px-3 py-1.5"
        >
          <X className="h-4 w-4" /> Clear
        </SoftButton>

        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Press <span className="font-semibold">Enter</span> to add a new row.
        </span>
      </div>

      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Tip: The <span className="font-semibold">2nd line</span> is highlighted
        as <span className="font-semibold">“Up next”</span> in Live Studio.
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "w-full rounded-3xl border p-3 text-left transition-colors",
        checked
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold truncate sm:whitespace-normal">
            {label}
          </div>
          {hint ? (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
              {hint}
            </div>
          ) : null}
        </div>
        <span
          className={cx(
            "h-6 w-10 shrink-0 rounded-full border flex items-center px-1 transition-colors",
            checked
              ? "bg-emerald-500 border-emerald-500 justify-end"
              : "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 justify-start",
          )}
        >
          <span className="h-4 w-4 rounded-full bg-white shadow" />
        </span>
      </div>
    </button>
  );
}

function SegmentedToggle({
  left,
  right,
  value,
  onChange,
}: {
  left: string;
  right: string;
  value: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 transition-colors">
      <button
        type="button"
        onClick={() => onChange("left")}
        className={cx(
          "px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors",
          value === "left"
            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
        )}
      >
        {left}
      </button>
      <button
        type="button"
        onClick={() => onChange("right")}
        className={cx(
          "px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors",
          value === "right"
            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
        )}
      >
        {right}
      </button>
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  max,
  disabled,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  disabled?: boolean;
  id?: string;
}) {
  const numericValue = parseQuantity(value);
  const safeValue = disabled ? 0 : Math.max(1, Math.min(numericValue ?? 1, max));
  const canDecrease = !disabled && safeValue > 1;
  const canIncrease = !disabled && safeValue < max;

  return (
    <div className="mt-1">
      <div
        className={cx(
          "flex items-center overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 transition-colors",
          disabled
            ? "border-slate-200 dark:border-slate-700 opacity-70"
            : "border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-amber-200 dark:focus-within:ring-amber-800",
        )}
      >
        <button
          type="button"
          onClick={() => onChange(String(Math.max(1, safeValue - 1)))}
          disabled={!canDecrease}
          className="h-11 w-11 shrink-0 grid place-items-center border-r border-slate-200 dark:border-slate-700 text-lg font-black text-slate-700 dark:text-slate-200 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          −
        </button>
        <input
          id={id}
          value={disabled ? "0" : String(safeValue)}
          onChange={(e) => onChange(clampQuantityInput(e.target.value, max))}
          inputMode="numeric"
          disabled={disabled}
          className="flex-1 h-11 bg-transparent text-center text-[13px] font-black text-slate-900 dark:text-slate-100 outline-none disabled:text-slate-400 dark:disabled:text-slate-500"
        />
        <button
          type="button"
          onClick={() => onChange(String(Math.min(max, safeValue + 1)))}
          disabled={!canIncrease}
          className="h-11 w-11 shrink-0 grid place-items-center border-l border-slate-200 dark:border-slate-700 text-lg font-black text-slate-700 dark:text-slate-200 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          +
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Session quantity</span>
        <span>Max {Math.max(0, max)}</span>
      </div>
    </div>
  );
}

function GiveawayInventorySummary({
  title,
  subtitle,
  total,
  available,
  remaining,
  allocated,
}: {
  title: string;
  subtitle?: string;
  total: number;
  available: number;
  remaining: number;
  allocated: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-3 transition-colors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          {subtitle ? <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        <Pill tone={getGiveawayAvailabilityTone(remaining)} text={getGiveawayAvailabilityLabel(remaining)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 transition-colors">
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Total giveaway quantity</div>
          <div className="mt-1 text-[15px] font-black text-slate-900 dark:text-slate-100">{total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 transition-colors">
          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Currently available quantity</div>
          <div className="mt-1 text-[15px] font-black text-slate-900 dark:text-slate-100">{available}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          Reserved in this session: <span className="font-semibold text-slate-900 dark:text-slate-100">{allocated}</span>
        </span>
        <span>
          Remaining for this session: <span className="font-semibold text-slate-900 dark:text-slate-100">{remaining}</span>
        </span>
      </div>
    </div>
  );
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mr-2 mb-2 transition-colors">
      {children}
    </span>
  );
}

/* ----------------------------- Scrollable Time Picker ----------------------------- */

function buildTimeOptions(stepMinutes = 15) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) out.push(`${pad2(h)}:${pad2(m)}`);
  }
  return out;
}

const TIME_OPTIONS = buildTimeOptions(15);

function ScrollableTimePicker({
  value,
  onChange,
  disabled,
  label,
  direction = "down",
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label?: string;
  direction?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const times = useMemo(() => {
    const out: string[] = [];
    for (let hh = 0; hh < 24; hh++) {
      for (let mm = 0; mm < 60; mm += 5) {
        out.push(`${pad2(hh)}:${pad2(mm)}`);
      }
    }
    return out;
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const idx = Math.max(0, times.indexOf(value));
    const rowH = 40;
    el.scrollTop = Math.max(0, idx * rowH - rowH * 3);
  }, [open, value, times]);

  return (
    <div className="relative mt-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={cx(
          "w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-left text-sm ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
          disabled &&
            "opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-slate-800",
        )}
        title={label}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-extrabold text-slate-900 dark:text-slate-100">
              {value || "Select time"}
            </div>
            {label ? (
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {label}
              </div>
            ) : null}
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </div>
      </button>

      {open ? (
        <div
          className={cx(
            "absolute z-30 w-full overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 transition-all",
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-3 py-2">
            <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Pick time
            </div>
            <button
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          {/* Scrollable list as required */}
          <div ref={listRef} className="max-h-[240px] overflow-y-auto">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors",
                  t === value && "bg-slate-50 dark:bg-slate-700",
                )}
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {t}
                </span>
                {t === value ? (
                  <Check className="h-4 w-4 text-slate-900 dark:text-slate-100" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------- Drawer primitive ----------------------------- */

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = "",
  zIndex,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  zIndex?: number;
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex: zIndex || 100 }}>
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
            className="absolute inset-0 bg-slate-50 dark:bg-slate-950 shadow-2xl transition-colors flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0">
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate text-slate-900 dark:text-slate-100">
                    {title}
                  </div>
                  {subtitle ? (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </div>
                  ) : null}
                </div>
                <button
                  className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- Preflight (premium) ----------------------------- */

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: "ok" | "needed" | "blocked";
}) {
  const tone =
    status === "ok"
      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
      : status === "needed"
        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
        : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300";
  const text =
    status === "ok" ? "OK" : status === "needed" ? "Needed" : "Blocked";
  return (
    <div className="flex items-center justify-between gap-2 py-2 min-h-[44px]">
      <div className="text-[12px] text-slate-700 dark:text-slate-300">
        {label}
      </div>
      <span
        className={cx(
          "px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors min-w-[72px] inline-flex items-center justify-center",
          tone,
        )}
      >
        {text}
      </span>
    </div>
  );
}

function PreflightCard({
  setupOk,
  promoOk,
  itemsOk,
  creativesOk,
  streamOk,
  scheduleOk,
  crewOk,
  complianceOk,
}: {
  setupOk: boolean;
  promoOk: boolean;
  itemsOk: boolean;
  creativesOk: boolean;
  streamOk: boolean;
  scheduleOk: boolean;
  crewOk: boolean;
  complianceOk: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
        Preflight checklist
      </div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
        Always visible and consistent in the builder.
      </div>
      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        <StatusRow
          label="Supplier / campaign / host"
          status={setupOk ? "ok" : "needed"}
        />
        <StatusRow
          label="Promo link details"
          status={promoOk ? "ok" : "needed"}
        />
        <StatusRow label="Featured items" status={itemsOk ? "ok" : "needed"} />
        <StatusRow
          label="Creatives attached"
          status={creativesOk ? "ok" : "needed"}
        />
        <StatusRow
          label="Stream outputs configured"
          status={streamOk ? "ok" : "needed"}
        />
        <StatusRow
          label="Team availability"
          status={crewOk ? "ok" : "needed"}
        />
        <StatusRow label="Schedule" status={scheduleOk ? "ok" : "needed"} />
        <StatusRow
          label="Compliance checks"
          status={complianceOk ? "ok" : "needed"}
        />
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2 transition-colors">
        <Sparkles className="h-4 w-4 text-slate-500 dark:text-slate-400 mt-0.5" />
        Premium: automatic policy checks + restricted terms detection +
        device-specific preview validation.
      </div>
    </div>
  );
}

/* ------------------------------- Builder steps ------------------------------ */

const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "promo", label: "Promo link" },
  { key: "items", label: "Featured items" },
  { key: "show", label: "Live Plan" },
  { key: "creatives", label: "Creatives" },
  { key: "stream", label: "Stream outputs" },
  { key: "team", label: "Team & moderation" },
  { key: "schedule", label: "Schedule" },
  { key: "review", label: "Review & submit" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function StepNav({
  step,
  setStep,
}: {
  step: StepKey;
  setStep: (s: StepKey) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
      <div className="text-[12px] font-semibold mb-2 text-slate-900 dark:text-slate-100">
        Live Builder
      </div>
      <div className="space-y-1">
        {STEPS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(s.key)}
            className={cx(
              "w-full text-left px-3 py-2 rounded-2xl border text-[12px] font-semibold flex items-center justify-between transition-colors",
              step === s.key
                ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-slate-900 dark:text-slate-100"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
            )}
          >
            <span>{s.label}</span>
            {step === s.key ? <ChevronRight className="h-4 w-4" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- Promo Link Preview ---------------------------- */

function getAspectClass(aspect: PromoAspect) {
  switch ((aspect || "16:9").toLowerCase()) {
    case "4:3":
      return "aspect-[4/3]";
    case "3:4":
      return "aspect-[3/4]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-[16/9]";
  }
}

function productPricePreview(it: LiveItem, mode: "retail" | "wholesale") {
  if (it.kind !== "product") return "";
  if (mode === "wholesale")
    return (
      it.wholesalePricePreview ||
      it.retailPricePreview ||
      (typeof it.price === "number" ? money(it.price, it.currency || "£") : "")
    );
  return (
    it.retailPricePreview ||
    it.wholesalePricePreview ||
    (typeof it.price === "number" ? money(it.price, it.currency || "£") : "")
  );
}

function FeaturedCard({
  item,
  priceMode,
  onOpen,
}: {
  item: LiveItem;
  priceMode: "retail" | "wholesale";
  onOpen?: () => void;
}) {
  const { showNotification } = useNotification();
  const isProduct = item.kind === "product";
  const cta = isProduct
    ? item.stock === 0
      ? "Remind me"
      : priceMode === "wholesale"
        ? "Order wholesale"
        : "Buy now"
    : item.bookingType === "instant"
      ? "Book now"
      : item.bookingType === "quote"
        ? "Request quote"
        : "Request booking";
  const meta = isProduct
    ? productPricePreview(item, priceMode)
    : `${item.startingFrom || ""}${item.durationMins ? ` · ${item.durationMins} min` : ""}`;

  return (
    <div className="min-w-[168px] max-w-[168px] rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
      <button
        type="button"
        className="relative aspect-square w-full overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(247,127,0,0.8)]"
        onClick={onOpen}
        aria-label={isProduct ? "Open product" : "Open service"}
      >
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {item.videoUrl ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-12 w-12 rounded-full bg-black/40 ring-1 ring-white/25 grid place-items-center">
              <Play className="h-6 w-6 text-white" />
            </div>
          </div>
        ) : null}
        {item.badge ? (
          <span className="absolute left-1 top-1 rounded-md bg-[#F77F00] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {item.badge}
          </span>
        ) : null}
        <span className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {isProduct ? "Product" : "Service"}
        </span>
        {item.videoUrl ? (
          <span className="absolute right-1 bottom-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white inline-flex items-center gap-1">
            <Play className="h-3 w-3" /> Video
          </span>
        ) : null}
      </button>

      <div className="mt-2 line-clamp-2 text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
        {item.name}
      </div>
      {meta ? (
        <div className="mt-1 text-[12px] font-bold text-[#F77F00]">{meta}</div>
      ) : null}

      {isProduct && priceMode === "wholesale" && item.wholesaleMoq ? (
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          MOQ: {item.wholesaleMoq}+
        </div>
      ) : null}
      {isProduct && typeof item.stock === "number" ? (
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
        </div>
      ) : null}

      <button
        type="button"
        className={cx(
          "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-extrabold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(247,127,0,0.8)] transition-all transform active:scale-[0.98]",
          isProduct && item.stock === 0
            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white hover:brightness-110 shadow-sm",
        )}
        onClick={() => (onOpen ? onOpen() : showNotification(`Demo: ${cta}`))}
      >
        {cta}
      </button>
    </div>
  );
}

function HostPreviewCard({ host }: { host?: Host }) {
  if (!host) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
        <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">
          Host setup
        </div>
        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
          Supplier host is auto-derived when self-hosting, or you can assign a creator host when collaborating with one.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={host.avatarUrl}
            alt={host.name}
            className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
              {host.name}{" "}
              {host.verified ? (
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              ) : null}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {host.handle} • {host.followers || ""}
            </div>
            {host.niche ? (
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {host.niche}
              </div>
            ) : null}
          </div>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold bg-[#F77F00] text-white">
          <Plus className="h-4 w-4" /> Follow
        </button>
      </div>
    </div>
  );
}

function SupplierPreviewCard({ supplier }: { supplier?: Supplier }) {
  if (!supplier) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
        <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">
          Supplier
        </div>
        <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
          Select a supplier to show merchant/provider card.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {supplier.name}
          </div>
          <div className="mt-0.5 text-[12px] text-slate-600 dark:text-slate-400">
            {supplier.verified ? "Verified" : ""}
            {typeof supplier.rating === "number"
              ? ` · ${supplier.rating.toFixed(1)}★`
              : ""}
            {supplier.kind ? ` · ${supplier.kind}` : ""}
          </div>
          {supplier.responseTime ? (
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {supplier.responseTime}
            </div>
          ) : null}
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[12px] font-extrabold bg-slate-900 text-white">
          <ShoppingBag className="h-4 w-4" /> Follow
        </button>
      </div>
    </div>
  );
}

function TimePill({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 text-white min-w-[42px]">
      <span className="tabular-nums font-mono">{pad2(n)}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

function PromoLinkPreviewPhone({
  draft,
  host,
  supplier,
}: {
  draft: LiveSessionDraft;
  host?: Host;
  supplier?: Supplier;
}) {
  const isMobile = useIsMobile(1024);
  const openMode = isMobile ? "fullscreen" : draft.desktopMode;

  const startISO = useMemo(
    () => combineDateTime(draft.startDateISO, draft.startTime),
    [draft.startDateISO, draft.startTime],
  );
  const endISO = useMemo(
    () => combineDateTime(draft.endDateISO, draft.endTime),
    [draft.endDateISO, draft.endTime],
  );

  const { now, days, hours, minutes, seconds } = useCountdown(startISO);
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const isLiveWindow = now >= startMs && now < endMs;
  const isEnded = now >= endMs;

  const items = useMemo(() => draft.products || [], [draft.products]);

  const giveaways = useMemo(() => {
    const raw = (draft as any).giveaways;
    return Array.isArray(raw) ? (raw as LiveGiveaway[]) : [];
  }, [draft]);

  const promoGiveaways = useMemo(
    () => giveaways.filter((g) => g && (g.showOnPromo ?? true)),
    [giveaways],
  );
  const hasProducts = items.some((it) => it.kind === "product");
  const hasServices = items.some((it) => it.kind === "service");
  const showTypeToggle = hasProducts && hasServices;

  const hasWholesalePricing = items.some(
    (it) =>
      it.kind === "product" &&
      (it.wholesalePricePreview || typeof it.wholesaleMoq === "number"),
  );
  const [typeToggle, setTypeToggle] = useState<"product" | "service">(
    hasProducts ? "product" : "service",
  );
  useEffect(() => {
    if (!showTypeToggle) setTypeToggle(hasProducts ? "product" : "service");
  }, [showTypeToggle, hasProducts]);

  const activeType = showTypeToggle
    ? typeToggle
    : hasProducts
      ? "product"
      : "service";

  const [priceMode, setPriceMode] = useState<"retail" | "wholesale">("retail");
  const showPriceToggle = activeType === "product" && hasWholesalePricing;

  const visibleItems = useMemo(() => {
    if (!showTypeToggle) return items;
    return items.filter((it) => it.kind === typeToggle);
  }, [items, showTypeToggle, typeToggle]);

  const joinUrlNormalized = useMemo(() => {
    const raw = (draft.publicJoinUrl || "").trim();
    if (!raw) return "";
    return /^https?:\/\//i.test(raw)
      ? raw
      : `https://${raw.replace(/^\/+/, "")}`;
  }, [draft.publicJoinUrl]);

  // Featured item viewer (promo preview)
  const [viewerItemId, setViewerItemId] = useState<string | null>(null);
  const viewerItem = useMemo(
    () => items.find((it) => it.id === viewerItemId) || null,
    [items, viewerItemId],
  );

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const onToggleLike = (itemId: string) =>
    setLikedMap((m) => ({ ...m, [itemId]: !m[itemId] }));

  const onAddToCart = (it: LiveItem) => {
    setToast(`Added to cart: ${it.name}`);
  };

  const onBuyNow = (it: LiveItem) => {
    // Demo navigation hook (replace with your real checkout routing)
    safeNav(
      `/checkout?source=live&sessionId=${encodeURIComponent(draft.id)}&itemId=${encodeURIComponent(it.id)}&qty=1`,
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">
            Promo link preview
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {draft.platforms.join(" · ") || "No platform selected"} • Desktop:{" "}
            {openMode}
          </div>
        </div>
        <Pill
          text={draft.status}
          tone={
            draft.status === "Live"
              ? "good"
              : draft.status === "Scheduled"
                ? "warn"
                : "neutral"
          }
        />
      </div>

      {/* Phone frame (Premium) - Enabled on mobile by user request */}
      <div className="mx-auto w-full max-w-full sm:max-w-[440px] mt-4 mb-4 px-2 sm:px-0">
        <div className="rounded-[34px] bg-neutral-950 dark:bg-black p-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-colors">
          <div className="relative overflow-hidden rounded-[28px] bg-neutral-50 dark:bg-slate-950 transition-colors">
            {/* "Notch" area (more subtle) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-24 h-5 bg-black rounded-b-2xl" />

            <div className="h-[760px] overflow-y-auto">
              {/* Top bar */}
              <div className="sticky top-0 z-20 flex items-center justify-between bg-white/90 dark:bg-slate-950/90 px-3 py-2 backdrop-blur shadow-sm transition-colors ring-1 ring-slate-100 dark:ring-slate-800">
                <div className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {draft.title || "Untitled session"}
                </div>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(joinUrlNormalized || "");
                      setToast("Copied link to clipboard");
                    } catch {
                      setToast("Copy not available");
                    }
                  }}
                  aria-label="Share"
                  className="rounded-xl border-2 border-[#F77F00] bg-white dark:bg-slate-900 p-2 text-[#F77F00] transition-colors"
                  title="Copy promo link"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Hero */}
              <div className="mt-2 relative overflow-hidden rounded-3xl bg-black text-white mx-3">
                <div className={cx(getAspectClass(draft.heroAspect), "w-full")}>
                  {draft.heroVideoUrl ? (
                    <video
                      className="h-full w-full object-cover"
                      src={draft.heroVideoUrl}
                      poster={draft.heroImageUrl}
                      muted
                      autoPlay
                      playsInline
                      loop
                    />
                  ) : (
                    <img
                      src={draft.heroImageUrl}
                      alt={draft.title}
                      loading="eager"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="absolute inset-x-0 bottom-2 px-3">
                  <div className="text-white/95 text-lg font-extrabold drop-shadow-sm line-clamp-2">
                    {draft.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-white/95">
                    <Calendar size={16} /> {formatDateLabel(startISO)}
                  </div>
                  <div className="pl-6 text-[13px] font-semibold text-white/95">
                    {formatTimeLabel(startISO)} → {formatTimeLabel(endISO)}
                  </div>
                  <div className="pl-6 text-[11px] text-white/85">
                    Duration: {formatDuration(startISO, endISO)}
                  </div>
                </div>

                {/* Live/Countdown */}
                <div className="absolute left-3 top-3">
                  {isLiveWindow ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-2 py-1 text-xs font-bold">
                      <span className="h-2 w-2 rounded-full bg-white" /> Live
                      now
                    </span>
                  ) : isEnded ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-slate-900/80 px-2 py-1 text-xs font-bold">
                      Session ended
                    </span>
                  ) : (
                    <div className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur">
                      <TimePill n={days} label="d" />:
                      <TimePill n={hours} label="h" />:
                      <TimePill n={minutes} label="m" />:
                      <TimePill n={seconds} label="s" />
                    </div>
                  )}
                </div>

                <a
                  href={joinUrlNormalized || "#"}
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-2xl bg-white/10 px-2 py-1 text-xs font-bold backdrop-blur hover:bg-white/20"
                  onClick={(e) => {
                    e.preventDefault();
                    if (joinUrlNormalized) {
                      window.open(joinUrlNormalized, "_blank");
                    } else {
                      setToast("Live link not yet available");
                    }
                  }}
                >
                  <Play size={14} /> Live link
                </a>
              </div>

              {/* Host + supplier cards */}
              <div className="mt-2 grid grid-cols-1 gap-2 px-3">
                <HostPreviewCard host={host} />
                <SupplierPreviewCard supplier={supplier} />
              </div>

              {/* Tags */}
              <div className="mt-2 px-3">
                {(draft.tags || []).slice(0, 10).map((t) => (
                  <TagChip key={t}>{t}</TagChip>
                ))}
              </div>

              {/* Description */}
              <p className="mt-1 px-3 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 transition-colors">
                {draft.description ||
                  "Add a description to help buyers understand what’s happening."}
              </p>

              {/* Time + Location */}
              <div className="mt-2 px-3 grid grid-cols-1 gap-2 transition-colors">
                <div className="flex items-start gap-2 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                  <Calendar
                    size={18}
                    className="mt-0.5 text-slate-900 dark:text-slate-100"
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                      {formatDateLabel(startISO)}
                    </div>
                    <div className="text-[14px] text-slate-800 dark:text-slate-300">
                      {formatTimeLabel(startISO)} → {formatTimeLabel(endISO)}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400">
                      Duration: {formatDuration(startISO, endISO)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-2xl bg-white dark:bg-slate-900 p-3 text-[13px] text-slate-800 dark:text-slate-300 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                  <LinkIcon
                    size={16}
                    className="mt-0.5 text-slate-900 dark:text-slate-100"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {draft.locationLabel || "Online"} ·{" "}
                    </span>
                    {joinUrlNormalized ? (
                      <span className="break-all text-[#F77F00] underline">
                        {joinUrlNormalized}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        Link coming soon
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Products/Services toggle only if both exist */}
              <div className="mt-4 px-3 flex items-center justify-between">
                {showTypeToggle ? (
                  <SegmentedToggle
                    left="Products"
                    right="Services"
                    value={typeToggle === "product" ? "left" : "right"}
                    onChange={(v) =>
                      setTypeToggle(v === "left" ? "product" : "service")
                    }
                  />
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hasProducts ? "Products" : "Services"}
                  </div>
                )}
                <button
                  onClick={() => setToast("Viewing all items...")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95"
                >
                  <Grid3X3 size={16} /> View all (
                  {(showTypeToggle ? visibleItems.length : items.length) || 0})
                </button>
              </div>

              {/* Giveaways (shown on promo page) */}
              {promoGiveaways.length ? (
                <div className="mt-4 px-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      🎁 Giveaways
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Join live to enter
                    </div>
                  </div>

                  <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                    {promoGiveaways.map((g) => {
                      const linked = items.find(
                        (it) => it.id === g.linkedItemId,
                      );
                      const title = linked?.name || g.title || "Giveaway prize";
                      const image = linked?.imageUrl || g.imageUrl;
                      const qty =
                        typeof (g as any).quantity === "number" &&
                        (g as any).quantity > 0
                          ? Math.floor((g as any).quantity)
                          : 1;

                      return (
                        <div
                          key={g.id}
                          className="min-w-[180px] max-w-[180px] rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                            {image ? (
                              <img
                                src={image}
                                alt={title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full grid place-items-center bg-slate-100 dark:bg-slate-800 text-2xl">
                                🎁
                              </div>
                            )}
                            <span className="absolute right-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Giveaway • Qty {qty}
                            </span>
                          </div>

                          <div className="mt-2 line-clamp-2 text-[12px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                            {title}
                          </div>
                          {g.notes ? (
                            <div className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {g.notes}
                            </div>
                          ) : null}

                          <div className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-extrabold bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white shadow-sm">
                            Join live to enter
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Featured items with Retail/Wholesale */}
              <div className="mt-4 px-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Featured Dealz
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Curated for this session
                  </div>
                </div>

                {showPriceToggle ? (
                  <div className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900 p-2 ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                    <div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Pricing
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Wholesale applies to products. MOQ may apply.
                      </div>
                    </div>
                    <SegmentedToggle
                      left="Retail"
                      right="Wholesale"
                      value={priceMode === "retail" ? "left" : "right"}
                      onChange={(v) =>
                        setPriceMode(v === "left" ? "retail" : "wholesale")
                      }
                    />
                  </div>
                ) : null}

                <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                  {(showTypeToggle ? visibleItems : items).map((it) => (
                    <FeaturedCard
                      key={it.id}
                      item={it}
                      priceMode={priceMode}
                      onOpen={() => setViewerItemId(it.id)}
                    />
                  ))}
                  {!items.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-[12px] text-slate-600 dark:text-slate-400">
                      No featured items yet. Add products/services in the
                      builder to populate this section.
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Ask host */}
              <div className="mt-4 px-3">
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                    <MessageSquare size={16} /> Ask the host (optional)
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-3 text-[13px] text-slate-500 dark:text-slate-400">
                      Type your question…
                    </div>
                    <button
                      className="inline-flex min-w-[44px] items-center justify-center rounded-2xl px-3 bg-[#F77F00] text-white transition-all active:scale-90"
                      onClick={() => setToast("Question sent!")}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Tip: Press Enter to send. Shift+Enter for a new line.
                  </div>
                </div>
              </div>

              {/* QR share */}
              <div className="mt-4 px-3">
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-[72px] w-[72px] rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 grid place-items-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      QR
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] text-slate-600 dark:text-slate-100">
                        Scan QR to share
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Share link in groups.
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-extrabold bg-[#F77F00] text-white">
                          <Plus size={14} /> Follow host
                        </button>
                        <button className="inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-[11px] font-extrabold bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white transition-colors">
                          <ShoppingBag size={14} /> Follow
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-28" />

              {/* Sticky bar */}
              <div className="sticky bottom-0 z-30 px-3 pb-3">
                <div className="rounded-2xl bg-white/95 dark:bg-slate-900/95 p-2 shadow-lg backdrop-blur-md ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                  {joinUrlNormalized ? (
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition-all transform active:scale-95"
                      onClick={() => window.open(joinUrlNormalized, "_blank")}
                    >
                      <Play size={14} />{" "}
                      {isLiveWindow
                        ? "Join live now"
                        : isEnded
                          ? "View recording"
                          : "Open session link"}
                    </button>
                  ) : null}
                  <div className="mt-2 flex w-full items-center gap-2">
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F77F00] px-3 py-3 text-[11px] font-extrabold text-white shadow-md transition-all transform active:scale-95"
                      onClick={() => setToast("Reminder set for this session!")}
                    >
                      <BellIcon /> Remind me
                    </button>
                    <button
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-800 px-3 py-3 text-[11px] font-extrabold text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md transition-all focus:outline-none transform active:scale-95"
                      onClick={() => setToast("Adding to calendar...")}
                    >
                      <CalendarPlusIcon /> + Cal
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-2xl border-2 border-[#F77F00] bg-white dark:bg-slate-900 p-2.5 text-[#F77F00] transition-all transform active:scale-95"
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrlNormalized || "");
                        setToast("Link copied!");
                      }}
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <footer className="px-3 pb-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
                © 2026 Live Dealz · Promo page preview. Details and times may
                change.
              </footer>
            </div>
          </div>
        </div>
      </div>

      {/* Featured item viewer overlay (modal/fullscreen; mobile always fullscreen) */}
      <FeaturedItemViewer
        open={!!viewerItem}
        mode={openMode}
        item={viewerItem}
        priceMode={priceMode}
        startISO={startISO}
        endISO={endISO}
        nowMs={now}
        isLiveWindow={isLiveWindow}
        isEnded={isEnded}
        liked={viewerItem ? !!likedMap[viewerItem.id] : false}
        onToggleLike={() => (viewerItem ? onToggleLike(viewerItem.id) : null)}
        onClose={() => setViewerItemId(null)}
        onAddToCart={() => (viewerItem ? onAddToCart(viewerItem) : null)}
        onBuyNow={() => (viewerItem ? onBuyNow(viewerItem) : null)}
        setToast={setToast}
      />
      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-[12px] font-semibold text-white shadow-2xl">
      {message}
    </div>
  );
}

function FeaturedItemViewer({
  open,
  mode,
  item,
  priceMode,
  startISO,
  endISO,
  nowMs,
  isLiveWindow,
  isEnded,
  liked,
  onToggleLike,
  onAddToCart,
  onBuyNow,
  setToast,
  onClose,
}: {
  open: boolean;
  mode: LiveDesktopMode;
  item: LiveItem | null;
  priceMode: "retail" | "wholesale";
  startISO: string;
  endISO: string;
  nowMs: number;
  isLiveWindow: boolean;
  isEnded: boolean;
  liked: boolean;
  onToggleLike: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onClose: () => void;
  setToast: (m: string | null) => void;
}) {
  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
      };
    }
  }, [open]);

  if (!item) return null;

  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();
  const toStart = Math.max(0, startMs - nowMs);
  const toEnd = Math.max(0, endMs - nowMs);

  const startParts = breakdownDiff(toStart);
  const endParts = breakdownDiff(toEnd);

  const countdownLabel = isEnded
    ? "Session ended"
    : isLiveWindow
      ? "Ends in"
      : "Starts in";
  const parts = isEnded
    ? { days: 0, hours: 0, minutes: 0, seconds: 0 }
    : isLiveWindow
      ? endParts
      : startParts;

  const isProduct = item.kind === "product";
  const stock = typeof item.stock === "number" ? item.stock : undefined;
  const soldOut = stock === 0;
  const lowStock = typeof stock === "number" && stock > 0 && stock <= 5;

  const priceLine = isProduct
    ? productPricePreview(item, priceMode)
    : `${item.startingFrom || ""}${item.durationMins ? ` · ${item.durationMins} min` : ""}`;

  const stockPct =
    typeof stock === "number"
      ? Math.max(0, Math.min(100, (stock / 20) * 100))
      : 0;

  const asFullscreen = mode === "fullscreen";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={
              asFullscreen
                ? { opacity: 0, y: 100 }
                : { opacity: 0, scale: 0.9, y: 50 }
            }
            animate={
              asFullscreen
                ? { opacity: 1, y: 0 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              asFullscreen
                ? { opacity: 0, y: 100 }
                : { opacity: 0, scale: 0.9, y: 50 }
            }
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0"
            onClick={onClose}
          >
            <div
              className="relative w-full h-full overflow-hidden bg-white dark:bg-slate-950 shadow-2xl transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar */}
              <div
                className={cx(
                  "flex items-center justify-between gap-2 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors",
                  asFullscreen ? "sticky top-0 z-10" : "",
                )}
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {formatTimeLabel(startISO)} → {formatTimeLabel(endISO)} ·{" "}
                    {formatDuration(startISO, endISO)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(item.url || "");
                        setToast("Item link copied");
                      } catch (err) {
                        console.error("Copy failed", err);
                      }
                    }}
                    className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                    aria-label="Share item"
                    title="Copy item link"
                  >
                    <Share2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </button>
                  <button
                    type="button"
                    onClick={onToggleLike}
                    className={cx(
                      "h-10 w-10 rounded-2xl border bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors",
                      liked
                        ? "border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/10"
                        : "border-slate-200 dark:border-slate-700",
                    )}
                    aria-label="Love item"
                    title="Love"
                  >
                    <Heart
                      className={cx(
                        "h-4 w-4",
                        liked
                          ? "text-rose-600"
                          : "text-slate-700 dark:text-slate-300",
                      )}
                      fill={liked ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                    aria-label="Close viewer"
                  >
                    <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div
                className="grid md:grid-cols-2"
                style={{ height: "calc(100vh - 56px)" }}
              >
                {/* Media */}
                <div className="relative bg-black">
                  {item.videoUrl ? (
                    <video
                      className="h-full w-full object-cover"
                      src={item.videoUrl}
                      poster={item.imageUrl}
                      controls
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {/* Countdown + stock badges */}
                  <div className="absolute left-3 top-3 flex flex-col gap-2">
                    <span
                      className={cx(
                        "inline-flex items-center gap-2 rounded-2xl px-2 py-1 text-[11px] font-extrabold backdrop-blur",
                        isEnded
                          ? "bg-slate-900/70 text-white"
                          : isLiveWindow
                            ? "bg-red-600/80 text-white"
                            : "bg-white/10 text-white",
                      )}
                    >
                      {isLiveWindow ? (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                      {countdownLabel}
                      {!isEnded ? (
                        <span className="tabular-nums">
                          {pad2(parts.days)}:{pad2(parts.hours)}:
                          {pad2(parts.minutes)}:{pad2(parts.seconds)}
                        </span>
                      ) : null}
                    </span>

                    {typeof stock === "number" ? (
                      <span
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-2 py-1 text-[11px] font-extrabold",
                          soldOut
                            ? "bg-rose-600/90 text-white"
                            : lowStock
                              ? "bg-amber-500/90 text-white"
                              : "bg-emerald-600/80 text-white",
                        )}
                      >
                        {soldOut
                          ? "Sold out"
                          : lowStock
                            ? `Only ${stock} left`
                            : `${stock} in stock`}
                      </span>
                    ) : null}
                  </div>

                  {item.badge ? (
                    <div className="absolute right-3 top-3">
                      <span className="inline-flex items-center rounded-2xl bg-[#F77F00] px-2 py-1 text-[11px] font-extrabold text-white">
                        {item.badge}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Details */}
                <div className="flex flex-col bg-white dark:bg-slate-950 transition-colors">
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        <Pill
                          text={isProduct ? "Product" : "Service"}
                          tone="neutral"
                        />
                        {isProduct && priceMode === "wholesale" ? (
                          <Pill text="Wholesale pricing" tone="warn" />
                        ) : null}
                        {!isProduct && item.bookingType ? (
                          <Pill
                            text={
                              item.bookingType === "instant"
                                ? "Instant booking"
                                : item.bookingType === "quote"
                                  ? "Request quote"
                                  : "By request"
                            }
                            tone="neutral"
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Unit Price
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">
                      {priceLine || "—"}
                    </div>

                    {isProduct &&
                    priceMode === "wholesale" &&
                    item.wholesaleMoq ? (
                      <div className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                        Minimum Order Quantity:{" "}
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.wholesaleMoq}+ units
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-8 grid grid-cols-1 gap-4">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 transition-colors">
                        <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" /> Session Timing
                        </div>
                        <div className="mt-2 text-[14px] font-medium text-slate-700 dark:text-slate-300">
                          {formatDateLabel(startISO)} ·{" "}
                          {formatTimeLabel(startISO)} →{" "}
                          {formatTimeLabel(endISO)}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {isEnded
                            ? "This session has ended."
                            : isLiveWindow
                              ? "Live now — prices and inventory may change rapidly."
                              : "Set a reminder to be notified when this deal goes live."}
                        </div>
                      </div>

                      {typeof stock === "number" ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                              <Package className="h-3.5 w-3.5" /> Inventory
                              Status
                            </div>
                            <div
                              className={cx(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                                soldOut
                                  ? "bg-rose-100 text-rose-700"
                                  : lowStock
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {soldOut
                                ? "Sold out"
                                : lowStock
                                  ? `Limited Stock`
                                  : `In Stock`}
                            </div>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={cx(
                                "h-full transition-all duration-500",
                                soldOut
                                  ? "bg-rose-500"
                                  : lowStock
                                    ? "bg-amber-500"
                                    : "bg-emerald-500",
                              )}
                              style={{
                                width: `${soldOut ? 0 : Math.min(100, Math.max(8, stockPct))}%`,
                              }}
                            />
                          </div>
                          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span>
                              {soldOut
                                ? "No units remaining"
                                : lowStock
                                  ? `${stock} units left`
                                  : `${stock} available`}
                            </span>
                            <span>{Math.round(stockPct)}%</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={onBuyNow}
                        className={cx(
                          "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white shadow-lg transition-all transform active:scale-95",
                          soldOut
                            ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600"
                            : "bg-[#F77F00] hover:brightness-105",
                        )}
                      >
                        <Zap className="h-4 w-4" />{" "}
                        {isProduct ? "BUY NOW" : "BOOK NOW"}
                      </button>
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={onAddToCart}
                        className={cx(
                          "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-black text-white shadow-lg transition-all transform active:scale-95",
                          soldOut
                            ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600"
                            : "bg-slate-900 dark:bg-white dark:text-slate-900 hover:brightness-110",
                        )}
                      >
                        <ShoppingBag className="h-4 w-4" /> ADD TO CART
                      </button>
                    </div>

                    {soldOut ? (
                      <div className="mt-3 text-center text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" /> This item is
                        currently unavailable.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Icons used inside preview sticky bar without importing additional ones */
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
      <path
        fill="currentColor"
        d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5L4 18v1h16v-1l-2-2Z"
      />
    </svg>
  );
}
function CalendarPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-white">
      <path
        fill="currentColor"
        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Zm-7 4h2v2h2v2h-2v2h-2v-2H9v-2h3v-2Z"
      />
    </svg>
  );
}

/* ------------------------------ Item picker ------------------------------ */

function CatalogPicker({
  open,
  onClose,
  campaignId,
  catalog,
  selectedIds,
  onToggle,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  campaignId?: string;
  catalog: LiveItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onApply: () => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      setQ("");
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalDocOverflow;
      };
    }
  }, [open]);

  const rows = useMemo(() => {
    const base = campaignId
      ? catalog.filter((c) => c.campaignId === campaignId)
      : catalog;
    const qq = q.trim().toLowerCase();
    return base.filter((it) =>
      qq ? it.name.toLowerCase().includes(qq) : true,
    );
  }, [catalog, campaignId, q]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute inset-0 rounded-none bg-white dark:bg-slate-900 shadow-2xl border-none overflow-hidden transition-colors"
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate text-slate-900 dark:text-slate-100">
                  Add featured items
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Catalog is scoped by campaign (Supplier → Campaign → Items).
                </div>
              </div>
              <button
                className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </button>
            </div>

            <div className="p-4 max-h-full overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search items…"
                    className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <SoftButton
                    onClick={() => {
                      onApply();
                      onClose();
                    }}
                    disabled={!selectedIds.length}
                  >
                    <Plus className="h-4 w-4" /> Add selected (
                    {selectedIds.length})
                  </SoftButton>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-3 gap-3">
                {rows.map((it) => {
                  const checked = selectedIds.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onToggle(it.id)}
                      className={cx(
                        "rounded-3xl border text-left overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                        checked
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
                      )}
                    >
                      <div className="aspect-[16/10] bg-slate-100">
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <div className="text-[12px] font-semibold truncate flex items-center justify-between gap-2">
                          <span className="truncate text-slate-900 dark:text-slate-100">
                            {it.name}
                          </span>
                          <Pill
                            text={it.kind === "product" ? "Product" : "Service"}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {it.kind === "product"
                            ? it.retailPricePreview || "—"
                            : `${it.startingFrom || "—"}${it.durationMins ? ` · ${it.durationMins} min` : ""}`}
                        </div>
                        {checked ? (
                          <div className="mt-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                            Selected
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                            Tap to select
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!rows.length ? (
                  <div className="sm:col-span-3 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-6 text-center text-[12px] text-slate-600 dark:text-slate-400 transition-colors">
                    No catalog items match your search.
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Segment row ------------------------------ */

function SegmentRow({
  seg,
  number,
  totalSegments,
  linkedPollCount,
  assets,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  availableItems,
  availableGiveaways,
}: {
  seg: RunSegment;
  number: number;
  totalSegments: number;
  linkedPollCount: number;
  assets: LiveAsset[];
  availableItems: LiveItem[];
  availableGiveaways: LiveGiveaway[];
  onChange: (s: RunSegment) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const pinnedIds = seg.pinnedItemIds || [];
  const pinned = pinnedIds
    .map((id) => availableItems.find((it) => it.id === id))
    .filter(Boolean) as LiveItem[];
  const linkedGiveawayIds = seg.linkedGiveawayIds || [];
  const attachedGiveaways = linkedGiveawayIds
    .map((id) => availableGiveaways.find((giveaway) => giveaway.id === id))
    .filter(Boolean) as LiveGiveaway[];
  const durationMin = Math.max(1, Math.floor(Number(seg.durationMin || 1)));
  const canMoveUp = number > 1;
  const canMoveDown = number < totalSegments;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-slate-100">
            <span className="inline-flex h-8 min-w-[40px] items-center justify-center rounded-full bg-[#f77f00] px-3 text-[11px] font-black text-white shadow-sm">
              {number}
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-semibold">
              {seg.type}
            </span>
            <span className="truncate text-[13px] font-semibold">{seg.title || `Segment ${number}`}</span>
            {linkedPollCount ? (
              <Pill text={`${linkedPollCount} poll${linkedPollCount === 1 ? "" : "s"}`} tone="warn" icon={<BarChart3 className="h-3.5 w-3.5" />} />
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Auto-numbered</span>
            <span>•</span>
            <span>Duration: {durationMin} min</span>
            <span>•</span>
            <span>Live Studio countdown: {formatSecondsLabel(durationMin * 60)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SoftButton onClick={onMoveUp} disabled={!canMoveUp} title="Move segment up" className="px-3 py-2">
            ↑
          </SoftButton>
          <SoftButton onClick={onMoveDown} disabled={!canMoveDown} title="Move segment down" className="px-3 py-2">
            ↓
          </SoftButton>
          <button
            type="button"
            className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
            onClick={onDelete}
            title="Delete segment"
          >
            <Trash2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Label>Segment title</Label>
          <Input
            value={seg.title}
            onChange={(v) => onChange({ ...seg, title: v })}
            placeholder={`Segment ${number} title`}
          />
        </div>

        <div>
          <Label>Duration (min) • Required</Label>
          <input
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) =>
              onChange({
                ...seg,
                durationMin: Math.max(1, Number(e.target.value || 0)),
              })
            }
            className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 transition-colors"
          />
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            This value powers the per-segment countdown inside Live Studio while the segment is running.
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Label>Segment notes</Label>
        <TextArea
          value={seg.notes || ""}
          onChange={(v) => onChange({ ...seg, notes: v })}
          placeholder="Cue points, talking points, disclaimers…"
          rows={2}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Label>Linked asset</Label>
        <select
          value={seg.assetId || ""}
          onChange={(e) =>
            onChange({ ...seg, assetId: e.target.value || undefined })
          }
          className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 transition-colors"
        >
          <option value="">None</option>
          {assets
            .filter((a) => a.type === "Opener" || a.type === "Overlay")
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
        </select>

        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Optional: auto-apply overlays for this segment.
        </span>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
        <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Film className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Pinned
          items for this segment
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          These pins appear during the segment in the live viewer.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableItems.slice(0, 6).map((it) => {
            const checked = pinnedIds.includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  const next = checked
                    ? pinnedIds.filter((x) => x !== it.id)
                    : [...pinnedIds, it.id];
                  onChange({ ...seg, pinnedItemIds: next });
                }}
                className={cx(
                  "px-3 py-2 rounded-2xl border text-[12px] font-semibold transition-colors",
                  checked
                    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700",
                )}
              >
                {it.name}
              </button>
            );
          })}
          {!availableItems.length ? (
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              Add featured items first.
            </div>
          ) : null}
        </div>

        {pinned.length ? (
          <div className="mt-3 grid sm:grid-cols-3 gap-2">
            {pinned.map((it) => (
              <div
                key={it.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 flex items-center gap-2 transition-colors"
              >
                <img
                  src={it.imageUrl}
                  className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  alt={it.name}
                />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">
                    {it.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {it.kind === "product" ? "Product" : "Service"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
        <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Gift className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Attached giveaways
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Link configured giveaways to this segment so Live Plan Summary and Live Studio show exactly which giveaway is attached.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {availableGiveaways.length ? (
            availableGiveaways.map((giveaway) => {
              const meta = getGiveawayDisplayMeta(giveaway, availableItems);
              const checked = linkedGiveawayIds.includes(giveaway.id);
              return (
                <button
                  key={giveaway.id}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? linkedGiveawayIds.filter((id) => id !== giveaway.id)
                      : [...linkedGiveawayIds, giveaway.id];
                    onChange({ ...seg, linkedGiveawayIds: next });
                  }}
                  className={cx(
                    "px-3 py-2 rounded-2xl border text-[12px] font-semibold transition-colors",
                    checked
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700",
                  )}
                >
                  {meta.title} • Qty {meta.quantity}
                </button>
              );
            })
          ) : (
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              Add a giveaway first, then link it to a segment here.
            </div>
          )}
        </div>

        {attachedGiveaways.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachedGiveaways.map((giveaway) => {
              const meta = getGiveawayDisplayMeta(giveaway, availableItems);
              return (
                <Pill
                  key={giveaway.id}
                  text={`${meta.title} • Qty ${meta.quantity}`}
                  tone="good"
                  icon={<Gift className="h-3.5 w-3.5" />}
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            No giveaway linked to this segment yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ConfirmSegmentDeleteModal({
  open,
  segment,
  source,
  linkedPollCount,
  attachedGiveawayCount,
  onCancel,
  onConfirm,
  isPending,
}: {
  open: boolean;
  segment: (ReturnType<typeof buildLivePlanSegments>[number]) | null;
  source: "plan" | "teleprompter";
  linkedPollCount: number;
  attachedGiveawayCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!open || !segment) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center px-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-white to-orange-50 dark:from-slate-950 dark:to-orange-950/10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 font-semibold">Confirm deletion</div>
          <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">
            Delete {segment.displayNumber} {segment.title}?
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This was triggered from the {source === "teleprompter" ? "Teleprompter" : "Live Plan segment list"}. Once confirmed, the segment will be removed, remaining segments will renumber automatically, timing will recalculate, UP NEXT logic will refresh, and Live Studio handoff data will update.
          </p>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4">
            <div className="font-bold text-slate-900 dark:text-slate-50">{segment.type} • {segment.durationMin} min</div>
            <div className="mt-1 text-slate-500 dark:text-slate-400">{segment.startTimecode} → {segment.endTimecode}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedPollCount ? <Pill text={`${linkedPollCount} linked poll${linkedPollCount === 1 ? "" : "s"}`} tone="warn" icon={<BarChart3 className="h-3.5 w-3.5" />} /> : null}
              {attachedGiveawayCount ? <Pill text={`${attachedGiveawayCount} attached giveaway${attachedGiveawayCount === 1 ? "" : "s"}`} tone="good" icon={<Gift className="h-3.5 w-3.5" />} /> : null}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2 justify-end">
          <SoftButton onClick={onCancel} disabled={isPending}>Cancel</SoftButton>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-[12px] font-semibold border border-transparent text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Deleting..." : "Yes, delete segment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PollBuilderDrawer({
  open,
  onClose,
  segments,
  poll,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  segments: RunSegment[];
  poll?: LivePlanPoll | null;
  onSave: (nextPoll: LivePlanPoll) => void;
}) {
  const numberedSegments = useMemo(() => buildLivePlanSegments(segments, []), [segments]);
  const [pollDraft, setPollDraft] = useState<LivePlanPoll>(() => buildDefaultLivePlanPoll(segments, poll));

  useEffect(() => {
    if (!open) return;
    setPollDraft(buildDefaultLivePlanPoll(segments, poll));
  }, [open, poll, segments]);

  const canAddOption = pollDraft.options.length < 4;
  const canRemoveOption = pollDraft.options.length > 2;
  const questionReady = pollDraft.question.trim().length > 0;
  const optionsReady = pollDraft.options.every((option) => option.text.trim().length > 0);
  const launchReady = pollDraft.launchMode === "manual" || Boolean(pollDraft.linkedSegmentId);
  const canSave = questionReady && optionsReady && launchReady;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={poll ? "Edit Poll" : "Add Poll"}
      subtitle="Create live-session polls with manual or segment-linked launch, duration, live-results, and reopen controls."
      width="w-full"
      zIndex={120}
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
          <div>
            <Label>Question text</Label>
            <Input
              value={pollDraft.question}
              onChange={(v) => setPollDraft((current) => ({ ...current, question: v }))}
              placeholder="e.g. Which featured item should we open with?"
            />
          </div>
          <div>
            <Label>Duration</Label>
            <select
              value={String(pollDraft.durationSec)}
              onChange={(e) =>
                setPollDraft((current) => ({
                  ...current,
                  durationSec: Math.max(15, Math.floor(Number(e.target.value || 60))),
                }))
              }
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20"
            >
              {[30, 45, 60, 90, 120, 180].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {formatSecondsLabel(seconds)}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Live Studio uses this when the poll is launched on-air.
            </div>
          </div>
        </div>

        <div>
          <Label>Optional helper text</Label>
          <TextArea
            rows={2}
            value={pollDraft.helperText || ""}
            onChange={(v) => setPollDraft((current) => ({ ...current, helperText: v }))}
            placeholder="Optional context or host instruction shown beneath the poll question."
          />
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Launch mode</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Choose whether the host or co-host launches the poll manually, or whether it is linked to a specific Live Plan segment.
              </div>
            </div>
            <SegmentedToggle
              left="Manual"
              right="Linked to segment"
              value={pollDraft.launchMode === "manual" ? "left" : "right"}
              onChange={(value) =>
                setPollDraft((current) => ({
                  ...current,
                  launchMode: value === "left" ? "manual" : "linked",
                  linkedSegmentId:
                    value === "right"
                      ? current.linkedSegmentId || numberedSegments[0]?.id
                      : undefined,
                }))
              }
            />
          </div>

          {pollDraft.launchMode === "linked" ? (
            <div className="mt-4">
              <Label>Linked Live Plan segment</Label>
              <select
                value={pollDraft.linkedSegmentId || ""}
                onChange={(e) =>
                  setPollDraft((current) => ({
                    ...current,
                    linkedSegmentId: e.target.value || undefined,
                  }))
                }
                className="mt-1 h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#f77f00] focus:ring-4 focus:ring-orange-100 dark:focus:ring-orange-900/20"
              >
                {numberedSegments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.displayNumber} {segment.title} • {formatMinutesLabel(segment.durationMin)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 transition-colors">
              Manual launch keeps the poll ready in Live Studio so the host or co-host can start it at the right moment.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Answer options</div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Two to four options are supported.</div>
            </div>
            <SoftButton
              onClick={() =>
                setPollDraft((current) => ({
                  ...current,
                  options: [...current.options, createLivePlanPollOption("")].slice(0, 4),
                }))
              }
              disabled={!canAddOption}
            >
              <Plus className="h-4 w-4" /> Add option
            </SoftButton>
          </div>

          <div className="mt-3 space-y-2">
            {pollDraft.options.map((option, index) => (
              <div key={option.id} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2">
                <div className="h-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 grid place-items-center text-[12px] font-black text-slate-700 dark:text-slate-200 transition-colors">
                  {index + 1}
                </div>
                <Input
                  value={option.text}
                  onChange={(value) =>
                    setPollDraft((current) => ({
                      ...current,
                      options: current.options.map((item) =>
                        item.id === option.id ? { ...item, text: value } : item,
                      ),
                    }))
                  }
                  placeholder={`Answer option ${index + 1}`}
                />
                <SoftButton
                  onClick={() =>
                    setPollDraft((current) => ({
                      ...current,
                      options: current.options.filter((item) => item.id !== option.id),
                    }))
                  }
                  disabled={!canRemoveOption}
                  className="px-3 py-2"
                >
                  Remove
                </SoftButton>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            checked={pollDraft.showLiveResults}
            onChange={(value) => setPollDraft((current) => ({ ...current, showLiveResults: value }))}
            label="Live-results toggle"
            hint="Allow Live Studio to reveal real-time results while the poll is open."
          />
          <Toggle
            checked={pollDraft.allowReopen}
            onChange={(value) => setPollDraft((current) => ({ ...current, allowReopen: value }))}
            label="Reopen toggle"
            hint="Allow the host or co-host to reopen the poll after closing when needed."
          />
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
          <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Live Studio handoff</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Saved polls are handed to Live Studio together with launch mode, duration, results visibility, reopen behavior, and any linked segment numbering.
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <SoftButton onClick={onClose}>Cancel</SoftButton>
          <PrimaryButton
            disabled={!canSave}
            onClick={() => {
              onSave({
                ...pollDraft,
                options: ensureLivePlanPollOptions(pollDraft.options).slice(0, 4),
              });
              onClose();
            }}
          >
            {poll ? "Save poll" : "Add poll"}
          </PrimaryButton>
        </div>
      </div>
    </Drawer>
  );
}

/* ------------------------------- Builder view ------------------------------- */

export function LiveBuilderView({
  initialSessionId,
  prefillDealId,
  _onRequestClose,
}: {
  initialSessionId?: string;
  prefillDealId?: string;
  _onRequestClose?: () => void;
}) {
  const { showSuccess, showError, showNotification } = useNotification();
  const { run, isPending } = useAsyncAction();
  const [draft, setDraft] = useState<LiveSessionDraft>(() =>
    defaultDraft(
      initialSessionId || `ls_${Math.random().toString(16).slice(2, 8)}`,
      prefillDealId,
    ),
  );
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [step, setStep] = useState<StepKey>("setup");

  // Supplier plan tier gates max live duration (Bronze/Silver/Gold).
  // This is kept flexible so the Supplier App can later wire an account-plan context into the same builder.
  const rankTier = ((((globalThis as any)?.__supplierRankTier as RankTier | undefined) ||
    "Gold") as RankTier);

  const tierMaxMinutes = useMemo(() => {
    if (rankTier === "Gold") return 1440;
    if (rankTier === "Silver") return 360;
    return 60;
  }, [rankTier]);

  const tierMaxHoursLabel = useMemo(() => {
    const h = tierMaxMinutes / 60;
    return h === 1 ? "1 hour" : `${h} hours`;
  }, [tierMaxMinutes]);

  const DURATION_PRESETS = useMemo(() => {
    // Keep original 25–60 (5-minute) presets, then add longer options for higher tiers.
    const base = [25, 30, 35, 40, 45, 50, 55, 60];
    const silver = [75, 90, 120, 180, 240, 360];
    const gold = [480, 720, 1440];

    let list = [...base];
    if (tierMaxMinutes >= 360) list = [...list, ...silver];
    if (tierMaxMinutes >= 1440) list = [...list, ...gold];

    list = list.filter((m) => m <= tierMaxMinutes);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [tierMaxMinutes]);

  const TIMEZONE_PRESETS = useMemo(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const base = [
      { id: local, label: `Local (${local})` },
      { id: "UTC", label: "UTC" },
      { id: "Africa/Kampala", label: "Africa/Kampala (EAT)" },
      { id: "Africa/Nairobi", label: "Africa/Nairobi (EAT)" },
      { id: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)" },
      { id: "Europe/London", label: "Europe/London (UK)" },
      { id: "Europe/Paris", label: "Europe/Paris (CET)" },
      { id: "America/New_York", label: "America/New_York (ET)" },
      { id: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
      { id: "Asia/Dubai", label: "Asia/Dubai (GST)" },
      { id: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
    ];
    return base;
  }, []);

  function isValidTimeZone(tz: string) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  function clampDurationMinutes(m: number) {
    return Math.max(15, Math.min(tierMaxMinutes, m));
  }

  function fmtInTimeZone(d: Date, tz: string) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  }

  // Scheduling Logic
  function recomputeSchedule(
    next: Partial<
      Pick<
        LiveSessionDraft,
        | "startDateISO"
        | "startTime"
        | "endDateISO"
        | "endTime"
        | "durationMinutes"
        | "scheduleAnchor"
        | "durationMode"
        | "timezoneLabel"
      >
    >,
  ) {
    setDraft((prev) => {
      const durationMinutes = Math.max(
        15,
        Math.min(
          tierMaxMinutes,
          next.durationMinutes ?? prev.durationMinutes ?? 60,
        ),
      );
      const scheduleAnchor = (next.scheduleAnchor ??
        prev.scheduleAnchor ??
        "start") as "start" | "end";

      // Normalize timezone
      const timezoneLabel =
        (next.timezoneLabel ??
          prev.timezoneLabel ??
          Intl.DateTimeFormat().resolvedOptions().timeZone) ||
        "UTC";
      let tz = timezoneLabel;
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
      } catch {
        tz = "UTC";
      }

      const startDateISO = next.startDateISO ?? prev.startDateISO;
      const startTime = next.startTime ?? prev.startTime;
      const endDateISO = next.endDateISO ?? prev.endDateISO;
      const endTime = next.endTime ?? prev.endTime;

      // Helper to parse date+time string in a specific timezone
      const parseInZone = (isoDate: string, timeStr: string, zone: string) => {
        const [y, m, d] = isoDate.split("-").map(Number);
        const [hh, mm] = timeStr.split(":").map(Number);
        // We'll use a naive approach that assumes the input date/time is "wall time" in that zone.
        // A robust solution needs a library like date-fns-tz, but we will use a simplified consistent Date object manipulation for the demo.
        const date = new Date(Date.UTC(y, m - 1, d, hh, mm));
        return date;
      };

      const formatInZone = (date: Date) => {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const d = String(date.getUTCDate()).padStart(2, "0");
        const hh = String(date.getUTCHours()).padStart(2, "0");
        const mm = String(date.getUTCMinutes()).padStart(2, "0");
        return { dateStr: `${y}-${m}-${d}`, timeStr: `${hh}:${mm}` };
      };

      if (scheduleAnchor === "start") {
        const start = parseInZone(startDateISO, startTime, tz);
        // Add duration
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        const endWall = formatInZone(end);

        return {
          ...prev,
          ...next,
          scheduleAnchor,
          durationMinutes,
          timezoneLabel,
          startDateISO,
          startTime,
          endDateISO: endWall.dateStr,
          endTime: endWall.timeStr,
        };
      }

      // Anchor = end
      const end = parseInZone(endDateISO, endTime, tz);
      const start = new Date(end.getTime() - durationMinutes * 60_000);
      const startWall = formatInZone(start);

      return {
        ...prev,
        ...next,
        scheduleAnchor,
        durationMinutes,
        timezoneLabel,
        startDateISO: startWall.dateStr,
        startTime: startWall.timeStr,
        endDateISO,
        endTime,
      };
    });
  }

  // Quick toast helper for this view
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Picker-mode selected assets (handed off from Asset Library page)
  const [externalAssets, setExternalAssets] = useState<
    Record<string, LiveAsset>
  >({});

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSelected, setCatalogSelected] = useState<string[]>([]);

  // In picker mode, the generic "Featured item" apply targets should apply to
  // the currently selected item (so Live Builder's "Asset Library" quick action
  // doesn't silently default to opener).
  const [activeFeaturedItemId, setActiveFeaturedItemId] = useState<
    string | null
  >(null);
  const [activeFeaturedItemKey, setActiveFeaturedItemKey] = useState<
    string | null
  >(null);

  // Giveaways (optional prizes shown on the promo page + used during the live run-of-show)
  const [giveawayPanelOpen, setGiveawayPanelOpen] = useState(false);
  const [giveawayAddMode, setGiveawayAddMode] = useState<"featured" | "custom">(
    "featured",
  );
  const [giveawayLinkedItemId, setGiveawayLinkedItemId] = useState<string>("");
  const [giveawayQuantity, setGiveawayQuantity] = useState<string>("1");
  const [customGiveaway, setCustomGiveaway] = useState<{
    presetId: string;
    quantity: string;
  }>({
    presetId: "",
    quantity: "1",
  });

  const [pollDrawerOpen, setPollDrawerOpen] = useState(false);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [livePlanSummaryOpen, setLivePlanSummaryOpen] = useState(false);

  const supplierCustomGiveawayPresets = useMemo<
    SupplierCustomGiveawayPreset[]
  >(() => {
    const seeded = draft.campaignId
      ? supplierCustomGiveawayPresetsSeed[draft.campaignId] || []
      : [];
    if (typeof window === "undefined") return seeded;

    try {
      const raw =
        sessionStorage.getItem("mldz:supplierCampaignBuilder:draft:v1") ||
        localStorage.getItem("mldz:supplierCampaignBuilder:draft:v1");
      if (!raw) return seeded;

      const saved = JSON.parse(raw);
      const builder =
        saved?.builder && typeof saved.builder === "object"
          ? saved.builder
          : saved;
      const campaignId =
        typeof builder?.campaignId === "string"
          ? builder.campaignId
          : draft.campaignId;
      const normalized = normalizeSupplierCustomGiveawayPresets(
        builder?.giveaways,
        campaignId,
      );
      if (!normalized.length) return seeded;

      if (!draft.campaignId) return normalized;

      const matching = normalized.filter(
        (g) => !g.campaignId || g.campaignId === draft.campaignId,
      );
      return matching.length ? matching : seeded.length ? seeded : normalized;
    } catch {
      return seeded;
    }
  }, [draft.campaignId]);

  const selectedCustomGiveawayPreset = useMemo(
    () =>
      supplierCustomGiveawayPresets.find(
        (preset) => preset.id === customGiveaway.presetId,
      ),
    [supplierCustomGiveawayPresets, customGiveaway.presetId],
  );

  const selectedFeaturedGiveawayItem = useMemo(
    () => draft.products.find((item) => item.id === giveawayLinkedItemId) || null,
    [draft.products, giveawayLinkedItemId],
  );

  const featuredGiveawaySupplierTotal = useMemo(
    () => getLiveItemGiveawaySupplierTotal(selectedFeaturedGiveawayItem),
    [selectedFeaturedGiveawayItem],
  );
  const featuredGiveawaySupplierAvailable = useMemo(
    () => getLiveItemGiveawaySupplierAvailable(selectedFeaturedGiveawayItem),
    [selectedFeaturedGiveawayItem],
  );
  const featuredGiveawayAllocatedQty = useMemo(
    () =>
      draft.giveaways.reduce((sum, giveaway) => {
        if (giveaway.linkedItemId !== giveawayLinkedItemId) return sum;
        return sum + (typeof giveaway.quantity === "number" && giveaway.quantity > 0 ? Math.floor(giveaway.quantity) : 0);
      }, 0),
    [draft.giveaways, giveawayLinkedItemId],
  );
  const featuredGiveawayRemainingQty = useMemo(
    () =>
      getRemainingGiveawayAvailability(
        featuredGiveawaySupplierAvailable,
        featuredGiveawayAllocatedQty,
      ),
    [featuredGiveawaySupplierAvailable, featuredGiveawayAllocatedQty],
  );

  const customGiveawaySupplierTotal = useMemo(
    () => getPresetGiveawaySupplierTotal(selectedCustomGiveawayPreset),
    [selectedCustomGiveawayPreset],
  );
  const customGiveawaySupplierAvailable = useMemo(
    () => getPresetGiveawaySupplierAvailable(selectedCustomGiveawayPreset),
    [selectedCustomGiveawayPreset],
  );
  const customGiveawayAllocatedQty = useMemo(
    () =>
      draft.giveaways.reduce((sum, giveaway) => {
        if ((giveaway as any).customPresetId !== customGiveaway.presetId) return sum;
        return sum + (typeof giveaway.quantity === "number" && giveaway.quantity > 0 ? Math.floor(giveaway.quantity) : 0);
      }, 0),
    [draft.giveaways, customGiveaway.presetId],
  );
  const customGiveawayRemainingQty = useMemo(
    () =>
      getRemainingGiveawayAvailability(
        customGiveawaySupplierAvailable,
        customGiveawayAllocatedQty,
      ),
    [customGiveawaySupplierAvailable, customGiveawayAllocatedQty],
  );

  const featuredGiveawayQty = parseQuantity(giveawayQuantity);
  const featuredGiveawayValidationMessage = !draft.products.length
    ? "Add featured items first."
    : !giveawayLinkedItemId
      ? "Select a featured item."
      : !selectedFeaturedGiveawayItem
        ? "Selected featured item is no longer available in this session."
        : featuredGiveawaySupplierTotal <= 0
          ? "This featured item does not currently have supplier-fed giveaway stock configured."
          : featuredGiveawaySupplierAvailable <= 0
            ? "This featured item currently has no supplier-fed giveaway stock available."
            : featuredGiveawayRemainingQty <= 0
              ? "This featured item's available giveaway stock has already been fully allocated in this session."
              : featuredGiveawayQty === null
                ? "Set a session quantity of at least 1."
                : featuredGiveawayQty > featuredGiveawayRemainingQty
                  ? `Session quantity cannot exceed ${featuredGiveawayRemainingQty}.`
                  : null;
  const isFeaturedGiveawayQtyValid = !featuredGiveawayValidationMessage;

  const customGiveawayQty = parseQuantity(customGiveaway.quantity);
  const customGiveawayValidationMessage = !supplierCustomGiveawayPresets.length
    ? "No supplier-set custom giveaway items are available for this campaign yet."
    : !customGiveaway.presetId
      ? "Select a supplier-set custom giveaway."
      : !selectedCustomGiveawayPreset
        ? "Selected supplier-set custom giveaway is no longer available."
        : customGiveawaySupplierTotal <= 0
          ? "This supplier-set custom giveaway does not currently have giveaway stock configured."
          : customGiveawaySupplierAvailable <= 0
            ? "This supplier-set custom giveaway currently has no available supplier giveaway stock."
            : customGiveawayRemainingQty <= 0
              ? "This supplier-set custom giveaway has already been fully allocated in this session."
              : customGiveawayQty === null
                ? "Set a session quantity of at least 1."
                : customGiveawayQty > customGiveawayRemainingQty
                  ? `Session quantity cannot exceed ${customGiveawayRemainingQty}.`
                  : null;
  const isCustomGiveawayQtyValid = !customGiveawayValidationMessage;

  useEffect(() => {
    if (!draft.products.length) {
      if (activeFeaturedItemId !== null) setActiveFeaturedItemId(null);
      if (activeFeaturedItemKey !== null) setActiveFeaturedItemKey(null);
      return;
    }

    // Keep all featured-item goal cards collapsed by default until the creator explicitly opens one.
    if (!activeFeaturedItemId) {
      if (activeFeaturedItemKey !== null) setActiveFeaturedItemKey(null);
      return;
    }

    const activeIndex = draft.products.findIndex(
      (p) => p.id === activeFeaturedItemId,
    );
    if (activeIndex === -1) {
      setActiveFeaturedItemId(null);
      setActiveFeaturedItemKey(null);
      return;
    }

    const expectedKey = getFeaturedItemRowKey(
      activeFeaturedItemId,
      activeIndex,
    );
    if (activeFeaturedItemKey !== expectedKey) {
      setActiveFeaturedItemKey(expectedKey);
    }
  }, [draft.products, activeFeaturedItemId, activeFeaturedItemKey]);

  useEffect(() => {
    if (giveawayAddMode !== "featured") return;
    if (
      giveawayLinkedItemId &&
      !draft.products.some((p) => p.id === giveawayLinkedItemId)
    ) {
      setGiveawayLinkedItemId("");
    }
    if (!giveawayLinkedItemId && draft.products.length) {
      setGiveawayLinkedItemId(draft.products[0].id);
    }
  }, [draft.products, giveawayAddMode, giveawayLinkedItemId]);

  useEffect(() => {
    if (giveawayAddMode !== "featured") return;
    if (!giveawayLinkedItemId) {
      if (giveawayQuantity !== "1") setGiveawayQuantity("1");
      return;
    }
    if (featuredGiveawayRemainingQty <= 0) {
      if (giveawayQuantity !== "0") setGiveawayQuantity("0");
      return;
    }
    const next = clampQuantityInput(giveawayQuantity, featuredGiveawayRemainingQty);
    if (next !== giveawayQuantity) {
      setGiveawayQuantity(next);
    }
  }, [
    giveawayAddMode,
    giveawayLinkedItemId,
    featuredGiveawayRemainingQty,
    giveawayQuantity,
  ]);

  useEffect(() => {
    if (giveawayAddMode !== "custom") return;

    if (!supplierCustomGiveawayPresets.length) {
      if (customGiveaway.presetId || customGiveaway.quantity !== "1") {
        setCustomGiveaway({ presetId: "", quantity: "1" });
      }
      return;
    }

    const matched = supplierCustomGiveawayPresets.find(
      (preset) => preset.id === customGiveaway.presetId,
    );
    if (matched) return;

    const firstPreset = supplierCustomGiveawayPresets[0];
    setCustomGiveaway({ presetId: firstPreset.id, quantity: "1" });
  }, [
    supplierCustomGiveawayPresets,
    giveawayAddMode,
    customGiveaway.presetId,
    customGiveaway.quantity,
  ]);

  useEffect(() => {
    if (giveawayAddMode !== "custom") return;
    if (!customGiveaway.presetId) {
      if (customGiveaway.quantity !== "1") {
        setCustomGiveaway((s) => ({ ...s, quantity: "1" }));
      }
      return;
    }
    if (customGiveawayRemainingQty <= 0) {
      if (customGiveaway.quantity !== "0") {
        setCustomGiveaway((s) => ({ ...s, quantity: "0" }));
      }
      return;
    }
    const next = clampQuantityInput(
      customGiveaway.quantity,
      customGiveawayRemainingQty,
    );
    if (next !== customGiveaway.quantity) {
      setCustomGiveaway((s) => ({ ...s, quantity: next }));
    }
  }, [
    giveawayAddMode,
    customGiveaway.presetId,
    customGiveaway.quantity,
    customGiveawayRemainingQty,
  ]);

  const supplier = useMemo(
    () => suppliersSeed.find((p) => p.id === draft.supplierId),
    [draft.supplierId],
  );
  const campaigns = useMemo(
    () => campaignsSeed.filter((c) => c.supplierId === draft.supplierId),
    [draft.supplierId],
  );
  const campaign = useMemo(
    () => campaignsSeed.find((c) => c.id === draft.campaignId),
    [draft.campaignId],
  );
  const host = useMemo(() => {
    if (supplier && (!draft.hostId || draft.hostId === SUPPLIER_SELF_HOST_ID)) {
      return deriveSupplierHost(supplier);
    }
    return hostsSeed.find((h) => h.id === draft.hostId);
  }, [draft.hostId, supplier]);

  const openerAsset = useMemo(
    () =>
      draft.creatives.openerAssetId
        ? externalAssets[draft.creatives.openerAssetId] ||
          assetsSeed.find((a) => a.id === draft.creatives.openerAssetId)
        : undefined,
    [draft.creatives.openerAssetId, externalAssets],
  );
  const lowerThirdAsset = useMemo(
    () =>
      draft.creatives.lowerThirdAssetId
        ? externalAssets[draft.creatives.lowerThirdAssetId] ||
          assetsSeed.find((a) => a.id === draft.creatives.lowerThirdAssetId)
        : undefined,
    [draft.creatives.lowerThirdAssetId, externalAssets],
  );
  const overlayAssets = useMemo(
    () =>
      draft.creatives.overlayAssetIds
        .map((id) => externalAssets[id] || assetsSeed.find((a) => a.id === id))
        .filter(Boolean) as LiveAsset[],
    [draft.creatives.overlayAssetIds, externalAssets],
  );

  const allAssets = useMemo(() => {
    const map = new Map<string, LiveAsset>();
    [...assetsSeed, ...Object.values(externalAssets)].forEach((a) =>
      map.set(a.id, a),
    );
    return Array.from(map.values());
  }, [externalAssets]);

  const startISO = useMemo(
    () => combineDateTime(draft.startDateISO, draft.startTime),
    [draft.startDateISO, draft.startTime],
  );
  const endISO = useMemo(
    () => combineDateTime(draft.endDateISO, draft.endTime),
    [draft.endDateISO, draft.endTime],
  );

  const setupOk = Boolean(draft.supplierId && draft.campaignId && host?.id);
  const promoOk = Boolean(
    draft.title.trim().length >= 6 &&
    draft.description.trim().length >= 20 &&
    draft.publicJoinUrl.trim().length >= 8,
  );
  const itemsOk = Boolean(draft.products.length >= 1);
  const creativesOk = Boolean(
    draft.creatives.openerAssetId ||
    draft.creatives.lowerThirdAssetId ||
    draft.creatives.overlayAssetIds.length,
  );
  const streamOk = Boolean(draft.stream.ingestUrl && draft.stream.streamKey);
  const scheduleOk =
    Boolean(
      draft.startDateISO &&
      draft.startTime &&
      draft.endDateISO &&
      draft.endTime,
    ) &&
    mockValidateSchedule(
      draft.campaignId,
      draft.startDateISO,
      draft.startTime,
      draft.endDateISO,
      draft.endTime,
    ).ok;
  const complianceOk =
    Boolean(
      draft.compliance.requiresDisclosure
        ? draft.compliance.disclosureText.trim().length > 10
        : true,
    ) && draft.compliance.musicRightsConfirmed;

  /* ---------------------- Asset Library picker handoff ---------------------- */

  const LIVE_DRAFT_KEY = "mldz:supplierLiveBuilder:draft:v1";
  const LIVE_STUDIO_HANDOFF_KEY = "mldz:supplierLiveStudio:handoff:v1";
  const ASSET_PICK_KEY = "mldz:assetPicker:payload:v1";
  const CREATOR_LIVE_DRAFT_KEY = "supplier_live_draft";

  const persistDraftForPicker = useCallback(() => {
    try {
      const studioSegments = buildLivePlanSegments(
        draft.runOfShow,
        draft.livePlanPolls,
      );
      const studioPayload = buildLiveStudioHandoffPayload(
        draft,
        studioSegments,
        buildLivePlanTiming(draft.durationMinutes, studioSegments),
      );
      const payload = {
        ts: Date.now(),
        step,
        draft,
        externalAssets,
        activeFeaturedItemId,
        activeFeaturedItemKey,
        liveStudioHandoff: studioPayload,
        giveawayUi: {
          giveawayPanelOpen,
          giveawayAddMode,
          giveawayLinkedItemId,
          giveawayQuantity,
          customGiveaway,
        },
      };
      sessionStorage.setItem(LIVE_DRAFT_KEY, JSON.stringify(payload));
      sessionStorage.setItem(CREATOR_LIVE_DRAFT_KEY, JSON.stringify(payload));
      sessionStorage.setItem(
        LIVE_STUDIO_HANDOFF_KEY,
        JSON.stringify(studioPayload),
      );
      try {
        localStorage.setItem(CREATOR_LIVE_DRAFT_KEY, JSON.stringify(payload));
        localStorage.setItem(LIVE_DRAFT_KEY, JSON.stringify(payload));
        localStorage.setItem(
          LIVE_STUDIO_HANDOFF_KEY,
          JSON.stringify(studioPayload),
        );
      } catch {
        // ignore (storage may be unavailable)
      }
    } catch (error) {
      console.error("Failed to persist draft for picker:", error);
    }
  }, [
    step,
    draft,
    externalAssets,
    activeFeaturedItemId,
    activeFeaturedItemKey,
    giveawayPanelOpen,
    giveawayAddMode,
    giveawayLinkedItemId,
    giveawayQuantity,
    customGiveaway,
  ]);

  // Persist draft locally so it survives refresh and can be read by Live Studio later (no backend dependency).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        const studioSegments = buildLivePlanSegments(
          draft.runOfShow,
          draft.livePlanPolls,
        );
        const studioPayload = buildLiveStudioHandoffPayload(
          draft,
          studioSegments,
          buildLivePlanTiming(draft.durationMinutes, studioSegments),
        );
        const payload = {
          ts: Date.now(),
          step,
          draft,
          externalAssets,
          activeFeaturedItemId,
          activeFeaturedItemKey,
          liveStudioHandoff: studioPayload,
          giveawayUi: {
            giveawayPanelOpen,
            giveawayAddMode,
            giveawayLinkedItemId,
            giveawayQuantity,
            customGiveaway,
          },
        };
        localStorage.setItem(CREATOR_LIVE_DRAFT_KEY, JSON.stringify(payload));
        // Keep the builder key in sync for other pages that may read it.
        localStorage.setItem(LIVE_DRAFT_KEY, JSON.stringify(payload));
        localStorage.setItem(
          LIVE_STUDIO_HANDOFF_KEY,
          JSON.stringify(studioPayload),
        );
        sessionStorage.setItem(CREATOR_LIVE_DRAFT_KEY, JSON.stringify(payload));
        sessionStorage.setItem(
          LIVE_STUDIO_HANDOFF_KEY,
          JSON.stringify(studioPayload),
        );
      } catch {
        // ignore (storage may be unavailable)
      }
    }, 180);
    return () => window.clearTimeout(t);
  }, [
    step,
    draft,
    externalAssets,
    activeFeaturedItemId,
    activeFeaturedItemKey,
    giveawayPanelOpen,
    giveawayAddMode,
    giveawayLinkedItemId,
    giveawayQuantity,
    customGiveaway,
  ]);

  const buildReturnToUrl = useCallback((): string => {
    const u = new URL(window.location.href);
    u.searchParams.set("restore", "1");
    u.searchParams.set("step", step);
    // Clean any previous picker params
    u.searchParams.delete("assetId");
    u.searchParams.delete("applyTo");
    const qs = u.searchParams.toString();
    return u.pathname + (qs ? `?${qs}` : "");
  }, [step]);

  const openAssetLibraryPicker = useCallback(
    (applyTo?: string) => {
      if (typeof window === "undefined") return;
      persistDraftForPicker();
      const returnTo = buildReturnToUrl();

      const picker = new URL(ROUTES.assetLibrary, window.location.origin);
      picker.searchParams.set("mode", "picker");
      picker.searchParams.set("target", "live");
      picker.searchParams.set("dealId", prefillDealId || draft.id);
      if (applyTo) picker.searchParams.set("applyTo", applyTo);
      picker.searchParams.set("returnTo", returnTo);
      window.location.assign(picker.toString());
    },
    [persistDraftForPicker, buildReturnToUrl, prefillDealId, draft.id],
  );

  const coerceOwner = useCallback(
    (label?: string): "Host" | "Seller" | "Platform" => {
      const t = (label || "").toLowerCase();
      if (t.includes("host")) return "Host";
      if (
        t.includes("supplier") ||
        t.includes("seller") ||
        t.includes("provider")
      )
        return "Seller";
      return "Platform";
    },
    [],
  );

  const coerceAssetType = useCallback(
    (mediaType?: string, role?: string): LiveAssetType => {
      if (role === "opener") return "Opener";
      if (role === "lower_third") return "Lower third";
      if (role === "overlay") return "Overlay";
      if (role === "script") return "Script";
      if (mediaType === "overlay") return "Overlay";
      if (mediaType === "video") return "Opener";
      return "Template";
    },
    [],
  );

  const toLiveAsset = useCallback(
    (payload: Record<string, unknown>): LiveAsset | null => {
      if (!payload || typeof payload !== "object") return null;
      const id = String(payload.id || "");
      const title = String(payload.title || "");
      if (!id || !title) return null;

      const previewKind: "video" | "image" =
        payload.previewKind === "video" || payload.previewKind === "image"
          ? payload.previewKind
          : "image";
      const previewUrl =
        (typeof payload.previewUrl === "string" ? payload.previewUrl : "") ||
        "";
      const thumb =
        (typeof payload.thumbnailUrl === "string"
          ? payload.thumbnailUrl
          : "") || previewUrl;

      return {
        id,
        name: title,
        type: coerceAssetType(
          payload.mediaType as string | undefined,
          payload.role as string | undefined,
        ),
        owner: coerceOwner(payload.ownerLabel as string | undefined),
        tags: Array.isArray(payload.tags)
          ? payload.tags.map((t: unknown) => String(t))
          : [],
        lastUpdatedLabel: "Just now",
        previewUrl: previewUrl || thumb,
        previewKind,
        usageNotes:
          typeof payload.usageNotes === "string"
            ? payload.usageNotes
            : undefined,
        restrictions:
          typeof payload.restrictions === "string"
            ? payload.restrictions
            : undefined,
      };
    },
    [coerceAssetType, coerceOwner],
  );

  const applyPickedAssetToDraft = useCallback(
    (
      prev: LiveSessionDraft,
      asset: LiveAsset,
      applyTo: string,
    ): LiveSessionDraft => {
      if (applyTo === "opener") {
        return {
          ...prev,
          creatives: { ...prev.creatives, openerAssetId: asset.id },
        };
      }
      if (applyTo === "lowerThird") {
        return {
          ...prev,
          creatives: { ...prev.creatives, lowerThirdAssetId: asset.id },
        };
      }
      if (applyTo === "overlay") {
        const next = Array.from(
          new Set([...(prev.creatives.overlayAssetIds || []), asset.id]),
        );
        return {
          ...prev,
          creatives: { ...prev.creatives, overlayAssetIds: next },
        };
      }
      if (applyTo === "promoHeroVideo") {
        if (asset.previewKind !== "video") return prev;
        return { ...prev, heroVideoUrl: asset.previewUrl };
      }
      if (applyTo === "promoHeroImage") {
        if (asset.previewKind !== "image") return prev;
        return { ...prev, heroImageUrl: asset.previewUrl };
      }

      const resolvedActiveItemId = activeFeaturedItemId || prev.products[0]?.id;

      if (
        applyTo === "featuredItemPoster" ||
        applyTo.startsWith("itemPoster:")
      ) {
        const targetId = applyTo.startsWith("itemPoster:")
          ? applyTo.split(":")[1]
          : resolvedActiveItemId;
        if (!targetId) return prev;
        if (asset.previewKind !== "image") return prev;
        return {
          ...prev,
          products: prev.products.map((it) =>
            it.id === targetId
              ? { ...it, imageUrl: asset.previewUrl, posterAssetId: asset.id }
              : it,
          ),
        };
      }

      if (applyTo === "featuredItemVideo" || applyTo.startsWith("itemVideo:")) {
        const targetId = applyTo.startsWith("itemVideo:")
          ? applyTo.split(":")[1]
          : resolvedActiveItemId;
        if (!targetId) return prev;
        if (asset.previewKind !== "video") return prev;
        return {
          ...prev,
          products: prev.products.map((it) =>
            it.id === targetId
              ? { ...it, videoUrl: asset.previewUrl, videoAssetId: asset.id }
              : it,
          ),
        };
      }

      return prev;
    },
    [activeFeaturedItemId],
  );

  const crewOk = useMemo(() => {
    // Mock logic: Sarah A. (mod_1) has a conflict
    const allCrew = [...draft.team.moderators, ...draft.team.cohosts];
    return !allCrew.some((m) => m.id === "mod_1");
  }, [draft.team.moderators, draft.team.cohosts]);


  const editingPoll = useMemo(
    () => draft.livePlanPolls.find((poll) => poll.id === editingPollId) || null,
    [draft.livePlanPolls, editingPollId],
  );

  const runOfShowSignature = useMemo(
    () => draft.runOfShow.map((segment) => segment.id).join("|"),
    [draft.runOfShow],
  );

  const [studioActiveSegmentId, setStudioActiveSegmentId] = useState<string | null>(null);
  const [studioCompletedSegmentIds, setStudioCompletedSegmentIds] = useState<string[]>([]);
  const [deleteSegmentContext, setDeleteSegmentContext] = useState<{
    id: string;
    source: "plan" | "teleprompter";
  } | null>(null);
  const [deleteSegmentPending, setDeleteSegmentPending] = useState(false);

  const livePlanSegments = useMemo(
    () => buildLivePlanSegments(draft.runOfShow, draft.livePlanPolls),
    [draft.runOfShow, draft.livePlanPolls],
  );

  const livePlanTiming = useMemo(
    () => buildLivePlanTiming(draft.durationMinutes, livePlanSegments),
    [draft.durationMinutes, livePlanSegments],
  );

  const livePlanSummaryData = useMemo(
    () => buildLivePlanSummaryData(draft, livePlanSegments, livePlanTiming),
    [draft, livePlanSegments, livePlanTiming],
  );

  const liveStudioHandoff = useMemo(
    () => buildLiveStudioHandoffPayload(draft, livePlanSegments, livePlanTiming),
    [draft, livePlanSegments, livePlanTiming],
  );

  const deleteSegmentTarget = useMemo(
    () =>
      deleteSegmentContext
        ? livePlanSegments.find((segment) => segment.id === deleteSegmentContext.id) || null
        : null,
    [deleteSegmentContext, livePlanSegments],
  );

  const studioActiveSegment = useMemo(
    () => livePlanSegments.find((segment) => segment.id === studioActiveSegmentId) || null,
    [livePlanSegments, studioActiveSegmentId],
  );

  const studioUpNextSegmentId = useMemo(() => {
    if (!livePlanSegments.length) return null;
    const activeIndex = studioActiveSegmentId
      ? livePlanSegments.findIndex((segment) => segment.id === studioActiveSegmentId)
      : -1;
    if (activeIndex >= 0) {
      const next = livePlanSegments
        .slice(activeIndex + 1)
        .find((segment) => !studioCompletedSegmentIds.includes(segment.id));
      return next?.id || null;
    }
    return livePlanSegments.find((segment) => !studioCompletedSegmentIds.includes(segment.id))?.id || null;
  }, [livePlanSegments, studioActiveSegmentId, studioCompletedSegmentIds]);

  const studioUpNextSegment = useMemo(
    () => livePlanSegments.find((segment) => segment.id === studioUpNextSegmentId) || null,
    [livePlanSegments, studioUpNextSegmentId],
  );

  function requestDeleteSegment(segmentId: string, source: "plan" | "teleprompter") {
    setDeleteSegmentContext({ id: segmentId, source });
  }

  function setSegmentRunning(segmentId: string) {
    setStudioCompletedSegmentIds((prev) => prev.filter((id) => id !== segmentId));
    setStudioActiveSegmentId(segmentId);
  }

  function markSegmentComplete(segmentId: string) {
    const nextCompleted = new Set([...studioCompletedSegmentIds, segmentId]);
    setStudioCompletedSegmentIds(Array.from(nextCompleted));
    const nextActive = livePlanSegments.find(
      (segment) => !nextCompleted.has(segment.id) && segment.id !== segmentId,
    );
    setStudioActiveSegmentId(nextActive?.id || null);
  }

  function undoSegmentComplete(segmentId: string) {
    setStudioCompletedSegmentIds((prev) => prev.filter((id) => id !== segmentId));
    if (!studioActiveSegmentId) {
      setStudioActiveSegmentId(segmentId);
    }
  }

  async function confirmDeleteSegment() {
    if (!deleteSegmentTarget) return;
    const segmentId = deleteSegmentTarget.id;
    setDeleteSegmentPending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const nextCompleted = studioCompletedSegmentIds.filter((id) => id !== segmentId);
    const remainingSegments = livePlanSegments.filter((segment) => segment.id !== segmentId);
    const nextActive = remainingSegments.find((segment) => !nextCompleted.includes(segment.id)) || remainingSegments[0] || null;
    setDraft((d) => ({
      ...d,
      runOfShow: d.runOfShow.filter((segment) => segment.id !== segmentId),
    }));
    setStudioCompletedSegmentIds(nextCompleted);
    setStudioActiveSegmentId(nextActive?.id || null);
    setDeleteSegmentPending(false);
    setDeleteSegmentContext(null);
    showSuccess("Segment deleted. Live Plan, teleprompter, summary, and Live Studio handoff refreshed.");
  }

  useEffect(() => {
    if (!livePlanSegments.length) {
      if (studioActiveSegmentId !== null) setStudioActiveSegmentId(null);
      if (deleteSegmentContext) setDeleteSegmentContext(null);
      if (studioCompletedSegmentIds.length) setStudioCompletedSegmentIds([]);
      return;
    }

    const validIds = new Set(livePlanSegments.map((segment) => segment.id));
    const filteredCompleted = studioCompletedSegmentIds.filter((id) => validIds.has(id));
    if (filteredCompleted.length !== studioCompletedSegmentIds.length) {
      setStudioCompletedSegmentIds(filteredCompleted);
    }

    if (deleteSegmentContext && !validIds.has(deleteSegmentContext.id)) {
      setDeleteSegmentContext(null);
    }

    if (
      !studioActiveSegmentId ||
      !validIds.has(studioActiveSegmentId) ||
      filteredCompleted.includes(studioActiveSegmentId)
    ) {
      const firstAvailable =
        livePlanSegments.find((segment) => !filteredCompleted.includes(segment.id)) ||
        livePlanSegments[0];
      if (firstAvailable?.id !== studioActiveSegmentId) {
        setStudioActiveSegmentId(firstAvailable?.id || null);
      }
    }
  }, [
    livePlanSegments,
    studioCompletedSegmentIds,
    studioActiveSegmentId,
    deleteSegmentContext,
  ]);

  useEffect(() => {
    setDraft((prev) => {
      const segmentIds = new Set(prev.runOfShow.map((segment) => segment.id));
      let changed = false;
      const nextPolls = (prev.livePlanPolls || []).map((poll) => {
        if (
          poll.launchMode === "linked" &&
          (!poll.linkedSegmentId || !segmentIds.has(poll.linkedSegmentId))
        ) {
          changed = true;
          return {
            ...poll,
            launchMode: "manual" as const,
            linkedSegmentId: undefined,
          };
        }
        return poll;
      });
      return changed ? { ...prev, livePlanPolls: nextPolls } : prev;
    });
  }, [runOfShowSignature]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams(window.location.search);
    const shouldRestore = sp.get("restore") === "1" || sp.has("assetId");

    const stepParam = sp.get("step");
    if (stepParam && STEPS.some((s) => s.key === stepParam)) {
      setStep(stepParam as StepKey);
    }

    const readSaved = () => {
      try {
        const raw = shouldRestore
          ? sessionStorage.getItem(LIVE_DRAFT_KEY) ||
            sessionStorage.getItem(CREATOR_LIVE_DRAFT_KEY) ||
            localStorage.getItem(CREATOR_LIVE_DRAFT_KEY) ||
            localStorage.getItem(LIVE_DRAFT_KEY)
          : localStorage.getItem(CREATOR_LIVE_DRAFT_KEY) ||
            localStorage.getItem(LIVE_DRAFT_KEY) ||
            sessionStorage.getItem(CREATOR_LIVE_DRAFT_KEY) ||
            sessionStorage.getItem(LIVE_DRAFT_KEY);

        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const hydrate = (saved: any) => {
      if (!saved || typeof saved !== "object") return;

      if (saved?.draft) {
        const restored = saved.draft as LiveSessionDraft;

        const rawGiveaways = Array.isArray((restored as any).giveaways)
          ? ((restored as any).giveaways as any[])
          : [];
        const normalizedGiveaways: LiveGiveaway[] = rawGiveaways.map(
          (g: any, idx: number) => ({
            id: typeof g?.id === "string" && g.id ? g.id : `gw_${idx}`,
            linkedItemId:
              typeof g?.linkedItemId === "string" ? g.linkedItemId : undefined,
            title: typeof g?.title === "string" ? g.title : undefined,
            imageUrl: typeof g?.imageUrl === "string" ? g.imageUrl : undefined,
            notes: typeof g?.notes === "string" ? g.notes : undefined,
            showOnPromo:
              typeof g?.showOnPromo === "boolean" ? g.showOnPromo : true,
            quantity:
              typeof g?.quantity === "number" && g.quantity > 0
                ? Math.floor(g.quantity)
                : 1,
          }),
        );

        setDraft({
          ...restored,
          giveaways: normalizedGiveaways,
          teleprompterScript:
            typeof (restored as any).teleprompterScript === "string"
              ? (restored as any).teleprompterScript
              : "",
          livePlanPolls: normalizeLivePlanPolls((restored as any).livePlanPolls),
          runOfShow: normalizeRunOfShow((restored as any).runOfShow),
        });
      }

      if (saved?.step && STEPS.some((s) => s.key === saved.step)) {
        setStep(saved.step as StepKey);
      }
      if (saved?.externalAssets) setExternalAssets(saved.externalAssets);
      if (shouldRestore && typeof saved?.activeFeaturedItemId === "string")
        setActiveFeaturedItemId(saved.activeFeaturedItemId);
      if (shouldRestore && typeof saved?.activeFeaturedItemKey === "string")
        setActiveFeaturedItemKey(saved.activeFeaturedItemKey);

      const ui = saved?.giveawayUi;
      if (ui && typeof ui === "object") {
        if (typeof (ui as any).giveawayPanelOpen === "boolean")
          setGiveawayPanelOpen(Boolean((ui as any).giveawayPanelOpen));
        if (
          (ui as any).giveawayAddMode === "featured" ||
          (ui as any).giveawayAddMode === "custom"
        )
          setGiveawayAddMode((ui as any).giveawayAddMode);
        if (typeof (ui as any).giveawayLinkedItemId === "string")
          setGiveawayLinkedItemId((ui as any).giveawayLinkedItemId);
        if (typeof (ui as any).giveawayQuantity === "string")
          setGiveawayQuantity((ui as any).giveawayQuantity);

        const cg = (ui as any).customGiveaway;
        if (cg && typeof cg === "object") {
          setCustomGiveaway({
            presetId: typeof cg.presetId === "string" ? cg.presetId : "",
            quantity: typeof cg.quantity === "string" ? cg.quantity : "1",
          });
        }
      }
    };

    const saved = readSaved();
    if (saved?.draft) {
      const restored = saved.draft as LiveSessionDraft;

      // Avoid clobbering an explicitly requested sessionId with some other saved draft.
      if (
        shouldRestore ||
        !initialSessionId ||
        (restored as any).id === initialSessionId
      ) {
        hydrate(saved);
      }
    }

    const assetId = sp.get("assetId") || "";
    const applyTo = sp.get("applyTo") || "";

    if (assetId) {
      try {
        const pickRaw = sessionStorage.getItem(ASSET_PICK_KEY);
        if (pickRaw) {
          const parsed = JSON.parse(pickRaw);
          const payload = parsed?.payload || parsed;
          if (payload?.id === assetId) {
            const a = toLiveAsset(payload);
            if (a) {
              setExternalAssets((prevMap) => ({ ...prevMap, [a.id]: a }));

              setDraft((prev) => applyPickedAssetToDraft(prev, a, applyTo));
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (shouldRestore || assetId) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("assetId");
      clean.searchParams.delete("applyTo");
      clean.searchParams.delete("restore");
      const qs = clean.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        clean.pathname + (qs ? `?${qs}` : ""),
      );
    }
  }, [applyPickedAssetToDraft, toLiveAsset, initialSessionId, showError]);

  const canPublish =
    setupOk &&
    promoOk &&
    itemsOk &&
    streamOk &&
    scheduleOk &&
    complianceOk &&
    crewOk;

  const currentIndex = STEPS.findIndex((s) => s.key === step);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === STEPS.length - 1;

  const currentStepValid = useMemo(() => {
    switch (step) {
      case "setup":
        return setupOk;
      case "promo":
        return promoOk;
      case "items":
        return itemsOk;
      case "show":
        return true;
      case "creatives":
        return creativesOk;
      case "stream":
        return streamOk;
      case "team":
        return crewOk;
      case "schedule":
        return scheduleOk;
      case "review":
        return complianceOk;
      default:
        return true;
    }
  }, [
    step,
    setupOk,
    promoOk,
    itemsOk,
    creativesOk,
    streamOk,
    crewOk,
    scheduleOk,
    complianceOk,
  ]);

  const handleNext = () => {
    if (!isLastStep && currentStepValid) {
      setStep(STEPS[currentIndex + 1].key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setStep(STEPS[currentIndex - 1].key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isMobile = useIsMobile(1024);
  const [previewOpen, setPreviewOpen] = useState(false);

  const copyPromoLink = async () => {
    const promoLink = draft.publicJoinUrl || "";
    if (!promoLink.trim()) {
      showError("Promo link is empty.");
      return;
    }
    try {
      await navigator.clipboard.writeText(promoLink);
      showSuccess("Promo link copied");
    } catch {
      showError("Copy not available in this environment.");
    }
  };

  const copyIngestUrl = async () => {
    const ingestUrl = draft.stream.ingestUrl?.trim() || "";
    if (!ingestUrl) {
      showError("Ingest URL is empty.");
      return;
    }
    try {
      await navigator.clipboard.writeText(ingestUrl);
      showSuccess("Ingest URL copied!");
    } catch {
      showError("Copy not available in this environment.");
    }
  };

  const copyAllStreamCredentials = async () => {
    const ingestUrl = draft.stream.ingestUrl?.trim() || "";
    const streamKey = draft.stream.streamKey?.trim() || "";
    if (!ingestUrl && !streamKey) {
      showError("No stream credentials available to copy.");
      return;
    }
    const payload = [
      `Ingest URL: ${ingestUrl || "—"}`,
      `Stream key: ${streamKey || "—"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      showSuccess("All credentials copied to clipboard!");
    } catch {
      showError("Copy not available in this environment.");
    }
  };

  const regenerateStreamKey = () => {
    const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const next = `sk_live_${suffix}`.slice(0, 36);
    setDraft((d) => ({
      ...d,
      stream: { ...d.stream, streamKey: next },
    }));
    showSuccess("Stream key regenerated!");
  };

  const addCatalogSelected = () => {
    const picked = catalogSeed.filter((it) => catalogSelected.includes(it.id));
    setDraft((d) => {
      const existingIds = new Set(d.products.map((x) => x.id));
      const merged = [
        ...d.products,
        ...picked.filter((x) => !existingIds.has(x.id)),
      ];
      return { ...d, products: merged };
    });
    setCatalogSelected([]);
  };

  const availableItemsForPins = useMemo(() => draft.products, [draft.products]);

  return (
    <div className="space-y-4 pb-28 sm:pb-20" style={{ overflowAnchor: "none" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap transition-colors">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xl sm:text-2xl font-extrabold truncate text-slate-900 dark:text-slate-100">
              {draft.title}
            </div>
            <Pill
              text={draft.status}
              tone={
                draft.status === "Live"
                  ? "good"
                  : draft.status === "Scheduled"
                    ? "warn"
                    : "neutral"
              }
            />
            {prefillDealId ? (
              <Pill text={`Prefilled from deal ${prefillDealId}`} />
            ) : null}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap transition-colors">
            <span>Start: {fmtDT(startISO)}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>End: {fmtDT(endISO)}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Desktop viewer mode: {draft.desktopMode}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SoftButton
            onClick={() => safeNav(ROUTES.liveDashboard)}
            title="Back to Live Dashboard"
          >
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </SoftButton>

          {isMobile ? (
            <SoftButton
              onClick={() => setPreviewOpen(true)}
              title="Open preview"
            >
              <MonitorPlay className="h-4 w-4" /> Preview
            </SoftButton>
          ) : null}

          <SoftButton
            onClick={() =>
              run(async () => {
                persistDraftForPicker();
              }, {
                successMessage: "Draft saved successfully!",
              })
            }
            disabled={isPending}
            title="Save"
          >
            {isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}{" "}
            Save
          </SoftButton>

          <PrimaryButton
            disabled={!canPublish || isPending}
            onClick={() =>
              run(
                async () => {
                  setDraft((d) => ({ ...d, status: "Ready" }));
                },
                {
                  successMessage: "Live session submitted for approval.",
                  delay: 1500,
                },
              )
            }
            title={
              !canPublish ? "Complete preflight to submit for approval" : "Submit for approval"
            }
          >
            {isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <Zap className="h-4 w-4" />
            )}{" "}
            Submit for Approval
          </PrimaryButton>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <StepNav step={step} setStep={setStep} />

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
            <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
              Quick analytics (preview)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Historical baselines + projections for supplier-hosted or creator-hosted sessions (demo).
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors min-h-[82px]">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Expected peak viewers
                </div>
                <div className="text-[18px] font-semibold mt-1 text-slate-900 dark:text-slate-100">
                  12.4k
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Based on supplier/creator host mode + platform mix.
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors min-h-[82px]">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Projected conversion
                </div>
                <div className="text-[18px] font-semibold mt-1 text-slate-900 dark:text-slate-100">
                  2.6%
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pinned cadence + featured item quality.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="lg:col-span-5 space-y-4">
          {step === "setup" ? (
            <Card
              title="Setup"
              subtitle="Supplier → Campaign → Host. Platform 'Other' captures details as required."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Supplier (Seller / Provider)</Label>
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
                    value={draft.supplierId || ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        supplierId: e.target.value || undefined,
                        // reset campaign + default to supplier-host mode when supplier changes
                        campaignId: undefined,
                        hostId: SUPPLIER_SELF_HOST_ID,
                        products: [], // clear items; campaign scopes items
                      }))
                    }
                  >
                    {suppliersSeed.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="dark:bg-slate-900"
                      >
                        {p.name} ({p.kind})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Campaign</Label>
                  <select
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
                    value={draft.campaignId || ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        campaignId: e.target.value || undefined,
                        products: [],
                      }))
                    }
                  >
                    <option value="" className="dark:bg-slate-900">
                      Select campaign
                    </option>
                    {campaigns.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="dark:bg-slate-900"
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {!draft.campaignId ? (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                      Campaign scopes catalog, assets & pins.
                    </div>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <Label>Host setup</Label>
                  <div className="mt-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                          Who is hosting this live?
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 max-w-2xl">
                          The supplier can self-host when no external creator is engaged, or assign a creator host while still managing the session from the Supplier App. Co-hosts and moderators remain configurable under Team &amp; moderation.
                        </div>
                      </div>
                      <SegmentedToggle
                        left="Supplier host"
                        right="Creator host"
                        value={draft.hostId === SUPPLIER_SELF_HOST_ID ? "left" : "right"}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            hostId:
                              value === "left"
                                ? SUPPLIER_SELF_HOST_ID
                                : d.hostId && d.hostId !== SUPPLIER_SELF_HOST_ID
                                  ? d.hostId
                                  : hostsSeed[0]?.id,
                          }))
                        }
                      />
                    </div>

                    {draft.hostId === SUPPLIER_SELF_HOST_ID ? (
                      <div className="mt-4 rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 transition-colors">
                        {supplier ? (
                          <div className="flex items-start gap-3">
                            <img
                              src={supplier.avatarUrl}
                              alt={supplier.name}
                              className="h-10 w-10 rounded-full object-cover border border-emerald-200 dark:border-emerald-800"
                            />
                            <div className="min-w-0">
                              <div className="text-[12px] font-semibold flex items-center gap-1 text-slate-900 dark:text-slate-100">
                                {supplier.name}
                                {supplier.verified ? (
                                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                ) : null}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                Supplier host • {supplier.kind === "Provider" ? "Service-led live" : "Product-led live"}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 max-w-2xl">
                                This supplier identity will act as the host across Live Builder, Promo Link preview, countdowns, teleprompter handoff, and Live Studio when no external creator is engaged.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Select a supplier first to derive the supplier-host identity.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                          Choose the creator host assigned to this supplier campaign.
                        </div>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {hostsSeed.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({ ...d, hostId: h.id }))
                              }
                              className={cx(
                                "rounded-3xl border p-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                                draft.hostId === h.id
                                  ? "border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10"
                                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
                              )}
                            >
                              <img
                                src={h.avatarUrl}
                                alt={h.name}
                                className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold truncate flex items-center gap-1 text-slate-900 dark:text-slate-100">
                                  {h.name}{" "}
                                  {h.verified ? (
                                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                  ) : null}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {h.handle} • {h.followers}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label>Platforms</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        "TikTok Live",
                        "Instagram Live",
                        "YouTube Live",
                        "Facebook Live",
                        "Other",
                      ] as LivePlatform[]
                    ).map((p) => {
                      const checked = draft.platforms.includes(p);
                      return (
                        <Toggle
                          key={p}
                          checked={checked}
                          onChange={(v) =>
                            setDraft((d) => ({
                              ...d,
                              platforms: v
                                ? Array.from(new Set([...d.platforms, p]))
                                : d.platforms.filter((x) => x !== p),
                            }))
                          }
                          label={p}
                          hint={
                            p === "Other"
                              ? "Capture the specific platform name"
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>

                  {/* Required behavior: Platform = Other → capture details */}
                  {draft.platforms.includes("Other") ? (
                    <div className="mt-3">
                      <Label>Other platform (required)</Label>
                      <Input
                        value={draft.platformOther || ""}
                        onChange={(v) =>
                          setDraft((d) => ({ ...d, platformOther: v }))
                        }
                        placeholder="e.g., Twitch, Kick, X Live…"
                      />
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Free-text input with optional suggestions (premium).
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <Label>Desktop viewer behavior</Label>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {(["modal", "fullscreen"] as LiveDesktopMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, desktopMode: m }))
                        }
                        className={cx(
                          "rounded-3xl border p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                          draft.desktopMode === m
                            ? "border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900",
                        )}
                      >
                        <div className="text-[12px] font-semibold capitalize text-slate-900 dark:text-slate-100">
                          {m}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {m === "fullscreen"
                            ? "Desktop opens full screen for immersive sessions."
                            : "Desktop opens in a large modal (content-driven)."}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "promo" ? (
            <Card
              title="Promo link"
              subtitle="These fields power the buyer-facing Promo Link page. The preview on the right mirrors the link page you shared."
              right={
                <SoftButton onClick={copyPromoLink} title="Copy promo link">
                  <Copy className="h-4 w-4" /> Copy link
                </SoftButton>
              }
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Session title</Label>
                  <Input
                    value={draft.title}
                    onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
                    placeholder="e.g., Mega Live Dealz — Products + Consultation"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <TextArea
                    value={draft.description}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, description: v }))
                    }
                    rows={4}
                    placeholder="What should buyers expect? Include offers, agenda, and trust notes."
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={draft.tags.join(", ")}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        tags: v
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean)
                          .slice(0, 12),
                      }))
                    }
                    placeholder="Live Demo, Q&A, Bundles…"
                  />
                </div>

                <div>
                  <Label>Location label</Label>
                  <Input
                    value={draft.locationLabel}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, locationLabel: v }))
                    }
                    placeholder="Online"
                  />
                </div>

                <div>
                  <Label>Public live link (promo link)</Label>
                  <Input
                    value={draft.publicJoinUrl}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, publicJoinUrl: v }))
                    }
                    placeholder="https://mylivedealz.com/live/..."
                  />
                </div>

                <div>
                  <Label>Hero aspect</Label>
                  <select
                    value={draft.heroAspect}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        heroAspect: e.target.value as PromoAspect,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
                  >
                    {(["16:9", "4:3", "1:1", "3:4"] as PromoAspect[]).map(
                      (a) => (
                        <option key={a} value={a} className="dark:bg-slate-900">
                          {a}
                        </option>
                      ),
                    )}
                  </select>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                    Affects the buyer hero card layout.
                  </div>
                </div>

                <div>
                  <Label>Hero preview video (optional)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <Input
                        value={draft.heroVideoUrl || ""}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            heroVideoUrl: v || undefined,
                          }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <SoftButton
                      onClick={() => openAssetLibraryPicker("promoHeroVideo")}
                    >
                      <ImageIcon className="h-4 w-4" /> Pick from Asset Library
                    </SoftButton>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                    If set, this plays when buyers tap the hero play icon.
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label>Hero poster image</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <Input
                        value={draft.heroImageUrl}
                        onChange={(v) =>
                          setDraft((d) => ({ ...d, heroImageUrl: v }))
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <SoftButton
                      onClick={() => openAssetLibraryPicker("promoHeroImage")}
                    >
                      <ImageIcon className="h-4 w-4" /> Pick hero image
                    </SoftButton>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                    Required hero size: {HERO_IMAGE_REQUIRED.width}×
                    {HERO_IMAGE_REQUIRED.height}px (catalog canonical). We
                    auto-crop to match the selected hero aspect.
                  </div>
                  <div className="mt-2 aspect-[16/9] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
                    <img
                      src={draft.heroImageUrl}
                      className="w-full h-full object-cover"
                      alt="Poster preview"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 transition-colors">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-0.5" />
                    <div>
                      <div className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-100">
                        Live preview is linked to this section
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        As you edit title, tags, timing, and featured items, the
                        promo link preview updates instantly.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "items" ? (
            <Card
              title="Featured items"
              subtitle="These appear under “Featured Dealz” on the buyer promo link. Items come from the supplier campaign; you can tailor badges, assets, and commerce goals for this live."
            >
              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                      Featured items ({draft.products.length})
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors">
                      <Lock className="h-3.5 w-3.5" /> Supplier-managed catalog
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {draft.products.map((it, idx) => {
                      const rowKey = getFeaturedItemRowKey(it.id, idx);
                      const isActiveItem = activeFeaturedItemKey === rowKey;
                      const goalMetric =
                        it.goalMetric || getDefaultGoalMetric(it.kind);
                      const goalMeta = getGoalMetricDisplay(
                        goalMetric,
                        it.kind,
                      );
                      const goalPresets = getGoalTargetPresets(
                        it.kind,
                        goalMetric,
                      );
                      const goalTypeOptions = getGoalMetricOptions(it.kind);
                      const compactGoalTypeSet = goalTypeOptions.length <= 3;
                      const hasGoal =
                        typeof it.goalTarget === "number" && it.goalTarget > 0;

                      return (
                        <div
                          key={rowKey}
                          className={cx(
                            "p-4 flex flex-wrap sm:flex-nowrap items-start gap-3 cursor-pointer transition-colors",
                            isActiveItem
                              ? "bg-orange-50 dark:bg-orange-900/10"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                          )}
                          onClick={() => {
                            if (isActiveItem) {
                              setActiveFeaturedItemId(null);
                              setActiveFeaturedItemKey(null);
                              return;
                            }
                            setActiveFeaturedItemId(it.id);
                            setActiveFeaturedItemKey(rowKey);
                          }}
                        >
                          <div className="relative h-12 w-12 shrink-0">
                            <img
                              src={it.imageUrl}
                              alt={it.name}
                              className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                            {it.videoUrl ? (
                              <div className="absolute inset-0 grid place-items-center">
                                <div className="h-6 w-6 rounded-full bg-black/40 ring-1 ring-white/20 grid place-items-center">
                                  <Play className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1 basis-[220px]">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">
                                {it.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                <Pill
                                  text={
                                    it.kind === "product"
                                      ? "Product"
                                      : "Service"
                                  }
                                />
                                {isActiveItem ? <Pill text="Active" /> : null}

                                <button
                                  className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                                  title={`Set item poster (${ITEM_POSTER_REQUIRED.width}×${ITEM_POSTER_REQUIRED.height})`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFeaturedItemId(it.id);
                                    setActiveFeaturedItemKey(rowKey);
                                    openAssetLibraryPicker(
                                      `itemPoster:${it.id}`,
                                    );
                                  }}
                                >
                                  <ImageIcon className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                </button>

                                <button
                                  className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                                  title="Set item video"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFeaturedItemId(it.id);
                                    setActiveFeaturedItemKey(rowKey);
                                    openAssetLibraryPicker(
                                      `itemVideo:${it.id}`,
                                    );
                                  }}
                                >
                                  <Film className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                </button>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap transition-colors">
                              {it.kind === "product" ? (
                                <>
                                  <span>
                                    {it.retailPricePreview ||
                                      (typeof it.price === "number"
                                        ? money(it.price, it.currency || "£")
                                        : "—")}
                                  </span>
                                  {it.wholesalePricePreview ? (
                                    <span>
                                      • Wholesale: {it.wholesalePricePreview}
                                    </span>
                                  ) : null}
                                  {typeof it.stock === "number" ? (
                                    <span>• Stock: {it.stock}</span>
                                  ) : null}
                                  {it.wholesaleMoq ? (
                                    <span>• MOQ: {it.wholesaleMoq}+</span>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <span>{it.startingFrom || "—"}</span>
                                  {it.durationMins ? (
                                    <span>• {it.durationMins} min</span>
                                  ) : null}
                                  {it.bookingType ? (
                                    <span>• {it.bookingType}</span>
                                  ) : null}
                                </>
                              )}
                              {hasGoal ? (
                                <span>
                                  • Goal:{" "}
                                  {formatGoalTarget(
                                    goalMetric,
                                    it.goalTarget!,
                                    it.kind,
                                  )}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                className="px-3 py-2 rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[12px] font-semibold text-amber-700 dark:text-amber-300 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isActiveItem) {
                                    setActiveFeaturedItemId(null);
                                    setActiveFeaturedItemKey(null);
                                    return;
                                  }
                                  setActiveFeaturedItemId(it.id);
                                  setActiveFeaturedItemKey(rowKey);
                                }}
                              >
                                {isActiveItem
                                  ? "Hide goals"
                                  : hasGoal
                                    ? "Edit goals"
                                    : "Set goals"}
                              </button>
                              <button
                                type="button"
                                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextBadge = it.badge ? "" : "Hot pick";
                                  setDraft((d) => ({
                                    ...d,
                                    products: d.products.map((x, i) =>
                                      i === idx
                                        ? {
                                            ...x,
                                            badge: nextBadge || undefined,
                                          }
                                        : x,
                                    ),
                                  }));
                                }}
                                title="Toggle badge"
                              >
                                Badge
                              </button>

                              <button
                                type="button"
                                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx === 0) return;
                                  setDraft((d) => {
                                    const copy = [...d.products];
                                    const tmp = copy[idx - 1];
                                    copy[idx - 1] = copy[idx];
                                    copy[idx] = tmp;
                                    return { ...d, products: copy };
                                  });
                                  setActiveFeaturedItemKey(
                                    getFeaturedItemRowKey(it.id, idx - 1),
                                  );
                                  setActiveFeaturedItemId(it.id);
                                }}
                                disabled={idx === 0}
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (idx === draft.products.length - 1) return;
                                  setDraft((d) => {
                                    const copy = [...d.products];
                                    const tmp = copy[idx + 1];
                                    copy[idx + 1] = copy[idx];
                                    copy[idx] = tmp;
                                    return { ...d, products: copy };
                                  });
                                  setActiveFeaturedItemKey(
                                    getFeaturedItemRowKey(it.id, idx + 1),
                                  );
                                  setActiveFeaturedItemId(it.id);
                                }}
                                disabled={idx === draft.products.length - 1}
                              >
                                ↓
                              </button>
                            </div>

                            {isActiveItem ? (
                              <div
                                className="relative mt-3 overflow-visible sm:overflow-hidden rounded-[30px] border border-amber-200/70 dark:border-amber-900/40 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.22),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(249,115,22,0.12),_transparent_30%)] bg-white dark:bg-slate-950/90 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.09)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.45)] transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent dark:via-amber-700/60" />
                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-200/20 blur-2xl dark:bg-amber-700/10" />
                                <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-orange-200/20 blur-2xl dark:bg-orange-700/10" />

                                <div className="relative flex flex-col gap-4">
                                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="flex items-start gap-3 min-w-0">
                                      <div className="h-11 w-11 shrink-0 rounded-[18px] bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 text-white grid place-items-center shadow-[0_12px_28px_rgba(15,23,42,0.20)] dark:from-amber-500 dark:via-amber-400 dark:to-orange-300 dark:text-slate-950">
                                        <BarChart3 className="h-[18px] w-[18px]" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="text-[13px] font-semibold tracking-[0.01em] text-slate-900 dark:text-slate-100">
                                            Commerce goal
                                          </div>
                                          <span className="inline-flex items-center rounded-full border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-900/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition-colors shadow-sm">
                                            {goalMeta.emoji} {goalMeta.shortLabel}
                                          </span>
                                          <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 transition-colors">
                                            Premium setup
                                          </span>
                                        </div>
                                        <div className="text-[11px] leading-5 text-slate-500 dark:text-slate-400 mt-1 max-w-[60ch]">
                                          Set the success target for this item before the live starts. It helps the supplier host or assigned creator track early momentum, in-session performance, and post-live follow-through in Studio.
                                        </div>
                                      </div>
                                    </div>

                                    <div className="w-full min-w-0 sm:min-w-[230px] rounded-[24px] border border-slate-200/90 dark:border-slate-700/90 bg-white/85 dark:bg-slate-900/85 px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:shadow-none backdrop-blur-sm transition-colors">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                          Current setup
                                        </div>
                                        <span className={cx(
                                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-colors",
                                          hasGoal
                                            ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                                        )}>
                                          {hasGoal ? "Configured" : "Optional"}
                                        </span>
                                      </div>
                                      <div className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                                        {hasGoal
                                          ? formatGoalTarget(
                                              goalMetric,
                                              it.goalTarget!,
                                              it.kind,
                                            )
                                          : "No goal set yet"}
                                      </div>
                                      <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                        {goalMeta.hint}
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-2 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Before live
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            Eligible
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 px-3 py-2 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Studio HUD
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            Ready
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] gap-3">
                                    <div className="space-y-3">
                                      <div className="rounded-[24px] border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                          <Label>Goal type</Label>
                                          <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                            Choose how success is measured
                                          </span>
                                        </div>
                                        <div className={cx(
                                          "mt-2 grid gap-2",
                                          compactGoalTypeSet
                                            ? "grid-cols-1 min-[420px]:grid-cols-3"
                                            : "grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4",
                                        )}>
                                          {goalTypeOptions.map(
                                            (opt) => {
                                              const selected =
                                                goalMetric === opt.value;
                                              const meta = getGoalMetricDisplay(
                                                opt.value,
                                                it.kind,
                                              );
                                              return (
                                                <button
                                                  key={opt.value}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDraft((d) => ({
                                                      ...d,
                                                      products: d.products.map(
                                                        (x, i) =>
                                                          i === idx
                                                            ? {
                                                                ...x,
                                                                goalMetric:
                                                                  opt.value,
                                                              }
                                                            : x,
                                                      ),
                                                    }));
                                                  }}
                                                  className={cx(
                                                    "group rounded-[22px] border px-3 py-3 text-left transition-all",
                                                    selected
                                                      ? "border-amber-300 dark:border-amber-700 bg-gradient-to-br from-white to-amber-50/70 dark:from-slate-900 dark:to-amber-950/20 shadow-[0_10px_22px_rgba(251,191,36,0.12)]"
                                                      : "border-slate-200 dark:border-slate-700 bg-white/75 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-[0_8px_20px_rgba(15,23,42,0.05)]",
                                                  )}
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="text-base leading-none">
                                                      {meta.emoji}
                                                    </div>
                                                    <span className={cx(
                                                      "h-5 w-5 rounded-full border grid place-items-center text-[10px] font-bold transition-colors",
                                                      selected
                                                        ? "border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                                        : "border-slate-200 dark:border-slate-700 text-transparent group-hover:text-slate-400",
                                                    )}>
                                                      ✓
                                                    </span>
                                                  </div>
                                                  <div className="mt-2 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                                    {opt.label}
                                                  </div>
                                                </button>
                                              );
                                            },
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-[24px] border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:shadow-none transition-colors">
                                        <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-3 sm:items-end">
                                          <div>
                                            <div className="flex items-center justify-between gap-2">
                                              <Label>Target</Label>
                                              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                                Whole numbers only
                                              </span>
                                            </div>
                                            <input
                                              value={
                                                hasGoal
                                                  ? String(
                                                      Math.floor(
                                                        it.goalTarget!,
                                                      ),
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const cleaned =
                                                  sanitizeQuantityInput(
                                                    e.target.value,
                                                  );
                                                setDraft((d) => ({
                                                  ...d,
                                                  products: d.products.map(
                                                    (x, i) =>
                                                      i === idx
                                                        ? {
                                                            ...x,
                                                            goalMetric:
                                                              x.goalMetric ||
                                                              getDefaultGoalMetric(
                                                                x.kind,
                                                              ),
                                                            goalTarget: cleaned
                                                              ? parseQuantity(
                                                                  cleaned,
                                                                ) || undefined
                                                              : undefined,
                                                          }
                                                        : x,
                                                  ),
                                                }));
                                              }}
                                              inputMode="numeric"
                                              placeholder={
                                                it.kind === "service"
                                                  ? "e.g. 10"
                                                  : "e.g. 25"
                                              }
                                              className="mt-1 w-full px-3.5 py-3 rounded-[20px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-slate-900 dark:text-slate-100 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors"
                                            />
                                            <div className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                              Studio will track against this target before and during the live session.
                                            </div>
                                          </div>

                                          <SoftButton
                                            disabled={!hasGoal}
                                            onClick={() => {
                                              setDraft((d) => ({
                                                ...d,
                                                products: d.products.map(
                                                  (x, i) =>
                                                    i === idx
                                                      ? {
                                                          ...x,
                                                          goalTarget: undefined,
                                                        }
                                                      : x,
                                                ),
                                              }));
                                            }}
                                          >
                                            <X className="h-4 w-4" /> Clear goal
                                          </SoftButton>
                                        </div>

                                        <div className="mt-4 rounded-[20px] border border-slate-200/90 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 p-3 transition-colors">
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                              Quick targets
                                            </span>
                                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                              Tap to apply instantly
                                            </span>
                                          </div>
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            {goalPresets.map((preset) => (
                                              <button
                                                key={preset}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDraft((d) => ({
                                                    ...d,
                                                    products: d.products.map(
                                                      (x, i) =>
                                                        i === idx
                                                          ? {
                                                              ...x,
                                                              goalMetric:
                                                                x.goalMetric ||
                                                                getDefaultGoalMetric(
                                                                  x.kind,
                                                                ),
                                                              goalTarget: preset,
                                                            }
                                                          : x,
                                                    ),
                                                  }));
                                                }}
                                                className={cx(
                                                  "inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                                                  hasGoal && it.goalTarget === preset
                                                    ? "border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-sm"
                                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
                                                )}
                                              >
                                                {preset}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="rounded-[24px] border border-emerald-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/70 dark:from-emerald-950/20 dark:via-slate-950 dark:to-emerald-950/10 p-3.5 shadow-[0_12px_30px_rgba(16,185,129,0.08)] dark:shadow-none transition-colors">
                                      <div className="flex items-start gap-2.5">
                                        <div className="h-9 w-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 grid place-items-center text-emerald-700 dark:text-emerald-300">
                                          <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <div className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-100">
                                            Why set a commerce goal?
                                          </div>
                                          <div className="text-[11px] leading-5 text-emerald-800 dark:text-emerald-300 mt-0.5">
                                            Useful because sales, adds to cart, requests, and bookings can start before the live begins. The live host will also see this goal in Live Studio.
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/85 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                                            Goal mode
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            {goalMeta.label}
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/85 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                                            Target
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            {hasGoal
                                              ? formatGoalTarget(
                                                  goalMetric,
                                                  it.goalTarget!,
                                                  it.kind,
                                                )
                                              : "Optional"}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/85 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                                            Before live
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            Momentum view
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/85 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                                            During live
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            HUD tracking
                                          </div>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/70 bg-white/85 dark:bg-slate-900/60 px-3 py-2.5 transition-colors">
                                          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                                            After live
                                          </div>
                                          <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                            Performance recap
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <button
                            className="h-9 w-9 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                            title="Remove item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDraft((d) => ({
                                ...d,
                                products: d.products.filter(
                                  (_, i) => i !== idx,
                                ),
                              }));
                            }}
                          >
                            <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                          </button>
                        </div>
                      );
                    })}
                    {!draft.products.length ? (
                      <div className="p-4 text-[12px] text-slate-500 dark:text-slate-400 transition-colors">
                        No featured items are available in this campaign yet.
                        Add them to the supplier campaign catalog during Campaign setup.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="h-4 w-4 text-slate-500 mt-0.5" />
                  Premium: products/services toggle appears only when both
                  exist; retail/wholesale toggle appears only when wholesale
                  fields exist.
                </div>

                {/* Giveaways */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-colors">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                      Giveaways ({draft.giveaways.length})
                    </div>
                    <SoftButton onClick={() => setGiveawayPanelOpen((v) => !v)}>
                      <Plus className="h-4 w-4" /> Add Giveaway
                    </SoftButton>
                  </div>

                  <div className="p-4 space-y-3">
                    {draft.giveaways.length ? (
                      <div className="space-y-2">
                        {draft.giveaways.map((g) => {
                          const linked = draft.products.find(
                            (p) => p.id === g.linkedItemId,
                          );
                          const title =
                            linked?.name || g.title || "Giveaway prize";
                          const image = linked?.imageUrl || g.imageUrl;
                          const showOnPromo = g.showOnPromo !== false;
                          const qty =
                            typeof (g as any).quantity === "number" &&
                            (g as any).quantity > 0
                              ? Math.floor((g as any).quantity)
                              : 1;

                          return (
                            <div
                              key={g.id}
                              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center gap-3 transition-colors"
                            >
                              {image ? (
                                <img
                                  src={image}
                                  alt={title}
                                  className="h-12 w-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid place-items-center text-lg">
                                  🎁
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-semibold truncate text-slate-900 dark:text-slate-100">
                                  {title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {linked
                                    ? "From featured items"
                                    : "Custom giveaway"}{" "}
                                  • Qty: {qty}
                                </div>
                                {g.notes ? (
                                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                    {g.notes}
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDraft((d) => ({
                                      ...d,
                                      giveaways: d.giveaways.map((x) =>
                                        x.id === g.id
                                          ? { ...x, showOnPromo: !showOnPromo }
                                          : x,
                                      ),
                                    }))
                                  }
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  title="Toggle visibility on promo page"
                                >
                                  <span>Promo</span>
                                  <span
                                    className={cx(
                                      "h-5 w-9 shrink-0 rounded-full border flex items-center px-1 transition-colors",
                                      showOnPromo
                                        ? "bg-emerald-500 border-emerald-500 justify-end"
                                        : "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 justify-start",
                                    )}
                                  >
                                    <span className="h-3.5 w-3.5 rounded-full bg-white shadow" />
                                  </span>
                                </button>

                                <button
                                  className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                                  title="Remove giveaway"
                                  onClick={() =>
                                    setDraft((d) => ({
                                      ...d,
                                      giveaways: d.giveaways.filter(
                                        (x) => x.id !== g.id,
                                      ),
                                    }))
                                  }
                                >
                                  <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[12px] text-slate-500 dark:text-slate-400 transition-colors">
                        No giveaways configured yet.
                      </div>
                    )}

                    {giveawayPanelOpen ? (
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                            Add giveaway
                          </div>
                          <SegmentedToggle
                            left="From Featured Items"
                            right="Custom Giveaway"
                            value={
                              giveawayAddMode === "featured" ? "left" : "right"
                            }
                            onChange={(v) =>
                              setGiveawayAddMode(
                                v === "left" ? "featured" : "custom",
                              )
                            }
                          />
                        </div>

                        {giveawayAddMode === "featured" ? (
                          <div className="mt-3 space-y-3">
                            <div className="grid gap-3 lg:gap-2 lg:grid-cols-[minmax(0,1fr)_180px_140px] lg:items-start">
                              <div className="lg:min-w-0">
                                <Label>Featured Item Giveaway</Label>
                                <select
                                  className="mt-1 h-10 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 text-[12px] ring-1 ring-slate-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                                  value={giveawayLinkedItemId}
                                  onChange={(e) =>
                                    setGiveawayLinkedItemId(e.target.value)
                                  }
                                  disabled={!draft.products.length}
                                >
                                  {draft.products.map((it) => (
                                    <option key={it.id} value={it.id}>
                                      {it.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                  Supplier-fed stock appears below as total giveaway quantity and currently available quantity.
                                </div>
                              </div>

                              <div className="lg:min-w-0">
                                <Label>Session quantity</Label>
                                <QuantityStepper
                                  value={giveawayQuantity}
                                  onChange={setGiveawayQuantity}
                                  max={featuredGiveawayRemainingQty}
                                  disabled={
                                    !draft.products.length ||
                                    !giveawayLinkedItemId ||
                                    featuredGiveawayRemainingQty <= 0
                                  }
                                  id="featured-giveaway-stepper"
                                />
                              </div>

                              <div className="lg:self-start">
                                <div className="hidden lg:block text-[11px] font-semibold text-transparent select-none">
                                  Add
                                </div>
                                <SoftButton
                                  className="mt-1 h-10 w-full justify-center min-h-0 px-3 py-0 gap-1.5"
                                  disabled={!isFeaturedGiveawayQtyValid}
                                  onClick={() => {
                                    if (!giveawayLinkedItemId) return;
                                    const qty = Math.min(
                                      featuredGiveawayRemainingQty,
                                      Math.max(1, featuredGiveawayQty || 1),
                                    );
                                    if (!qty || featuredGiveawayRemainingQty <= 0) {
                                      showError(
                                        featuredGiveawayValidationMessage ||
                                          "No giveaway stock is currently available.",
                                      );
                                      return;
                                    }
                                    setDraft((d) => ({
                                      ...d,
                                      giveaways: [
                                        ...d.giveaways,
                                        {
                                          id: `gw_${Math.random().toString(16).slice(2, 7)}`,
                                          linkedItemId: giveawayLinkedItemId,
                                          showOnPromo: true,
                                          quantity: qty,
                                        },
                                      ],
                                    }));
                                    const nextRemaining = Math.max(
                                      0,
                                      featuredGiveawayRemainingQty - qty,
                                    );
                                    setGiveawayQuantity(
                                      nextRemaining > 0 ? "1" : "0",
                                    );
                                  }}
                                >
                                  <Plus className="h-4 w-4" /> Add
                                </SoftButton>
                              </div>
                            </div>

                            {selectedFeaturedGiveawayItem ? (
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-2.5 flex items-center gap-3 transition-colors">
                                  <img
                                    src={selectedFeaturedGiveawayItem.imageUrl}
                                    alt={selectedFeaturedGiveawayItem.name}
                                    className="h-14 w-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                      {selectedFeaturedGiveawayItem.name}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                      Featured Item Giveaway • Fast stepper-based session quantity control.
                                    </div>
                                    {selectedFeaturedGiveawayItem.badge ? (
                                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        {selectedFeaturedGiveawayItem.badge}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <GiveawayInventorySummary
                                  title="Supplier giveaway inventory"
                                  subtitle="These values come from the selected featured item. Session quantity is capped to remaining available stock."
                                  total={featuredGiveawaySupplierTotal}
                                  available={featuredGiveawaySupplierAvailable}
                                  remaining={featuredGiveawayRemainingQty}
                                  allocated={featuredGiveawayAllocatedQty}
                                />
                              </div>
                            ) : null}

                            {featuredGiveawayValidationMessage ? (
                              <div
                                className={cx(
                                  "rounded-2xl border p-3 text-[11px] transition-colors",
                                  featuredGiveawayRemainingQty <= 0 ||
                                    featuredGiveawaySupplierAvailable <= 0 ||
                                    featuredGiveawaySupplierTotal <= 0
                                    ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                                    : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300",
                                )}
                              >
                                {featuredGiveawayValidationMessage}
                              </div>
                            ) : featuredGiveawayRemainingQty <= 3 ? (
                              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 transition-colors">
                                Low availability: only {featuredGiveawayRemainingQty} giveaway unit{featuredGiveawayRemainingQty === 1 ? "" : "s"} remain available for this session.
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 transition-colors">
                                Session quantity is capped automatically to the currently available supplier stock.
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 space-y-3">
                            <div className="grid gap-3 lg:gap-2 lg:grid-cols-[minmax(0,1fr)_180px_140px] lg:items-start">
                              <div className="lg:min-w-0">
                                <Label>Custom Giveaway</Label>
                                <select
                                  className="mt-1 h-10 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 text-[12px] ring-1 ring-slate-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                                  value={customGiveaway.presetId}
                                  onChange={(e) => {
                                    const nextId = e.target.value;
                                    setCustomGiveaway({
                                      presetId: nextId,
                                      quantity: "1",
                                    });
                                  }}
                                  disabled={!supplierCustomGiveawayPresets.length}
                                >
                                  {supplierCustomGiveawayPresets.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                      {preset.title}
                                    </option>
                                  ))}
                                </select>
                                {!supplierCustomGiveawayPresets.length ? (
                                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    No supplier-set custom giveaway items are available for this campaign yet.
                                  </div>
                                ) : (
                                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    Supplier-set custom giveaways now surface total giveaway quantity and currently available quantity before you add them.
                                  </div>
                                )}
                              </div>

                              <div className="lg:min-w-0">
                                <Label>Session quantity</Label>
                                <QuantityStepper
                                  value={customGiveaway.quantity}
                                  onChange={(v) =>
                                    setCustomGiveaway((s) => ({
                                      ...s,
                                      quantity: v,
                                    }))
                                  }
                                  max={customGiveawayRemainingQty}
                                  disabled={
                                    !supplierCustomGiveawayPresets.length ||
                                    !customGiveaway.presetId ||
                                    customGiveawayRemainingQty <= 0
                                  }
                                  id="custom-giveaway-stepper"
                                />
                              </div>

                              <div className="lg:self-start">
                                <div className="hidden lg:block text-[11px] font-semibold text-transparent select-none">
                                  Add
                                </div>
                                <SoftButton
                                  className="mt-1 h-10 w-full justify-center min-h-0 px-3 py-0 gap-1.5"
                                  disabled={!isCustomGiveawayQtyValid}
                                  onClick={() => {
                                    const preset =
                                      supplierCustomGiveawayPresets.find(
                                        (item) =>
                                          item.id === customGiveaway.presetId,
                                      );
                                    if (!preset) {
                                      showError(
                                        customGiveawayValidationMessage ||
                                          "Select a supplier-set custom giveaway.",
                                      );
                                      return;
                                    }
                                    const qty = Math.min(
                                      customGiveawayRemainingQty,
                                      Math.max(1, customGiveawayQty || 1),
                                    );
                                    if (!qty || customGiveawayRemainingQty <= 0) {
                                      showError(
                                        customGiveawayValidationMessage ||
                                          "No giveaway stock is currently available.",
                                      );
                                      return;
                                    }
                                    setDraft((d) => ({
                                      ...d,
                                      giveaways: [
                                        ...d.giveaways,
                                        {
                                          id: `gw_${Math.random().toString(16).slice(2, 7)}`,
                                          customPresetId: preset.id,
                                          title: preset.title,
                                          imageUrl: preset.imageUrl,
                                          notes: preset.notes,
                                          showOnPromo: true,
                                          quantity: qty,
                                        } as LiveGiveaway,
                                      ],
                                    }));
                                    const nextRemaining = Math.max(
                                      0,
                                      customGiveawayRemainingQty - qty,
                                    );
                                    setCustomGiveaway({
                                      presetId: preset.id,
                                      quantity: nextRemaining > 0 ? "1" : "0",
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4" /> Add
                                </SoftButton>
                              </div>
                            </div>

                            {selectedCustomGiveawayPreset ? (
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-2.5 flex items-center gap-3 transition-colors">
                                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                    {selectedCustomGiveawayPreset.imageUrl ? (
                                      <img
                                        src={selectedCustomGiveawayPreset.imageUrl}
                                        alt={selectedCustomGiveawayPreset.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Package className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                      {selectedCustomGiveawayPreset.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                      Custom Giveaway • Supplier preset with stepper-based session quantity control.
                                    </div>
                                    {selectedCustomGiveawayPreset.notes ? (
                                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {selectedCustomGiveawayPreset.notes}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <GiveawayInventorySummary
                                  title="Supplier giveaway inventory"
                                  subtitle="These values come from the selected custom giveaway preset."
                                  total={customGiveawaySupplierTotal}
                                  available={customGiveawaySupplierAvailable}
                                  remaining={customGiveawayRemainingQty}
                                  allocated={customGiveawayAllocatedQty}
                                />
                              </div>
                            ) : null}

                            {customGiveawayValidationMessage ? (
                              <div
                                className={cx(
                                  "rounded-2xl border p-3 text-[11px] transition-colors",
                                  customGiveawayRemainingQty <= 0 ||
                                    customGiveawaySupplierAvailable <= 0 ||
                                    customGiveawaySupplierTotal <= 0
                                    ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
                                    : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300",
                                )}
                              >
                                {customGiveawayValidationMessage}
                              </div>
                            ) : customGiveawayRemainingQty <= 3 ? (
                              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 transition-colors">
                                Low availability: only {customGiveawayRemainingQty} giveaway unit{customGiveawayRemainingQty === 1 ? "" : "s"} remain available for this session.
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 transition-colors">
                                Session quantity is capped automatically to the currently available supplier preset stock.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "show" ? (
            <Card
              title="Live Plan"
              subtitle="Run-of-show, polls, teleprompter syncing, segment timing, and Live Studio handoff stay together here."
              right={
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <SoftButton
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        runOfShow: [
                          ...d.runOfShow,
                          {
                            id: `seg_${Math.random().toString(16).slice(2, 7)}`,
                            type: "Flash Sale",
                            title: "Flash Sale",
                            durationMin: 3,
                            notes:
                              "Launch the offer, confirm timer, pin the featured item, and remind viewers how to claim before stock or slots run out.",
                            teleprompterNote:
                              "Call out urgency, restate the timer, and repeat the claim instructions clearly.",
                            pinnedItemIds: activeFeaturedItemId
                              ? [activeFeaturedItemId]
                              : d.products[0]?.id
                                ? [d.products[0].id]
                                : [],
                          },
                        ],
                      }))
                    }
                  >
                    <Zap className="h-4 w-4" /> Flash Sale
                  </SoftButton>
                  <SoftButton
                    onClick={() => {
                      setGiveawayPanelOpen(true);
                      showNotification("Open the giveaway setup below to add a session giveaway for the supplier-hosted or creator-hosted live.");
                    }}
                  >
                    <Gift className="h-4 w-4" /> + Giveaway
                  </SoftButton>
                  <SoftButton
                    onClick={() => {
                      setEditingPollId(null);
                      setPollDrawerOpen(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" /> + Poll
                  </SoftButton>
                  <SoftButton
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        runOfShow: [
                          ...d.runOfShow,
                          {
                            id: `seg_${Math.random().toString(16).slice(2, 7)}`,
                            type: "Custom",
                            title: `Segment ${d.runOfShow.length + 1}`,
                            durationMin: 3,
                            notes: "",
                            teleprompterNote: "",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" /> + Segment
                  </SoftButton>
                  <SoftButton onClick={() => setLivePlanSummaryOpen(true)}>
                    <FileText className="h-4 w-4" /> Live Plan Summary
                  </SoftButton>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="space-y-3">
                  {livePlanSegments.map((segment, index) => (
                    <SegmentRow
                      key={segment.id}
                      seg={segment}
                      number={segment.number}
                      totalSegments={livePlanSegments.length}
                      linkedPollCount={segment.linkedPolls.length}
                      assets={allAssets}
                      availableItems={availableItemsForPins}
                      availableGiveaways={draft.giveaways}
                      onChange={(next) =>
                        setDraft((d) => ({
                          ...d,
                          runOfShow: d.runOfShow.map((item) =>
                            item.id === segment.id ? next : item,
                          ),
                        }))
                      }
                      onDelete={() => requestDeleteSegment(segment.id, "plan")}
                      onMoveUp={() => {
                        if (index === 0) return;
                        setDraft((d) => {
                          const next = [...d.runOfShow];
                          const current = next[index];
                          next[index] = next[index - 1];
                          next[index - 1] = current;
                          return { ...d, runOfShow: next };
                        });
                      }}
                      onMoveDown={() => {
                        if (index === livePlanSegments.length - 1) return;
                        setDraft((d) => {
                          const next = [...d.runOfShow];
                          const current = next[index];
                          next[index] = next[index + 1];
                          next[index + 1] = current;
                          return { ...d, runOfShow: next };
                        });
                      }}
                    />
                  ))}

                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Mic className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Teleprompter
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Auto-filled from numbered segment titles and refreshed whenever segments are added, renamed, removed, or reordered. You can still add editable host notes per segment.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill text={`Allocated ${formatMinutesLabel(livePlanTiming.allocatedMin)}`} tone="neutral" icon={<TimerIcon />} />
                      <Pill
                        text={
                          livePlanTiming.overflowMin > 0
                            ? `Overflow ${formatMinutesLabel(livePlanTiming.overflowMin)}`
                            : `Remaining ${formatMinutesLabel(livePlanTiming.remainingMin)}`
                        }
                        tone={livePlanTiming.overflowMin > 0 ? "danger" : livePlanTiming.remainingMin <= 5 ? "warn" : "good"}
                        icon={<Info className="h-3.5 w-3.5" />}
                      />
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-3 transition-colors">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill
                          text={studioActiveSegment ? `Running ${studioActiveSegment.displayNumber} ${studioActiveSegment.title}` : "No running segment"}
                          tone={studioActiveSegment ? "warn" : "neutral"}
                          icon={<Mic className="h-3.5 w-3.5" />}
                        />
                        <Pill
                          text={studioUpNextSegment ? `UP NEXT ${studioUpNextSegment.displayNumber} ${studioUpNextSegment.title}` : "No next segment"}
                          tone={studioUpNextSegment ? "warn" : "neutral"}
                          icon={<ChevronRight className="h-3.5 w-3.5" />}
                        />
                        <Pill
                          text={`${studioCompletedSegmentIds.length} completed`}
                          tone={studioCompletedSegmentIds.length ? "good" : "neutral"}
                          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        />
                      </div>
                      <SoftButton
                        onClick={() => {
                          setStudioCompletedSegmentIds([]);
                          setStudioActiveSegmentId(livePlanSegments[0]?.id || null);
                        }}
                      >
                        Reset preview states
                      </SoftButton>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3">
                    {livePlanSegments.map((segment) => {
                      const isCompleted = studioCompletedSegmentIds.includes(segment.id);
                      const isRunning = segment.id === studioActiveSegmentId && !isCompleted;
                      const isUpNext = !isCompleted && segment.id === studioUpNextSegmentId;
                      const attachedGiveawayCount = (segment.linkedGiveawayIds || []).length;

                      return (
                        <div
                          key={segment.id}
                          className={cx(
                            "rounded-2xl border bg-white dark:bg-slate-900 p-3 transition-colors",
                            isCompleted
                              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/10"
                              : isRunning
                                ? "border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-900/10"
                                : isUpNext
                                  ? "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10"
                                  : "border-slate-200 dark:border-slate-800",
                          )}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 px-2.5 text-[10px] font-black text-white">
                                  {segment.number}
                                </span>
                                <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                                  {segment.teleprompterTitle}
                                </div>
                                {isRunning ? <Pill text="LIVE NOW" tone="warn" icon={<Mic className="h-3.5 w-3.5" />} /> : null}
                                {isUpNext ? <Pill text="UP NEXT" tone="warn" icon={<ChevronRight className="h-3.5 w-3.5" />} /> : null}
                                {isCompleted ? <Pill text="Completed" tone="good" icon={<CheckCircle2 className="h-3.5 w-3.5" />} /> : null}
                                {segment.linkedPolls.length ? (
                                  <Pill text={`${segment.linkedPolls.length} poll${segment.linkedPolls.length === 1 ? "" : "s"}`} tone="warn" icon={<BarChart3 className="h-3.5 w-3.5" />} />
                                ) : null}
                                {attachedGiveawayCount ? (
                                  <Pill text={`${attachedGiveawayCount} giveaway${attachedGiveawayCount === 1 ? "" : "s"}`} tone="good" icon={<Gift className="h-3.5 w-3.5" />} />
                                ) : null}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                <span>{segment.startTimecode} → {segment.endTimecode}</span>
                                <span>•</span>
                                <span>{formatMinutesLabel(segment.durationMin)}</span>
                                <span>•</span>
                                <span>{formatSecondsLabel(segment.countdownSec)} countdown</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <SoftButton
                                onClick={() => setSegmentRunning(segment.id)}
                                disabled={isRunning}
                                className="px-3 py-2"
                              >
                                Set running
                              </SoftButton>
                              {isCompleted ? (
                                <SoftButton onClick={() => undoSegmentComplete(segment.id)} className="px-3 py-2">
                                  Undo tick
                                </SoftButton>
                              ) : (
                                <SoftButton onClick={() => markSegmentComplete(segment.id)} className="px-3 py-2">
                                  Mark complete
                                </SoftButton>
                              )}
                              <button
                                type="button"
                                className="h-9 w-9 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                                onClick={() => requestDeleteSegment(segment.id, "teleprompter")}
                                title="Delete segment from teleprompter"
                              >
                                <Trash2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3">
                            <Label>Editable host note</Label>
                            <TextArea
                              rows={2}
                              value={segment.teleprompterNote || ""}
                              onChange={(value) =>
                                setDraft((d) => ({
                                  ...d,
                                  runOfShow: d.runOfShow.map((item) =>
                                    item.id === segment.id
                                      ? { ...item, teleprompterNote: value }
                                      : item,
                                  ),
                                }))
                              }
                              placeholder="Add emphasis, cue lines, reminders, transitions, or host/co-host speaking notes."
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-3 transition-colors">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">Live Studio execution preview</div>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Running segment</div>
                        <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                          {studioActiveSegment ? `${studioActiveSegment.displayNumber} ${studioActiveSegment.title}` : "None"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Up next</div>
                        <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                          {studioUpNextSegment ? `${studioUpNextSegment.displayNumber} ${studioUpNextSegment.title}` : "No next segment"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Live Studio summary</div>
                        <div className="mt-1 text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                          {liveStudioHandoff.summary.segments.length} segments mirrored
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Summary, teleprompter states, countdown timing, polls, and giveaway attachments are included in the handoff.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Label>Live-wide teleprompter note</Label>
                    <TextArea
                      value={draft.teleprompterScript || ""}
                      onChange={(value) =>
                        setDraft((d) => ({
                          ...d,
                          teleprompterScript: value,
                        }))
                      }
                      rows={3}
                      placeholder="Optional intro or closing note that should remain available across the whole session."
                    />
                  </div>

                  {livePlanTiming.overflowMin > 0 ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-3 text-[11px] text-rose-700 dark:text-rose-300 transition-colors">
                      Allocated segment time exceeds the session duration by {formatMinutesLabel(livePlanTiming.overflowMin)}. Reduce segment durations or extend the session before going live.
                    </div>
                  ) : livePlanTiming.remainingMin <= 5 ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 transition-colors">
                      Only {formatMinutesLabel(livePlanTiming.remainingMin)} remain unallocated for this session.
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-[11px] text-emerald-700 dark:text-emerald-300 transition-colors">
                      Live Plan timing is balanced and ready to hand off to Live Studio.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" /> Session polls
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Polls created here are handed to Live Studio so the host or co-host can launch them, monitor votes, close them, reveal results, and reopen them when allowed.
                      </div>
                    </div>
                    <Pill text={`${draft.livePlanPolls.length} poll${draft.livePlanPolls.length === 1 ? "" : "s"}`} tone={draft.livePlanPolls.length ? "good" : "neutral"} />
                  </div>

                  <div className="mt-3 space-y-3">
                    {draft.livePlanPolls.length ? (
                      draft.livePlanPolls.map((poll) => {
                        const linkedSegment = livePlanSegments.find((segment) => segment.id === poll.linkedSegmentId);
                        return (
                          <div key={poll.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{poll.question || "Untitled poll"}</div>
                                  <Pill text={`${ensureLivePlanPollOptions(poll.options).length} options`} />
                                  <Pill text={poll.launchMode === "linked" ? "Linked to segment" : "Manual launch"} tone={poll.launchMode === "linked" ? "warn" : "neutral"} />
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                                  <span>Duration {formatSecondsLabel(poll.durationSec)}</span>
                                  <span>•</span>
                                  <span>{poll.showLiveResults ? "Live results ON" : "Live results OFF"}</span>
                                  <span>•</span>
                                  <span>{poll.allowReopen ? "Reopen ON" : "Reopen OFF"}</span>
                                  {linkedSegment ? (
                                    <>
                                      <span>•</span>
                                      <span>Linked to {linkedSegment.teleprompterTitle}</span>
                                    </>
                                  ) : null}
                                </div>
                                {poll.helperText ? (
                                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                                    {poll.helperText}
                                  </div>
                                ) : null}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {ensureLivePlanPollOptions(poll.options).map((option, optionIndex) => (
                                    <div key={option.id} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                                      {optionIndex + 1}. {option.text || `Option ${optionIndex + 1}`}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <SoftButton
                                  onClick={() => {
                                    setEditingPollId(poll.id);
                                    setPollDrawerOpen(true);
                                  }}
                                >
                                  Edit
                                </SoftButton>
                                <SoftButton
                                  onClick={() =>
                                    setDraft((d) => ({
                                      ...d,
                                      livePlanPolls: d.livePlanPolls.filter((item) => item.id !== poll.id),
                                    }))
                                  }
                                >
                                  Delete
                                </SoftButton>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-[12px] text-slate-500 dark:text-slate-400 transition-colors">
                        No polls configured yet. Add a poll to prepare live engagement prompts for Live Studio.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2 transition-colors">
                  <Info className="h-4 w-4 text-slate-500 dark:text-slate-400 mt-0.5" />
                  Live Studio handoff includes numbered segments, per-segment countdown data, teleprompter content, and created polls so the host or co-host can execute the session cleanly.
                </div>
              </div>
            </Card>
          ) : null}

          {step === "creatives" ? (
            <Card
              title="Creatives"
              subtitle="Attach approved assets (opener, lower third, overlays) from the Asset Library."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                        Opener
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Plays at the start of the session.
                      </div>
                    </div>
                    <SoftButton
                      onClick={() => openAssetLibraryPicker("opener")}
                    >
                      Browse <Wand2 className="h-4 w-4" />
                    </SoftButton>
                  </div>
                  <div className="mt-3 aspect-[16/9] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden grid place-items-center transition-colors">
                    {openerAsset?.previewKind === "video" ? (
                      <video
                        className="w-full h-full object-cover"
                        src={openerAsset?.previewUrl}
                        controls
                      />
                    ) : openerAsset?.previewUrl ? (
                      <img
                        className="w-full h-full object-cover"
                        src={openerAsset.previewUrl}
                        alt={openerAsset?.name || "Opener"}
                      />
                    ) : (
                      <div className="text-[12px] text-slate-500 dark:text-slate-400">
                        No opener selected
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                        Lower third
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ticker + price + countdown.
                      </div>
                    </div>
                    <SoftButton
                      onClick={() => openAssetLibraryPicker("lowerThird")}
                    >
                      Browse <Wand2 className="h-4 w-4" />
                    </SoftButton>
                  </div>
                  <div className="mt-3 aspect-[16/9] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 overflow-hidden grid place-items-center transition-colors">
                    {lowerThirdAsset?.previewUrl ? (
                      <img
                        className="w-full h-full object-cover"
                        src={lowerThirdAsset?.previewUrl}
                        alt={lowerThirdAsset?.name || "Lower third"}
                      />
                    ) : (
                      <div className="text-[12px] text-slate-500 dark:text-slate-400">
                        No lower third selected
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                        Overlays
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Multiple overlays allowed (price drop, proof,
                        disclaimers).
                      </div>
                    </div>
                    <SoftButton
                      onClick={() => openAssetLibraryPicker("overlay")}
                    >
                      Add overlay <Plus className="h-4 w-4" />
                    </SoftButton>
                  </div>

                  <div className="mt-3 grid sm:grid-cols-3 gap-2">
                    {overlayAssets.length ? (
                      overlayAssets.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden transition-colors"
                        >
                          <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 transition-colors">
                            {a.previewKind === "video" ? (
                              <video
                                className="w-full h-full object-cover"
                                src={a.previewUrl}
                                controls
                              />
                            ) : (
                              <img
                                className="w-full h-full object-cover"
                                src={a.previewUrl}
                                alt={a.name}
                              />
                            )}
                          </div>
                          <div className="p-2 flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold truncate text-slate-900 dark:text-slate-100">
                              {a.name}
                            </div>
                            <button
                              className="h-8 w-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 grid place-items-center transition-colors"
                              title="Remove"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  creatives: {
                                    ...d.creatives,
                                    overlayAssetIds:
                                      d.creatives.overlayAssetIds.filter(
                                        (id) => id !== a.id,
                                      ),
                                  },
                                }))
                              }
                            >
                              <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[12px] text-slate-500 dark:text-slate-400 transition-colors">
                        No overlays selected yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 transition-colors">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300 mt-0.5" />
                    <div>
                      <div className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-100">
                        Approved assets only
                      </div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        Supplier or creator uploads content → ops/admin approves → assets become available here. Helps trust, governance, and compliance.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "stream" ? (
            <div className="space-y-4">
              {/* 1. Destinations (Simulcast Platforms) */}
              <Card
                title="Destinations"
                subtitle="Select which platforms will receive your live stream broadcast simultaneously."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      "TikTok Live",
                      "Instagram Live",
                      "YouTube Live",
                      "Facebook Live",
                    ] as Exclude<LivePlatform, "Other">[]
                  ).map((p) => (
                    <Toggle
                      key={p}
                      checked={Boolean(draft.stream.simulcast[p])}
                      onChange={(v) =>
                        setDraft((d) => ({
                          ...d,
                          stream: {
                            ...d.stream,
                            simulcast: { ...d.stream.simulcast, [p]: v },
                          },
                        }))
                      }
                      label={p}
                    />
                  ))}
                </div>
              </Card>

              {/* 2. Output Profile (RTMP Ingest) */}
              <Card
                title="Output Profile"
                subtitle="Primary broadcast credentials for your streaming software (OBS, vMix, etc)."
                right={
                  <div className="flex items-center gap-2">
                    <SoftButton onClick={copyAllStreamCredentials}>
                      <Copy className="h-4 w-4" /> Copy all
                    </SoftButton>
                  </div>
                }
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Ingest URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={draft.stream.ingestUrl}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            stream: { ...d.stream, ingestUrl: v },
                          }))
                        }
                        placeholder="rtmps://…"
                      />
                      <SoftButton
                        className="mt-1"
                        onClick={copyIngestUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </SoftButton>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Stream key</Label>
                    <div className="flex gap-2">
                      <Input
                        value={draft.stream.streamKey}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            stream: { ...d.stream, streamKey: v },
                          }))
                        }
                        placeholder="sk_live_…"
                      />
                      <SoftButton
                        className="mt-1"
                        onClick={regenerateStreamKey}
                      >
                        <Sparkles className="h-4 w-4" />
                      </SoftButton>
                    </div>
                  </div>
                </div>
              </Card>

              {/* 3. Advanced Settings */}
              <Card
                title="Advanced Settings"
                subtitle="Configure technical behavior for the master stream and cloud recording."
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Toggle
                    checked={draft.stream.autoStart}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        stream: { ...d.stream, autoStart: v },
                      }))
                    }
                    label="Auto-start"
                    hint="Goes live as soon as data arrives."
                  />
                  <Toggle
                    checked={draft.stream.recording}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        stream: { ...d.stream, recording: v },
                      }))
                    }
                    label="Recording"
                    hint="Save master replay to Asset Library."
                  />
                  <Toggle
                    checked={draft.stream.lowLatency}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        stream: { ...d.stream, lowLatency: v },
                      }))
                    }
                    label="Low latency"
                    hint="Improves real-time chat sync."
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 transition-colors">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[13px] font-bold text-amber-900 dark:text-amber-100">
                        Broadcast Compliance
                      </div>
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        By going live, you confirm that all music and multimedia
                        assets in the stream are properly licensed. Unlicensed
                        content may result in immediate termination of the
                        session.
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {step === "team" ? (
            <Card
              title="Team & moderation"
              subtitle="Assign moderators, cohosts, and safety rules."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Users className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
                    Moderators
                  </div>
                  <div className="mt-3 space-y-2">
                    {draft.team.moderators.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                              {m.name}
                            </div>
                            {m.id === "mod_1" && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Conflict
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {m.email}
                          </div>
                        </div>
                        <SoftButton
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              team: {
                                ...d.team,
                                moderators: d.team.moderators.filter(
                                  (x) => x.id !== m.id,
                                ),
                              },
                            }))
                          }
                        >
                          Remove <X className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    ))}
                    <SoftButton
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          team: {
                            ...d.team,
                            moderators: [
                              ...d.team.moderators,
                              {
                                id: `md_${Math.random().toString(16).slice(2, 6)}`,
                                name: "New mod",
                                email: "new@mod.io",
                              },
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" /> Add moderator
                    </SoftButton>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Mic className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
                    Cohosts
                  </div>
                  <div className="mt-3 space-y-2">
                    {draft.team.cohosts.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                              {c.name}
                            </div>
                            {c.id === "mod_1" /* sharing key for demo */ && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Conflict
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {c.handle || "—"}
                          </div>
                        </div>
                        <SoftButton
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              team: {
                                ...d.team,
                                cohosts: d.team.cohosts.filter(
                                  (x) => x.id !== c.id,
                                ),
                              },
                            }))
                          }
                        >
                          Remove <X className="h-4 w-4" />
                        </SoftButton>
                      </div>
                    ))}
                    <SoftButton
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          team: {
                            ...d.team,
                            cohosts: [
                              ...d.team.cohosts,
                              {
                                id: `ch_${Math.random().toString(16).slice(2, 6)}`,
                                name: "New cohost",
                                handle: "@cohost",
                              },
                            ],
                          },
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" /> Add cohost
                    </SoftButton>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <ShieldCheck className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
                    Moderation rules
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Blocked terms (comma separated)</Label>
                      <Input
                        value={draft.team.blockedTerms.join(", ")}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            team: {
                              ...d.team,
                              blockedTerms: v
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean)
                                .slice(0, 30),
                            },
                          }))
                        }
                        placeholder="guaranteed, miracle, …"
                      />
                    </div>
                    <div className="flex items-end">
                      <Toggle
                        checked={draft.team.pinnedGuidelines}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            team: { ...d.team, pinnedGuidelines: v },
                          }))
                        }
                        label="Pinned guidelines"
                        hint="Shows rules in the live chat."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "schedule" ? (
            <Card
              title="Schedule"
              subtitle="Select Duration first, then choose either Start or End (timezone-aware). The other side auto-calculates and can roll dates across midnight."
            >
              <div className="space-y-4">
                {/* Duration first (required flow) */}
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Duration
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Select a preset (or choose Custom). Your {rankTier} tier
                        allows up to {tierMaxHoursLabel}. When duration is set,
                        you only need to set either Start or End.
                      </div>
                    </div>

                    <div className="w-full md:w-[320px]">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Time zone
                      </div>
                      <select
                        className="mt-2 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-slate-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={
                          TIMEZONE_PRESETS.some(
                            (o) => o.id === draft.timezoneLabel,
                          )
                            ? draft.timezoneLabel
                            : "__custom__"
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom__") return;
                          recomputeSchedule({ timezoneLabel: v });
                        }}
                      >
                        {TIMEZONE_PRESETS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                        <option value="__custom__">Custom…</option>
                      </select>

                      {!TIMEZONE_PRESETS.some(
                        (o) => o.id === draft.timezoneLabel,
                      ) ? (
                        <div className="mt-2">
                          <input
                            value={draft.timezoneLabel}
                            onChange={(e) =>
                              recomputeSchedule({
                                timezoneLabel: e.target.value,
                              })
                            }
                            className="w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-slate-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                            placeholder="Type an IANA time zone e.g. Africa/Kampala"
                          />
                          {!isValidTimeZone(draft.timezoneLabel) ? (
                            <div className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                              Invalid time zone. Using Local for calculations
                              until fixed.
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Times are scheduled in this time zone. Viewers may see
                        local conversions on their devices.
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      I will set:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        recomputeSchedule({ scheduleAnchor: "start" })
                      }
                      className={cx(
                        "rounded-full px-3 py-1 text-xs font-extrabold transition",
                        draft.scheduleAnchor === "start"
                          ? "bg-[#f77f00] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                      )}
                    >
                      Start time
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        recomputeSchedule({ scheduleAnchor: "end" })
                      }
                      className={cx(
                        "rounded-full px-3 py-1 text-xs font-extrabold transition",
                        draft.scheduleAnchor === "end"
                          ? "bg-[#f77f00] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
                      )}
                    >
                      End time
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
                      {draft.scheduleAnchor === "start"
                        ? "Auto-calculates End"
                        : "Auto-calculates Start"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Preset
                      </div>
                      <select
                        className="mt-1 w-full rounded-2xl bg-white dark:bg-slate-800 px-3 py-2 text-sm ring-1 ring-slate-200 dark:ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors dark:text-slate-100 dark:[color-scheme:dark]"
                        value={
                          draft.durationMode === "preset"
                            ? draft.durationMinutes
                            : "custom"
                        }
                        onChange={(e) => {
                          if (e.target.value === "custom") {
                            recomputeSchedule({ durationMode: "custom" });
                          } else {
                            recomputeSchedule({
                              durationMode: "preset",
                              durationMinutes: parseInt(e.target.value, 10),
                            });
                          }
                        }}
                      >
                        {DURATION_PRESETS.map((m) => (
                          <option key={m} value={String(m)}>
                            {m} minutes
                          </option>
                        ))}
                        <option value="custom">Custom…</option>
                      </select>
                    </div>

                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Custom duration
                      </div>
                      <div className="mt-1">
                        {draft.durationMode === "custom" ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={15}
                              max={tierMaxMinutes}
                              step={1}
                              value={draft.durationMinutes}
                              onChange={(e) =>
                                recomputeSchedule({
                                  durationMode: "custom",
                                  durationMinutes: clampDurationMinutes(
                                    parseInt(e.target.value || "60", 10),
                                  ),
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:[color-scheme:dark]"
                            />
                            <span className="text-xs font-bold text-slate-500">
                              min
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Choose “Custom…” above to type a specific duration.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Result
                    </div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">
                      {draft.durationMinutes} minutes
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {draft.scheduleAnchor === "start"
                        ? "End time auto-fills from Start + Duration (date may roll)."
                        : "Start time auto-fills from End - Duration (date may roll back)."}
                    </div>
                    {/* Visual check of the result range in the chosen timezone */}
                    <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {fmtInTimeZone(
                        new Date(draft.startDateISO + "T" + draft.startTime),
                        draft.timezoneLabel,
                      )}{" "}
                      →{" "}
                      {fmtInTimeZone(
                        new Date(draft.endDateISO + "T" + draft.endTime),
                        draft.timezoneLabel,
                      )}
                    </div>
                  </div>
                </div>

                {/* Start / End inputs */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Start */}
                  <div
                    className={cx(
                      "rounded-3xl border p-4 transition-colors",
                      draft.scheduleAnchor === "start"
                        ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Start
                      </div>
                      {draft.scheduleAnchor === "start" ? (
                        <Pill tone="good" text="Set" />
                      ) : (
                        <Pill tone="neutral" text="Auto" />
                      )}
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label>Date</Label>
                        <input
                          type="date"
                          disabled={draft.scheduleAnchor === "end"}
                          className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:[color-scheme:dark]"
                          value={draft.startDateISO}
                          onChange={(e) =>
                            recomputeSchedule({
                              scheduleAnchor: "start",
                              startDateISO: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <ScrollableTimePicker
                          value={draft.startTime}
                          disabled={draft.scheduleAnchor === "end"}
                          onChange={(v) =>
                            recomputeSchedule({
                              scheduleAnchor: "start",
                              startTime: v,
                            })
                          }
                          label={
                            draft.scheduleAnchor === "start"
                              ? "Scrollable list (required)"
                              : "Auto-calculated"
                          }
                          direction="up"
                        />
                      </div>
                    </div>
                  </div>

                  {/* End */}
                  <div
                    className={cx(
                      "rounded-3xl border p-4 transition-colors",
                      draft.scheduleAnchor === "end"
                        ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        End
                      </div>
                      {draft.scheduleAnchor === "end" ? (
                        <Pill tone="good" text="Set" />
                      ) : (
                        <Pill tone="neutral" text="Auto" />
                      )}
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label>Date</Label>
                        <input
                          type="date"
                          disabled={draft.scheduleAnchor === "start"}
                          className="mt-1 w-full px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:[color-scheme:dark]"
                          value={draft.endDateISO}
                          onChange={(e) =>
                            recomputeSchedule({
                              scheduleAnchor: "end",
                              endDateISO: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <ScrollableTimePicker
                          value={draft.endTime}
                          disabled={draft.scheduleAnchor === "start"}
                          onChange={(v) =>
                            recomputeSchedule({
                              scheduleAnchor: "end",
                              endTime: v,
                            })
                          }
                          label={
                            draft.scheduleAnchor === "end"
                              ? "Scrollable list (required)"
                              : "Auto-calculated"
                          }
                          direction="up"
                        />
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 ring-1 ring-slate-200 dark:ring-slate-800 transition-colors">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                        Ad ends
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {fmtInTimeZone(
                          new Date(draft.endDateISO + "T" + draft.endTime),
                          draft.timezoneLabel,
                        )}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                        Always shown explicitly (in chosen time zone).
                      </div>
                    </div>
                  </div>
                </div>

                {(() => {
                  const val = mockValidateSchedule(
                    draft.campaignId,
                    draft.startDateISO,
                    draft.startTime,
                    draft.endDateISO,
                    draft.endTime,
                  );
                  if (!val.ok) {
                    return (
                      <div className="mt-4 flex items-start gap-2 rounded-3xl bg-red-50 dark:bg-red-900/20 p-4 text-xs text-red-900 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800 transition-colors">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <div>
                          <div className="font-extrabold text-red-900 dark:text-red-100">
                            Schedule Violation
                          </div>
                          <div className="mt-0.5 leading-relaxed">
                            {val.error}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 transition-colors">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-900 dark:text-amber-300 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-100">
                        Scroll time picker
                      </div>
                      <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        Time selection opens as a vertically scrollable list of
                        time options.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {step === "review" ? (
            <Card
              title="Review & submit"
              subtitle="Final QA, compliance, and go-live readiness."
            >
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 transition-colors">
                  <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <ShieldCheck className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
                    Compliance
                  </div>
                  <Toggle
                    checked={draft.compliance.requiresDisclosure}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        compliance: { ...d.compliance, requiresDisclosure: v },
                      }))
                    }
                    label="Disclosure required"
                    hint="Adds a disclosure banner in session."
                  />
                  {draft.compliance.requiresDisclosure ? (
                    <div>
                      <Label>Disclosure text</Label>
                      <TextArea
                        value={draft.compliance.disclosureText}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            compliance: { ...d.compliance, disclosureText: v },
                          }))
                        }
                        rows={3}
                      />
                    </div>
                  ) : null}
                  <Toggle
                    checked={draft.compliance.musicRightsConfirmed}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        compliance: {
                          ...d.compliance,
                          musicRightsConfirmed: v,
                        },
                      }))
                    }
                    label="Music rights confirmed"
                    hint="Required to submit for approval."
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 transition-colors">
                  <div className="text-[12px] font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Settings className="h-4 w-4 text-slate-700 dark:text-slate-300" />{" "}
                    Submission actions
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-[11px] text-slate-600 dark:text-slate-400 transition-colors">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      Summary
                    </div>
                    <div className="mt-1">
                      Supplier: {supplier?.name || "—"}
                    </div>
                    <div>Campaign: {campaign?.name || "—"}</div>
                    <div>
                      Host: {host ? `${host.name} (${host.handle})` : "—"}
                    </div>
                    <div>Platforms: {draft.platforms.join(", ") || "—"}</div>
                    {draft.platforms.includes("Other") ? (
                      <div>Other platform: {draft.platformOther || "—"}</div>
                    ) : null}
                    <div className="mt-1">Start: {fmtDT(startISO)}</div>
                    <div>End: {fmtDT(endISO)}</div>
                    <div className="mt-1">
                      Featured items: {draft.products.length}
                    </div>
                    <div>
                      Commerce goals:{" "}
                      {draft.products.filter(
                        (it) =>
                          typeof it.goalTarget === "number" &&
                          it.goalTarget > 0,
                      ).length
                        ? `${draft.products.filter((it) => typeof it.goalTarget === "number" && it.goalTarget > 0).length} configured`
                        : "Not set"}
                    </div>
                    <div>
                      Giveaways: {draft.giveaways.length}
                      {draft.giveaways.length
                        ? ` (Total qty: ${draft.giveaways.reduce((sum, g) => sum + (typeof (g as any).quantity === "number" && (g as any).quantity > 0 ? Math.floor((g as any).quantity) : 1), 0)})`
                        : ""}
                    </div>
                    <div>Live Plan segments: {livePlanSegments.length}</div>
                    <div>Live Plan polls: {draft.livePlanPolls.length}</div>
                    <div>
                      Allocated Live Plan time: {formatMinutesLabel(livePlanTiming.allocatedMin)}
                      {livePlanTiming.overflowMin > 0 ? ` (overflow ${formatMinutesLabel(livePlanTiming.overflowMin)})` : ` • Remaining ${formatMinutesLabel(livePlanTiming.remainingMin)}`}
                    </div>
                    <div className="mt-1">
                      Promo link: {draft.publicJoinUrl ? "Ready" : "Missing"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <PrimaryButton
                      disabled={!canPublish}
                      onClick={() => {
                        if (canPublish) {
                          setDraft((d) => ({ ...d, status: "Ready" }));
                          setToast(
                            "Success! Your live session was submitted for approval.",
                          );
                        }
                      }}
                    >
                      Submit for Approval <Zap className="h-4 w-4" />
                    </PrimaryButton>
                    <SoftButton onClick={() => setLivePlanSummaryOpen(true)}>
                      <FileText className="h-4 w-4" /> Live Plan Summary
                    </SoftButton>
                    <SoftButton onClick={() => safeNav(ROUTES.liveStudio)}>
                      Rehearse <MonitorPlay className="h-4 w-4" />
                    </SoftButton>
                    <SoftButton onClick={() => safeNav(ROUTES.adzPerformance)}>
                      Analytics <BarChart3 className="h-4 w-4" />
                    </SoftButton>
                  </div>

                  {!canPublish ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 transition-colors">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400" />
                      <div>
                        <div className="font-semibold text-amber-900 dark:text-emerald-100">
                          Complete preflight to submit for approval
                        </div>
                        <div>
                          Most commonly missing: promo details, featured items,
                          or music rights confirmation.
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {/* Sticky Bottom Action Row — Stabilized with contain-layout to prevent page jumping */}
          <div
            className="sticky bottom-4 z-40 mt-8"
            style={{ contain: "layout" }}
          >
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 shadow-2xl transition-all w-full flex items-center justify-between gap-2">
              <div className="hidden sm:flex flex-col">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Step {currentIndex + 1} of {STEPS.length}
                </div>
                <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                  {STEPS[currentIndex].label}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {!isFirstStep && (
                  <SoftButton
                    onClick={handleBack}
                    className="rounded-2xl px-6 py-2.5"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </SoftButton>
                )}

                {!isLastStep ? (
                  <PrimaryButton
                    onClick={handleNext}
                    disabled={!currentStepValid}
                    className="rounded-2xl px-8 py-2.5 shadow-lg shadow-orange-500/20"
                    title={
                      !currentStepValid
                        ? "Complete required fields to continue"
                        : "Next step"
                    }
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    disabled={!canPublish}
                    onClick={() => {
                      if (!canPublish) return;
                      setDraft((d) => ({ ...d, status: "Ready" }));
                      setToast(
                        "Success! Your live session was submitted for approval.",
                      );
                      
                    }}
                    className="rounded-2xl px-8 py-2.5 shadow-lg shadow-orange-500/20"
                    title={
                      !canPublish
                        ? "Complete preflight to submit for approval"
                        : "Submit for approval"
                    }
                  >
                    Submit for Approval <Zap className="h-4 w-4" />
                  </PrimaryButton>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-5 space-y-4">
          <PromoLinkPreviewPhone
            draft={draft}
            host={host}
            supplier={supplier}
          />

          <PreflightCard
            setupOk={setupOk}
            promoOk={promoOk}
            itemsOk={itemsOk}
            creativesOk={creativesOk}
            streamOk={streamOk}
            scheduleOk={scheduleOk}
            crewOk={crewOk}
            complianceOk={complianceOk}
          />

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 transition-colors">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">
              Quick actions
            </div>
            <div className="grid gap-2">
              <SoftButton onClick={() => openAssetLibraryPicker()}>
                <Layers className="h-4 w-4" /> Asset Library
              </SoftButton>
              <SoftButton
                onClick={() => {
                  setStep("show");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  showSuccess("Opened Live Plan.");
                }}
                title="Templates & brand kit"
              >
                <Wand2 className="h-4 w-4" /> Templates & scripts
              </SoftButton>
              <SoftButton
                onClick={() => safeNav(ROUTES.linkTools)}
                title="Tracking & Integrations"
              >
                <LinkIcon className="h-4 w-4" /> Tracking & integrations
              </SoftButton>
              <SoftButton onClick={copyPromoLink} title="Copy promo link">
                <Share2 className="h-4 w-4" /> Share preview
              </SoftButton>
            </div>
          </div>
        </div>
      </div>
      {/* Modals / drawers */}
      <CatalogPicker
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        campaignId={draft.campaignId}
        catalog={catalogSeed}
        selectedIds={catalogSelected}
        onToggle={(id) =>
          setCatalogSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }
        onApply={addCatalogSelected}
      />

      <PollBuilderDrawer
        open={pollDrawerOpen}
        onClose={() => {
          setPollDrawerOpen(false);
          setEditingPollId(null);
        }}
        segments={draft.runOfShow}
        poll={editingPoll}
        onSave={(nextPoll) => {
          setDraft((d) => {
            const existingIndex = d.livePlanPolls.findIndex((item) => item.id === nextPoll.id);
            if (existingIndex >= 0) {
              const nextPolls = [...d.livePlanPolls];
              nextPolls[existingIndex] = nextPoll;
              return { ...d, livePlanPolls: nextPolls };
            }
            return { ...d, livePlanPolls: [...d.livePlanPolls, nextPoll] };
          });
        }}
      />

      <Drawer
        open={livePlanSummaryOpen}
        onClose={() => setLivePlanSummaryOpen(false)}
        title="Live Plan Summary"
        subtitle="Clean numbered summary mirrored into the Live Studio handoff payload."
        width="w-full"
        zIndex={118}
      >
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Session timing</div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">This same summary is persisted so Live Studio can show it to the host or co-host.</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill text={`Session ${formatMinutesLabel(livePlanSummaryData.sessionDurationMin)}`} />
                <Pill text={`Allocated ${formatMinutesLabel(livePlanSummaryData.allocatedMin)}`} tone="neutral" icon={<TimerIcon />} />
                <Pill
                  text={livePlanSummaryData.overflowMin > 0 ? `Overflow ${formatMinutesLabel(livePlanSummaryData.overflowMin)}` : `Remaining ${formatMinutesLabel(livePlanSummaryData.remainingMin)}`}
                  tone={livePlanSummaryData.overflowMin > 0 ? "danger" : livePlanSummaryData.remainingMin <= 5 ? "warn" : "good"}
                  icon={<Info className="h-3.5 w-3.5" />}
                />
              </div>
            </div>
          </div>

          {livePlanSummaryData.introNote ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Live-wide teleprompter note</div>
              <div className="mt-2 text-[12px] leading-6 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{livePlanSummaryData.introNote}</div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Numbered segments</div>
            <div className="mt-3 space-y-3">
              {livePlanSummaryData.segments.map((segment) => (
                <div key={segment.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{segment.number}. {segment.title}</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{segment.timecode} • {segment.durationLabel}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {segment.type === "Flash Sale" ? <Pill text="Flash Sale" tone="warn" icon={<Zap className="h-3.5 w-3.5" />} /> : null}
                      {segment.linkedPolls.length ? <Pill text={`${segment.linkedPolls.length} poll${segment.linkedPolls.length === 1 ? "" : "s"}`} tone="warn" icon={<BarChart3 className="h-3.5 w-3.5" />} /> : null}
                      {segment.attachedGiveaways.length ? <Pill text={`${segment.attachedGiveaways.length} giveaway${segment.attachedGiveaways.length === 1 ? "" : "s"}`} tone="good" icon={<Gift className="h-3.5 w-3.5" />} /> : <Pill text="No giveaway" />}
                    </div>
                  </div>
                  {segment.notes ? <div className="mt-2 text-[12px] text-slate-700 dark:text-slate-300">Segment note: {segment.notes}</div> : null}
                  {segment.teleprompterNote ? <div className="mt-2 text-[12px] text-slate-700 dark:text-slate-300">Teleprompter note: {segment.teleprompterNote}</div> : null}
                  <div className="mt-2 text-[12px] text-slate-700 dark:text-slate-300">
                    Giveaway attached: {segment.attachedGiveaways.length ? segment.attachedGiveaways.map((giveaway) => `${giveaway.title} (Qty ${giveaway.quantity})`).join(", ") : "None"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
            <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">Polls</div>
            <div className="mt-3 space-y-3">
              {livePlanSummaryData.polls.length ? livePlanSummaryData.polls.map((poll) => {
                const linkedSegment = livePlanSegments.find((segment) => segment.id === poll.linkedSegmentId);
                return (
                  <div key={poll.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 transition-colors">
                    <div className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">{poll.question}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {poll.launchMode === "linked" && linkedSegment ? `Linked to ${linkedSegment.displayNumber} ${linkedSegment.title}` : "Manual launch"} • {formatSecondsLabel(poll.durationSec)} • {poll.showLiveResults ? "Live results ON" : "Live results OFF"} • {poll.allowReopen ? "Reopen ON" : "Reopen OFF"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ensureLivePlanPollOptions(poll.options).map((option, index) => (
                        <div key={option.id} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors">
                          {index + 1}. {option.text || `Option ${index + 1}`}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 text-[12px] text-slate-500 dark:text-slate-400 transition-colors">
                  No polls configured yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Mobile preview drawer */}
      <ConfirmSegmentDeleteModal
        open={!!deleteSegmentTarget}
        segment={deleteSegmentTarget}
        source={deleteSegmentContext?.source || "plan"}
        linkedPollCount={deleteSegmentTarget?.linkedPolls.length || 0}
        attachedGiveawayCount={(deleteSegmentTarget?.linkedGiveawayIds || []).length}
        onCancel={() => setDeleteSegmentContext(null)}
        onConfirm={confirmDeleteSegment}
        isPending={deleteSegmentPending}
      />

      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Promo link preview"
        subtitle="This mirrors the buyer-facing link page. Updates live as you edit."
        width="max-w-[520px]"
      >
        <PromoLinkPreviewPhone
          draft={draft}
          host={host || undefined}
          supplier={supplier || undefined}
        />
      </Drawer>

      <AnimatePresence>
        {showSharePanel && (
          <SharePanel
            open={showSharePanel}
            onClose={() => setShowSharePanel(false)}
            link={
              draft.publicJoinUrl || "https://mylivedealz.com/live/amina-glow"
            }
            onCopy={(l: string, m: string) => showToast(m)}
          />
        )}
      </AnimatePresence>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

function TimerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0 transition-colors"
    >
      <path
        fill="currentColor"
        d="M15 1H9v2h6V1Zm-4 13h2V8h-2v6Zm9.03-7.39 1.42-1.42-1.41-1.41-1.42 1.41A9.96 9.96 0 0 0 12 2a10 10 0 1 0 10 10c0-2.36-.82-4.53-2.19-6.39ZM12 20a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z"
      />
    </svg>
  );
}

/* ------------------------------- Drawer wrapper ------------------------------ */

export function LiveBuilderDrawer({
  open,
  onClose,
  sessionId,
  dealId,
  zIndex,
}: {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
  dealId?: string;
  zIndex?: number;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      zIndex={zIndex}
      title="Live Builder"
      subtitle="Create premium Live Sessionz with promo link preview, run-of-show, assets, pins, and simulcast."
      width="w-full"
    >
      <LiveBuilderView
        initialSessionId={sessionId}
        prefillDealId={dealId}
        _onRequestClose={onClose}
      />
      <div className="mt-4 flex items-center justify-end gap-2">
        <SoftButton
          onClick={() => {
            const params = new URLSearchParams();
            if (sessionId) params.set("sessionId", sessionId);
            if (dealId) params.set("dealId", dealId);
            const qs = params.toString();
            safeNav(qs ? `${ROUTES.liveBuilder}?${qs}` : ROUTES.liveBuilder);
          }}
          title="Open as full page"
        >
          Open full page <ExternalLink className="h-4 w-4" />
        </SoftButton>
      </div>
    </Drawer>
  );
}

/* --------------------------------- Page route -------------------------------- */

export default function LiveBuilderPage() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [dealId, setDealId] = useState<string | undefined>(undefined);

  /** ------------------------------ Share Panel ------------------------------ */

  function SharePanel({
    open,
    onClose,
    link,
    onCopy,
  }: {
    open: boolean;
    onClose: () => void;
    link: string;
    onCopy: (text: string, msg: string) => void;
  }) {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[100] grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900 transition-colors"
        >
          <button
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-3xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              Success!
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Your session is now live and{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Visible to Followers
              </span>
              .
            </p>
          </div>

          <div className="mt-8 space-y-6 text-left">
            {/* Link Section */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Share Link
              </label>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800 transition-colors">
                <div className="min-w-0 flex-1 truncate px-2 text-sm text-slate-600 dark:text-slate-300">
                  {link}
                </div>
                <button
                  onClick={() => onCopy(link, "Copied share link!")}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                QR Code Entry
              </label>
              <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-slate-100 p-4 dark:border-slate-800 transition-colors">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 transition-colors">
                  <QrCode className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Download for physical signage
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Print it on flyers, packaging, or store displays.
                  </div>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-pink-500/20 hover:scale-110 transition-transform">
                <Instagram className="h-6 w-6" />
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00f2ea] text-black shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M12.525.023c1.723 0 3.36.434 4.8 1.202.14.075.244.204.288.358.044.154.02.32-.066.453l-.934 1.455c-.07.11-.186.186-.316.21-.131.024-.265-.008-.373-.088-.845-.626-1.85-1.01-2.935-1.04-.376-.01-.75.02-1.12.086-.78.14-1.503.49-2.097 1.012-.66.582-1.11 1.344-1.294 2.196-.2 1.1-.06 2.22.4 3.23.16.354.364.685.61 1 .094.12.115.285.056.425-.06.14-.194.24-.347.26-.583.074-1.15.113-1.724.113H1.38c-.16 0-.315-.078-.415-.213-.1-.135-.13-.306-.082-.468l.942-3.13c.27-.89.702-1.72 1.272-2.454.59-.76 1.32-1.39 2.13-1.84a6.7 6.7 0 012.87-.936c.553-.06 1.113-.09 1.67-.09zm.41 12.01c.795 0 1.57.17 2.28.49 1.07.484 1.94 1.293 2.5 2.304.57 1.014.832 2.186.74 3.344-.1 1.246-.62 2.403-1.484 3.29-.838.86-1.954 1.442-3.168 1.65-.67.115-1.35.15-2.04.11a7.7 7.7 0 01-3.37-.96 1.15 1.15 0 01-.15-.17l-.87-1.42c-.08-.13-.1-.28-.06-.43.04-.15.14-.27.27-.34.78-.43 1.68-.68 2.61-.73.49-.03.985.013 1.474.12.607.132 1.173.42 1.63.834.428.384.75 1.04.82 2.016.035.485.035.97 0 1.455-.008.114-.06.22-.146.29a.434.434 0 01-.31.12h-9.92c-.184 0-.356-.1-.444-.26a.48.48 0 01-.05-.44l.805-2.73a4.9 4.9 0 01.99-1.82 5.8 5.8 0 011.833-1.45 6.9 6.9 0 012.783-.824c.73-.06 1.46-.08 2.19-.06z" />
                </svg>
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-green-500/20 hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  useEffect(() => {
    const sp = parseSearch();
    const sid = sp.get("sessionId") || undefined;
    const did = sp.get("dealId") || undefined;
    setSessionId(sid);
    setDealId(did);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <LiveBuilderView initialSessionId={sessionId} prefillDealId={dealId} />
      </div>
    </div>
  );
}

/** ------------------------------ Share Panel ------------------------------ */

function SharePanel({
  open,
  onClose,
  link,
  onCopy,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  onCopy: (text: string, msg: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 text-left">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900 transition-colors"
      >
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-3xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            Success!
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your content is now live and{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              Visible to Followers
            </span>
            .
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Share Link
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800 transition-colors">
              <div className="min-w-0 flex-1 truncate px-2 text-sm text-slate-600 dark:text-slate-300">
                {link}
              </div>
              <button
                onClick={() => onCopy(link, "Copied share link!")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* QR Code Placeholder */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              QR Code Entry
            </label>
            <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-slate-100 p-4 dark:border-slate-800 transition-colors">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 transition-colors">
                <QrCode className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Download for physical signage
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Print it on flyers, packaging, or store displays.
                </div>
              </div>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center justify-center gap-6 pt-2">
            <button
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-pink-500/20 hover:scale-110 transition-transform"
              aria-label="Share on Instagram"
            >
              <Instagram className="h-6 w-6" />
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00f2ea] text-black shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform"
              aria-label="Share on TikTok"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                <path d="M12.525.023c1.723 0 3.36.434 4.8 1.202.14.075.244.204.288.358.044.154.02.32-.066.453l-.934 1.455c-.07.11-.186.186-.316.21-.131.024-.265-.008-.373-.088-.845-.626-1.85-1.01-2.935-1.04-.376-.01-.75.02-1.12.086-.78.14-1.503.49-2.097 1.012-.66.582-1.11 1.344-1.294 2.196-.2 1.1-.06 2.22.4 3.23.16.354.364.685.61 1 .094.12.115.285.056.425-.06.14-.194.24-.347.26-.583.074-1.15.113-1.724.113H1.38c-.16 0-.315-.078-.415-.213-.1-.135-.13-.306-.082-.468l.942-3.13c.27-.89.702-1.72 1.272-2.454.59-.76 1.32-1.39 2.13-1.84a6.7 6.7 0 012.87-.936c.553-.06 1.113-.09 1.67-.09zm.41 12.01c.795 0 1.57.17 2.28.49 1.07.484 1.94 1.293 2.5 2.304.57 1.014.832 2.186.74 3.344-.1 1.246-.62 2.403-1.484 3.29-.838.86-1.954 1.442-3.168 1.65-.67.115-1.35.15-2.04.11a7.7 7.7 0 01-3.37-.96 1.15 1.15 0 01-.15-.17l-.87-1.42c-.08-.13-.1-.28-.06-.43.04-.15.14-.27.27-.34.78-.43 1.68-.68 2.61-.73.49-.03.985.013 1.474.12.607.132 1.173.42 1.63.834.428.384.75 1.04.82 2.016.035.485.035.97 0 1.455-.008.114-.06.22-.146.29a.434.434 0 01-.31.12h-9.92c-.184 0-.356-.1-.444-.26a.48.48 0 01-.05-.44l.805-2.73a4.9 4.9 0 01.99-1.82 5.8 5.8 0 011.833-1.45 6.9 6.9 0 012.783-.824c.73-.06 1.46-.08 2.19-.06z" />
              </svg>
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-green-500/20 hover:scale-110 transition-transform"
              aria-label="Share on WhatsApp"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
