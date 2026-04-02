import React, { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { LinkToolsDrawer } from "./NewLinkPage";
import { useApiResource } from "../../hooks/useApiResource";
import { creatorApi, type AdzCampaignRecord, type AdzLinkRecord } from "../../lib/creatorApi";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Globe2,
  Handshake,
  Layers,
  Link2,
  MessageCircle,
  Pin,
  PinOff,
  Plus,
  QrCode,
  Search,
  Share2,
  X
} from "lucide-react";
import QRCode from "qrcode";

// MyLiveDealz · Creator Links Hub (v3) - FIXED
// Fixes:
// - Fixes Unterminated string constant by using "\n" safely.
// - Fixes Handshake reference by importing it.
// Adds:
// - Real QR generator (client-side via qrcode library, no network dependency)
// - Region-specific tracking metrics (clicks/purchases/earnings per region)
// - Favorite/Pin links + quick access carousel
// - Multi-region link variants (Global/Africa/EU-UK/Asia/China)
// - Share buttons where applicable (native share + WhatsApp + copy) with icons everywhere
// Styling: Orange + Black (neutral greys allowed)

const ORANGE = "#f77f00";
// const ORANGE_DARK = "#e26f00";

type HubTab = "live" | "shoppable";

type LinkStatus = "Active" | "Scheduled" | "Paused" | "Expired";

type SupplierType = "Seller" | "Provider";

type Region = "Global" | "Africa" | "EU/UK" | "Asia" | "China";

type GroupBy = "None" | "Campaign" | "Supplier" | "Provider";

type RegionVariant = { region: Region; url: string; note?: string };

type RegionMetric = {
  region: Region;
  clicks: number;
  purchases: number;
  earnings: number;
  currency: string;
};

type LinkItem = {
  id: string;
  tab: HubTab;
  title: string;
  subtitle: string;
  status: LinkStatus;
  createdAt: string;
  expiresAt?: string;

  campaign: { id: string; name: string };
  // suppliers = Sellers + Providers
  supplier: { name: string; type: SupplierType };

  primaryUrl: string;
  shortUrl: string;
  regionVariants: RegionVariant[];
  channels: Array<{ name: string; url: string; hint: string }>;

  metrics: {
    clicks: number;
    purchases: number;
    conversionPct: number;
    earnings: number;
    currency: string;
  };

  regionMetrics: RegionMetric[];

  sharePack: {
    headline: string;
    bullets: string[];
    captions: Array<{ platform: string; text: string }>; // supports {LINK}
    hashtags: string[];
  };
};

function mapCampaignStatusToLinkStatus(value: unknown): LinkStatus {
  const normalized = String(value || "").toLowerCase();
  if (["scheduled", "draft", "upcoming"].includes(normalized)) return "Scheduled";
  if (["paused"].includes(normalized)) return "Paused";
  if (["ended", "archived", "expired"].includes(normalized)) return "Expired";
  return "Active";
}

