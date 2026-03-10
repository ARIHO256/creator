import { stableId } from "./id";
import type { MockDB } from "./types";
import { sellerDashboardContent } from "../mock/seller/dashboard";
import { providerDashboardContent } from "../mock/provider/dashboard";
import { sellerMessagesContent } from "../mock/seller/messages";
import { providerMessagesContent } from "../mock/provider/messages";
import { sellerNotificationsContent } from "../mock/seller/notifications";
import { providerNotificationsContent } from "../mock/provider/notifications";
import { sellerAnalyticsContent } from "../mock/seller/analytics";
import { providerAnalyticsContent } from "../mock/provider/analytics";
import { sellerHelpSupportContent } from "../mock/seller/helpSupport";
import { providerHelpSupportContent } from "../mock/provider/helpSupport";
import { sellerComplianceContent } from "../mock/seller/compliance";
import { providerComplianceContent } from "../mock/provider/compliance";
import { sellerListingsContent } from "../mock/seller/listings";
import { providerListingsContent } from "../mock/provider/listings";
import { sellerListingWizardContent } from "../mock/seller/listingWizard";
import { providerListingWizardContent } from "../mock/provider/listingWizard";
import { sellerOrdersContent } from "../mock/seller/orders";
import { providerOrdersContent } from "../mock/provider/orders";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const seedMockDb = (): MockDB => {
  const now = new Date().toISOString();

  const sellerId = stableId("user", "seller:evzone");
  const providerId = stableId("user", "provider:evzone");
  const buyerId = stableId("user", "buyer:evzone");

  const users = [
    {
      id: sellerId,
      role: "seller",
      name: "SellerSeller",
      email: "seller@demo.evzone",
      phone: "+256700000001",
      password: "demo1234",
      createdAt: now,
      avatarUrl: "/avatars/seller.png",
      preferences: { locale: "en", currency: "USD" },
      addresses: [
        {
          id: stableId("addr", "seller:main"),
          label: "HQ",
          line1: "Plot 4, Kampala Rd",
          city: "Kampala",
          country: "UG",
          primary: true,
        },
      ],
    },
    {
      id: providerId,
      role: "provider",
      name: "ProviderPro",
      email: "provider@demo.evzone",
      phone: "+256700000002",
      password: "demo1234",
      createdAt: now,
      avatarUrl: "/avatars/provider.png",
      preferences: { locale: "en", currency: "USD" },
      addresses: [
        {
          id: stableId("addr", "provider:main"),
          label: "Studio",
          line1: "Industrial Area",
          city: "Kampala",
          country: "UG",
          primary: true,
        },
      ],
    },
    {
      id: buyerId,
      role: "buyer",
      name: "Amina K.",
      email: "buyer@demo.evzone",
      phone: "+256700000003",
      password: "demo1234",
      createdAt: now,
      avatarUrl: "/avatars/buyer.png",
      preferences: { locale: "en", currency: "USD" },
      addresses: [
        {
          id: stableId("addr", "buyer:home"),
          label: "Home",
          line1: "Kololo Hill",
          city: "Kampala",
          country: "UG",
          primary: true,
        },
      ],
    },
  ];

  const listings = [
    ...clone(sellerListingsContent.rows).map((row) => ({
      ...row,
      sellerId,
      sku: row.id,
    })),
    ...clone(providerListingsContent.rows).map((row) => ({
      ...row,
      sellerId: providerId,
      sku: row.id,
    })),
  ];

  const orders = clone(sellerOrdersContent.orders).map((o) => ({
    ...o,
    buyerId,
    lineItems: [
      { sku: "EBK-48V-20AH", name: "E-Bike Battery Pack 48V 20Ah", qty: 2, unit: 280 },
      { sku: "CHG-54V-5A", name: "Fast Charger 54.6V 5A", qty: 1, unit: 85 },
    ],
  }));

  return {
    version: 1,
    seededAt: now,
    users,
    sessions: [],
    pageContent: {
      dashboard: { seller: clone(sellerDashboardContent), provider: clone(providerDashboardContent) },
      messages: { seller: clone(sellerMessagesContent), provider: clone(providerMessagesContent) },
      notifications: { seller: clone(sellerNotificationsContent), provider: clone(providerNotificationsContent) },
      analytics: { seller: clone(sellerAnalyticsContent), provider: clone(providerAnalyticsContent) },
      helpSupport: { seller: clone(sellerHelpSupportContent), provider: clone(providerHelpSupportContent) },
      compliance: { seller: clone(sellerComplianceContent), provider: clone(providerComplianceContent) },
      listings: { seller: clone(sellerListingsContent), provider: clone(providerListingsContent) },
      listingWizard: { seller: clone(sellerListingWizardContent), provider: clone(providerListingWizardContent) },
      orders: { seller: clone(sellerOrdersContent), provider: clone(providerOrdersContent) },
    },
    listings,
    orders,
    cart: {
      id: stableId("cart", "default"),
      userId: buyerId,
      items: listings.slice(0, 2).map((item) => ({ listingId: item.id, qty: 1 })),
      updatedAt: now,
    },
    favorites: {
      userId: buyerId,
      listingIds: listings.slice(0, 2).map((l) => l.id),
    },
    follows: {
      userId: buyerId,
      sellerIds: [sellerId],
    },
    messages: clone(sellerMessagesContent),
    notifications: clone(sellerNotificationsContent),
    modules: {},
  };
};
