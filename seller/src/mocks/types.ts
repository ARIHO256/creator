import type { UserRole } from "../types/roles";
import type {
  ListingsContent,
  OrdersContent,
  MessagesContent,
  NotificationsContent,
} from "../mock/shared/types";
import type { PageContentMap } from "../mock/shared/pageContent";

export type MockUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  avatarUrl?: string;
  createdAt: string;
  preferences?: Record<string, unknown>;
  addresses?: Array<{
    id: string;
    label: string;
    line1: string;
    line2?: string;
    city: string;
    country: string;
    postalCode?: string;
    primary?: boolean;
  }>;
};

export type MockSession = {
  token: string;
  userId: string;
  createdAt: string;
  lastActiveAt: string;
};

export type MockListing = ListingsContent["rows"][number] & {
  sellerId?: string;
  sku?: string;
};

export type MockOrder = OrdersContent["orders"][number] & {
  buyerId?: string;
  lineItems?: Array<{ sku: string; name: string; qty: number; unit: number }>;
};

export type MockCartItem = {
  listingId: string;
  qty: number;
};

export type MockCart = {
  id: string;
  userId?: string;
  items: MockCartItem[];
  updatedAt: string;
};

export type MockFavorites = {
  userId?: string;
  listingIds: string[];
};

export type MockFollow = {
  userId?: string;
  sellerIds: string[];
};

export type MockMessages = MessagesContent;
export type MockNotifications = NotificationsContent;

export type MockDB = {
  version: number;
  seededAt: string;
  users: MockUser[];
  sessions: MockSession[];
  pageContent: PageContentMap;
  listings: MockListing[];
  orders: MockOrder[];
  cart: MockCart;
  favorites: MockFavorites;
  follows: MockFollow;
  messages: MockMessages;
  notifications: MockNotifications;
  modules: Record<string, unknown>;
};
