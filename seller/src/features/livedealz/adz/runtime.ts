function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function mapBackendAdzCampaign(value: Record<string, unknown>) {
  const data = asObject(value.data);
  const campaignName = String(data.campaignName || data.name || value.title || "Untitled campaign");
  const campaignSubtitle = String(data.campaignSubtitle || asObject(data.campaign).subtitle || "");
  const supplier = asObject(data.supplier);
  const creator = asObject(data.creator);
  const offers = asArray<Record<string, unknown>>(data.offers);

  return {
    ...data,
    id: String(value.id || data.id || campaignName),
    name: String(data.name || campaignName),
    campaignName,
    campaignSubtitle,
    campaign: {
      name: String(asObject(data.campaign).name || campaignName),
      subtitle: campaignSubtitle,
    },
    supplier: {
      name: String(supplier.name || "Supplier"),
      category: String(supplier.category || ""),
      logoUrl: String(supplier.logoUrl || supplier.avatarUrl || ""),
      ...supplier,
    },
    creator: {
      name: String(creator.name || "(Supplier-hosted)"),
      handle: String(creator.handle || ""),
      avatarUrl: String(creator.avatarUrl || ""),
      verified: Boolean(creator.verified),
      ...creator,
    },
    status: String(data.status || value.status || "Draft"),
    platforms: asArray<string>(data.platforms),
    offers,
    generated: Boolean(data.generated),
    isMarketplace: Boolean(value.isMarketplace ?? data.isMarketplace ?? true),
    currency: String(data.currency || value.currency || "USD"),
    impressions: Number(data.impressions ?? data.impressions7d ?? 0),
    clicks: Number(data.clicks ?? data.clicks7d ?? 0),
    orders: Number(data.orders ?? data.orders7d ?? 0),
    earnings: Number(data.earnings ?? data.revenue7d ?? 0),
    earningsCurrency: String(data.earningsCurrency || data.currency || value.currency || "USD"),
  };
}

export function buildAdzCampaignPayload(ad: Record<string, unknown>) {
  return {
    status: String(ad.status || "Draft"),
    title: String(ad.campaignName || ad.name || "Untitled campaign"),
    currency: String(ad.currency || "USD"),
    isMarketplace: Boolean(ad.isMarketplace ?? true),
    data: ad,
  };
}

export function hashAdzCampaign(ad: Record<string, unknown>) {
  return JSON.stringify(ad);
}

export function deriveMetricSeries(total: number, points = 14, seed = "adz") {
  const safePoints = Math.max(1, Math.floor(points));
  const safeTotal = Math.max(0, Number(total || 0));
  if (safeTotal <= 0) {
    return Array.from({ length: safePoints }, () => 0);
  }

  const seedHash = hashSeed(seed);
  const weights = Array.from({ length: safePoints }, (_, index) => {
    const wave = 1 + Math.sin((index / Math.max(1, safePoints - 1)) * Math.PI) * 0.45;
    const variation = 0.86 + (((seedHash >> (index % 16)) & 7) / 20);
    return wave * variation;
  });
  const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;
  const raw = weights.map((weight) => (safeTotal * weight) / weightSum);
  const rounded = raw.map((value) => Math.max(0, Math.round(value)));
  const delta = safeTotal - rounded.reduce((sum, value) => sum + value, 0);

  if (delta !== 0) {
    const direction = delta > 0 ? 1 : -1;
    for (let index = 0; index < Math.abs(delta); index += 1) {
      const target = index % rounded.length;
      rounded[target] = Math.max(0, rounded[target] + direction);
    }
  }

  return rounded;
}

export function mapBackendAdzBuilder(value: Record<string, unknown>) {
  const data = asObject(value.data);
  return {
    id: String(value.id || data.id || "seller_adz_builder_default"),
    step: String(data.step || "offer"),
    approvalState: String(data.approvalState || "Draft"),
    cart: asObject(data.cart),
    externalAssets: asObject(data.externalAssets),
    builder: asObject(data.builder),
    saved: Boolean(data.saved),
  };
}

export function buildAdzBuilderPayload(value: {
  id?: string;
  step: string;
  approvalState: string;
  builder: Record<string, unknown>;
  cart?: Record<string, unknown>;
  externalAssets?: Record<string, unknown>;
  saved?: boolean;
}) {
  return {
    id: String(value.id || "seller_adz_builder_default"),
    step: value.step,
    approvalState: value.approvalState,
    builder: value.builder,
    cart: value.cart ?? {},
    externalAssets: value.externalAssets ?? {},
    saved: Boolean(value.saved),
    status: String(value.approvalState || "Draft").toLowerCase(),
  };
}

