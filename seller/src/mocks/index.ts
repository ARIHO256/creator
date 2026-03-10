import { useEffect, useState } from "react";
import {
  bootstrapSellerFrontendState,
  fetchSellerPageContent,
  readSellerModule,
  readSellerPageContent,
  useSellerCompatState,
  writeSellerModule,
} from "../lib/frontendState";
import type { PageKey, PageContentMap } from "../data/pageContent";
import type { UserRole } from "../types/roles";

export const shouldEnableMocks = () => false;

export const initMocks = async () => {
  await bootstrapSellerFrontendState();
};

export const getModuleData = <T>(key: string, fallback: T): T => readSellerModule(key, fallback);

export const setModuleData = <T>(key: string, value: T) => {
  void writeSellerModule(key, value);
};

export const useMockState = <T>(key: string, fallback: T) => useSellerCompatState(key, fallback);

export const useMockDb = () => {
  const [pageContent, setPageContent] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    let active = true;
    void bootstrapSellerFrontendState().then(() => {
      if (!active) return;
      setPageContent((prev) => ({ ...prev }));
    });
    return () => {
      active = false;
    };
  }, []);

  return {
    pageContent,
    modules: {},
  };
};

export const getMockPageContent = <K extends PageKey>(key: K, role: UserRole): PageContentMap[K]["seller"] | undefined =>
  readSellerPageContent<PageContentMap[K]["seller"] | undefined>(key, role, undefined);

export const refreshMockPageContent = async <K extends PageKey>(key: K, role: UserRole) =>
  fetchSellerPageContent<PageContentMap[K]["seller"] | undefined>(key, role, undefined);
