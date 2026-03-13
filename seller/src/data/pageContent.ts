import { useEffect, useState } from "react";
import { getCurrentRole } from "../auth/roles";
import { useSession } from "../auth/session";
import { sellerBackendApi } from "../lib/backendApi";
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

const INITIAL_PAGE_CONTENT: { [K in PageKey]: PageContentByKey<K> } = {
  dashboard: {
    quickActions: [],
    hero: {
      name: "",
      sub: "",
      ctaLabel: "",
      ctaTo: "",
      chipWhenMLDZ: "",
      chipWhenNoMLDZ: "",
    },
    featured: {
      title: "",
      sub: "",
      ctaLabel: "",
      ctaTo: "",
    },
    bases: { revenueBase: 0, ordersBase: 0, trustBase: 0 },
  },
  messages: {
    tagOptions: [],
    threads: [],
    messages: [],
    templates: [],
  },
  notifications: {
    categories: [],
    items: [],
    watches: [],
  },
  analytics: {
    marketplaceOptions: ["All"],
    overviewKpis: [],
    attributionRows: [],
    highlights: { topDriver: "", risk: "", recommendation: "" },
    cohort: { subtitle: "", bullets: [] },
    alertRules: [],
    metricOptions: [],
  },
  helpSupport: {
    kb: [],
    faq: [],
    status: [],
    tickets: [],
    formDefaults: {
      marketplace: "",
      category: "",
      severity: "",
      subject: "",
      ref: "",
      email: "",
      phone: "",
      desc: "",
      sla: "",
    },
    marketplaceOptions: [],
    categoryOptions: [],
    refLabel: "",
    refPlaceholder: "",
  },
  compliance: {
    primaryChannel: "EVmart",
    defaultDocType: "Business License",
    heroSubtitle: "",
    docs: [],
    queue: [],
    channelOptions: ["EVmart"],
    autoRules: [],
    autoDefault: [],
  },
  listings: {
    labels: {
      hubTitle: "",
      hubSubtitle: "",
      newListingLabel: "",
      newListingToastTitle: "",
      newListingToastMessage: "",
      newListingToastAction: "",
      listingsLabel: "",
      selectedListingLabel: "",
      emptyTitle: "",
      emptyMessage: "",
      kpiViewsLabel: "",
      kpiAddLabel: "",
      kpiOrdersLabel: "",
      ordersTrendLabel: "",
      previewTitle: "",
      previewSubtitle: "",
      retailLabel: "",
      wholesaleLabel: "",
      compareLabel: "",
      moqLabel: "",
      bestTierLabel: "",
      primaryCtaLabel: "",
      secondaryCtaLabel: "",
    },
    rows: [],
  },
  listingWizard: {
    taxonomy: [],
    baseLines: [],
    copy: {
      heroTitle: "",
      heroSubtitle: "",
      manageLinesLabel: "",
      approvedLinesTitle: "",
      approvedLinesSubtitle: "",
      selectedLineTitle: "",
      selectedLineEmptyTitle: "",
      selectedLineEmptySubtitle: "",
      searchPlaceholder: "",
      emptyTitle: "",
      emptySubtitle: "",
      suspendedHint: "",
      eligibleHint: "",
      tipText: "",
      addLineLabel: "",
      listingIntentLabel: "",
      listingIntentOptions: [],
      suspendedCardTitle: "",
      suspendedCardBody: "",
      previewCta: "",
      startCta: "",
      nextStepsTitle: "",
      nextSteps: [],
      taxonomyFallback: "",
    },
  },
  orders: {
    orders: [],
    returns: [],
    disputes: [],
    bookings: [],
    stages: [],
    headline: "",
    subhead: "",
  },
};

const DEFAULT_NOTIFICATION_CATEGORIES = [
  "Orders",
  "RFQs",
  "Bookings",
  "Quotes",
  "Consultations",
  "Finance",
  "MyLiveDealz",
  "Security",
  "System",
];

const inferNotificationCategory = (entry: Record<string, unknown>) => {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.category === "string") return meta.category;
  switch (String(entry.kind ?? "").toLowerCase()) {
    case "earnings":
    case "payout":
      return "Finance";
    case "live":
      return "MyLiveDealz";
    case "proposal":
      return "Quotes";
    case "security":
      return "Security";
    case "booking":
      return "Bookings";
    case "consultation":
      return "Consultations";
    case "rfq":
      return "RFQs";
    case "order":
      return "Orders";
    default:
      return "System";
  }
};

const inferNotificationPriority = (entry: Record<string, unknown>) => {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const raw = typeof meta.priority === "string" ? meta.priority.toLowerCase() : "";
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return String(entry.kind ?? "").toLowerCase() === "security" ? "high" : "medium";
};

