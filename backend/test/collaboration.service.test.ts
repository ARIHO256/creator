import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignStatus } from '@prisma/client';
import { CollaborationService } from '../src/modules/collaboration/collaboration.service.js';

test('CollaborationService.updateDealzMarketplace materializes deal workspace rows into backend records', async () => {
  let workspacePayload: Record<string, unknown> | null = null;
  let campaignUpsert: any = null;
  let adzBuilderUpsert: any = null;
  let adzCampaignUpsert: any = null;
  let adzPerformanceUpsert: any = null;
  let liveSessionUpsert: any = null;
  const createdLinks: any[] = [];

  const prisma = {
    workspaceSetting: {
      async findUnique() {
        return null;
      },
      async upsert({ create, update }: any) {
        workspacePayload = (update?.payload ?? create.payload) as Record<string, unknown>;
        return {
          payload: workspacePayload
        };
      }
    },
    user: {
      async findUnique() {
        return {
          id: 'creator-1',
          creatorProfile: { userId: 'creator-1' },
          sellerProfile: null
        };
      }
    },
    seller: {
      async findMany() {
        return [];
      },
      async findUnique({ where }: any) {
        assert.equal(where.id, 'seller-1');
        return { id: 'seller-1' };
      }
    },
    creatorProfile: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return {
          userId: 'creator-1',
          name: 'Amina',
          handle: 'amina',
          isKycVerified: true
        };
      }
    },
    campaign: {
      async findMany() {
        return [];
      },
      async upsert(args: any) {
        campaignUpsert = args;
        return {
          id: 'deal-1'
        };
      }
    },
    liveCampaignGiveaway: {
      async deleteMany() {
        return { count: 0 };
      },
      async createMany() {
        return { count: 0 };
      }
    },
    adzBuilder: {
      async upsert(args: any) {
        adzBuilderUpsert = args;
        return { id: args.where.id };
      },
      async deleteMany() {
        return { count: 0 };
      }
    },
    adzCampaign: {
      async upsert(args: any) {
        adzCampaignUpsert = args;
        return { id: args.where.id };
      },
      async deleteMany() {
        return { count: 0 };
      }
    },
    adzPerformance: {
      async upsert(args: any) {
        adzPerformanceUpsert = args;
        return { campaignId: args.where.campaignId };
      },
      async deleteMany() {
        return { count: 0 };
      }
    },
    liveSession: {
      async upsert(args: any) {
        liveSessionUpsert = args;
        return { id: args.where.id };
      },
      async deleteMany() {
        return { count: 0 };
      }
    },
    adzLink: {
      async deleteMany() {
        return { count: 0 };
      },
      async create(args: any) {
        createdLinks.push(args);
        return args.data;
      }
    }
  };

  const service = new CollaborationService(prisma as any);
  const result = await service.updateDealzMarketplace('creator-1', {
    deals: [
      {
        id: 'deal-1',
        type: 'Live + Shoppables',
        title: 'Glow Week',
        tagline: 'Shop the drop',
        notes: 'Creator-led launch',
        supplier: {
          id: 'seller-1',
          name: 'Glow Supplier',
          category: 'Beauty',
          logoUrl: 'https://cdn.example.com/seller.png'
        },
        creator: {
          id: 'creator-1',
          name: 'Amina',
          handle: '@amina'
        },
        startISO: '2026-04-10T10:00:00.000Z',
        endISO: '2026-04-10T12:00:00.000Z',
        shoppable: {
          id: 'ad-deal-1',
          status: 'Generated',
          campaignName: 'Glow Week',
          campaignSubtitle: 'Shop the drop',
          shortDomain: 'mldz.link',
          shortSlug: 'glow01',
          shareLink: 'https://mldz.link/glow01',
          landingUrl: 'https://shop.example.com/glow-week',
          clicks7d: 240,
          orders7d: 17,
          revenue7d: 850,
          impressions7d: 7200,
          offers: []
        },
        live: {
          id: 'live-deal-1',
          status: 'Scheduled',
          title: 'Glow Week Live',
          description: 'Join the stream',
          promoLink: 'https://mylivedealz.com/live/glow-week',
          startISO: '2026-04-10T10:00:00.000Z',
          endISO: '2026-04-10T12:00:00.000Z',
          platforms: ['TikTok Live'],
          featured: []
        }
      }
    ]
  });

  assert.equal((workspacePayload?.deals as any[])?.length, 1);
  assert.equal((result.deals as any[])?.length, 1);

  assert.equal(campaignUpsert.where.id, 'deal-1');
  assert.equal(campaignUpsert.create.sellerId, 'seller-1');
  assert.equal(campaignUpsert.create.creatorId, 'creator-1');
  assert.equal(campaignUpsert.create.status, CampaignStatus.ACTIVE);
  assert.equal(campaignUpsert.create.metadata.source, 'dealz-marketplace');
  assert.equal(campaignUpsert.create.metadata.marketplaceType, 'Live + Shoppables');

  assert.ok(String(adzBuilderUpsert.where.id).includes('adz-builder_creator-1_deal-1'));
  assert.equal(adzBuilderUpsert.create.status, 'generated');
  assert.equal(adzCampaignUpsert.where.id, 'deal-1');
  assert.equal(adzCampaignUpsert.create.isMarketplace, true);
  assert.equal(adzCampaignUpsert.create.data.campaignId, 'deal-1');
  assert.equal(adzCampaignUpsert.create.data.sourceCampaignId, 'deal-1');

  assert.equal(adzPerformanceUpsert.where.campaignId, 'deal-1');
  assert.equal(adzPerformanceUpsert.create.clicks, 240);
  assert.equal(adzPerformanceUpsert.create.purchases, 17);
  assert.equal(adzPerformanceUpsert.create.earnings, 850);
  assert.equal(adzPerformanceUpsert.create.data.impressions7d, 7200);

  assert.equal(liveSessionUpsert.where.id, 'deal-1');
  assert.equal(liveSessionUpsert.create.status, 'scheduled');
  assert.equal(liveSessionUpsert.create.data.campaignId, 'deal-1');
  assert.equal(liveSessionUpsert.create.data.promoLink, 'https://mylivedealz.com/live/glow-week');

  assert.equal(createdLinks.length, 3);
  assert.deepEqual(
    createdLinks.map((entry) => entry.data.id).sort(),
    ['deal-1_landing', 'deal-1_promo', 'deal-1_share']
  );
  assert.equal(createdLinks[0].data.userId, 'creator-1');
});

