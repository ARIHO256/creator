import type { AnalyticsContent } from "../shared/types";

export const sellerAnalyticsContent: AnalyticsContent = {
  marketplaceOptions: ["All", "EVmart", "GadgetMart", "LivingMart", "ExpressMart", "MyLiveDealz"],
  overviewKpis: [
    { label: "Revenue", value: "CNY 9.48M", delta: "+12%", hint: "vs previous" },
    { label: "Orders", value: "2,104", delta: "+6%", hint: "fulfilled" },
    { label: "Conversion", value: "3.8%", delta: "-0.4%", hint: "checkout" },
    { label: "Refunds", value: "1.2%", delta: "-0.1%", hint: "lower is better" },
  ],
  attributionRows: [
    { channel: "Organic", share: 34, roas: 2.8, note: "Strong intent, stable growth." },
    { channel: "Creator", share: 26, roas: 2.2, note: "MyLiveDealz spikes on Live days." },
    { channel: "Paid", share: 18, roas: 1.6, note: "Optimize creatives and landing experience." },
    { channel: "Referral", share: 12, roas: 2.9, note: "Partner links convert well." },
    { channel: "Direct", share: 10, roas: 2.1, note: "Brand recall and repeat buyers." },
  ],
  highlights: {
    topDriver: "Creator traffic increased conversion on Live days.",
    risk: "Conversion dipped in ExpressMart, review checkout friction.",
    recommendation: "Creators perform best when product pages are optimized and stock is healthy.",
  },
  cohort: {
    subtitle: "Retention by week since first purchase",
    bullets: [
      "Compare cohort decay between marketplaces to spot product-fit differences.",
      "Use cohorts to measure promo impact (MyLiveDealz) vs baseline.",
      "Trigger alerts if retention drops below your threshold.",
    ],
  },
  alertRules: [
    { id: "a1", name: "Conversion drop", metric: "Conversion", condition: "drops", threshold: 10, window: "7D", enabled: true },
    { id: "a2", name: "Revenue spike", metric: "Revenue", condition: "rises", threshold: 15, window: "30D", enabled: true },
    { id: "a3", name: "Refunds exceed", metric: "Refunds", condition: "exceeds", threshold: 4, window: "7D", enabled: false },
  ],
  metricOptions: ["Conversion", "Revenue", "CTR", "Refunds"],
};
