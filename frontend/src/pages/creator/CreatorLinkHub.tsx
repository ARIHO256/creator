import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, Copy, ExternalLink, Link2, Pin, PinOff, Plus, Save, Search, Share2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { useNotification } from "../../contexts/NotificationContext";
import { LinkToolsDrawer } from "./NewLinkPage";
import { useLinkQuery, useLinksQuery, useUpdateLinkMutation } from "../../hooks/api/useAdzRuntime";
import type { LinkRecord, UpdateLinkInput } from "../../api/types";
import { formatCurrency } from "../../utils/runtimeData";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

type HubTab = "live" | "shoppable";

type StatusFilter = "all" | "active" | "scheduled" | "paused" | "draft" | "expired";

function titleCase(value: string | undefined): string {
  return String(value || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
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

function LinkListItem({ link, active, onSelect, onTogglePin }: { link: LinkRecord; active: boolean; onSelect: () => void; onTogglePin: () => void }) {
  const metrics = link.metrics || { clicks: 0, purchases: 0, earnings: 0, currency: "USD" };
  const statusClass = link.status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
    : link.status === "scheduled"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "w-full rounded-3xl border p-4 text-left transition-colors",
        active
          ? "border-[#f77f00] bg-orange-50/70 dark:border-[#f77f00] dark:bg-orange-950/10"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", statusClass)}>{titleCase(link.status)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{titleCase(link.tab)}</span>
          </div>
          <div className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{link.title}</div>
          <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{link.subtitle || link.primaryUrl}</div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTogglePin();
          }}
          className="rounded-2xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-200"
          aria-label={link.pinned ? "Unpin link" : "Pin link"}
        >
          {link.pinned ? <Pin className="h-4 w-4 text-[#f77f00]" /> : <PinOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{Number(metrics.clicks || 0).toLocaleString()}</div>
          <div className="text-slate-500 dark:text-slate-400">Clicks</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{Number(metrics.purchases || 0).toLocaleString()}</div>
          <div className="text-slate-500 dark:text-slate-400">Purchases</div>
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(String(metrics.currency || "USD"), Number(metrics.earnings || 0))}</div>
          <div className="text-slate-500 dark:text-slate-400">Earnings</div>
        </div>
      </div>
    </button>
  );
}

type CreatorLinksHubProps = {
  onChangePage?: (page: string) => void;
  initialOpenNewLinkDrawer?: boolean;
};

