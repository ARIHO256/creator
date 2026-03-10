import type { UserRole } from "../../types/roles";
import { getCurrentRole } from "../../auth/roles";
import { useSession } from "../../auth/session";
import type {
  AnalyticsContent,
  ComplianceContent,
  DashboardContent,
  HelpSupportContent,
  MessagesContent,
  NotificationsContent,
  ListingsContent,
  ListingWizardContent,
  OrdersContent,
} from "./types";
import { sellerAnalyticsContent } from "../seller/analytics";
import { providerAnalyticsContent } from "../provider/analytics";
import { sellerComplianceContent } from "../seller/compliance";
import { providerComplianceContent } from "../provider/compliance";
import { sellerDashboardContent } from "../seller/dashboard";
import { providerDashboardContent } from "../provider/dashboard";
import { sellerHelpSupportContent } from "../seller/helpSupport";
import { providerHelpSupportContent } from "../provider/helpSupport";
import { sellerMessagesContent } from "../seller/messages";
import { providerMessagesContent } from "../provider/messages";
import { sellerNotificationsContent } from "../seller/notifications";
import { providerNotificationsContent } from "../provider/notifications";
import { sellerListingsContent } from "../seller/listings";
import { providerListingsContent } from "../provider/listings";
import { sellerListingWizardContent } from "../seller/listingWizard";
import { providerListingWizardContent } from "../provider/listingWizard";
import { sellerOrdersContent } from "../seller/orders";
import { providerOrdersContent } from "../provider/orders";
import { getMockPageContent, updateDb, useMockDb } from "../../mocks";

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

export const pageContent: PageContentMap = {
  dashboard: { seller: sellerDashboardContent, provider: providerDashboardContent },
  messages: { seller: sellerMessagesContent, provider: providerMessagesContent },
  notifications: { seller: sellerNotificationsContent, provider: providerNotificationsContent },
  analytics: { seller: sellerAnalyticsContent, provider: providerAnalyticsContent },
  helpSupport: { seller: sellerHelpSupportContent, provider: providerHelpSupportContent },
  compliance: { seller: sellerComplianceContent, provider: providerComplianceContent },
  listings: { seller: sellerListingsContent, provider: providerListingsContent },
  listingWizard: { seller: sellerListingWizardContent, provider: providerListingWizardContent },
  orders: { seller: sellerOrdersContent, provider: providerOrdersContent },
};

export function getPageContentByRole<K extends PageKey>(
  key: K,
  role: UserRole
): PageContentByKey<K> {
  return (getMockPageContent(key, role) || pageContent[key][role]) as PageContentByKey<K>;
}

export function useRolePageContent<K extends PageKey>(key: K, roleOverride?: UserRole) {
  const session = useSession();
  const role = roleOverride ?? getCurrentRole(session);
  const db = useMockDb();
  const content = (db?.pageContent?.[key]?.[role] || pageContent[key][role]) as PageContentByKey<K>;
  const updateContent = (updater: (prev: PageContentByKey<K>) => PageContentByKey<K>) => {
    updateDb((current) => {
      const prev = (current.pageContent?.[key]?.[role] || pageContent[key][role]) as PageContentByKey<K>;
      const next = updater(prev);
      return {
        ...current,
        pageContent: {
          ...current.pageContent,
          [key]: {
            ...(current.pageContent?.[key] || {}),
            [role]: next,
          },
        },
      };
    });
  };
  return { role, content, updateContent };
}
