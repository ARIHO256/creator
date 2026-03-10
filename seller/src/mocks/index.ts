import { useEffect, useState } from "react";
import type { PageKey, PageContentMap } from "../mock/shared/pageContent";
import type { UserRole } from "../types/roles";
import type { MockDB } from "./types";
import { loadDb, resetDb, subscribeDb, updateDb } from "./db";

export { mockAuth, mockListings, mockCart, mockOrders, mockDelay } from "./api";
export { resetDb, loadDb, updateDb } from "./db";

export const shouldEnableMocks = () => {
  const flag = String(import.meta.env.VITE_USE_MOCKS || "");
  return Boolean(
    import.meta.env.DEV ||
      import.meta.env.VITE_ENABLE_MOCKS === "1" ||
      flag.toLowerCase() === "true"
  );
};

export const initMocks = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") {
    resetDb();
  } else {
    loadDb();
  }
  (window as any).__resetMockData = () => resetDb();
  (window as any).__resetMockDB = () => resetDb();
  (window as any).__mockDb = () => loadDb();
};

export const getModuleData = <T>(key: string, fallback: T): T => {
  const db = loadDb();
  if (!db.modules || !(key in db.modules)) {
    updateDb((current) => ({
      ...current,
      modules: { ...current.modules, [key]: fallback },
    }));
    return fallback;
  }
  return db.modules[key] as T;
};

export const setModuleData = <T>(key: string, value: T) => {
  updateDb((current) => ({
    ...current,
    modules: { ...current.modules, [key]: value },
  }));
};

export const useMockState = <T>(key: string, fallback: T) => {
  const [state, setState] = useState<T>(() => getModuleData(key, fallback));
  useEffect(() => subscribeDb(() => setState(getModuleData(key, fallback))), [key, fallback]);
  const setPersist = (updater: ((prev: T) => T) | T) => {
    setState((prev) => {
      const next = typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
      setModuleData(key, next);
      return next;
    });
  };
  return [state, setPersist] as const;
};

export const useMockDb = () => {
  const [db, setDb] = useState<MockDB>(() => loadDb());
  useEffect(() => subscribeDb(() => setDb(loadDb())), []);
  return db;
};

export const getMockPageContent = <K extends PageKey>(key: K, role: UserRole): PageContentMap[K]["seller"] | undefined => {
  const db = loadDb();
  return db.pageContent?.[key]?.[role] as PageContentMap[K]["seller"] | undefined;
};
