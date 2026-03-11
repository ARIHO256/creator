import { readSellerModule, writeSellerModule } from "./frontendState";

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

const readCart = () => readSellerModule<SellerCart>(CART_KEY, emptyCart());

export async function getSellerCart() {
  return readCart();
}

export async function addSellerCartItem(listingId: string, qty = 1) {
  const cart = readCart();
  const existing = cart.items.find((item) => item.listingId === listingId);
  const next: SellerCart = {
    ...cart,
    items: existing
      ? cart.items.map((item) =>
          item.listingId === listingId ? { ...item, qty: item.qty + qty } : item
        )
      : [...cart.items, { listingId, qty }],
    updatedAt: new Date().toISOString(),
  };
  await writeSellerModule(CART_KEY, next);
  return next;
}
