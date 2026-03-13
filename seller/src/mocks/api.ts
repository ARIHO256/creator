import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";
import type { MockCart, MockOrder } from "./types";
import { loadDb, saveDb, updateDb } from "./db";
import { makeId } from "./id";

const parseFailRate = () => {
  if (typeof window === "undefined") return 0;
  const params = new URLSearchParams(window.location.search);
  if (params.get("fail") === "1") return 1;
  const envRate = Number(import.meta.env.VITE_MOCK_FAIL_RATE ?? 0);
  return Number.isFinite(envRate) ? envRate : 0;
};

export const mockDelay = async (ms?: number) => {
  const delay = typeof ms === "number" ? ms : Number(import.meta.env.VITE_MOCK_DELAY_MS ?? 260);
  return new Promise((resolve) => setTimeout(resolve, delay));
};

const maybeFail = () => {
  const rate = parseFailRate();
  if (rate <= 0) return;
  if (Math.random() < rate) {
    throw new Error("Mock network error");
  }
};

const normalizeId = (value: string) => value.trim().toLowerCase();

export const mockAuth = {
  async signIn({ identifier, password, role }: { identifier: string; password: string; role: UserRole }) {
    await mockDelay();
    maybeFail();
    const db = loadDb();
    const id = normalizeId(identifier);
    const user = db.users.find((u) =>
      [u.email, u.phone, u.id].filter(Boolean).map((x) => String(x).toLowerCase()).includes(id)
    );
    if (!user) {
      throw new Error("User not found");
    }
    // Demo mode: accept any password for existing users.
    const token = makeId("sess");
    const session: Session = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: role || user.role,
      roles: [user.role],
      token,
    };
    updateDb((current) => ({
      ...current,
      sessions: [
        { token, userId: user.id, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() },
        ...current.sessions.filter((s) => s.userId !== user.id),
      ],
    }));
    return session;
  },

  async signUp({ name, email, phone, password, role }: { name: string; email: string; phone?: string; password?: string; role: UserRole }) {
    await mockDelay();
    maybeFail();
    const db = loadDb();
    const exists = db.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("Email already in use");
    const id = makeId("user");
    const user = {
      id,
      role,
      name,
      email,
      phone,
      password,
      createdAt: new Date().toISOString(),
      preferences: { locale: "en", currency: "USD" },
      addresses: [],
    };
    const token = makeId("sess");
    const session: Session = {
      userId: id,
      email,
      phone,
      name,
      role,
      roles: [role],
      token,
    };
    saveDb({
      ...db,
      users: [user, ...db.users],
      sessions: [
        { token, userId: id, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() },
        ...db.sessions,
      ],
    });
    return session;
  },

  async signOut(token?: string) {
    await mockDelay(120);
    const db = loadDb();
    if (!token) return;
    saveDb({
      ...db,
      sessions: db.sessions.filter((s) => s.token !== token),
    });
  },

  async resetPassword(identifier: string) {
    await mockDelay(220);
    maybeFail();
    const db = loadDb();
    const id = normalizeId(identifier);
    const user = db.users.find((u) => [u.email, u.phone].filter(Boolean).map((x) => String(x).toLowerCase()).includes(id));
    if (!user) throw new Error("Account not found");
    return { ok: true };
  },
};

export const mockListings = {
  async list({ query }: { query?: string }) {
    await mockDelay();
    const db = loadDb();
    const q = query?.trim().toLowerCase();
    if (!q) return db.listings;
    return db.listings.filter((l) =>
      `${l.title} ${l.category} ${l.marketplace}`.toLowerCase().includes(q)
    );
  },

  async toggleFavorite(listingId: string) {
    await mockDelay(120);
    return updateDb((db) => {
      const exists = db.favorites.listingIds.includes(listingId);
      return {
        ...db,
        favorites: {
          ...db.favorites,
          listingIds: exists
            ? db.favorites.listingIds.filter((id) => id !== listingId)
            : [...db.favorites.listingIds, listingId],
        },
      };
    });
  },
};

export const mockCart = {
  async getCart() {
    await mockDelay(120);
    return loadDb().cart;
  },

  async addItem(listingId: string, qty = 1) {
    await mockDelay(150);
    return updateDb((db) => {
      const existing = db.cart.items.find((i) => i.listingId === listingId);
      const items = existing
        ? db.cart.items.map((i) => (i.listingId === listingId ? { ...i, qty: i.qty + qty } : i))
        : [...db.cart.items, { listingId, qty }];
      const cart: MockCart = { ...db.cart, items, updatedAt: new Date().toISOString() };
      return { ...db, cart };
    }).cart;
  },

  async updateQty(listingId: string, qty: number) {
    await mockDelay(150);
    return updateDb((db) => {
      const items = db.cart.items
        .map((i) => (i.listingId === listingId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0);
      const cart: MockCart = { ...db.cart, items, updatedAt: new Date().toISOString() };
      return { ...db, cart };
    }).cart;
  },

  async removeItem(listingId: string) {
    await mockDelay(120);
    return updateDb((db) => {
      const items = db.cart.items.filter((i) => i.listingId !== listingId);
      const cart: MockCart = { ...db.cart, items, updatedAt: new Date().toISOString() };
      return { ...db, cart };
    }).cart;
  },

  async checkout() {
    await mockDelay(320);
    return updateDb((db) => {
      const newOrder: MockOrder = {
        id: makeId("ORD"),
        customer: "Buyer",
        channel: "EVzone",
        items: db.cart.items.reduce((sum, i) => sum + i.qty, 0),
        total: db.cart.items.reduce((sum, i) => {
          const listing = db.listings.find((l) => l.id === i.listingId);
          return sum + (listing?.retailPrice || 0) * i.qty;
        }, 0),
        currency: "USD",
        status: "New",
        warehouse: "Main Warehouse",
        updatedAt: new Date().toISOString(),
        slaDueAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
        buyerId: db.cart.userId,
      };
      return {
        ...db,
        orders: [newOrder, ...db.orders],
        cart: { ...db.cart, items: [], updatedAt: new Date().toISOString() },
      };
    }).orders[0];
  },
};

export const mockOrders = {
  async list() {
    await mockDelay(160);
    return loadDb().orders;
  },

  async updateStatus(orderId: string, status: string) {
    await mockDelay(180);
    return updateDb((db) => {
      const orders = db.orders.map((o) =>
        o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
      );
      return { ...db, orders };
    });
  },
};
