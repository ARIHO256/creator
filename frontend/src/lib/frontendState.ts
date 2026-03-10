import { useEffect, useState, type SetStateAction } from "react";

type BootstrapPayload = {
  app: string;
  modules: Record<string, unknown>;
  storage: {
    local: Record<string, string>;
    session: Record<string, string>;
  };
};

type StorageType = "local" | "session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const APP = "creatorfront";

const toUrl = (path: string) => `${API_BASE_URL}${path}`;
const getStoredAccessToken = () =>
  localStorage.getItem("mldz_access_token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  "";

const moduleCache = new Map<string, unknown>();
let bootstrapPromise: Promise<BootstrapPayload> | null = null;
let storageSyncInitialized = false;
let storageSnapshotApplied = false;
let persistModulesTimer: number | null = null;
let persistStorageTimer: number | null = null;
const pendingModules = new Map<string, unknown>();
const pendingStorage = {
  local: new Map<string, string | null>(),
  session: new Map<string, string | null>(),
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const token = getStoredAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
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

async function saveModules() {
  const modules = Object.fromEntries(pendingModules.entries());
  pendingModules.clear();
  await request<Record<string, unknown>>(`/api/frontend-state/${APP}/modules`, {
    method: "PUT",
    body: JSON.stringify({ modules }),
  }).catch(() => undefined);
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
    await request(`/api/frontend-state/${APP}/storage`, {
      method: "PUT",
      body: JSON.stringify({ type: "local", entries: localEntries }),
    }).catch(() => undefined);
  }

  if (Object.keys(sessionEntries).length) {
    await request(`/api/frontend-state/${APP}/storage`, {
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

function applyStorageSnapshot(snapshot: BootstrapPayload["storage"]) {
  if (typeof window === "undefined" || storageSnapshotApplied) return;
  storageSnapshotApplied = true;
  for (const [key, value] of Object.entries(snapshot.local || {})) {
    window.localStorage.setItem(key, value);
  }
  for (const [key, value] of Object.entries(snapshot.session || {})) {
    window.sessionStorage.setItem(key, value);
  }
}

export async function bootstrapCreatorFrontendState() {
  if (!bootstrapPromise) {
    bootstrapPromise = request<BootstrapPayload>(`/api/frontend-state/${APP}/bootstrap`).then((payload) => {
      for (const [key, value] of Object.entries(payload.modules || {})) {
        moduleCache.set(key, value);
      }
      applyStorageSnapshot(payload.storage);
      return payload;
    });
  }

  return bootstrapPromise;
}

export function useCreatorCompatState<T>(key: string, seed: T) {
  const [state, setState] = useState<T>(() => (moduleCache.has(key) ? (moduleCache.get(key) as T) : seed));

  useEffect(() => {
    let active = true;
    void bootstrapCreatorFrontendState()
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
      .catch(() => undefined);

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

export function useCreatorCompatValue<T>(key: string, seed: T) {
  const [value] = useCreatorCompatState<T>(key, seed);
  return value;
}

export function initCreatorStorageSync(options: { localPrefixes?: string[]; sessionPrefixes?: string[] }) {
  if (typeof window === "undefined" || storageSyncInitialized) return;
  storageSyncInitialized = true;
  const localPrefixes = options.localPrefixes || [];
  const sessionPrefixes = options.sessionPrefixes || [];
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;

  const matches = (storageType: StorageType, key: string) => {
    const prefixes = storageType === "local" ? localPrefixes : sessionPrefixes;
    return prefixes.some((prefix) => key.startsWith(prefix));
  };

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && matches("local", key)) {
      scheduleStoragePersist("local", key, value);
    }
    if (this === window.sessionStorage && matches("session", key)) {
      scheduleStoragePersist("session", key, value);
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && matches("local", key)) {
      scheduleStoragePersist("local", key, null);
    }
    if (this === window.sessionStorage && matches("session", key)) {
      scheduleStoragePersist("session", key, null);
    }
  };

  void bootstrapCreatorFrontendState();
}
