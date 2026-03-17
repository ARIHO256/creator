import assert from 'node:assert/strict';
import test from 'node:test';
import { DiscoveryService } from '../src/modules/discovery/discovery.service.js';

test('DiscoveryService.sellers enriches provider cards with onboarding-backed capabilities and legal links', async () => {
  const now = new Date();
  const prisma = {};
  const prismaRead = {
    seller: {
      async findMany() {
        return [
          {
            id: 'seller-1',
            userId: 'user-1',
            handle: 'provider-studio',
            name: 'Provider Studio',
            displayName: 'Provider Studio',
            legalBusinessName: null,
            storefrontName: 'Provider Studio',
            type: 'Provider',
            kind: 'PROVIDER',
            category: 'Services',
            categories: '[]',
            region: 'UG',
            description: 'Provider',
            languages: '["en"]',
            rating: 4.9,
            isVerified: true,
            createdAt: now,
            updatedAt: now
          }
        ];
      }
    },
    providerRecord: {
      async findMany() {
        return [
          {
            userId: 'user-1',
            payload: {
              providerServices: ['consulting'],
              bookingModes: ['quotes', 'consultations']
            }
          }
        ];
      }
    },
    userSetting: {
      async findMany() {
        return [
          {
            userId: 'user-1',
            payload: {
              profile: {
                identity: {
                  website: 'https://provider.example.com'
                },
                policies: {
                  termsUrl: 'https://provider.example.com/terms',
                  privacyUrl: 'https://provider.example.com/privacy'
                }
              }
            }
          }
        ];
      }
    }
  };
  const searchService = {};
  const cache = {
    async getOrSet(_key: string, _ttlMs: number, loader: () => Promise<unknown>) {
      return loader();
    }
  };
  const publicReadCache = {
    discoverySellersKey() {
      return 'discovery:sellers';
    },
    publicReadTtlMs() {
      return 1000;
    }
  };

  const service = new DiscoveryService(
    prisma as any,
    prismaRead as any,
    searchService as any,
    cache as any,
    publicReadCache as any
  );

  const sellers = await service.sellers();
  assert.equal(sellers.length, 1);
  assert.equal(sellers[0].website, 'https://provider.example.com');
  assert.equal(sellers[0].policies.termsUrl, 'https://provider.example.com/terms');
  assert.equal(sellers[0].capabilities.quotes, true);
  assert.equal(sellers[0].capabilities.bookings, false);
  assert.deepEqual(sellers[0].providerServices, ['consulting']);
  assert.deepEqual(sellers[0].bookingModes, ['quotes', 'consultations']);
  assert.equal(sellers[0].requestActions.booking.enabled, false);
  assert.equal(sellers[0].requestActions.consultation.enabled, true);
  assert.equal(sellers[0].requestActions.consultation.path, '/api/provider/consultations');
  assert.equal(sellers[0].requestActions.consultation.providerHandle, '@provider-studio');
});
