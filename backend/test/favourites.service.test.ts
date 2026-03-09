import assert from 'node:assert/strict';
import test from 'node:test';
import { FavouritesService } from '../src/modules/favourites/favourites.service.js';

test('FavouritesService adds listing favourites for active listings', async () => {
  const now = new Date();
  const listing = {
    id: 'listing-1',
    userId: 'seller-user',
    sellerId: 'seller-1',
    dealId: null,
    title: 'Listing',
    description: null,
    kind: null,
    category: null,
    sku: null,
    marketplace: 'EXPRESSMART',
    price: 100,
    currency: 'USD',
    inventoryCount: 2,
    status: 'ACTIVE',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    taxonomyLinks: [],
    seller: {
      id: 'seller-1',
      userId: 'seller-user',
      handle: 'seller-1',
      name: 'Seller',
      displayName: 'Seller',
      legalBusinessName: null,
      storefrontName: 'Seller',
      type: 'Seller',
      kind: 'SELLER',
      category: null,
      categories: null,
      region: null,
      description: null,
      languages: null,
      rating: 4.2,
      isVerified: true,
      createdAt: now,
      updatedAt: now
    }
  };

  const prisma = {
    marketplaceListing: {
      async findFirst({ where }: any) {
        return where.id === 'listing-1' && where.status === 'ACTIVE' ? listing : null;
      }
    },
    listingFavorite: {
      async upsert() {
        return { id: 'fav-1' };
      }
    }
  };

  const service = new FavouritesService(prisma as any);
  const response = await service.addListing('user-1', 'listing-1');

  assert.equal(response.listing.id, 'listing-1');
  assert.equal(response.listing.seller?.id, 'seller-1');
});

test('FavouritesService rejects missing listings', async () => {
  const prisma = {
    marketplaceListing: {
      async findFirst() {
        return null;
      }
    },
    listingFavorite: {
      async upsert() {
        return { id: 'fav-1' };
      }
    }
  };

  const service = new FavouritesService(prisma as any);
  await assert.rejects(
    () => service.addListing('user-1', 'missing'),
    /Listing not found/
  );
});
