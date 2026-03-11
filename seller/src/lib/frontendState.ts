import { useEffect, useState, type SetStateAction } from "react";

type SellerPageContentPayload = Record<string, Record<string, unknown>>;

type BootstrapPayload = {
  app: string;
  modules: Record<string, unknown>;
  pageContent?: SellerPageContentPayload;
  storage: {
    local: Record<string, string>;
    session: Record<string, string>;
  };
};

type StorageType = "local" | "session";

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
  "";

const moduleCache = new Map<string, unknown>();
const pageContentCache = new Map<string, unknown>();
const storageCache = {
  local: new Map<string, string>(),
  session: new Map<string, string>(),
};

let bootstrapPromise: Promise<BootstrapPayload> | null = null;
let storageSyncInitialized = false;
let persistModulesTimer: number | null = null;
let persistStorageTimer: number | null = null;
const pendingModules = new Map<string, unknown>();
const pendingStorage = {
  local: new Map<string, string | null>(),
  session: new Map<string, string | null>(),
};

const pageCacheKey = (pageKey: string, role: string) => `${pageKey}::${role}`;

const toUrl = (path: string) => `${API_BASE_URL}${path}`;

export async function sellerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(toUrl(path), { ...init, headers });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || `Request failed with status ${response.status}`);
  }
  return payload as T;
}

function primePageContent(payload: SellerPageContentPayload | undefined) {
  for (const [pageKey, roles] of Object.entries(payload || {})) {
    for (const [role, value] of Object.entries(roles || {})) {
      pageContentCache.set(pageCacheKey(pageKey, role), value);
    }
  }
}

function primeStorage(snapshot: BootstrapPayload["storage"] | undefined) {
  for (const [key, value] of Object.entries(snapshot?.local || {})) {
    storageCache.local.set(key, value);
  }
  for (const [key, value] of Object.entries(snapshot?.session || {})) {
    storageCache.session.set(key, value);
  }
}

async function saveModules() {
  const entries = Array.from(pendingModules.entries());
  pendingModules.clear();

  await Promise.all(
    entries.map(([key, payload]) =>
      sellerRequest(`/api/sellerfront/module`, {
        method: "PUT",
        body: JSON.stringify({ key, payload }),
      }).catch(() => undefined)
    )
  );
}

function scheduleModulePersist(key: string, value: unknown) {
  pendingModules.set(key, value);
  if (persistModulesTimer) window.clearTimeout(persistModulesTimer);
  persistModulesTimer = window.setTimeout(() => {
    persistModulesTimer = null;
    void saveModules();
  }, 120);
}

async function saveStorage() {
  const localEntries = Object.fromEntries(pendingStorage.local.entries());
  const sessionEntries = Object.fromEntries(pendingStorage.session.entries());
  pendingStorage.local.clear();
  pendingStorage.session.clear();

  if (Object.keys(localEntries).length) {
    await sellerRequest(`/api/sellerfront/storage`, {
      method: "PUT",
      body: JSON.stringify({ type: "local", entries: localEntries }),
    }).catch(() => undefined);
  }

  if (Object.keys(sessionEntries).length) {
    await sellerRequest(`/api/sellerfront/storage`, {
      method: "PUT",
      body: JSON.stringify({ type: "session", entries: sessionEntries }),
    }).catch(() => undefined);
  }
}

function scheduleStoragePersist(storageType: StorageType, key: string, value: string | null) {
  pendingStorage[storageType].set(key, value);
  if (persistStorageTimer) window.clearTimeout(persistStorageTimer);
  persistStorageTimer = window.setTimeout(() => {
    persistStorageTimer = null;
    void saveStorage();
  }, 120);
}

export async function bootstrapSellerFrontendState() {
  if (!bootstrapPromise) {
    bootstrapPromise = sellerRequest<BootstrapPayload>(`/api/sellerfront/bootstrap`).then((payload) => {
      for (const [key, value] of Object.entries(payload.modules || {})) {
        moduleCache.set(key, value);
      }
      primePageContent(payload.pageContent);
      primeStorage(payload.storage);
      return payload;
    });
  }

  return bootstrapPromise;
}

export function readSellerModule<T>(key: string, fallback: T): T {
  if (moduleCache.has(key)) {
    return moduleCache.get(key) as T;
  }
  moduleCache.set(key, fallback);
  return fallback;
}

export async function writeSellerModule<T>(key: string, value: T) {
  moduleCache.set(key, value);
  scheduleModulePersist(key, value);
  return value;
}

