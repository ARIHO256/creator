export type ListingUiStatus = "Draft" | "In Review" | "Live" | "Paused" | "Rejected";

export type ListingVersionRecord<T> = {
  id: string;
  at: string;
  actor: string;
  note: string;
  snapshot: T;
};

export const SELLER_LISTINGS_LABELS = {
  hubTitle: "Listings Hub",
  hubSubtitle: "Manage listings with enterprise-grade editing and governance.",
  newListingLabel: "+ New Listing",
  newListingToastTitle: "New Listing",
  newListingToastMessage: "This page will be built separately.",
  newListingToastAction: "Open taxonomy",
  listingsLabel: "Listings",
  selectedListingLabel: "Selected listing",
  emptyTitle: "No listings found",
  emptyMessage: "Try different filters, or create a new listing.",
  kpiViewsLabel: "Views",
  kpiAddLabel: "Add to cart",
  kpiOrdersLabel: "Orders",
  ordersTrendLabel: "Orders trend",
  previewTitle: "Listing preview",
  previewSubtitle: "Retail and wholesale listing snapshot.",
  retailLabel: "Retail",
  wholesaleLabel: "Wholesale",
  compareLabel: "Compare at",
  moqLabel: "MOQ",
  bestTierLabel: "Best tier",
  primaryCtaLabel: "Share preview",
  secondaryCtaLabel: "Open listing"
} as const;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeWholesaleTier(tier: Record<string, unknown>) {
  return {
    qty: asNumber(tier.qty ?? tier.minQty) || 1,
    price: asNumber(tier.price),
  };
}

function isUsableWholesaleTier(tier: { qty: number; price: number }) {
  return tier.qty > 0 && tier.price > 0;
}

function deriveWizardData(metadata: Record<string, unknown>) {
  return asObject(metadata.wizardData);
}

function deriveWholesaleSourceVariant(wizardData: Record<string, unknown>) {
  const variants = asArray<Record<string, unknown>>(wizardData.variants);
  return (
    variants.find((variant) =>
      asArray<Record<string, unknown>>(variant.wholesaleTiers)
        .map((tier) => normalizeWholesaleTier(tier))
        .some((tier) => isUsableWholesaleTier(tier))
    ) || variants[0]
  );
}

function deriveWholesaleTiers(
  metadata: Record<string, unknown>,
  wizardData: Record<string, unknown>
) {
  const directTiers = asArray<Record<string, unknown>>(metadata.wholesaleTiers);
  const normalizedDirectTiers = directTiers
    .map((tier) => normalizeWholesaleTier(tier))
    .filter((tier) => isUsableWholesaleTier(tier));
  if (normalizedDirectTiers.length > 0) {
    return normalizedDirectTiers.sort((left, right) => left.qty - right.qty);
  }

  const sourceVariant = deriveWholesaleSourceVariant(wizardData);

  return asArray<Record<string, unknown>>(sourceVariant?.wholesaleTiers)
    .map((tier) => normalizeWholesaleTier(tier))
    .filter((tier) => isUsableWholesaleTier(tier))
    .sort((left, right) => left.qty - right.qty);
}

function deriveRetailPrice(
  metadata: Record<string, unknown>,
  value: Record<string, unknown>,
  wizardData: Record<string, unknown>,
  sourceVariant: Record<string, unknown>,
  wholesaleTiers: Array<{ qty: number; price: number }>
) {
  const direct = metadata.retailPrice ?? value.price;
  const directPrice = asNumber(direct);
  if (direct !== undefined && direct !== null && String(direct) !== "" && directPrice > 0) {
    return directPrice;
  }

  const wizardPrice = wizardData.price;
  const normalizedWizardPrice = asNumber(wizardPrice);
  if (
    wizardPrice !== undefined &&
    wizardPrice !== null &&
    String(wizardPrice) !== "" &&
    normalizedWizardPrice > 0
  ) {
    return normalizedWizardPrice;
  }

  const sourceVariantPrice = asNumber(sourceVariant?.price);
  if (sourceVariantPrice > 0) {
    return sourceVariantPrice;
  }

  const variants = asArray<Record<string, unknown>>(wizardData.variants);
  const firstVariantPrice = variants
    .map((variant) => asNumber((variant as Record<string, unknown>).price))
    .find((price) => price > 0);
  if (firstVariantPrice) {
    return firstVariantPrice;
  }

  return wholesaleTiers[0]?.price ?? 0;
}

