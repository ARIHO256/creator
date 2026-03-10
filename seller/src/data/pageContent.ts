import type { UserRole } from "../types/roles";
import { getCurrentRole } from "../auth/roles";
import { useSession } from "../auth/session";
import { getMockPageContent, updateDb, useMockDb } from "../mocks";
import { loadDb } from "../mocks/db";
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

const getStoredContent = <K extends PageKey>(key: K, role: UserRole) =>
  loadDb().pageContent?.[key]?.[role] as PageContentByKey<K> | undefined;

export function getPageContentByRole<K extends PageKey>(
  key: K,
  role: UserRole
): PageContentByKey<K> {
  return (getMockPageContent(key, role) || getStoredContent(key, role) || {}) as PageContentByKey<K>;
}

export function useRolePageContent<K extends PageKey>(key: K, roleOverride?: UserRole) {
  const session = useSession();
  const role = roleOverride ?? getCurrentRole(session);
  const db = useMockDb();
  const content = (db?.pageContent?.[key]?.[role] || getStoredContent(key, role) || {}) as PageContentByKey<K>;

  const updateContent = (updater: (prev: PageContentByKey<K>) => PageContentByKey<K>) => {
    updateDb((current) => {
      const prev = (current.pageContent?.[key]?.[role] || getStoredContent(key, role) || {}) as PageContentByKey<K>;
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
