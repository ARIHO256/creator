import type { MockDB } from "./types";
import { readStorage, writeStorage, clearStorage } from "./storage";

const DB_EVENT = "mock-db-changed";
const DEFAULT_API_BASE = "http://localhost:3000/api";

let cached: MockDB | null = null;
let hydration: Promise<MockDB> | null = null;

const broadcast = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DB_EVENT));
};

const emptyDb = (): MockDB =>
  ({
    version: 1,
    seededAt: new Date().toISOString(),
    users: [],
    sessions: [],
    pageContent: {} as MockDB["pageContent"],
    listings: [],
    orders: [],
    cart: {
      id: "cart_empty",
      items: [],
      updatedAt: new Date().toISOString(),
    },
    favorites: {
      listingIds: [],
    },
    follows: {
      sellerIds: [],
    },
    messages: {} as MockDB["messages"],
    notifications: {} as MockDB["notifications"],
    modules: {},
  }) as MockDB;

const getApiBase = () => {
  const raw = String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).trim();
  return raw.replace(/\/+$/, "");
};

const isMockDb = (value: unknown): value is MockDB =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as MockDB).version === "number" &&
      Array.isArray((value as MockDB).users) &&
      typeof (value as MockDB).modules === "object"
  );

const normalizeDb = (value: unknown) => (isMockDb(value) ? value : emptyDb());

export const hydrateDb = async (force = false): Promise<MockDB> => {
  if (hydration && !force) {
    return hydration;
  }

  hydration = (async () => {
    if (force) {
      cached = null;
      clearStorage();
    }

    try {
      const response = await fetch(`${getApiBase()}/sellerfront/mock-db`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch seller mock DB: ${response.status}`);
      }
      const payload = normalizeDb(await response.json());
      saveDb(payload);
      return payload;
    } catch {
      return loadDb();
    } finally {
      hydration = null;
    }
  })();

  return hydration;
};

export const loadDb = (): MockDB => {
  if (cached) return cached;
  const stored = readStorage<MockDB | null>(null);
  cached = normalizeDb(stored);
  return cached;
};

export const saveDb = (db: MockDB) => {
  cached = db;
  writeStorage(db);
  broadcast();
};

export const updateDb = (fn: (current: MockDB) => MockDB) => {
  const db = loadDb();
  const next = fn(db);
  saveDb(next);
  return next;
};

export const resetDb = () => {
  clearStorage();
  cached = emptyDb();
  writeStorage(cached);
  broadcast();
  void hydrateDb(true);
  return cached;
};

export const clearDb = () => {
  cached = null;
  clearStorage();
  broadcast();
};

export const subscribeDb = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DB_EVENT, listener);
  return () => window.removeEventListener(DB_EVENT, listener);
};
