import type { ProposalMessage, ProposalRecord, SellerRecord } from "../api/types";

export type NormalizedProposalStatus =
  | "draft"
  | "sent_to_brand"
  | "in_negotiation"
  | "accepted"
  | "declined"
  | "contract_created"
  | "archived";

export type NormalizedProposalOrigin = "seller" | "creator";
export type NormalizedSellerRelationship = "active" | "past" | "none";

export function normalizeProposalStatus(value: string | null | undefined): NormalizedProposalStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  switch (normalized) {
    case "new":
    case "new_draft":
    case "new/draft":
      return "draft";
    case "sent":
    case "sent_to_seller":
    case "sent_to_brand":
      return "sent_to_brand";
    case "negotiating":
    case "in_negotiation":
    case "in_discussion":
      return "in_negotiation";
    case "won":
      return "accepted";
    case "accepted":
      return "accepted";
    case "declined":
    case "rejected":
      return "declined";
    case "contract":
    case "contract_created":
      return "contract_created";
    case "archived":
      return "archived";
    default:
      return "draft";
  }
}

export function normalizeProposalOrigin(value: string | null | undefined): NormalizedProposalOrigin {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  switch (normalized) {
    case "seller":
    case "from_seller":
    case "seller_invite":
      return "seller";
    case "creator":
    case "my_pitch":
    case "my_pitches":
    case "outbound":
      return "creator";
    default:
      return "creator";
  }
}

export function getProposalStatusLabel(status: string | null | undefined, origin?: string | null | undefined): string {
  const normalized = normalizeProposalStatus(status);
  if (normalized === "draft" && normalizeProposalOrigin(origin) === "seller") {
    return "New / draft";
  }

  switch (normalized) {
    case "draft":
      return "Draft";
    case "sent_to_brand":
      return "Sent to brand";
    case "in_negotiation":
      return "In negotiation";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "contract_created":
      return "Contract created";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

export function getProposalStatusBadgeClass(status: string | null | undefined): string {
  switch (normalizeProposalStatus(status)) {
    case "draft":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
    case "sent_to_brand":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
    case "in_negotiation":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800";
    case "accepted":
    case "contract_created":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
    case "declined":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800";
    case "archived":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
  }
}

export function getProposalOriginLabel(origin: string | null | undefined): string {
  return normalizeProposalOrigin(origin) === "seller" ? "From seller" : "My pitch";
}

export function getProposalOriginBadgeClass(origin: string | null | undefined): string {
  return normalizeProposalOrigin(origin) === "seller"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800"
    : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800";
}

export function canRespondToProposal(proposal: Pick<ProposalRecord, "status">): boolean {
  const status = normalizeProposalStatus(proposal.status);
  return !["accepted", "declined", "archived", "contract_created"].includes(status);
}

export function canOpenProposalRoom(proposal: Pick<ProposalRecord, "id"> | null | undefined): boolean {
  return Boolean(proposal?.id);
}

export function proposalRoomPath(proposalId: string | null | undefined): string {
  if (!proposalId) return "/proposal-room";
  return `/proposal-room?proposalId=${encodeURIComponent(proposalId)}`;
}

export function normalizeSellerRelationship(value: string | null | undefined): NormalizedSellerRelationship {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  switch (normalized) {
    case "active":
    case "current":
      return "active";
    case "past":
    case "completed":
      return "past";
    case "none":
    case "new":
    default:
      return "none";
  }
}

export function getSellerRelationshipLabel(value: string | null | undefined): string {
  switch (normalizeSellerRelationship(value)) {
    case "active":
      return "Active";
    case "past":
      return "Past";
    default:
      return "New";
  }
}

export function getSellerRelationshipBadgeClass(value: string | null | undefined): string {
  switch (normalizeSellerRelationship(value)) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
    case "past":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
  }
}

export function sellerSupportsDiscovery(seller: Pick<SellerRecord, "openToCollabs" | "inviteOnly">): boolean {
  return Boolean(seller.openToCollabs || seller.inviteOnly);
}

export function isMySeller(seller: Pick<SellerRecord, "relationship" | "isFollowing">): boolean {
  return normalizeSellerRelationship(seller.relationship) !== "none" || Boolean(seller.isFollowing);
}

export function formatMoney(value: number | null | undefined, currency = "USD"): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

export function formatCompactNumber(value: number | null | undefined): string {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(amount);
  } catch {
    return String(amount);
  }
}

export function formatProposalMessageTime(value: string | null | undefined): string {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function getLatestProposalMessage(proposal: Pick<ProposalRecord, "messages">): ProposalMessage | null {
  return proposal.messages.length ? proposal.messages[proposal.messages.length - 1] : null;
}
