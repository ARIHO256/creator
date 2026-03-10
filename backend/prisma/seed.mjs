import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { buildSeedData } from '../src/legacy/seed/buildSeedData.js';

const prisma = new PrismaClient();

const now = Date.now();
const daysFromNow = (days) => new Date(now + days * 24 * 60 * 60 * 1000);
const daysAgo = (days) => new Date(now - days * 24 * 60 * 60 * 1000);

function toTier(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'GOLD') return 'GOLD';
  if (normalized === 'SILVER') return 'SILVER';
  return 'BRONZE';
}

function buildRoleAssignments(userId, roles) {
  return roles.map((role) => ({ userId, role }));
}

async function seedUsers(seed) {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const seedUser = seed.users?.[0];
  const seedProfile = seed.creatorProfiles?.[0];

  const creator = await prisma.user.create({
    data: {
      id: seedUser?.id ?? 'user_ronald',
      email: seedUser?.email ?? 'creator@mylivedealz.com',
      phone: '+256700000001',
      passwordHash,
      role: 'CREATOR',
      approvalStatus: 'APPROVED',
      onboardingCompleted: true,
      creatorProfile: {
        create: {
          id: seedProfile?.id ?? 'creator_profile_ronald',
          name: seedProfile?.name ?? 'Ronald M',
          handle: seedProfile?.handle ?? 'ronald.m',
          tier: toTier(seedProfile?.tier),
          tagline: seedProfile?.tagline ?? 'Live commerce host for EV and tech brands',
          bio:
            seedProfile?.bio ??
            'Creator profile seeded for shared backend testing across creator and seller domains.',
          categories: JSON.stringify(seedProfile?.categories ?? ['EV', 'Gadgets', 'Live Shopping']),
          regions: JSON.stringify(seedProfile?.regions ?? ['UG', 'KE']),
          languages: JSON.stringify(seedProfile?.languages ?? ['English', 'Luganda']),
          followers: Number(seedProfile?.followers ?? 182400),
          rating: Number(seedProfile?.rating ?? 4.8),
          totalSalesDriven: Number(seedProfile?.totalSalesDriven ?? 248000)
        }
      }
    }
  });

  const sellerUser = await prisma.user.create({
    data: {
      id: 'user_seller_evhub',
      email: 'seller@evhub.com',
      phone: '+256700000002',
      passwordHash,
      role: 'SELLER',
      approvalStatus: 'APPROVED',
      onboardingCompleted: true
    }
  });

  const providerUser = await prisma.user.create({
    data: {
      id: 'user_provider_streamops',
      email: 'provider@streamops.com',
      phone: '+256700000003',
      passwordHash,
      role: 'PROVIDER',
      approvalStatus: 'APPROVED',
      onboardingCompleted: true
    }
  });

  await prisma.userRoleAssignment.createMany({
    data: [
      ...buildRoleAssignments(creator.id, ['CREATOR', 'SELLER']),
      ...buildRoleAssignments(sellerUser.id, ['SELLER']),
      ...buildRoleAssignments(providerUser.id, ['PROVIDER'])
    ]
  });

  return { creator, sellerUser, providerUser };
}

async function seedSellers(users, seed) {
  const seller = await prisma.seller.create({
    data: {
      id: 'seller_evhub',
      userId: users.sellerUser.id,
      handle: 'evhub',
      name: 'EV Hub',
      displayName: 'EV Hub',
      legalBusinessName: 'EV Hub Commerce Ltd',
      storefrontName: 'EV Hub Store',
      type: 'Seller',
      kind: 'SELLER',
      category: 'Electric Mobility',
      categories: JSON.stringify(['Chargers', 'Batteries', 'Accessories']),
      region: 'UG',
      description: 'Seller workspace for EV hardware and creator-led campaigns.',
      languages: JSON.stringify(['English']),
      rating: 4.7,
      isVerified: true
    }
  });

  const provider = await prisma.seller.create({
    data: {
      id: 'seller_streamops',
      userId: users.providerUser.id,
      handle: 'streamops',
      name: 'StreamOps Studio',
      displayName: 'StreamOps Studio',
      legalBusinessName: 'StreamOps Media Services',
      storefrontName: 'StreamOps Services',
      type: 'Provider',
      kind: 'PROVIDER',
      category: 'Production Services',
      categories: JSON.stringify(['Studio Ops', 'Live Production']),
      region: 'KE',
      description: 'Provider workspace for live production and campaign operations.',
      languages: JSON.stringify(['English', 'Swahili']),
      rating: 4.9,
      isVerified: true
    }
  });

  const extraSellers = (seed.sellers || []).slice(0, 3).map((item, index) => ({
    id: item.id || `seed_seller_${index + 1}`,
    handle: `seed-seller-${index + 1}`,
    name: item.name,
    displayName: item.name,
    type: item.type || 'Seller',
    kind: 'SELLER',
    category: item.category || item.categories?.[0] || 'General',
    categories: JSON.stringify(item.categories || []),
    region: item.region || 'UG',
    description: item.note || 'Imported from legacy discovery seed.',
    languages: JSON.stringify(['English']),
    rating: Number(item.rating || 4.3),
    isVerified: Number(item.rating || 0) >= 4.5
  }));

  if (extraSellers.length) {
    await prisma.seller.createMany({ data: extraSellers });
  }

  return { seller, provider };
}

async function seedDiscovery(users, sellerProfiles) {
  const opportunities = await prisma.opportunity.createMany({
    data: [
      {
        id: 'opp_ev_launch',
        sellerId: sellerProfiles.seller.id,
        createdByUserId: users.sellerUser.id,
        title: 'EV charger launch campaign',
        description: 'Looking for creators to drive awareness and conversion for a new home charger.',
        payBand: 'USD 500 - 1200',
        status: 'OPEN',
        metadata: {
          regions: ['UG', 'KE'],
          formats: ['Live', 'Video Review']
        }
      },
      {
        id: 'opp_streamops_showcase',
        sellerId: sellerProfiles.provider.id,
        createdByUserId: users.providerUser.id,
        title: 'Co-hosted live production showcase',
        description: 'Seeking a creator to co-host a behind-the-scenes production stream.',
        payBand: 'USD 800 flat',
        status: 'INVITE_ONLY',
        metadata: {
          regions: ['KE'],
          formats: ['Live']
        }
      }
    ]
  });

  await prisma.collaborationInvite.createMany({
    data: [
      {
        id: 'invite_ev_creator',
        sellerId: sellerProfiles.seller.id,
        opportunityId: 'opp_ev_launch',
        senderUserId: users.sellerUser.id,
        recipientUserId: users.creator.id,
        title: 'Invitation to EV charger launch campaign',
        message: 'We want you to lead the live commerce rollout for our new charger line.',
        status: 'PENDING',
        metadata: {
          origin: 'sellerfront',
          compensation: 'USD 950'
        }
      },
      {
        id: 'invite_creator_provider',
        sellerId: sellerProfiles.provider.id,
        senderUserId: users.creator.id,
        recipientUserId: users.providerUser.id,
        title: 'Need provider support for creator live campaign',
        message: 'Looking for live ops support for a multi-session launch.',
        status: 'PENDING',
        metadata: {
          origin: 'creator-app',
          serviceType: 'studio-ops'
        }
      }
    ]
  });

  return opportunities;
}

async function seedMarketplace(users, sellerProfiles) {
  await prisma.deal.createMany({
    data: [
      {
        id: 'deal_creator_ev_review',
        userId: users.creator.id,
        title: 'EV launch creator package',
        description: 'Creator-facing deal package for the EV launch season.',
        category: 'Electric Mobility',
        price: 950,
        currency: 'USD',
        status: 'ACTIVE',
        startAt: daysAgo(15),
        endAt: daysFromNow(20)
      }
    ]
  });

  await prisma.marketplaceListing.createMany({
    data: [
      {
        id: 'listing_ev_charger',
        userId: users.sellerUser.id,
        sellerId: sellerProfiles.seller.id,
        dealId: 'deal_creator_ev_review',
        title: 'EV Fast Charger 7kW Wallbox',
        description: 'Seller-owned listing shared through the marketplace feed.',
        kind: 'PRODUCT',
        category: 'Chargers',
        sku: 'EV-CHG-7KW',
        marketplace: 'EVmart',
        price: 620,
        currency: 'USD',
        inventoryCount: 18,
        status: 'ACTIVE',
        metadata: {
          compareAt: 720,
          moq: 2,
          tags: ['wallbox', '7kW', 'OCPP']
        }
      },
      {
        id: 'listing_streamops_package',
        userId: users.providerUser.id,
        sellerId: sellerProfiles.provider.id,
        title: 'Live production support package',
        description: 'Provider listing for technical live-stream support.',
        kind: 'SERVICE',
        category: 'Production',
        sku: 'PROD-LIVE-001',
        marketplace: 'MyLiveDealz',
        price: 1200,
        currency: 'USD',
        inventoryCount: 999,
        status: 'ACTIVE',
        metadata: {
          serviceWindow: '4 hours',
          deliverables: ['OBS scene setup', 'moderation support']
        }
      }
    ]
  });
}

async function seedCollaboration(users, sellerProfiles) {
  await prisma.campaign.create({
    data: {
      id: 'campaign_ev_launch',
      sellerId: sellerProfiles.seller.id,
      creatorId: users.creator.id,
      opportunityId: 'opp_ev_launch',
      createdByUserId: users.sellerUser.id,
      title: 'EV Hub charger launch',
      description: 'Shared campaign record spanning seller planning and creator execution.',
      status: 'ACTIVE',
      budget: 1250,
      currency: 'USD',
      metadata: {
        channels: ['Live', 'Short Video'],
        objectives: ['Awareness', 'Sales']
      },
      startAt: daysAgo(2),
      endAt: daysFromNow(28)
    }
  });

  await prisma.proposal.create({
    data: {
      id: 'proposal_ev_launch',
      campaignId: 'campaign_ev_launch',
      sellerId: sellerProfiles.seller.id,
      creatorId: users.creator.id,
      submittedByUserId: users.creator.id,
      title: 'Creator proposal for EV charger launch',
      summary: 'Two live sessions, three supporting short-form clips, and tracked affiliate links.',
      amount: 1100,
      currency: 'USD',
      status: 'NEGOTIATING',
      metadata: {
        deliverables: 5
      },
      messages: {
        create: [
          {
            id: 'proposal_msg_1',
            authorUserId: users.creator.id,
            body: 'Sharing my first proposal draft with live and short-form deliverables.'
          },
          {
            id: 'proposal_msg_2',
            authorUserId: users.sellerUser.id,
            body: 'Pricing works. Please add a post-live recap asset.'
          }
        ]
      }
    }
  });

  await prisma.proposal.create({
    data: {
      id: 'proposal_autumn_beauty_room',
      campaignId: 'campaign_ev_launch',
      sellerId: sellerProfiles.seller.id,
      creatorId: users.creator.id,
      submittedByUserId: users.sellerUser.id,
      title: 'Autumn Beauty Flash · Serum Launch',
      summary: 'Live + Shoppable Adz campaign to push the new GlowUp serum across East Africa.',
      amount: 400,
      currency: 'USD',
      status: 'NEGOTIATING',
      metadata: {
        proposalIdLabel: 'P-101',
        supplierName: 'GlowUp Hub',
        supplierBadge: 'Top Brand · Beauty & Skincare',
        sellerInitials: 'GH',
        creatorInitials: 'RY',
        campaignTitle: 'Autumn Beauty Flash · Serum Launch',
        summary: 'Live + Shoppable Adz campaign to push the new GlowUp serum across East Africa.',
        liveWindow: 'Friday · 20:00–21:30 EAT',
        region: 'East Africa · Online only',
        category: 'Beauty & Skincare',
        deliverablesList: [
          '1x 60–90 min live session focussed on new GlowUp serum.',
          '3x short clips for Shoppable Adz (15–30 seconds each).',
          '2x Instagram stories before and after the live.'
        ],
        terms: {
          deliverables: '• 1x 60–90 min live session (Autumn Beauty Flash)\n• 3x short clips (15–30s) for Shoppable Adz\n• 2x Instagram stories with swipe-up',
          schedule: '• Live date: Friday, 20:00–21:30 EAT\n• Clips delivery: within 48 hours after live\n• Stories: 24 hours before and after live',
          compensation: '• Flat fee: $400\n• Commission: 5% on live-driven sales\n• Payment terms: 50% upfront, 50% 7 days after live'
        },
        appliedSuggestions: []
      },
      messages: {
        create: [
          {
            id: 'proposal_autumn_msg_1',
            authorUserId: users.sellerUser.id,
            body: 'Hi Ronald, we’re excited to do the Autumn Beauty Flash with you. We’ve drafted the terms – feel free to adjust.'
          },
          {
            id: 'proposal_autumn_msg_2',
            authorUserId: users.creator.id,
            body: 'Thanks! I’d like to add a small clip package and clarify payment timing. See edits under Compensation.'
          },
          {
            id: 'proposal_autumn_msg_3',
            authorUserId: users.sellerUser.id,
            body: 'Looks good overall. Can we cap the commission only on live sales, not 7 days after?'
          }
        ]
      }
    }
  });

  await prisma.contract.create({
    data: {
      id: 'contract_ev_launch',
      campaignId: 'campaign_ev_launch',
      proposalId: 'proposal_ev_launch',
      sellerId: sellerProfiles.seller.id,
      creatorId: users.creator.id,
      title: 'EV Hub launch agreement',
      scope: 'Two live sessions, one post-live recap, creator-managed tracked links.',
      value: 1100,
      currency: 'USD',
      status: 'ACTIVE',
      startAt: daysAgo(1),
      endAt: daysFromNow(21),
      metadata: {
        terminationNoticeDays: 7
      }
    }
  });

  await prisma.task.create({
    data: {
      id: 'task_run_of_show',
      campaignId: 'campaign_ev_launch',
      contractId: 'contract_ev_launch',
      createdByUserId: users.sellerUser.id,
      assigneeUserId: users.creator.id,
      title: 'Submit live run of show',
      description: 'Share the live rundown and CTA sequence for seller approval.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: daysFromNow(3),
      metadata: {
        lane: 'Content Prep'
      },
      comments: {
        create: [
          {
            id: 'task_comment_1',
            authorUserId: users.sellerUser.id,
            body: 'Please include warranty CTA and product comparison moments.'
          }
        ]
      },
      attachments: {
        create: [
          {
            id: 'task_attachment_1',
            addedByUserId: users.creator.id,
            name: 'run-of-show-v1.pdf',
            kind: 'pdf',
            url: 'https://example.com/run-of-show-v1.pdf'
          }
        ]
      }
    }
  });

  await prisma.deliverableAsset.create({
    data: {
      id: 'asset_post_live_recap',
      campaignId: 'campaign_ev_launch',
      contractId: 'contract_ev_launch',
      ownerUserId: users.creator.id,
      reviewerUserId: users.sellerUser.id,
      title: 'Post-live recap clip',
      assetType: 'VIDEO',
      url: 'https://example.com/post-live-recap.mp4',
      status: 'IN_REVIEW',
      metadata: {
        durationSeconds: 58
      }
    }
  });
}