function deriveInventory(
  metadata: Record<string, unknown>,
  value: Record<string, unknown>,
  wizardData: Record<string, unknown>,
  fallbackMarketplace: string,
  stock: number
) {
  const inventory = asArray<Record<string, unknown>>(metadata.inventory);
  if (inventory.length > 0) {
    return inventory;
  }

  const selectedMarkets = asArray<Record<string, unknown>>(metadata.selectedMarkets);
  const selectedMarketNames = selectedMarkets
    .map((entry) => String(entry.name || "").trim())
    .filter(Boolean);
  const location =
    selectedMarketNames.join(", ") ||
    fallbackMarketplace ||
    String(value.marketplace || "").trim() ||
    "Main";

  return [
    {
      id: "main",
      location,
      onHand: stock,
      reserved: 0,
    },
  ];
}

function deriveCompliance(metadata: Record<string, unknown>, wizardData: Record<string, unknown>) {
  const compliance = asObject(metadata.compliance);
  if (Object.keys(compliance).length > 0) {
    return compliance;
  }

  const issues = [];
  if (!wizardData.heroImageUploaded) issues.push("Missing hero image");
  if (!String(wizardData.seoTitle || "").trim()) issues.push("Missing SEO title");
  if (!String(wizardData.seoDescription || "").trim()) issues.push("Missing SEO description");

  return {
    state: issues.length === 0 ? "ok" : "warn",
    issues,
  };
}

function mapBackendStatus(status: unknown, displayStatus: unknown): ListingUiStatus {
  if (typeof displayStatus === "string") {
    if (displayStatus === "Draft") return "Draft";
    if (displayStatus === "In Review") return "In Review";
    if (displayStatus === "Live") return "Live";
    if (displayStatus === "Paused") return "Paused";
    if (displayStatus === "Rejected") return "Rejected";
  }

  const normalized = String(status || "").toUpperCase();
  if (normalized === "ACTIVE") return "Live";
  if (normalized === "IN_REVIEW") return "In Review";
  if (normalized === "PAUSED") return "Paused";
  if (normalized === "ARCHIVED") return "Rejected";
  return "Draft";
}

export function mapListingStatusToBackend(status: ListingUiStatus) {
  if (status === "Live") return "ACTIVE";
  if (status === "In Review") return "IN_REVIEW";
  if (status === "Paused") return "PAUSED";
  if (status === "Rejected") return "ARCHIVED";
  return "DRAFT";
}

