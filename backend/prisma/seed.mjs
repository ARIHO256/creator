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

function uiListingStatusToDb(status) {
  if (status === 'Live') return 'ACTIVE';
  if (status === 'In Review') return 'IN_REVIEW';
  if (status === 'Paused') return 'PAUSED';
  if (status === 'Rejected') return 'ARCHIVED';
  return 'DRAFT';
}

function seededSellerListings() {
  const base = Date.now();
  const rows = [
    {
      id: 'listing_ev_charger',
      sku: 'EV-CHG-7KW',
      title: 'EV Fast Charger 7kW Wallbox',
      kind: 'Product',
      marketplace: 'EVmart',
      category: 'Chargers',
      currency: 'USD',
      retailPrice: 620,
      compareAt: 720,
      moq: 2,
      wholesaleTiers: [
        { qty: 2, price: 600 },
        { qty: 10, price: 570 },
        { qty: 50, price: 545 }
      ],
      stock: 18,
      inventory: [
        { id: 'w1', location: 'Main Warehouse', onHand: 18, reserved: 2 },
        { id: 'w2', location: 'Kampala Hub', onHand: 6, reserved: 1 }
      ],
      images: 7,
      translations: 5,
      description:
        'Premium 7kW wallbox charger with smart scheduling, RFID access, and OCPP-ready control. Suitable for homes and commercial sites.',
      tags: ['wallbox', '7kW', 'OCPP'],
      status: 'Live',
      updatedAt: new Date(base - 1000 * 60 * 18).toISOString(),
      compliance: {
        state: 'ok',
        issues: [],
        lastScanAt: new Date(base - 1000 * 60 * 42).toISOString()
      },
      kpis: { views: 18420, addToCart: 920, orders: 214, conversion: 1.16, revenue: 132680 },
      trend: {
        views: [12, 18, 16, 22, 29, 31, 28, 34, 38, 42, 40, 47],
        orders: [1, 3, 2, 4, 6, 5, 6, 7, 6, 8, 7, 9]
      }
    },
    {
      id: 'listing_ev_battery_pack',
      sku: 'EV-BAT-48V-20AH',
      title: 'E-Bike Battery Pack 48V 20Ah',
      kind: 'Product',
      marketplace: 'EVmart',
      category: 'Batteries',
      currency: 'USD',
      retailPrice: 280,
      compareAt: 320,
      moq: 5,
      wholesaleTiers: [
        { qty: 5, price: 265 },
        { qty: 20, price: 248 },
        { qty: 50, price: 235 }
      ],
      stock: 42,
      inventory: [
        { id: 'w1', location: 'Main Warehouse', onHand: 42, reserved: 6 },
        { id: 'w2', location: 'Kampala Hub', onHand: 10, reserved: 2 }
      ],
      images: 4,
      translations: 3,
      description:
        'High-density 48V 20Ah battery pack designed for long-range e-bikes. Includes smart BMS and premium casing.',
      tags: ['48V', '20Ah', 'BMS'],
      status: 'In Review',
      updatedAt: new Date(base - 1000 * 60 * 55).toISOString(),
      compliance: {
        state: 'warn',
        issues: ['Missing MSDS upload', 'Warranty terms not set'],
        lastScanAt: null
      },
      kpis: { views: 12890, addToCart: 620, orders: 118, conversion: 0.92, revenue: 33040 },
      trend: {
        views: [9, 10, 12, 13, 14, 16, 17, 18, 19, 22, 20, 24],
        orders: [1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 4, 6]
      }
    },
    {
      id: 'listing_type2_cable',
      sku: 'EV-CBL-TYPE2-5M',
      title: 'Type 2 Charging Cable 5m',
      kind: 'Product',
      marketplace: 'EVmart',
      category: 'Accessories',
      currency: 'USD',
      retailPrice: 36,
      compareAt: 45,
      moq: 10,
      wholesaleTiers: [
        { qty: 10, price: 32 },
        { qty: 100, price: 28 }
      ],
      stock: 210,
      inventory: [{ id: 'w1', location: 'Main Warehouse', onHand: 210, reserved: 9 }],
      images: 2,
      translations: 1,
      description:
        'Type 2 cable for public and home charging. Durable insulation and premium connector grip.',
      tags: ['Type2', '5m'],
      status: 'Draft',
      updatedAt: new Date(base - 1000 * 60 * 140).toISOString(),
      compliance: {
        state: 'warn',
        issues: ['Low image count', 'Shipping profile not selected'],
        lastScanAt: null
      },
      kpis: { views: 880, addToCart: 22, orders: 4, conversion: 0.45, revenue: 144 },
      trend: {
        views: [1, 2, 1, 3, 4, 5, 4, 6, 7, 6, 8, 9],
        orders: [0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1]
      }
    },
    {
      id: 'listing_logistics_setup',
      sku: 'SVC-LOG-WAREHOUSE-PORT',
      title: 'Warehouse-to-port logistics setup',
      kind: 'Service',
      marketplace: 'ServiceMart',
      category: 'Logistics',
      currency: 'USD',
      retailPrice: 190,
      compareAt: 240,
      moq: 1,
      wholesaleTiers: [{ qty: 1, price: 175 }],
      stock: 999,
      inventory: [{ id: 'svc', location: 'Capacity', onHand: 999, reserved: 18 }],
      images: 6,
      translations: 4,
      description:
        'End-to-end logistics planning from warehouse to port. Includes documentation checklist and timelines.',
      tags: ['freight', 'incoterms'],
      status: 'Paused',
      updatedAt: new Date(base - 1000 * 60 * 240).toISOString(),
      compliance: {
        state: 'ok',
        issues: [],
        lastScanAt: new Date(base - 1000 * 60 * 90).toISOString()
      },
      kpis: { views: 6200, addToCart: 210, orders: 44, conversion: 0.71, revenue: 8360 },
      trend: {
        views: [8, 10, 11, 14, 16, 17, 18, 19, 18, 17, 16, 15],
        orders: [1, 1, 2, 3, 3, 4, 5, 5, 4, 4, 3, 3]
      }
    },
    {
      id: 'listing_dc_fast_install',
      sku: 'SVC-DC-FAST-INSTALL',
      title: 'DC fast charger installation package',
      kind: 'Service',
      marketplace: 'ServiceMart',
      category: 'Installations',
      currency: 'USD',
      retailPrice: 320,
      compareAt: 410,
      moq: 1,
      wholesaleTiers: [{ qty: 1, price: 295 }],
      stock: 999,
      inventory: [{ id: 'svc', location: 'Capacity', onHand: 999, reserved: 7 }],
      images: 5,
      translations: 2,
      description:
        'Site assessment, installation planning, technician allocation and commissioning support for DC fast charger projects.',
      tags: ['installation', 'dc-fast', 'commissioning'],
      status: 'Rejected',
      updatedAt: new Date(base - 1000 * 60 * 380).toISOString(),
      compliance: {
        state: 'issue',
        issues: ['Electrical compliance pack expired', 'Technician certification missing'],
        lastScanAt: new Date(base - 1000 * 60 * 120).toISOString()
      },
      kpis: { views: 3100, addToCart: 88, orders: 19, conversion: 0.61, revenue: 6080 },
      trend: {
        views: [6, 7, 9, 11, 12, 13, 12, 11, 10, 9, 8, 7],
        orders: [1, 1, 1, 2, 2, 3, 2, 2, 1, 1, 1, 0]
      }
    }
  ];

  return rows.map((row) => ({
    ...row,
    versions: [
      {
        id: `ver_${row.id}_initial`,
        at: row.updatedAt,
        actor: 'System',
        note: 'Initial version',
        snapshot: { ...row }
      }
    ]
  }));
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
      ...seededSellerListings().map((listing, index) => ({
        id: listing.id,
        userId: users.sellerUser.id,
        sellerId: sellerProfiles.seller.id,
        dealId: index === 0 ? 'deal_creator_ev_review' : null,
        title: listing.title,
        description: listing.description,
        kind: listing.kind?.toUpperCase(),
        category: listing.category,
        sku: listing.sku,
        marketplace: listing.marketplace,
        price: listing.retailPrice,
        currency: listing.currency,
        inventoryCount: listing.stock,
        status: uiListingStatusToDb(listing.status),
        metadata: {
          displayStatus: listing.status,
          compareAt: listing.compareAt,
          moq: listing.moq,
          wholesaleTiers: listing.wholesaleTiers,
          stock: listing.stock,
          inventory: listing.inventory,
          images: listing.images,
          translations: listing.translations,
          tags: listing.tags,
          compliance: listing.compliance,
          kpis: listing.kpis,
          trend: listing.trend,
          versions: listing.versions
        }
      })),
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

  await prisma.campaign.createMany({
    data: [
      {
        id: 'campaign_beauty_flash',
        sellerId: sellerProfiles.seller.id,
        creatorId: users.creator.id,
        createdByUserId: users.sellerUser.id,
        title: 'Autumn Beauty Flash',
        description: 'Beauty flash campaign used by creator asset library and ad builder flows.',
        status: 'ACTIVE',
        budget: 900,
        currency: 'USD',
        metadata: {
          supplierId: 'p-1',
          supplierName: 'GlowUp Hub',
          supplierKind: 'Seller',
          supplierHandle: '@glowuphub',
          supplierVerified: true,
          brand: 'GlowUp Hub',
          deliverables: [
            { id: 'd-1', label: '3x Shoppable Adz clips', dueDateLabel: 'Due: 18 Nov' },
            { id: 'd-2', label: '1x Live opener + overlays pack', dueDateLabel: 'Due: 20 Nov' }
          ]
        },
        startAt: daysAgo(2),
        endAt: daysFromNow(12)
      },
      {
        id: 'campaign_tech_friday',
        sellerId: sellerProfiles.seller.id,
        creatorId: users.creator.id,
        createdByUserId: users.sellerUser.id,
        title: 'Tech Friday Mega Live',
        description: 'Tech-focused campaign used by creator asset library and marketplace flows.',
        status: 'ACTIVE',
        budget: 1250,
        currency: 'USD',
        metadata: {
          supplierId: 'p-2',
          supplierName: 'GadgetMart Africa',
          supplierKind: 'Seller',
          supplierHandle: '@gadgetmart',
          supplierVerified: true,
          brand: 'GadgetMart',
          deliverables: [
            { id: 'd-3', label: '2x Tech offer overlays', dueDateLabel: 'Due: 28 Nov' }
          ]
        },
        startAt: daysAgo(1),
        endAt: daysFromNow(15)
      },
      {
        id: 'campaign_faith_morning',
        sellerId: sellerProfiles.provider.id,
        creatorId: users.creator.id,
        createdByUserId: users.providerUser.id,
        title: 'Faith & Wellness Morning Dealz',
        description: 'Provider-led service campaign used by creator asset library flows.',
        status: 'ACTIVE',
        budget: 780,
        currency: 'USD',
        metadata: {
          supplierId: 'p-3',
          supplierName: 'Grace Living Store',
          supplierKind: 'Provider',
          supplierHandle: '@graceliving',
          supplierVerified: false,
          brand: 'Grace Living',
          deliverables: [
            { id: 'd-4', label: '1x Service booking promo', dueDateLabel: 'Due: 03 Dec' }
          ]
        },
        startAt: daysAgo(4),
        endAt: daysFromNow(9)
      },
      {
        id: 'S-201',
        sellerId: sellerProfiles.seller.id,
        createdByUserId: users.sellerUser.id,
        title: 'Beauty Flash Week (Combo)',
        description: 'Seller campaign record for MyLiveDealz campaigns workspace.',
        status: 'ACTIVE',
        budget: 2400,
        currency: 'USD',
        metadata: {
          id: 'S-201',
          name: 'Beauty Flash Week (Combo)',
          stage: 'Execution',
          approvalStatus: 'Approved',
          creatorUsageDecision: 'I will use a Creator',
          collabMode: 'Open for Collabs',
          approvalMode: 'Manual',
          offerScope: 'Products',
          promoType: 'Discount',
          promoArrangement: 'PercentOff',
          currency: 'USD',
          estValue: 2400,
          region: 'East Africa',
          type: 'Live + Shoppables.',
          startDate: '2026-02-10',
          durationDays: 14,
          endDate: '2026-02-23',
          items: [
            {
              id: 'P-1003',
              kind: 'Product',
              title: 'Vitamin C Serum Bundle',
              category: 'Beauty',
              price: 18,
              region: 'East Africa',
              subtitle: 'Brightening + hydration',
              sku: 'BC-VC',
              avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22 viewBox=%220 0 72 72%22%3E%3Crect width=%2272%22 height=%2272%22 rx=%2216%22 fill=%22%23f77f00%22/%3E%3Ctext x=%2236%22 y=%2239%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22white%22%3EP-1003%3C/text%3E%3C/svg%3E',
              plannedQty: 40,
              discount: { mode: 'percent', value: 15 },
              discountedPrice: 15.3,
              discountLabel: '15% off'
            },
            {
              id: 'P-1004',
              kind: 'Product',
              title: 'Men’s Sneakers (2026)',
              category: 'Fashion',
              price: 34,
              region: 'Global',
              subtitle: 'Lightweight, breathable',
              sku: 'SN-26',
              avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22 viewBox=%220 0 72 72%22%3E%3Crect width=%2272%22 height=%2272%22 rx=%2216%22 fill=%22%23f77f00%22/%3E%3Ctext x=%2236%22 y=%2239%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22white%22%3EP-1004%3C/text%3E%3C/svg%3E',
              plannedQty: 25,
              discount: { mode: 'amount', value: 5 },
              discountedPrice: 29,
              discountLabel: 'USD 5 off'
            }
          ],
          creatorsCount: 2,
          pitchesCount: 7,
          invitesSent: 0,
          invitesAccepted: 0,
          proposalsCount: 2,
          contractCount: 1,
          pendingSupplierApproval: true,
          pendingAdminApproval: false,
          adminRejected: false,
          creatorRejected: false,
          renegotiation: false,
          health: 'on-track',
          nextAction: 'Approve Creator Clip #3',
          lastActivity: 'Assets submitted · 2h',
          lastActivityAt: Date.now() - 2 * 60 * 60 * 1000
        },
        startAt: new Date('2026-02-10T00:00:00.000Z'),
        endAt: new Date('2026-02-23T23:59:59.000Z')
      },
      {
        id: 'S-202',
        sellerId: sellerProfiles.seller.id,
        createdByUserId: users.sellerUser.id,
        title: 'Tech Friday Mega Live',
        description: 'Pending seller campaign record for MyLiveDealz campaigns workspace.',
        status: 'DRAFT',
        budget: 3100,
        currency: 'USD',
        metadata: {
          id: 'S-202',
          name: 'Tech Friday Mega Live',
          stage: 'Draft',
          approvalStatus: 'Pending',
          creatorUsageDecision: 'I will use a Creator',
          collabMode: 'Invite-only',
          approvalMode: 'Manual',
          offerScope: 'Products',
          promoType: 'Coupon',
          promoArrangement: 'InfluencerCode',
          promoCode: 'TECHFRIDAY',
          currency: 'USD',
          estValue: 3100,
          region: 'Africa / Asia',
          type: 'Live Sessionz',
          startDate: '2026-02-25',
          durationDays: 10,
          endDate: '2026-03-06',
          items: [
            {
              id: 'P-1002',
              kind: 'Product',
              title: 'Wireless Earbuds Pro',
              category: 'Electronics',
              price: 29,
              region: 'Africa / Asia',
              subtitle: 'Noise reduction, 24h battery',
              sku: 'EB-PRO',
              avatar: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2272%22 height=%2272%22 viewBox=%220 0 72 72%22%3E%3Crect width=%2272%22 height=%2272%22 rx=%2216%22 fill=%22%23f77f00%22/%3E%3Ctext x=%2236%22 y=%2239%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2212%22 fill=%22white%22%3EP-1002%3C/text%3E%3C/svg%3E',
              plannedQty: 60,
              discount: { mode: 'percent', value: 10 },
              discountedPrice: 26.1,
              discountLabel: '10% off'
            }
          ],
          creatorsCount: 0,
          pitchesCount: 0,
          invitesSent: 0,
          invitesAccepted: 0,
          proposalsCount: 0,
          contractCount: 0,
          pendingSupplierApproval: false,
          pendingAdminApproval: true,
          adminRejected: false,
          creatorRejected: false,
          renegotiation: false,
          health: 'at-risk',
          nextAction: 'Await Admin approval',
          lastActivity: 'Submitted for approval · 1d',
          lastActivityAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          queuedStageAfterApproval: 'Collabs',
          queuedNextActionAfterApproval: 'Invite creators'
        },
        startAt: new Date('2026-02-25T00:00:00.000Z'),
        endAt: new Date('2026-03-06T23:59:59.000Z')
      }
    ]
  });

  await prisma.liveCampaignGiveaway.createMany({
    data: [
      {
        id: 'seller_campaign_gw_1',
        campaignId: 'S-201',
        status: 'active',
        title: 'Featured serum bundle',
        data: {
          id: 'seller_campaign_gw_1',
          source: 'featured',
          linkedItemId: 'P-1003',
          quantity: 2,
          title: 'Featured serum bundle',
          imageUrl: ''
        }
      }
    ]
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

  await prisma.deliverableAsset.createMany({
    data: [
      {
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
          durationSeconds: 58,
          source: 'creator',
          previewKind: 'video',
          previewUrl: 'https://example.com/post-live-recap.mp4'
        }
      },
      {
        id: 'asset_library_a_1',
        campaignId: 'campaign_beauty_flash',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Autumn Beauty opener sequence',
        assetType: 'VIDEO',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Autumn Beauty Flash · GlowUp Hub',
          supplierId: 'p-1',
          brand: 'GlowUp Hub',
          source: 'supplier',
          tags: ['Beauty', 'Serum', 'Opener'],
          previewKind: 'video',
          previewUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=320&q=60',
          role: 'opener',
          usageNotes: 'Intro bumper for Beauty Flash lives. Include for all serum-focused shows.',
          restrictions: 'Use only for GlowUp serum campaigns in 2025.',
          desktopMode: 'fullscreen'
        }
      },
      {
        id: 'asset_library_a_2',
        campaignId: 'campaign_beauty_flash',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'GlowUp hero slide - Serum benefits',
        assetType: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=1920&h=1080&q=70',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Autumn Beauty Flash · GlowUp Hub',
          supplierId: 'p-1',
          brand: 'GlowUp Hub',
          source: 'supplier',
          tags: ['Beauty', 'Hero', 'Benefits'],
          previewKind: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=1920&h=1080&q=70',
          thumbnailUrl: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=320&q=60',
          role: 'hero',
          dimensions: { width: 1920, height: 1080 },
          usageNotes: 'Use as hero still when creator has no hero video.',
          restrictions: 'Do not crop brand mark. Keep safe margins for subtitles.'
        }
      },
      {
        id: 'asset_library_a_3',
        campaignId: 'campaign_beauty_flash',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Flash offer graphic - 20% off window',
        assetType: 'OVERLAY',
        url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Autumn Beauty Flash · GlowUp Hub',
          supplierId: 'p-1',
          brand: 'GlowUp Hub',
          source: 'supplier',
          tags: ['Offer', 'Timer', 'Flash'],
          previewKind: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
          thumbnailUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=320&q=60',
          role: 'offer',
          usageNotes: 'Overlay for mid-show offer callouts. Best with voiceover.',
          restrictions: 'Avoid stacking with other countdown overlays.'
        }
      },
      {
        id: 'asset_library_a_4',
        campaignId: 'campaign_tech_friday',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Deal ticker lower third',
        assetType: 'OVERLAY',
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Tech Friday Mega Live · GadgetMart Africa',
          supplierId: 'p-2',
          brand: 'GadgetMart',
          source: 'catalog',
          tags: ['Ticker', 'Dealz', 'Lower third'],
          previewKind: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
          thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=320&q=60',
          role: 'lower_third',
          usageNotes: 'Auto-populated from catalog promos. Works best with dark backgrounds.',
          restrictions: 'Do not modify product prices in this overlay.'
        }
      },
      {
        id: 'asset_library_a_5',
        campaignId: 'campaign_beauty_flash',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Creator base script - Flash format',
        assetType: 'SCRIPT',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Global template · Creator library',
          supplierId: 'p-1',
          brand: 'GlowUp Hub',
          source: 'creator',
          tags: ['Template', 'Script', 'Flash'],
          previewKind: 'image',
          role: 'script',
          usageNotes: 'Compliance-safe script skeleton including disclosure and CTA blocks.',
          restrictions: 'Customize product claims to match verified catalog facts only.'
        }
      },
      {
        id: 'asset_library_a_6',
        campaignId: 'campaign_tech_friday',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Universal price-drop overlay',
        assetType: 'OVERLAY',
        url: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
        status: 'IN_REVIEW',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Global template · Creator library',
          supplierId: 'p-2',
          brand: 'GadgetMart',
          source: 'creator',
          tags: ['Template', 'Overlay', 'Price drop'],
          previewKind: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70',
          thumbnailUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=320&q=60',
          role: 'overlay',
          usageNotes: 'Use for live price-drop moments. Keep overlay on screen < 6 seconds.',
          restrictions: 'Requires approval for each campaign.',
          reviewStage: 'pending_admin'
        }
      },
      {
        id: 'asset_library_a_7',
        campaignId: 'campaign_tech_friday',
        ownerUserId: users.creator.id,
        reviewerUserId: users.sellerUser.id,
        title: 'Tech Friday hero overlay',
        assetType: 'OVERLAY',
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
        status: 'APPROVED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Tech Friday Mega Live · GadgetMart Africa',
          supplierId: 'p-2',
          brand: 'GadgetMart',
          source: 'supplier',
          tags: ['Tech', 'Overlay'],
          previewKind: 'image',
          previewUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
          thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=320&q=60',
          role: 'hero',
          usageNotes: 'Overlay for opening of Tech Friday shows.',
          restrictions: 'Use only for Tech Friday campaigns.'
        }
      },
      {
        id: 'asset_library_a_8',
        campaignId: 'campaign_faith_morning',
        ownerUserId: users.creator.id,
        reviewerUserId: users.providerUser.id,
        title: 'Faith Morning warm opener',
        assetType: 'VIDEO',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        status: 'CHANGES_REQUESTED',
        metadata: {
          creatorScope: 'all',
          subtitle: 'Faith & Wellness Morning Dealz · Grace Living Store',
          supplierId: 'p-3',
          brand: 'Grace Living',
          source: 'creator',
          tags: ['Faith', 'Opener'],
          previewKind: 'video',
          previewUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
          thumbnailUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=320&q=60',
          role: 'opener',
          usageNotes: 'Warm opener for service sessionz.',
          restrictions: 'Remove background music unless licensed.'
        }
      }
    ]
  });
}

