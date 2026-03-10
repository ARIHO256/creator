import type { DashboardContent } from "../shared/types";

export const providerDashboardContent: DashboardContent = {
  quickActions: [
    { key: "create-listing", label: "Create Listing", to: "/listings/wizard" },
    { key: "new-booking", label: "New Booking Slot", to: "/provider/bookings" },
    { key: "request-payout", label: "Request Payout", to: "/finance/wallets" },
    { key: "start-promo", label: "Start Promo", to: "/mldz/promos/new" },
    { key: "create-rma", label: "Create RMA", to: "/ops/returns" },
  ],
  hero: {
    name: "Provider",
    sub: "You are trending up. Keep response time tight for better ranking.",
    ctaLabel: "Go now",
    ctaTo: "/provider/bookings",
    chipWhenMLDZ: "Focused",
    chipWhenNoMLDZ: "Promo enabled",
  },
  featured: {
    title: "Top Service Package",
    sub: "Boost your leads with a premium offer.",
    ctaLabel: "Buy now",
    ctaTo: "/provider/quotes",
  },
  bases: {
    revenueBase: 180_000,
    ordersBase: 12,
    trustBase: 82,
  },
};