export function mapBackendListing<T extends Record<string, any>>(
  value: Record<string, unknown>,
  calcQuality: (row: T) => number
): T {
  const metadata = asObject(value.metadata);
  const wizardData = deriveWizardData(metadata);
  const sourceVariant = deriveWholesaleSourceVariant(wizardData);
  const wholesaleTiers = deriveWholesaleTiers(metadata, wizardData);
  const retailPrice = deriveRetailPrice(metadata, value, wizardData, sourceVariant, wholesaleTiers);
  const stock =
    metadata.stock !== undefined && metadata.stock !== null
      ? asNumber(metadata.stock)
      : value.inventoryCount !== undefined && value.inventoryCount !== null
        ? asNumber(value.inventoryCount)
        : asArray<Record<string, unknown>>(wizardData.variants).reduce(
            (sum, variant) => sum + asNumber((variant as Record<string, unknown>).stockQty),
            0
          );
  const marketplace = String(metadata.marketplace || value.marketplace || "");
  const row = {
    id: String(value.id || ""),
    title: String(value.title || ""),
    kind: String(metadata.kind || value.kind || "Product"),
    marketplace,
    category: String(metadata.category || value.category || ""),
    currency: String(metadata.currency || value.currency || "USD"),
    retailPrice,
    compareAt: Number(metadata.compareAt ?? 0),
    moq: Number(metadata.moq ?? wholesaleTiers[0]?.qty ?? 1),
    wholesaleTiers,
    stock,
    inventory: deriveInventory(metadata, value, wizardData, marketplace, stock),
    images: Number(metadata.images ?? (wizardData.heroImageUploaded ? 1 : 0)),
    translations: Number(metadata.translations ?? 1),
    description: String(value.description || ""),
    tags: asArray<string>(metadata.tags),
    status: mapBackendStatus(value.status, metadata.displayStatus),
    updatedAt:
      typeof metadata.updatedAt === "string"
        ? metadata.updatedAt
        : typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    compliance: deriveCompliance(metadata, wizardData),
    kpis: asObject(metadata.kpis),
    trend: asObject(metadata.trend),
    locales:
      Object.keys(asObject(metadata.locales)).length > 0
        ? asObject(metadata.locales)
        : {
            en: {
              title: String(value.title || ""),
              description: String(value.description || ""),
            },
          },
    variantMatrix:
      Object.keys(asObject(metadata.variantMatrix)).length > 0
        ? asObject(metadata.variantMatrix)
        : {
            enabled: true,
            attributes: [],
            variants: asArray<Record<string, unknown>>(wizardData.variants).map((variant, index) => ({
              id: String(variant.id || `variant-${index + 1}`),
              key: String(variant.name || `Variant ${index + 1}`),
              sku: String(variant.sku || ""),
              priceDelta: 0,
              stock: asNumber(variant.stockQty),
              active: true,
            })),
          },
    approval: asObject(metadata.approval),
    sku: String(value.sku || metadata.sku || value.id || ""),
    quality: 0
  } as T;

  row.quality = calcQuality(row);
  return row;
}

export function mapListingVersions<T>(value: Record<string, unknown>) {
  const metadata = asObject(value.metadata);
  const versions = asArray<ListingVersionRecord<T>>(metadata.versions);
  return versions;
}

export function buildListingPayload<T extends Record<string, any>>(
  listing: T,
  versions: Array<ListingVersionRecord<T>>
) {
  return {
    title: String(listing.title || ""),
    description: String(listing.description || ""),
    kind: String(listing.kind || "").toUpperCase(),
    category: String(listing.category || ""),
    sku: String(listing.sku || listing.id || ""),
    marketplace: String(listing.marketplace || ""),
    price: Number(listing.retailPrice || 0),
    currency: String(listing.currency || "USD"),
    inventoryCount: Number(listing.stock || 0),
    status: mapListingStatusToBackend(listing.status as ListingUiStatus),
    metadata: {
      displayStatus: listing.status,
      kind: listing.kind,
      marketplace: listing.marketplace,
      category: listing.category,
      currency: listing.currency,
      retailPrice: Number(listing.retailPrice || 0),
      compareAt: Number(listing.compareAt || 0),
      moq: Number(listing.moq || 1),
      wholesaleTiers: Array.isArray(listing.wholesaleTiers) ? listing.wholesaleTiers : [],
      stock: Number(listing.stock || 0),
      inventory: Array.isArray(listing.inventory) ? listing.inventory : [],
      images: Number(listing.images || 0),
      translations: Number(listing.translations || 0),
      tags: Array.isArray(listing.tags) ? listing.tags : [],
      compliance: listing.compliance || {},
      kpis: listing.kpis || {},
      trend: listing.trend || {},
      locales: listing.locales || undefined,
      variantMatrix: listing.variantMatrix || undefined,
      approval: listing.approval || undefined,
      updatedAt: listing.updatedAt || new Date().toISOString(),
      versions
    }
  };
}