export default function CreatorLinksHubV3Fixed({ initialOpenNewLinkDrawer = false }: CreatorLinksHubProps): JSX.Element {
  const { showError, showSuccess } = useNotification();
  const [tab, setTab] = useState<HubTab>("live");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(initialOpenNewLinkDrawer);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState("active");
  const [note, setNote] = useState("");
  const [pinned, setPinned] = useState(false);

  const linksQuery = useLinksQuery({
    q: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    tab
  });
  const linkDetailQuery = useLinkQuery(selectedId, { enabled: Boolean(selectedId) });
  const updateLinkMutation = useUpdateLinkMutation();

  const links = linksQuery.data?.items ?? [];
  const selectedLink = linkDetailQuery.data ?? links.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && links.some((item) => item.id === selectedId)) return;
    if (links.length) {
      setSelectedId(links[0].id);
      return;
    }
    setSelectedId(undefined);
  }, [links, selectedId]);

  useEffect(() => {
    if (!selectedLink) return;
    setTitle(selectedLink.title || "");
    setSubtitle(selectedLink.subtitle || "");
    setPrimaryUrl(selectedLink.primaryUrl || "");
    setShortUrl(selectedLink.shortUrl || "");
    setCampaignName(String(selectedLink.campaign?.name || ""));
    setSupplierName(String(selectedLink.supplier?.name || ""));
    setStatus(String(selectedLink.status || "active"));
    setNote(String(selectedLink.note || ""));
    setPinned(Boolean(selectedLink.pinned));
  }, [selectedLink]);

  const totals = useMemo(() => {
    return links.reduce(
      (accumulator, link) => {
        const metrics = link.metrics || { clicks: 0, purchases: 0, earnings: 0 };
        accumulator.clicks += Number(metrics.clicks || 0);
        accumulator.purchases += Number(metrics.purchases || 0);
        accumulator.earnings += Number(metrics.earnings || 0);
        accumulator.pinned += link.pinned ? 1 : 0;
        return accumulator;
      },
      { clicks: 0, purchases: 0, earnings: 0, pinned: 0 }
    );
  }, [links]);

  const handleSave = async () => {
    if (!selectedLink) return;
    const payload: UpdateLinkInput = {
      tab,
      title: title.trim(),
      subtitle: subtitle.trim(),
      status,
      primaryUrl: primaryUrl.trim(),
      shortUrl: shortUrl.trim(),
      campaign: {
        ...(selectedLink.campaign || {}),
        name: campaignName.trim()
      },
      supplier: {
        ...(selectedLink.supplier || {}),
        name: supplierName.trim()
      },
      note: note.trim(),
      pinned
    };

    try {
      await updateLinkMutation.mutateAsync({ linkId: selectedLink.id, payload });
      showSuccess("Tracked link updated from backend state.");
    } catch {
      showError("Tracked link could not be updated.");
    }
  };

  const handleTogglePin = async (link: LinkRecord) => {
    try {
      await updateLinkMutation.mutateAsync({
        linkId: link.id,
        payload: { pinned: !link.pinned }
      });
      showSuccess(link.pinned ? "Link unpinned." : "Link pinned for quick access.");
    } catch {
      showError("Pin state could not be updated.");
    }
  };

  const selectedMetrics = selectedLink?.metrics || { clicks: 0, purchases: 0, earnings: 0, currency: "USD", conversionPct: 0 };
  const selectedChannels = Array.isArray(selectedLink?.channels) ? selectedLink.channels : [];
  const selectedVariants = Array.isArray(selectedLink?.regionVariants) ? selectedLink.regionVariants : [];
  const sharePack = selectedLink?.sharePack;

  return (
    <div className="min-h-screen bg-[#f2f2f2] text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle="Link Tools"
        badge={<span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-semibold">/api/links powered</span>}
        rightContent={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            New tracked link
          </button>
        }
      />

      <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Tracked links" value={links.length.toString()} hint={`${totals.pinned} pinned`} />
          <MetricCard label="Clicks" value={totals.clicks.toLocaleString()} hint="Current tab filter" />
          <MetricCard label="Purchases" value={totals.purchases.toLocaleString()} hint="Attributed conversions" />
          <MetricCard label="Earnings" value={formatCurrency("USD", totals.earnings)} hint="Tracked-link revenue" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <SectionCard title="Library" subtitle="Filter and open live-session links or shoppable-ad links from the backend.">
              <div className="mb-4 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["live", "shoppable"] as HubTab[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTab(option)}
                      className={cx(
                        "rounded-2xl px-3 py-2 text-sm font-semibold capitalize transition-colors",
                        tab === option
                          ? "bg-[#f77f00] text-white"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, campaign, supplier, or channel"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-10 pr-3 text-sm"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  {(["all", "active", "scheduled", "paused", "draft", "expired"] as StatusFilter[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      className={cx(
                        "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                        statusFilter === option
                          ? "bg-[#f77f00] text-white"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {links.map((link) => (
                  <LinkListItem
                    key={link.id}
                    link={link}
                    active={link.id === selectedId}
                    onSelect={() => setSelectedId(link.id)}
                    onTogglePin={() => void handleTogglePin(link)}
                  />
                ))}
                {!links.length ? <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400">No tracked links matched the current filter.</div> : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Link detail" subtitle="Update the selected tracked link and save it straight back to /api/links/:id.">
              {selectedLink ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Link title
                      <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Subtitle
                      <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Primary URL
                      <input value={primaryUrl} onChange={(event) => setPrimaryUrl(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Short URL
                      <input value={shortUrl} onChange={(event) => setShortUrl(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Status
                      <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                        <option value="active">Active</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="paused">Paused</option>
                        <option value="draft">Draft</option>
                        <option value="expired">Expired</option>
                      </select>
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Campaign
                      <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Supplier / seller
                      <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Internal note
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setPinned((current) => !current)}
                      className={cx(
                        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                        pinned
                          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-300"
                          : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      )}
                    >
                      {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                      {pinned ? "Pinned" : "Pin link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText(shortUrl || primaryUrl)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <Copy className="h-4 w-4" />
                      Copy short link
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(primaryUrl || selectedLink.primaryUrl, "_blank", "noopener,noreferrer")}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open link
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={updateLinkMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#f77f00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">Choose a link from the library to review or edit it.</div>
              )}
            </SectionCard>

            {selectedLink ? (
              <>
                <SectionCard title="Performance" subtitle="The metrics below are read directly from the selected tracked link payload.">
                  <div className="grid gap-4 md:grid-cols-4">
                    <MetricCard label="Clicks" value={Number(selectedMetrics.clicks || 0).toLocaleString()} />
                    <MetricCard label="Purchases" value={Number(selectedMetrics.purchases || 0).toLocaleString()} />
                    <MetricCard label="Conversion" value={`${Number(selectedMetrics.conversionPct || 0).toFixed(1)}%`} />
                    <MetricCard label="Earnings" value={formatCurrency(String(selectedMetrics.currency || "USD"), Number(selectedMetrics.earnings || 0))} />
                  </div>
                </SectionCard>

                <SectionCard title="Channel variants" subtitle="Saved channel and region links used by replay distribution and ad sharing.">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Link2 className="h-4 w-4 text-[#f77f00]" />
                        Channels
                      </div>
                      <div className="space-y-3">
                        {selectedChannels.map((channel) => (
                          <div key={`${channel.name}_${channel.url}`} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{channel.name}</div>
                                <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{channel.url}</div>
                                {channel.hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{channel.hint}</div> : null}
                              </div>
                              <button type="button" onClick={() => void copyText(channel.url)} className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Copy
                              </button>
                            </div>
                          </div>
                        ))}
                        {!selectedChannels.length ? <div className="text-sm text-slate-500 dark:text-slate-400">No channel variants stored yet.</div> : null}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <Share2 className="h-4 w-4 text-[#f77f00]" />
                        Region variants
                      </div>
                      <div className="space-y-3">
                        {selectedVariants.map((variant) => (
                          <div key={`${variant.region}_${variant.url}`} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{variant.region}</div>
                                <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{variant.url}</div>
                                {variant.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{variant.note}</div> : null}
                              </div>
                              <button type="button" onClick={() => void copyText(variant.url)} className="rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Copy
                              </button>
                            </div>
                          </div>
                        ))}
                        {!selectedVariants.length ? <div className="text-sm text-slate-500 dark:text-slate-400">No region variants stored yet.</div> : null}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Share pack" subtitle="Reusable copy stored with the tracked link so handoff stays backend-backed.">
                  {sharePack ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Headline</div>
                        <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{sharePack.headline}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bullets</div>
                        <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                          {(sharePack.bullets || []).map((bullet) => (
                            <li key={bullet} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2">{bullet}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Captions</div>
                        <div className="mt-2 space-y-3">
                          {(sharePack.captions || []).map((caption) => (
                            <div key={`${caption.platform}_${caption.text}`} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{caption.platform}</div>
                              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{caption.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">No share pack saved for this link yet.</div>
                  )}
                </SectionCard>

                <SectionCard title="Analytics signal" subtitle="Quick backend summary of the selected tracked link.">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                    <BarChart3 className="h-4 w-4 text-[#f77f00]" />
                    {selectedLink.title} is currently {titleCase(selectedLink.status)} with {Number(selectedMetrics.clicks || 0).toLocaleString()} clicks and {Number(selectedMetrics.purchases || 0).toLocaleString()} purchases.
                  </div>
                </SectionCard>
              </>
            ) : null}
          </div>
        </section>
      </main>

      <LinkToolsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={(link) => {
          setTab((link.tab as HubTab) === "shoppable" ? "shoppable" : "live");
          setSelectedId(link.id);
        }}
      />
    </div>
  );
}