async function loadDashboardContent(role: UserRole): Promise<DashboardContent> {
  if (role === "provider") {
    const [bookingsResult, serviceCommandResult] = await Promise.allSettled([
      sellerBackendApi.getProviderBookings(),
      sellerBackendApi.getProviderServiceCommand(),
    ]);
    const bookingsPayload =
      bookingsResult.status === "fulfilled" ? bookingsResult.value : undefined;
    const serviceCommandPayload =
      serviceCommandResult.status === "fulfilled" ? serviceCommandResult.value : undefined;
    const bookings = Array.isArray(bookingsPayload?.bookings) ? bookingsPayload.bookings : [];
    const queues = Array.isArray(serviceCommandPayload?.queues) ? serviceCommandPayload.queues : [];
    return {
      quickActions: [
        { key: "new-booking", label: "New Booking", to: "/provider/bookings" },
        { key: "service-command", label: "Service Command", to: "/provider/service-command" },
      ],
      hero: {
        name: "Provider Workspace",
        sub: "Bookings, consultations, and delivery operations in one backend-backed workspace.",
        ctaLabel: "Open Service Command",
        ctaTo: "/provider/service-command",
        chipWhenMLDZ: "Provider live tools active",
        chipWhenNoMLDZ: "Provider operations",
      },
      featured: {
        title: "Bookings Snapshot",
        sub: `${bookings.length} bookings and ${queues.length} active queues`,
        ctaLabel: "Open Bookings",
        ctaTo: "/provider/bookings",
      },
      bases: {
        revenueBase: bookings.reduce((sum, entry) => sum + Number(entry.price ?? 0), 0),
        ordersBase: bookings.length,
        trustBase: 88,
      },
    };
  }

  return (await sellerBackendApi.getSellerDashboard()) as DashboardContent;
}

async function loadMessagesContent(): Promise<MessagesContent> {
  return (await sellerBackendApi.getMessages()) as MessagesContent;
}

async function loadNotificationsContent(): Promise<NotificationsContent> {
  const [itemsResult, preferencesResult] = await Promise.allSettled([
    sellerBackendApi.getNotifications(),
    sellerBackendApi.getNotificationPreferences(),
  ]);
  const itemsPayload = itemsResult.status === "fulfilled" ? itemsResult.value : [];
  const preferencesPayload =
    preferencesResult.status === "fulfilled" ? preferencesResult.value : undefined;

  const items = Array.isArray(itemsPayload)
    ? itemsPayload.map((entry) => {
        const record = entry as Record<string, unknown>;
        const meta = (record.metadata ?? {}) as Record<string, unknown>;
        return {
          id: String(record.id ?? ""),
          title: String(record.title ?? ""),
          message: String(record.body ?? ""),
          category: inferNotificationCategory(record),
          priority: inferNotificationPriority(record),
          createdAt: String(record.createdAt ?? new Date().toISOString()),
          unread: !record.readAt,
          route:
            typeof meta.link === "string"
              ? meta.link
              : typeof meta.route === "string"
                ? meta.route
                : undefined,
          actor:
            typeof meta.actor === "string"
              ? meta.actor
              : typeof meta.brand === "string"
                ? meta.brand
                : undefined,
        };
      })
    : [];

  const watches = Array.isArray(preferencesPayload.watches) ? preferencesPayload.watches : [];
  const categories = Array.from(
    new Set([
      ...DEFAULT_NOTIFICATION_CATEGORIES,
      ...items.map((item) => item.category),
      ...watches.map((watch) => String((watch as Record<string, unknown>).category ?? "")),
    ].filter(Boolean))
  );

  return { categories, items, watches } as NotificationsContent;
}

async function loadAnalyticsContent(): Promise<AnalyticsContent> {
  return (await sellerBackendApi.getAnalyticsPage()) as AnalyticsContent;
}

async function loadComplianceContent(): Promise<ComplianceContent> {
  const payload = (await sellerBackendApi.getCompliance()) as Record<string, unknown>;
  const autoRules = Array.isArray(payload.autoRules)
    ? payload.autoRules.map((entry) => {
        const record = entry as Record<string, unknown>;
        const meta = (record.metadata ?? {}) as Record<string, unknown>;
        return {
          match: String(meta.match ?? record.title ?? ""),
          required: Array.isArray(meta.required) ? meta.required.map((item) => String(item)) : [],
        };
      })
    : [];
  return {
    primaryChannel: String(payload.primaryChannel ?? "EVmart"),
    defaultDocType: String(payload.defaultDocType ?? "Business License"),
    heroSubtitle: String(payload.heroSubtitle ?? ""),
    docs: Array.isArray(payload.docs) ? payload.docs : [],
    queue: Array.isArray(payload.queue) ? payload.queue : [],
    channelOptions: Array.isArray(payload.channelOptions) ? payload.channelOptions.map((item) => String(item)) : ["EVmart"],
    autoRules,
    autoDefault: Array.isArray(payload.autoDefault) ? payload.autoDefault.map((item) => String(item)) : [],
  };
}

