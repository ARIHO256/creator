import { useEffect, useState } from "react";
import { getCurrentRole } from "../auth/roles";
import { useSession } from "../auth/session";
import {
  bootstrapSellerFrontendState,
  fetchSellerPageContent,
  readSellerPageContent,
  writeSellerPageContent,
} from "../lib/frontendState";
import type { UserRole } from "../types/roles";
import type {
  AnalyticsContent,
  ComplianceContent,
  DashboardContent,
  HelpSupportContent,
  ListingWizardContent,
  ListingsContent,
  MessagesContent,
  NotificationsContent,
  OrdersContent,
} from "./pageTypes";

export type PageContentMap = {
  dashboard: { seller: DashboardContent; provider: DashboardContent };
  messages: { seller: MessagesContent; provider: MessagesContent };
  notifications: { seller: NotificationsContent; provider: NotificationsContent };
  analytics: { seller: AnalyticsContent; provider: AnalyticsContent };
  helpSupport: { seller: HelpSupportContent; provider: HelpSupportContent };
  compliance: { seller: ComplianceContent; provider: ComplianceContent };
  listings: { seller: ListingsContent; provider: ListingsContent };
  listingWizard: { seller: ListingWizardContent; provider: ListingWizardContent };
  orders: { seller: OrdersContent; provider: OrdersContent };
};

export type PageKey = keyof PageContentMap;
export type PageContentByKey<K extends PageKey> = PageContentMap[K]["seller"];

export function getPageContentByRole<K extends PageKey>(
  key: K,
  role: UserRole
): PageContentByKey<K> {
  return readSellerPageContent<PageContentByKey<K>>(key, role, {} as PageContentByKey<K>);
}

export function useRolePageContent<K extends PageKey>(key: K, roleOverride?: UserRole) {
  const session = useSession();
  const role = roleOverride ?? getCurrentRole(session);
  const [content, setContent] = useState<PageContentByKey<K>>(() =>
    readSellerPageContent<PageContentByKey<K>>(key, role, {} as PageContentByKey<K>)
  );

  useEffect(() => {
    let active = true;
    void bootstrapSellerFrontendState()
      .then(() => fetchSellerPageContent<PageContentByKey<K>>(key, role, {} as PageContentByKey<K>))
      .then((payload) => {
        if (active) {
          setContent(payload);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [key, role]);

  const updateContent = (updater: (prev: PageContentByKey<K>) => PageContentByKey<K>) => {
    setContent((prev) => {
      const next = updater(prev);
      void writeSellerPageContent(key, role, next);
      return next;
    });
  };

  return { role, content, updateContent };
}
