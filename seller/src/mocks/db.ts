import type { MockDB } from "./types";
import { readStorage, writeStorage, clearStorage } from "./storage";
import { seedMockDb } from "./seed";

const DB_EVENT = "mock-db-changed";

let cached: MockDB | null = null;

const broadcast = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DB_EVENT));
};

export const loadDb = (): MockDB => {
  if (cached) return cached;
  const seeded = seedMockDb();
  const stored = readStorage<MockDB | null>(null);
  if (!stored || typeof stored !== "object" || !stored.version) {
    cached = seeded;
    writeStorage(seeded);
    return cached;
  }
  cached = stored;
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
  const seeded = seedMockDb();
  cached = seeded;
  writeStorage(seeded);
  broadcast();
  return seeded;
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