async function seedCommerce(users, sellerProfiles) {
  await prisma.order.create({
    data: {
      id: 'ORD-10512',
      sellerId: sellerProfiles.seller.id,
      buyerUserId: users.creator.id,
      channel: 'EVzone',
      currency: 'USD',
      total: 2480,
      itemCount: 5,
      status: 'NEW',
      warehouse: 'Main Warehouse',
      notes: 'Seed order representing seller operations domain.',
      items: {
        create: [
          {
            id: 'order_item_1',
            listingId: 'listing_ev_charger',
            sku: 'EV-CHG-7KW',
            name: 'EV Fast Charger 7kW Wallbox',
            qty: 4,
            unitPrice: 620,
            currency: 'USD'
          }
        ]
      }
    }
  });

  await prisma.transaction.createMany({
    data: [
      {
        id: 'txn_order_1',
        userId: users.sellerUser.id,
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10512',
        type: 'ORDER_PAYMENT',
        status: 'AVAILABLE',
        amount: 2480,
        currency: 'USD',
        note: 'Order settlement pending payout',
        availableAt: daysFromNow(2),
        metadata: {
          source: 'sellerfront'
        }
      },
      {
        id: 'txn_creator_commission_1',
        userId: users.creator.id,
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10512',
        type: 'COMMISSION',
        status: 'PENDING',
        amount: 190,
        currency: 'USD',
        note: 'Creator commission from tracked campaign order',
        availableAt: daysFromNow(7),
        metadata: {
          campaignId: 'campaign_ev_launch'
        }
      },
      {
        id: 'txn_creator_payout_paid_1',
        userId: users.creator.id,
        sellerId: sellerProfiles.seller.id,
        type: 'PAYOUT',
        status: 'PAID',
        amount: 1250,
        currency: 'USD',
        note: 'Bank Transfer',
        paidAt: daysAgo(54),
        metadata: {
          requestedAt: daysAgo(54).toISOString(),
          reference: 'TXN-882190',
          recipient: 'Ronald Isabirye',
          method: 'Bank Transfer'
        }
      },
      {
        id: 'txn_creator_payout_paid_2',
        userId: users.creator.id,
        sellerId: sellerProfiles.seller.id,
        type: 'PAYOUT',
        status: 'PAID',
        amount: 450.5,
        currency: 'USD',
        note: 'Mobile Money',
        paidAt: daysAgo(59),
        metadata: {
          requestedAt: daysAgo(59).toISOString(),
          reference: 'TXN-771239',
          recipient: '+256 770 000 000',
          method: 'Mobile Money'
        }
      },
      {
        id: 'txn_creator_payout_paid_3',
        userId: users.creator.id,
        sellerId: sellerProfiles.seller.id,
        type: 'PAYOUT',
        status: 'PAID',
        amount: 2100,
        currency: 'USD',
        note: 'Bank Transfer',
        paidAt: daysAgo(72),
        metadata: {
          requestedAt: daysAgo(72).toISOString(),
          reference: 'TXN-661002',
          recipient: 'Ronald Isabirye',
          method: 'Bank Transfer'
        }
      }
    ]
  });
}

