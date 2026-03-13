import type { HelpSupportContent } from "../shared/types";

export const providerHelpSupportContent: HelpSupportContent = {
  kb: [
    { id: "kb-201", cat: "Getting Started", title: "Publish your first service listing", url: "#" },
    { id: "kb-202", cat: "Bookings", title: "Manage availability and booking slots", url: "#" },
    { id: "kb-203", cat: "Quotes", title: "Convert requests into proposals", url: "#" },
    { id: "kb-204", cat: "Consultations", title: "Set up call links and reminders", url: "#" },
    { id: "kb-205", cat: "Payments", title: "Earnings and payout overview", url: "#" },
    { id: "kb-206", cat: "Compliance", title: "Insurance and credential requirements", url: "#" },
    { id: "kb-207", cat: "MyLiveDealz", title: "Showcase services in Live Sessionz", url: "#" },
  ],
  faq: [
    { q: "How do I set availability windows?", a: "Open Bookings → Availability and set recurring slots." },
    { q: "Where can I track quote stages?", a: "Go to Provider Quotes and filter by stage." },
    { q: "How do I reschedule consultations?", a: "Open Consultations → Select a session → Reschedule." },
  ],
  status: [
    { id: "st-1", name: "Bookings", state: "Operational" },
    { id: "st-2", name: "Quotes", state: "Operational" },
    { id: "st-3", name: "Earnings and payouts", state: "Operational" },
    { id: "st-4", name: "MyLiveDealz", state: "Operational" },
  ],
  tickets: [
    { id: "SUP-33021", createdAt: "2025-10-15 08:40", status: "Open", marketplace: "ServiceMart", category: "Bookings", subject: "Client requested reschedule", severity: "Low", ref: "BK-9021" },
    { id: "SUP-33020", createdAt: "2025-10-14 16:10", status: "In Progress", marketplace: "ServiceMart", category: "Compliance", subject: "Insurance certificate upload", severity: "Medium" },
    { id: "SUP-33019", createdAt: "2025-10-14 09:52", status: "Waiting", marketplace: "Consultations", category: "Consultations", subject: "Call link not working", severity: "High", ref: "CS-120" },
    { id: "SUP-33018", createdAt: "2025-10-13 11:31", status: "Resolved", marketplace: "MyLiveDealz", category: "Promos", subject: "Service reel preview not loading", severity: "Low" },
  ],
  formDefaults: {
    marketplace: "ServiceMart",
    category: "Bookings",
    severity: "Low",
    subject: "",
    ref: "",
    email: "",
    phone: "",
    desc: "",
    sla: "4h",
  },
  marketplaceOptions: ["ServiceMart", "Consultations", "MyLiveDealz"],
  categoryOptions: ["Bookings", "Quotes", "Consultations", "Payments", "Promos", "Compliance", "Accounts"],
  refLabel: "Booking/Quote/Session Ref (optional)",
  refPlaceholder: "BK‑9021 / Q‑418 / CS‑120",
};
