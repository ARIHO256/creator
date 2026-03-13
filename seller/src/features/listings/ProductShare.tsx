import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocalization } from "../../localization/LocalizationProvider";

const FALLBACK_LISTINGS = [
  { sku: "WBX-7KW-BLK", title: "7kW Wallbox (Black)", channel: "EVmart", category: "Chargers", price: 299, currency: "USD", description: "Smart EV wallbox with app control and scheduled charging.", inventory: 42, status: "Live", updated: "Today, 10:12" },
  { sku: "EVC-PORT-CCS2", title: "CCS2 Port Kit", channel: "EVmart", category: "Adapters", price: 69, currency: "USD", description: "Universal CCS2 conversion kit for legacy wall chargers.", inventory: 7, status: "Pending", updated: "Yesterday" },
  { sku: "PPE-MASK-50", title: "Surgical Masks (50 pack)", channel: "HealthMart", category: "Pharmacy/OTC", price: 12, currency: "USD", description: "Medical grade disposable masks (box of 50).", inventory: 320, status: "Live", updated: "2d ago" },
  { sku: "STYLE-TEE-XL-BK", title: "EVzone Tee — XL Black", channel: "StyleMart", category: "T‑Shirts", price: 18, currency: "USD", description: "Classic EVzone logo tee, heavy cotton, unisex fit.", inventory: 0, status: "Rejected", updated: "2d ago" },
  { sku: "GAD-WATCH-UL", title: "Smart Watch Ultra", channel: "GadgetMart", category: "Wearables", price: 139, currency: "USD", description: "Rugged AMOLED smart watch with LTE and 7‑day battery.", inventory: 15, status: "Draft", updated: "3d ago" },
];

function loadListings() {
  try {
    const stored = JSON.parse(localStorage.getItem("seller_listings_share_v1") || localStorage.getItem("seller_listings_v1") || "[]");
    if (Array.isArray(stored) && stored.length) return stored;
  } catch (error) {
    console.warn("Failed to load stored listings for share page", error);
  }
  return FALLBACK_LISTINGS;
}

export default function ProductShare() {
  const { t } = useLocalization();
  const { sku } = useParams();
  const listings = useMemo(loadListings, []);
  const targetSku = (sku || "").trim().toLowerCase();
  let item = listings.find((entry) => (entry.sku || "").toLowerCase() === targetSku);

  if (!item && typeof window !== "undefined") {
    try {
      const cached = JSON.parse(sessionStorage.getItem("seller_share_current") || "null");
      if (cached && (cached.sku || "").toLowerCase() === targetSku) {
        item = cached;
      }
    } catch { }
    if (!item) {
      try {
        const last = JSON.parse(localStorage.getItem("seller_share_last") || "null");
        if (last && (last.sku || "").toLowerCase() === targetSku) {
          item = last;
        }
      } catch { }
    }
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#e2e8f0] bg-white dark:bg-slate-900 px-8 py-12 text-center shadow-xl">
          <h1 className="text-2xl font-extrabold text-[#111827] flex items-center justify-center gap-2">
            <img src="/logo2.jpeg" alt={t('EVzone logo')} className="h-8 w-8 rounded-lg border border-gray-200 dark:border-slate-800 object-contain" />
            <span>{t('Product not found')}</span>
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            {t("The item you're looking for is no longer available on EVzone. Browse the marketplace to discover similar products.")}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/" className="inline-flex items-center justify-center rounded-full bg-[#03CD8C] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#02b97e]">
              {t('Go to EVzone home')}
            </Link>
            <Link to="/listings" className="text-sm font-semibold text-[#03CD8C] hover:underline">
              {t('Seller? Return to dashboard')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { title, channel, category, price, currency, description, inventory, status, updated } = item;
  const statusTone = status === "Live" ? "#03CD8C" : status === "Pending" ? "#F77F00" : status === "Rejected" ? "#6b7280" : "#64748b";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 px-4 py-10">
      <div className="w-full flex flex-col gap-6 md:flex-row">
        <section className="flex-1">
          <div className="relative overflow-hidden rounded-3xl border border-[#e2e8f0] bg-white dark:bg-slate-900 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.45)]">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#03CD8C]/15 via-white to-[#fef9f4]" />
            <div className="flex flex-col gap-6 p-8 md:flex-row md:items-start">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#03CD8C]/30 bg-[#ecfdf5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#047857]">
                  {channel}
                </span>
                <h1 className="mt-4 text-3xl font-black text-[#111827] flex items-center gap-3">
                  <img src="/logo2.jpeg" alt={t('EVzone logo')} className="h-9 w-9 rounded-lg border border-gray-200 dark:border-slate-800 object-contain" />
                  <span>{title}</span>
                </h1>
                <p className="mt-3 text-sm text-gray-600">{description || t("Discover more on EVzone — the unified marketplace for smart commerce.")}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-semibold text-[#111827]">
                  <span className="text-2xl font-black">{currency} {Number(price || 0).toFixed(2)}</span>
                  <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-semibold text-gray-600">{category}</span>
                  <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-xs font-semibold text-gray-700 dark:text-slate-300">{t('Stock:')} {inventory ?? 0}</span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: statusTone }}>{status || t('Draft')}</span>
                </div>
                <div className="mt-4 text-xs text-gray-500">{t('Updated')} {updated || "—"}</div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-full bg-[#03CD8C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#02b97e]"
                  >
                    {t('Visit EVzone Marketplace')}
                  </Link>
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center rounded-full border border-[#03CD8C] px-5 py-3 text-sm font-semibold text-[#03CD8C] transition hover:bg-[#ecfdf5]"
                  >
                    {t('Sign in to sell yours')}
                  </Link>
                </div>
              </div>
              <div className="flex w-full max-w-[260px] flex-col items-center gap-4">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#0f172a] text-white shadow-lg">
                  <div className="flex h-full flex-col justify-between p-4">
                    <div>
                      <span className="rounded-full bg-white dark:bg-slate-900/20 px-3 py-1 text-xs font-semibold">{t('EVzone Promo')}</span>
                      <h2 className="mt-4 text-lg font-bold">{title.slice(0, 34)}</h2>
                    </div>
                    <div className="text-sm text-white/70">
                      <p>{currency} {Number(price || 0).toFixed(2)}</p>
                      <p>{channel}</p>
                    </div>
                  </div>
                </div>
                <div className="w-full rounded-2xl border border-dashed border-[#94a3b8] bg-white dark:bg-slate-900/60 p-4 text-center text-xs text-gray-500">
                  {t('This preview is a static sample. Integrate your storefront to serve live product photos and videos.')}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
