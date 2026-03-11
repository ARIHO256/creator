import { sellerBackendApi } from "./backendApi";

export type SellerCartItem = {
  listingId: string;
  qty: number;
};

export type SellerCart = {
  id: string;
  userId?: string;
  items: SellerCartItem[];
  updatedAt: string;
};

const CART_KEY = "commerce.cart";

const emptyCart = (): SellerCart => ({
  id: "cart_default",
  items: [],
  updatedAt: new Date().toISOString(),
});

export async function getSellerCart() {
  const payload = await sellerBackendApi.getSellerCart().catch(() => null);
  if (!payload) {
    return emptyCart();
  }
  const items = Array.isArray(payload.items)
    ? payload.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const listingId = typeof entry.listingId === "string" ? entry.listingId : "";
          if (!listingId) return null;
          const qty = Number.isFinite(entry.qty) ? Math.max(1, Math.floor(Number(entry.qty))) : 1;
          return { listingId, qty };
        })
        .filter(Boolean) as SellerCartItem[]
    : [];
  return {
    id: typeof payload.id === "string" ? payload.id : CART_KEY,
    items,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
  };
}

export async function addSellerCartItem(listingId: string, qty = 1) {
  const payload = await sellerBackendApi.addSellerCartItem({ listingId, qty }).catch(() => null);
  if (!payload) {
    return getSellerCart();
  }
  const items = Array.isArray(payload.items)
    ? payload.items
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const id = typeof entry.listingId === "string" ? entry.listingId : "";
          if (!id) return null;
          const count = Number.isFinite(entry.qty) ? Math.max(1, Math.floor(Number(entry.qty))) : 1;
          return { listingId: id, qty: count };
        })
        .filter(Boolean) as SellerCartItem[]
    : [];
  return {
    id: typeof payload.id === "string" ? payload.id : CART_KEY,
    items,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString(),
  };
}
