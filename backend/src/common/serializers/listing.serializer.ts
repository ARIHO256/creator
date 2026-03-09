import { serializePublicSeller } from './seller.serializer.js';

type ListingRecord = {
  id: string;
  userId: string;
  sellerId: string | null;
  dealId: string | null;
  title: string;
  description: string | null;
  kind: string | null;
  category: string | null;
  sku: string | null;
  marketplace: string | null;
  price: number | null;
  currency: string;
  inventoryCount: number;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  seller?: any;
  taxonomyLinks?: Array<{
    id: string;
    taxonomyNodeId: string;
    isPrimary: boolean;
    pathSnapshot: unknown;
  }>;
};

export function serializeListingPublic(listing: ListingRecord) {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    dealId: listing.dealId,
    title: listing.title,
    description: listing.description,
    kind: listing.kind,
    category: listing.category,
    sku: listing.sku,
    marketplace: listing.marketplace,
    price: listing.price,
    currency: listing.currency,
    inventoryCount: listing.inventoryCount,
    status: listing.status,
    metadata: listing.metadata ?? {},
    taxonomy: listing.taxonomyLinks?.map((link) => ({
      taxonomyNodeId: link.taxonomyNodeId,
      isPrimary: link.isPrimary,
      pathSnapshot: link.pathSnapshot ?? null
    })) ?? [],
    seller: listing.seller ? serializePublicSeller(listing.seller) : null,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString()
  };
}
