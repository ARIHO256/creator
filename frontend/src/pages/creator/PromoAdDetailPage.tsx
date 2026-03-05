import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Copy, ExternalLink, Link2, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { usePromoAdDetailQuery } from "../../hooks/api/useAdzRuntime";
import { adStatusLabel, formatCurrency, formatDateTime, getCampaignCurrency, getCampaignOffers, getCampaignPerformance, statusTone } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

function parsePromoId(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const value = params.get("promoId") || params.get("adId") || undefined;
  return value?.trim() || undefined;
}

function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
      : tone === "warn"
        ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
        : tone === "bad"
          ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300"
          : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300";
  return <span className={cx("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", toneClass)}>{label}</span>;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-lg font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function LinkRow({
  label,
  description,
  url,
  onCopy
}: {
  label: string;
  description: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>
          <div className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">{url}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button
            type="button"
            onClick={() => window.open(url, "_blank")}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </button>
        </div>
      </div>
    </div>
  );
}


function getNestedName(value: Record<string, unknown>, key: string): string {
  const nested = value[key];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return "";
  return String((nested as Record<string, unknown>).name || "");
}

function ActionButton({ onClick, icon, children, tone = "default" }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; tone?: "default" | "primary" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition",
        tone === "primary"
          ? "bg-[#f77f00] text-white hover:brightness-95"
          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function PromoAdDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();
  const promoId = useMemo(() => parsePromoId(location.search), [location.search]);
  const promoQuery = usePromoAdDetailQuery(promoId, { enabled: Boolean(promoId) });
  const [activeTab, setActiveTab] = useState<"share" | "performance">("share");

  const campaign = promoQuery.data?.campaign;
  const performance = getCampaignPerformance(campaign);
  const currency = getCampaignCurrency(campaign);
  const offers = getCampaignOffers(campaign);
  const links = Array.isArray(promoQuery.data?.links) ? promoQuery.data?.links : [];

  if (!promoId) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
        <PageHeader pageTitle="Promo Ad Detail" />
        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <SectionCard title="No promo selected" subtitle="Open a promo detail page from Adz Dashboard or Adz Manager.">
            <ActionButton onClick={() => navigate("/AdzDashboard")} icon={<Sparkles className="h-4 w-4" />} tone="primary">
              Open Adz Dashboard
            </ActionButton>
          </SectionCard>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] dark:bg-slate-950 transition-colors">
      <PageHeader
        pageTitle="Promo Ad Detail"
        badge={
          campaign ? (
            <div className="flex flex-wrap items-center gap-2">
              <Pill label={adStatusLabel(campaign.status)} tone={statusTone(campaign.status)} />
              <Pill label={`${performance.clicks.toLocaleString()} clicks`} />
            </div>
          ) : undefined
        }
        rightContent={
          campaign ? (
            <div className="flex items-center gap-2">
              <ActionButton onClick={() => navigate(`/ad-builder?adId=${encodeURIComponent(campaign.id)}`)} icon={<Wand2 className="h-4 w-4" />}>
                Open builder
              </ActionButton>
              <ActionButton onClick={() => navigate(`/AdzManager?adId=${encodeURIComponent(campaign.id)}`)} icon={<BarChart3 className="h-4 w-4" />} tone="primary">
                Open manager
              </ActionButton>
            </div>
          ) : undefined
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {promoQuery.isLoading ? (
          <SectionCard title="Loading promo detail" subtitle="Fetching campaign payload and tracked links from the backend.">
            <div className="text-sm text-slate-500 dark:text-slate-400">Preparing your promo ad surface…</div>
          </SectionCard>
        ) : promoQuery.isError || !campaign ? (
          <SectionCard title="Promo detail unavailable" subtitle="This promo could not be loaded.">
            <div className="text-sm text-rose-700 dark:text-rose-300">Return to the dashboard and open the campaign again.</div>
          </SectionCard>
        ) : (
          <>
            <SectionCard title={campaign.campaignName} subtitle={`${campaign.supplier?.name || "Unassigned seller"} · ${campaign.campaignSubtitle || "Published campaign"}`}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 transition-colors">
                  {campaign.heroImageUrl ? (
                    <img src={campaign.heroImageUrl} alt={campaign.campaignName} className="h-full min-h-[220px] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center text-slate-400 dark:text-slate-500">
                      <Sparkles className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <MetricTile label="Start" value={formatDateTime(campaign.startISO)} hint="From builder publish payload" />
                  <MetricTile label="End" value={formatDateTime(campaign.endISO)} hint="Campaign runtime window" />
                  <MetricTile label="Earnings" value={formatCurrency(currency, performance.earnings)} hint="Attributed to this campaign" />
                  <MetricTile label="Offers" value={String(offers.length)} hint="Published promo offer count" />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Pill label={adStatusLabel(campaign.status)} tone={statusTone(campaign.status)} />
                {(campaign.platforms || []).map((platform) => <Pill key={platform} label={platform} />)}
              </div>
            </SectionCard>

            <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-800 px-5 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("share")}
                    className={cx(
                      "rounded-t-2xl border border-b-0 px-4 py-2 text-sm font-semibold transition-colors",
                      activeTab === "share"
                        ? "border-[#f77f00] bg-[#fff4e5] text-[#c26100] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    Share & links
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("performance")}
                    className={cx(
                      "rounded-t-2xl border border-b-0 px-4 py-2 text-sm font-semibold transition-colors",
                      activeTab === "performance"
                        ? "border-[#f77f00] bg-[#fff4e5] text-[#c26100] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    Performance & earnings
                  </button>
                </div>
              </div>

              <div className="p-5">
                {activeTab === "share" ? (
                  <div className="space-y-4">
                    {links.length ? (
                      links.map((link, index) => (
                        <LinkRow
                          key={String(link.id || index)}
                          label={String(link.title || `Tracking link ${index + 1}`)}
                          description={String(link.subtitle || getNestedName(link, "supplier") || "Tracked promo link")}
                          url={String(link.shortUrl || link.primaryUrl || "")}
                          onCopy={() => {
                            const value = String(link.shortUrl || link.primaryUrl || "");
                            void navigator.clipboard.writeText(value);
                            showNotification("Promo link copied.");
                          }}
                        />
                      ))
                    ) : (
                      <LinkRow
                        label="Primary campaign link"
                        description="Generated from the published campaign payload."
                        url={`https://mylivedealz.com/promo/${campaign.id}`}
                        onCopy={() => {
                          void navigator.clipboard.writeText(`https://mylivedealz.com/promo/${campaign.id}`);
                          showNotification("Primary promo link copied.");
                        }}
                      />
                    )}

                    <SectionCard title="Published offers" subtitle="The promo detail page is now reading the same offer payload the builder published.">
                      <div className="space-y-3">
                        {offers.length ? offers.map((offer, index) => (
                          <div key={String(offer.id || index)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{String(offer.name || `Offer ${index + 1}`)}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {[offer.type, offer.currency && offer.price !== undefined ? `${offer.currency} ${offer.price}` : null, offer.stockLeft !== undefined ? `${offer.stockLeft} left` : null]
                                .filter(Boolean)
                                .join(" · ") || "Published offer"}
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                            No offers were attached to this promo.
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <MetricTile label="Clicks" value={performance.clicks.toLocaleString()} />
                      <MetricTile label="Purchases" value={performance.purchases.toLocaleString()} />
                      <MetricTile label="Conversion" value={`${performance.conversionPct.toFixed(1)}%`} />
                      <MetricTile label="Earnings" value={formatCurrency(currency, performance.earnings)} />
                    </div>

                    <SectionCard title="Performance by platform" subtitle="Read directly from the campaign reporting payload.">
                      <div className="space-y-3">
                        {(performance.byPlatform || []).length ? (
                          performance.byPlatform?.map((entry) => (
                            <div key={entry.platform} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{entry.platform}</div>
                                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{entry.clicks.toLocaleString()} clicks</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{entry.purchases.toLocaleString()} purchases</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-500 dark:text-slate-400">
                            No per-platform performance rows are available yet.
                          </div>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title="Execution routes" subtitle="Jump straight into the linked runtime screens.">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton onClick={() => navigate(`/AdzManager?adId=${encodeURIComponent(campaign.id)}`)} icon={<BarChart3 className="h-4 w-4" />}>
                          Open manager
                        </ActionButton>
                        <ActionButton onClick={() => navigate(`/ad-builder?adId=${encodeURIComponent(campaign.id)}`)} icon={<Wand2 className="h-4 w-4" />}>
                          Open builder
                        </ActionButton>
                        <ActionButton onClick={() => navigate("/link-tools")} icon={<Link2 className="h-4 w-4" />}>
                          Link tools
                        </ActionButton>
                      </div>
                    </SectionCard>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export { PromoAdDetailPage };
