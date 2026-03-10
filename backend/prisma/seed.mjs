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
        title: 'Autumn Beauty Live',
        campaign: 'Autumn Beauty Flash',
        seller: 'GlowUp Hub',
        scheduledFor: daysFromNow(1).toISOString(),
        scheduledAt: daysFromNow(1).toISOString(),
        weekday: 'Friday',
        dateLabel: daysFromNow(1).toISOString().slice(0, 10),
        time: '18:00',
        location: 'Studio A',
        simulcast: ['Instagram', 'TikTok'],
        status: 'scheduled',
        role: 'Host',
        durationMin: 60,
        scriptsReady: true,
        assetsReady: true,
        productsCount: 6,
        workloadScore: 42,
        conflict: false
      }
    }
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

  await prisma.liveToolConfig.createMany({
    data: [
      {
        userId: users.creator.id,
        key: 'audience-notifications',
        data: {
          enabled: true,
          channels: ['push', 'email'],
          reminders: [{ id: 'rem_1', label: '45 min before', minutes: 45 }],
          templates: [{ id: 'tpl_aud_1', name: 'Live starts soon' }]
        }
      },
      {
        userId: users.creator.id,
        key: 'streaming',
        data: {
          destinations: ['Instagram', 'TikTok'],
          bitrate: '4500kbps'
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
  await prisma.workflowRecord.deleteMany();
  await prisma.workspaceSetting.deleteMany();
  await prisma.userSetting.deleteMany();
  await prisma.shippingRate.deleteMany();
  await prisma.shippingProfile.deleteMany();
  await prisma.catalogTemplate.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.proposalMessage.deleteMany();
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
