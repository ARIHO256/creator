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

async function clearDatabase() {
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
