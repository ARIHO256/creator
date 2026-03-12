import type { MessagesContent } from "../data/pageTypes";
import type { UserRole } from "../types/roles";

type DevUser = {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  roles: UserRole[];
  onboardingCompleted: boolean;
  approvalStatus: string;
};

type TenantData = {
  settings: {
    preferences: Record<string, unknown>;
    uiState: Record<string, unknown>;
    savedViews: { views: Array<Record<string, unknown>> };
    notificationPreferences: { watches: Array<Record<string, unknown>> };
    security: Record<string, unknown>;
  };
  notifications: Array<Record<string, unknown>>;
  messages: MessagesContent;
  seller: {
    orders: Array<Record<string, unknown>>;
    returns: Array<Record<string, unknown>>;
    disputes: Array<Record<string, unknown>>;
  };
  provider: {
    bookings: Array<Record<string, unknown>>;
    reviews: Array<Record<string, unknown>>;
    serviceCommand: Record<string, unknown>;
  };
  workflow: Record<string, Record<string, unknown>>;
  onboarding: Record<string, unknown>;
};

type DevApiStore = {
  v: number;
  users: DevUser[];
  currentUserId: string;
  tenants: Record<string, TenantData>;
};

const STORAGE_KEY = "seller-dev-api-store-v2";

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const nowIso = () => new Date().toISOString();

const makeId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function mergeRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(value) && isRecord(next[key])) {
      next[key] = mergeRecords(next[key] as Record<string, unknown>, value);
    } else {
      next[key] = value;
    }
  }

  return next;
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body || typeof init.body !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(init.body);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readStore(): DevApiStore {
  if (typeof window === "undefined") {
    return createDefaultStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultStore();
    return { ...createDefaultStore(), ...JSON.parse(raw) } as DevApiStore;
  } catch {
    return createDefaultStore();
  }
}

function writeStore(store: DevApiStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function createDefaultTenantData(): TenantData {
  return {
    settings: {
      preferences: {
        locale: "en",
        currency: "USD",
      },
      uiState: {
        shell: { sidebarScroll: 0 },
        dashboard: { defaultViewId: "all" },
        preferences: {},
        workspaces: {},
      },
      savedViews: { views: [] },
      notificationPreferences: {
        watches: [
          {
            id: "watch_orders",
            name: "Order alerts",
            desc: "Notify on order exceptions and SLA risk.",
            enabled: true,
            category: "Orders",
          },
          {
            id: "watch_security",
            name: "Security alerts",
            desc: "Notify on security events.",
            enabled: true,
            category: "Security",
          },
        ],
      },
      security: {
        twoFactor: false,
        twoFactorMethod: "authenticator",
        twoFactorConfig: { enabled: false, verified: false, secret: null },
        passkeys: [],
        sessions: [],
        trustedDevices: [],
      },
    },
    notifications: [
      {
        id: "notif_order_delay",
        title: "Order SLA at risk",
        body: "Order ORD-24018 is nearing the warehouse SLA.",
        kind: "order",
        createdAt: nowIso(),
        readAt: null,
        metadata: {
          category: "Orders",
          priority: "high",
          route: "/orders",
        },
      },
      {
        id: "notif_review",
        title: "New review posted",
        body: "A buyer left a 4-star review for your latest order.",
        kind: "system",
        createdAt: nowIso(),
        readAt: null,
        metadata: {
          category: "System",
          priority: "medium",
          route: "/reviews",
        },
      },
    ],
    messages: {
      tagOptions: ["Order", "Support", "MyLiveDealz"],
      threads: [
        {
          id: "thread_order_24018",
          title: "Order ORD-24018",
          participants: [
            { name: "Amina Buyer", role: "buyer" },
            { name: "You", role: "you" },
          ],
          lastMessage: "Please confirm dispatch before 5 PM.",
          lastAt: nowIso(),
          unreadCount: 1,
          tags: ["Order"],
          customerLang: "en",
          myLang: "en",
          priority: "high",
        },
      ],
      messages: [
        {
          id: "msg_order_24018_1",
          threadId: "thread_order_24018",
          sender: "other",
          text: "Please confirm dispatch before 5 PM.",
          lang: "en",
          at: nowIso(),
        },
      ],
      templates: [
        {
          id: "tpl_shipping_eta",
          title: "Shipping ETA",
          category: "Shipping",
          body: "Your order is packed and will be dispatched today.",
          pinned: true,
        },
      ],
    },
    seller: {
      orders: [
        {
          id: "ORD-24018",
          buyer: { name: "Amina Buyer" },
          channel: "EVmart",
          items: [{ sku: "EV-001", name: "Charging Cable", qty: 2 }],
          totalAmount: 128,
          currency: "USD",
          status: "At Risk",
          fulfillment: {
            warehouseName: "Kampala DC",
            slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          },
          updatedAt: nowIso(),
        },
      ],
      returns: [
        {
          id: "RET-102",
          orderId: "ORD-24018",
          status: "Requested",
          buyer: { name: "Amina Buyer" },
          createdAt: nowIso(),
        },
      ],
      disputes: [],
    },
    provider: {
      bookings: [],
      reviews: [],
      serviceCommand: { queues: [], kpis: [] },
    },
    workflow: {},
    onboarding: {},
  };
}

function createDefaultStore(): DevApiStore {

  const sellerUser: DevUser = {
    id: "seller_demo",
    email: "seller@demo.evzone",
    phone: "+256700000001",
    name: "Demo Seller",
    role: "seller",
    roles: ["seller", "provider"],
    onboardingCompleted: true,
    approvalStatus: "APPROVED",
  };

  return {
    v: 2,
    users: [sellerUser],
    currentUserId: sellerUser.id,
    tenants: {
      [sellerUser.id]: createDefaultTenantData(),
    },
  };
}

function currentUser(store: DevApiStore) {
  return (
    store.users.find((entry) => entry.id === store.currentUserId) ??
    store.users[0]
  );
}

function normalizeIdentifier(body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  return { email, phone };
}

function normalizeRole(value: unknown): UserRole {
  return String(value || "").toUpperCase() === "PROVIDER" ? "provider" : "seller";
}

function buildTokens(user: DevUser) {
  return {
    accessToken: `dev-access-${user.id}`,
    refreshToken: `dev-refresh-${user.id}`,
    role: user.role.toUpperCase(),
    roles: user.roles.map((entry) => entry.toUpperCase()),
  };
}

function buildProfile(user: DevUser) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role.toUpperCase(),
    roles: user.roles.map((entry) => entry.toUpperCase()),
    approvalStatus: user.approvalStatus,
    onboardingCompleted: user.onboardingCompleted,
    sellerProfile: { displayName: user.name, name: user.name },
  };
}

