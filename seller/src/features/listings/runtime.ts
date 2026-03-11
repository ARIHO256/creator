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
  const row = {
    id: String(value.id || ""),
    title: String(value.title || ""),
    kind: String(metadata.kind || value.kind || "Product"),
    marketplace: String(metadata.marketplace || value.marketplace || ""),
    category: String(metadata.category || value.category || ""),
    currency: String(metadata.currency || value.currency || "USD"),
    retailPrice: Number(metadata.retailPrice ?? value.price ?? 0),
    compareAt: Number(metadata.compareAt ?? 0),
    moq: Number(metadata.moq ?? 1),
    wholesaleTiers: asArray(metadata.wholesaleTiers),
    stock: Number(metadata.stock ?? value.inventoryCount ?? 0),
    inventory: asArray(metadata.inventory),
    images: Number(metadata.images ?? 0),
    translations: Number(metadata.translations ?? 0),
    description: String(value.description || ""),
    tags: asArray<string>(metadata.tags),
    status: mapBackendStatus(value.status, metadata.displayStatus),
    updatedAt:
      typeof metadata.updatedAt === "string"
        ? metadata.updatedAt
        : typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    compliance: asObject(metadata.compliance),
    kpis: asObject(metadata.kpis),
    trend: asObject(metadata.trend),
    locales: asObject(metadata.locales),
    variantMatrix: asObject(metadata.variantMatrix),
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
