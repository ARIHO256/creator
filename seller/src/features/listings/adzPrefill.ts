type ListingLike = Record<string, unknown>;

export type ListingAdzPrefill = {
  source: "listing";
  listingId: string;
  title: string;
  sku?: string;
  marketplace?: string;
  category?: string;
  currency?: string;
  retailPrice?: number;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readFirstSku(listing: ListingLike) {
  const variantMatrix = asObject(listing.variantMatrix);
  const variants = asArray<Record<string, unknown>>(variantMatrix.variants);
  const sku = variants
    .map((variant) => String(variant.sku || "").trim())
    .find(Boolean);
  return sku || undefined;
}

export function buildListingAdzPrefill(listing: ListingLike): ListingAdzPrefill {
  return {
    source: "listing",
    listingId: String(listing.id || ""),
    title: String(listing.title || ""),
    sku: readFirstSku(listing),
    marketplace: String(listing.marketplace || ""),
    category: String(listing.category || ""),
    currency: String(listing.currency || ""),
    retailPrice: Number(listing.retailPrice ?? 0) || undefined,
  };
}