function ok<T>(value: T): T {
  return deepClone(value);
}

function fallbackFor(path: string, method: string, body: Record<string, unknown>) {
  if (method === "PATCH" || method === "POST" || method === "PUT") {
    return Object.keys(body).length ? body : { ok: true };
  }

  if (method === "DELETE") {
    return { deleted: true };
  }

  if (path === "/api/reviews") {
    return { reviews: [] };
  }

  return {};
}

export async function handleDevApiMock<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const store = readStore();
  if (!store.tenants[store.currentUserId]) {
    store.tenants[store.currentUserId] = createDefaultTenantData();
    writeStore(store);
  }
  const tenant = store.tenants[store.currentUserId];
  const method = String(init?.method || "GET").toUpperCase();
  const body = parseBody(init);
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/health" && method === "GET") {
    return ok({ status: "mock" }) as T;
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const { email, phone } = normalizeIdentifier(body);
    const found =
      store.users.find((entry) => email && entry.email === email) ??
      store.users.find((entry) => phone && entry.phone === phone) ??
      currentUser(store);
    store.currentUserId = found.id;
    writeStore(store);
    return ok(buildTokens(found)) as T;
  }

  if (pathname === "/api/auth/register" && method === "POST") {
    const role = normalizeRole(body.role);
    const { email, phone } = normalizeIdentifier(body);
    const created: DevUser = {
      id: makeId("user"),
      email: email || `${makeId("user")}@demo.evzone`,
      phone: phone || undefined,
      name: String(body.name || email || "Demo User"),
      role,
      roles: role === "provider" ? ["provider", "seller"] : ["seller"],
      onboardingCompleted: true,
      approvalStatus: "APPROVED",
    };
    store.users.unshift(created);
    store.currentUserId = created.id;
    writeStore(store);
    return ok(buildTokens(created)) as T;
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    return ok(buildProfile(currentUser(store))) as T;
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/auth/recovery" && method === "POST") {
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/auth/switch-role" && method === "POST") {
    const user = currentUser(store);
    user.role = normalizeRole(body.role);
    if (!user.roles.includes(user.role)) {
      user.roles = [...user.roles, user.role];
    }
    writeStore(store);
    return ok(buildProfile(user)) as T;
  }

  if (pathname === "/api/settings/preferences" && method === "GET") {
    return ok(tenant.settings.preferences) as T;
  }

  if (pathname === "/api/settings/preferences" && method === "PATCH") {
    tenant.settings.preferences = mergeRecords(tenant.settings.preferences, body);
    writeStore(store);
    return ok(tenant.settings.preferences) as T;
  }

  if (pathname === "/api/settings/ui-state" && method === "GET") {
    return ok(tenant.settings.uiState) as T;
  }

  if (pathname === "/api/settings/ui-state" && method === "PATCH") {
    tenant.settings.uiState = mergeRecords(tenant.settings.uiState, body);
    writeStore(store);
    return ok(tenant.settings.uiState) as T;
  }

  if (pathname === "/api/settings/saved-views" && method === "GET") {
    return ok(tenant.settings.savedViews) as T;
  }

  if (pathname === "/api/settings/saved-views" && method === "PATCH") {
    tenant.settings.savedViews = {
      views: Array.isArray(body.views) ? deepClone(body.views) : [],
    };
    writeStore(store);
    return ok(tenant.settings.savedViews) as T;
  }

  if (pathname === "/api/settings/notification-preferences" && method === "GET") {
    return ok(tenant.settings.notificationPreferences) as T;
  }

  if (pathname === "/api/settings/notification-preferences" && method === "PATCH") {
    tenant.settings.notificationPreferences = {
      watches: Array.isArray(body.watches) ? deepClone(body.watches) : [],
    };
    writeStore(store);
    return ok(tenant.settings.notificationPreferences) as T;
  }

  if (pathname === "/api/settings/security" && method === "GET") {
    return ok(tenant.settings.security) as T;
  }

  if (pathname === "/api/settings/security" && method === "PATCH") {
    tenant.settings.security = mergeRecords(tenant.settings.security, body);
    writeStore(store);
    return ok(tenant.settings.security) as T;
  }

  if (pathname === "/api/messages" && method === "GET") {
    return ok(tenant.messages) as T;
  }

  if (pathname === "/api/messages/read-all" && method === "POST") {
    tenant.messages.threads = tenant.messages.threads.map((entry) => ({
      ...entry,
      unreadCount: 0,
    }));
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/messages/templates" && method === "PATCH") {
    tenant.messages.templates = Array.isArray(body.templates)
      ? deepClone(body.templates as MessagesContent["templates"])
      : [];
    writeStore(store);
    return ok({ templates: tenant.messages.templates }) as T;
  }

  if (/^\/api\/messages\/[^/]+$/.test(pathname) && method === "GET") {
    const threadId = decodeURIComponent(pathname.split("/").pop() || "");
    return ok({
      thread: tenant.messages.threads.find((entry) => entry.id === threadId) || null,
      messages: tenant.messages.messages.filter((entry) => entry.threadId === threadId),
    }) as T;
  }

  if (/^\/api\/messages\/[^/]+\/reply$/.test(pathname) && method === "POST") {
    const parts = pathname.split("/");
    const threadId = decodeURIComponent(parts[3] || "");
    const text = String(body.text || body.body || "").trim();
    const message = {
      id: makeId("msg"),
      threadId,
      sender: "me" as const,
      text,
      lang: "en",
      at: nowIso(),
    };
    tenant.messages.messages.push(message);
    tenant.messages.threads = tenant.messages.threads.map((entry) =>
      entry.id === threadId
        ? { ...entry, lastMessage: text || entry.lastMessage, lastAt: message.at, unreadCount: 0 }
        : entry
    );
    writeStore(store);
    return ok(message) as T;
  }

  if (/^\/api\/messages\/[^/]+\/read$/.test(pathname) && method === "PATCH") {
    const parts = pathname.split("/");
    const threadId = decodeURIComponent(parts[3] || "");
    tenant.messages.threads = tenant.messages.threads.map((entry) =>
      entry.id === threadId ? { ...entry, unreadCount: 0 } : entry
    );
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/notifications" && method === "GET") {
    return ok(tenant.notifications) as T;
  }

  if (pathname === "/api/notifications/read-all" && method === "POST") {
    tenant.notifications = tenant.notifications.map((entry) => ({
      ...entry,
      readAt: nowIso(),
    }));
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (/^\/api\/notifications\/[^/]+\/read$/.test(pathname) && method === "PATCH") {
    const parts = pathname.split("/");
    const id = decodeURIComponent(parts[3] || "");
    tenant.notifications = tenant.notifications.map((entry) =>
      String(entry.id) === id ? { ...entry, readAt: nowIso() } : entry
    );
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (/^\/api\/notifications\/[^/]+\/unread$/.test(pathname) && method === "PATCH") {
    const parts = pathname.split("/");
    const id = decodeURIComponent(parts[3] || "");
    tenant.notifications = tenant.notifications.map((entry) =>
      String(entry.id) === id ? { ...entry, readAt: null } : entry
    );
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/seller/dashboard" && method === "GET") {
    return ok({
      quickActions: [
        { key: "create-listing", label: "Create Listing", to: "/listings/new" },
        { key: "new-shipment", label: "New Shipment", to: "/ops/shipping" },
        { key: "request-payout", label: "Request Payout", to: "/finance/wallets" },
        { key: "start-promo", label: "Start Promo", to: "/mldz/promos/new" },
      ],
      hero: {
        name: "Demo Seller",
        sub: "Your seller workspace is ready. Start listing products and managing orders.",
        ctaLabel: "Create Listing",
        ctaTo: "/listings/new",
        chipWhenMLDZ: "Live tools active",
        chipWhenNoMLDZ: "6 promos running",
      },
      featured: {
        title: "Quick Start",
        sub: "Complete your first listing to activate your storefront.",
        ctaLabel: "Go to Listings",
        ctaTo: "/listings",
      },
      bases: {
        revenueBase: 9_480_000,
        ordersBase: 24,
        trustBase: 82,
      },
    }) as T;
  }

  if (pathname === "/api/seller/orders" && method === "GET") {
    return ok(tenant.seller) as T;
  }

  if (/^\/api\/seller\/orders\/[^/]+$/.test(pathname) && method === "GET") {
    const id = decodeURIComponent(pathname.split("/").pop() || "");
    return ok(
      tenant.seller.orders.find((entry) => String(entry.id) === id) || null
    ) as T;
  }

  if (pathname === "/api/seller/returns" && method === "GET") {
    return ok(tenant.seller.returns) as T;
  }

  if (pathname === "/api/seller/disputes" && method === "GET") {
    return ok(tenant.seller.disputes) as T;
  }

  if (pathname === "/api/reviews/summary" && method === "GET") {
    return ok({ total: 12, averageRating: 4.7 }) as T;
  }

  if (pathname === "/api/provider/bookings" && method === "GET") {
    return ok({ bookings: tenant.provider.bookings }) as T;
  }

  if (pathname === "/api/provider/reviews" && method === "GET") {
    return ok({ reviews: tenant.provider.reviews }) as T;
  }

  if (pathname === "/api/provider/service-command" && method === "GET") {
    return ok(tenant.provider.serviceCommand) as T;
  }

  if (pathname.startsWith("/api/workflow/screen-state/") && method === "GET") {
    const key = decodeURIComponent(pathname.split("/").pop() || "");
    return ok(tenant.workflow[key] || {}) as T;
  }

  if (pathname.startsWith("/api/workflow/screen-state/") && method === "PATCH") {
    const key = decodeURIComponent(pathname.split("/").pop() || "");
    tenant.workflow[key] = mergeRecords(tenant.workflow[key] || {}, body);
    writeStore(store);
    return ok(tenant.workflow[key]) as T;
  }

  if (pathname === "/api/onboarding" && method === "GET") {
    return ok(tenant.onboarding) as T;
  }

  if (pathname === "/api/onboarding" && method === "PATCH") {
    tenant.onboarding = mergeRecords(tenant.onboarding, body);
    writeStore(store);
    return ok(tenant.onboarding) as T;
  }

  if (pathname === "/api/onboarding/submit" && method === "POST") {
    tenant.onboarding = mergeRecords(tenant.onboarding, body);
    writeStore(store);
    return ok(tenant.onboarding) as T;
  }

  if (pathname === "/api/onboarding/reset" && method === "POST") {
    tenant.onboarding = {};
    writeStore(store);
    return ok({ ok: true }) as T;
  }

  if (pathname === "/api/onboarding/lookups" && method === "GET") {
    return ok({
      countries: ["Uganda", "Kenya", "Tanzania"],
      currencies: ["USD", "UGX", "KES"],
    }) as T;
  }

  if (pathname === "/api/account-approval" && method === "GET") {
    return ok({
      status: "APPROVED",
      checklist: [],
    }) as T;
  }

  if (pathname === "/api/audit-logs" && method === "GET") {
    return ok([]) as T;
  }

  return ok(fallbackFor(pathname, method, body)) as T;
}