async function loadListingWizardContent(): Promise<ListingWizardContent> {
  return (await sellerBackendApi.getSellerListingWizard()) as ListingWizardContent;
}

async function loadOrdersContent(role: UserRole): Promise<OrdersContent> {
  if (role === "provider") {
    const payload = await sellerBackendApi.getProviderBookings();
    const bookings = Array.isArray(payload.bookings)
      ? payload.bookings.map((entry) => {
          const data = ((entry as Record<string, unknown>).data ?? {}) as Record<string, unknown>;
          return {
            id: String((entry as Record<string, unknown>).id ?? ""),
            client: String(data.client ?? (entry as Record<string, unknown>).buyer ?? ""),
            service: String((entry as Record<string, unknown>).title ?? ""),
            price: Number((entry as Record<string, unknown>).amount ?? 0),
            currency: String((entry as Record<string, unknown>).currency ?? "USD"),
            scheduledFor: String(data.scheduledFor ?? (entry as Record<string, unknown>).createdAt ?? ""),
            stage: String((entry as Record<string, unknown>).status ?? "Requested"),
          };
        })
      : [];
    const stages = Array.from(new Set(bookings.map((entry) => entry.stage)));
    return {
      headline: "Provider bookings",
      subhead: "Bookings and service delivery status",
      bookings,
      stages,
    };
  }

  const payload = (await sellerBackendApi.getSellerOrders()) as Record<string, unknown>;
  const orders = Array.isArray(payload.orders)
    ? payload.orders.map((entry) => {
        const record = entry as Record<string, unknown>;
        return {
          id: String(record.id ?? ""),
          customer:
            String(((record.buyer as Record<string, unknown> | undefined)?.name ?? record.customer ?? "")),
          channel: String(record.channel ?? ""),
          items: Array.isArray(record.items) ? record.items.length : Number(record.items ?? 0),
          total: Number(record.totalAmount ?? record.total ?? 0),
          currency: String(record.currency ?? "USD"),
          status: String(record.status ?? ""),
          warehouse: String(((record.fulfillment as Record<string, unknown> | undefined)?.warehouseName ?? record.warehouse ?? "")),
          updatedAt: String(record.updatedAt ?? ""),
          slaDueAt: String(((record.fulfillment as Record<string, unknown> | undefined)?.slaDueAt ?? record.slaDueAt ?? "")),
        };
      })
    : [];
  const returns = Array.isArray(payload.returns) ? payload.returns : [];
  const disputes = Array.isArray(payload.disputes) ? payload.disputes : [];
  return {
    headline: typeof payload.headline === "string" ? payload.headline : "Orders",
    subhead:
      typeof payload.subhead === "string"
        ? payload.subhead
        : "Orders and operations preview",
    orders,
    returns,
    disputes,
    offlineNotice:
      typeof payload.offlineNotice === "string" ? payload.offlineNotice : undefined,
  };
}

async function loadPageContent<K extends PageKey>(
  key: K,
  role: UserRole
): Promise<PageContentByKey<K>> {
  switch (key) {
    case "dashboard":
      return (await loadDashboardContent(role)) as PageContentByKey<K>;
    case "messages":
      return (await loadMessagesContent()) as PageContentByKey<K>;
    case "notifications":
      return (await loadNotificationsContent()) as PageContentByKey<K>;
    case "analytics":
      return (await loadAnalyticsContent()) as PageContentByKey<K>;
    case "compliance":
      return (await loadComplianceContent()) as PageContentByKey<K>;
    case "listingWizard":
      return (await loadListingWizardContent()) as PageContentByKey<K>;
    case "orders":
      return (await loadOrdersContent(role)) as PageContentByKey<K>;
    default:
      return INITIAL_PAGE_CONTENT[key];
  }
}

export function getPageContentByRole<K extends PageKey>(key: K, _role: UserRole): PageContentByKey<K> {
  return INITIAL_PAGE_CONTENT[key];
}

export function useRolePageContent<K extends PageKey>(key: K, roleOverride?: UserRole) {
  const session = useSession();
  const role = roleOverride ?? getCurrentRole(session);
  const [content, setContent] = useState<PageContentByKey<K>>(INITIAL_PAGE_CONTENT[key]);

  useEffect(() => {
    let active = true;
    setContent(INITIAL_PAGE_CONTENT[key]);
    void loadPageContent(key, role)
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
    setContent((prev) => updater(prev));
  };

  return { role, content, updateContent };
}
