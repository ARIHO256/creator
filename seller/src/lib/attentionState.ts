import { sellerBackendApi } from "./backendApi";

export const SELLER_ATTENTION_UPDATED_EVENT = "seller-attention-updated";

type AttentionMap = Record<string, string>;

export type SellerAttentionState = {
  openedOrders: AttentionMap;
  openedReviews: AttentionMap;
  updatedAt?: string;
};

export type SellerAttentionEntity = "order" | "review";

export type SellerAttentionUpdatedDetail = {
  entity: SellerAttentionEntity;
  id: string;
  openedAt: string;
};

const EMPTY_ATTENTION_STATE: SellerAttentionState = {
  openedOrders: {},
  openedReviews: {},
};

const SELLER_ATTENTION_UI_STATE_PATH = ["shell", "attentionState"] as const;

function normalizeAttentionMap(value: unknown): AttentionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<AttentionMap>((acc, [id, openedAt]) => {
    const normalizedId = String(id || "").trim();
    const normalizedOpenedAt = String(openedAt || "").trim();
    if (!normalizedId || !normalizedOpenedAt) {
      return acc;
    }
    acc[normalizedId] = normalizedOpenedAt;
    return acc;
  }, {});
}

export function normalizeSellerAttentionState(payload: unknown): SellerAttentionState {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return EMPTY_ATTENTION_STATE;
  }

  const record = payload as Record<string, unknown>;
  return {
    openedOrders: normalizeAttentionMap(record.openedOrders),
    openedReviews: normalizeAttentionMap(record.openedReviews),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}

function emitAttentionUpdated(detail: SellerAttentionUpdatedDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<SellerAttentionUpdatedDetail>(SELLER_ATTENTION_UPDATED_EVENT, { detail }));
}

async function markEntityOpened(entity: SellerAttentionEntity, id: string) {
  const normalizedId = String(id || "").trim();
  if (!normalizedId) {
    return;
  }

  const openedAt = new Date().toISOString();
  emitAttentionUpdated({ entity, id: normalizedId, openedAt });

  const key = entity === "order" ? "openedOrders" : "openedReviews";
  try {
    await sellerBackendApi.patchUiState({
      shell: {
        attentionState: {
          [key]: {
            [normalizedId]: openedAt,
          },
          updatedAt: openedAt,
        },
      },
    });
  } catch {
    // Keep the current view responsive even if persistence fails.
  }
}

export async function loadSellerAttentionState() {
  try {
    const payload = await sellerBackendApi.getUiState();
    const nested = SELLER_ATTENTION_UI_STATE_PATH.reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, payload);
    return normalizeSellerAttentionState(nested);
  } catch {
    return EMPTY_ATTENTION_STATE;
  }
}

export async function markSellerOrderOpened(orderId: string) {
  await markEntityOpened("order", orderId);
}

export async function markSellerReviewOpened(reviewId: string) {
  await markEntityOpened("review", reviewId);
}