async function seedCommerce(users, sellerProfiles) {
  const hoursAgo = (hours) => new Date(Date.now() - hours * 3600_000);
  const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000);
  const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60_000);

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
      metadata: {
        customer: 'Amina K.',
        slaDueAt: minutesFromNow(70).toISOString()
      },
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
          },
          {
            id: 'order_item_1_b',
            sku: 'EV-ACC-001',
            name: 'Cable management kit',
            qty: 1,
            unitPrice: 0,
            currency: 'USD'
          }
        ]
      }
    }
  });

  await prisma.order.createMany({
    data: [
      {
        id: 'ORD-10511',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'WhatsApp',
        currency: 'USD',
        total: 320,
        itemCount: 1,
        status: 'CONFIRMED',
        warehouse: 'Kampala Hub',
        updatedAt: hoursAgo(1.6),
        metadata: {
          customer: 'Kato S.',
          slaDueAt: minutesFromNow(330).toISOString()
        }
      },
      {
        id: 'ORD-10510',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'API',
        currency: 'CNY',
        total: 12650,
        itemCount: 9,
        status: 'PACKED',
        warehouse: 'Main Warehouse',
        updatedAt: hoursAgo(3.2),
        metadata: {
          customer: 'Moses N.',
          slaDueAt: minutesFromNow(980).toISOString()
        }
      },
      {
        id: 'ORD-10509',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'EVzone',
        currency: 'USD',
        total: 560,
        itemCount: 2,
        status: 'SHIPPED',
        warehouse: 'Nairobi Hub',
        updatedAt: hoursAgo(12),
        metadata: {
          customer: 'Sarah T.',
          slaDueAt: minutesFromNow(1440).toISOString()
        }
      },
      {
        id: 'ORD-10508',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'WhatsApp',
        currency: 'USD',
        total: 980,
        itemCount: 3,
        status: 'ON_HOLD',
        warehouse: 'Kampala Hub',
        updatedAt: hoursAgo(4.5),
        metadata: {
          customer: 'Ibrahim H.',
          slaDueAt: minutesFromNow(30).toISOString()
        }
      },
      {
        id: 'ORD-10507',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'EVzone',
        currency: 'USD',
        total: 210,
        itemCount: 1,
        status: 'CANCELLED',
        warehouse: 'Main Warehouse',
        updatedAt: hoursAgo(30),
        metadata: {
          customer: 'Joy A.',
          slaDueAt: minutesFromNow(9999).toISOString()
        }
      },
      {
        id: 'ORD-10506',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'API',
        currency: 'CNY',
        total: 8620,
        itemCount: 12,
        status: 'DELIVERED',
        warehouse: 'Main Warehouse',
        updatedAt: hoursAgo(90),
        metadata: {
          customer: 'Chen L.',
          slaDueAt: minutesFromNow(9999).toISOString()
        }
      },
      {
        id: 'EX-24018',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 186000,
        itemCount: 6,
        status: 'NEW',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(9),
        metadata: {
          customer: 'Amina K.',
          phone: '+256 700 123 456',
          address: 'Nsambya Road, Kampala',
          zone: 'Kampala Central',
          hub: 'Kampala Hub',
          slot: '19:00 - 20:00',
          payment: 'EVzone Pay Wallet',
          promisedBy: minutesFromNow(55).toISOString(),
          rider: null,
          proof: { photo: null, signature: false, otp: '' },
          feedback: { rating: null, note: '', followUp: 'none' }
        }
      },
      {
        id: 'EX-24017',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 54000,
        itemCount: 2,
        status: 'CONFIRMED',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(24),
        metadata: {
          customer: 'Kato S.',
          phone: '+256 781 098 221',
          address: 'Bukoto, Kampala',
          zone: 'Nakawa',
          hub: 'Kampala Hub',
          slot: '18:00 - 19:00',
          payment: 'Cashless',
          promisedBy: minutesFromNow(95).toISOString(),
          rider: 'Rider 03 · Moses',
          proof: { photo: null, signature: false, otp: '' },
          feedback: { rating: null, note: '', followUp: 'none' }
        }
      },
      {
        id: 'EX-24016',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 122000,
        itemCount: 4,
        status: 'PICKING',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(48),
        metadata: {
          customer: 'Sarah T.',
          phone: '+256 704 555 111',
          address: 'Bugolobi, Kampala',
          zone: 'Nakawa',
          hub: 'Kampala Hub',
          slot: '18:00 - 19:00',
          payment: 'Card',
          promisedBy: minutesFromNow(140).toISOString(),
          rider: 'Rider 01 · Asha',
          proof: { photo: null, signature: false, otp: '' },
          feedback: { rating: null, note: '', followUp: 'none' }
        }
      },
      {
        id: 'EX-24015',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 76000,
        itemCount: 3,
        status: 'PACKED',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(72),
        metadata: {
          customer: 'Moses N.',
          phone: '+256 783 221 809',
          address: 'Kololo, Kampala',
          zone: 'Kampala Central',
          hub: 'Kampala Hub',
          slot: '17:00 - 18:00',
          payment: 'Wallet',
          promisedBy: minutesFromNow(35).toISOString(),
          rider: 'Rider 02 · Kato',
          proof: { photo: null, signature: false, otp: '' },
          feedback: { rating: null, note: '', followUp: 'none' }
        }
      },
      {
        id: 'EX-24014',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 91000,
        itemCount: 5,
        status: 'OUT_FOR_DELIVERY',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(110),
        metadata: {
          customer: 'Joy A.',
          phone: '+256 772 000 410',
          address: 'Muyenga, Kampala',
          zone: 'Makindye',
          hub: 'Kampala Hub',
          slot: '16:00 - 17:00',
          payment: 'Cash on delivery',
          promisedBy: minutesFromNow(22).toISOString(),
          rider: 'Rider 01 · Asha',
          proof: { photo: null, signature: false, otp: '' },
          feedback: { rating: null, note: '', followUp: 'none' }
        }
      },
      {
        id: 'EX-24013',
        sellerId: sellerProfiles.seller.id,
        buyerUserId: users.creator.id,
        channel: 'ExpressMart',
        currency: 'UGX',
        total: 148000,
        itemCount: 7,
        status: 'DELIVERED',
        warehouse: 'Kampala Hub',
        updatedAt: minutesAgo(320),
        metadata: {
          customer: 'Ibrahim H.',
          phone: '+256 755 301 120',
          address: 'Ntinda, Kampala',
          zone: 'Nakawa',
          hub: 'Kampala Hub',
          slot: '13:00 - 14:00',
          payment: 'Mobile Money',
          promisedBy: minutesFromNow(999).toISOString(),
          rider: 'Rider 05 · Ben',
          proof: { photo: 'POD_photo.jpg', signature: true, otp: '' },
          feedback: { rating: 5, note: 'Fast delivery', followUp: 'none' }
        }
      }
    ]
  });

  await prisma.sellerReturn.createMany({
    data: [
      {
        id: 'RMA-2201',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10511',
        status: 'REQUESTED',
        reason: 'Damaged item',
        requestedAt: minutesAgo(220),
        metadata: { pathway: 'Refund to Wallet', amount: 320, currency: 'USD', displayStatus: 'Requested' }
      },
      {
        id: 'RMA-2200',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10510',
        status: 'APPROVED',
        reason: 'Wrong variant',
        requestedAt: minutesAgo(780),
        approvedAt: minutesAgo(720),
        metadata: { pathway: 'Exchange', amount: 248, currency: 'CNY', displayStatus: 'Approved' }
      },
      {
        id: 'RMA-2199',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10509',
        status: 'RECEIVED',
        reason: 'Not as described',
        requestedAt: minutesAgo(1440),
        receivedAt: minutesAgo(1200),
        metadata: { pathway: 'Refund to Bank', amount: 560, currency: 'USD', displayStatus: 'In Transit' }
      }
    ]
  });

  await prisma.sellerDispute.createMany({
    data: [
      {
        id: 'DSP-901',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10512',
        status: 'OPEN',
        reason: 'Item not received',
        openedAt: minutesAgo(180),
        updatedAt: minutesAgo(25),
        metadata: { risk: 82, displayStatus: 'Open' }
      },
      {
        id: 'DSP-900',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10508',
        status: 'UNDER_REVIEW',
        reason: 'Payment dispute',
        openedAt: minutesAgo(620),
        updatedAt: minutesAgo(120),
        metadata: { risk: 64, displayStatus: 'Under review' }
      },
      {
        id: 'DSP-899',
        sellerId: sellerProfiles.seller.id,
        orderId: 'ORD-10509',
        status: 'RESOLVED',
        reason: 'Quality dispute',
        openedAt: minutesAgo(2200),
        resolvedAt: minutesAgo(900),
        updatedAt: minutesAgo(900),
        metadata: { risk: 18, displayStatus: 'Resolved' }
      }
    ]
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
      entityType: 'express_riders',
      entityId: 'main',
      payload: {
        riders: [
          { id: 'r1', name: 'Rider 01 · Asha', zone: 'Makindye', status: 'Online', capacity: 6 },
          { id: 'r2', name: 'Rider 02 · Kato', zone: 'Kampala Central', status: 'Online', capacity: 4 },
          { id: 'r3', name: 'Rider 03 · Moses', zone: 'Nakawa', status: 'Online', capacity: 5 },
          { id: 'r4', name: 'Rider 04 · Susan', zone: 'Nakawa', status: 'Busy', capacity: 0 },
          { id: 'r5', name: 'Rider 05 · Ben', zone: 'Kampala Central', status: 'Online', capacity: 3 }
        ]
      }
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
  const now = Date.now();
  const ago = (minutes) => new Date(now - minutes * 60_000).toISOString();
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
        key: 'seller_campaign_catalog',
        payload: {
          catalogItems: [
            {
              id: 'P-1001',
              kind: 'Product',
              title: 'LED Ring Light Kit',
              category: 'Electronics',
              price: 45,
              region: 'Global',
              subtitle: 'Tripod + phone holder + carry bag',
              sku: 'RL-01',
              avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=60'
            },
            {
              id: 'P-1002',
              kind: 'Product',
              title: 'Wireless Earbuds Pro',
              category: 'Electronics',
              price: 29,
              region: 'Africa / Asia',
              subtitle: 'Noise reduction, 24h battery',
              sku: 'EB-PRO',
              avatar: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70'
            },
            {
              id: 'P-1003',
              kind: 'Product',
              title: 'Vitamin C Serum Bundle',
              category: 'Beauty',
              price: 18,
              region: 'East Africa',
              subtitle: 'Brightening + hydration',
              sku: 'BC-VC',
              avatar: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=1920&h=1080&q=70'
            },
            {
              id: 'P-1004',
              kind: 'Product',
              title: 'Men’s Sneakers (2026)',
              category: 'Fashion',
              price: 34,
              region: 'Global',
              subtitle: 'Lightweight, breathable',
              sku: 'SN-26',
              avatar: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=60'
            },
            {
              id: 'S-2001',
              kind: 'Service',
              title: 'WhatsApp Catalog Setup',
              category: 'Services',
              price: 120,
              region: 'Africa',
              subtitle: 'Upload items + tags + pricing',
              sku: 'SV-WA',
              avatar: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=60'
            },
            {
              id: 'S-2002',
              kind: 'Service',
              title: 'Influencer Script Writing',
              category: 'Creative',
              price: 80,
              region: 'Global',
              subtitle: 'Hooks + CTA + objections',
              sku: 'SV-SCR',
              avatar: 'https://images.unsplash.com/photo-1518441902117-f0a80e5b0c17?auto=format&fit=crop&w=1200&q=60'
            },
            {
              id: 'S-2003',
              kind: 'Service',
              title: 'Product Photography',
              category: 'Creative',
              price: 150,
              region: 'East Africa',
              subtitle: '10 edits, studio lighting',
              sku: 'SV-PH',
              avatar: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=60'
            },
            {
              id: 'S-2004',
              kind: 'Service',
              title: 'Adz Media Buying',
              category: 'Marketing',
              price: 220,
              region: 'Global',
              subtitle: 'Setup + optimization',
              sku: 'SV-ADS',
              avatar: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=60'
            }
          ]
        }
      },
      {
        userId: users.sellerUser.id,
        key: 'security',
        payload: {
          twoFactor: true,
          twoFactorMethod: 'authenticator',
          twoFactorConfig: {
            enabled: true,
            verified: true,
            secret: 'JBSWY3DPEHPK3PXP'
          },
          passkeys: [
            {
              id: 'pk_seller_macbook',
              identifier: 'seller@evhub.com',
              label: 'Chrome / macOS',
              createdAt: '2026-03-01T09:12:00.000Z',
              lastUsedAt: '2026-03-09T19:44:00.000Z'
            }
          ],
          sessions: [
            {
              id: 'auth_user_seller_evhub',
              device: 'Chrome / macOS',
              ip: '41.210.9.12',
              lastActiveAt: '2026-03-10T08:15:00.000Z',
              metadata: {
                trusted: true,
                current: true,
                location: 'Kampala, UG'
              }
            },
            {
              id: 'auth_ios_seller_evhub',
              device: 'Safari / iOS',
              ip: '41.210.9.87',
              lastActiveAt: '2026-03-09T20:05:00.000Z',
              metadata: {
                trusted: true,
                current: false,
                location: 'Kampala, UG'
              }
            }
          ],
          trustedDevices: [
            {
              id: 'auth_user_seller_evhub',
              name: 'Office MacBook',
              type: 'desktop',
              trusted: true,
              trustedAt: '2026-02-20T08:30:00.000Z',
              lastSeen: '2026-03-10T08:15:00.000Z',
              note: 'Primary admin device'
            },
            {
              id: 'auth_ios_seller_evhub',
              name: 'iPhone 15',
              type: 'mobile',
              trusted: true,
              trustedAt: '2026-02-11T07:30:00.000Z',
              lastSeen: '2026-03-09T20:05:00.000Z',
              note: '2FA fallback device'
            }
          ],
          alerts: [
            {
              id: 'seller_sec_alert_1',
              title: 'New device sign-in',
              reason: 'A mobile Safari session was approved with 2FA.',
              risk: 48,
              createdAt: '2026-03-09T20:05:00.000Z',
              location: 'Kampala, UG',
              ip: '41.210.9.87',
              status: 'Resolved',
              tags: ['2FA', 'trusted device']
            }
          ],
          metadata: {
            policies: {
              requireTrustedForFinance: true,
              stepUpOnNewDevice: true,
              autoTrustAfter2FA: false,
              maxTrustedDevices: 5,
              allowHighRiskCountries: false
            },
            settingsSessions: [
              { id: 'SES-01', device: 'desktop', label: 'Chrome on Windows', location: 'Wuxi, CN', ip: '10.11.2.33', lastSeen: ago(4), current: true, risk: 'ok' },
              { id: 'SES-02', device: 'mobile', label: 'Safari on iPhone', location: 'Kampala, UG', ip: '41.210.9.12', lastSeen: ago(180), current: false, risk: 'watch' },
              { id: 'SES-03', device: 'desktop', label: 'Edge on Windows', location: 'Nairobi, KE', ip: '197.248.7.21', lastSeen: ago(1400), current: false, risk: 'ok' }
            ],
            settingsDevices: [
              { id: 'DEV-1001', name: 'Office Desktop', type: 'desktop', trusted: true, trustedAt: ago(18 * 24 * 60), lastSeen: ago(0.2 * 24 * 60), note: 'Finance approvals' },
              { id: 'DEV-1002', name: 'iPhone 13', type: 'mobile', trusted: true, trustedAt: ago(40 * 24 * 60), lastSeen: ago(1.2 * 24 * 60), note: '2FA device' },
              { id: 'DEV-1003', name: 'Unknown Windows', type: 'desktop', trusted: false, trustedAt: null, lastSeen: ago(0.1 * 24 * 60), note: 'Flagged' }
            ],
            settingsAlerts: [
              { id: 'AL-901', title: 'New device sign-in', reason: 'New device fingerprint', risk: 78, createdAt: ago(18), location: 'Nairobi, KE', ip: '197.248.7.21', status: 'Needs review', tags: ['new device', 'new IP'] },
              { id: 'AL-900', title: 'Unusual location', reason: 'Sign-in from an uncommon country', risk: 64, createdAt: ago(110), location: 'Dubai, AE', ip: '185.33.21.9', status: 'Needs review', tags: ['unusual location'] },
              { id: 'AL-899', title: 'Impossible travel', reason: 'Rapid location change', risk: 92, createdAt: ago(540), location: 'Nairobi, KE', ip: '197.248.7.21', status: 'Resolved', tags: ['impossible travel'] }
            ],
            sessionRoster: [
              { id: 'SES-90021', deviceType: 'desktop', deviceName: 'MacBook Pro', os: 'macOS', browser: 'Chrome', ip: '41.210.9.12', location: 'Kampala, UG', firstSeenAt: ago(1200), lastSeenAt: ago(2), current: true, trusted: true, risk: 'ok', signals: ['2FA pending'] },
              { id: 'SES-90020', deviceType: 'mobile', deviceName: 'iPhone 15', os: 'iOS', browser: 'Safari', ip: '10.11.2.33', location: 'Wuxi, CN', firstSeenAt: ago(210), lastSeenAt: ago(12), current: false, trusted: false, risk: 'risk', anomaly: { type: 'New country', reason: 'Sign-in from a new country not seen before.', severity: 'High' }, signals: ['New country', 'New device'] },
              { id: 'SES-90019', deviceType: 'desktop', deviceName: 'Windows PC', os: 'Windows', browser: 'Edge', ip: '197.239.12.9', location: 'Nairobi, KE', firstSeenAt: ago(8400), lastSeenAt: ago(900), current: false, trusted: true, risk: 'ok', signals: ['Trusted'] },
              { id: 'SES-90018', deviceType: 'mobile', deviceName: 'Android', os: 'Android', browser: 'Chrome', ip: '102.88.44.21', location: 'Lagos, NG', firstSeenAt: ago(90), lastSeenAt: ago(18), current: false, trusted: false, risk: 'watch', anomaly: { type: 'Impossible travel', reason: 'Sign-in location changed too quickly based on recent activity.', severity: 'Medium' }, signals: ['Impossible travel'] }
            ],
            geoAlerts: {
              enabled: true,
              newCountry: true,
              impossibleTravel: true,
              sensitivity: 70
            }
          }
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
          ],
          metadata: {
            kycState: 'Verified',
            payoutSchedule: 'Weekly',
            minThreshold: 50
          }
        }
      },
      {
        userId: users.sellerUser.id,
        key: 'express_riders',
        payload: {
          riders: [
            { id: 'r1', name: 'Rider 01 · Asha', zone: 'Makindye', status: 'Online', capacity: 6 },
            { id: 'r2', name: 'Rider 02 · Kato', zone: 'Kampala Central', status: 'Online', capacity: 4 },
            { id: 'r3', name: 'Rider 03 · Moses', zone: 'Nakawa', status: 'Online', capacity: 5 },
            { id: 'r4', name: 'Rider 04 · Susan', zone: 'Nakawa', status: 'Busy', capacity: 0 },
            { id: 'r5', name: 'Rider 05 · Ben', zone: 'Kampala Central', status: 'Online', capacity: 3 }
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

  await prisma.userSubscription.create({
    data: {
      userId: users.sellerUser.id,
      plan: 'pro',
      cycle: 'monthly',
      status: 'active',
      metadata: {
        renewsAt: daysFromNow(21).toISOString(),
        billingName: 'Supplier Admin',
        billingEmail: 'billing@supplier.com',
        billingMethod: {
          type: 'card',
          label: 'Visa ending in 4242',
          brand: 'Visa',
          last4: '4242',
          holderName: 'Supplier Admin',
          expMonth: 12,
          expYear: 2029
        },
        support: {
          contactEmail: 'support@mylivedealz.com',
          salesEmail: 'sales@mylivedealz.com',
          helpCenterUrl: 'https://mylivedealz.com/help',
          managerName: 'Growth Ops'
        },
        notes: ['Unlimited supplier Dealz enabled', 'Priority seller support'],
        limits: {
          livesPerMonth: 'unlimited',
          collaborators: 10
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
      },
      {
        id: 'seller_hero_image_1',
        userId: users.sellerUser.id,
        name: 'Hero (Supplier Approved) — 1920x1080',
        kind: 'image',
        url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop',
        metadata: {
          roleHint: 'hero_image',
          status: 'approved',
          owner: 'Supplier',
          width: 1920,
          height: 1080
        }
      },
      {
        id: 'seller_hero_video_1',
        userId: users.sellerUser.id,
        name: 'Intro Opener (Supplier)',
        kind: 'video',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        metadata: {
          roleHint: 'hero_video',
          status: 'approved',
          owner: 'Supplier',
          posterUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop',
          desktopMode: 'fullscreen'
        }
      },
      {
        id: 'seller_item_poster_1',
        userId: users.sellerUser.id,
        name: 'Item Poster — 500x500',
        kind: 'image',
        url: 'https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop',
        metadata: {
          roleHint: 'item_poster',
          status: 'approved',
          owner: 'Supplier',
          width: 500,
          height: 500
        }
      },
      {
        id: 'seller_item_video_1',
        userId: users.sellerUser.id,
        name: 'Product Demo Clip (Supplier)',
        kind: 'video',
        url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        metadata: {
          roleHint: 'item_video',
          status: 'approved',
          owner: 'Supplier',
          posterUrl: 'https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop',
          desktopMode: 'modal'
        }
      }
    ]
  });

  await prisma.shippingProfile.create({
    data: {
      id: 'SHIP-STD-AFR',
      sellerId: sellerProfiles.seller.id,
      name: 'Standard Parcel Africa',
      status: 'ACTIVE',
      carrier: 'EV Hub Logistics',
      serviceLevel: 'Parcel',
      handlingTimeDays: 1,
      regions: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda'],
      isDefault: true,
      metadata: {
        currency: 'USD',
        serviceType: 'Parcel',
        zones: [
          {
            id: 'Z-UG',
            name: 'Uganda',
            countries: ['Uganda'],
            pricing: { mode: 'weight', base: 3.5, perKg: 0.6, perItem: 0 },
            lead: { minDays: 1, maxDays: 3 },
            notes: 'Local delivery'
          },
          {
            id: 'Z-EA',
            name: 'East Africa',
            countries: ['Kenya', 'Tanzania', 'Rwanda'],
            pricing: { mode: 'weight', base: 6.0, perKg: 0.9, perItem: 0 },
            lead: { minDays: 2, maxDays: 5 },
            notes: 'Regional'
          }
        ],
        policy: {
          mode: 'auto',
          fallbackWarehouseId: 'wh_kla_main',
          rules: [
            {
              id: 'R-1',
              priority: 10,
              title: 'Kenya uses Nairobi',
              when: { zoneId: 'Z-EA', country: 'Kenya', maxWeightKg: 35 },
              then: { warehouseId: 'wh_nbo_hub' }
            },
            {
              id: 'R-2',
              priority: 30,
              title: 'Uganda uses Kampala',
              when: { zoneId: 'Z-UG' },
              then: { warehouseId: 'wh_kla_main' }
            }
          ]
        }
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
        dealType: 'Shoppable Adz',
        tagline: 'Serum + skincare conversion push',
        notes: 'Backend-backed creator ad campaign for marketplace and builder flows.',
        campaignName: 'Autumn Beauty Flash',
        campaignSubtitle: 'Serum + skincare conversion push',
        supplier: {
          id: 'p-1',
          name: 'GlowUp Hub',
          category: 'Beauty',
          logoUrl: 'https://example.com/glowup-logo.png',
          avatarUrl: 'https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=512&auto=format&fit=crop'
        },
        creator: { name: 'Ronald M', handle: '@ronaldm', avatarUrl: 'https://example.com/creator-avatar.png', verified: true },
        status: 'Live',
        platforms: ['Instagram', 'TikTok', 'MyLiveDealz'],
        startISO: daysAgo(1).toISOString(),
        endISO: daysFromNow(7).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop',
        heroIntroVideoUrl: 'https://example.com/beauty-flash.mp4',
        ctaPrimaryLabel: 'Buy now',
        ctaSecondaryLabel: 'Add to cart',
        shortDomain: 'mldz.link',
        shortSlug: 'autumn-beauty-flash',
        utmPresets: [
          {
            id: 'utm1',
            name: 'Host IG Story',
            description: 'Strong host attribution for IG story swipes.',
            params: { utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'host', utm_content: 'ronald' }
          },
          {
            id: 'utm2',
            name: 'TikTok Bio Link',
            description: 'Bio link tracking for TikTok host traffic.',
            params: { utm_source: 'tiktok', utm_medium: 'bio', utm_campaign: 'host', utm_content: 'ronald' }
          },
          {
            id: 'utm3',
            name: 'Marketplace Featured',
            description: 'Marketplace featured slot traffic.',
            params: { utm_source: 'marketplace', utm_medium: 'featured', utm_campaign: 'dealz', utm_content: 'hero' }
          }
        ],
        compensation: { type: 'Hybrid', commissionRate: 0.08, flatFee: 200, currency: 'USD' },
        offers: [
          {
            id: 'O-101',
            type: 'PRODUCT',
            name: 'Vitamin C Serum',
            currency: 'USD',
            price: 22,
            basePrice: 29,
            stockLeft: 48,
            sold: 96,
            posterUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=900&auto=format&fit=crop',
            catalogPosterUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=900&auto=format&fit=crop',
            catalogVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            sellingModes: ['RETAIL'],
            defaultSellingMode: 'RETAIL'
          },
          {
            id: 'O-101B',
            type: 'PRODUCT',
            name: 'Hydra Cleanser',
            currency: 'USD',
            price: 18,
            basePrice: 24,
            stockLeft: 15,
            sold: 44,
            posterUrl: 'https://images.unsplash.com/photo-1612817152414-857f7b8872d9?q=80&w=800&auto=format&fit=crop',
            catalogPosterUrl: 'https://images.unsplash.com/photo-1612817152414-857f7b8872d9?q=80&w=800&auto=format&fit=crop',
            catalogVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
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
        dealType: 'Live + Shoppables',
        tagline: 'Gadget bundle preview',
        notes: 'Hybrid marketplace campaign with scheduled live session.',
        campaignName: 'Tech Friday Mega Live',
        campaignSubtitle: 'Gadget bundle preview',
        supplier: {
          id: 'p-2',
          name: 'GadgetMart Africa',
          category: 'Tech',
          logoUrl: 'https://example.com/gadgetmart-logo.png',
          avatarUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=512&auto=format&fit=crop'
        },
        creator: { name: 'Ronald M', handle: '@ronaldm', avatarUrl: 'https://example.com/creator-avatar.png', verified: true },
        status: 'Scheduled',
        platforms: ['YouTube', 'MyLiveDealz'],
        startISO: daysFromNow(2).toISOString(),
        endISO: daysFromNow(9).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
        ctaPrimaryLabel: 'Reserve deal',
        ctaSecondaryLabel: 'Watch live',
        compensation: { type: 'Commission', commissionRate: 0.12 },
        offers: [
          {
            id: 'O-102',
            type: 'PRODUCT',
            name: 'Wireless Earbuds',
            currency: 'USD',
            price: 55,
            basePrice: 70,
            stockLeft: 120,
            sold: 22,
            posterUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop',
            catalogPosterUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop',
            catalogVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
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
        live: {
          id: 'live_tech_friday',
          status: 'Scheduled',
          title: 'Tech Friday Mega Live',
          description: 'First look at the latest gadgets and accessory bundles.',
          timezoneLabel: 'GMT+3',
          promoLink: 'https://mylivedealz.com/live/tech-friday?creator=ronald',
          heroImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
          featured: [
            {
              id: 'live_item_102',
              kind: 'product',
              name: 'Wireless Earbuds',
              priceLabel: '$55',
              stockLeft: 120,
              posterUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=900&auto=format&fit=crop'
            }
          ]
        },
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
    },
    {
      id: 'adz_creator_faith_service',
      status: 'Draft',
      title: 'Faith & Wellness Service Promo',
      budget: 640,
      currency: 'USD',
      isMarketplace: true,
      data: {
        id: 'AD-103',
        dealType: 'Live Sessionz',
        tagline: 'Morning booking promo for guided wellness sessions',
        notes: 'Service-led live invite used by creator marketplace flows.',
        campaignName: 'Faith & Wellness Morning Dealz',
        campaignSubtitle: 'Guided service booking promo',
        supplier: {
          id: 'p-3',
          name: 'Grace Living Store',
          category: 'Wellness',
          logoUrl: 'https://example.com/grace-living-logo.png',
          avatarUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=512&auto=format&fit=crop'
        },
        creator: { name: 'Ronald M', handle: '@ronaldm', avatarUrl: 'https://example.com/creator-avatar.png', verified: true },
        status: 'Draft',
        platforms: ['Instagram', 'MyLiveDealz'],
        startISO: daysFromNow(4).toISOString(),
        endISO: daysFromNow(6).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?auto=format&fit=crop&w=1200&q=70',
        live: {
          id: 'live_faith_service',
          status: 'Scheduled',
          title: 'Faith & Wellness Morning Dealz',
          description: 'Morning service session with booking CTA for wellness consultations.',
          timezoneLabel: 'GMT+3',
          promoLink: 'https://mylivedealz.com/live/faith-morning?creator=ronald',
          heroImageUrl: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?auto=format&fit=crop&w=1200&q=70',
          featured: [
            {
              id: 'live_item_103',
              kind: 'service',
              name: 'Wellness Consultation',
              priceLabel: '$45',
              stockLeft: -1,
              posterUrl: 'https://images.unsplash.com/photo-1515378791036-0648a814c963?auto=format&fit=crop&w=900&q=70'
            }
          ]
        },
        generated: false,
        hasBrokenLink: false,
        lowStock: false,
        impressions7d: 1320,
        clicks7d: 118,
        orders7d: 7,
        revenue7d: 190,
        currency: 'USD',
        kpis: [{ label: 'Booked consults', value: '7' }]
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

  const sellerAdzCampaigns = [
    {
      id: 'ADZ-2201',
      status: 'Generated',
      title: 'Valentine Glow Week',
      budget: 1200,
      currency: 'UGX',
      isMarketplace: true,
      data: {
        id: 'ADZ-2201',
        name: 'Valentine Glow Week',
        campaignName: 'Valentine Glow Week',
        campaignSubtitle: 'GlowUp Hub · Limited-time drops',
        supplier: {
          name: 'GlowUp Hub',
          category: 'Beauty',
          logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=256&auto=format&fit=crop'
        },
        creator: {
          name: 'Amina K.',
          handle: '@amina.dealz',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop',
          verified: true
        },
        hostRole: 'Creator',
        creatorUsage: 'I will use a Creator',
        collabMode: 'Open for Collabs',
        approvalMode: 'Manual',
        status: 'Generated',
        platforms: ['Instagram', 'TikTok'],
        startISO: daysFromNow(1).toISOString(),
        endISO: daysFromNow(2).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop',
        heroIntroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        heroIntroVideoPosterUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop',
        ctaPrimaryLabel: 'Buy now',
        ctaSecondaryLabel: 'Add to cart',
        generated: true,
        hasBrokenLink: false,
        lowStock: false,
        lock: { locked: false, label: '', reason: '' },
        impressions: 410000,
        clicks: 14800,
        orders: 920,
        earnings: 34500000,
        earningsCurrency: 'UGX',
        currency: 'UGX',
        offers: [
          {
            id: 'O-100',
            type: 'PRODUCT',
            name: 'Glow Serum (30ml)',
            currency: 'UGX',
            price: 38000,
            basePrice: 52000,
            stockLeft: 12,
            sold: 86,
            posterUrl: 'https://images.unsplash.com/photo-1611930022073-84fb62f4ea9d?q=80&w=900&auto=format&fit=crop',
            videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            desktopMode: 'modal',
            sellingModes: ['RETAIL', 'WHOLESALE'],
            defaultSellingMode: 'RETAIL',
            wholesale: {
              moq: 10,
              step: 5,
              leadTimeLabel: 'Ships in 3–5 days',
              tiers: [
                { minQty: 10, unitPrice: 32000 },
                { minQty: 25, unitPrice: 29500 },
                { minQty: 50, unitPrice: 27000 }
              ]
            }
          }
        ]
      }
    },
    {
      id: 'ADZ-2202',
      status: 'Live',
      title: 'Back-to-Work Essentials',
      budget: 1500,
      currency: 'UGX',
      isMarketplace: true,
      data: {
        id: 'ADZ-2202',
        name: 'Back-to-Work Essentials',
        campaignName: 'Back-to-Work Essentials',
        campaignSubtitle: 'Urban Supply · Bags & Accessories',
        supplier: {
          name: 'Urban Supply',
          category: 'Accessories',
          logoUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=256&auto=format&fit=crop'
        },
        creator: {
          name: 'Chris M.',
          handle: '@chris.finds',
          avatarUrl: 'https://images.unsplash.com/photo-1520975958225-9277a0c1998f?q=80&w=256&auto=format&fit=crop',
          verified: false
        },
        hostRole: 'Creator',
        creatorUsage: 'I will use a Creator',
        collabMode: 'Invite-Only',
        approvalMode: 'Manual',
        status: 'Live',
        platforms: ['Instagram'],
        startISO: daysAgo(1).toISOString(),
        endISO: daysFromNow(1).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop',
        heroIntroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        heroIntroVideoPosterUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=1600&auto=format&fit=crop',
        ctaPrimaryLabel: 'Buy now',
        ctaSecondaryLabel: 'Add to cart',
        generated: true,
        hasBrokenLink: false,
        lowStock: true,
        lock: { locked: false, label: '', reason: '' },
        impressions: 92000,
        clicks: 3200,
        orders: 188,
        earnings: 9200000,
        earningsCurrency: 'UGX',
        currency: 'UGX',
        offers: [
          {
            id: 'O-110',
            type: 'PRODUCT',
            name: 'Laptop Backpack',
            currency: 'UGX',
            price: 180000,
            basePrice: 220000,
            stockLeft: 18,
            sold: 51,
            posterUrl: 'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?q=80&w=900&auto=format&fit=crop',
            videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            desktopMode: 'modal',
            sellingModes: ['RETAIL', 'WHOLESALE'],
            defaultSellingMode: 'RETAIL',
            wholesale: {
              moq: 5,
              step: 1,
              leadTimeLabel: 'Ships in 2–4 days',
              tiers: [
                { minQty: 5, unitPrice: 155000 },
                { minQty: 10, unitPrice: 149000 }
              ]
            }
          }
        ]
      }
    },
    {
      id: 'ADZ-2203',
      status: 'Draft',
      title: 'Home Essentials Drop',
      budget: 980,
      currency: 'UGX',
      isMarketplace: true,
      data: {
        id: 'ADZ-2203',
        name: 'Home Essentials Drop',
        campaignName: 'Home Essentials Drop',
        campaignSubtitle: 'HomePro · Kitchen upgrade bundles',
        supplier: {
          name: 'HomePro',
          category: 'Home',
          logoUrl: 'https://images.unsplash.com/photo-1486611367184-17759508999c?q=80&w=256&auto=format&fit=crop'
        },
        creator: {
          name: '(Supplier-hosted)',
          handle: '@homepro',
          avatarUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=256&auto=format&fit=crop',
          verified: true
        },
        hostRole: 'Supplier',
        creatorUsage: 'I will NOT use a Creator',
        collabMode: '(n/a)',
        approvalMode: 'Manual',
        status: 'Draft',
        platforms: ['TikTok'],
        startISO: daysFromNow(3).toISOString(),
        endISO: daysFromNow(4).toISOString(),
        timezone: 'Africa/Kampala',
        heroImageUrl: 'https://images.unsplash.com/photo-1486611367184-17759508999c?q=80&w=1600&auto=format&fit=crop',
        heroIntroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        heroIntroVideoPosterUrl: 'https://images.unsplash.com/photo-1486611367184-17759508999c?q=80&w=1600&auto=format&fit=crop',
        ctaPrimaryLabel: 'Buy now',
        ctaSecondaryLabel: 'Add to cart',
        generated: false,
        hasBrokenLink: false,
        lowStock: false,
        lock: { locked: false, label: '', reason: '' },
        impressions: 12400,
        clicks: 420,
        orders: 18,
        earnings: 860000,
        earningsCurrency: 'UGX',
        currency: 'UGX',
        offers: [
          {
            id: 'O-120',
            type: 'PRODUCT',
            name: '6-Speed Blender',
            currency: 'UGX',
            price: 240000,
            basePrice: 290000,
            stockLeft: 18,
            sold: 21,
            posterUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=900&auto=format&fit=crop',
            videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            desktopMode: 'modal',
            sellingModes: ['RETAIL', 'WHOLESALE'],
            defaultSellingMode: 'WHOLESALE',
            wholesale: {
              moq: 3,
              step: 1,
              leadTimeLabel: 'Ships in 3–6 days',
              tiers: [
                { minQty: 3, unitPrice: 210000 },
                { minQty: 6, unitPrice: 199000 }
              ]
            }
          }
        ]
      }
    }
  ];

  for (const campaign of sellerAdzCampaigns) {
    await prisma.adzCampaign.create({
      data: {
        id: campaign.id,
        userId: users.sellerUser.id,
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
        clicks: Number(campaign.data.clicks ?? 0),
        purchases: Number(campaign.data.orders ?? 0),
        earnings: Number(campaign.data.earnings ?? 0),
        data: {
          impressions: campaign.data.impressions ?? 0
        }
      }
    });
  }

  await prisma.adzBuilder.create({
    data: {
      id: 'adz_builder_default',
      userId: users.creator.id,
      status: 'draft',
      data: {
        creator: {
          name: 'Ronald M',
          handle: '@ronaldm',
          avatarUrl: 'https://example.com/creator-avatar.png',
          badge: 'Host'
        },
        step: 'offer',
        isGenerated: false,
        cart: {},
        externalAssets: {},
        builder: {
          supplierId: 'p-1',
          campaignId: 'adz_creator_autumn_beauty',
          selectedOfferIds: ['O-101'],
          primaryOfferId: 'O-101',
          platforms: ['Instagram'],
          platformOtherList: [],
          platformOtherDraft: '',
          heroImageAssetId: 'asset_library_a_2',
          heroIntroVideoAssetId: 'asset_library_a_1',
          itemPosterByOfferId: {},
          itemVideoByOfferId: {},
          ctaText: 'Shop the featured dealz before they end.',
          primaryCtaLabel: 'Buy now',
          secondaryCtaLabel: 'Add to cart',
          landingBehavior: 'Checkout',
          landingUrl: '',
          shortDomain: 'mldz.link',
          shortSlug: 'autumn-beauty-flash',
          utmPresetId: 'utm1',
          utmCustom: {},
          startDate: daysFromNow(1).toISOString().slice(0, 10),
          startTime: '18:00',
          endDate: daysFromNow(1).toISOString().slice(0, 10),
          endTime: '19:00'
        }
      }
    }
  });

  await prisma.adzBuilder.create({
    data: {
      id: 'seller_adz_builder_default',
      userId: users.sellerUser.id,
      status: 'draft',
      data: {
        step: 'offer',
        approvalState: 'Draft',
        saved: false,
        cart: {},
        externalAssets: {},
        builder: {
          supplierId: 'seller_glowup_hub',
          campaignId: 'ADZ-2201',
          selectedOfferIds: ['O-100'],
          primaryOfferId: 'O-100',
          platforms: ['Instagram'],
          platformOtherList: [],
          platformOtherDraft: '',
          heroImageAssetId: 'seller_hero_image_1',
          heroIntroVideoAssetId: 'seller_hero_video_1',
          itemPosterByOfferId: {
            'O-100': 'seller_item_poster_1'
          },
          itemVideoByOfferId: {
            'O-100': 'seller_item_video_1'
          },
          ctaText: 'Shop the featured dealz before they end.',
          primaryCtaLabel: 'Buy now',
          secondaryCtaLabel: 'Add to cart',
          landingBehavior: 'Checkout',
          landingUrl: '',
          shortDomain: 'mldz.link',
          shortSlug: 'valentine-glow-week',
          utmPresetId: 'utm1',
          utmCustom: {},
          startDate: daysFromNow(1).toISOString().slice(0, 10),
          startTime: '18:00',
          endDate: daysFromNow(1).toISOString().slice(0, 10),
          endTime: '19:00'
        }
      }
    }
  });

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

  await prisma.liveBuilder.create({
    data: {
      id: 'seller_campaign_builder_default',
      userId: users.sellerUser.id,
      sessionId: 'seller_campaign_builder_default',
      status: 'draft',
      data: {
        id: 'seller_campaign_builder_default',
        builderStep: 1,
        builder: {
          name: '',
          type: 'Shoppable Adz',
          region: 'East Africa',
          currency: 'USD',
          estValue: 1000,
          internalReference: '',
          commerceMode: 'Retail',
          bundleMode: 'Single item',
          startDate: new Date().toISOString().slice(0, 10),
          durationDays: 7,
          startTime: '09:00',
          endTime: '21:00',
          timezone: 'Africa/Kampala',
          flashWindows: '',
          marketRegions: ['East Africa'],
          shippingConstraints: [],
          contentLanguages: ['English'],
          promoType: 'Discount',
          promoArrangement: 'PercentOff',
          promoCode: '',
          shippingThreshold: 0,
          giftNote: '',
          offerScope: 'Products',
          defaultDiscountMode: 'percent',
          defaultDiscountValue: 10,
          items: [],
          hasGiveaways: false,
          giveaways: [],
          regulatedDocsConfirmed: false,
          regulatedDisclaimersAccepted: false,
          regulatedDeskNotes: '',
          creatorUsageDecision: 'I will use a Creator',
          collabMode: 'Open for Collabs',
          approvalMode: 'Manual',
          allowMultiCreators: true,
          notes: '',
          internalOwner: 'Supplier Manager'
        },
        giveawayUi: {
          giveawayAddMode: 'featured',
          featuredGiveawayItemId: '',
          featuredGiveawayQuantity: '1',
          customGiveawayDraft: {
            title: '',
            quantity: '1',
            imageUrl: '',
            posterAssetId: '',
            assetName: ''
          }
        }
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

  const sellerDefaultStudioSessionId = `default-${users.sellerUser.id}`;

  await prisma.liveSession.create({
    data: {
      id: sellerDefaultStudioSessionId,
      userId: users.sellerUser.id,
      status: 'scheduled',
      title: 'EV Hub Flash Dealz Live',
      scheduledAt: daysFromNow(1),
      data: {
        id: sellerDefaultStudioSessionId,
        title: 'EV Hub Flash Dealz Live',
        campaign: 'EV Charger Flash Dealz',
        seller: 'EV Hub Commerce',
        supplierId: sellerProfiles.seller.id,
        campaignId: 'seller_live_evhub_flash',
        scheduledFor: daysFromNow(1).toISOString(),
        scheduledAt: daysFromNow(1).toISOString(),
        weekday: 'Thu',
        dateLabel: 'Thu 12 Mar',
        time: '18:00-19:00',
        location: 'Remote studio',
        simulcast: ['TikTok Live', 'MyLiveDealz'],
        platforms: ['TikTok Live', 'MyLiveDealz'],
        status: 'scheduled',
        role: 'Host',
        durationMin: 60,
        scriptsReady: true,
        assetsReady: true,
        productsCount: 3,
        workloadScore: 2,
        conflict: false,
        desktopMode: 'fullscreen',
        heroImageUrl: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?q=80&w=1200&auto=format&fit=crop',
        heroVideoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      }
    }
  });

  await prisma.liveStudio.create({
    data: {
      id: sellerDefaultStudioSessionId,
      userId: users.sellerUser.id,
      sessionId: sellerDefaultStudioSessionId,
      status: 'idle',
      data: {
        id: sellerDefaultStudioSessionId,
        title: 'EV Hub Flash Dealz Live',
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
        moments: [],
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
      }
    ]
  });

  await prisma.workflowRecord.createMany({
    data: [
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

async function seedSellerRuntimeMockReplacements(users, sellerProfiles) {
  const sellerUserId = users.sellerUser.id;
  const sellerId = sellerProfiles.seller.id;
  const now = Date.now();
  const ago = (mins) => new Date(now - mins * 60_000).toISOString();
  const soon = (mins) => new Date(now + mins * 60_000).toISOString();

  await prisma.wholesaleRfq.createMany({
    data: [
      {
        id: 'RFQ-4101',
        userId: sellerUserId,
        status: 'open',
        title: 'Office EV chargers + installation',
        buyerName: 'Kampala City Fleet',
        buyerType: 'Organization',
        urgency: 'Urgent',
        origin: 'Retail',
        destination: 'Kampala, UG',
        paymentRail: 'CorporatePay',
        approvalRequired: true,
        dueAt: new Date(soon(480)),
        data: {
          id: 'RFQ-4101',
          title: 'Office EV chargers + installation',
          status: 'Open',
          urgency: 'Urgent',
          createdAt: ago(126),
          dueAt: soon(480),
          buyerType: 'Organization',
          origin: 'Retail',
          paymentRail: 'CorporatePay',
          approvalRequired: true,
          attachments: 2,
          destination: 'Kampala, UG',
          category: 'EV chargers',
          notes: 'Include OCPP and commissioning.',
          score: 73,
          buyerName: 'Kampala City Fleet',
          competitorPressure: 'High',
          paymentRisk: 'Low',
          marginPotential: 24
        }
      },
      {
        id: 'RFQ-4100',
        userId: sellerUserId,
        status: 'open',
        title: 'Bulk e-bike batteries 48V 20Ah',
        buyerName: 'Nairobi Importers Ltd',
        buyerType: 'Organization',
        urgency: 'Normal',
        origin: 'Wholesale',
        destination: 'Nairobi, KE',
        paymentRail: 'CorporatePay',
        approvalRequired: false,
        dueAt: new Date(soon(1440)),
        data: {
          id: 'RFQ-4100',
          title: 'Bulk e-bike batteries 48V 20Ah',
          status: 'Open',
          urgency: 'Normal',
          createdAt: ago(372),
          dueAt: soon(1440),
          buyerType: 'Organization',
          origin: 'Wholesale',
          paymentRail: 'CorporatePay',
          approvalRequired: false,
          attachments: 1,
          destination: 'Nairobi, KE',
          category: 'Batteries',
          notes: 'Prefer Grade A cells and BMS.',
          score: 67,
          buyerName: 'Nairobi Importers Ltd',
          competitorPressure: 'Medium',
          paymentRisk: 'Low',
          marginPotential: 18
        }
      },
      {
        id: 'RFQ-4099',
        userId: sellerUserId,
        status: 'open',
        title: 'Type 2 cables MOQ inquiry',
        buyerName: 'Airport Mobility UG',
        buyerType: 'Personal',
        urgency: 'Normal',
        origin: 'Wholesale',
        destination: 'Entebbe, UG',
        paymentRail: 'Standard Checkout',
        approvalRequired: false,
        dueAt: new Date(soon(2880)),
        data: {
          id: 'RFQ-4099',
          title: 'Type 2 cables MOQ inquiry',
          status: 'Open',
          urgency: 'Normal',
          createdAt: ago(960),
          dueAt: soon(2880),
          buyerType: 'Personal',
          origin: 'Wholesale',
          paymentRail: 'Standard Checkout',
          approvalRequired: false,
          attachments: 0,
          destination: 'Entebbe, UG',
          category: 'Accessories',
          notes: 'Need best tier pricing.',
          score: 61,
          buyerName: 'Airport Mobility UG',
          competitorPressure: 'Low',
          paymentRisk: 'Medium',
          marginPotential: 13
        }
      }
    ]
  });

  await prisma.wholesaleQuote.createMany({
    data: [
      {
        id: 'QT-24018',
        userId: sellerUserId,
        rfqId: 'RFQ-4101',
        status: 'negotiating',
        title: 'Bulk EV Charger Supply (Phase 1)',
        buyer: 'Kampala City Fleet',
        buyerType: 'Organization',
        currency: 'USD',
        total: 18905.4,
        approvalsRequired: false,
        data: {
          id: 'QT-24018',
          title: 'Bulk EV Charger Supply (Phase 1)',
          client: 'Kampala City Fleet',
          contact: 'procurement@kcf.example',
          currency: 'USD',
          status: 'Negotiating',
          winChance: 72,
          discount: 150,
          shipping: 260,
          taxRate: 0.02,
          terms: 'Payment: 40% deposit, 60% before shipment. Warranty: 12 months. Delivery: 25 days.',
          notes: 'Client asked to improve warranty language and reduce delivery risk.',
          createdAt: ago(4320),
          updatedAt: ago(42),
          nextFollowUpAt: soon(90),
          approvals: { thresholdPct: 0.1, required: false, requests: [] },
          activity: [
            { id: 'act_q1_1', at: ago(46), actor: 'Sales', text: 'Updated quote after negotiation call.' },
            { id: 'act_q1_2', at: ago(120), actor: 'System', text: 'Quote sent to client.' }
          ],
          lines: [
            { id: 'ln_q1_1', name: '7kW Wallbox Charger', qty: 30, unit: 560 },
            { id: 'ln_q1_2', name: 'Type 2 Cable 5m', qty: 60, unit: 28 },
            { id: 'ln_q1_3', name: 'Installation guidance (remote)', qty: 1, unit: 120 }
          ],
          totals: { subtotal: 18275, tax: 365.5, total: 18900.5 },
          versions: [
            {
              id: 'ver_q1_1',
              at: ago(120),
              actor: 'Sales',
              note: 'Initial send',
              snapshot: {
                title: 'Bulk EV Charger Supply (Phase 1)',
                client: 'Kampala City Fleet',
                currency: 'USD',
                status: 'Sent',
                winChance: 68,
                discount: 120,
                shipping: 260,
                taxRate: 0.02,
                terms: 'Payment: 40% deposit, 60% before shipment.',
                notes: 'Initial send',
                lines: [
                  { id: 'ln_q1_1', name: '7kW Wallbox Charger', qty: 30, unit: 575 },
                  { id: 'ln_q1_2', name: 'Type 2 Cable 5m', qty: 60, unit: 28 }
                ]
              }
            }
          ]
        }
      },
      {
        id: 'QT-24019',
        userId: sellerUserId,
        rfqId: 'RFQ-4100',
        status: 'sent',
        title: 'Logistics Setup and Documentation',
        buyer: 'Nairobi Importers Ltd',
        buyerType: 'Organization',
        currency: 'USD',
        total: 580,
        approvalsRequired: false,
        data: {
          id: 'QT-24019',
          title: 'Logistics Setup and Documentation',
          client: 'Nairobi Importers Ltd',
          contact: 'ops@nairobiimporters.example',
          currency: 'USD',
          status: 'Sent',
          winChance: 55,
          discount: 0,
          shipping: 0,
          taxRate: 0,
          terms: 'Includes documentation checklist, coordination, and export readiness review.',
          notes: 'Waiting for client route confirmation.',
          createdAt: ago(2520),
          updatedAt: ago(95),
          nextFollowUpAt: soon(240),
          approvals: { thresholdPct: 0.1, required: false, requests: [] },
          activity: [{ id: 'act_q2_1', at: ago(95), actor: 'System', text: 'Quote sent to client.' }],
          lines: [
            { id: 'ln_q2_1', name: 'Logistics planning package', qty: 1, unit: 420 },
            { id: 'ln_q2_2', name: 'Documentation support', qty: 1, unit: 160 }
          ],
          totals: { subtotal: 580, tax: 0, total: 580 },
          versions: []
        }
      }
    ]
  });

  await prisma.wholesalePriceList.createMany({
    data: [
      {
        id: 'SKU-1001',
        userId: sellerUserId,
        name: 'EV Fast Charger 7kW Wallbox',
        currency: 'USD',
        status: 'active',
        data: {
          id: 'SKU-1001',
          sku: 'EV-CHG-7KW',
          name: 'EV Fast Charger 7kW Wallbox',
          currency: 'USD',
          baseCost: 420,
          status: 'Active',
          updatedAt: ago(35),
          tiers: [
            { id: 't1', minQty: 1, price: 620 },
            { id: 't2', minQty: 10, price: 590 },
            { id: 't3', minQty: 50, price: 560 }
          ],
          segments: ['Standard', 'Distributor', 'Africa']
        }
      },
      {
        id: 'SKU-1002',
        userId: sellerUserId,
        name: 'E-Bike Battery Pack 48V 20Ah',
        currency: 'USD',
        status: 'draft',
        data: {
          id: 'SKU-1002',
          sku: 'EBK-BAT-48V-20AH',
          name: 'E-Bike Battery Pack 48V 20Ah',
          currency: 'USD',
          baseCost: 190,
          status: 'Draft',
          updatedAt: ago(92),
          tiers: [
            { id: 't1', minQty: 5, price: 280 },
            { id: 't2', minQty: 20, price: 258 },
            { id: 't3', minQty: 50, price: 242 }
          ],
          segments: ['Standard', 'Reseller']
        }
      },
      {
        id: 'SKU-1003',
        userId: sellerUserId,
        name: 'Type 2 Charging Cable 5m',
        currency: 'USD',
        status: 'active',
        data: {
          id: 'SKU-1003',
          sku: 'CAB-T2-5M',
          name: 'Type 2 Charging Cable 5m',
          currency: 'USD',
          baseCost: 14,
          status: 'Active',
          updatedAt: ago(210),
          tiers: [
            { id: 't1', minQty: 10, price: 36 },
            { id: 't2', minQty: 100, price: 29 }
          ],
          segments: ['Standard', 'Distributor']
        }
      }
    ]
  });

  await prisma.providerConsultation.createMany({
    data: [
      {
        id: 'CNS-4012',
        userId: sellerUserId,
        status: 'new',
        data: {
          id: 'CNS-4012',
          client: 'Amina K.',
          channel: 'EVzone',
          topic: 'Website integration for WhatsApp Business API',
          status: 'New',
          priority: 'High',
          createdAt: ago(55),
          lastMessageAt: ago(12),
          scheduledAt: null,
          tags: ['integration', 'whatsapp'],
          transcript: 'Client wants to integrate WhatsApp Business API into their marketplace. Needs guidance on provider selection, template approvals, webhook reliability, and agent inbox routing.',
          notes: '',
          summary: null,
          summaryAt: null,
          lastConverted: null
        }
      },
      {
        id: 'CNS-4011',
        userId: sellerUserId,
        status: 'scheduled',
        scheduledAt: new Date(soon(180)),
        data: {
          id: 'CNS-4011',
          client: 'Kato S.',
          channel: 'WhatsApp',
          topic: 'Service pricing and quote structure',
          status: 'Scheduled',
          priority: 'Medium',
          createdAt: ago(210),
          lastMessageAt: ago(45),
          scheduledAt: soon(180),
          tags: ['pricing', 'quote'],
          transcript: 'Discussed pricing tiers and how to present quotes. Client prefers clear packages and optional add-ons, plus taxes handling where applicable.',
          notes: 'Share a quote template with 3 packages and 2 add-ons.\nConfirm VAT applicability by client country.',
          summary: null,
          summaryAt: null,
          lastConverted: { type: 'Quote', at: ago(40) }
        }
      }
    ]
  });

  await prisma.providerBooking.createMany({
    data: [
      {
        id: 'BK-7001',
        userId: sellerUserId,
        status: 'requested',
        scheduledAt: new Date(soon(1440)),
        durationMinutes: 120,
        amount: 640,
        currency: 'USD',
        data: {
          id: 'BK-7001',
          customerName: 'Amina K.',
          customerEmail: 'amina@example.com',
          customerPhone: '+256700111111',
          serviceName: 'EV Charger Installation',
          status: 'Requested',
          scheduledAt: soon(1440),
          durationMins: 120,
          location: 'Kampala',
          currency: 'USD',
          price: 640,
          createdAt: ago(180),
          updatedAt: ago(32),
          responseDueAt: soon(60),
          startDueAt: soon(1440),
          deliverables: [{ id: 'del_b1_1', title: 'Site survey', status: 'Pending' }],
          payment: { milestones: [{ id: 'pm_b1_1', label: 'Deposit', amount: 320, status: 'Pending', dueAt: soon(120) }] },
          checklistTemplateId: 'tmpl_booking_install',
          checklist: [{ id: 'chk_b1_1', text: 'Confirm power load', done: false }],
          proofs: [],
          audit: [{ id: 'aud_b1_1', at: ago(180), actor: 'System', action: 'Created', detail: 'Booking received' }],
          notes: 'Customer requested a morning slot.'
        }
      },
      {
        id: 'BK-7002',
        userId: sellerUserId,
        status: 'confirmed',
        scheduledAt: new Date(soon(2880)),
        durationMinutes: 240,
        amount: 1200,
        currency: 'USD',
        data: {
          id: 'BK-7002',
          customerName: 'Moses N.',
          customerEmail: 'moses@example.com',
          customerPhone: '+256700222222',
          serviceName: 'Fleet Energy Audit',
          status: 'Confirmed',
          scheduledAt: soon(2880),
          durationMins: 240,
          location: 'Nairobi',
          currency: 'USD',
          price: 1200,
          createdAt: ago(1440),
          updatedAt: ago(70),
          responseDueAt: null,
          startDueAt: soon(2880),
          deliverables: [{ id: 'del_b2_1', title: 'Usage report', status: 'Ready' }],
          payment: { milestones: [{ id: 'pm_b2_1', label: 'Full payment', amount: 1200, status: 'Paid', dueAt: ago(300) }] },
          checklistTemplateId: 'tmpl_booking_audit',
          checklist: [{ id: 'chk_b2_1', text: 'Collect site photos', done: true }],
          proofs: [{ id: 'proof_b2_1', name: 'audit-report.pdf', uploadedAt: ago(60), visibility: 'private' }],
          audit: [{ id: 'aud_b2_1', at: ago(1440), actor: 'Ops', action: 'Confirmed', detail: 'Client approved schedule' }],
          notes: 'Bring assessment worksheet.'
        }
      }
    ]
  });

  await prisma.shippingProfile.createMany({
    data: [
      {
        id: 'SHIP-EXP-INTL',
        sellerId,
        name: 'Express International',
        status: 'ACTIVE',
        carrier: 'EV Hub Logistics',
        serviceLevel: 'Express',
        handlingTimeDays: 2,
        regions: ['Uganda', 'Kenya', 'Nigeria', 'Ghana', 'South Africa', 'China', 'United States', 'United Kingdom', 'Germany', 'France'],
        isDefault: false,
        metadata: {
          currency: 'USD',
          serviceType: 'Express',
          zones: [
            {
              id: 'Z-AFR',
              name: 'Africa',
              countries: ['Uganda', 'Kenya', 'Nigeria', 'Ghana', 'South Africa'],
              pricing: { mode: 'weight', base: 14, perKg: 3.5, perItem: 0 },
              lead: { minDays: 3, maxDays: 7 },
              notes: 'Air express'
            },
            {
              id: 'Z-GLB',
              name: 'Global',
              countries: ['China', 'United States', 'United Kingdom', 'Germany', 'France'],
              pricing: { mode: 'weight', base: 18, perKg: 4.2, perItem: 0 },
              lead: { minDays: 4, maxDays: 9 },
              notes: 'Air express'
            }
          ],
          policy: {
            mode: 'buyer_preferred',
            fallbackWarehouseId: 'wh_wux_main',
            rules: [
              {
                id: 'R-3',
                priority: 10,
                title: 'Africa ships from Kampala if available',
                when: { zoneId: 'Z-AFR', maxWeightKg: 20 },
                then: { warehouseId: 'wh_kla_main' }
              },
              {
                id: 'R-4',
                priority: 20,
                title: 'Global ships from Wuxi',
                when: { zoneId: 'Z-GLB' },
                then: { warehouseId: 'wh_wux_main' }
              }
            ]
          }
        }
      }
    ]
  });

  await prisma.providerPortfolioItem.createMany({
    data: [
      {
        id: 'PORT-M-1',
        userId: sellerUserId,
        title: 'Kampala charger install hero shot',
        description: 'On-site installation highlight.',
        mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
        status: 'active',
        data: {
          id: 'PORT-M-1',
          type: 'image',
          title: 'Kampala charger install hero shot',
          tags: ['install', 'ev'],
          featured: true,
          usedAsCover: true,
          description: 'On-site installation highlight.',
          thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=70',
          createdAt: ago(600)
        }
      },
      {
        id: 'PORT-M-2',
        userId: sellerUserId,
        title: 'Fleet audit recap reel',
        description: 'Quick recap video.',
        mediaUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        status: 'active',
        data: {
          id: 'PORT-M-2',
          type: 'video',
          title: 'Fleet audit recap reel',
          tags: ['audit', 'reel'],
          featured: false,
          usedAsCover: false,
          description: 'Quick recap video.',
          thumb: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1200&q=60',
          createdAt: ago(420)
        }
      }
    ]
  });

  await prisma.sellerWarehouse.createMany({
    data: [
      {
        id: 'wh_kla_main',
        sellerId,
        name: 'Main Warehouse',
        code: 'KLA-MAIN',
        type: 'WAREHOUSE',
        status: 'ACTIVE',
        isDefault: true,
        address: { country: 'UG', city: 'Kampala' },
        contact: { name: 'Asha', phone: '+256700333333' },
        metadata: {
          cutOffLocal: '17:00',
          processingDays: 1,
          capabilities: { ship: true, pickup: true, returns: true },
          constraints: { hazmat: false, batteries: true },
          serviceCountries: ['UG', 'KE', 'RW'],
          blockedCountries: ['CN']
        }
      },
      {
        id: 'wh_nbo_hub',
        sellerId,
        name: 'Nairobi Hub',
        code: 'NBO-HUB',
        type: 'WAREHOUSE',
        status: 'ACTIVE',
        isDefault: false,
        address: { country: 'KE', city: 'Nairobi' },
        contact: { name: 'Kato', phone: '+254700111111' },
        metadata: {
          cutOffLocal: '16:30',
          processingDays: 2,
          capabilities: { ship: true, pickup: false, returns: true },
          constraints: { hazmat: true, batteries: true },
          serviceCountries: ['KE', 'TZ'],
          blockedCountries: []
        }
      },
      {
        id: 'wh_wux_main',
        sellerId,
        name: 'Wuxi Main',
        code: 'WUX-MAIN',
        type: 'WAREHOUSE',
        status: 'ACTIVE',
        isDefault: false,
        address: { country: 'CN', city: 'Wuxi' },
        contact: { name: 'Lin', phone: '+865101111111' },
        metadata: {
          cutOffLocal: '18:00',
          processingDays: 2,
          capabilities: { ship: true, pickup: false, returns: false },
          constraints: { hazmat: false, batteries: true },
          serviceCountries: ['CN', 'US', 'GB', 'DE', 'FR'],
          blockedCountries: []
        }
      }
    ]
  });

  await prisma.sellerDocument.createMany({
    data: [
      {
        id: 'doc_invoice_template_seed',
        sellerId,
        type: 'Invoice Template',
        channel: 'Ops',
        regions: ['UG'],
        fileName: 'invoice-standard-v3.pdf',
        url: 'https://example.com/invoice-standard-v3.pdf',
        status: 'APPROVED',
        uploadedAt: new Date(ago(720)),
        metadata: {
          kind: 'invoice',
          scope: 'Team',
          locale: 'en-UG',
          owner: 'Ops',
          fields: ['Invoice #', 'Buyer VAT', 'Line items'],
          versions: [{ v: 3, at: ago(720), by: 'Ops', note: 'Added buyer VAT field' }]
        }
      },
      {
        id: 'doc_packing_template_seed',
        sellerId,
        type: 'Packing List Template',
        channel: 'Ops',
        regions: ['UG', 'KE'],
        fileName: 'packing-list-africa.pdf',
        url: 'https://example.com/packing-list-africa.pdf',
        status: 'APPROVED',
        uploadedAt: new Date(ago(540)),
        metadata: {
          kind: 'packing',
          scope: 'Africa',
          locale: 'en',
          owner: 'Ops',
          fields: ['SKU', 'Qty', 'Gross weight'],
          versions: [{ v: 2, at: ago(540), by: 'Ops', note: 'Updated HS code footer' }]
        }
      }
    ]
  });

  await prisma.sellerExportJob.createMany({
    data: [
      {
        id: 'exp_job_1',
        sellerId,
        type: 'Orders',
        status: 'COMPLETED',
        format: 'CSV',
        requestedAt: new Date(ago(220)),
        completedAt: new Date(ago(210)),
        fileUrl: 'https://example.com/exports/orders-q1.csv',
        filters: { range: 'Last 30 days' },
        metadata: {
          name: 'Orders Q1 Snapshot',
          dataset: 'Orders',
          destination: 'Email',
          progress: 100,
          requestedBy: 'Ops Lead',
          rows: 214,
          size: '1.4 MB',
          expiresAt: soon(14400),
          params: { range: 'Last 30 days' },
          logs: ['Job queued', 'Rows collected', 'Delivered to email']
        }
      },
      {
        id: 'exp_job_2',
        sellerId,
        type: 'Listings',
        status: 'RUNNING',
        format: 'XLSX',
        requestedAt: new Date(ago(15)),
        filters: { marketplace: 'EVmart' },
        metadata: {
          name: 'Listings audit workbook',
          dataset: 'Listings',
          destination: 'Drive',
          progress: 64,
          requestedBy: 'Compliance Desk',
          rows: 98,
          size: 'Generating',
          expiresAt: null,
          params: { marketplace: 'EVmart' },
          logs: ['Job queued', 'Workbook generation started']
        }
      }
    ]
  });

  await prisma.supportContent.createMany({
    data: [
      {
        id: 'chg_1',
        contentType: 'CHANGELOG',
        title: 'Seller workspace summaries now load from backend',
        body: 'App shell counts, notifications, messages, and orders now come from authenticated backend endpoints.',
        status: 'published',
        metadata: {
          version: '2026.03.11',
          type: 'Improvement',
          product: 'Seller App',
          roles: ['Seller', 'Ops'],
          tags: ['backend', 'seller-shell'],
          impact: 'High',
          details: ['Backend counts now match live seller data.', 'Local mock counts removed from shell runtime.']
        }
      },
      {
        id: 'chg_2',
        contentType: 'CHANGELOG',
        title: 'Listings and express detail persistence added',
        body: 'Seller listings and express order detail mutations are now backed by MySQL.',
        status: 'published',
        metadata: {
          version: '2026.03.10',
          type: 'Feature',
          product: 'Seller App',
          roles: ['Seller'],
          tags: ['listings', 'express'],
          impact: 'High',
          details: ['Listing detail now reads from backend listings.', 'Express order status and rider data persist through API calls.']
        }
      }
    ]
  });

  await prisma.regulatoryDesk.createMany({
    data: [
      {
        id: 'desk_edumart',
        userId: sellerUserId,
        slug: 'edumart',
        title: 'EduMart Desk',
        status: 'active',
        metadata: {
          pageData: {
            rows: [
              {
                id: 'EDU-201',
                title: 'STEM Classroom Kit',
                kind: 'Physical Product',
                category: 'Education kits',
                ageBand: '9-12',
                risk: 'Medium',
                status: 'In Review',
                updatedAt: ago(95),
                media: { images: 6 },
                docs: { safetyCert: true, policyAcknowledged: true, copyrightProof: true, providerKyc: true },
                safety: { ageLabel: true, noAdultContent: true, parentControls: true },
                privacy: { basic: true },
                safeguarding: { basic: true },
                deskNotes: [{ id: 'edu_note_1', at: ago(90), from: 'Edu Desk', text: 'Please attach the updated teacher guide.' }],
                timeline: [{ id: 'edu_tl_1', at: ago(110), label: 'Submitted for review' }],
                compliance: { state: 'warn', issues: ['Teacher guide missing'], lastScanAt: ago(88) },
                readiness: 82
              }
            ]
          }
        }
      },
      {
        id: 'desk_healthmart',
        userId: sellerUserId,
        slug: 'healthmart',
        title: 'HealthMart Desk',
        status: 'active',
        metadata: {
          pageData: {
            submissions: [
              {
                id: 'HM-101',
                desk: 'HealthMart',
                category: 'Diagnostics',
                subject: 'Portable ECG Monitor',
                status: 'Under Review',
                createdAt: ago(420),
                updatedAt: ago(40),
                slaDueAt: soon(360),
                riskScore: 61,
                docs: { required: [{ key: 'invoice', label: 'Commercial invoice', state: 'Uploaded' }, { key: 'reg', label: 'Product registration', state: 'Needs review' }] },
                decision: { state: 'Pending', reviewerNote: 'Checking destination registration scope.' },
                flags: ['Registration scope mismatch'],
                audit: [{ at: ago(420), who: 'Seller', action: 'Submitted' }]
              }
            ],
            docLibrary: [
              { key: 'invoice', label: 'Commercial invoice', appliesTo: 'All health imports', state: 'Ready' },
              { key: 'reg', label: 'Product registration', appliesTo: 'Diagnostics', state: 'Needs review' }
            ]
          }
        }
      },
      {
        id: 'desk_healthmart_equipment',
        userId: sellerUserId,
        slug: 'healthmart-equipment',
        title: 'HealthMart Equipment Desk',
        status: 'active',
        metadata: {
          pageData: {
            submissions: [
              {
                id: 'EQ-301',
                name: 'Portable Ultrasound Mini',
                category: 'Imaging',
                deviceClass: 'II',
                origin: 'CN',
                destination: 'UG',
                hsCode: '9018.12',
                manufacturer: 'Shenzhen MedTech',
                model: 'US-Mini-3',
                status: 'Under Review',
                createdAt: ago(560),
                updatedAt: ago(70),
                certifications: ['CE', 'ISO 13485'],
                docs: {
                  commercialInvoice: true,
                  certificateOfConformity: true,
                  productRegistration: true,
                  warranty: true,
                  userManual: true,
                  calibrationCertificate: false,
                  msds: false
                },
                notes: 'Awaiting destination-side calibration certificate confirmation.',
                flags: ['Calibration evidence missing']
              }
            ]
          }
        }
      },
      {
        id: 'desk_healthmart_logistics',
        userId: sellerUserId,
        slug: 'healthmart-logistics',
        title: 'HealthMart Logistics Desk',
        status: 'active',
        metadata: {
          pageData: {
            licenses: [
              {
                id: 'LIC-HL-1',
                name: 'Cold-chain transport permit',
                issuer: 'UNBS',
                number: 'UG-COLD-882',
                issuedAt: ago(43200),
                expiresAt: soon(525600),
                required: true,
                scope: 'Vaccine and diagnostics transport',
                verifiedAt: ago(2880),
                docs: [{ id: 'evdoc_1', name: 'cold-chain-permit.pdf', type: 'PDF', uploadedAt: ago(2885) }],
                tags: ['cold-chain']
              }
            ],
            checklist: [
              {
                id: 'sec_1',
                title: 'Transport setup',
                items: [
                  {
                    id: 'chk_hl_1',
                    title: 'Temperature logger in active use',
                    requirement: 'Every shipment must have a logger record.',
                    status: 'pass',
                    required: true,
                    owner: 'Ops',
                    updatedAt: ago(50),
                    evidence: [{ id: 'e1', name: 'logger-run.csv', type: 'CSV', uploadedAt: ago(52) }]
                  }
                ]
              }
            ],
            rules: [
              { id: 'rule_hl_1', name: 'Block expired license dispatch', enabled: true, severity: 'High', when: 'License expired', then: 'Stop dispatch', evidence: 'Permit metadata' }
            ],
            audit: [{ id: 'aud_hl_1', at: ago(55), actor: 'System', action: 'Validation passed', detail: 'Cold-chain docs available' }]
          }
        }
      },
      {
        id: 'desk_healthmart_pharmacy',
        userId: sellerUserId,
        slug: 'healthmart-pharmacy',
        title: 'HealthMart Pharmacy Desk',
        status: 'active',
        metadata: {
          pageData: {
            licenses: [
              {
                id: 'PH-LIC-1',
                seller: 'EV Hub Supplier',
                country: 'UG',
                authority: 'National Drug Authority',
                licenseNo: 'NDA-88213',
                issuedAt: ago(86400),
                expiresAt: soon(432000),
                status: 'Verified',
                scope: ['OTC', 'Storage'],
                docs: ['license-scan.pdf'],
                riskScore: 24,
                notes: 'Verified for current OTC catalog.'
              }
            ],
            items: [
              {
                id: 'PH-ITEM-1',
                title: 'Antiseptic Spray',
                seller: 'EV Hub Supplier',
                category: 'OTC',
                restriction: 'License',
                policy: 'Requires active pharmacy storage license.',
                status: 'Approved',
                createdAt: ago(320),
                evidence: ['license-scan.pdf']
              }
            ],
            rules: [
              { id: 'PH-RULE-1', name: 'Block expired pharmacy license', enabled: true, when: ['License expired'], then: ['Block listing publication'], lastEditedAt: ago(500) }
            ],
            cases: [
              {
                id: 'PH-CASE-1',
                severity: 'Medium',
                status: 'In Review',
                title: 'Restricted item scope validation',
                related: 'Antiseptic Spray',
                createdAt: ago(280),
                assignee: 'NDA Desk',
                timeline: [{ at: ago(280), who: 'System', what: 'Case opened after catalog scan' }]
              }
            ]
          }
        }
      }
    ]
  });

  await prisma.regulatoryDeskItem.createMany({
    data: [
      { id: 'deskitem_edumart_1', deskId: 'desk_edumart', title: 'Teacher guide follow-up', status: 'review', severity: 'medium', metadata: { listingId: 'EDU-201' } },
      { id: 'deskitem_healthmart_1', deskId: 'desk_healthmart', title: 'Registration scope check', status: 'review', severity: 'high', metadata: { submissionId: 'HM-101' } },
      { id: 'deskitem_health_eq_1', deskId: 'desk_healthmart_equipment', title: 'Calibration certificate required', status: 'open', severity: 'high', metadata: { submissionId: 'EQ-301' } },
      { id: 'deskitem_health_log_1', deskId: 'desk_healthmart_logistics', title: 'Cold-chain permit verified', status: 'resolved', severity: 'low', metadata: { licenseId: 'LIC-HL-1' } },
      { id: 'deskitem_health_ph_1', deskId: 'desk_healthmart_pharmacy', title: 'Restricted item scope validation', status: 'review', severity: 'medium', metadata: { itemId: 'PH-ITEM-1' } }
    ]
  });

  await prisma.regulatoryComplianceItem.createMany({
    data: [
      {
        id: 'comp_doc_1',
        userId: sellerUserId,
        itemType: 'DOC',
        title: 'Business License',
        status: 'active',
        metadata: { id: 'DOC-1001', type: 'Business License', channel: 'EVmart', regions: ['UG'], fileName: 'license.pdf', uploadedAt: ago(1200), expiresAt: soon(525600), status: 'Approved', notes: 'Annual renewal complete.' }
      },
      {
        id: 'comp_doc_2',
        userId: sellerUserId,
        itemType: 'DOC',
        title: 'MSDS',
        status: 'active',
        metadata: { id: 'DOC-1002', type: 'MSDS', channel: 'EVmart', regions: ['UG', 'KE'], fileName: 'battery-msds.pdf', uploadedAt: ago(680), expiresAt: soon(262800), status: 'Submitted', notes: 'Battery listing support file.' }
      },
      {
        id: 'comp_queue_1',
        userId: sellerUserId,
        itemType: 'QUEUE',
        title: 'Portable battery listing',
        status: 'active',
        metadata: { listingId: 'listing_ev_battery', channel: 'EVmart', title: 'Portable Battery Pack 48V', path: '/listings/listing_ev_battery', required: ['Business License', 'MSDS'], missing: [] }
      },
      {
        id: 'comp_rule_1',
        userId: sellerUserId,
        itemType: 'RULE',
        title: 'Battery listings require MSDS',
        status: 'active',
        metadata: { match: 'battery', required: ['MSDS'] }
      }
    ]
  });

  await prisma.workspaceSetting.createMany({
    data: [
      {
        userId: sellerUserId,
        key: 'wholesale_rfq_drafts',
        payload: {
          drafts: {
            'RFQ-4101': {
              id: 'Q-RFQ-4101',
              rfqId: 'RFQ-4101',
              currency: 'USD',
              status: 'Draft',
              createdAt: ago(20),
              sentAt: null,
              lines: [
                { id: 'drf_ln_1', sku: 'ITEM-001', name: '7kW Wallbox Charger', qty: 10, unitCost: 420, unitPrice: 620, leadDays: 14 },
                { id: 'drf_ln_2', sku: 'ITEM-002', name: 'Installation + commissioning', qty: 10, unitCost: 160, unitPrice: 260, leadDays: 5 }
              ]
            }
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'wholesale_quote_templates',
        payload: {
          templates: [
            {
              id: 'TPL-CHARGERS-STD',
              name: 'Standard EV Charger Bulk Quote',
              description: 'Default for bulk charger purchases.',
              currency: 'USD',
              discount: 120,
              shipping: 180,
              taxRate: 0.02,
              terms: 'Payment: 50% deposit, 50% before shipment. Warranty: 12 months.',
              lines: [
                { id: 'tpl_q_1', name: '7kW Wallbox Charger', qty: 20, unit: 560 },
                { id: 'tpl_q_2', name: 'Type 2 Cable 5m', qty: 50, unit: 28 }
              ]
            },
            {
              id: 'TPL-LOG-PORT',
              name: 'Warehouse to Port Logistics',
              description: 'Export and documentation support.',
              currency: 'USD',
              discount: 0,
              shipping: 0,
              taxRate: 0,
              terms: 'Includes documentation checklist and coordination.',
              lines: [{ id: 'tpl_q_3', name: 'Logistics planning package', qty: 1, unit: 420 }]
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'wholesale_price_list_versions',
        payload: {
          versions: [
            {
              id: 'pl_ver_1',
              at: ago(35),
              actor: 'Pricing Ops',
              note: 'Updated distributor tier for EV-CHG-7KW',
              snapshot: [
                {
                  id: 'SKU-1001',
                  sku: 'EV-CHG-7KW',
                  name: 'EV Fast Charger 7kW Wallbox',
                  currency: 'USD',
                  baseCost: 420,
                  status: 'Active',
                  updatedAt: ago(35),
                  tiers: [{ id: 'vt1', minQty: 1, price: 620 }, { id: 'vt2', minQty: 10, price: 590 }],
                  segments: ['Standard', 'Distributor']
                }
              ]
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'provider_booking_templates',
        payload: {
          templates: [
            { id: 'tmpl_booking_install', name: 'Installation checklist', note: 'Field install readiness', tasks: ['Confirm load capacity', 'Confirm mounting wall', 'Capture pre-install photo'] },
            { id: 'tmpl_booking_audit', name: 'Audit checklist', note: 'Fleet energy audit readiness', tasks: ['Collect site photos', 'Confirm meter access', 'Prepare report template'] }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'provider_portfolio_case_studies',
        payload: {
          caseStudies: [
            {
              id: 'case_1',
              title: 'City fleet charging rollout',
              client: 'Kampala City Fleet',
              scope: '20 charger deployment',
              tags: ['ev', 'install'],
              featured: true,
              createdAt: ago(1440),
              summary: 'Rolled out 20 charging points with phased commissioning and operator training.',
              highlights: [{ k: 'Sites', v: '5' }, { k: 'Install time', v: '12 days' }]
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'provider_service_command',
        payload: {
          schedule: [
            {
              id: 'SCH-2201',
              title: 'Site Survey: EV charger installation',
              customer: 'Kampala Logistics Ltd',
              service: 'Installation',
              startAt: soon(20),
              endAt: soon(80),
              channel: 'EVzone',
              location: 'Nsambya, Kampala',
              status: 'Upcoming'
            },
            {
              id: 'SCH-2200',
              title: 'Consultation: Fleet charging strategy',
              customer: 'GreenRide Fleet',
              service: 'Consultation',
              startAt: soon(105),
              endAt: soon(165),
              channel: 'Video Call',
              location: 'Online',
              status: 'Upcoming'
            },
            {
              id: 'SCH-2199',
              title: 'Maintenance follow-up: Wallbox diagnostics',
              customer: 'Amina K.',
              service: 'Maintenance',
              startAt: ago(90),
              endAt: ago(30),
              channel: 'WhatsApp',
              location: 'Online',
              status: 'Completed'
            }
          ],
          queue: [
            {
              id: 'Q-4107',
              customer: 'Ibrahim H.',
              request: 'Urgent booking: charger installation',
              service: 'Installation',
              status: 'New',
              priority: 'High',
              channel: 'WhatsApp',
              slaDueAt: soon(18),
              score: 92
            },
            {
              id: 'Q-4106',
              customer: 'Chen L.',
              request: 'Request quote: 12-port charging station',
              service: 'Quotation',
              status: 'Awaiting',
              priority: 'Medium',
              channel: 'API',
              slaDueAt: soon(120),
              score: 68
            },
            {
              id: 'Q-4105',
              customer: 'Sarah T.',
              request: 'Support: OCPP connectivity troubleshooting',
              service: 'Support',
              status: 'In progress',
              priority: 'High',
              channel: 'EVzone',
              slaDueAt: ago(5),
              score: 88
            },
            {
              id: 'Q-4104',
              customer: 'Moses N.',
              request: 'Reschedule consultation',
              service: 'Consultation',
              status: 'New',
              priority: 'Low',
              channel: 'EVzone',
              slaDueAt: soon(360),
              score: 41
            },
            {
              id: 'Q-4103',
              customer: 'Joy A.',
              request: 'Dispute: service scope mismatch',
              service: 'Support',
              status: 'Escalated',
              priority: 'High',
              channel: 'EVzone',
              slaDueAt: soon(45),
              score: 97
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_warehouses_page',
        payload: {
          rules: [
            { id: 'route_1', enabled: true, priority: 1, name: 'UG retail to Kampala', match: { country: 'UG', category: 'Chargers' }, action: { warehouseId: 'wh_kla_main' }, note: 'Default East Africa charger routing' }
          ],
          buyerPrefs: [
            { id: 'pref_1', name: 'Kampala City Fleet', preferredWarehouseId: 'wh_kla_main', lastOrderAt: ago(520), note: 'Prefers Kampala dispatch for same-day paperwork' }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_exports_page',
        payload: {
          templates: [
            { id: 'exp_tpl_1', name: 'Orders by marketplace', dataset: 'Orders', format: 'CSV', destination: 'Email', note: 'Weekly finance handoff', lastRunAt: ago(210) }
          ],
          schedules: [
            { id: 'exp_sch_1', templateId: 'exp_tpl_1', name: 'Weekly orders export', frequency: 'Weekly', nextRunAt: soon(2880), enabled: true }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_documents_page',
        payload: {
          templates: [
            {
              id: 'doc_tpl_1',
              kind: 'Invoice',
              name: 'Invoice Standard v3',
              scope: 'Team',
              locale: 'en-UG',
              updatedAt: ago(720),
              owner: 'Ops',
              status: 'Active',
              fields: ['Invoice #', 'Buyer VAT', 'Line items'],
              defaults: { currency: 'USD', taxes: 'VAT', units: 'Metric', print: 'A4' },
              versions: [{ v: 3, at: ago(720), by: 'Ops', note: 'Added buyer VAT field' }],
              teamDefault: true
            },
            {
              id: 'doc_tpl_2',
              kind: 'Packing List',
              name: 'Packing List Africa',
              scope: 'Africa',
              locale: 'en',
              updatedAt: ago(540),
              owner: 'Ops',
              status: 'Active',
              fields: ['SKU', 'Qty', 'Gross weight'],
              defaults: { units: 'Metric', format: 'Compact' },
              versions: [{ v: 2, at: ago(540), by: 'Ops', note: 'Updated HS code footer' }],
              teamDefault: false
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'seller_dealz_marketplace_legacy',
        payload: {
          deals: [
            {
              id: 'deal_legacy_1',
              type: 'Shoppable Adz',
              title: 'Weekend Charger Bundle',
              tagline: 'Bundle pricing for home installs',
              supplier: { name: 'EV Hub Supplier', category: 'Retail', logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop' },
              creator: { name: 'Asha K', handle: '@asha', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', verified: true },
              startISO: ago(30),
              endISO: soon(1440),
              notes: 'Backend-backed legacy deal payload',
              shoppable: {
                id: 'ad_legacy_1',
                status: 'Generated',
                campaignName: 'Weekend Charger Bundle',
                campaignSubtitle: 'Bundle pricing for home installs',
                supplier: { name: 'EV Hub Supplier', category: 'Retail', logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop' },
                creator: { name: 'Asha K', handle: '@asha', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', verified: true },
                platforms: ['Instagram', 'WhatsApp'],
                startISO: ago(30),
                endISO: soon(1440),
                heroImageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1200&auto=format&fit=crop',
                offers: [
                  { id: 'offer_legacy_1', type: 'PRODUCT', name: '7kW Wallbox Charger', price: 540, basePrice: 620, currency: 'USD', stockLeft: 18, sold: 12, posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&h=500&q=70' }
                ],
                ctaPrimaryLabel: 'Shop now',
                ctaSecondaryLabel: 'View details',
                kpis: [{ label: 'Clicks', value: '980' }, { label: 'Purchases', value: '41' }]
              }
            }
          ],
          selectedId: 'deal_legacy_1',
          cart: {},
          liveCart: {}
        }
      },
      {
        userId: sellerUserId,
        key: 'integrations',
        payload: {
          integrations: [
            {
              id: 'app_shopify',
              name: 'Shopify',
              category: 'Commerce',
              status: 'Connected',
              description: 'Catalog and order sync',
              lastSyncAt: ago(18),
              health: 98
            },
            {
              id: 'app_meta',
              name: 'Meta Ads',
              category: 'Marketing',
              status: 'Disconnected',
              description: 'Campaign reporting',
              lastSyncAt: ago(2880),
              health: 64
            }
          ],
          webhooks: [
            {
              id: 'wh_orders',
              url: 'https://seller.evhub.com/hooks/orders',
              status: 'Active',
              lastDeliveryAt: ago(11),
              successRate24h: 99,
              signing: 'Enabled',
              events: ['order.created', 'order.paid']
            },
            {
              id: 'wh_inventory',
              url: 'https://seller.evhub.com/hooks/inventory',
              status: 'Paused',
              lastDeliveryAt: ago(320),
              successRate24h: 92,
              signing: 'Enabled',
              events: ['inventory.updated']
            }
          ],
          metadata: {
            keys: [
              {
                id: 'key_2fd1ab',
                name: 'Operations API',
                prefix: 'sk_live_ops',
                createdAt: ago(90 * 24 * 60),
                lastUsedAt: ago(45),
                status: 'Active',
                scopes: ['orders:read', 'inventory:read', 'webhooks:read'],
                expiresAt: soon(90 * 24 * 60)
              },
              {
                id: 'key_73ac90',
                name: 'Legacy webhook relay',
                prefix: 'sk_live_rel',
                createdAt: ago(220 * 24 * 60),
                lastUsedAt: ago(14 * 24 * 60),
                status: 'Revoked',
                scopes: ['webhooks:write'],
                expiresAt: soon(7 * 24 * 60)
              }
            ],
            logs: [
              {
                id: 'evt_1001',
                at: ago(14),
                endpointId: 'wh_orders',
                endpointUrl: 'https://seller.evhub.com/hooks/orders',
                eventType: 'order.created',
                result: 'Success',
                httpStatus: '200',
                latencyMs: 182,
                tries: 1,
                payloadPreview: '{"id":"ORD-10512","type":"order.created"}'
              },
              {
                id: 'evt_1002',
                at: ago(74),
                endpointId: 'wh_inventory',
                endpointUrl: 'https://seller.evhub.com/hooks/inventory',
                eventType: 'inventory.updated',
                result: 'Timeout',
                httpStatus: '504',
                latencyMs: 980,
                tries: 2,
                payloadPreview: '{"id":"INV-77","type":"inventory.updated"}'
              }
            ]
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'notification_preferences',
        payload: {
          metadata: {
            globalChannels: { inApp: true, email: true, sms: false, whatsapp: true },
            categories: [
              { key: 'mentions', label: 'Mentions', desc: 'Direct mentions, replies and assignments', critical: true, enabled: true, channels: { inApp: true, email: true, sms: false, whatsapp: true } },
              { key: 'orders', label: 'Orders', desc: 'New orders, SLA risk, cancellations', critical: true, enabled: true, channels: { inApp: true, email: true, sms: false, whatsapp: true } },
              { key: 'finance', label: 'Finance', desc: 'Payouts, holds, settlements, invoices', critical: true, enabled: true, channels: { inApp: true, email: true, sms: false, whatsapp: true } },
              { key: 'system', label: 'System', desc: 'Security, policy, incidents and maintenance', critical: true, enabled: true, channels: { inApp: true, email: true, sms: true, whatsapp: true } }
            ],
            channelProfiles: {
              email: { enabled: true, address: 'seller@evhub.com', verified: true },
              sms: { enabled: false, address: '+256700000001', verified: false },
              whatsapp: { enabled: true, address: '+256700000001', verified: true },
              inApp: { enabled: true, address: 'Seller workspace', verified: true }
            },
            quietHours: { enabled: true, start: '22:00', end: '07:00', days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'], bypassCritical: true },
            digest: {
              enabled: true,
              mode: 'Daily',
              time: '07:30',
              channels: { inApp: true, email: true, sms: false, whatsapp: false },
              includeCategories: ['orders', 'finance', 'system'],
              instantForCritical: true
            },
            rules: [
              {
                id: 'rule_orders_critical',
                enabled: true,
                name: 'Critical order exceptions',
                priority: 'High',
                trigger: { category: 'orders', event: 'at_risk' },
                conditions: { severity: 'Critical', keyword: '' },
                action: {
                  delivery: 'Instant',
                  channels: { inApp: true, email: true, sms: false, whatsapp: true },
                  throttleMins: 15,
                  bypassQuietHours: true
                }
              }
            ]
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'help',
        payload: {
          kb: [
            {
              id: 'kb_payouts_1',
              category: 'Finance',
              title: 'Why payouts can be delayed',
              tags: ['payout', 'holds', 'kyb'],
              views: 420,
              body: 'Payouts can pause when KYB expires, disputes spike, or settlement windows are still open.'
            },
            {
              id: 'kb_webhooks_1',
              category: 'Integrations',
              title: 'Troubleshoot webhook delivery failures',
              tags: ['webhooks', 'integrations'],
              views: 260,
              body: 'Confirm the endpoint is reachable, secrets are current, and retries are not being rate-limited.'
            }
          ],
          incidents: [
            {
              id: 'inc_hist_1',
              title: 'Express settlement lag',
              status: 'Resolved',
              components: ['Express payouts'],
              startedAt: ago(2200),
              resolvedAt: ago(2100),
              summary: 'Delayed supplier settlements for one payout cycle.'
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'status_center',
        payload: {
          providers: [
            { id: 'p_pay', name: 'Payout Rail', status: 'operational', latencyMs: 190, errorRate: 0.1, lastCheckAt: ago(4), region: 'UG' },
            { id: 'p_msg', name: 'Messaging Gateway', status: 'degraded', latencyMs: 480, errorRate: 1.8, lastCheckAt: ago(6), region: 'EA' },
            { id: 'p_web', name: 'Webhook Relay', status: 'operational', latencyMs: 210, errorRate: 0.2, lastCheckAt: ago(5), region: 'Global' }
          ],
          incidents: [
            { id: 'inc_201', title: 'Messaging delays', status: 'investigating', severity: 'major', affected: ['Messaging Gateway'], summary: 'Outbound notifications are delayed for some regions.', updatedAt: ago(8) },
            { id: 'inc_200', title: 'Payout lag resolved', status: 'resolved', severity: 'minor', affected: ['Payout Rail'], summary: 'Settlement catch-up finished.', updatedAt: ago(1440) }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'tax',
        payload: {
          profiles: [
            { id: 'VAT-UG-101', profileName: 'Uganda Standard VAT', country: 'UG', vatId: 'UGX-778811', standardRate: 18, reducedRate: 0, status: 'Active', isDefault: true, notes: 'Primary seller entity', updatedAt: ago(320) },
            { id: 'VAT-KE-204', profileName: 'Kenya B2B VAT', country: 'KE', vatId: 'KRA-55821', standardRate: 16, reducedRate: 0, status: 'Active', isDefault: false, notes: 'Cross-border B2B invoicing', updatedAt: ago(920) }
          ],
          reports: [
            { id: 'PACK-102', scope: 'All regions', status: 'Ready', createdAt: ago(290), items: 14, size: '6.8 MB' },
            { id: 'PACK-101', scope: 'UG only', status: 'Ready', createdAt: ago(940), items: 11, size: '5.2 MB' }
          ],
          metadata: {
            packHistory: [
              { id: 'PACK-102', scope: 'All regions', status: 'Ready', createdAt: ago(290), items: 14, size: '6.8 MB' },
              { id: 'PACK-101', scope: 'UG only', status: 'Ready', createdAt: ago(940), items: 11, size: '5.2 MB' }
            ],
            invoiceCfg: {
              legalName: 'EVzone Marketplace',
              legalAddress: 'Millennium House, Nsambya Road 472, Kampala, Uganda',
              invoiceSeries: 'EVZ-INV',
              nextNumber: 12039,
              includeVatId: true,
              requireBuyerTaxIdForB2B: true,
              showPaymentRail: true,
              enableCreditNotes: true,
              enableEinvoicing: false
            }
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'kyc',
        payload: {
          status: 'Verified',
          documents: [
            { id: 'KYC-1001', title: 'Certificate of Incorporation', status: 'Approved', uploadedAt: ago(80 * 24 * 60), expiresAt: null, note: 'Core company registration' },
            { id: 'KYC-1002', title: 'TIN Certificate', status: 'Approved', uploadedAt: ago(65 * 24 * 60), expiresAt: null, note: 'Tax registration confirmed' },
            { id: 'KYC-1003', title: 'Trading License', status: 'Expiring', uploadedAt: ago(320 * 24 * 60), expiresAt: soon(22 * 24 * 60), note: 'Renewal needed this month' }
          ],
          metadata: {
            history: [
              { id: 'VH-1', at: ago(120 * 24 * 60), tier: 'Basic', result: 'Approved', reviewer: 'Compliance' },
              { id: 'VH-2', at: ago(22 * 24 * 60), tier: 'Verified', result: 'Approved', reviewer: 'Compliance' }
            ]
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'finance_home_ui',
        payload: {
          fx: { UGX_to_USD: 1 / 3800, KES_to_USD: 1 / 145, CNY_to_USD: 1 / 7.2 },
          balances: [
            { currency: 'UGX', available: 6240000, pending: 1180000, reserved: 420000, holds: 0 },
            { currency: 'USD', available: 1840.25, pending: 320, reserved: 120, holds: 210.5 },
            { currency: 'CNY', available: 9200, pending: 1500, reserved: 0, holds: 0 },
            { currency: 'KES', available: 92000, pending: 11000, reserved: 6000, holds: 0 }
          ],
          availableUsd: 5394.62,
          pendingUsd: 914.72,
          holdsUsd: 210.5,
          invoices: [
            { id: 'INV-12091', buyer: 'CorporatePay Org', amount: 'USD 840.00', status: 'Due', dueAt: soon(4320), channel: 'SupplierHub' },
            { id: 'INV-12088', buyer: 'Amina K.', amount: 'UGX 240,000', status: 'Sent', dueAt: soon(10080), channel: 'ExpressMart' },
            { id: 'INV-12072', buyer: 'Kato S.', amount: 'USD 120.00', status: 'Paid', dueAt: ago(2880), channel: 'MyLiveDealz' }
          ],
          transactions: [
            { id: 'TX-88901', at: ago(22), type: 'Sale', channel: 'SupplierHub', amount: '+USD 840.00', status: 'Settled', ref: 'ORD-10512' },
            { id: 'TX-88900', at: ago(58), type: 'Fee', channel: 'SupplierHub', amount: '-USD 12.50', status: 'Settled', ref: 'Commission' },
            { id: 'TX-88898', at: ago(130), type: 'Refund', channel: 'ExpressMart', amount: '-UGX 120,000', status: 'Pending', ref: 'RMA-2399' },
            { id: 'TX-88896', at: ago(210), type: 'Payout', channel: 'SupplierHub', amount: '-USD 250.00', status: 'Processing', ref: 'PAY-441' },
            { id: 'TX-88892', at: ago(460), type: 'Sale', channel: 'MyLiveDealz', amount: '+USD 120.00', status: 'Settled', ref: 'ADZ-501' }
          ],
          holds: [
            { id: 'HOLD-1190', reason: 'KYB expiry soon', amount: 'USD 210.50', status: 'Active', howToFix: 'Upload renewed KYB document' }
          ],
          payout: {
            nextAt: soon(2880),
            method: 'Bank transfer',
            currency: 'USD',
            estimate: 'USD 520.00',
            cadence: 'Weekly',
            holdsActive: 1
          },
          reconciliation: {
            state: 'Needs review',
            matchedPct: 92,
            unmatched: 3,
            note: '3 transactions need matching. Review refunds and fees.'
          },
          alerts: [
            { id: 'al1', tone: 'orange', title: 'Payout hold active', message: 'KYB renewal required to release USD holds.' },
            { id: 'al2', tone: 'slate', title: 'Multi-currency balances', message: 'Consider FX conversion before next payout.' },
            { id: 'al3', tone: 'orange', title: 'Refund pending', message: '1 refund pending confirmation (ExpressMart).' }
          ],
          kpis: {
            available: { value: 5394.62, delta: 4, spark: [72, 74, 73, 76, 79, 81, 84] },
            pending: { value: 914.72, delta: -2, spark: [18, 17, 16, 16, 15, 15, 14] },
            holds: { value: 210.5, delta: 9, spark: [2, 2, 3, 4, 5, 5, 6] },
            invoicesDue: { value: 2, delta: 0, spark: [1, 2, 2, 2, 2, 2, 2] }
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'finance_invoices_ui',
        payload: {
          invoices: [
            {
              id: 'INV-24019',
              customer: 'Kampala City Logistics Ltd',
              orderId: 'ORD-10512',
              currency: 'USD',
              status: 'Sent',
              createdAt: ago(8 * 24 * 60),
              dueAt: soon(4 * 24 * 60),
              paymentRail: 'CorporatePay',
              lines: [
                { name: 'EV Wallbox 7kW', qty: 4, unit: 620 },
                { name: 'Installation + commissioning', qty: 4, unit: 260 }
              ],
              taxRate: 0.02,
              notes: 'Includes onsite commissioning and OCPP configuration.',
              subtotal: 3520,
              tax: 70.4,
              total: 3590.4
            },
            {
              id: 'INV-24018',
              customer: 'Amina K.',
              orderId: 'ORD-10511',
              currency: 'USD',
              status: 'Paid',
              createdAt: ago(22 * 24 * 60),
              dueAt: ago(7 * 24 * 60),
              paidAt: ago(6 * 24 * 60),
              paymentRail: 'EVzone Pay Wallet',
              lines: [{ name: 'EV charging installation', qty: 1, unit: 320 }],
              taxRate: 0,
              notes: 'Paid via wallet.',
              subtotal: 320,
              tax: 0,
              total: 320
            },
            {
              id: 'INV-24017',
              customer: 'Nairobi Fleet Services',
              orderId: 'ORD-10510',
              currency: 'USD',
              status: 'Overdue',
              createdAt: ago(40 * 24 * 60),
              dueAt: ago(6 * 24 * 60),
              paymentRail: 'Standard Checkout',
              lines: [
                { name: 'Type 2 charging cables 5m', qty: 120, unit: 28 },
                { name: 'Packaging + docs', qty: 1, unit: 120 }
              ],
              taxRate: 0,
              notes: 'Buyer requested revised delivery window.',
              subtotal: 3480,
              tax: 0,
              total: 3480
            },
            {
              id: 'INV-24016',
              customer: 'Moses N.',
              orderId: 'ORD-10509',
              currency: 'USD',
              status: 'Draft',
              createdAt: ago(2 * 24 * 60),
              dueAt: soon(14 * 24 * 60),
              paymentRail: 'EVzone Pay Wallet',
              lines: [{ name: 'E-bike battery pack 48V 20Ah', qty: 6, unit: 248 }],
              taxRate: 0,
              notes: 'Draft waiting for final freight cost.',
              subtotal: 1488,
              tax: 0,
              total: 1488
            },
            {
              id: 'INV-24015',
              customer: 'Chen L.',
              orderId: 'ORD-10508',
              currency: 'CNY',
              status: 'Sent',
              createdAt: ago(12 * 24 * 60),
              dueAt: soon(24 * 60),
              paymentRail: 'Standard Checkout',
              lines: [
                { name: 'Bulk e-bike batteries', qty: 30, unit: 1750 },
                { name: 'Export docs', qty: 1, unit: 480 }
              ],
              taxRate: 0,
              notes: 'FOB Shanghai. Export docs included.',
              subtotal: 52980,
              tax: 0,
              total: 52980
            },
            {
              id: 'INV-24014',
              customer: 'Sarah T.',
              orderId: 'ORD-10507',
              currency: 'USD',
              status: 'Void',
              createdAt: ago(65 * 24 * 60),
              dueAt: ago(50 * 24 * 60),
              paymentRail: 'CorporatePay',
              lines: [{ name: 'Warehouse to port logistics setup', qty: 1, unit: 190 }],
              taxRate: 0,
              notes: 'Voided due to duplicate billing.',
              subtotal: 190,
              tax: 0,
              total: 190
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'finance_holds_ui',
        payload: {
          holds: [
            {
              id: 'HOLD-9012',
              type: 'KYC_PENDING',
              title: 'Identity verification required',
              reason: 'KYC/KYB is incomplete. Settlements cannot be released until verification is approved.',
              severity: 'High',
              status: 'Active',
              currency: 'USD',
              blockedAmount: 14820.5,
              affectedWallet: 'Payout Wallet',
              createdAt: ago(18 * 60),
              updatedAt: ago(2 * 60),
              evidence: [
                { id: 'ev1', name: 'passport_scan.jpg', status: 'Missing' },
                { id: 'ev2', name: 'proof_of_address.pdf', status: 'Required' }
              ],
              steps: [
                { id: 's1', label: 'Upload identity document', state: 'todo' },
                { id: 's2', label: 'Upload proof of address', state: 'todo' },
                { id: 's3', label: 'Wait for review', state: 'blocked' }
              ]
            },
            {
              id: 'HOLD-9007',
              type: 'CHARGEBACK_RISK',
              title: 'Chargeback risk hold',
              reason: 'A dispute is under review. Funds are held until the case is resolved.',
              severity: 'Medium',
              status: 'Active',
              currency: 'USD',
              blockedAmount: 920,
              affectedWallet: 'Sales Wallet',
              createdAt: ago(60 * 60),
              updatedAt: ago(6 * 60),
              evidence: [{ id: 'ev3', name: 'shipping_label.pdf', status: 'Uploaded' }],
              steps: [
                { id: 's1', label: 'Upload proof of delivery', state: 'todo' },
                { id: 's2', label: 'Respond to dispute', state: 'todo' },
                { id: 's3', label: 'Wait for decision', state: 'blocked' }
              ]
            },
            {
              id: 'HOLD-8999',
              type: 'TAX_PROFILE',
              title: 'Tax profile missing',
              reason: 'Tax settings are required for payouts in this region. Add VAT/TIN and invoice template.',
              severity: 'Low',
              status: 'Active',
              currency: 'KES',
              blockedAmount: 184500,
              affectedWallet: 'Payout Wallet',
              createdAt: ago(120 * 60),
              updatedAt: ago(24 * 60),
              evidence: [{ id: 'ev4', name: 'vat_certificate.pdf', status: 'Missing' }],
              steps: [
                { id: 's1', label: 'Add tax ID (VAT/TIN)', state: 'todo' },
                { id: 's2', label: 'Upload tax certificate', state: 'todo' },
                { id: 's3', label: 'Confirm invoice format', state: 'todo' }
              ]
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'finance_statements_ui',
        payload: {
          statements: [
            {
              id: 'STM-2026-02',
              periodStart: ago(16 * 24 * 60),
              periodEnd: ago(24 * 60),
              currency: 'USD',
              openingBalance: 1250,
              closingBalance: 1895.4,
              inflow: 1120.2,
              outflow: 474.8,
              generatedAt: ago(24 * 60),
              status: 'Ready',
              lines: [
                { id: 't1', at: ago(12 * 24 * 60), type: 'Credit', source: 'Invoice Payment', ref: 'INV-24018', amount: 326.4, note: 'Paid' },
                { id: 't2', at: ago(10 * 24 * 60), type: 'Debit', source: 'Payout', ref: 'PO-77411', amount: -180, note: 'Weekly settlement' },
                { id: 't3', at: ago(8 * 24 * 60), type: 'Credit', source: 'Order', ref: 'ORD-10512', amount: 560, note: 'Delivered' },
                { id: 't4', at: ago(6 * 24 * 60), type: 'Debit', source: 'Fee', ref: 'FEE-2091', amount: -24.8, note: 'Processing' },
                { id: 't5', at: ago(3 * 24 * 60), type: 'Credit', source: 'Partial Payment', ref: 'INV-24016', amount: 233.8, note: 'Partial' }
              ]
            },
            {
              id: 'STM-2026-01',
              periodStart: ago(46 * 24 * 60),
              periodEnd: ago(18 * 24 * 60),
              currency: 'USD',
              openingBalance: 820,
              closingBalance: 1250,
              inflow: 690,
              outflow: 260,
              generatedAt: ago(18 * 24 * 60),
              status: 'Ready',
              lines: [
                { id: 't6', at: ago(40 * 24 * 60), type: 'Credit', source: 'Invoice Payment', ref: 'INV-24012', amount: 420, note: 'Paid' },
                { id: 't7', at: ago(33 * 24 * 60), type: 'Debit', source: 'Chargeback Reserve', ref: 'RES-113', amount: -80, note: 'Hold' },
                { id: 't8', at: ago(26 * 24 * 60), type: 'Credit', source: 'Release Reserve', ref: 'RES-113', amount: 80, note: 'Released' },
                { id: 't9', at: ago(22 * 24 * 60), type: 'Debit', source: 'Payout', ref: 'PO-77001', amount: -180, note: 'Weekly settlement' }
              ]
            },
            {
              id: 'STM-2025-12',
              periodStart: ago(76 * 24 * 60),
              periodEnd: ago(47 * 24 * 60),
              currency: 'CNY',
              openingBalance: 8620,
              closingBalance: 8620,
              inflow: 0,
              outflow: 0,
              generatedAt: ago(46 * 24 * 60),
              status: 'Ready',
              lines: [
                { id: 't10', at: ago(60 * 24 * 60), type: 'Credit', source: 'Order', ref: 'ORD-10506', amount: 8620, note: 'Delivered' }
              ]
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'finance_tax_reports_ui',
        payload: {
          reports: [
            {
              id: 'TAX-2026-01-UG-VAT',
              period: 'Jan 2026',
              region: 'Uganda',
              taxType: 'VAT',
              currency: 'UGX',
              grossSales: 184000000,
              taxableSales: 122000000,
              vatCollected: 21960000,
              exports: 41000000,
              status: 'Draft',
              createdAt: ago(12 * 24 * 60),
              updatedAt: ago(2 * 24 * 60),
              readiness: { rules: 'Ready', invoices: 'Warning', fx: 'Ready', evidence: 'Warning' }
            },
            {
              id: 'TAX-2025-Q4-KE-VAT',
              period: 'Q4 2025',
              region: 'Kenya',
              taxType: 'VAT',
              currency: 'KES',
              grossSales: 9820000,
              taxableSales: 7210000,
              vatCollected: 1153600,
              exports: 1020000,
              status: 'Filed',
              createdAt: ago(64 * 24 * 60),
              updatedAt: ago(46 * 24 * 60),
              readiness: { rules: 'Ready', invoices: 'Ready', fx: 'Ready', evidence: 'Ready' }
            },
            {
              id: 'TAX-2025-12-CN-EXPORT',
              period: 'Dec 2025',
              region: 'China',
              taxType: 'Export summary',
              currency: 'CNY',
              grossSales: 2840000,
              taxableSales: 0,
              vatCollected: 0,
              exports: 2840000,
              status: 'Ready',
              createdAt: ago(38 * 24 * 60),
              updatedAt: ago(7 * 24 * 60),
              readiness: { rules: 'Ready', invoices: 'Ready', fx: 'Warning', evidence: 'Ready' }
            }
          ]
        }
      }
    ]
  });

  await prisma.review.createMany({
    data: [
      {
        id: 'seller_provider_review_1',
        reviewerUserId: users.creator.id,
        subjectType: 'SELLER',
        subjectId: sellerId,
        subjectUserId: sellerUserId,
        title: 'EV installation support',
        buyerName: 'Amina K.',
        buyerType: 'Buyer',
        roleTarget: 'provider',
        itemType: 'service',
        channel: 'EVzone',
        marketplace: 'Seller',
        mldzSurface: 'service',
        sentiment: 'positive',
        requiresResponse: true,
        ratingOverall: 5,
        quickTags: ['Communication', 'Quality'],
        issueTags: [],
        reviewText: 'Very professional and fast. Communication was clear and the work quality exceeded expectations.',
        wouldJoinAgain: true,
        transactionIntent: 'bought',
        status: 'PUBLISHED',
        createdAt: new Date(ago(65))
      },
      {
        id: 'seller_provider_review_2',
        reviewerUserId: users.creator.id,
        subjectType: 'SELLER',
        subjectId: sellerId,
        subjectUserId: sellerUserId,
        title: 'Fleet audit follow-up',
        buyerName: 'Moses N.',
        buyerType: 'Buyer',
        roleTarget: 'provider',
        itemType: 'service',
        channel: 'EVzone',
        marketplace: 'Seller',
        mldzSurface: 'service',
        sentiment: 'negative',
        requiresResponse: true,
        ratingOverall: 2,
        quickTags: ['Pricing'],
        issueTags: ['Support'],
        reviewText: 'Pricing was higher than expected and I did not get quick support after payment.',
        wouldJoinAgain: false,
        transactionIntent: 'none',
        status: 'PUBLISHED',
        createdAt: new Date(ago(420))
      }
    ]
  });

  await prisma.reviewReply.createMany({
    data: [
      {
        id: 'seller_provider_review_reply_1',
        reviewId: 'seller_provider_review_1',
        authorUserId: sellerUserId,
        body: 'Thank you, Amina. We appreciate the trust and we are always here to support you.',
        visibility: 'PUBLIC',
        createdAt: new Date(ago(22))
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
  await prisma.liveCampaignGiveaway.deleteMany();
  await prisma.promoAd.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.supportContent.deleteMany();
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
  await seedSellerRuntimeMockReplacements(users, sellerProfiles);
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
