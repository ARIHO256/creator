import type { AdBuilderCampaignRecord, AdzPerformanceRecord, LiveBuilderSessionRecord } from "../api/types";

function normalizeStatus(value: string | undefined): string {
  return String(value || "draft").trim().toLowerCase();
}

export function liveStatusLabel(value: string | undefined): string {
  const status = normalizeStatus(value);
  if (status === "ready") return "Ready";
  if (status === "scheduled") return "Scheduled";
  if (status === "live") return "Live";
  if (status === "ended") return "Ended";
  return "Draft";
}

export function adStatusLabel(value: string | undefined): string {
  const status = normalizeStatus(value).replace(/_/g, " ");
  if (status === "pending approval") return "Pending approval";
  if (status === "scheduled") return "Scheduled";
  if (status === "live") return "Live";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  if (status === "ended") return "Ended";
  if (status === "rejected") return "Rejected";
  if (status === "archived") return "Archived";
  if (status === "generated") return "Generated";
  return "Draft";
}

export function statusTone(value: string | undefined): "neutral" | "good" | "warn" | "bad" {
  const status = normalizeStatus(value);
  if (status === "live" || status === "approved") return "good";
  if (status === "pending_approval" || status === "scheduled" || status === "ready" || status === "paused") return "warn";
  if (status === "ended" || status === "rejected" || status === "completed" || status === "archived") return "bad";
  return "neutral";
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

export function formatCurrency(currency: string | undefined, amount: number | undefined): string {
  const value = Number(amount || 0);
  const code = String(currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `${code} ${Math.round(value).toLocaleString()}`;
  }
}

export function getLiveDraft(session: LiveBuilderSessionRecord | undefined): Record<string, unknown> {
  const draft = session?.builderState?.draft;
  return draft && typeof draft === "object" ? draft : {};
}

export function getLivePlatforms(session: LiveBuilderSessionRecord | undefined): string[] {
  if (Array.isArray(session?.simulcast) && session?.simulcast.length) {
    return session.simulcast.map((entry) => String(entry));
  }
  const draft = getLiveDraft(session);
  const platforms = draft.platforms;
  return Array.isArray(platforms) ? platforms.map((entry) => String(entry)) : [];
}

export function getLiveHeroImage(session: LiveBuilderSessionRecord | undefined): string {
  const draft = getLiveDraft(session);
  return String(session?.heroImageUrl || draft.heroImageUrl || "");
}

export function getLiveHeroVideo(session: LiveBuilderSessionRecord | undefined): string {
  const draft = getLiveDraft(session);
  return String(session?.heroVideoUrl || draft.heroVideoUrl || "");
}

export function getLiveProducts(session: LiveBuilderSessionRecord | undefined): Array<Record<string, unknown>> {
  const draft = getLiveDraft(session);
  const products = draft.products;
  return Array.isArray(products) ? products.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

export function getCampaignPerformance(campaign: AdBuilderCampaignRecord | undefined): AdzPerformanceRecord {
  const perf = campaign?.performance;
  if (perf && typeof perf === "object") {
    return {
      period: typeof perf.period === "string" ? perf.period : "7d",
      clicks: Number(perf.clicks || 0),
      purchases: Number(perf.purchases || 0),
      conversionPct: Number(perf.conversionPct || 0),
      earnings: Number(perf.earnings || 0),
      byPlatform: Array.isArray(perf.byPlatform)
        ? perf.byPlatform.map((entry) => ({
            platform: String((entry as Record<string, unknown>).platform || "Other"),
            clicks: Number((entry as Record<string, unknown>).clicks || 0),
            purchases: Number((entry as Record<string, unknown>).purchases || 0)
          }))
        : []
    };
  }
  return {
    period: "7d",
    clicks: 0,
    purchases: 0,
    conversionPct: 0,
    earnings: 0,
    byPlatform: []
  };
}

export function getCampaignCurrency(campaign: AdBuilderCampaignRecord | undefined): string {
  return String(campaign?.compensation?.currency || "USD");
}

export function getCampaignOffers(campaign: AdBuilderCampaignRecord | undefined): Array<Record<string, unknown>> {
  return Array.isArray(campaign?.offers)
    ? campaign.offers.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}