test('CollaborationService.updateDealzMarketplace removes materialized records for deals deleted from workspace', async () => {
  let workspacePayload: Record<string, unknown> | null = null;
  let campaignDeleteManyArgs: any = null;
  let adzBuilderDeleteManyArgs: any = null;
  let adzCampaignDeleteManyArgs: any = null;
  let adzPerformanceDeleteManyArgs: any = null;
  let liveSessionDeleteManyArgs: any = null;
  let adzLinkDeleteManyArgs: any = null;

  const prisma = {
    workspaceSetting: {
      async findUnique() {
        return {
          payload: {
            deals: [
              {
                id: 'deal-1',
                title: 'Glow Week'
              }
            ],
            selectedId: 'deal-1',
            cart: {},
            liveCart: {}
          }
        };
      },
      async upsert({ create, update }: any) {
        workspacePayload = (update?.payload ?? create.payload) as Record<string, unknown>;
        return {
          payload: workspacePayload
        };
      }
    },
    seller: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return null;
      }
    },
    creatorProfile: {
      async findMany() {
        return [];
      },
      async findUnique() {
        return {
          userId: 'creator-1',
          name: 'Amina',
          handle: 'amina',
          isKycVerified: true
        };
      }
    },
    campaign: {
      async findMany() {
        return [
          {
            id: 'deal-1',
            sellerId: 'seller-1',
            seller: null,
            creator: null,
            metadata: { source: 'dealz-marketplace', marketplaceType: 'Shoppable Adz' },
            title: 'Glow Week',
            description: null,
            startAt: null,
            endAt: null
          }
        ];
      },
      async deleteMany(args: any) {
        campaignDeleteManyArgs = args;
        return { count: 1 };
      }
    },
    user: {
      async findUnique() {
        return {
          id: 'creator-1',
          creatorProfile: { userId: 'creator-1' },
          sellerProfile: null
        };
      }
    },
    liveCampaignGiveaway: {
      async deleteMany() {
        return { count: 0 };
      },
      async createMany() {
        return { count: 0 };
      }
    },
    adzBuilder: {
      async deleteMany(args: any) {
        adzBuilderDeleteManyArgs = args;
        return { count: 1 };
      }
    },
    adzCampaign: {
      async deleteMany(args: any) {
        adzCampaignDeleteManyArgs = args;
        return { count: 1 };
      }
    },
    adzPerformance: {
      async deleteMany(args: any) {
        adzPerformanceDeleteManyArgs = args;
        return { count: 1 };
      }
    },
    liveSession: {
      async deleteMany(args: any) {
        liveSessionDeleteManyArgs = args;
        return { count: 1 };
      }
    },
    adzLink: {
      async deleteMany(args: any) {
        adzLinkDeleteManyArgs = args;
        return { count: 3 };
      }
    }
  };

  const service = new CollaborationService(prisma as any);
  const result = await service.updateDealzMarketplace('creator-1', {
    deals: [],
    selectedId: '',
    cart: {},
    liveCart: {}
  });

  assert.deepEqual(result.deals, []);
  assert.deepEqual((workspacePayload?.deals as any[]) ?? [], []);
  assert.deepEqual(adzPerformanceDeleteManyArgs.where.campaignId.in, ['deal-1']);
  assert.deepEqual(adzCampaignDeleteManyArgs.where.id.in, ['deal-1']);
  assert.deepEqual(liveSessionDeleteManyArgs.where.id.in, ['deal-1']);
  assert.deepEqual(campaignDeleteManyArgs.where.id.in, ['deal-1']);
  assert.deepEqual(adzBuilderDeleteManyArgs.where.id.in, ['adz-builder_creator-1_deal-1']);
  assert.deepEqual(adzLinkDeleteManyArgs.where.id.in.sort(), ['deal-1_landing', 'deal-1_promo', 'deal-1_share']);
});
