import React, { createContext, useContext, useRef, type ReactNode } from "react";

export type QueryKeyPrimitive = string | number | boolean | null;
export type QueryKeyObject = object;
export type QueryKeyArray = readonly QueryKeyPrimitive[];
export type QueryKeyPart = QueryKeyPrimitive | QueryKeyObject | QueryKeyArray;
export type QueryKey = readonly QueryKeyPart[];
export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface QueryCacheEntry<T = unknown> {
  queryKey: QueryKey;
  status: QueryStatus;
  data?: T;
  error?: unknown;
  updatedAt: number;
  promise?: Promise<T>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => deepEqual(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (!deepEqual(leftKeys, rightKeys)) return false;
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function startsWithQueryKey(value: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > value.length) return false;
  return prefix.every((part, index) => deepEqual(part, value[index]));
}

export function serializeQueryKey(queryKey: QueryKey): string {
  return stableSerialize(queryKey);
}

class ApiCacheStore {
  private readonly entries = new Map<string, QueryCacheEntry>();
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getEntry<T>(serializedKey: string): QueryCacheEntry<T> | undefined {
    return this.entries.get(serializedKey) as QueryCacheEntry<T> | undefined;
  }

  setData<T>(queryKey: QueryKey, data: T): void {
    const serializedKey = serializeQueryKey(queryKey);
    this.entries.set(serializedKey, {
      queryKey,
      status: "success",
      data,
      error: undefined,
      updatedAt: Date.now()
    });
    this.emit();
  }

  invalidate(prefix?: QueryKey): void {
    if (!prefix) {
      if (this.entries.size === 0) return;
      this.entries.clear();
      this.emit();
      return;
    }

    let mutated = false;
    for (const [serializedKey, entry] of this.entries.entries()) {
      if (startsWithQueryKey(entry.queryKey, prefix)) {
        this.entries.delete(serializedKey);
        mutated = true;
      }
    }

    if (mutated) {
      this.emit();
    }
  }

  async fetch<T>(queryKey: QueryKey, fetcher: () => Promise<T>, options: { force?: boolean; staleTime?: number } = {}): Promise<T> {
    const serializedKey = serializeQueryKey(queryKey);
    const current = this.getEntry<T>(serializedKey);
    const staleTime = options.staleTime ?? Number.POSITIVE_INFINITY;
    const isFresh = Boolean(
      current &&
        current.status === "success" &&
        current.updatedAt > 0 &&
        Date.now() - current.updatedAt < staleTime &&
        options.force !== true
    );

    if (isFresh && current?.data !== undefined) {
      return current.data;
    }

    if (!options.force && current?.promise) {
      return current.promise;
    }

    const loadingEntry: QueryCacheEntry<T> = {
      queryKey,
      status: "loading",
      data: current?.data,
      error: undefined,
      updatedAt: current?.updatedAt ?? 0
    };

    const promise = fetcher()
      .then((data) => {
        this.entries.set(serializedKey, {
          queryKey,
          status: "success",
          data,
          error: undefined,
          updatedAt: Date.now()
        });
        this.emit();
        return data;
      })
      .catch((error: unknown) => {
        this.entries.set(serializedKey, {
          queryKey,
          status: "error",
          data: current?.data,
          error,
          updatedAt: Date.now()
        });
        this.emit();
        throw error;
      });

    this.entries.set(serializedKey, {
      ...loadingEntry,
      promise
    });
    this.emit();

    return promise;
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

const ApiCacheContext = createContext<ApiCacheStore | null>(null);

export function ApiCacheProvider({ children }: { children: ReactNode }): JSX.Element {
  const storeRef = useRef<ApiCacheStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new ApiCacheStore();
  }

  return <ApiCacheContext.Provider value={storeRef.current}>{children}</ApiCacheContext.Provider>;
}

export function useApiCache(): ApiCacheStore {
  const context = useContext(ApiCacheContext);
  if (!context) {
    throw new Error("useApiCache must be used within an ApiCacheProvider.");
  }
  return context;
}
