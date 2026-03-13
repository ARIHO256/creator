import type { OrdersContent } from "../shared/types";

export const providerOrdersContent: OrdersContent = {
  headline: "Bookings",
  subhead: "Track service orders, confirm schedules, and manage delivery.",
  bookings: [
    {
      id: "BK-9021",
      client: "GreenFleet Uganda",
      service: "Fleet Energy Audit",
      price: 320,
      currency: "USD",
      scheduledFor: "Today, 15:00",
      stage: "Confirmed",
    },
    {
      id: "BK-9020",
      client: "Kampala EV Hub",
      service: "Charger Installation",
      price: 180,
      currency: "USD",
      scheduledFor: "Tomorrow, 10:00",
      stage: "Requested",
    },
    {
      id: "BK-9019",
      client: "Urban Couture",
      service: "Workplace Charging Plan",
      price: 240,
      currency: "USD",
      scheduledFor: "Feb 21, 11:30",
      stage: "In progress",
    },
    {
      id: "BK-9018",
      client: "Skylink Stores",
      service: "Battery Diagnostics",
      price: 95,
      currency: "USD",
      scheduledFor: "Feb 19, 14:00",
      stage: "Completed",
    },
  ],
  stages: ["Requested", "Confirmed", "In progress", "Completed", "Canceled"],
};
