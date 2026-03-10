import type { DashboardContent } from "../shared/types";

export const sellerDashboardContent: DashboardContent = {
  quickActions: [
    { key: "create-listing", label: "Create Listing", to: "/listings/new" },
    { key: "new-shipment", label: "New Shipment", to: "/ops/shipping" },
    { key: "request-payout", label: "Request Payout", to: "/finance/wallets" },
    { key: "start-promo", label: "Start Promo", to: "/mldz/promos/new" },
    { key: "create-rma", label: "Create RMA", to: "/ops/returns" },
  ],
  hero: {
    name: "Ronald",
    sub: "Best performer this period. Promo and marketplace conversions are lifting results.",
    ctaLabel: "Go now",
    ctaTo: "/orders",
    chipWhenMLDZ: "Focused",
    chipWhenNoMLDZ: "6 active",
  },
  featured: {
    title: "EV Charging Station Pro",
    sub: "Featured product for high intent buyers.",
    ctaLabel: "Buy now",
    ctaTo: "/listings",
  },
  bases: {
    revenueBase: 9_480_000,
    ordersBase: 21,
    trustBase: 75,
  },
};