function buildLinkHubItems(campaigns: AdzCampaignRecord[], links: AdzLinkRecord[]): LinkItem[] {
  return campaigns.flatMap((campaign) => {
    const data =
      campaign.data && typeof campaign.data === "object" && !Array.isArray(campaign.data)
        ? (campaign.data as Record<string, unknown>)
        : {};
    const sellerName = String(data.supplierName || data.sellerName || data.seller || "");
    const supplierType: SupplierType =
      String(data.supplierType || "").toLowerCase() === "provider" ? "Provider" : "Seller";
    const titleBase = String(campaign.title || data.title || "");
    const status = mapCampaignStatusToLinkStatus(campaign.status || data.status);
    const clicks = Number(data.clicks || 0);
    const purchases = Number(data.purchases || 0);
    const earnings = Number(data.earnings || 0);
    const conversionPct = clicks > 0 ? Number(((purchases / clicks) * 100).toFixed(1)) : 0;

    const relatedLinks = links.filter((link) => {
      const linkData =
        link.data && typeof link.data === "object" && !Array.isArray(link.data)
          ? (link.data as Record<string, unknown>)
          : {};
      return (
        String(linkData.campaignId || "") === campaign.id ||
        String(linkData.adzCampaignId || "") === campaign.id
      );
    });

    const primaryUrl = String(data.shareUrl || `https://mylivedealz.com/campaign/${encodeURIComponent(campaign.id)}`);

    const channels =
      relatedLinks.length > 0
        ? relatedLinks.map((link, index) => {
            const linkData =
              link.data && typeof link.data === "object" && !Array.isArray(link.data)
                ? (link.data as Record<string, unknown>)
                : {};
            const channel = String(linkData.channel || linkData.label || `Channel ${index + 1}`);
            return {
              name: channel,
              url: String(link.url || linkData.url || primaryUrl),
              hint: String(linkData.hint || "Tracked")
            };
          })
        : [
            { name: "Default", url: primaryUrl, hint: "Tracked" },
            { name: "Instagram", url: `${primaryUrl}&ch=instagram`, hint: "Social" },
            { name: "TikTok", url: `${primaryUrl}&ch=tiktok`, hint: "Short video" },
            { name: "WhatsApp", url: `${primaryUrl}&ch=whatsapp`, hint: "Broadcast" }
          ];

    const baseItem: LinkItem = {
      id: String(campaign.id),
      tab: "shoppable",
      title: `Shoppable Adz · ${titleBase}`,
      subtitle: String(data.subtitle || "Link pack + QR"),
      status,
      createdAt: String(campaign.createdAt || "Recently"),
      campaign: { id: String(campaign.id), name: titleBase },
      supplier: { name: sellerName, type: supplierType },
      primaryUrl,
      shortUrl: primaryUrl,
      regionVariants: [
        { region: "Global", url: primaryUrl },
        { region: "Africa", url: `${primaryUrl}&rg=af` },
        { region: "EU/UK", url: `${primaryUrl}&rg=eu` },
        { region: "Asia", url: `${primaryUrl}&rg=as` },
        { region: "China", url: `${primaryUrl}&rg=cn` }
      ],
      channels,
      metrics: {
        clicks,
        purchases,
        conversionPct,
        earnings,
        currency: String(campaign.currency || data.currency || "USD")
      },
      regionMetrics: [
        { region: "Global", clicks, purchases, earnings, currency: String(campaign.currency || "USD") }
      ],
      sharePack: {
        headline: `${titleBase} link pack`,
        bullets: ["Tracked link", "Campaign attribution", "Use across social channels"],
        captions: [
          {
            platform: "Instagram",
            text: `Sharing ${titleBase}. Shop via this tracked link: {LINK}`
          }
        ],
        hashtags: ["#MyLiveDealz", "#ShoppableAdz"]
      }
    };

    const surfaces = Array.isArray(data.surfaces) ? data.surfaces.map((entry) => String(entry).toUpperCase()) : [];
    if (!surfaces.includes("LIVE_SESSIONZ")) {
      return [baseItem];
    }

    return [
      {
        ...baseItem,
        id: `LIVE-${campaign.id}`,
        tab: "live",
        title: `Live Sessionz · ${titleBase}`,
        subtitle: String(data.liveSubtitle || data.subtitle || "Live link"),
      },
      baseItem
    ];
  });
}

type CreatorLinksHubProps = {
  onChangePage?: (page: string) => void;
  initialOpenNewLinkDrawer?: boolean;
};