export function readSellerPageContent<T>(pageKey: string, role: string, fallback: T): T {
  const cacheKey = pageCacheKey(pageKey, role);
  if (pageContentCache.has(cacheKey)) {
    return pageContentCache.get(cacheKey) as T;
  }
  return fallback;
}

export async function fetchSellerPageContent<T>(pageKey: string, role: string, fallback: T): Promise<T> {
  try {
    await bootstrapSellerFrontendState();
  } catch {
    // fall through to direct request
  }
  const cacheKey = pageCacheKey(pageKey, role);
  if (pageContentCache.has(cacheKey)) {
    return pageContentCache.get(cacheKey) as T;
  }

  const payload = await sellerRequest<T | null>(
    `/api/sellerfront/page-content?pageKey=${encodeURIComponent(pageKey)}&role=${encodeURIComponent(role)}`
  ).catch(() => null);

  if (payload === null || payload === undefined) {
    return fallback;
  }
  pageContentCache.set(cacheKey, payload);
  return payload;
}

export async function writeSellerPageContent<T>(pageKey: string, role: string, payload: T) {
  pageContentCache.set(pageCacheKey(pageKey, role), payload);
  await sellerRequest(`/api/sellerfront/page-content`, {
    method: "PUT",
    body: JSON.stringify({ pageKey, role, payload }),
  }).catch(() => undefined);
  return payload;
}

export function useSellerCompatState<T>(key: string, seed: T) {
  const [state, setState] = useState<T>(() => (moduleCache.has(key) ? (moduleCache.get(key) as T) : seed));

  useEffect(() => {
    let active = true;
    void bootstrapSellerFrontendState()
      .then((payload) => {
        const existing = payload.modules?.[key];
        if (existing === undefined) {
          moduleCache.set(key, seed);
          scheduleModulePersist(key, seed);
          if (active) setState(seed);
          return;
        }
        moduleCache.set(key, existing);
        if (active) setState(existing as T);
      })
      .catch(async () => {
        try {
          const payload = await sellerRequest<T | null>(`/api/sellerfront/module?key=${encodeURIComponent(key)}`);
          if (payload === null || payload === undefined) {
            moduleCache.set(key, seed);
            if (active) setState(seed);
            return;
          }
          moduleCache.set(key, payload);
          if (active) setState(payload);
        } catch {
          moduleCache.set(key, seed);
          if (active) setState(seed);
        }
      });

    return () => {
      active = false;
    };
  }, [key, seed]);

  const setPersist = (nextValue: SetStateAction<T>) => {
    setState((prev) => {
      const next = typeof nextValue === "function" ? (nextValue as (value: T) => T)(prev) : nextValue;
      moduleCache.set(key, next);
      scheduleModulePersist(key, next);
      return next;
    });
  };

  return [state, setPersist] as const;
}

export function useSellerCompatValue<T>(key: string, seed: T) {
  const [value] = useSellerCompatState<T>(key, seed);
  return value;
}

export function initSellerStorageSync(options: { localPrefixes?: string[]; sessionPrefixes?: string[] }) {
  if (typeof window === "undefined" || storageSyncInitialized) return;
  storageSyncInitialized = true;
  const localPrefixes = options.localPrefixes || [];
  const sessionPrefixes = options.sessionPrefixes || [];

  const originalGetItem = Storage.prototype.getItem;
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  const matches = (storageType: StorageType, key: string) => {
    const prefixes = storageType === "local" ? localPrefixes : sessionPrefixes;
    return prefixes.some((prefix) => key.startsWith(prefix));
  };

  const cacheFor = (storageType: StorageType) =>
    storageType === "local" ? storageCache.local : storageCache.session;

  Storage.prototype.getItem = function patchedGetItem(key: string) {
    if (this === window.localStorage && matches("local", key)) {
      return cacheFor("local").get(key) ?? null;
    }
    if (this === window.sessionStorage && matches("session", key)) {
      return cacheFor("session").get(key) ?? null;
    }
    return originalGetItem.call(this, key);
  };

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    if (this === window.localStorage && matches("local", key)) {
      cacheFor("local").set(key, value);
      scheduleStoragePersist("local", key, value);
      return;
    }
    if (this === window.sessionStorage && matches("session", key)) {
      cacheFor("session").set(key, value);
      scheduleStoragePersist("session", key, value);
      return;
    }
    originalSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    if (this === window.localStorage && matches("local", key)) {
      cacheFor("local").delete(key);
      scheduleStoragePersist("local", key, null);
      return;
    }
    if (this === window.sessionStorage && matches("session", key)) {
      cacheFor("session").delete(key);
      scheduleStoragePersist("session", key, null);
      return;
    }
    originalRemoveItem.call(this, key);
  };

  void bootstrapSellerFrontendState();
}