async function seedDashboardAndCompatibility(users, sellerProfiles) {
  const dashboardRecords = [
    {
      userId: users.creator.id,
      domain: 'dashboard',
      entityType: 'feed',
      entityId: 'home',
      payload: {
        role: 'CREATOR',
        hero: { title: 'Creator command center', subtitle: 'Campaigns, proposals, and deliverables in one place.' },
        quickStats: [
          { label: 'Active campaigns', value: 1 },
          { label: 'Pending tasks', value: 1 }
        ]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'dashboard',
      entityType: 'feed',
      entityId: 'home',
      payload: {
        role: 'SELLER',
        hero: { title: 'Seller operations hub', subtitle: 'Listings, orders, creator campaigns, and payouts.' },
        quickStats: [
          { label: 'Live listings', value: 2 },
          { label: 'Open orders', value: 1 }
        ]
      }
    },
    {
      userId: users.creator.id,
      domain: 'dashboard',
      entityType: 'my_day',
      entityId: 'today',
      payload: {
        agenda: ['Review EV Hub contract terms', 'Upload recap clip'],
        tasks: ['task_run_of_show']
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'dashboard',
      entityType: 'my_day',
      entityId: 'today',
      payload: {
        agenda: ['Approve creator run of show', 'Monitor ORD-10512 fulfillment'],
        tasks: ['task_run_of_show']
      }
    },
    {
      userId: null,
      domain: 'dashboard',
      entityType: 'landing',
      entityId: 'public',
      payload: {
        title: 'Unified Creator and Seller Backend',
        subtitle: 'One API, one database, role-aware workspaces.'
      }
    },
    {
      userId: users.creator.id,
      domain: 'settings',
      entityType: 'notification',
      entityId: 'notif_creator_1',
      payload: {
        title: 'Proposal updated',
        read: false,
        route: '/proposals/proposal_ev_launch'
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'settings',
      entityType: 'notification',
      entityId: 'notif_seller_1',
      payload: {
        title: 'New order received',
        read: false,
        route: '/orders/ORD-10512'
      }
    },
    {
      userId: users.creator.id,
      domain: 'finance',
      entityType: 'earnings_summary',
      entityId: 'main',
      payload: {
        available: 0,
        pending: 190,
        lifetime: 2450
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'finance',
      entityType: 'earnings_summary',
      entityId: 'main',
      payload: {
        available: 2480,
        pending: 0,
        lifetime: 18940
      }
    },
    {
      userId: users.creator.id,
      domain: 'workflow',
      entityType: 'onboarding',
      entityId: 'main',
      payload: {
        status: 'submitted',
        profileType: 'CREATOR'
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'workflow',
      entityType: 'onboarding',
      entityId: 'main',
      payload: {
        status: 'submitted',
        profileType: 'SELLER'
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'reviews',
      entityType: 'dashboard',
      entityId: 'main',
      payload: {
        score: 4.7,
        trends: [{ label: 'Response SLA', value: '97%' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'discovery',
      entityType: 'campaign_board',
      entityId: 'campaign_ev_launch',
      payload: {
        campaignId: 'campaign_ev_launch',
        title: 'EV Hub charger launch',
        status: 'ACTIVE',
        counterpart: 'Ronald M'
      }
    },
    {
      userId: users.creator.id,
      domain: 'discovery',
      entityType: 'saved_opportunity',
      entityId: 'opp_ev_launch',
      payload: {
        opportunityId: 'opp_ev_launch',
        savedAt: new Date().toISOString()
      }
    },
    {
      userId: users.creator.id,
      domain: 'discovery',
      entityType: 'followed_seller',
      entityId: sellerProfiles.seller.id,
      payload: {
        sellerId: sellerProfiles.seller.id,
        followedAt: new Date().toISOString()
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'dashboard',
      entityId: 'main',
      payload: {
        quickActions: [
          { key: 'new-listing', label: 'New Listing', to: '/listings/new' },
          { key: 'orders', label: 'Orders', to: '/orders' }
        ],
        hero: {
          name: 'EV Hub',
          sub: 'Unified seller command center',
          ctaLabel: 'Open Ops',
          ctaTo: '/ops',
          chipWhenMLDZ: 'MyLiveDealz active',
          chipWhenNoMLDZ: 'Core commerce'
        },
        featured: {
          title: 'Launch campaign live',
          sub: 'Creator campaign and order ops are both active.',
          ctaLabel: 'Open campaign',
          ctaTo: '/mldz/campaigns'
        },
        bases: {
          revenueBase: 100,
          ordersBase: 100,
          trustBase: 100
        }
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'listings',
      entityId: 'main',
      payload: {
        rows: [
          {
            id: 'listing_ev_charger',
            title: 'EV Fast Charger 7kW Wallbox',
            kind: 'Product',
            marketplace: 'EVmart',
            category: 'Chargers',
            currency: 'USD',
            retailPrice: 620,
            compareAt: 720,
            moq: 2,
            wholesaleTiers: [{ qty: 2, price: 600 }, { qty: 10, price: 570 }],
            stock: 18,
            inventory: [{ id: 'w1', location: 'Main Warehouse', onHand: 18, reserved: 2 }],
            images: 7,
            translations: 5,
            description: 'Premium wallbox charger for home and commercial use.',
            tags: ['wallbox', '7kW', 'OCPP'],
            status: 'Live',
            updatedAt: new Date().toISOString(),
            compliance: { state: 'ok', issues: [], lastScanAt: new Date().toISOString() },
            kpis: { views: 18420, addToCart: 920, orders: 214, conversion: 1.16, revenue: 132680 },
            trend: { views: [12, 18, 16, 22, 29, 31], orders: [1, 3, 2, 4, 6, 5] }
          }
        ]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'listing_wizard',
      entityId: 'main',
      payload: {
        taxonomy: [{ id: 'chargers', type: 'category', name: 'Chargers', children: [{ id: 'home-wallbox', type: 'line', name: 'Home Wallbox' }] }],
        baseLines: [{ nodeId: 'home-wallbox', status: 'active' }],
        copy: {
          heroTitle: 'Start a product listing',
          heroSubtitle: 'Select an approved product line and configure the listing intent.',
          manageLinesLabel: 'Manage approved lines',
          approvedLinesTitle: 'Approved lines',
          approvedLinesSubtitle: 'Use approved lines to accelerate compliance.',
          selectedLineTitle: 'Selected line',
          selectedLineEmptyTitle: 'No line selected',
          selectedLineEmptySubtitle: 'Choose a line to continue',
          searchPlaceholder: 'Search line taxonomy',
          emptyTitle: 'No lines found',
          emptySubtitle: 'Adjust search or request a new approval line.',
          suspendedHint: 'Suspended',
          eligibleHint: 'Eligible',
          tipText: 'Use approved lines to reduce compliance delays.',
          addLineLabel: 'Request line',
          listingIntentLabel: 'Listing intent',
          listingIntentOptions: [{ value: 'new', label: 'New listing' }, { value: 'restock', label: 'Restock' }, { value: 'variant', label: 'Variant' }],
          suspendedCardTitle: 'Line suspended',
          suspendedCardBody: 'Resolve compliance flags before continuing.',
          previewCta: 'Preview',
          startCta: 'Start',
          nextStepsTitle: 'Next steps',
          nextSteps: [{ title: 'Basics', description: 'Add title, pricing, and stock.' }],
          taxonomyFallback: 'Taxonomy unavailable'
        }
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'orders',
      entityId: 'main',
      payload: {
        headline: 'Orders',
        subhead: 'Orders and operations preview',
        orders: [
          {
            id: 'ORD-10512',
            customer: 'Amina K.',
            channel: 'EVzone',
            items: 5,
            total: 2480,
            currency: 'USD',
            status: 'New',
            warehouse: 'Main Warehouse',
            updatedAt: new Date().toISOString(),
            slaDueAt: daysFromNow(1).toISOString()
          }
        ],
        returns: [
          { id: 'RMA-2201', orderId: 'ORD-10512', status: 'Requested', reason: 'Damaged item', pathway: 'Refund', amount: 320, currency: 'USD', createdAt: new Date().toISOString() }
        ],
        disputes: [
          { id: 'DSP-901', orderId: 'ORD-10512', type: 'Item not received', status: 'Open', risk: 82, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'inventory',
      entityId: 'main',
      payload: {
        rows: [
          { id: 'listing_ev_charger', title: 'EV Fast Charger 7kW Wallbox', inventoryCount: 18, sku: 'EV-CHG-7KW', status: 'ACTIVE' }
        ]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'shipping_profiles',
      entityId: 'main',
      payload: {
        profiles: [{ id: 'ship_main', name: 'Main Warehouse Standard', regions: ['UG', 'KE'], slaDays: 3 }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'warehouses',
      entityId: 'main',
      payload: {
        warehouses: [{ id: 'wh_main', name: 'Main Warehouse', city: 'Kampala', active: true }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'exports',
      entityId: 'main',
      payload: {
        jobs: [{ id: 'exp_1', type: 'Orders CSV', status: 'completed', createdAt: new Date().toISOString() }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'documents',
      entityId: 'main',
      payload: {
        documents: [{ id: 'doc_1', name: 'Packing preset', type: 'template', updatedAt: new Date().toISOString() }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'finance_wallets',
      entityId: 'main',
      payload: {
        wallets: [{ id: 'wallet_1', currency: 'USD', available: 2480, pending: 0 }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'finance_holds',
      entityId: 'main',
      payload: {
        holds: [{ id: 'hold_1', orderId: 'ORD-10512', amount: 120, currency: 'USD', reason: 'Fraud review', status: 'monitoring' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'finance_invoices',
      entityId: 'main',
      payload: {
        invoices: [{ id: 'inv_1', customer: 'Amina K.', amount: 2480, currency: 'USD', status: 'paid' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'finance_statements',
      entityId: 'main',
      payload: {
        statements: [{ id: 'stmt_2026_02', month: '2026-02', net: 18240, currency: 'USD' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'finance_tax_reports',
      entityId: 'main',
      payload: {
        reports: [{ id: 'tax_2025', year: 2025, status: 'ready', jurisdiction: 'UG' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'messages',
      entityId: 'main',
      payload: {
        tagOptions: ['Order', 'RFQ', 'Proposal', 'Support'],
        threads: [{ id: 'thread_1', title: 'ORD-10512 shipment update', participants: [{ name: 'Amina K.', role: 'buyer' }], lastMessage: 'Please confirm dispatch.', lastAt: new Date().toISOString(), unreadCount: 1, tags: ['Order'], customerLang: 'en', myLang: 'en' }],
        messages: [{ id: 'msg_1', threadId: 'thread_1', sender: 'other', text: 'Please confirm dispatch.', lang: 'en', at: new Date().toISOString() }],
        templates: [{ id: 'tpl_1', title: 'Dispatch confirmed', category: 'Shipping', body: 'Your order has been dispatched.', pinned: true }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'help_support',
      entityId: 'main',
      payload: {
        kb: [{ id: 'kb_1', cat: 'Orders', title: 'How settlement timing works', url: '/kb/settlement' }],
        faq: [{ q: 'When do payouts settle?', a: 'After the hold window closes.' }],
        status: [{ id: 'svc_1', name: 'Orders API', state: 'Operational' }],
        tickets: [{ id: 'tkt_1', createdAt: new Date().toISOString(), status: 'Open', marketplace: 'EVmart', category: 'Shipping', subject: 'Need carrier remap', severity: 'medium' }],
        formDefaults: { marketplace: 'EVmart', category: 'Shipping', severity: 'medium', subject: '', ref: '', email: 'seller@evhub.com', phone: '+256700000002', desc: '', sla: '24h' },
        marketplaceOptions: ['EVmart', 'MyLiveDealz'],
        categoryOptions: ['Shipping', 'Orders', 'Finance'],
        refLabel: 'Reference',
        refPlaceholder: 'Order / ticket / quote'
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'system_status',
      entityId: 'main',
      payload: {
        services: [{ id: 'status_orders', name: 'Orders Service', state: 'operational' }, { id: 'status_payouts', name: 'Payouts', state: 'degraded' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'notification_preferences',
      entityId: 'main',
      payload: {
        watches: [{ id: 'watch_1', name: 'High-risk disputes', desc: 'Alert on disputes over risk 70', enabled: true, category: 'Orders' }]
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'preferences',
      entityId: 'main',
      payload: { locale: 'en', currency: 'USD', workspace: 'seller' }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'payout_methods',
      entityId: 'main',
      payload: { methods: [{ id: 'pm_1', type: 'bank', bank: 'Stanbic', currency: 'USD', primary: true }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'security',
      entityId: 'main',
      payload: { twoFactor: false, sessions: [{ id: 'sess_1', device: 'Chrome / Linux', trusted: true }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'integrations',
      entityId: 'main',
      payload: { integrations: [{ id: 'int_1', name: 'EVmart API', status: 'connected' }], webhooks: [{ id: 'wh_1', topic: 'order.created', status: 'healthy' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'tax',
      entityId: 'main',
      payload: { profiles: [{ id: 'tax_profile_1', jurisdiction: 'UG', vat: '18%' }], reports: [{ id: 'tax_report_1', year: 2025, status: 'ready' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'kyc',
      entityId: 'main',
      payload: { status: 'approved', documents: [{ id: 'kyc_1', type: 'Business Registration', status: 'Approved' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'saved_views',
      entityId: 'main',
      payload: { views: [{ id: 'view_1', name: 'High-risk disputes', route: '/disputes' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'help',
      entityId: 'main',
      payload: { links: [{ id: 'help_1', label: 'Open support', to: '/help-support' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'status_center',
      entityId: 'main',
      payload: { services: [{ id: 'status_1', name: 'Order Processing', state: 'operational' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'seller_workspace',
      entityType: 'compliance',
      entityId: 'main',
      payload: {
        primaryChannel: 'EVmart',
        defaultDocType: 'Business License',
        heroSubtitle: 'Compliance center for listings and marketplace requirements.',
        docs: [{ id: 'comp_1', type: 'Business License', channel: 'EVmart', regions: ['UG'], fileName: 'license.pdf', uploadedAt: new Date().toISOString(), status: 'Approved' }],
        queue: [{ listingId: 'listing_ev_charger', channel: 'EVmart', title: 'EV Fast Charger 7kW Wallbox', path: '/listings/listing_ev_charger', required: ['Business License'], missing: [] }],
        channelOptions: ['EVmart', 'MyLiveDealz'],
        autoRules: [{ match: 'battery', required: ['MSDS'] }],
        autoDefault: ['Business License']
      }
    },
    {
      userId: users.sellerUser.id,
      domain: 'wholesale',
      entityType: 'home',
      entityId: 'main',
      payload: { summary: { openRfqs: 2, activeQuotes: 3, priceLists: 1 } }
    },
    {
      userId: users.sellerUser.id,
      domain: 'wholesale',
      entityType: 'price_lists',
      entityId: 'main',
      payload: { priceLists: [{ id: 'pl_1', name: 'EV Bulk Q2', currency: 'USD', lines: 12 }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'wholesale',
      entityType: 'rfqs',
      entityId: 'main',
      payload: { rfqs: [{ id: 'rfq_1', buyer: 'Urban Mobility Ltd', status: 'new', quantity: 40, createdAt: new Date().toISOString() }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'wholesale',
      entityType: 'quotes',
      entityId: 'main',
      payload: { quotes: [{ id: 'quote_1', buyer: 'Urban Mobility Ltd', status: 'sent', amount: 22800, currency: 'USD', createdAt: new Date().toISOString() }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'wholesale',
      entityType: 'incoterms',
      entityId: 'main',
      payload: { terms: [{ code: 'FOB', description: 'Free On Board' }, { code: 'CIF', description: 'Cost, Insurance and Freight' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'service_command',
      entityId: 'main',
      payload: { queues: [{ id: 'queue_1', name: 'Consultations', open: 3 }], kpis: [{ label: 'Booked hours', value: '42' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'quotes',
      entityId: 'main',
      payload: { quotes: [{ id: 'prov_quote_1', client: 'EV Hub', service: 'Live production support', status: 'draft', price: 1200, currency: 'USD' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'joint_quotes',
      entityId: 'main',
      payload: { jointQuotes: [{ id: 'joint_1', partner: 'Ronald M', split: '70/30', status: 'negotiating' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'consultations',
      entityId: 'main',
      payload: { consultations: [{ id: 'consult_1', client: 'EV Hub', scheduledFor: daysFromNow(2).toISOString(), status: 'scheduled' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'bookings',
      entityId: 'main',
      payload: { bookings: [{ id: 'booking_1', client: 'EV Hub', service: 'Studio ops', price: 1200, currency: 'USD', scheduledFor: daysFromNow(4).toISOString(), stage: 'Confirmed' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'portfolio',
      entityId: 'main',
      payload: { items: [{ id: 'port_1', title: 'Tech launch live setup', type: 'case-study' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'reviews',
      entityId: 'main',
      payload: { reviews: [{ id: 'prov_review_1', client: 'EV Hub', score: 5, note: 'Strong production support.' }] }
    },
    {
      userId: users.providerUser.id,
      domain: 'provider',
      entityType: 'disputes',
      entityId: 'main',
      payload: { disputes: [{ id: 'prov_disp_1', bookingId: 'booking_1', status: 'open', note: 'Reschedule requested' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'regulatory',
      entityType: 'desks',
      entityId: 'main',
      payload: { desks: [{ slug: 'healthmart', title: 'HealthMart' }, { slug: 'edumart', title: 'EduMart' }, { slug: 'faithmart', title: 'FaithMart' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'regulatory',
      entityType: 'desk',
      entityId: 'healthmart',
      payload: { slug: 'healthmart', items: [{ id: 'health_1', title: 'Certified logistics checklist', status: 'ready' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'regulatory',
      entityType: 'desk',
      entityId: 'edumart',
      payload: { slug: 'edumart', items: [{ id: 'edu_1', title: 'Approved classroom kits', status: 'ready' }] }
    },
    {
      userId: users.sellerUser.id,
      domain: 'regulatory',
      entityType: 'desk',
      entityId: 'faithmart',
      payload: { slug: 'faithmart', items: [{ id: 'faith_1', title: 'Approved devotional bundle', status: 'ready' }] }
    }
  ];

  await prisma.appRecord.createMany({ data: dashboardRecords });
}

async function seedAnalytics(users) {
  await prisma.analyticsEvent.createMany({
    data: [
      {
        userId: users.creator.id,
        eventType: 'VIEW',
        value: 18420,
        meta: JSON.stringify({ source: 'listing', listingId: 'listing_ev_charger' })
      },
      {
        userId: users.creator.id,
        eventType: 'PURCHASE',
        value: 214,
        meta: JSON.stringify({ source: 'campaign', campaignId: 'campaign_ev_launch' })
      },
      {
        userId: users.sellerUser.id,
        eventType: 'PURCHASE',
        value: 2104,
        meta: JSON.stringify({ source: 'sellerfront', dashboard: 'analytics' })
      }
    ]
  });
}

async function seedFrontendReplacementData(users, sellerProfiles) {
  await prisma.userSetting.createMany({
    data: [
      {
        userId: users.creator.id,
        key: 'ui_state',
        payload: {
          theme: 'light',
          locale: 'en',
          currency: 'USD',
          moneyBar: {
            hiddenWidgetIds: ['projected']
          },
          creatorContext: {
            followedSellerIds: [1, 3],
            rankTier: 'Silver'
          }
        }
      },
      {
        userId: users.sellerUser.id,
        key: 'ui_state',
        payload: {
          locale: 'en',
          currency: 'USD',
          channels: ['marketplace_retail', 'mylivedealz'],
          shell: { sidebarScroll: 144 },
          onboarding: { statusMap: { seller: 'SUBMITTED', provider: 'DRAFT' } },
          dashboard: {
            defaultViewId: 'all'
          }
        }
      },
      {
        userId: users.providerUser.id,
        key: 'ui_state',
        payload: {
          locale: 'en',
          currency: 'USD',
          onboarding: { statusMap: { provider: 'SUBMITTED' } }
        }
      }
    ]
  });

  await prisma.workspaceSetting.createMany({
    data: [
      {
        userId: users.creator.id,
        key: 'payout_methods',
        payload: {
          methods: [
            {
              id: 'pm_creator_bank',
              type: 'bank',
              label: 'Standard Chartered Bank',
              details: 'Standard Chartered Bank • Ronald Isabirye • 0123456789',
              accountName: 'Ronald Isabirye',
              accountNumberMasked: '****6789',
              currency: 'USD',
              isDefault: true
            }
          ]
        }
      },
      {
        userId: users.creator.id,
        key: 'saved_views',
        payload: {
          views: [
            {
              id: 'creator_saved_view_reviews',
              name: 'Reviews Focus',
              route: '/reviews',
              group: 'Other',
              pinned: true
            }
          ]
        }
      },
      {
        userId: users.sellerUser.id,
        key: 'saved_views',
        payload: {
          views: [
            {
              id: 'seller_dashboard_mldz',
              name: 'MyLiveDealz Focus',
              route: '/dashboard',
              group: 'Campaigns',
              pinned: true,
              range: '7d',
              filters: {
                marketplaces: ['EVmart'],
                warehouses: [],
                channels: ['MyLiveDealz']
              }
            }
          ]
        }
      },
      {
        userId: users.sellerUser.id,
        key: 'payout_methods',
        payload: {
          methods: [
            {
              id: 'pm_seller_bank',
              type: 'bank',
              label: 'Stanbic USD Settlement',
              bank: 'Stanbic',
              currency: 'USD',
              accountName: 'EV Hub Commerce Ltd',
              accountNumberMasked: '****8821',
              isDefault: true
            }
          ]
        }
      },
      {
        userId: users.providerUser.id,
        key: 'payout_methods',
        payload: {
          methods: [
            {
              id: 'pm_provider_bank',
              type: 'bank',
              label: 'Equity Operations Account',
              bank: 'Equity',
              currency: 'USD',
              accountName: 'StreamOps Media Services',
              accountNumberMasked: '****1204',
              isDefault: true
            }
          ]
        }
      }
    ]
  });

  await prisma.sellerFollow.createMany({
    data: [
      {
        userId: users.creator.id,
        sellerId: sellerProfiles.seller.id
      },
      {
        userId: users.creator.id,
        sellerId: sellerProfiles.provider.id
      }
    ]
  });

  await prisma.userSubscription.create({
    data: {
      userId: users.creator.id,
      plan: 'pro',
      cycle: 'monthly',
      status: 'active',
      metadata: {
        renewsAt: daysFromNow(21).toISOString(),
        billingEmail: 'admin@creator.app',
        billingMethod: {
          type: 'card',
          label: 'Visa ending in 4242',
          brand: 'Visa',
          last4: '4242',
          holderName: 'Creator Admin',
          expMonth: 12,
          expYear: 2029
        },
        support: {
          contactEmail: 'support@mylivedealz.com',
          salesEmail: 'sales@mylivedealz.com',
          helpCenterUrl: 'https://mylivedealz.com/help',
          managerName: 'Growth Ops'
        },
        notes: ['Unlimited Dealz enabled', 'Priority creator support'],
        limits: {
          livesPerMonth: 'unlimited',
          collaborators: 5
        }
      }
    }
  });

  await prisma.auditEvent.createMany({
    data: [
      {
        userId: users.creator.id,
        role: 'CREATOR',
        action: 'audit.export_requested',
        entityType: 'audit_log',
        entityId: 'creator_audit_export',
        route: '/api/audit-logs',
        method: 'GET',
        statusCode: 200,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
        metadata: {
          outcome: 'success',
          severity: 'info',
          module: 'Roles & Permissions',
          detail: 'Exported last 7 days of audit logs'
        }
      },
      {
        userId: users.creator.id,
        role: 'CREATOR',
        action: 'live.session_updated',
        entityType: 'live_session',
        entityId: 'live_session_launch',
        route: '/api/live/sessions/live_session_launch',
        method: 'PATCH',
        statusCode: 200,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
        metadata: {
          outcome: 'success',
          severity: 'warning',
          module: 'Live Crew',
          detail: 'Adjusted live schedule timing'
        }
      },
      {
        userId: users.creator.id,
        role: 'CREATOR',
        action: 'settings.safety_controls_updated',
        entityType: 'workspace_setting',
        entityId: 'roles_security',
        route: '/api/settings/security',
        method: 'PATCH',
        statusCode: 200,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
        metadata: {
          outcome: 'success',
          severity: 'info',
          module: 'Settings & Safety',
          detail: 'Updated moderation guardrails'
        }
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: users.creator.id,
        title: 'New proposal from GlowUp Hub',
        body: 'They updated terms: $450-$600 + 5% commission. Reply to keep the slot.',
        kind: 'proposal',
        metadata: {
          brand: 'GlowUp Hub',
          campaign: 'Autumn Beauty Flash',
          link: '/proposals'
        }
      },
      {
        userId: users.creator.id,
        title: 'Live starts in 45 minutes',
        body: 'Beauty Flash Live. Make sure products and overlays are ready.',
        kind: 'live',
        metadata: {
          brand: 'GlowUp Hub',
          campaign: 'Beauty Flash Live',
          link: '/live-studio'
        }
      },
      {
        userId: users.creator.id,
        title: 'Payout scheduled',
        body: 'USD 260 scheduled for settlement via bank transfer.',
        kind: 'earnings',
        readAt: daysAgo(1),
        metadata: {
          brand: 'GlowUp Hub',
          campaign: 'Payout',
          link: '/earnings'
        }
      },
      {
        userId: users.sellerUser.id,
        title: 'Seller onboarding submitted',
        body: 'Your seller onboarding package is now under admin review.',
        kind: 'workflow',
        metadata: {
          brand: 'EV Hub',
          campaign: 'Seller onboarding'
        }
      }
    ]
  });

  await prisma.workflowRecord.createMany({
    data: [
      {
        userId: users.creator.id,
        recordType: 'account_approval',
        recordKey: 'main',
        payload: {
          status: 'under_review',
          progressPercent: 72,
          requiredActions: [],
          documents: [],
          submittedAt: daysAgo(2).toISOString()
        }
      },
      {
        userId: users.creator.id,
        recordType: 'screen_state',
        recordKey: 'creator-awaiting-admin-approval',
        payload: {
          status: 'UnderReview',
          etaMin: 45,
          submittedAt: daysAgo(2).toISOString(),
          adminReason: '',
          adminDocs: [],
          items: [],
          note: '',
          prefEmail: true,
          prefInApp: true
        }
      },
      {
        userId: users.creator.id,
        recordType: 'screen_state',
        recordKey: 'creator-onboarding-v25',
        payload: {
          stepIndex: 2,
          maxUnlocked: 2,
          form: {
            profile: {
              name: 'Ronald M',
              handle: '@ronald.m',
              tagline: 'Live commerce host for EV and tech brands',
              bio: 'Creator profile seeded for backend-backed onboarding recovery.',
              timezone: 'Africa/Kampala (EAT)',
              currency: 'USD',
              contentLanguages: ['English'],
              audienceRegions: ['East Africa'],
              country: 'Uganda',
              creatorType: 'Individual',
              email: 'creator@mylivedealz.com',
              phone: '+256700000001',
              whatsapp: '+256700000001',
              profilePhotoName: 'ronald-profile.png',
              mediaKitName: 'ronald-media-kit.pdf',
              team: {
                name: '',
                type: '',
                size: '1–5',
                website: '',
                logoName: ''
              },
              agency: {
                name: '',
                type: '',
                website: '',
                logoName: ''
              }
            },
            socials: {
              instagram: '@ronald.m',
              tiktok: '@ronaldlive',
              youtube: 'https://youtube.com/@ronaldm',
              primaryPlatform: 'Instagram',
              primaryOtherPlatform: '',
              primaryOtherCustomName: '',
              primaryOtherHandle: '',
              primaryOtherFollowers: '',
              extra: []
            },
            kyc: {
              status: 'pending',
              documentType: 'National ID',
              idFileName: 'national-id.pdf',
              selfieFileName: 'selfie.jpg',
              addressFileName: '',
              idUploaded: true,
              selfieUploaded: true,
              addressUploaded: false,
              org: {
                registrationFileName: '',
                taxFileName: '',
                authorizationFileName: '',
                registrationUploaded: false,
                taxUploaded: false,
                authorizationUploaded: false
              }
            },
            payout: {
              method: 'Bank transfer',
              currency: 'USD',
              schedule: 'Weekly',
              minThreshold: 50,
              acceptPayoutPolicy: false,
              verificationDeliveryMethod: 'Email',
              verificationContactValue: 'creator@mylivedealz.com',
              verification: {
                status: 'code_sent',
                code: ''
              },
              bank: {
                bankName: 'Stanbic Bank',
                accountName: 'Ronald M',
                accountNumber: '00123456789',
                swift: 'SBICUGKX'
              },
              mobile: { provider: '', phone: '' },
              wallet: { email: '' },
              alipay: { name: '', account: '' },
              wechat: { name: '', wechatId: '', phone: '' },
              tax: { residencyCountry: 'Uganda', taxId: 'TIN-445510' },
              scrolledToBottomPayout: false
            },
            preferences: {
              lines: ['Electronics', 'Live commerce'],
              formats: ['Live Sessionz'],
              models: ['Flat fee', 'Commission'],
              availability: {
                days: ['Mon', 'Tue', 'Wed'],
                timeWindow: '18:00 - 22:00'
              },
              rateCard: {
                minFlatFee: '350',
                preferredCommissionPct: '8',
                notes: 'Open to repeat seller launches and premium live bundles.'
              },
              inviteRules: 'All suppliers (Sellers + Providers)',
              supplierType: 'Both'
            },
            review: {
              seenPolicies: {
                platform: false,
                content: false,
                payout: false
              },
              scrolledToBottom: false,
              confirmMultiUserCompliance: false,
              acceptTerms: false
            }
          }
        }
      },
      {
        userId: users.creator.id,
        recordType: 'screen_state',
        recordKey: 'live-builder-bootstrap',
        payload: {
          suppliers: [
            {
              id: 'pt_glowup',
              name: 'GlowUp Hub',
              kind: 'Seller',
              verified: true,
              rating: 4.8,
              responseTime: 'Typically replies within 25 min',
              avatarUrl: 'https://images.unsplash.com/photo-1520975692290-9d0a3d460c22?auto=format&fit=crop&w=120&q=60'
            },
            {
              id: 'pt_gadget',
              name: 'GadgetMart Africa',
              kind: 'Seller',
              verified: true,
              rating: 4.6,
              responseTime: 'Typically replies within 40 min',
              avatarUrl: 'https://images.unsplash.com/photo-1520975682031-a6ad56ae0f68?auto=format&fit=crop&w=120&q=60'
            },
            {
              id: 'pt_grace',
              name: 'Grace Living Studio',
              kind: 'Provider',
              verified: true,
              rating: 4.9,
              responseTime: 'Typically replies within 1 hr',
              avatarUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=120&q=60'
            }
          ],
          campaigns: [
            {
              id: 'cp_autumn_beauty',
              supplierId: 'pt_glowup',
              name: 'Autumn Beauty Flash',
              startsAtISO: daysAgo(1).toISOString(),
              endsAtISO: daysFromNow(2).toISOString()
            },
            {
              id: 'cp_tech_friday',
              supplierId: 'pt_gadget',
              name: 'Tech Friday Mega',
              startsAtISO: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
              endsAtISO: new Date(now + 26 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'cp_wellness',
              supplierId: 'pt_grace',
              name: 'Wellness Booking Sprint',
              startsAtISO: daysFromNow(1).toISOString(),
              endsAtISO: daysFromNow(3).toISOString()
            }
          ],
          hosts: [
            {
              id: 'cr_1',
              name: 'Jane Doe',
              handle: '@janedoe',
              niche: 'Live host • dealz',
              followers: '128k',
              avatarUrl: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=crop&w=256&q=60',
              verified: true
            },
            {
              id: 'cr_2',
              name: 'Noah K.',
              handle: '@noahknows',
              niche: 'Tech • gadgets',
              followers: '680k',
              avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=60',
              verified: true
            },
            {
              id: 'cr_3',
              name: 'Rina Vale',
              handle: '@rinavale',
              niche: 'Services • wellness',
              followers: '220k',
              avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=60',
              verified: false
            }
          ],
          assets: [
            {
              id: 'as_opener_1',
              name: 'Autumn Beauty opener sequence',
              type: 'Opener',
              owner: 'Seller',
              tags: ['Beauty', 'Opener', 'Flash'],
              lastUpdatedLabel: '2 days ago',
              previewUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=60',
              previewKind: 'image',
              usageNotes: 'Intro bumper for Beauty Flash lives. Include for all serum-focused shows.',
              restrictions: 'Use only for GlowUp campaigns.'
            },
            {
              id: 'as_lower_1',
              name: 'Deal ticker lower third',
              type: 'Lower third',
              owner: 'Platform',
              tags: ['Ticker', 'Dealz', 'Lower third'],
              lastUpdatedLabel: '1 week ago',
              previewUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=60',
              previewKind: 'image',
              usageNotes: 'Shows countdown + pinned item price.',
              restrictions: 'Keep within safe area for mobile.'
            },
            {
              id: 'as_overlay_1',
              name: 'Universal price-drop overlay',
              type: 'Overlay',
              owner: 'Host',
              tags: ['Overlay', 'Price drop'],
              lastUpdatedLabel: '3 days ago',
              previewUrl: 'https://images.unsplash.com/photo-1518441902117-f0a80e5b0c17?auto=format&fit=crop&w=1200&q=60',
              previewKind: 'image',
              usageNotes: 'Use when dropping price or offering limited-time bonus.',
              restrictions: 'Avoid restricted terms.'
            },
            {
              id: 'as_script_1',
              name: 'Host base script — Flash format',
              type: 'Script',
              owner: 'Host',
              tags: ['Template', 'Script', 'Flash'],
              lastUpdatedLabel: 'Today',
              previewUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=60',
              previewKind: 'image',
              usageNotes: 'Includes opener, proof, CTA, objections, closing.',
              restrictions: 'Keep claims compliant.'
            },
            {
              id: 'as_opener_2',
              name: 'Tech Friday live opener',
              type: 'Opener',
              owner: 'Seller',
              tags: ['Tech', 'Opener'],
              lastUpdatedLabel: 'Yesterday',
              previewUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/bee.mp4',
              previewKind: 'video',
              usageNotes: 'Fast paced opener for electronics lives.',
              restrictions: 'Avoid copyrighted music unless cleared.'
            }
          ],
          catalog: [
            {
              id: 'it_powerbank',
              campaignId: 'cp_tech_friday',
              kind: 'product',
              name: 'VoltMax Pro - 30,000mAh',
              imageUrl: 'https://images.unsplash.com/photo-1557180295-76eee20ae8aa?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Live-only 25% off',
              stock: 12,
              claimedCount: 4,
              retailPricePreview: '$59 -> $44',
              wholesalePricePreview: '$41 -> $44',
              wholesaleMoq: 10,
              url: 'https://mylivedealz.com/deal/p1'
            },
            {
              id: 'it_earbuds',
              campaignId: 'cp_tech_friday',
              kind: 'product',
              name: 'Auralink TWS Buds (ANC)',
              imageUrl: 'https://images.unsplash.com/photo-1518443854922-108a0e71c8bf?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Bundle & Save',
              stock: 250,
              claimedCount: 25,
              retailPricePreview: '$79 -> $55',
              wholesalePricePreview: '$49 -> $52',
              wholesaleMoq: 20,
              url: 'https://mylivedealz.com/deal/p2'
            },
            {
              id: 'it_cam',
              campaignId: 'cp_tech_friday',
              kind: 'product',
              name: 'SnapCam 4K Action - Creator Kit',
              imageUrl: 'https://images.unsplash.com/photo-1489769002049-ccd828976a6c?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Limited Stock',
              stock: 7,
              retailPricePreview: '$219 -> $169',
              wholesalePricePreview: '$149 -> $165',
              wholesaleMoq: 5,
              url: 'https://mylivedealz.com/deal/p3'
            },
            {
              id: 'it_adapter',
              campaignId: 'cp_tech_friday',
              kind: 'product',
              name: 'Smart Travel Adapter - 65W',
              imageUrl: 'https://images.unsplash.com/photo-1582582421114-80f5a72ad1c8?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Hot pick',
              stock: 34,
              retailPricePreview: '$29 -> $19',
              wholesalePricePreview: '$14 -> $17',
              wholesaleMoq: 50,
              url: 'https://mylivedealz.com/deal/p4'
            },
            {
              id: 'it_serum',
              campaignId: 'cp_autumn_beauty',
              kind: 'product',
              name: 'GlowUp Vitamin C Serum',
              imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Flash deal',
              stock: 42,
              retailPricePreview: '£19 -> £14',
              wholesalePricePreview: '£11 -> £13',
              wholesaleMoq: 12
            },
            {
              id: 'it_cleanser',
              campaignId: 'cp_autumn_beauty',
              kind: 'product',
              name: 'Barrier Repair Cleanser',
              imageUrl: 'https://images.unsplash.com/photo-1585386959984-a41552231693?auto=format&fit=crop&w=500&h=500&q=60',
              badge: '2-pack',
              stock: 18,
              retailPricePreview: '£14 -> £11',
              wholesalePricePreview: '£8 -> £10',
              wholesaleMoq: 20
            },
            {
              id: 'it_consult',
              campaignId: 'cp_wellness',
              kind: 'service',
              name: 'Live Consultation - Gadget Setup',
              imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Limited slots',
              startingFrom: '$15',
              durationMins: 20,
              serviceMode: 'online',
              bookingType: 'request',
              providerName: 'VoltMall Tech Team'
            },
            {
              id: 'it_repair',
              campaignId: 'cp_wellness',
              kind: 'service',
              name: 'On-site Device Repair Quote',
              imageUrl: 'https://images.unsplash.com/photo-1581091215367-59ab6b4d99a7?auto=format&fit=crop&w=500&h=500&q=60',
              badge: 'Needs assessment',
              startingFrom: '$0',
              durationMins: 0,
              serviceMode: 'on-site',
              bookingType: 'quote',
              providerName: 'VoltMall Repairs'
            }
          ],
          giveawayPresets: {
            cp_autumn_beauty: [
              {
                id: 'sgw_beauty_kit',
                campaignId: 'cp_autumn_beauty',
                title: 'GlowUp Night Routine Kit',
                imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=500&h=500&q=60',
                notes: 'Supplier-set custom giveaway for top-engagement moments.',
                quantity: 3
              },
              {
                id: 'sgw_vanity_pouch',
                campaignId: 'cp_autumn_beauty',
                title: 'Premium Vanity Pouch',
                imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=500&h=500&q=60',
                notes: 'Exclusive giveaway for high-potential leads.',
                quantity: 10,
                claimedCount: 6
              }
            ],
            cp_tech_friday: [
              {
                id: 'sgw_ring_light',
                campaignId: 'cp_tech_friday',
                title: 'Creator Ring Light Kit',
                imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&h=500&q=60',
                notes: 'Supplier-approved creator kit giveaway.',
                quantity: 2,
                claimedCount: 1
              },
              {
                id: 'sgw_gift_card',
                campaignId: 'cp_tech_friday',
                title: 'Tech Friday Gift Card',
                imageUrl: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=500&h=500&q=60',
                notes: 'Digital voucher for live-session winners.',
                quantity: 4,
                claimedCount: 3
              }
            ],
            cp_wellness: [
              {
                id: 'sgw_consult_credit',
                campaignId: 'cp_wellness',
                title: 'Wellness Consultation Credit',
                imageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?auto=format&fit=crop&w=500&h=500&q=60',
                notes: 'Supplier-set service credit for booked attendees.',
                quantity: 3,
                claimedCount: 1
              }
            ]
          }
        }
      },
      {
        userId: users.sellerUser.id,
        recordType: 'account_approval',
        recordKey: 'main',
        payload: {
          status: 'submitted',
          progressPercent: 60,
          requiredActions: [],
          documents: [],
          submittedAt: daysAgo(1).toISOString()
        }
      },
      {
        userId: users.sellerUser.id,
        recordType: 'screen_state',
        recordKey: 'seller-onboarding',
        payload: {
          ui: {
            theme: 'light',
            step: 3,
            compactAside: false
          },
          review: {
            submittedAt: daysAgo(1).toISOString(),
            inReviewAt: daysAgo(1).toISOString(),
            approvedAt: null,
            slaHours: 48
          }
        }
      },
      {
        userId: users.providerUser.id,
        recordType: 'screen_state',
        recordKey: 'provider-onboarding',
        payload: {
          ui: {
            step: 2
          },
          review: {
            submittedAt: daysAgo(1).toISOString(),
            inReviewAt: daysAgo(1).toISOString(),
            approvedAt: null,
            slaHours: 48
          }
        }
      },
      {
        userId: users.sellerUser.id,
        recordType: 'screen_state',
        recordKey: 'supplier-awaiting-admin-approval',
        payload: {
          submission: {
            campaignTitle: 'EV Hub Charger Launch',
            campaignId: 'campaign_ev_launch',
            submittedAt: daysAgo(1).toISOString(),
            promoType: 'Discount',
            itemsCount: 3,
            landingLinks: ['https://example.com/ev-launch'],
            notes: 'Waiting for admin approval.',
            creatorUsageDecision: 'I will use a Creator',
            contentApprovalMode: 'Manual',
            supplierApprovalComplete: true
          },
          review: {
            status: 'UnderReview',
            etaMin: 60,
            adminReason: '',
            adminDocs: [],
            items: [],
            note: ''
          }
        }
      },
      {
        userId: users.providerUser.id,
        recordType: 'screen_state',
        recordKey: 'provider-new-quote',
        payload: {
          quoteId: 'Q-2026-1001',
          meta: { status: 'Draft' },
          client: { name: 'EV Hub', channel: 'Email' },
          scope: {
            summary: 'Full live production support for a launch event.',
            deliverables: [{ id: 'del_seed_1', title: 'OBS scene setup', detail: 'Branded lower thirds and scenes.' }]
          },
          lines: [
            {
              id: 'line_seed_1',
              name: 'Live production support',
              qty: 1,
              unitCost: 800,
              priceMode: 'markup',
              markupPct: 30,
              unitPrice: 1040,
              notes: 'Day-of-show production lead.'
            }
          ],
          timeline: {
            startDate: daysFromNow(3).toISOString().slice(0, 10),
            durationDays: 14,
            milestones: [{ id: 'ms_seed_1', title: 'Kickoff and setup', dueInDays: 3, percent: 50 }]
          },
          terms: {
            paymentTerms: '50% upfront, 50% on completion'
          }
        }
      },
      {
        userId: users.providerUser.id,
        recordType: 'screen_state',
        recordKey: 'service-listing-approval',
        payload: {
          status: 'ChangesRequested',
          etaMin: 90,
          adminReason: 'Clarify scope, align pricing units, and confirm service regions.',
          adminDocs: [{ name: 'EVzone service listing guidelines.pdf', url: '#', type: 'pdf' }],
          items: [
            { id: 'item-1', text: 'Clarify exact scope of the service and exclusions', done: false },
            { id: 'item-2', text: 'Align pricing and units', done: false }
          ],
          note: '',
          serviceName: 'Studio Ops Pro',
          category: 'Production Services',
          listingId: 'svc_streamops_1'
        }
      },
      {
        userId: users.creator.id,
        recordType: 'screen_state',
        recordKey: 'live-schedule-ai-slots',
        payload: {
          slots: [
            {
              id: 1,
              label: 'Wed 20:00-21:00',
              reason: 'Peak East Africa view time · 1.3x retention',
              recommendedFor: 'Tech & Beauty'
            },
            {
              id: 2,
              label: 'Fri 19:30-20:30',
              reason: 'High intent just before weekend shopping',
              recommendedFor: 'Gadgets & Flash dealz'
            },
            {
              id: 3,
              label: 'Sun 09:00-10:00',
              reason: 'Faith & Wellness audience spike',
              recommendedFor: 'Faith-compatible shows'
            }
          ]
        }
      }
    ]
  });

  await prisma.catalogTemplate.createMany({
    data: [
      {
        id: 'catalog_tpl_launch',
        sellerId: sellerProfiles.seller.id,
        name: 'Launch Bundle',
        kind: 'listing',
        category: 'Chargers',
        attrCount: 3,
        payload: {
          sections: ['Overview', 'Specs', 'Warranty'],
          tone: 'Premium'
        }
      },
      {
        id: 'catalog_tpl_service',
        sellerId: sellerProfiles.provider.id,
        name: 'Service Scope Template',
        kind: 'service',
        category: 'Production Services',
        attrCount: 3,
        payload: {
          sections: ['Scope', 'Deliverables', 'SLA']
        }
      }
    ]
  });

  await prisma.mediaAsset.createMany({
    data: [
      {
        id: 'media_ev_launch_hero',
        userId: users.sellerUser.id,
        name: 'EV Launch Hero',
        kind: 'image',
        url: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1200&auto=format&fit=crop',
        metadata: {
          usageCount: 2,
          tags: ['hero', 'launch']
        }
      },
      {
        id: 'media_streamops_reel',
        userId: users.providerUser.id,
        name: 'Studio Reel',
        kind: 'video',
        url: 'https://example.com/streamops-reel.mp4',
        metadata: {
          usageCount: 1,
          tags: ['portfolio']
        }
      }
    ]
  });

  await prisma.shippingProfile.create({
    data: {
      id: 'ship_profile_evhub_main',
      sellerId: sellerProfiles.seller.id,
      name: 'Main Warehouse Standard',
      status: 'ACTIVE',
      handlingTimeDays: 2,
      regions: ['UG', 'KE'],
      isDefault: true,
      metadata: {
        city: 'Kampala',
        serviceLevel: 'Standard'
      }
    }
  });

  const creatorAdzCampaigns = [
    {
      id: 'adz_creator_autumn_beauty',
      status: 'Live',
      title: 'Autumn Beauty Flash',
      budget: 1500,
      currency: 'USD',
      isMarketplace: true,
      data: {
        id: 'AD-101',
        campaignName: 'Autumn Beauty Flash',
        campaignSubtitle: 'Serum + skincare conversion push',
        supplier: { name: 'GlowUp Hub', category: 'Beauty', logoUrl: 'https://example.com/glowup-logo.png' },
        creator: { name: 'Ronald M', handle: '@ronaldm', avatarUrl: 'https://example.com/creator-avatar.png', verified: true },
        status: 'Live',
        platforms: ['Instagram', 'TikTok', 'MyLiveDealz'],
        startISO: daysAgo(1).toISOString(),
        endISO: daysFromNow(7).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop',
        heroIntroVideoUrl: 'https://example.com/beauty-flash.mp4',
        compensation: { type: 'Hybrid', commissionRate: 0.08, flatFee: 200, currency: 'USD' },
        offers: [
          {
            id: 'O-101',
            type: 'PRODUCT',
            name: 'Vitamin C Serum',
            currency: 'USD',
            price: 22,
            stockLeft: 48,
            posterUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=900&auto=format&fit=crop',
            sellingModes: ['RETAIL'],
            defaultSellingMode: 'RETAIL'
          }
        ],
        generated: true,
        hasBrokenLink: false,
        lowStock: false,
        impressions7d: 18250,
        clicks7d: 1850,
        orders7d: 96,
        revenue7d: 820,
        currency: 'USD',
        kpis: [{ label: 'CTR', value: '10.1%' }]
      }
    },
    {
      id: 'adz_creator_tech_friday',
      status: 'Scheduled',
      title: 'Tech Friday Mega Live',
      budget: 2200,
      currency: 'USD',
      isMarketplace: true,
      data: {
        id: 'AD-102',
        campaignName: 'Tech Friday Mega Live',
        campaignSubtitle: 'Gadget bundle preview',
        supplier: { name: 'GadgetMart Africa', category: 'Tech', logoUrl: 'https://example.com/gadgetmart-logo.png' },
        creator: { name: 'Ronald M', handle: '@ronaldm', avatarUrl: 'https://example.com/creator-avatar.png', verified: true },
        status: 'Scheduled',
        platforms: ['YouTube', 'MyLiveDealz'],
        startISO: daysFromNow(2).toISOString(),
        endISO: daysFromNow(9).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
        compensation: { type: 'Commission', commissionRate: 0.12 },
        offers: [
          {
            id: 'O-102',
            type: 'PRODUCT',
            name: 'Wireless Earbuds',
            currency: 'USD',
            price: 55,
            stockLeft: 120,
            posterUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop',
            sellingModes: ['RETAIL', 'WHOLESALE'],
            defaultSellingMode: 'WHOLESALE',
            wholesale: {
              moq: 5,
              step: 5,
              tiers: [
                { minQty: 5, unitPrice: 48 },
                { minQty: 10, unitPrice: 44 }
              ]
            }
          }
        ],
        generated: true,
        hasBrokenLink: false,
        lowStock: false,
        impressions7d: 8450,
        clicks7d: 640,
        orders7d: 22,
        revenue7d: 410,
        currency: 'USD',
        kpis: [{ label: 'Pre-save', value: '410' }]
      }
    }
  ];

  for (const campaign of creatorAdzCampaigns) {
    await prisma.adzCampaign.create({
      data: {
        id: campaign.id,
        userId: users.creator.id,
        status: campaign.status,
        title: campaign.title,
        budget: campaign.budget,
        currency: campaign.currency,
        isMarketplace: campaign.isMarketplace,
        data: campaign.data
      }
    });

    await prisma.adzPerformance.create({
      data: {
        campaignId: campaign.id,
        clicks: Number(campaign.data.clicks7d ?? 0),
        purchases: Number(campaign.data.orders7d ?? 0),
        earnings: Number(campaign.data.revenue7d ?? 0),
        data: {
          impressions: campaign.data.impressions7d ?? 0
        }
      }
    });
  }

  await prisma.promoAd.create({
    data: {
      id: 'PR-101',
      userId: users.creator.id,
      status: 'Active',
      data: {
        id: 'PR-101',
        name: 'Autumn Beauty Flash - Serum Promo',
        seller: 'GlowUp Hub',
        campaign: 'Autumn Beauty Flash',
        status: 'Active',
        compType: 'Hybrid',
        compSummary: '$200 flat + 5% commission',
        earnings: 820,
        clicks: 1850,
        purchases: 96,
        conversion: 5.2,
        category: 'Beauty',
        region: 'East Africa',
        hasContract: true,
        hasLives: true
      }
    }
  });

  await prisma.liveBuilder.create({
    data: {
      id: 'live_builder_launch',
      userId: users.creator.id,
      sessionId: 'live_session_launch',
      status: 'draft',
      data: {
        id: 'live_builder_launch',
        title: 'Autumn Beauty Live Builder',
        seller: 'GlowUp Hub',
        campaign: 'Autumn Beauty Flash',
        host: 'Ronald M'
      }
    }
  });

  await prisma.liveSession.create({
    data: {
      id: 'live_session_launch',
      userId: users.creator.id,
      status: 'scheduled',
      title: 'Autumn Beauty Live',
      scheduledAt: daysFromNow(1),
      data: {
        id: 'live_session_launch',
        title: 'Autumn Beauty: serum + cleanser bundle',
        campaign: 'Autumn Beauty Flash',
        seller: 'GlowUp Hub',
        supplierId: 'pt_glowup',
        campaignId: 'cp_autumn_beauty',
        hostId: 'cr_1',
        scheduledFor: daysFromNow(1).toISOString(),
        scheduledAt: daysFromNow(1).toISOString(),
        weekday: 'Friday',
        dateLabel: daysFromNow(1).toISOString().slice(0, 10),
        time: '18:00',
        location: 'Studio A',
        simulcast: ['TikTok Live', 'Instagram Live'],
        platforms: ['TikTok Live', 'Instagram Live'],
        status: 'scheduled',
        role: 'Host',
        durationMin: 60,
        scriptsReady: true,
        assetsReady: true,
        productsCount: 6,
        workloadScore: 42,
        conflict: false,
        desktopMode: 'modal',
        heroImageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1200&q=60',
        heroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        peakViewers: 12400,
        avgWatchMin: 11.2,
        chatRate: 180,
        gmv: 32840,
        crewConflicts: 2
      }
    }
  });

  await prisma.liveSession.createMany({
    data: [
      {
        id: 'live_session_tech_friday',
        userId: users.creator.id,
        status: 'draft',
        title: 'Tech Friday Mega Live',
        scheduledAt: daysFromNow(2),
        data: {
          id: 'live_session_tech_friday',
          title: 'Tech Friday Live: top 3 gadgets under 50',
          campaign: 'Tech Friday Mega',
          seller: 'GadgetMart Africa',
          supplierId: 'pt_gadget',
          campaignId: 'cp_tech_friday',
          hostId: 'cr_2',
          scheduledFor: daysFromNow(2).toISOString(),
          scheduledAt: daysFromNow(2).toISOString(),
          weekday: 'Fri',
          dateLabel: 'Fri 11 Oct',
          time: '20:00-21:30',
          location: 'MyLiveDealz',
          simulcast: ['TikTok Live', 'YouTube Live'],
          platforms: ['TikTok Live', 'YouTube Live'],
          status: 'draft',
          role: 'Host',
          durationMin: 90,
          scriptsReady: false,
          assetsReady: false,
          productsCount: 12,
          workloadScore: 4,
          conflict: true,
          desktopMode: 'fullscreen',
          heroImageUrl: 'https://images.unsplash.com/photo-1518441902117-f0a80e5b0c17?auto=format&fit=crop&w=1200&q=60',
          heroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/bee.mp4',
          peakViewers: 0,
          avgWatchMin: 0,
          chatRate: 0,
          gmv: 0,
          crewConflicts: 0
        }
      },
      {
        id: 'live_session_wellness',
        userId: users.creator.id,
        status: 'live',
        title: 'Wellness booking live: before/after + Q&A',
        scheduledAt: daysFromNow(3),
        data: {
          id: 'live_session_wellness',
          title: 'Wellness booking live: before/after + Q&A',
          campaign: 'Wellness Booking Sprint',
          seller: 'Grace Living Studio',
          supplierId: 'pt_grace',
          campaignId: 'cp_wellness',
          hostId: 'cr_3',
          scheduledFor: daysFromNow(3).toISOString(),
          scheduledAt: daysFromNow(3).toISOString(),
          weekday: 'Sat',
          dateLabel: 'Sat 12 Oct',
          time: '09:00-10:00',
          location: 'MyLiveDealz',
          simulcast: ['Instagram Live', 'Facebook Live'],
          platforms: ['Instagram Live', 'Facebook Live'],
          status: 'live',
          role: 'Host',
          durationMin: 60,
          scriptsReady: true,
          assetsReady: true,
          productsCount: 6,
          workloadScore: 2,
          conflict: false,
          desktopMode: 'modal',
          heroImageUrl: 'https://images.unsplash.com/photo-1524503033411-f7a2fe8c7b1f?auto=format&fit=crop&w=1200&q=60',
          heroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          peakViewers: 3100,
          avgWatchMin: 7.4,
          chatRate: 92,
          gmv: 5400,
          crewConflicts: 0
        }
      },
      {
        id: 'live_session_replay_slot',
        userId: users.creator.id,
        status: 'ended',
        title: 'Replay: price breakdown + honest Q&A',
        scheduledAt: daysFromNow(4),
        data: {
          id: 'live_session_replay_slot',
          title: 'Replay: price breakdown + honest Q&A',
          campaign: 'Autumn Beauty Flash',
          seller: 'GlowUp Hub',
          supplierId: 'pt_glowup',
          campaignId: 'cp_autumn_beauty',
          hostId: 'cr_1',
          scheduledFor: daysFromNow(4).toISOString(),
          scheduledAt: daysFromNow(4).toISOString(),
          weekday: 'Sun',
          dateLabel: 'Sun 13 Oct',
          time: '21:00-21:30',
          location: 'Replays only',
          simulcast: ['TikTok Live'],
          platforms: ['TikTok Live'],
          status: 'ended',
          role: 'Replay host',
          durationMin: 30,
          scriptsReady: false,
          assetsReady: true,
          productsCount: 4,
          workloadScore: 1,
          conflict: false,
          desktopMode: 'modal',
          heroImageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=60',
          heroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/bee.mp4',
          peakViewers: 11200,
          avgWatchMin: 9.8,
          chatRate: 150,
          gmv: 27900,
          crewConflicts: 0
        }
      }
    ]
  });

  await prisma.liveStudio.create({
    data: {
      id: 'live_session_launch',
      userId: users.creator.id,
      sessionId: 'live_session_launch',
      status: 'idle',
      data: {
        id: 'live_session_launch',
        title: 'Autumn Beauty Live',
        status: 'idle',
        products: [
          { id: 'P-101', name: 'Glow Serum', price: '$24.99', stock: '150 left', tag: 'Best Seller' },
          { id: 'P-102', name: 'Matte Lipstick', price: '$18.50', stock: '85 left', tag: 'Low Stock' },
          { id: 'P-103', name: 'Setting Spray', price: '$22.00', stock: '200 left', tag: 'New' }
        ],
        coHosts: [
          { id: 1, name: 'Jessica M.', status: 'Ready' },
          { id: 2, name: 'David K.', status: 'Off-air' }
        ],
        attachments: [
          { id: 1, from: '@Sarah99', type: 'image', label: 'Viewer Look', status: 'Pending' },
          { id: 2, from: '@MikeD', type: 'question', label: 'Product Q', status: 'Pending' }
        ],
        scenes: [
          { id: 'intro', label: 'Intro Card', desc: 'Title + Music' },
          { id: 'main', label: 'Main Cam', desc: 'Full screen' },
          { id: 'split', label: 'Split View', desc: 'Cam + Screen' },
          { id: 'product', label: 'Product Focus', desc: 'Pip Overlay' }
        ],
        runOfShow: [
          { id: 's1', label: 'Welcome', window: '0:00', scene: 'intro' },
          { id: 's2', label: 'Product Reveal', window: '2:00', scene: 'main' },
          { id: 's3', label: 'Demo', window: '5:00', scene: 'split' }
        ],
        scriptCues: [
          'Welcome everyone to the stream!',
          'Today we are reviewing the new collection.',
          "Don't forget to use code FLASH20.",
          "Let's bring in our special guest."
        ],
        commerceGoal: {
          soldUnits: 42,
          targetUnits: 100,
          cartCount: 15,
          last5MinSales: 8
        },
        salesEvents: [
          { id: 1, label: '@Sarah purchased Glow Serum', time: '2s ago' },
          { id: 2, label: '@Mike purchased Lipstick', time: '12s ago' },
          { id: 3, label: '@Jen purchased Bundle', time: '45s ago' }
        ],
        chatMessages: [
          { id: 1, from: 'System', body: 'Welcome to the stream!', time: '10:00', system: true },
          { id: 2, from: 'Sarah_99', body: "Can't wait to see the new products!", time: '10:01' },
          { id: 3, from: 'MikeDe', body: 'Is audio working?', time: '10:02' }
        ],
        qaItems: [
          { id: 1, question: 'Is this vegan?', from: '@VeganGal', status: 'pinned' },
          { id: 2, question: 'Shipping to CA?', from: '@MapleLeaf', status: 'waiting' }
        ],
        viewers: [
          { id: 1, name: 'Sarah_99', tag: 'Super Fan' },
          { id: 2, name: 'MikeDe', tag: 'New' }
        ],
        aiPrompts: [
          'Mention the flash deal (ending soon)',
          'Greet new huge donor @TechGiant',
          'Ask viewers to share the stream'
        ],
        giveaways: [
          {
            id: 'gw_studio_1',
            linkedItemId: 'P-101',
            title: 'Glow Serum Giveaway',
            imageUrl: '',
            quantity: 2,
            showOnPromo: true
          }
        ]
      }
    }
  });

  await prisma.liveReplay.create({
    data: {
      id: 'live_replay_launch',
      userId: users.creator.id,
      sessionId: 'live_session_launch',
      status: 'draft',
      published: false,
      data: {
        id: 'live_replay_launch',
        sessionId: 'live_session_launch',
        title: 'Autumn Beauty Live Replay',
        views: 0,
        sales: 0,
        durationSec: 3600
      }
    }
  });

  await prisma.liveReplay.createMany({
    data: [
      {
        id: 'live_replay_tech_friday',
        userId: users.creator.id,
        sessionId: 'live_session_tech_friday',
        status: 'draft',
        published: false,
        data: {
          id: 'live_replay_tech_friday',
          sessionId: 'live_session_tech_friday',
          title: 'Tech Friday Mega Live - Gadgets Q&A',
          date: daysAgo(2).toISOString(),
          views: 2310,
          sales: 87,
          durationSec: 5283,
          notes: ['Q&A heavy', 'Late peak', 'Bundle upsells']
        }
      },
      {
        id: 'live_replay_wellness',
        userId: users.creator.id,
        sessionId: 'live_session_wellness',
        status: 'published',
        published: true,
        publishedAt: daysAgo(1),
        data: {
          id: 'live_replay_wellness',
          sessionId: 'live_session_wellness',
          title: 'Faith & Wellness Morning Dealz',
          date: daysAgo(1).toISOString(),
          views: 987,
          sales: 29,
          durationSec: 3250,
          notes: ['Soft opener', 'High replay', 'Community chat']
        }
      }
    ]
  });

  await prisma.liveToolConfig.createMany({
    data: [
      {
        userId: users.creator.id,
        key: 'audience-notifications',
        data: {
          plan: 'Pro',
          sessionStatus: 'Scheduled',
          sessionTitle: 'Autumn Beauty Flash',
          startLocal: daysFromNow(1).toISOString().slice(0, 16),
          endLocal: new Date(daysFromNow(1).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
          bufferMinutes: 15,
          waNumber: '+256 700 000 000',
          sessionUrl: 'https://mylivedealz.com/live/live_session_launch',
          selectedPackId: 'pack_default_v3',
          enabledChannels: {
            whatsapp: true,
            telegram: true,
            line: false,
            viber: false,
            rcs: false
          },
          enabledReminders: {
            t24h: true,
            t1h: true,
            t10m: true,
            live_now: true,
            deal_drop: false,
            replay_ready: true
          },
          replayDelayMinutes: 20,
          dealDropMode: 'manual',
          dealDropAtOffsetMin: 12,
          channels: [
            {
              key: 'whatsapp',
              name: 'WhatsApp',
              short: 'WA',
              connected: 'Connected',
              supportsQr: true,
              supportsButtons: true,
              note: '24h window rules apply. Uses initiation prompt + in-window reminders only.'
            },
            {
              key: 'telegram',
              name: 'Telegram',
              short: 'TG',
              connected: 'Connected',
              supportsQr: true,
              supportsButtons: true,
              note: 'Recommended for high engagement and low delivery friction.'
            },
            {
              key: 'line',
              name: 'LINE',
              short: 'LINE',
              connected: 'Needs re-auth',
              supportsQr: true,
              supportsButtons: true,
              proOnly: true,
              note: 'Pro: unlock advanced templates and per-channel formatting.'
            },
            {
              key: 'viber',
              name: 'Viber',
              short: 'Viber',
              connected: 'Connected',
              supportsQr: true,
              supportsButtons: true,
              proOnly: true,
              note: 'Pro: unlock deep links and rich buttons (where supported).'
            },
            {
              key: 'rcs',
              name: 'RCS',
              short: 'RCS',
              connected: 'Connected',
              supportsQr: false,
              supportsButtons: false,
              proOnly: true,
              note: 'Pro: RCS/SMS fallback. Buttons vary by device; keep copy short.'
            }
          ],
          reminders: [
            {
              key: 't24h',
              label: 'T-24h (WA-adjusted)',
              description: 'Initiation prompt goes live (time computed from WhatsApp 24h window).',
              defaultEnabled: true
            },
            {
              key: 't1h',
              label: 'T-1h',
              description: 'Reminder message to opted-in users.',
              defaultEnabled: true
            },
            {
              key: 't10m',
              label: 'T-10m',
              description: 'Reminder message to opted-in users.',
              defaultEnabled: true
            },
            {
              key: 'live_now',
              label: 'Live Now',
              description: 'Sends when the session starts.',
              defaultEnabled: true
            },
            {
              key: 'deal_drop',
              label: 'Deal Drop',
              description: 'Manual or scheduled alert when dealz go live.',
              defaultEnabled: false
            },
            {
              key: 'replay_ready',
              label: 'Replay Ready',
              description: 'Sends after replay is published.',
              defaultEnabled: true
            }
          ],
          templatePacks: [
            {
              id: 'pack_default_v3',
              name: 'Default Reminders',
              version: 'v3.2',
              approved: true,
              channels: ['whatsapp', 'telegram', 'rcs'],
              notes: 'Short, compliance-safe copy. Works well across Africa & SEA.',
              templates: {
                initiationPrompt: 'Tap to get Live Session reminders for {{title}}.\nWe’ll only message you after you start the chat.',
                t24h: '⏰ Reminder: {{title}} starts soon.\nTap here to join + shop: {{link}}',
                t1h: '⏳ 1 hour to go: {{title}}\nJoin + shop: {{link}}',
                t10m: '🔥 10 minutes! {{title}}\nTap to join: {{link}}',
                live_now: '🔴 We are LIVE: {{title}}\nTap to join: {{link}}',
                deal_drop: '⚡ Deal drop! New offers are live now.\nTap: {{link}}',
                replay_ready: '🎬 Replay ready: {{title}}\nWatch + shop: {{link}}'
              }
            },
            {
              id: 'pack_flash_v5',
              name: 'Flash Sales Pack',
              version: 'v5.0',
              approved: true,
              channels: ['whatsapp', 'telegram', 'line', 'viber', 'rcs'],
              notes: 'Higher urgency language + deal-drop emphasis.',
              proOnly: true,
              templates: {
                initiationPrompt: 'Tap to unlock Flash Deal alerts for {{title}}.\nStart chat to opt in.',
                t24h: '⚡ Flash Deal soon: {{title}}.\nTap to opt in + join: {{link}}',
                t1h: '🚀 1 hour: {{title}} starts.\nTap: {{link}}',
                t10m: '🔥 10 min! Dealz dropping soon.\nJoin: {{link}}',
                live_now: '🔴 LIVE NOW: {{title}}.\nTap to enter: {{link}}',
                deal_drop: '💥 Deal Drop: limited stock.\nTap to shop: {{link}}',
                replay_ready: '🎬 Replay + last chance dealz: {{title}}.\nTap: {{link}}'
              }
            }
          ]
        }
      },
      {
        userId: users.creator.id,
        key: 'streaming',
        data: {
          isPro: true,
          sessionStatus: 'Draft',
          selectedDestId: 'yt',
          profile: {
            orientation: 'Auto',
            quality: 'High',
            advancedOpen: false,
            resolution: '1080p',
            bitrateKbps: 4500,
            audio: 'Stereo',
            gainDb: 0,
            latency: 'Low',
            adaptiveBitrate: true
          },
          degradeMode: 'Reduce quality, keep all destinations',
          recordMaster: true,
          autoReplay: true,
          autoHighlights: false,
          downloadMasterAllowed: false,
          estimatedUploadMbps: 12.4,
          destinations: [
            {
              id: 'yt',
              name: 'YouTube Live',
              kind: 'Video Live',
              status: 'Connected',
              enabled: true,
              accountLabel: 'GlowUp Hub Official',
              supportsStreamKey: true,
              supportsPrivacy: true,
              supportsCategory: true,
              supportsTags: true,
              supportsDelay: true,
              supportsAutoReconnect: true,
              proAdvanced: false,
              settings: {
                title: 'GlowUp Hub: Autumn Beauty Flash Live',
                description: 'Serum benefits, fit checks, and instant buy links.',
                privacy: 'Public',
                category: 'Beauty',
                tags: ['beauty', 'serum', 'flash'],
                delaySec: 0,
                autoReconnect: true
              },
              health: { framesDropped: 0, reconnects: 0, lastAckSec: 2, outBitrateKbps: 4300 }
            },
            {
              id: 'fb',
              name: 'Facebook Live',
              kind: 'Community Live',
              status: 'Needs re-auth',
              enabled: false,
              accountLabel: 'GlowUp Community',
              supportsStreamKey: true,
              supportsPrivacy: true,
              supportsCategory: false,
              supportsTags: false,
              supportsDelay: false,
              supportsAutoReconnect: true,
              proAdvanced: false,
              errorTitle: 'Your session expired',
              errorNext: 'Re-authenticate the connected account to restore posting permissions.',
              settings: {
                title: 'GlowUp Hub: Autumn Beauty Flash Live',
                description: 'Beauty Flash live. Products pinned for instant checkout.',
                privacy: 'Public',
                tags: ['live'],
                delaySec: 0,
                autoReconnect: true
              },
              health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
            },
            {
              id: 'tt',
              name: 'TikTok Live',
              kind: 'Video Live',
              status: 'Stream key missing',
              enabled: false,
              accountLabel: 'Creator account',
              supportsStreamKey: true,
              supportsPrivacy: false,
              supportsCategory: false,
              supportsTags: false,
              supportsDelay: true,
              supportsAutoReconnect: true,
              proAdvanced: true,
              errorTitle: 'Stream key required',
              errorNext: 'Add a stream key or connect via OAuth if supported in your region.',
              settings: {
                title: 'GlowUp Hub: Autumn Beauty Flash Live',
                description: 'Live now. Limited stock.',
                tags: ['tiktok'],
                delaySec: 0,
                autoReconnect: true
              },
              health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
            },
            {
              id: 'ig',
              name: 'Instagram Live',
              kind: 'Video Live',
              status: 'Connected',
              enabled: true,
              accountLabel: 'Creator Studio',
              supportsStreamKey: false,
              supportsPrivacy: false,
              supportsCategory: false,
              supportsTags: false,
              supportsDelay: false,
              supportsAutoReconnect: true,
              proAdvanced: false,
              settings: {
                title: 'GlowUp Hub: Autumn Beauty Flash Live',
                description: 'Quick demo + price breakdown + instant buy.',
                tags: ['beauty', 'live'],
                delaySec: 0,
                autoReconnect: true
              },
              health: { framesDropped: 1, reconnects: 0, lastAckSec: 3, outBitrateKbps: 3800 }
            },
            {
              id: 'tw',
              name: 'Twitch',
              kind: 'Video Live',
              status: 'Blocked',
              enabled: false,
              accountLabel: 'Channel under review',
              supportsStreamKey: true,
              supportsPrivacy: false,
              supportsCategory: true,
              supportsTags: false,
              supportsDelay: true,
              supportsAutoReconnect: true,
              proAdvanced: false,
              errorTitle: 'Destination blocked',
              errorNext: 'Account flagged by platform policy. Contact support or switch destination.',
              settings: {
                title: 'GlowUp Hub: Autumn Beauty Flash Live',
                description: 'Live commerce stream.',
                category: 'Just Chatting',
                tags: ['commerce'],
                delaySec: 0,
                autoReconnect: true
              },
              health: { framesDropped: 0, reconnects: 0, lastAckSec: 0, outBitrateKbps: 0 }
            }
          ]
        }
      },
      {
        userId: users.creator.id,
        key: 'overlays',
        data: {
          isPro: true,
          session: {
            id: 'live_session_launch',
            title: 'Autumn Beauty Flash',
            status: 'Scheduled',
            startISO: daysFromNow(1).toISOString(),
            endISO: new Date(daysFromNow(1).getTime() + 90 * 60 * 1000).toISOString()
          },
          products: [
            {
              id: 'p1',
              name: 'GlowUp Serum Bundle',
              price: '$29.99',
              stock: 18,
              posterUrl: 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?auto=format&fit=crop&w=500&q=60'
            },
            {
              id: 'p2',
              name: 'Vitamin C Glow Kit',
              price: '$24.50',
              stock: 6,
              posterUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=60'
            },
            {
              id: 'p3',
              name: 'Hydration Night Mask',
              price: '$19.00',
              stock: 0,
              posterUrl: 'https://images.unsplash.com/photo-1585386959984-a41552231691?auto=format&fit=crop&w=500&q=60'
            }
          ],
          tab: 'qr',
          variant: 'A',
          qrEnabled: true,
          qrLabel: 'Scan to shop',
          qrUrl: 'https://mylivedealz.com/live/live_session_launch',
          qrCorner: 'tr',
          qrSize: 180,
          destUrl: 'https://mylivedealz.com/dealz/autumn-flash',
          utmSource: 'whatsapp',
          utmMedium: 'msg',
          utmCampaign: 'autumn_beauty_flash',
          utmContent: 'reminder_t10m',
          shortDomain: 'go.mylivedealz.com',
          shortSlug: 'glow247',
          timerEnabled: true,
          timerStyle: 'pill',
          timerText: 'Deal ends in',
          dealEndISO: new Date(daysFromNow(1).getTime() + 90 * 60 * 1000).toISOString(),
          lowerEnabled: true,
          lowerPlacement: 'bottom',
          lowerProductId: 'p1',
          ctaText: 'Buy now',
          abEnabled: true,
          notesA: 'Variant A: QR top-right + lower-third.',
          notesB: 'Variant B: Countdown bar + shorter CTA.'
        }
      },
      {
        userId: users.creator.id,
        key: 'post-live',
        data: {
          plan: 'Pro',
          session: {
            id: 'live_session_launch',
            title: 'Autumn Beauty Flash',
            status: 'Ended',
            endedISO: new Date(now - 33 * 60 * 1000).toISOString(),
            replayUrl: 'https://mylivedealz.com/replay/live_session_launch',
            coverUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=70'
          },
          published: false,
          schedulePublish: false,
          publishAt: new Date(now + 30 * 60 * 1000).toISOString(),
          allowComments: true,
          showProductStrip: true,
          clips: [
            { id: 'c1', title: 'GlowUp Bundle - Key benefits', startSec: 140, endSec: 210, format: '9:16', status: 'Exported' },
            { id: 'c2', title: 'Price drop moment', startSec: 520, endSec: 560, format: '9:16', status: 'Queued' },
            { id: 'c3', title: 'Buyer Q&A - shipping', startSec: 760, endSec: 840, format: '16:9', status: 'Draft' }
          ],
          channels: [
            { key: 'whatsapp', name: 'WhatsApp', short: 'WA', connected: 'Connected', supportsRich: true, costPerMessageUSD: 0.002 },
            { key: 'telegram', name: 'Telegram', short: 'TG', connected: 'Connected', supportsRich: true, costPerMessageUSD: 0.0 },
            { key: 'line', name: 'LINE', short: 'LINE', connected: 'Needs re-auth', supportsRich: true, costPerMessageUSD: 0.003 },
            { key: 'viber', name: 'Viber', short: 'Viber', connected: 'Connected', supportsRich: false, costPerMessageUSD: 0.0015 },
            { key: 'rcs', name: 'RCS', short: 'RCS', connected: 'Connected', supportsRich: false, costPerMessageUSD: 0.008 }
          ],
          enabledChannels: { whatsapp: true, telegram: true, line: false, viber: false, rcs: false },
          audience: 'past_buyers',
          scheduleSends: true,
          sendNow: false,
          templatePack: 'Default',
          cartRecovery: true,
          priceDrop: false,
          restock: true,
          metrics: {
            viewers: 18420,
            clicks: 3120,
            orders: 284,
            gmv: 9210,
            addToCart: 740,
            cartAbandon: 310,
            ctr: 0.169,
            conv: 0.091,
            ordersSeries: [4, 6, 8, 10, 9, 12, 15, 14, 18, 17, 16, 19, 21, 18, 16]
          }
        }
      },
      {
        userId: users.creator.id,
        key: 'live-alerts',
        data: {
          session: {
            id: 'live_session_launch',
            title: 'Autumn Beauty Flash',
            status: 'Live',
            startedISO: new Date(now - 9 * 60 * 1000).toISOString(),
            endsISO: new Date(now + 51 * 60 * 1000).toISOString()
          },
          channels: [
            {
              key: 'whatsapp',
              name: 'WhatsApp',
              short: 'WA',
              status: 'Connected',
              supportsPin: true,
              pinHint: 'Pin the live link message so late joiners can tap it quickly.'
            },
            {
              key: 'telegram',
              name: 'Telegram',
              short: 'TG',
              status: 'Connected',
              supportsPin: true,
              pinHint: 'Pin the latest message in the channel/group to keep the link visible.'
            },
            {
              key: 'line',
              name: 'LINE',
              short: 'LINE',
              status: 'Needs re-auth',
              supportsPin: true,
              pinHint: 'Reconnect your LINE account, then pin the live link message.'
            },
            {
              key: 'viber',
              name: 'Viber',
              short: 'Viber',
              status: 'Connected',
              supportsPin: true,
              pinHint: 'Pin one live link message so it stays visible while you are live.'
            },
            {
              key: 'rcs',
              name: 'RCS',
              short: 'RCS',
              status: 'Connected',
              supportsPin: false,
              pinHint: 'Pinning varies by device. Keep alerts spaced out and resend sparingly.'
            }
          ],
          templateSeeds: [
            { key: 'were_live', title: 'We are live', subtitle: 'Kick off attendance fast.', minIntervalMinutes: 8, iconKey: 'bell' },
            { key: 'flash_deal', title: 'Flash deal', subtitle: 'Announce a drop (with caps).', minIntervalMinutes: 10, iconKey: 'flame' },
            { key: 'last_chance', title: 'Last chance', subtitle: 'Final push before end.', minIntervalMinutes: 12, iconKey: 'timer' }
          ],
          enabledDest: { whatsapp: true, telegram: true, line: false, viber: false, rcs: false },
          dealName: 'GlowUp Serum Bundle',
          dealEndsMinutes: 10,
          lastSent: {
            were_live: now - 11 * 60 * 1000,
            flash_deal: now - 20 * 60 * 1000,
            last_chance: now - 40 * 60 * 1000
          }
        }
      },
      {
        userId: users.creator.id,
        key: 'safety',
        data: {
          session: {
            id: 'live_session_launch',
            title: 'Autumn Beauty Flash',
            status: 'Live',
            startedISO: new Date(now - 22 * 60 * 1000).toISOString(),
            endsISO: new Date(now + 58 * 60 * 1000).toISOString()
          },
          destinations: [
            { id: 'yt', name: 'YouTube Live', type: 'Video Live', status: 'Connected', liveState: 'Live', supportsChat: true, supportsMuteChat: true, supportsEmergencyActions: true },
            { id: 'tt', name: 'TikTok Live', type: 'Video Live', status: 'Connected', liveState: 'Live', supportsChat: true, supportsMuteChat: false, supportsEmergencyActions: false },
            { id: 'ig', name: 'Instagram Live', type: 'Community Live', status: 'Needs re-auth', liveState: 'Not live', supportsChat: true, supportsMuteChat: false, supportsEmergencyActions: false },
            { id: 'fb', name: 'Facebook Live', type: 'Video Live', status: 'Connected', liveState: 'Live', supportsChat: true, supportsMuteChat: true, supportsEmergencyActions: true }
          ],
          messages: [
            { id: 'm1', destId: 'yt', userName: 'Amara K.', handle: '@amarak', text: 'Is the GlowUp bundle available for delivery today?', atISO: new Date(now - 2 * 60 * 1000).toISOString(), flags: [] },
            { id: 'm2', destId: 'yt', userName: 'DealHunter', handle: '@dealhunter', text: 'FREE iPhone here http://bit.ly/scam', atISO: new Date(now - 3 * 60 * 1000).toISOString(), flags: ['Link', 'Spam'] },
            { id: 'm3', destId: 'tt', userName: 'Kato', handle: '@kato_ug', text: 'Price drop please!', atISO: new Date(now - 4 * 60 * 1000).toISOString(), flags: [] },
            { id: 'm4', destId: 'fb', userName: 'Sarah N.', handle: '@sarahn', text: 'This is fake, you people are thieves', atISO: new Date(now - 6 * 60 * 1000).toISOString(), flags: ['Harassment'] },
            { id: 'm5', destId: 'fb', userName: 'VIP Buyer', handle: '@vipbuyer', text: 'Added to cart. Waiting for checkout link!', atISO: new Date(now - 8 * 60 * 1000).toISOString(), flags: [] },
            { id: 'm6', destId: 'tt', userName: 'Spammy', handle: '@spammy', text: 'follow me for dealz, follow follow follow', atISO: new Date(now - 9 * 60 * 1000).toISOString(), flags: ['Spam'] }
          ],
          keywordRules: [
            { id: 'k1', phrase: 'http://', match: 'Contains', action: 'Flag', scope: 'All destinations', enabled: true },
            { id: 'k2', phrase: 'free iphone', match: 'Contains', action: 'Block', scope: 'All destinations', enabled: true },
            { id: 'k3', phrase: 'thieves', match: 'Exact', action: 'Mask', scope: 'Selected destinations', destinationIds: ['fb'], enabled: true }
          ],
          controls: {
            plan: 'Pro',
            roleMode: 'creator',
            activeDestId: 'yt',
            handledIds: {},
            muteChat: { yt: false, tt: false, ig: false, fb: false },
            pauseNotifications: false,
            autoModeration: true,
            slowMode: false,
            linkBlocking: true
          }
        }
      },
      {
        userId: users.creator.id,
        recordType: 'content_approval',
        recordKey: 'SUB-001',
        payload: {
          id: 'SUB-001',
          title: 'IG Reel Draft — Serum Promo',
          campaign: 'GlowUp Serum Promo',
          supplier: { name: 'GlowUp Hub', type: 'Seller' },
          channel: 'Instagram',
          type: 'Video',
          desk: 'General',
          status: 'Under Review',
          riskScore: 28,
          submittedAtISO: new Date(now - 140 * 60000).toISOString(),
          dueAtISO: new Date(now + 980 * 60000).toISOString(),
          notesFromCreator: 'Short 15s hook + benefits + CTA. Please confirm compliance wording.',
          caption: 'GlowUp Serum Dealz now live. Limited stock. Tap to shop with my link. #MyLiveDealz #ShoppableAdz #ad',
          assets: [
            { name: 'ig-reel-draft.mp4', type: 'Video', size: '14.8 MB' },
            { name: 'cover-4x5.png', type: 'Image', size: '1.2 MB' }
          ],
          flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
          lastUpdatedISO: new Date(now - 122 * 60000).toISOString(),
          audit: [
            { atISO: new Date(now - 140 * 60000).toISOString(), msg: 'Submitted' },
            { atISO: new Date(now - 122 * 60000).toISOString(), msg: 'Moved to Under Review' }
          ]
        }
      },
      {
        userId: users.creator.id,
        recordType: 'content_approval',
        recordKey: 'SUB-002',
        payload: {
          id: 'SUB-002',
          title: 'TikTok Script — Tech Friday Mega',
          campaign: 'Tech Friday Mega',
          supplier: { name: 'GadgetMart Africa', type: 'Seller' },
          channel: 'TikTok',
          type: 'Caption',
          desk: 'General',
          status: 'Changes Requested',
          riskScore: 52,
          submittedAtISO: new Date(now - 980 * 60000).toISOString(),
          dueAtISO: new Date(now - 120 * 60000).toISOString(),
          notesFromCreator: 'Script focuses on unboxing + quick price anchor + bundle CTA.',
          caption: 'Tech Friday Mega Live: gadgets bundles + fast checkout. Join live and shop. {LINK}',
          assets: [{ name: 'tiktok-script.txt', type: 'Doc', size: '12 KB' }],
          flags: { missingDisclosure: true, sensitiveClaim: false, brandRestriction: false },
          lastUpdatedISO: new Date(now - 120 * 60000).toISOString(),
          audit: [
            { atISO: new Date(now - 980 * 60000).toISOString(), msg: 'Submitted' },
            { atISO: new Date(now - 915 * 60000).toISOString(), msg: 'Changes requested: add #ad disclosure' }
          ]
        }
      },
      {
        userId: users.creator.id,
        recordType: 'content_approval',
        recordKey: 'SUB-003',
        payload: {
          id: 'SUB-003',
          title: 'YouTube Shorts Cut — Gadget Unboxing',
          campaign: 'Gadget Unboxing Marathon',
          supplier: { name: 'GadgetMart Africa', type: 'Seller' },
          channel: 'YouTube',
          type: 'Video',
          desk: 'General',
          status: 'Pending',
          riskScore: 35,
          submittedAtISO: new Date(now - 60 * 60000).toISOString(),
          dueAtISO: new Date(now + 420 * 60000).toISOString(),
          notesFromCreator: '45s cut, includes pricing overlay and CTA.',
          caption: 'New unboxing. Watch and shop with my link. #MyLiveDealz #LiveSessionz',
          assets: [{ name: 'shorts-cut.mp4', type: 'Video', size: '38.4 MB' }],
          flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
          lastUpdatedISO: new Date(now - 60 * 60000).toISOString(),
          audit: [{ atISO: new Date(now - 60 * 60000).toISOString(), msg: 'Submitted' }]
        }
      },
      {
        userId: users.creator.id,
        recordType: 'content_approval',
        recordKey: 'SUB-004',
        payload: {
          id: 'SUB-004',
          title: 'WhatsApp Broadcast Copy — Repair Booking',
          campaign: 'Repair Booking Offer',
          supplier: { name: 'FixNow Mobile', type: 'Provider' },
          channel: 'WhatsApp',
          type: 'Caption',
          desk: 'General',
          status: 'Approved',
          riskScore: 12,
          submittedAtISO: new Date(now - 3100 * 60000).toISOString(),
          dueAtISO: new Date(now).toISOString(),
          notesFromCreator: 'Simple broadcast message and CTA to book.',
          caption: 'Need a trusted mobile repair? Book here: {LINK} (Fast, clear pricing). #MyLiveDealz',
          assets: [{ name: 'whatsapp-broadcast.txt', type: 'Doc', size: '8 KB' }],
          flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
          lastUpdatedISO: new Date(now - 3010 * 60000).toISOString(),
          audit: [
            { atISO: new Date(now - 3100 * 60000).toISOString(), msg: 'Submitted' },
            { atISO: new Date(now - 3010 * 60000).toISOString(), msg: 'Approved' }
          ]
        }
      },
      {
        userId: users.creator.id,
        recordType: 'content_approval',
        recordKey: 'SUB-005',
        payload: {
          id: 'SUB-005',
          title: 'Faith-compatible Caption — Wellness',
          campaign: 'Faith & Wellness',
          supplier: { name: 'Grace Living Store', type: 'Seller' },
          channel: 'Instagram',
          type: 'Caption',
          desk: 'Faith',
          status: 'Escalated',
          riskScore: 79,
          submittedAtISO: new Date(now - 220 * 60000).toISOString(),
          dueAtISO: new Date(now + 240 * 60000).toISOString(),
          notesFromCreator: 'Please validate tone and desk guidelines.',
          caption: 'Wellness picks for your routine. Shop responsibly with my link. #MyLiveDealz',
          assets: [{ name: 'caption-faith.txt', type: 'Doc', size: '6 KB' }],
          flags: { missingDisclosure: true, sensitiveClaim: true, brandRestriction: true },
          lastUpdatedISO: new Date(now - 198 * 60000).toISOString(),
          audit: [
            { atISO: new Date(now - 220 * 60000).toISOString(), msg: 'Submitted' },
            { atISO: new Date(now - 198 * 60000).toISOString(), msg: 'Escalated to Faith Desk' }
          ]
        }
      }
    ]
  });

  await prisma.review.createMany({
    data: [
      {
        id: 'review_creator_autumn_1',
        reviewerUserId: users.sellerUser.id,
        subjectType: 'CREATOR',
        subjectId: users.creator.id,
        subjectUserId: users.creator.id,
        sessionId: 'LS-20418',
        campaignId: 'campaign_ev_launch',
        title: 'Autumn Beauty Flash',
        buyerName: 'GlowUp Hub',
        buyerType: 'Seller',
        roleTarget: 'creator',
        itemType: 'live_session',
        channel: 'MyLiveDealz',
        marketplace: 'Creator',
        mldzSurface: 'live_session',
        sentiment: 'positive',
        requiresResponse: false,
        ratingOverall: 5,
        ratingBreakdown: {
          presentation: 5,
          helpfulness: 5,
          productKnowledge: 4,
          interaction: 5,
          trust: 5
        },
        quickTags: ['Great energy', 'Clear CTA', 'Helpful demo'],
        issueTags: [],
        reviewText: 'Strong pacing, clear product explanation, and the offer moments felt timely.',
        wouldJoinAgain: true,
        transactionIntent: 'bought',
        isPublic: true,
        isAnonymous: false,
        status: 'PUBLISHED',
        createdAt: new Date(now - 170 * 60000)
      },
      {
        id: 'review_creator_autumn_2',
        reviewerUserId: users.providerUser.id,
        subjectType: 'CREATOR',
        subjectId: users.creator.id,
        subjectUserId: users.creator.id,
        sessionId: 'LS-20418',
        campaignId: 'campaign_ev_launch',
        title: 'Autumn Beauty Flash',
        buyerName: 'GlowUp Hub',
        buyerType: 'Seller',
        roleTarget: 'creator',
        itemType: 'live_session',
        channel: 'MyLiveDealz',
        marketplace: 'Creator',
        mldzSurface: 'live_session',
        sentiment: 'mixed',
        requiresResponse: true,
        ratingOverall: 4,
        ratingBreakdown: {
          presentation: 4,
          helpfulness: 4,
          productKnowledge: 4,
          interaction: 4,
          trust: 4
        },
        quickTags: ['Clear answers', 'Good pacing'],
        issueTags: ['Wanted more demos'],
        reviewText: 'Helpful session. A bit more before/after proof would improve trust.',
        wouldJoinAgain: true,
        transactionIntent: 'added_to_cart',
        isPublic: false,
        isAnonymous: true,
        status: 'PUBLISHED',
        createdAt: new Date(now - 160 * 60000)
      },
      {
        id: 'review_creator_glowup_evening',
        reviewerUserId: users.sellerUser.id,
        subjectType: 'CREATOR',
        subjectId: users.creator.id,
        subjectUserId: users.creator.id,
        sessionId: 'LS-20419',
        campaignId: 'campaign_ev_launch',
        title: 'GlowUp Evening Dealz',
        buyerName: 'GlowUp Hub',
        buyerType: 'Seller',
        roleTarget: 'creator',
        itemType: 'live_session',
        channel: 'MyLiveDealz',
        marketplace: 'Creator',
        mldzSurface: 'live_session',
        sentiment: 'positive',
        requiresResponse: false,
        ratingOverall: 5,
        ratingBreakdown: {
          presentation: 5,
          helpfulness: 5,
          productKnowledge: 5,
          interaction: 4,
          trust: 5
        },
        quickTags: ['Trusted host', 'Great recap'],
        issueTags: [],
        reviewText: 'Very polished. The host kept the stream moving and still answered key questions.',
        wouldJoinAgain: true,
        transactionIntent: 'just_watched',
        isPublic: true,
        isAnonymous: false,
        status: 'PUBLISHED',
        createdAt: new Date(now - 1430 * 60000)
      }
    ]
  });

  await prisma.adzLink.createMany({
    data: [
      {
        id: 'LIVE-102',
        userId: users.creator.id,
        status: 'scheduled',
        url: 'https://mldz.link/LIVE-102',
        data: {
          id: 'LIVE-102',
          tab: 'live',
          title: 'Live Sessionz · Beauty Flash',
          subtitle: 'Today 18:30 · Kampala',
          status: 'Scheduled',
          createdAt: 'Today',
          expiresAt: 'Tomorrow',
          pinned: true,
          campaign: { id: 'CAMP-11', name: 'Beauty Flash Dealz' },
          supplier: { name: 'GlowUp Hub', type: 'Seller' },
          primaryUrl: 'https://mylivedealz.com/live/beauty-flash?creator=ronald',
          shortUrl: 'https://mldz.link/LIVE-102',
          regionVariants: [
            { region: 'Global', url: 'https://mldz.link/LIVE-102' },
            { region: 'Africa', url: 'https://mldz.link/LIVE-102?rg=af' },
            { region: 'EU/UK', url: 'https://mldz.link/LIVE-102?rg=eu' },
            { region: 'Asia', url: 'https://mldz.link/LIVE-102?rg=as' },
            { region: 'China', url: 'https://mldz.link/LIVE-102?rg=cn' }
          ],
          metrics: { clicks: 320, purchases: 0, conversionPct: 0, earnings: 0, currency: 'USD' },
          regionMetrics: [
            { region: 'Global', clicks: 320, purchases: 0, earnings: 0, currency: 'USD' },
            { region: 'Africa', clicks: 220, purchases: 0, earnings: 0, currency: 'USD' },
            { region: 'Asia', clicks: 60, purchases: 0, earnings: 0, currency: 'USD' },
            { region: 'EU/UK', clicks: 25, purchases: 0, earnings: 0, currency: 'USD' },
            { region: 'China', clicks: 15, purchases: 0, earnings: 0, currency: 'USD' }
          ],
          channels: [
            { name: 'Instagram Story', url: 'https://mylivedealz.com/live/beauty-flash?creator=ronald&ch=ig_story', hint: 'Best for Stories' },
            { name: 'TikTok', url: 'https://mylivedealz.com/live/beauty-flash?creator=ronald&ch=tiktok', hint: 'Best for short hooks' },
            { name: 'YouTube Shorts', url: 'https://mylivedealz.com/live/beauty-flash?creator=ronald&ch=shorts', hint: 'Best for replay discovery' },
            { name: 'WhatsApp', url: 'https://mylivedealz.com/live/beauty-flash?creator=ronald&ch=whatsapp', hint: 'Best for broadcasts' }
          ],
          sharePack: {
            headline: 'LIVE TODAY: Beauty Flash Dealz',
            bullets: ['Limited stock + live-only discounts', 'High-quality products from verified Sellers', 'Fast checkout and buyer protections'],
            captions: [
              { platform: 'Instagram', text: 'Going live today at 18:30! Beauty Flash Dealz with limited stock. Tap the link to join and shop live. #MyLiveDealz #LiveSessionz' },
              { platform: 'TikTok', text: 'Live at 18:30. Beauty Flash Dealz. Limited stock. Join and shop live. #LiveSessionz #MyLiveDealz' },
              { platform: 'WhatsApp', text: 'I’m going live today at 18:30 with Beauty Flash Dealz. Join here: {LINK}' }
            ],
            hashtags: ['#MyLiveDealz', '#LiveSessionz', '#BeautyDealz', '#ShopLive']
          }
        }
      },
      {
        id: 'LIVE-087',
        userId: users.creator.id,
        status: 'active',
        url: 'https://mldz.link/LIVE-087',
        data: {
          id: 'LIVE-087',
          tab: 'live',
          title: 'Live Sessionz · Tech Friday Mega',
          subtitle: 'Replay available',
          status: 'Active',
          createdAt: '2 days ago',
          pinned: false,
          campaign: { id: 'CAMP-07', name: 'Tech Friday Mega' },
          supplier: { name: 'GadgetMart Africa', type: 'Seller' },
          primaryUrl: 'https://mylivedealz.com/replay/tech-friday?creator=ronald',
          shortUrl: 'https://mldz.link/LIVE-087',
          regionVariants: [
            { region: 'Global', url: 'https://mldz.link/LIVE-087' },
            { region: 'Africa', url: 'https://mldz.link/LIVE-087?rg=af' },
            { region: 'EU/UK', url: 'https://mldz.link/LIVE-087?rg=eu' },
            { region: 'Asia', url: 'https://mldz.link/LIVE-087?rg=as' },
            { region: 'China', url: 'https://mldz.link/LIVE-087?rg=cn' }
          ],
          metrics: { clicks: 1850, purchases: 96, conversionPct: 5.2, earnings: 820, currency: 'USD' },
          regionMetrics: [
            { region: 'Global', clicks: 1850, purchases: 96, earnings: 820, currency: 'USD' },
            { region: 'Africa', clicks: 851, purchases: 44, earnings: 377, currency: 'USD' },
            { region: 'Asia', clicks: 518, purchases: 27, earnings: 230, currency: 'USD' },
            { region: 'EU/UK', clicks: 296, purchases: 15, earnings: 130, currency: 'USD' },
            { region: 'China', clicks: 185, purchases: 10, earnings: 83, currency: 'USD' }
          ],
          channels: [
            { name: 'Instagram Feed', url: 'https://mylivedealz.com/replay/tech-friday?creator=ronald&ch=ig_feed', hint: 'Best for evergreen' },
            { name: 'TikTok', url: 'https://mylivedealz.com/replay/tech-friday?creator=ronald&ch=tiktok', hint: 'Best for reach' },
            { name: 'WhatsApp', url: 'https://mylivedealz.com/replay/tech-friday?creator=ronald&ch=whatsapp', hint: 'Best for groups' },
            { name: 'Telegram', url: 'https://mylivedealz.com/replay/tech-friday?creator=ronald&ch=telegram', hint: 'Best for communities' }
          ],
          sharePack: {
            headline: 'REPLAY: Tech Friday Mega Live',
            bullets: ['High-quality gadgets + bundles', 'Watch the demo, then shop', 'Tracked link supports your earnings'],
            captions: [
              { platform: 'Instagram', text: 'Replay is up! Tech Friday Mega Live. Watch the demo and shop through this link. #MyLiveDealz #LiveSessionz' },
              { platform: 'YouTube Shorts', text: 'Tech Friday replay: best gadgets + bundles. Shop with the link. #MyLiveDealz' },
              { platform: 'WhatsApp', text: 'Replay is up (Tech Friday). Watch and shop here: {LINK}' }
            ],
            hashtags: ['#MyLiveDealz', '#LiveSessionz', '#TechDealz', '#Gadgets']
          }
        }
      },
      {
        id: 'SHOP-311',
        userId: users.creator.id,
        status: 'active',
        url: 'https://mldz.link/SHOP-311',
        data: {
          id: 'SHOP-311',
          tab: 'shoppable',
          title: 'Shoppable Adz · Serum Promo',
          subtitle: 'Link pack + QR',
          status: 'Active',
          createdAt: 'This week',
          pinned: true,
          campaign: { id: 'CAMP-21', name: 'GlowUp Serum Promo' },
          supplier: { name: 'GlowUp Hub', type: 'Seller' },
          primaryUrl: 'https://mylivedealz.com/shoppable/serum?creator=ronald',
          shortUrl: 'https://mldz.link/SHOP-311',
          regionVariants: [
            { region: 'Global', url: 'https://mldz.link/SHOP-311' },
            { region: 'Africa', url: 'https://mldz.link/SHOP-311?rg=af' },
            { region: 'EU/UK', url: 'https://mldz.link/SHOP-311?rg=eu' },
            { region: 'Asia', url: 'https://mldz.link/SHOP-311?rg=as' },
            { region: 'China', url: 'https://mldz.link/SHOP-311?rg=cn' }
          ],
          metrics: { clicks: 980, purchases: 41, conversionPct: 4.2, earnings: 210, currency: 'USD' },
          regionMetrics: [
            { region: 'Global', clicks: 980, purchases: 41, earnings: 210, currency: 'USD' },
            { region: 'Africa', clicks: 568, purchases: 24, earnings: 122, currency: 'USD' },
            { region: 'Asia', clicks: 196, purchases: 8, earnings: 42, currency: 'USD' },
            { region: 'EU/UK', clicks: 137, purchases: 6, earnings: 30, currency: 'USD' },
            { region: 'China', clicks: 79, purchases: 3, earnings: 16, currency: 'USD' }
          ],
          channels: [
            { name: 'Instagram Story', url: 'https://mylivedealz.com/shoppable/serum?creator=ronald&ch=ig_story', hint: 'Best for Stories' },
            { name: 'TikTok', url: 'https://mylivedealz.com/shoppable/serum?creator=ronald&ch=tiktok', hint: 'Best for short hooks' },
            { name: 'YouTube Shorts', url: 'https://mylivedealz.com/shoppable/serum?creator=ronald&ch=shorts', hint: 'Best for replay discovery' },
            { name: 'WhatsApp', url: 'https://mylivedealz.com/shoppable/serum?creator=ronald&ch=whatsapp', hint: 'Best for broadcasts' }
          ],
          sharePack: {
            headline: 'GlowUp Serum Dealz',
            bullets: ['Verified Seller · buyer protections', 'Fast checkout', 'Limited stock'],
            captions: [
              { platform: 'Instagram', text: 'GlowUp Serum Dealz now live. Limited stock. Tap to shop. #MyLiveDealz #ShoppableAdz' },
              { platform: 'TikTok', text: 'This serum is selling fast. Tap to shop. #ShoppableAdz #MyLiveDealz' },
              { platform: 'WhatsApp', text: 'GlowUp Serum deal is live. Shop here: {LINK}' }
            ],
            hashtags: ['#MyLiveDealz', '#ShoppableAdz', '#BeautyDealz']
          }
        }
      },
      {
        id: 'SHOP-402',
        userId: users.creator.id,
        status: 'active',
        url: 'https://mldz.link/SHOP-402',
        data: {
          id: 'SHOP-402',
          tab: 'shoppable',
          title: 'Shoppable Adz · Mobile Repair Booking',
          subtitle: 'Service booking link',
          status: 'Active',
          createdAt: 'This month',
          pinned: false,
          campaign: { id: 'CAMP-33', name: 'Repair Booking Offer' },
          supplier: { name: 'FixNow Mobile', type: 'Provider' },
          primaryUrl: 'https://mylivedealz.com/shoppable/repair?creator=ronald',
          shortUrl: 'https://mldz.link/SHOP-402',
          regionVariants: [
            { region: 'Global', url: 'https://mldz.link/SHOP-402' },
            { region: 'Africa', url: 'https://mldz.link/SHOP-402?rg=af' },
            { region: 'EU/UK', url: 'https://mldz.link/SHOP-402?rg=eu' },
            { region: 'Asia', url: 'https://mldz.link/SHOP-402?rg=as' },
            { region: 'China', url: 'https://mldz.link/SHOP-402?rg=cn' }
          ],
          metrics: { clicks: 540, purchases: 16, conversionPct: 3.0, earnings: 95, currency: 'USD' },
          regionMetrics: [
            { region: 'Global', clicks: 540, purchases: 16, earnings: 95, currency: 'USD' },
            { region: 'Africa', clicks: 384, purchases: 11, earnings: 67, currency: 'USD' },
            { region: 'Asia', clicks: 65, purchases: 2, earnings: 11, currency: 'USD' },
            { region: 'EU/UK', clicks: 54, purchases: 2, earnings: 10, currency: 'USD' },
            { region: 'China', clicks: 37, purchases: 1, earnings: 7, currency: 'USD' }
          ],
          channels: [
            { name: 'Instagram Feed', url: 'https://mylivedealz.com/shoppable/repair?creator=ronald&ch=ig_feed', hint: 'Best for evergreen' },
            { name: 'WhatsApp', url: 'https://mylivedealz.com/shoppable/repair?creator=ronald&ch=whatsapp', hint: 'Best for groups' },
            { name: 'Telegram', url: 'https://mylivedealz.com/shoppable/repair?creator=ronald&ch=telegram', hint: 'Best for communities' }
          ],
          sharePack: {
            headline: 'Book Mobile Repair (Trusted Provider)',
            bullets: ['Verified Provider', 'Clear pricing', 'Easy booking'],
            captions: [
              { platform: 'Instagram', text: 'Need a quick mobile repair? Book a trusted Provider here. #MyLiveDealz #ShoppableAdz' },
              { platform: 'WhatsApp', text: 'Trusted mobile repair booking: {LINK}' }
            ],
            hashtags: ['#MyLiveDealz', '#ShoppableAdz', '#Services']
          }
        }
      }
    ]
  });
}

async function clearDatabase() {
  await prisma.liveMoment.deleteMany();
  await prisma.liveToolConfig.deleteMany();
  await prisma.liveReplay.deleteMany();
  await prisma.liveStudio.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.liveBuilder.deleteMany();
  await prisma.adzPerformance.deleteMany();
  await prisma.adzLink.deleteMany();
  await prisma.adzCampaign.deleteMany();
  await prisma.adzBuilder.deleteMany();
  await prisma.promoAd.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.workspaceSetting.deleteMany();
  await prisma.userSetting.deleteMany();
  await prisma.userSubscription.deleteMany();
  await prisma.sellerFollow.deleteMany();
  await prisma.shippingRate.deleteMany();
  await prisma.shippingProfile.deleteMany();
  await prisma.catalogTemplate.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.proposalMessage.deleteMany();
  await prisma.reviewReply.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deliverableAsset.deleteMany();
  await prisma.task.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.collaborationInvite.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.appRecord.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const seed = buildSeedData();

  await clearDatabase();

  const users = await seedUsers(seed);
  const sellerProfiles = await seedSellers(users, seed);

  await seedDiscovery(users, sellerProfiles);
  await seedMarketplace(users, sellerProfiles);
  await seedCollaboration(users, sellerProfiles);
  await seedCommerce(users, sellerProfiles);
  await seedDashboardAndCompatibility(users, sellerProfiles);
  await seedFrontendReplacementData(users, sellerProfiles);
  await seedAnalytics(users);

  console.log('Seeded unified creator/seller backend data.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