export default function CreatorLinksHubV3Fixed({
  onChangePage: _onChangePage,
  initialOpenNewLinkDrawer = false,
}: CreatorLinksHubProps): JSX.Element {
  const [tab, setTab] = useState<HubTab>("live");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkStatus | "All">("All");
  const [groupBy, setGroupBy] = useState<GroupBy>("Campaign");
  const [supplierTypeFilter, setSupplierTypeFilter] = useState<"All" | SupplierType>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [newLinkDrawerOpen, setNewLinkDrawerOpen] = useState(initialOpenNewLinkDrawer);

  "suppliers include Sellers (suppliers of products) and Providers (service providers).";

  const { data: items } = useApiResource<LinkItem[]>({
    initialData: [],
    loader: async () => {
      const [campaigns, links] = await Promise.all([creatorApi.adzCampaigns(), creatorApi.adzLinks()]);
      return buildLinkHubItems(campaigns, links);
    }
  });

  // Effective supplier filter when groupBy=Provider
  useEffect(() => {
    if (groupBy === "Provider") setSupplierTypeFilter("Provider");
  }, [groupBy]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((x) => x.tab === tab)
      .filter((x) => (statusFilter === "All" ? true : x.status === statusFilter))
      .filter((x) => (supplierTypeFilter === "All" ? true : x.supplier.type === supplierTypeFilter))
      .filter((x) => {
        if (!q) return true;
        const hay = `${x.title} ${x.subtitle} ${x.id} ${x.campaign.name} ${x.supplier.name} ${x.supplier.type}`;
        return hay.toLowerCase().includes(q);
      });
  }, [items, tab, query, statusFilter, supplierTypeFilter]);

  const pinnedForTab = useMemo(() => {
    return items.filter((x) => x.tab === tab && pinnedIds.includes(x.id));
  }, [items, tab, pinnedIds]);

  const selected = useMemo(() => {
    const inView = selectedId ? visible.find((x) => x.id === selectedId) : null;
    return inView ?? null;
  }, [visible, selectedId, pinnedForTab]);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const groups = useMemo(() => {
    if (groupBy === "None") {
      return [
        {
          key: "__all__",
          title: "All links",
          subtitle: `${visible.length} item(s)`,
          items: visible
        }
      ];
    }

    const map = new Map<string, { title: string; subtitle: string; items: LinkItem[] }>();

    for (const it of visible) {
      let key = "";
      let title = "";
      let subtitle = "";

      if (groupBy === "Campaign") {
        key = `campaign:${it.campaign.id}`;
        title = it.campaign.name;
        subtitle = `${it.supplier.type}: ${it.supplier.name}`;
      } else if (groupBy === "Supplier") {
        key = `supplier:${it.supplier.name}`;
        title = it.supplier.name;
        subtitle = `${it.supplier.type} · ${it.campaign.name}`;
      } else {
        key = `provider:${it.supplier.name}`;
        title = it.supplier.name;
        subtitle = "Provider";
      }

      if (!map.has(key)) map.set(key, { title, subtitle, items: [] });
      map.get(key)!.items.push(it);
    }

    return Array.from(map.entries()).map(([k, v]) => ({ key: k, ...v }));
  }, [visible, groupBy]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (next[g.key] === undefined) next[g.key] = false;
      }
      return next;
    });
  }, [groups]);

  const toggleGroup = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const headerTitle = "Links Hub";

  return (
    <div className="min-h-screen bg-evz-light dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors">
      <PageHeader
        pageTitle={headerTitle}
        badge={
          <span className="hidden md:inline-flex px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 items-center gap-2 text-[11px] font-bold border border-slate-800 dark:border-slate-700 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ORANGE }} />
            Orange + Black
          </span>
        }
        rightContent={
          <button
            className="px-3 py-1.5 rounded-full bg-[#f77f00] text-white hover:bg-[#e26f00] inline-flex items-center gap-2 transition-colors text-xs font-semibold"
            onClick={() => setNewLinkDrawerOpen(true)}
            type="button"
          >
            <Plus className="h-4 w-4" />
            <span>New link</span>
          </button>
        }
      />

      <main className="max-w-[1600px] mx-auto p-3 md:p-6">
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Creator Links Hub</div>
              <div className="text-xs text-slate-500">Copy links, generate QR, share packs, and preview performance.</div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full p-1 text-xs">
                <TabBtn label="Live Sessionz" active={tab === "live"} onClick={() => setTab("live")} icon={<Dot color={ORANGE} />} />
                <TabBtn label="Shoppable Adz" active={tab === "shoppable"} onClick={() => setTab("shoppable")} icon={<Dot color="#64748b" />} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-700/50">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    className="bg-transparent outline-none text-xs font-bold w-44 text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Search links…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as LinkStatus | "All")}
                >
                  <option value="All">All status</option>
                  <option value="Active">Active</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Paused">Paused</option>
                  <option value="Expired">Expired</option>
                </select>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-white focus:outline-none"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as "Campaign" | "Supplier" | "Provider" | "None")}
                >
                  <option value="Campaign">Group: Campaign</option>
                  <option value="Supplier">Group: Supplier</option>
                  <option value="Provider">Group: Provider</option>
                  <option value="None">No grouping</option>
                </select>

                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-full px-2 py-1 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-white disabled:opacity-50 focus:outline-none"
                  value={supplierTypeFilter}
                  onChange={(e) => setSupplierTypeFilter(e.target.value as "All" | "Seller" | "Provider")}
                  disabled={groupBy === "Provider"}
                >
                  <option value="All">All Suppliers</option>
                  <option value="Seller">Sellers (Products)</option>
                  <option value="Provider">Providers (Services)</option>
                </select>

                <button
                  className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold"
                  onClick={() => setShowFilterDialog(true)}
                  type="button"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 transition-colors">
              <Layers className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Grouping:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{groupBy}</span>
            </span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 transition-colors">
              <BarChart3 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Showing</span> <span className="font-bold text-slate-700 dark:text-slate-200">{visible.length}</span> <span className="text-slate-500 dark:text-slate-400">link(s)</span>
            </span>
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <Globe2 className="h-3.5 w-3.5" />
              Multi-region variants: Africa · EU/UK · Asia · China
            </span>
          </div>
        </section>

        {pinnedForTab.length > 0 && (
          <section className="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-sm font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
                <Pin className="h-4 w-4" style={{ color: ORANGE }} />
                Pinned links
              </div>
              <div className="text-xs font-medium text-slate-500">Quick access</div>
            </div>
            <div className="mt-2 overflow-x-auto pb-1">
              <div className="flex gap-2 min-w-max">
                {pinnedForTab.map((x) => (
                  <PinnedCard
                    key={x.id}
                    item={x}
                    active={selected?.id === x.id}
                    onSelect={() => setSelectedId(x.id)}
                    onUnpin={() => togglePin(x.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-4 items-start">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Link groups</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select a link to view QR, share pack and metrics.</div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-slate-100">{groups.length}</span> group(s)
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {groups.length === 0 ? (
                <EmptyState title="No links found" subtitle="Try changing filters or clearing the search." />
              ) : (
                groups.map((g) => (
                  <div key={g.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 transition-colors">
                    <button
                      className="w-full px-3 py-2 flex items-start justify-between gap-2"
                      onClick={() => toggleGroup(g.key)}
                      type="button"
                    >
                      <div className="min-w-0 text-left">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">{g.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{g.subtitle}</div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Items: <span className="font-bold text-slate-700 dark:text-slate-200">{g.items.length}</span>
                          <span className="mx-2">·</span>
                          Clicks: <span className="font-bold text-slate-700 dark:text-slate-200">{fmtInt(sum(g.items.map((x) => x.metrics.clicks)))}</span>
                          <span className="mx-2">·</span>
                          Earn: <span className="font-bold" style={{ color: ORANGE }}>{g.items.find((item) => item.metrics.currency)?.metrics.currency || ""} {fmtInt(sum(g.items.map((x) => x.metrics.earnings)))}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                          {groupBadge(g.items)}
                        </span>
                        {collapsed[g.key] ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {!collapsed[g.key] && (
                      <div className="px-2 pb-2 space-y-2">
                        {g.items.map((x) => (
                          <LinkRow
                            key={x.id}
                            item={x}
                            active={selected?.id === x.id}
                            pinned={pinnedIds.includes(x.id)}
                            onTogglePin={() => togglePin(x.id)}
                            onSelect={() => setSelectedId(x.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 md:p-4 lg:sticky lg:top-44 transition-colors">
            {!selected ? (
              <EmptyState title="Select a link" subtitle="Choose a link to see QR, share pack and tracking preview." />
            ) : (
              <LinkDetail
                item={selected}
                pinned={pinnedIds.includes(selected.id)}
                onTogglePin={() => togglePin(selected.id)}
              />
            )}
          </div>
        </section>
      </main>

      <ToastArea />

      <FilterDialog
        isOpen={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        status={statusFilter}
        setStatus={setStatusFilter}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        supplierType={supplierTypeFilter}
        setSupplierType={setSupplierTypeFilter}
      />

      <LinkToolsDrawer
        open={newLinkDrawerOpen}
        onClose={() => setNewLinkDrawerOpen(false)}
        initialCampaignId={selected?.campaign.id}
      />
    </div>
  );
}

function groupBadge(items: LinkItem[]) {
  const hasProvider = items.some((x) => x.supplier.type === "Provider");
  const hasSeller = items.some((x) => x.supplier.type === "Seller");
  if (hasProvider && hasSeller) return "Seller + Provider";
  if (hasProvider) return "Provider";
  return "Seller";
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function Dot({ color }: { color: string }) {
  return <span className="h-2 w-2 rounded-full" style={{ background: color }} />;
}

function TabBtn({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      className={`px-3 py-1 rounded-full inline-flex items-center gap-2 transition-colors font-bold ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function statusPill(status: LinkStatus) {
  if (status === "Active") return "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (status === "Scheduled") return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  if (status === "Paused") return "bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700";
  return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
}

function fmtInt(n: number) {
  return n.toLocaleString();
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
      <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</div>
    </div>
  );
}

function MiniMetric({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 transition-colors">
      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-[11px] font-bold ${accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}

function IconBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function PillBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      className="px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PinnedCard({ item, active, onSelect, onUnpin }: { item: LinkItem; active: boolean; onSelect: () => void; onUnpin: () => void }) {
  const msg = buildWhatsAppMessage(item, item.shortUrl);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={`min-w-[280px] rounded-2xl border p-3 text-left bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${active ? "border-[#f77f00] dark:border-[#f77f00]" : "border-slate-200 dark:border-slate-700"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.supplier.type}: {item.supplier.name} · {item.campaign.name}</div>
        </div>
        <button
          className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
            toast("Unpinned");
          }}
          title="Unpin"
          type="button"
        >
          <PinOff className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <MiniMetric label="Clicks" value={fmtInt(item.metrics.clicks)} />
        <MiniMetric label="Purchases" value={fmtInt(item.metrics.purchases)} />
        <MiniMetric label="Earn" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent />
      </div>

      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <PillBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(item.shortUrl)} />
        <PillBtn label="Share" icon={<Share2 className="h-4 w-4" />} onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })} />
        <PillBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} onClick={() => shareWhatsApp(msg)} />
      </div>
    </div>
  );
}

function LinkRow({ item, active, pinned, onTogglePin, onSelect }: { item: LinkItem; active: boolean; pinned: boolean; onTogglePin: () => void; onSelect: () => void }) {
  const msg = buildWhatsAppMessage(item, item.shortUrl);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={`w-full text-left rounded-2xl border p-3 transition-colors cursor-pointer ${active ? "border-[#f77f00] bg-white dark:bg-slate-800 dark:border-[#f77f00]" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[9px]">{item.supplier.type}</span>
            {pinned && (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-orange-500/10 border border-[#ffd19a] dark:border-orange-500/30 text-[#8a4b00] dark:text-orange-400 text-[9px] inline-flex items-center gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            <span className="font-medium text-slate-700">{item.supplier.name}</span>
            <span className="mx-2">·</span>
            <span>{item.campaign.name}</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 truncate">ID: {item.id} · {item.createdAt}{item.expiresAt ? ` · Expires: ${item.expiresAt}` : ""}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
                toast(pinned ? "Unpinned" : "Pinned");
              }}
              title={pinned ? "Unpin" : "Pin"}
              type="button"
            >
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>

            <span className={`px-2.5 py-1 rounded-full text-[10px] border ${statusPill(item.status)}`}>{item.status}</span>
          </div>

          <div className="hidden md:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <IconBtn
              label="Copy"
              onClick={() => copyToClipboard(item.shortUrl)}
              icon={<Copy className="h-4 w-4" />}
            />
            <IconBtn
              label="Open"
              onClick={() => toast(`This link would open the ${item.tab === "live" ? "Live Session" : "Shoppable Ad"} destination.`)}
              icon={<ExternalLink className="h-4 w-4" />}
            />
            <IconBtn
              label="Share"
              onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })}
              icon={<Share2 className="h-4 w-4" />}
            />
            <IconBtn
              label="WhatsApp"
              onClick={() => shareWhatsApp(msg)}
              icon={<MessageCircle className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
        <MiniMetric label="Clicks" value={fmtInt(item.metrics.clicks)} icon={<BarChart3 className="h-3.5 w-3.5" />} />
        <MiniMetric label="Purchases" value={fmtInt(item.metrics.purchases)} icon={<Check className="h-3.5 w-3.5" />} />
        <MiniMetric label="Conv" value={`${item.metrics.conversionPct.toFixed(1)}%`} accent icon={<Dot color={ORANGE} />} />
        <MiniMetric label="Earn" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent icon={<Dot color={ORANGE} />} />
      </div>

      <div className="mt-2 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1 transition-colors">
        <Link2 className="h-3.5 w-3.5 inline-block mr-1 text-slate-500 dark:text-slate-400" />
        {item.shortUrl}
      </div>

      <div className="mt-2 flex md:hidden gap-2" onClick={(e) => e.stopPropagation()}>
        <PillBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(item.shortUrl)} />
        <PillBtn label="Share" icon={<Share2 className="h-4 w-4" />} onClick={() => shareNative({ title: item.title, text: msg, url: item.shortUrl })} />
        <PillBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} onClick={() => shareWhatsApp(msg)} />
      </div>
    </div>
  );
}

function LinkDetail({ item, pinned, onTogglePin }: { item: LinkItem; pinned: boolean; onTogglePin: () => void }) {
  const [activePanel, setActivePanel] = useState<"links" | "share" | "tracking">("links");
  const [region, setRegion] = useState<Region>("Global");

  const regionUrl = useMemo(() => {
    const v = item.regionVariants.find((x) => x.region === region);
    return v?.url || item.shortUrl;
  }, [item, region]);

  const regionMetric = useMemo(() => {
    return item.regionMetrics.find((m) => m.region === region) || item.regionMetrics.find((m) => m.region === "Global") || null;
  }, [item, region]);

  const whatsappText = useMemo(() => buildWhatsAppMessage(item, regionUrl), [item, regionUrl]);

  const share = async () => {
    await shareNative({ title: item.title, text: whatsappText, url: regionUrl });
  };

  const downloadQrSvg = async () => {
    await downloadQrSvgLocal(regionUrl, `${item.id}-${region.replace("/", "-")}-qr.svg`);
  };

  return (
    <div className="text-[11px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate">{item.title}</div>
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-[9px] inline-flex items-center gap-1">
              <Handshake className="h-3.5 w-3.5" />
              <span>Supplier</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300">{item.supplier.type}: {item.supplier.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300">Campaign: {item.campaign.name}</span>
            {pinned && (
              <span className="px-2 py-0.5 rounded-full bg-[#fff4e5] dark:bg-orange-500/10 border border-[#ffd19a] dark:border-orange-500/30 text-[#8a4b00] dark:text-orange-400 text-[9px] inline-flex items-center gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">ID: {item.id} · Created: {item.createdAt}{item.expiresAt ? ` · Expires: ${item.expiresAt}` : ""}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
            onClick={() => {
              onTogglePin();
              toast(pinned ? "Unpinned" : "Pinned");
            }}
            title={pinned ? "Unpin" : "Pin"}
            type="button"
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <span className={`px-2.5 py-1 rounded-full text-[10px] border ${statusPill(item.status)}`}>{item.status}</span>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold inline-flex items-center gap-2 dark:text-slate-100">
              <Globe2 className="h-4 w-4" />
              Multi-region link variants
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Choose a region to copy/share/QR the correct link.</div>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors">Selected: <span className="font-semibold">{region}</span></span>
        </div>

        {regionMetric && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <MiniMetric label="Clicks" value={fmtInt(regionMetric.clicks)} />
            <MiniMetric label="Purchases" value={fmtInt(regionMetric.purchases)} />
            <MiniMetric label="Earn" value={`${regionMetric.currency} ${fmtInt(regionMetric.earnings)}`} accent />
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          {(["Global", "Africa", "EU/UK", "Asia", "China"] as Region[]).map((r) => {
            const active = region === r;
            return (
              <button
                key={r}
                className={`px-3 py-1.5 rounded-full border text-[10px] inline-flex items-center gap-2 transition-colors ${active ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                onClick={() => setRegion(r)}
                type="button"
              >
                <Globe2 className="h-4 w-4" />
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full p-1 text-[10px] transition-colors">
        <TabBtn label="Links" active={activePanel === "links"} onClick={() => setActivePanel("links")} icon={<Link2 className="h-4 w-4" />} />
        <TabBtn label="Share pack" active={activePanel === "share"} onClick={() => setActivePanel("share")} icon={<Share2 className="h-4 w-4" />} />
        <TabBtn label="Tracking" active={activePanel === "tracking"} onClick={() => setActivePanel("tracking")} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {activePanel === "links" && (
        <div className="mt-3 space-y-3">
          <Card
            title="Primary link"
            subtitle="Tracks performance and earnings for you."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(item.primaryUrl)} />
                <PillBtn
                  label="Open"
                  icon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => toast(`Connecting to the Primary URL destination for: ${item.title}`)}
                />
              </div>
            }
          >
            <CodeRow value={item.primaryUrl} />
          </Card>

          <Card
            title="Selected region short link"
            subtitle="Use this link in captions and for QR."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(regionUrl)} />
                <PillBtn label="Share" icon={<Share2 className="h-4 w-4" />} onClick={share} />
                <PillBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} onClick={() => shareWhatsApp(whatsappText)} />
              </div>
            }
          >
            <CodeRow value={regionUrl} />
          </Card>

          <Card
            title="QR code (real)"
            subtitle="Use for posters, flyers and on-screen overlays."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Download" icon={<Download className="h-4 w-4" />} onClick={downloadQrSvg} />
                <PillBtn label="Add to overlay" icon={<Layers className="h-4 w-4" />} onClick={() => toast("QR added to Live Studio overlay.")} />
              </div>
            }
          >
            <div className="mt-2 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 transition-colors">
                  <QrCode className="h-4 w-4" />
                  QR for <span className="font-semibold">{region}</span>
                </div>
                <div className="p-2 bg-white rounded-2xl">
                  <RealQR value={regionUrl} size={180} />
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Per-channel links"
            subtitle="Track performance by platform."
            right={
              <PillBtn
                label="Copy all"
                icon={<Copy className="h-4 w-4" />}
                onClick={() => copyToClipboard(item.channels.map((c) => `${c.name}: ${c.url}`).join("\n"))}
              />
            }
          >
            <div className="mt-2 space-y-2">
              {item.channels.map((c) => {
                const msg = buildWhatsAppMessage(item, c.url);
                return (
                  <div key={c.name} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.hint}</div>
                        <div className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all">{c.url}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <IconBtn label="Copy" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(c.url)} />
                        <IconBtn
                          label="Open"
                          icon={<ExternalLink className="h-4 w-4" />}
                          onClick={() => toast(`Opening the ${c.name} specific link variant.`)}
                        />
                        <IconBtn label="Share" icon={<Share2 className="h-4 w-4" />} onClick={() => shareNative({ title: item.title, text: msg, url: c.url })} />
                        <IconBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} onClick={() => shareWhatsApp(msg)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activePanel === "share" && (
        <div className="mt-3 space-y-3">
          <Card
            title="Share pack"
            subtitle="Ready-to-use captions + key points."
            right={
              <div className="flex items-center gap-2">
                <PillBtn label="Share" icon={<Share2 className="h-4 w-4" />} onClick={share} />
                <PillBtn label="WhatsApp" icon={<MessageCircle className="h-4 w-4" />} onClick={() => shareWhatsApp(whatsappText)} />
                <PillBtn label="Copy link" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(regionUrl)} />
              </div>
            }
          >
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{item.sharePack.headline}</div>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                {item.sharePack.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center text-[10px]">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.sharePack.hashtags.map((h) => (
                  <span key={h} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 transition-colors">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {item.sharePack.captions.map((c) => (
                <CaptionBlock
                  key={c.platform}
                  platform={c.platform}
                  text={c.text.replace("{LINK}", regionUrl)}
                  onCopy={(t) => copyToClipboard(t)}
                />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <ShareButton label="Share (native)" icon={<Share2 className="h-4 w-4" />} onClick={share} primary />
              <ShareButton label="Copy everything" icon={<Copy className="h-4 w-4" />} onClick={() => copyToClipboard(buildFullShareDump(item, regionUrl))} />
            </div>
          </Card>
        </div>
      )}

      {activePanel === "tracking" && (
        <div className="mt-3 space-y-3">
          <Card
            title="Tracking preview"
            subtitle="Global snapshot + region-specific metrics."
            right={<span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px]">Last 30 days</span>}
          >
            <div className="mt-2 grid grid-cols-2 gap-2">
              <BigMetric title="Clicks" value={fmtInt(item.metrics.clicks)} icon={<BarChart3 className="h-4 w-4" />} />
              <BigMetric title="Purchases" value={fmtInt(item.metrics.purchases)} icon={<Check className="h-4 w-4" />} />
              <BigMetric title="Conversion" value={`${item.metrics.conversionPct.toFixed(1)}%`} accent icon={<Dot color={ORANGE} />} />
              <BigMetric title="Earnings" value={`${item.metrics.currency} ${fmtInt(item.metrics.earnings)}`} accent icon={<Dot color={ORANGE} />} />
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-extrabold inline-flex items-center gap-2 dark:text-slate-100">
                  <Globe2 className="h-4 w-4" />
                  Region-specific metrics
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">(Clicks, purchases, earnings)</span>
              </div>
              <div className="mt-2 space-y-2">
                {item.regionMetrics
                  .filter((r) => r.region !== "Global")
                  .map((r) => {
                    const conv = r.clicks > 0 ? (r.purchases / r.clicks) * 100 : 0;
                    return (
                      <div key={r.region} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{r.region}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Conv: <span className="font-semibold text-slate-700 dark:text-slate-200">{conv.toFixed(1)}%</span></div>
                        </div>
                        <div className="mt-1 grid grid-cols-4 gap-2 text-[10px]">
                          <MiniMetric label="Clicks" value={fmtInt(r.clicks)} />
                          <MiniMetric label="Purch" value={fmtInt(r.purchases)} />
                          <MiniMetric label="Earn" value={`${r.currency} ${fmtInt(r.earnings)}`} accent />
                          <MiniMetric label="Conv" value={`${conv.toFixed(1)}%`} accent />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
              <div className="text-[11px] font-bold inline-flex items-center gap-2 dark:text-slate-100">
                <Dot color={ORANGE} />
                Link health
              </div>
              <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">Status: <span className="font-semibold text-slate-900 dark:text-slate-100">{item.status}</span></div>
              <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="h-full" style={{ width: healthWidth(item), background: ORANGE }} />
              </div>
              <div className="mt-2 text-[10px] text-slate-500">Tip: Share region links to match your audience geography.</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold dark:text-slate-100">{title}</div>
          {subtitle ? <div className="text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function CodeRow({ value }: { value: string }) {
  return <div className="mt-2 font-mono text-[10px] text-slate-700 dark:text-slate-300 break-all bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 transition-colors">{value}</div>;
}

function BigMetric({ title, value, accent, icon }: { title: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 transition-colors">
      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">{icon}<span>{title}</span></div>
      <div className={`mt-1 text-[16px] font-extrabold ${accent ? "text-[#f77f00]" : "text-slate-900 dark:text-slate-100"}`}>{value}</div>
    </div>
  );
}

function ShareButton({ label, icon, onClick, primary }: { label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={`px-3 py-2 rounded-2xl text-[11px] font-bold inline-flex items-center justify-center gap-2 ${primary ? "bg-[#f77f00] text-white hover:bg-[#e26f00]" : "border border-slate-200 bg-white hover:bg-slate-50"}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CaptionBlock({ platform, text, onCopy }: { platform: string; text: string; onCopy: (t: string) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold inline-flex items-center gap-2 dark:text-slate-100"><Share2 className="h-4 w-4" /><span>{platform}</span></div>
        <button
          className="px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-black dark:hover:bg-white text-[10px] inline-flex items-center gap-2 transition-colors"
          onClick={() => onCopy(text)}
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <div className="mt-2 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function healthWidth(item: LinkItem) {
  if (item.status === "Active") return "92%";
  if (item.status === "Scheduled") return "70%";
  if (item.status === "Paused") return "40%";
  return "18%";
}

function buildFullShareDump(item: LinkItem, link: string) {
  const lines: string[] = [];
  lines.push(item.title);
  lines.push(item.subtitle);
  lines.push("Link: " + link);
  lines.push("");
  lines.push("Captions:");
  item.sharePack.captions.forEach((c) => {
    lines.push(`- ${c.platform}: ${c.text.replace("{LINK}", link)}`);
  });
  lines.push("");
  lines.push("Hashtags: " + item.sharePack.hashtags.join(" "));
  return lines.join("\n");
}

function buildWhatsAppMessage(item: LinkItem, link: string) {
  const wa = item.sharePack.captions.find((c) => c.platform === "WhatsApp")?.text;
  return (wa || "Check this out: {LINK}").replace("{LINK}", link);
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    toast("Copied!");
  }
}

async function shareNative(payload: { title: string; text: string; url: string }) {
  if (navigator.share) {
    try {
      await navigator.share(payload);
    } catch {
      // cancelled
    }
  } else {
    await copyToClipboard(payload.text);
    toast("Share not supported here. Copied message instead.");
  }
}

function shareWhatsApp(text: string) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/?text=${encoded}`, "_blank");
}

function RealQR({ value, size = 180 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: size,
      color: { dark: "#111827", light: "#ffffff" }
    })
      .then((out: string) => {
        if (!cancelled) setSvg(out);
      })
      .catch(() => {
        if (!cancelled) setSvg("");
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!svg) {
    return (
      <div className="h-[180px] w-[180px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 transition-colors">
        Generating QR…
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

async function downloadQrSvgLocal(value: string, filename: string) {
  try {
    const svg = await QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: 512,
      color: { dark: "#111827", light: "#ffffff" }
    });
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objUrl);
    toast("QR downloaded");
  } catch {
    toast("Failed to generate QR");
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function toast(message: string) {
  const ev = new CustomEvent("mldz-toast", { detail: message });
  window.dispatchEvent(ev);
}

function ToastArea() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const evt = e as CustomEvent<string>;
      setMsg(evt.detail);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setMsg(null), 1700);
    };
    window.addEventListener("mldz-toast", handler);
    return () => window.removeEventListener("mldz-toast", handler);
  }, []);

  if (!msg) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="px-4 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] shadow-lg border border-slate-800 dark:border-slate-200 transition-colors">{msg}</div>
    </div>
  );
}

function FilterDialog({
  isOpen,
  onClose,
  status,
  setStatus,
  groupBy,
  setGroupBy,
  supplierType,
  setSupplierType,
}: {
  isOpen: boolean;
  onClose: () => void;
  status: LinkStatus | "All";
  setStatus: (s: LinkStatus | "All") => void;
  groupBy: "Campaign" | "Supplier" | "Provider" | "None";
  setGroupBy: (g: "Campaign" | "Supplier" | "Provider" | "None") => void;
  supplierType: "All" | "Seller" | "Provider";
  setSupplierType: (t: "All" | "Seller" | "Provider") => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] z-[9999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[340px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-bold dark:text-white">Filters & Sort</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* Main Filters */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Status</label>
              <div className="flex flex-wrap gap-2">
                {(["All", "Active", "Scheduled", "Paused", "Expired"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${status === s
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Group By</label>
              <div className="flex flex-wrap gap-2">
                {(["Campaign", "Supplier", "Provider", "None"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${groupBy === g
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Supplier Type</label>
              <div className="flex flex-wrap gap-2">
                {(["All", "Seller", "Provider"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSupplierType(t)}
                    disabled={groupBy === "Provider"}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${supplierType === t
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 shadow-sm transform scale-105"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                      } ${groupBy === "Provider" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* New Visual Filters */}
          <div className="space-y-5">
            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Date Range</label>
              <select className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>This month</option>
                <option>All time</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 mb-2.5 block uppercase tracking-wide opacity-80">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                  Most Clicks
                </button>
                <button className="px-3 py-2.5 rounded-xl border border-[#f77f00] bg-orange-50 dark:bg-orange-900/10 text-[11px] font-bold text-[#f77f00] text-left transition-colors">
                  Newest First
                </button>
                <button className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                  Highest Earnings
                </button>
                <button className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                  Alphabetical
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <button
            onClick={() => {
              setStatus("All");
              setGroupBy("Campaign");
              setSupplierType("All");
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold hover:bg-black dark:hover:bg-white transition-all shadow-lg shadow-slate-900/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
