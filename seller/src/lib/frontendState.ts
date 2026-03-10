import { useEffect, useState, type SetStateAction } from "react";

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ??
  "";

const moduleCache = new Map<string, unknown>();
const pendingModules = new Map<string, unknown>();
let persistTimer: number | null = null;

const toUrl = (path: string) => `${API_BASE_URL}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

async function flushModules() {
  const entries = Array.from(pendingModules.entries());
  pendingModules.clear();

  await Promise.all(
    entries.map(([key, payload]) =>
      request(`/api/sellerfront/module`, {
        method: "PUT",
        body: JSON.stringify({ key, payload }),
      }).catch(() => undefined)
    )
  );
}

function schedulePersist(key: string, value: unknown) {
  pendingModules.set(key, value);
  if (persistTimer) {
    window.clearTimeout(persistTimer);
  }
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void flushModules();
  }, 120);
}

export function useSellerCompatState<T>(key: string, seed: T) {
  const [state, setState] = useState<T>(() => (moduleCache.has(key) ? (moduleCache.get(key) as T) : seed));

  useEffect(() => {
    let active = true;
    void request<T | null>(`/api/sellerfront/module?key=${encodeURIComponent(key)}`)
      .then((payload) => {
        if (payload === null || payload === undefined) {
          moduleCache.set(key, seed);
          schedulePersist(key, seed);
          if (active) setState(seed);
          return;
        }
        moduleCache.set(key, payload);
        if (active) setState(payload);
      })
      .catch(() => {
        moduleCache.set(key, seed);
        if (active) setState(seed);
      });

    return () => {
      active = false;
    };
  }, [key, seed]);

  const setPersist = (nextValue: SetStateAction<T>) => {
    setState((prev) => {
      const next = typeof nextValue === "function" ? (nextValue as (value: T) => T)(prev) : nextValue;
      moduleCache.set(key, next);
      schedulePersist(key, next);
      return next;
    });
  };

  return [state, setPersist] as const;
}

export function useSellerCompatValue<T>(key: string, seed: T) {
  const [value] = useSellerCompatState<T>(key, seed);
  return value;
}
