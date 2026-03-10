import type { AnalyticsContent } from "../shared/types";

export const providerAnalyticsContent: AnalyticsContent = {
  marketplaceOptions: ["All", "ServiceMart", "Consultations", "MyLiveDealz"],
  overviewKpis: [
    { label: "Income", value: "USD 128k", delta: "+8%", hint: "vs previous" },
    { label: "Bookings", value: "146", delta: "+5%", hint: "confirmed" },
    { label: "Quote acceptance", value: "42%", delta: "+3%", hint: "win rate" },
    { label: "Cancellations", value: "2.1%", delta: "-0.4%", hint: "lower is better" },
  ],
  attributionRows: [
    { channel: "Search", share: 28, roas: 2.4, note: "High intent queries drive consult bookings." },
    { channel: "Referral", share: 22, roas: 3.1, note: "Partner referrals convert well." },
    { channel: "ServiceMart", share: 20, roas: 2.0, note: "Marketplace visibility boosts inbound." },
    { channel: "Creator", share: 16, roas: 1.8, note: "MyLiveDealz showcases lift acceptance." },
    { channel: "Direct", share: 14, roas: 2.3, note: "Repeat clients returning for services." },
  ],
  highlights: {
    topDriver: "Faster response times lifted quote acceptance this week.",
    risk: "Acceptance dipped in ServiceMart, review pricing and SLA coverage.",
    recommendation: "Creators perform best when service pages highlight credentials and availability.",
  },
  cohort: {
    subtitle: "Retention by week since first booking",
    bullets: [
      "Compare cohort decay between channels to spot service-fit differences.",
      "Use cohorts to measure MyLiveDealz exposure vs baseline bookings.",
      "Trigger alerts if retention drops below your threshold.",
    ],
  },
  alertRules: [
    { id: "a1", name: "Bookings drop", metric: "Bookings", condition: "drops", threshold: 12, window: "7D", enabled: true },
    { id: "a2", name: "Income spike", metric: "Income", condition: "rises", threshold: 15, window: "30D", enabled: true },
    { id: "a3", name: "Cancellations exceed", metric: "Cancellations", condition: "exceeds", threshold: 4, window: "7D", enabled: false },
  ],
  metricOptions: ["Bookings", "Income", "Quote acceptance", "Cancellations"],
};
