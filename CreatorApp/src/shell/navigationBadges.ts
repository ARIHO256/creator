import type { PageId } from "../layouts/CreatorShellLayout";

// Shared attention counts for navigation badges.
// Counts represent actionable/unread work items per module.
const NAV_BADGE_COUNTS: Partial<Record<PageId, number>> = {
  opportunities: 1,
  sellers: 1,
  "my-sellers": 1,
  invites: 2,
  "creator-campaigns": 3,
  proposals: 4,
  contracts: 1
};

export function getNavBadge(page: PageId): number | undefined {
  const count = NAV_BADGE_COUNTS[page];
  return count && count > 0 ? count : undefined;
}