export function mapMediaAssetToAdBuilderAsset(value: Record<string, unknown>) {
  const metadata = asObject(value.metadata);
  return {
    id: String(value.id || ""),
    title: String(value.name || "Asset"),
    owner: String(metadata.owner || "Supplier"),
    kind: String(value.kind || "image"),
    status: String(metadata.status || "approved"),
    roleHint: String(metadata.roleHint || ""),
    width: Number(metadata.width || 0) || undefined,
    height: Number(metadata.height || 0) || undefined,
    url: String(value.url || ""),
    posterUrl: typeof metadata.posterUrl === "string" ? metadata.posterUrl : undefined,
    desktopMode: typeof metadata.desktopMode === "string" ? metadata.desktopMode : undefined,
  };
}

export function mapAdzBuilderScope(campaigns: Array<Record<string, unknown>>) {
  const suppliers = new Map<string, Record<string, unknown>>();
  const mappedCampaigns = campaigns.map((entry) => {
    const campaign = mapBackendAdzCampaign(entry);
    const supplier = asObject(campaign.supplier);
    const supplierId = String(supplier.id || supplier.name || campaign.id);
    suppliers.set(supplierId, {
      id: supplierId,
      name: String(supplier.name || "Supplier"),
      avatarUrl: String(supplier.logoUrl || supplier.avatarUrl || ""),
      category: String(supplier.category || ""),
    });
    return {
      id: String(campaign.id),
      supplierId,
      name: String(campaign.name || campaign.campaignName || "Campaign"),
      status: String(campaign.status || "Draft"),
      startsAtISO: String(campaign.startISO || new Date().toISOString()),
      endsAtISO: String(campaign.endISO || new Date().toISOString()),
    };
  });

  const offers = campaigns.flatMap((entry) => {
    const campaign = mapBackendAdzCampaign(entry);
    const supplier = asObject(campaign.supplier);
    const supplierId = String(supplier.id || supplier.name || campaign.id);
    return asArray<Record<string, unknown>>(campaign.offers).map((offer) => ({
      id: String(offer.id || ""),
      supplierId,
      campaignId: String(campaign.id),
      type: String(offer.type || "PRODUCT"),
      name: String(offer.name || "Offer"),
      listingId: String(
        offer.listingId ||
          offer.marketplaceListingId ||
          offer.catalogListingId ||
          offer.productId ||
          ""
      ),
      listingTitle: String(
        offer.listingTitle ||
          offer.catalogTitle ||
          offer.productTitle ||
          offer.title ||
          offer.name ||
          ""
      ),
      sku: readString(offer.sku || offer.catalogSku || offer.productSku || ""),
      price: Number(offer.price ?? 0),
      basePrice: Number(offer.basePrice ?? 0) || undefined,
      currency: String(offer.currency || campaign.currency || "USD"),
      stockLeft: Number(offer.stockLeft ?? -1),
      sold: Number(offer.sold ?? 0),
      catalogPosterUrl: String(offer.posterUrl || offer.catalogPosterUrl || ""),
      catalogVideoUrl: typeof offer.videoUrl === "string" ? offer.videoUrl : undefined,
    }));
  });

  return {
    suppliers: Array.from(suppliers.values()),
    campaigns: mappedCampaigns,
    offers,
  };
}

export function buildDefaultAdzBuilder(
  campaigns: Array<Record<string, unknown>>,
  assets: Array<Record<string, unknown>>
) {
  const scope = mapAdzBuilderScope(campaigns);
  const firstSupplier = scope.suppliers[0];
  const firstCampaign = scope.campaigns.find((entry) => entry.supplierId === firstSupplier?.id) || scope.campaigns[0];
  const firstOffer = scope.offers.find((entry) => entry.campaignId === firstCampaign?.id) || scope.offers[0];
  const heroImage = assets.find((entry) => String(entry.roleHint || "") === "hero_image" && String(entry.status || "") === "approved");
  const heroVideo = assets.find((entry) => String(entry.roleHint || "") === "hero_video" && String(entry.status || "") === "approved");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(end.getHours() + 1);

  return {
    supplierId: String(firstSupplier?.id || ""),
    campaignId: String(firstCampaign?.id || ""),
    selectedOfferIds: firstOffer?.id ? [String(firstOffer.id)] : [],
    primaryOfferId: String(firstOffer?.id || ""),
    platforms: ["Instagram"],
    platformOtherList: [],
    platformOtherDraft: "",
    heroImageAssetId: heroImage?.id,
    heroIntroVideoAssetId: heroVideo?.id,
    itemPosterByOfferId: {},
    itemVideoByOfferId: {},
    ctaText: "Shop the featured dealz before they end.",
    primaryCtaLabel: "Buy now",
    secondaryCtaLabel: "Add to cart",
    landingBehavior: "Checkout",
    landingUrl: "",
    shortDomain: "mldz.link",
    shortSlug: `adz-${Math.random().toString(36).slice(2, 7)}`,
    utmPresetId: "utm1",
    utmCustom: {},
    startDate: tomorrow.toISOString().slice(0, 10),
    startTime: tomorrow.toISOString().slice(11, 16),
    endDate: end.toISOString().slice(0, 10),
    endTime: end.toISOString().slice(11, 16),
  };
}
