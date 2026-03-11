import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { scryptSync } from 'node:crypto';

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
      },
      {
        id: 'desk_faithmart',
        userId: sellerUserId,
        slug: 'faithmart',
        title: 'FaithMart Desk',
        status: 'active',
        metadata: {
          pageData: {
            categories: [
              { id: 'books', label: 'Books & Study' },
              { id: 'music', label: 'Music & Media' },
              { id: 'apparel', label: 'Apparel & Accessories' },
              { id: 'home', label: 'Home & Decor' },
              { id: 'events', label: 'Events & Tickets' },
              { id: 'services', label: 'Services' },
              { id: 'community', label: 'Community' }
            ],
            orgs: [
              { id: 'org1', name: 'BrightPath Publishers', type: 'Publisher', verified: true, focus: 'Books, study guides, educational content' },
              { id: 'org2', name: 'Harmony Choir Studio', type: 'Media', verified: true, focus: 'Music, audio sessions, digital albums' },
              { id: 'org3', name: 'Community Care Network', type: 'Charity', verified: false, focus: 'Community support, donations, outreach' }
            ],
            items: [
              { id: 'FM-1001', kind: 'Product', category: 'Books & Study', title: 'Faith Study Journal (Hardcover)', vendor: 'BrightPath Publishers', verified: true, retail: 16.5, wholesale: 12, moq: 10, currency: 'USD', tags: ['journal', 'study'], desc: 'Premium hardcover journal designed for study notes, reflections, and group sessions.' },
              { id: 'FM-1002', kind: 'Digital', category: 'Music & Media', title: 'Guided Audio Session Pack', vendor: 'Harmony Choir Studio', verified: true, retail: 9.99, wholesale: 7.5, moq: 5, currency: 'USD', tags: ['audio', 'download'], desc: 'Curated guided audio sessions with instant access after payment.' },
              { id: 'FM-1003', kind: 'Service', category: 'Services', title: 'Counselling Session (Online)', vendor: 'Community Care Network', verified: false, retail: 25, wholesale: 22, moq: 1, currency: 'USD', tags: ['session', 'support'], desc: 'A private session with a qualified counsellor.' },
              { id: 'FM-1004', kind: 'Event', category: 'Events & Tickets', title: 'Community Music Night Ticket', vendor: 'Harmony Choir Studio', verified: true, retail: 5, wholesale: 4, moq: 20, currency: 'USD', tags: ['ticket', 'community'], desc: 'Entry ticket for a community music night with QR check-in.' }
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
        key: 'seller_asset_library_context',
        payload: {
          creators: [
            {
              id: 'cr_1',
              name: 'Amina K.',
              handle: '@amina.dealz',
              avatarUrl: 'https://i.pravatar.cc/120?img=32'
            },
            {
              id: 'cr_2',
              name: 'Chris M.',
              handle: '@chris.finds',
              avatarUrl: 'https://i.pravatar.cc/120?img=12'
            },
            {
              id: 'cr_3',
              name: 'Luna Ade',
              handle: '@lunaade',
              avatarUrl: 'https://i.pravatar.cc/120?img=7'
            }
          ],
          suppliers: [
            {
              id: 'sp_1',
              name: 'GlowUp Hub',
              kind: 'Seller',
              brand: 'GlowUp'
            },
            {
              id: 'sp_2',
              name: 'Urban Supply',
              kind: 'Seller',
              brand: 'Urban'
            },
            {
              id: 'sp_3',
              name: 'EV World Store',
              kind: 'Seller',
              brand: 'EV World'
            }
          ],
          campaigns: [
            {
              id: 'cp_1',
              supplierId: 'sp_1',
              name: 'Valentine Glow Week',
              brand: 'GlowUp',
              status: 'Active',
              supplierReviewMode: 'Manual'
            },
            {
              id: 'cp_2',
              supplierId: 'sp_2',
              name: 'Back-to-Work Essentials',
              brand: 'Urban',
              status: 'Active',
              supplierReviewMode: 'Manual'
            },
            {
              id: 'cp_3',
              supplierId: 'sp_3',
              name: 'EV Charger Flash Drop',
              brand: 'EV World',
              status: 'Paused',
              supplierReviewMode: 'Auto'
            }
          ],
          deliverables: [
            {
              id: 'dv_1',
              campaignId: 'cp_1',
              label: 'Hero intro video',
              dueDateLabel: 'Tomorrow'
            },
            {
              id: 'dv_2',
              campaignId: 'cp_1',
              label: 'Featured item poster',
              dueDateLabel: 'In 2 days'
            },
            {
              id: 'dv_3',
              campaignId: 'cp_2',
              label: 'Unboxing clip',
              dueDateLabel: 'In 3 days'
            },
            {
              id: 'dv_4',
              campaignId: 'cp_3',
              label: 'Live opener',
              dueDateLabel: 'Today'
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'seller_dealz_marketplace_legacy',
        payload: {
          suppliers: [
            {
              name: 'EV Hub Supplier',
              category: 'Retail',
              logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop'
            },
            {
              name: 'Global Traders',
              category: 'Wholesale',
              logoUrl: 'https://images.unsplash.com/photo-1554774853-719586f8c277?w=100&h=100&fit=crop'
            }
          ],
          creators: [
            {
              name: 'Asha K',
              handle: '@asha',
              avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
              verified: true
            },
            {
              name: 'John Smith',
              handle: '@john',
              avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
            }
          ],
          templates: {
            shoppable: {
              status: 'Draft',
              campaignName: 'New Campaign',
              campaignSubtitle: 'New deal draft',
              supplier: {
                name: 'EV Hub Supplier',
                category: 'Retail',
                logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop'
              },
              creator: {
                name: 'Asha K',
                handle: '@asha',
                avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                verified: true
              },
              platforms: ['Instagram', 'TikTok'],
              startISO: soon(1440),
              endISO: soon(1500),
              heroImageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=1200&auto=format&fit=crop',
              ctaPrimaryLabel: 'Shop now',
              ctaSecondaryLabel: 'View details',
              offers: [
                {
                  id: 'offer_template_1',
                  type: 'PRODUCT',
                  name: 'Featured offer',
                  price: 120,
                  currency: 'USD',
                  stockLeft: 25,
                  sold: 0,
                  posterUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&h=500&q=70'
                }
              ],
              kpis: []
            },
            live: {
              status: 'Draft',
              title: 'New Campaign Live',
              description: 'Draft live session created from Dealz Marketplace. Add run-of-show, featured items, and destinations in Live Builder.',
              host: {
                name: 'Asha K',
                handle: '@asha',
                avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                verified: true
              },
              supplier: {
                name: 'EV Hub Supplier',
                category: 'Retail',
                logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop'
              },
              platforms: ['Instagram', 'TikTok'],
              startISO: soon(1440),
              endISO: soon(1500),
              timezoneLabel: 'GMT+3',
              promoLink: 'https://mldz.link/live_template',
              heroImageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
              featured: []
            }
          },
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
        key: 'messages_page',
        payload: {
          tagOptions: ['Order', 'RFQ', 'Proposal', 'Support'],
          templates: [
            {
              id: 'tpl_1',
              title: 'Dispatch confirmed',
              category: 'Shipping',
              body: 'Your order has been dispatched.',
              pinned: true
            }
          ]
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
          ],
          playbooks: [
            {
              id: 'PB-ORD-01',
              title: 'Orders: Missing tracking after shipped',
              category: 'Orders',
              level: 'P1',
              goal: 'Prevent disputes by updating tracking and uploading proofs.',
              triggers: ['Order Shipped status set', 'Tracking blank', 'Buyer asks for tracking'],
              checklist: ['Confirm carrier and tracking number', 'Upload shipping label as proof', 'Send buyer an ETA update', 'If tracking invalid: verify label generation and resubmit'],
              escalateWhen: ['Buyer opens dispute', 'Carrier cannot find tracking after 24h'],
              templates: ['Update: Your order has shipped. Tracking: {tracking}. ETA: {eta}.']
            },
            {
              id: 'PB-PAY-01',
              title: 'Payments: Charge captured but order not created',
              category: 'Payments',
              level: 'P0',
              goal: 'Recover order state or initiate refund safely.',
              triggers: ['Buyer reports charge', 'No order record', 'Webhook delay'],
              checklist: ['Ask for payment reference', 'Check payment events timeline', 'If captured: create manual order or refund', 'If pending: wait for auto-reversal window'],
              escalateWhen: ['Captured with no reconciliation', 'Multiple failures for same buyer'],
              templates: ['Thanks. Please share the payment reference and time. We will reconcile and respond shortly.']
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
        key: 'profile',
        payload: {
          profile: {
            identity: {
              displayName: 'EV Hub Supplier',
              legalName: 'EV Hub Supplier Ltd',
              handle: 'evhub-supplier',
              email: 'seller@evhub.com',
              phone: '+256700000001',
              website: 'https://seller.evhub.com'
            },
            branding: {
              logoName: 'evhub-logo.png',
              coverName: 'evhub-cover.png',
              description: 'EV Hub Supplier delivers chargers, accessories, field installs, and regulated marketplace support across East Africa.',
              tagline: 'EV commerce with compliant fulfillment',
              primaryColor: '#03CD8C',
              accentColor: '#F77F00'
            },
            addresses: [
              { id: 'ADDR-1001', label: 'HQ', type: 'Office', line1: 'Millennium House, Nsambya Road', city: 'Kampala', region: 'Central', country: 'UG', isDefault: true, updatedAt: ago(320) },
              { id: 'ADDR-1002', label: 'Warehouse', type: 'Warehouse', line1: 'Mbalwa Industrial Park', city: 'Kampala', region: 'Central', country: 'UG', isDefault: false, updatedAt: ago(860) }
            ],
            stores: [
              { id: 'store_global', name: 'EV Hub Global', handle: 'evhub-global', region: 'Global', status: 'Active' },
              { id: 'store_ea', name: 'EV Hub East Africa', handle: 'evhub-ea', region: 'East Africa', status: 'Planned' }
            ],
            productLines: [
              {
                id: 'category-dc-fast-chargers-1',
                nodeId: 'category-dc-fast-chargers',
                path: [
                  { id: 'marketplace-ev', name: 'EVmart', type: 'Marketplace' },
                  { id: 'family-chargers', name: 'Chargers', type: 'Family' },
                  { id: 'category-dc-fast-chargers', name: 'DC Fast Chargers', type: 'Category' }
                ],
                status: 'active'
              },
              {
                id: 'category-desktops-1',
                nodeId: 'category-desktops',
                path: [
                  { id: 'marketplace-tech', name: 'TechMart', type: 'Marketplace' },
                  { id: 'family-computers', name: 'Computers', type: 'Family' },
                  { id: 'category-desktops', name: 'Desktops', type: 'Category' }
                ],
                status: 'active'
              }
            ],
            regions: ['UG', 'KE', 'TZ', 'RW'],
            supportHours: {
              weekdays: '08:00-18:00',
              saturday: '09:00-14:00',
              sunday: 'Closed'
            },
            socials: {
              facebook: 'evhubsupplier',
              instagram: 'evhubsupplier',
              twitter: 'evhubsupplier',
              youtube: '',
              linkedin: 'company/evhub-supplier',
              tiktok: ''
            },
            customSocials: [{ id: 'social_1', name: 'WhatsApp', handle: '+256700000001' }]
          }
        }
      },
      {
        userId: sellerUserId,
        key: 'seller_cart',
        payload: {
          id: 'cart_default',
          items: [],
          updatedAt: ago(5)
        }
      },
      {
        userId: sellerUserId,
        key: 'analytics_page',
        payload: {
          marketplaceOptions: ['All', 'EVmart', 'MyLiveDealz'],
          overviewKpis: [
            { label: 'Gross sales', value: '$18.9k', delta: '+14.2%', hint: 'All tracked channels' },
            { label: 'Conversion', value: '3.8%', delta: '+0.6%', hint: 'Sessions to purchase' },
            { label: 'ROAS', value: '4.6x', delta: '+0.4x', hint: 'Paid campaign efficiency' },
          ],
          attributionRows: [
            { channel: 'Organic search', share: 34, roas: 5.2, note: 'Strong charger category demand' },
            { channel: 'Creator campaigns', share: 28, roas: 6.1, note: 'MyLiveDealz traffic converted best' },
            { channel: 'WhatsApp re-orders', share: 18, roas: 4.3, note: 'Repeat customers retained' },
          ],
          highlights: {
            topDriver: 'Creator campaigns lifted converter traffic on EVmart chargers.',
            risk: 'Conversion softens when stock falls below safety threshold.',
            recommendation: 'Shift ad spend toward bundles that keep margin above 24%.'
          },
          cohort: {
            subtitle: 'Repeat buyers stay strongest after creator-assisted launches.',
            bullets: [
              'Week-1 retention holds above 62% for creator-campaign cohorts.',
              'Wholesale-origin traffic has the highest repeat basket size.',
              'Low-stock weeks correlate with weaker conversion recovery.'
            ]
          },
          alertRules: [
            { id: 'rule_conv_drop', name: 'Conversion drop', metric: 'Conversion', condition: 'drops', threshold: 12, window: '7D', enabled: true },
            { id: 'rule_roas_spike', name: 'ROAS spike', metric: 'ROAS', condition: 'rises', threshold: 20, window: '30D', enabled: true }
          ],
          metricOptions: ['Conversion', 'ROAS', 'Gross sales', 'Sessions', 'Average order value']
        }
      },
      {
        userId: sellerUserId,
        key: 'roles',
        payload: {
          roles: [
            {
              id: 'role_owner',
              name: 'Owner',
              badge: 'System',
              description: 'Full access, can manage billing, teams and security.',
              perms: {
                'roles.manage': true,
                'admin.manage_roles': true,
                'admin.manage_team': true,
                'admin.audit': true,
                'orders.view': true,
                'orders.edit': true,
                'orders.fulfill': true,
                'orders.refund': true,
                'orders.export': true,
                'listings.view': true,
                'listings.create': true,
                'listings.edit': true,
                'listings.publish': true,
                'listings.delete': true,
                'listings.compliance': true,
                'wholesale.rfq.view': true,
                'wholesale.rfq.reply': true,
                'wholesale.quotes.create': true,
                'wholesale.quotes.send': true,
                'wholesale.pricing.manage': true,
                'finance.view': true,
                'finance.payouts.manage': true,
                'finance.payouts.initiate': true,
                'finance.invoices.manage': true,
                'finance.reports.export': true,
                'mldz.view': true,
                'mldz.live.manage': true,
                'mldz.adz.manage': true,
                'mldz.deliverables.manage': true,
                'mldz.contracts.manage': true,
                'support.messages': true,
                'support.disputes': true,
                'support.returns': true,
                'compliance.desks': true,
                'compliance.holds': true,
                'settings.view': true,
                'settings.teams.manage': true,
                'settings.integrations.manage': true,
                'settings.security.manage': true,
                'settings.audit.view': true
              }
            },
            {
              id: 'role_ops',
              name: 'Operations',
              badge: 'System',
              description: 'Fulfillment, listings compliance, returns and disputes.',
              perms: {
                'orders.view': true,
                'orders.edit': true,
                'orders.fulfill': true,
                'orders.export': true,
                'listings.view': true,
                'listings.edit': true,
                'listings.publish': true,
                'listings.compliance': true,
                'support.disputes': true,
                'support.returns': true,
                'compliance.desks': true,
                'settings.view': true
              }
            },
            {
              id: 'role_sales',
              name: 'Sales',
              badge: 'System',
              description: 'Listings, light orders view, MyLiveDealz promotions.',
              perms: {
                'orders.view': true,
                'orders.export': true,
                'listings.view': true,
                'listings.create': true,
                'listings.edit': true,
                'listings.publish': true,
                'mldz.view': true,
                'mldz.adz.manage': true,
                'support.messages': true,
                'settings.view': true
              }
            },
            {
              id: 'role_finance',
              name: 'Finance',
              badge: 'System',
              description: 'Wallets, invoices, reporting. Payout initiation optional.',
              perms: {
                'finance.view': true,
                'finance.payouts.manage': true,
                'finance.invoices.manage': true,
                'finance.reports.export': true,
                'orders.view': true,
                'orders.export': true,
                'settings.view': true
              }
            },
            {
              id: 'role_viewer',
              name: 'Viewer',
              badge: 'System',
              description: 'Read-only access across key areas.',
              perms: {
                'orders.view': true,
                'listings.view': true,
                'wholesale.rfq.view': true,
                'finance.view': true,
                'mldz.view': true,
                'support.messages': true,
                'settings.view': true,
                'settings.audit.view': true
              }
            }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'members',
        payload: {
          members: [
            { id: 'member_owner', name: 'Seller Owner', email: 'seller@evhub.com', roleId: 'role_owner', status: 'active', seat: 'Owner', createdAt: ago(6000), updatedAt: ago(12) },
            { id: 'member_ops', name: 'Amina K.', email: 'ops@supplier.com', roleId: 'role_ops', status: 'active', seat: 'Team', createdAt: ago(4200), updatedAt: ago(80) },
            { id: 'member_sales', name: 'Kato S.', email: 'sales@supplier.com', roleId: 'role_sales', status: 'invited', seat: 'Team', createdAt: ago(3000), updatedAt: ago(999) },
            { id: 'member_finance', name: 'Sarah T.', email: 'finance@supplier.com', roleId: 'role_finance', status: 'active', seat: 'Finance', createdAt: ago(2400), updatedAt: ago(320) },
            { id: 'member_viewer', name: 'Chen L.', email: 'viewer@supplier.com', roleId: 'role_viewer', status: 'suspended', seat: 'Viewer', createdAt: ago(1800), updatedAt: ago(6000) }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'role_invites',
        payload: {
          invites: [
            { id: 'member_sales', name: 'Kato S.', email: 'sales@supplier.com', roleId: 'role_sales', status: 'invited', seat: 'Team', createdAt: ago(3000) }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'roles_security',
        payload: {
          require2FA: true,
          allowExternalInvites: false,
          supplierGuestExpiryHours: 24,
          inviteDomainAllowlist: ['evhub.com', 'supplier.com'],
          requireApprovalForPayouts: true,
          payoutApprovalThresholdUsd: 500,
          restrictSensitiveExports: true,
          sessionTimeoutMins: 60
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_overview_page',
        payload: {
          kpis: {
            ordersRisk: { value: 7, delta: 9, spark: [4, 5, 6, 4, 7, 8, 7] },
            pendingRmas: { value: 3, delta: -12, spark: [6, 5, 5, 4, 3, 3, 3] },
            openDisputes: { value: 2, delta: 0, spark: [2, 2, 3, 2, 2, 2, 2] },
            lowStock: { value: 11, delta: 6, spark: [8, 9, 9, 10, 11, 11, 11] },
            exportJobs: { value: 1, delta: -50, spark: [3, 2, 2, 2, 1, 1, 1] },
            complianceDue: { value: 4, delta: 14, spark: [2, 2, 3, 3, 4, 4, 4] }
          },
          dailyCommand: [
            { id: 'cmd1', title: 'Resolve SLA risks', detail: '3 orders are within 2 hours of SLA breach', priority: 'High', cta: 'Open orders' },
            { id: 'cmd2', title: 'Approve pending RMAs', detail: '2 RMAs waiting on decision', priority: 'Normal', cta: 'Review returns' },
            { id: 'cmd3', title: 'Restock low stock SKUs', detail: '5 SKUs below threshold in Kampala warehouse', priority: 'High', cta: 'Open inventory' },
            { id: 'cmd4', title: 'Compliance tasks due', detail: '2 tasks due within 7 days', priority: 'Normal', cta: 'Open compliance' }
          ],
          queues: {
            Orders: [
              { id: 'ORD-10512', status: 'Packed', sla: '1h 40m', risk: 'High', warehouse: 'Kampala', total: 'UGX 1,240,000' },
              { id: 'ORD-10508', status: 'Confirmed', sla: '4h 10m', risk: 'Watch', warehouse: 'Wuxi', total: 'USD 840' }
            ],
            Returns: [
              { id: 'RMA-2401', reason: 'Damaged', stage: 'Awaiting approval', amount: 'USD 120', age: '6h' }
            ],
            Disputes: [
              { id: 'DSP-901', type: 'Chargeback', risk: 86, next: 'Upload evidence', due: 'Today' }
            ],
            Inventory: [
              { sku: 'CHG-7KW-WBX', available: 7, reserved: 4, cover: '3d', action: 'Restock' }
            ],
            Compliance: [
              { task: 'Update KYB document expiry', desk: 'Compliance Center', due: '7 days', status: 'Action needed' }
            ]
          },
          alerts: [
            { id: 'al1', title: 'Low stock risk', message: '5 SKUs below threshold in Kampala', tone: 'orange' },
            { id: 'al2', title: 'SLA breach risk', message: '2 orders are within 2 hours of SLA', tone: 'danger' }
          ],
          health: [
            { service: 'Warehouse sync', status: 'Operational', last: ago(11) },
            { service: 'Messaging', status: 'Degraded', last: ago(22) }
          ],
          activity: [
            { at: ago(12), who: 'System', what: 'Inventory adjustment recorded', ref: 'SKU CHG-7KW-WBX' },
            { at: ago(35), who: 'Ops', what: 'Order moved to Packed', ref: 'ORD-10512' }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_inventory_page',
        payload: {
          items: [
            {
              id: 'SKU-1001',
              sku: 'CHG-7KW-WBX',
              name: 'EV Wallbox Charger 7kW',
              category: 'Chargers',
              unit: 'pcs',
              reorderPoint: 8,
              leadDays: 18,
              velocityPerDay: 0.55,
              warehouses: [
                { id: 'wh1', name: 'Main Warehouse', onHand: 22, reserved: 3 },
                { id: 'wh2', name: 'Kampala Hub', onHand: 8, reserved: 1 }
              ],
              updatedAt: ago(22)
            },
            {
              id: 'SKU-1002',
              sku: 'BAT-48V-20AH',
              name: 'E-Bike Battery Pack 48V 20Ah',
              category: 'Batteries',
              unit: 'pcs',
              reorderPoint: 15,
              leadDays: 25,
              velocityPerDay: 1.9,
              warehouses: [
                { id: 'wh1', name: 'Main Warehouse', onHand: 36, reserved: 6 },
                { id: 'wh3', name: 'Nairobi Hub', onHand: 14, reserved: 3 }
              ],
              updatedAt: ago(75)
            },
            {
              id: 'SKU-1003',
              sku: 'CAB-T2-5M',
              name: 'Type 2 Charging Cable 5m',
              category: 'Accessories',
              unit: 'pcs',
              reorderPoint: 80,
              leadDays: 14,
              velocityPerDay: 8.5,
              warehouses: [{ id: 'wh1', name: 'Main Warehouse', onHand: 160, reserved: 22 }],
              updatedAt: ago(145)
            }
          ],
          activeSku: 'CHG-7KW-WBX',
          audit: [
            { id: 'AUD-2003', sku: 'PLUG-CCS2', warehouse: 'Main Warehouse', deltaOnHand: -6, deltaReserved: 0, reason: 'Damage write-off', actor: 'Ops', createdAt: ago(34) },
            { id: 'AUD-2002', sku: 'RFID-CARD', warehouse: 'Kampala Hub', deltaOnHand: 120, deltaReserved: 0, reason: 'Restock arrival', actor: 'Ops', createdAt: ago(98) },
            { id: 'AUD-2001', sku: 'BAT-48V-20AH', warehouse: 'Nairobi Hub', deltaOnHand: 0, deltaReserved: 4, reason: 'Order reservations', actor: 'System', createdAt: ago(190) }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'ops_compliance_page',
        payload: {
          cases: [
            {
              id: 'CMP-90021',
              subjectType: 'Listing',
              subjectId: 'L-1002',
              subjectTitle: 'E-Bike Battery Pack 48V 20Ah',
              marketplace: 'EVmart',
              category: 'Documents',
              desk: 'HealthMart',
              severity: 'High',
              status: 'Awaiting Docs',
              createdAt: ago(384),
              dueAt: soon(300),
              issues: ['Missing MSDS upload', 'Warranty terms not set'],
              requiredDocs: ['MSDS', 'Warranty terms'],
              evidence: 1,
              notes: 'Battery listings require MSDS and warranty statement.',
              timeline: [{ at: ago(384), who: 'System', event: 'Flagged missing required documents' }]
            },
            {
              id: 'CMP-90020',
              subjectType: 'Account',
              subjectId: 'KYB',
              subjectTitle: 'KYB verification',
              marketplace: 'SupplierHub',
              category: 'Verification',
              desk: 'General',
              severity: 'Medium',
              status: 'Open',
              createdAt: ago(1080),
              dueAt: soon(1440),
              issues: ['Missing company registration certificate', 'Director ID not uploaded'],
              requiredDocs: ['Company registration', 'Director ID'],
              evidence: 0,
              notes: 'Complete KYB to prevent payout delays.',
              timeline: [{ at: ago(1080), who: 'System', event: 'KYB incomplete' }]
            }
          ],
          docs: [
            { id: 'DOC-201', name: 'Company registration certificate', type: 'KYB', status: 'Missing', updatedAt: null, versions: [] },
            { id: 'DOC-202', name: 'Director ID', type: 'KYB', status: 'Uploaded', updatedAt: ago(2880), versions: [{ at: ago(2880), note: 'Initial upload' }] },
            { id: 'DOC-203', name: 'MSDS (Batteries)', type: 'Safety', status: 'Missing', updatedAt: null, versions: [] }
          ]
        }
      },
      {
        userId: sellerUserId,
        key: 'regulatory_overview_page',
        payload: {
          submissions: [
            { id: 'SUB-22091', desk: 'healthmart', subdesk: 'Pharmacy', type: 'Product', itemName: 'OTC Pain Reliever Pack (Retail)', status: 'Needs changes', risk: 72, docsCompletePct: 64, dueAt: soon(2880), updatedAt: ago(90), notesCount: 2, evidenceReady: false, signals: ['Restricted category', 'Labeling'] },
            { id: 'SUB-22088', desk: 'healthmart', subdesk: 'Logistics', type: 'Service', itemName: 'Cold-chain delivery service', status: 'Under review', risk: 44, docsCompletePct: 86, dueAt: soon(7200), updatedAt: ago(45), notesCount: 1, evidenceReady: true, signals: ['License present', 'Route coverage'] },
            { id: 'SUB-22080', desk: 'edumart', type: 'Content', itemName: 'Children STEM video course', status: 'Submitted', risk: 38, docsCompletePct: 78, dueAt: soon(10080), updatedAt: ago(240), notesCount: 0, evidenceReady: false, signals: ['Child-safe', 'Age gating'] },
            { id: 'SUB-22072', desk: 'faithmart', type: 'Content', itemName: 'Community event poster pack', status: 'Approved', risk: 12, docsCompletePct: 100, dueAt: soon(43200), updatedAt: ago(1440), notesCount: 1, evidenceReady: true, signals: ['Policy match'] }
          ],
          policies: [
            { id: 'POL-901', desk: 'healthmart', at: ago(320), title: 'HealthMart: Updated labeling rules', summary: 'Add batch/expiry fields on packaging photos for pharmacy items.' },
            { id: 'POL-902', desk: 'edumart', at: ago(980), title: 'EduMart: Child content review checklist', summary: 'Add age rating, content outline, and instructor bio for courses.' },
            { id: 'POL-903', desk: 'faithmart', at: ago(1600), title: 'FaithMart: Community guideline reminder', summary: 'No hate speech, no harassment, and respect local community rules.' }
          ],
          tasks: [
            { id: 'TSK-101', desk: 'healthmart', dueAt: soon(2880), tone: 'danger', title: 'Upload missing product license (Pharmacy)', cta: 'Upload docs' },
            { id: 'TSK-201', desk: 'edumart', dueAt: soon(10080), tone: 'orange', title: 'Add age rating + outline for course', cta: 'Update submission' },
            { id: 'TSK-301', desk: 'faithmart', dueAt: soon(14400), tone: 'slate', title: 'Add community moderation contact', cta: 'Add details' }
          ]
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


function hashPassword(password) {
  const salt = "mldzseed";
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function buildSeedData() {
  const now = new Date().toISOString();

  const userId = "user_ronald";
  const creatorId = "creator_ronald";

  const creatorProfile = {
    id: creatorId,
    userId,
    name: "Ronald Isabirye",
    handle: "ronald.creates",
    tier: "Silver",
    tagline: "Live commerce host for Beauty, Tech, and Faith-compatible offers.",
    bio: "Creator focused on trusted live selling, replay conversion, and brand-safe audience growth across East Africa.",
    categories: ["Beauty & Skincare", "Tech & Gadgets", "Faith & Wellness"],
    regions: ["East Africa", "North America"],
    languages: ["English", "Luganda"],
    followers: 18200,
    rating: 4.8,
    avgViews: 2300,
    totalSalesDriven: 31240,
    isKycVerified: true,
    followingSellerIds: ["seller_glowup", "seller_gadgetmart", "seller_grace"],
    savedOpportunityIds: ["opp_glowup_flash"],
    publicMetrics: {
      liveSessionsCompleted: 86,
      replaysPublished: 124,
      conversionRate: 4.8,
      avgOrderValue: 34
    }
  };

  const sellers = [
    {
      id: "seller_glowup",
      name: "GlowUp Hub",
      initials: "GH",
      type: "Seller",
      brand: "GlowUp Hub",
      tagline: "Beauty & skincare for glowing routines.",
      categories: ["Beauty & Skincare"],
      region: "East Africa",
      followers: 24000,
      livesCompleted: 112,
      avgOrderValue: 28,
      rating: 4.9,
      badge: "Top Brand",
      relationship: "active",
      collabStatus: "Open to collabs",
      fitScore: 96,
      fitReason: "You convert 3.1x platform average in Beauty campaigns.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Fast payouts", "Active this week"]
    },
    {
      id: "seller_gadgetmart",
      name: "GadgetMart Africa",
      initials: "GA",
      type: "Seller",
      brand: "GadgetMart Africa",
      tagline: "Everyday gadgets with an EV twist.",
      categories: ["Tech & Gadgets", "EV & Mobility"],
      region: "East Africa",
      followers: 18200,
      livesCompleted: 78,
      avgOrderValue: 61,
      rating: 4.7,
      badge: "Trusted Seller",
      relationship: "active",
      collabStatus: "Open to collabs",
      fitScore: 93,
      fitReason: "Strong Tech Friday performance with their niche.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Repeat partner", "Low refund rate"]
    },
    {
      id: "seller_grace",
      name: "Grace Living Store",
      initials: "GL",
      type: "Seller",
      brand: "Grace Living Store",
      tagline: "Faith-compatible wellness & lifestyle.",
      categories: ["Faith & Wellness"],
      region: "East Africa",
      followers: 8600,
      livesCompleted: 44,
      avgOrderValue: 24,
      rating: 4.8,
      badge: "Faith friendly",
      relationship: "active",
      collabStatus: "Invite only",
      fitScore: 90,
      fitReason: "High retention in Faith-compatible sessions.",
      openToCollabs: false,
      inviteOnly: true,
      trustBadges: ["Invite only", "Low return rate"]
    },
    {
      id: "seller_shopnow",
      name: "ShopNow Foods",
      initials: "SF",
      type: "Seller",
      brand: "ShopNow Foods",
      tagline: "Groceries & pantry delivered same day.",
      categories: ["Food & Groceries"],
      region: "East Africa",
      followers: 12400,
      livesCompleted: 39,
      avgOrderValue: 18,
      rating: 4.5,
      badge: "Everyday essentials",
      relationship: "past",
      collabStatus: "Open to collabs",
      fitScore: 78,
      fitReason: "Steady orders across the week.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["Seasonal performer"]
    },
    {
      id: "seller_evgadget",
      name: "EV Gadget World",
      initials: "EG",
      type: "Provider",
      brand: "EV Gadget World",
      tagline: "Accessories & gadgets for EV owners.",
      categories: ["EV & Mobility", "Tech & Gadgets"],
      region: "East Africa",
      followers: 5200,
      livesCompleted: 14,
      avgOrderValue: 57,
      rating: 4.6,
      badge: "New Seller",
      relationship: "none",
      collabStatus: "Open to collabs",
      fitScore: 72,
      fitReason: "Category match with limited collab history.",
      openToCollabs: true,
      inviteOnly: false,
      trustBadges: ["New EV-focused potential"]
    }
  ];

  const opportunities = [
    {
      id: "opp_glowup_flash",
      title: "Autumn Beauty Flash",
      ownerUserId: userId,
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      category: "Beauty & Skincare",
      categories: ["Beauty & Skincare"],
      region: "East Africa",
      language: "English",
      payBand: "$400 - $700 + commission",
      budgetMin: 400,
      budgetMax: 700,
      commission: 5,
      matchScore: "96%",
      matchReason: "Strong performance in Beauty campaigns (3.1x conv.)",
      deliverables: ["Brief call", "Asset handoff", "Post clips"],
      liveWindow: "Next week",
      timeline: ["Flash dealz", "New launch", "High volume"],
      summary: "Two-part Beauty Flash live plus supporting clips and tracked links.",
      tags: ["Beauty", "Live + Clips", "High volume"],
      supplierType: "Seller",
      status: "open"
    },
    {
      id: "opp_tech_friday",
      title: "Tech Friday Mega Live",
      ownerUserId: userId,
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      sellerInitials: "GA",
      category: "Tech & Gadgets",
      categories: ["Tech & Gadgets", "EV & Mobility"],
      region: "East Africa",
      language: "English",
      payBand: "$900 - $1,400 flat",
      budgetMin: 900,
      budgetMax: 1400,
      commission: 0,
      matchScore: "93%",
      matchReason: "Your Tech Friday lives perform above platform average.",
      deliverables: ["Script prep", "Series 1", "Series 2"],
      liveWindow: "Next week - 2-part Tech Friday series",
      timeline: ["EV gadgets", "Q&A heavy"],
      summary: "Tech Friday series focused on EV-friendly gadgets and accessories.",
      tags: ["Tech Friday", "Series", "Q&A"],
      supplierType: "Seller",
      status: "open"
    },
    {
      id: "opp_faith_morning",
      title: "Faith & Wellness Morning Dealz",
      ownerUserId: userId,
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      sellerInitials: "GL",
      category: "Faith-compatible wellness",
      categories: ["Faith & Wellness"],
      region: "East Africa",
      language: "English",
      payBand: "$300 - $500 flat + 3% commission",
      budgetMin: 300,
      budgetMax: 500,
      commission: 3,
      matchScore: "90%",
      matchReason: "Great fit with faith-compatible guidelines and high retention.",
      deliverables: ["Morning live", "Shoppable Adz", "Replay clip"],
      liveWindow: "Sunday mornings - Monthly slot",
      timeline: ["Morning live"],
      summary: "Faith-compatible wellness showcase with gentle CTA and replay recap.",
      tags: ["Faith", "Morning live", "Replay"],
      supplierType: "Seller",
      status: "invite_only"
    }
  ];

  const invites = [
    {
      id: "invite_glowup",
      userId,
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      sellerInitials: "GH",
      sellerDescription: "Beauty & skincare partner preparing a high-volume seasonal flash campaign.",
      sellerRating: 4.9,
      campaign: "Autumn Beauty Flash",
      type: "Live + Shoppable Adz",
      category: "Beauty & Skincare",
      region: "East Africa",
      timing: "3 days",
      fitReason: "You convert 3.1x platform average in Beauty & Skincare.",
      baseFee: 400,
      commissionPct: 5,
      estimatedValue: 820,
      currency: "USD",
      messageShort: "We would love you to host a 60-minute Beauty Flash session featuring the new serum launch.",
      status: "pending",
      lastActivity: "New invite - 2h ago"
    },
    {
      id: "invite_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      sellerInitials: "GA",
      sellerDescription: "Electronics retailer planning a three-part high-ticket tech Friday push.",
      sellerRating: 4.7,
      campaign: "Tech Friday Mega Live",
      type: "Live series (3 episodes)",
      category: "Tech & Gadgets",
      region: "East Africa",
      timing: "5 days",
      fitReason: "Strong Tech Friday performance with mid-ticket gadgets.",
      baseFee: 1200,
      commissionPct: 0,
      estimatedValue: 1200,
      currency: "USD",
      messageShort: "Looking for a host who can handle product demos, bundle reveals, and Q&A over three episodes.",
      status: "negotiating",
      lastActivity: "Countered terms - Yesterday"
    },
    {
      id: "invite_grace",
      userId,
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      sellerInitials: "GL",
      sellerDescription: "Faith-compatible wellness and lifestyle supplier with a loyal repeat audience.",
      sellerRating: 4.8,
      campaign: "Faith & Wellness Morning Dealz",
      type: "Morning lives",
      category: "Faith & Wellness",
      region: "East Africa",
      timing: "Starts next week",
      fitReason: "High retention in Faith-compatible sessions.",
      baseFee: 320,
      commissionPct: 0,
      estimatedValue: 320,
      currency: "USD",
      messageShort: "Thank you for accepting. Next we should lock dates, bundle order, and clip deliverables.",
      status: "accepted",
      lastActivity: "Accepted - 3 days ago"
    },
    {
      id: "invite_evgadget",
      userId,
      sellerId: "seller_evgadget",
      seller: "EV Gadget World",
      sellerInitials: "EG",
      sellerDescription: "Emerging EV accessories supplier testing creator-led launch campaigns.",
      sellerRating: 4.6,
      campaign: "EV Accessories Launch",
      type: "Shoppable Adz + Live",
      category: "EV & Mobility",
      region: "East Africa",
      timing: "2 weeks",
      fitReason: "Good category fit but limited collab history.",
      baseFee: 350,
      commissionPct: 4,
      estimatedValue: 600,
      currency: "USD",
      messageShort: "We want a launch flow that combines explainer clips, tracked links, and a conversion-focused live session.",
      status: "pending",
      lastActivity: "New invite - 1 day ago"
    }
  ];

  const proposals = [
    {
      id: "proposal_glowup",
      userId,
      sellerId: "seller_glowup",
      brand: "GlowUp Hub",
      initials: "GH",
      campaign: "Autumn Beauty Flash",
      origin: "seller",
      offerType: "Live + Clips package",
      category: "Beauty & Skincare",
      region: "East Africa",
      baseFeeMin: 400,
      baseFeeMax: 700,
      currency: "USD",
      commissionPct: 5,
      estimatedValue: 650,
      status: "in_negotiation",
      lastActivity: "Countered terms - 2h ago",
      notesShort: "Need final alignment on payment timing and usage rights.",
      terms: {
        deliverables: "1 live session, 2 short clips, 1 link pack",
        schedule: "Beauty Flash live within 7 days",
        compensation: "$500 flat + 5% commission",
        exclusivityWindow: "14 days",
        killFee: "Not set"
      },
      messages: [
        {
          id: "msg_1",
          from: "seller",
          name: "GlowUp Hub",
          avatar: "GH",
          time: "2026-02-28T10:00:00.000Z",
          body: "Can we confirm the final script and payment schedule today?"
        },
        {
          id: "msg_2",
          from: "creator",
          name: "Ronald",
          avatar: "RI",
          time: "2026-02-28T11:00:00.000Z",
          body: "Yes. I need usage rights and kill fee clarified before I lock the live."
        }
      ]
    },
    {
      id: "proposal_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      brand: "GadgetMart Africa",
      initials: "GA",
      campaign: "Tech Friday Mega Live",
      origin: "creator",
      offerType: "Launch live series (3 episodes)",
      category: "Tech & Gadgets",
      region: "East Africa",
      baseFeeMin: 900,
      baseFeeMax: 1400,
      currency: "USD",
      commissionPct: 0,
      estimatedValue: 1200,
      status: "sent_to_brand",
      lastActivity: "Sent to brand - Yesterday",
      notesShort: "You pitched a 3-episode Tech Friday series with mid-ticket gadgets.",
      terms: {
        deliverables: "3 live episodes, 3 replay cuts, 1 recap thread",
        schedule: "Friday for 3 consecutive weeks",
        compensation: "$1,200 flat",
        exclusivityWindow: "21 days",
        killFee: "$250"
      },
      messages: []
    },
    {
      id: "proposal_grace",
      userId,
      sellerId: "seller_grace",
      brand: "Grace Living Store",
      initials: "GL",
      campaign: "Faith & Wellness Morning Dealz",
      origin: "seller",
      offerType: "Morning lives + Shoppable Adz",
      category: "Faith & Wellness",
      region: "East Africa",
      baseFeeMin: 300,
      baseFeeMax: 500,
      currency: "USD",
      commissionPct: 3,
      estimatedValue: 420,
      status: "draft",
      lastActivity: "Draft saved - 1 day ago",
      notesShort: "Waiting for final deliverables and replay rights wording.",
      terms: {
        deliverables: "1 morning live, 1 shoppable ad, 1 replay",
        schedule: "Sunday morning slot",
        compensation: "$350 flat + 3% commission",
        exclusivityWindow: "7 days",
        killFee: "Not set"
      },
      messages: []
    },
    {
      id: "proposal_shopnow",
      userId,
      sellerId: "seller_shopnow",
      brand: "ShopNow Foods",
      initials: "SF",
      campaign: "ShopNow Groceries - Soft Promo",
      origin: "seller",
      offerType: "Shoppable Adz",
      category: "Food & Groceries",
      region: "East Africa",
      baseFeeMin: 120,
      baseFeeMax: 200,
      currency: "USD",
      commissionPct: 2,
      estimatedValue: 165,
      status: "accepted",
      lastActivity: "Accepted - 4 days ago",
      notesShort: "Accepted: soft groceries promo with flat fee and small commission.",
      terms: {
        deliverables: "1 shoppable ad, 1 story link",
        schedule: "This week",
        compensation: "$150 flat + 2% commission",
        exclusivityWindow: "3 days",
        killFee: "$50"
      },
      messages: []
    },
    {
      id: "proposal_evgadget",
      userId,
      sellerId: "seller_evgadget",
      brand: "EV Gadget World",
      initials: "EG",
      campaign: "EV Accessories Launch",
      origin: "seller",
      offerType: "Shoppable Adz + Live",
      category: "EV & Mobility",
      region: "East Africa",
      baseFeeMin: 250,
      baseFeeMax: 450,
      currency: "USD",
      commissionPct: 4,
      estimatedValue: 360,
      status: "declined",
      lastActivity: "Declined - last week",
      notesShort: "Timing was not a fit for the current production load.",
      terms: {
        deliverables: "1 live session, 1 shoppable ad",
        schedule: "Within 5 days",
        compensation: "$300 flat + 4% commission",
        exclusivityWindow: "10 days",
        killFee: "$75"
      },
      messages: []
    }
  ];

  const campaigns = [
    {
      id: "camp_glowup",
      ownerUserId: userId,
      sellerId: "seller_glowup",
      title: "Beauty Flash with GlowUp",
      seller: "GlowUp Hub",
      type: "Shoppable Adz + Live",
      status: "active",
      stage: "active_contracts",
      note: "Live scheduled - today",
      value: 650
    },
    {
      id: "camp_gadgetmart",
      ownerUserId: userId,
      sellerId: "seller_gadgetmart",
      title: "Tech Friday Mega Live",
      seller: "GadgetMart Africa",
      type: "Live series",
      status: "in_review",
      stage: "negotiating",
      note: "Review revised terms",
      value: 1200
    },
    {
      id: "camp_grace",
      ownerUserId: userId,
      sellerId: "seller_grace",
      title: "Faith & Wellness Morning Dealz",
      seller: "Grace Living Store",
      type: "Shoppable Adz",
      status: "pitched",
      stage: "pitches_sent",
      note: "Wait for seller reply",
      value: 420
    },
    {
      id: "camp_shopnow",
      ownerUserId: userId,
      sellerId: "seller_shopnow",
      title: "ShopNow Groceries - Soft Promo",
      seller: "ShopNow Foods",
      type: "Shoppable Adz",
      status: "completed",
      stage: "completed",
      note: "Closed - review performance",
      value: 165
    }
  ];

  const contracts = [
    {
      id: "contract_glowup",
      userId,
      sellerId: "seller_glowup",
      campaignId: "camp_glowup",
      proposalId: "proposal_glowup",
      title: "Autumn Beauty Flash",
      status: "active",
      health: "on_track",
      value: 650,
      currency: "USD",
      startDate: "2026-03-02",
      endDate: "2026-03-09",
      deliverables: [
        { id: "del_1", label: "Live session", done: true, type: "live" },
        { id: "del_2", label: "2 short clips", done: false, type: "clip" },
        { id: "del_3", label: "Link pack", done: false, type: "link" }
      ],
      timeline: [
        { when: "2026-02-26", what: "Contract drafted" },
        { when: "2026-02-28", what: "Usage rights revision requested" },
        { when: "2026-03-01", what: "Live run-of-show approved" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "GlowUp Hub", manager: "Mary - Brand manager" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    },
    {
      id: "contract_gadgetmart",
      userId,
      sellerId: "seller_gadgetmart",
      campaignId: "camp_gadgetmart",
      proposalId: "proposal_gadgetmart",
      title: "Tech Friday Mega Live",
      status: "at_risk",
      health: "at_risk",
      value: 1200,
      currency: "USD",
      startDate: "2026-03-08",
      endDate: "2026-03-29",
      deliverables: [
        { id: "del_4", label: "Episode 1", done: false, type: "live" },
        { id: "del_5", label: "Episode 2", done: false, type: "live" },
        { id: "del_6", label: "Episode 3", done: false, type: "live" }
      ],
      timeline: [
        { when: "2026-02-25", what: "Series proposed" },
        { when: "2026-02-27", what: "Brand asked for revised terms" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "GadgetMart Africa", manager: "Derrick - Growth lead" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    },
    {
      id: "contract_shopnow",
      userId,
      sellerId: "seller_shopnow",
      campaignId: "camp_shopnow",
      proposalId: "proposal_shopnow",
      title: "ShopNow Groceries - Soft Promo",
      status: "completed",
      health: "complete",
      value: 165,
      currency: "USD",
      startDate: "2026-02-20",
      endDate: "2026-02-24",
      deliverables: [
        { id: "del_7", label: "Ad published", done: true, type: "ad" },
        { id: "del_8", label: "Story link", done: true, type: "link" }
      ],
      timeline: [
        { when: "2026-02-19", what: "Contract signed" },
        { when: "2026-02-24", what: "Campaign completed" }
      ],
      parties: {
        creator: { name: "Ronald Isabirye", handle: "@ronald.creates" },
        seller: { name: "ShopNow Foods", manager: "Lena - Marketing" }
      },
      termination: {
        requested: false,
        reason: null,
        explanation: null
      }
    }
  ];

  const tasks = [
    {
      id: "task_1",
      userId,
      contractId: "contract_glowup",
      campaign: "Valentine Glow Week",
      supplier: "GlowUp Hub",
      supplierInitials: "GH",
      brand: "GlowUp Hub",
      column: "todo",
      title: "Intro clip: unboxing + hook (15s)",
      type: "clip",
      priority: "high",
      dueLabel: "Today",
      dueAt: "2026-03-01T16:00:00.000Z",
      overdue: false,
      earnings: 120,
      currency: "USD",
      comments: [
        {
          id: "task_comment_1",
          author: "Supplier Manager",
          body: "Please keep the opening hook under 3 seconds.",
          createdAt: "2026-02-28T09:00:00.000Z"
        }
      ],
      attachments: []
    },
    {
      id: "task_2",
      userId,
      contractId: "contract_glowup",
      campaign: "Valentine Glow Week",
      supplier: "GlowUp Hub",
      supplierInitials: "GH",
      brand: "GlowUp Hub",
      column: "in_progress",
      title: "Live session: serum demo + consult CTA",
      type: "live",
      priority: "high",
      dueLabel: "Tomorrow",
      dueAt: "2026-03-02T14:00:00.000Z",
      overdue: false,
      earnings: 220,
      currency: "USD",
      comments: [],
      attachments: []
    },
    {
      id: "task_3",
      userId,
      contractId: "contract_gadgetmart",
      campaign: "Back-to-Work Essentials",
      supplier: "Urban Supply",
      supplierInitials: "US",
      brand: "Urban Supply",
      column: "awaiting_review",
      title: "VOD: backpack review (30-45s)",
      type: "video",
      priority: "medium",
      dueLabel: "In 2 days",
      dueAt: "2026-03-03T12:00:00.000Z",
      overdue: false,
      earnings: 150,
      currency: "USD",
      comments: [],
      attachments: []
    },
    {
      id: "task_4",
      userId,
      contractId: "contract_shopnow",
      campaign: "Home Essentials Drop",
      supplier: "ShopNow Foods",
      supplierInitials: "SF",
      brand: "ShopNow Foods",
      column: "needs_changes",
      title: "Live: recipe demo",
      type: "live",
      priority: "low",
      dueLabel: "Last week",
      dueAt: "2026-02-24T10:00:00.000Z",
      overdue: true,
      earnings: 80,
      currency: "USD",
      comments: [],
      attachments: []
    }
  ];

  const assets = [
    {
      id: "asset_hero_glowup",
      userId,
      title: "Hero image",
      subtitle: "Autumn Beauty Flash - GlowUp Hub",
      campaignId: "camp_glowup",
      supplierId: "seller_glowup",
      brand: "GlowUp Hub",
      tags: ["#ad", "#sponsored", "paid partnership"],
      mediaType: "image",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "supplier_review",
      lastUpdatedLabel: "1h ago",
      previewUrl: "https://example.com/assets/glowup-hero.jpg",
      role: "hero"
    },
    {
      id: "asset_script_glowup",
      userId,
      title: "Opening script",
      subtitle: "Autumn Beauty Flash - GlowUp Hub",
      campaignId: "camp_glowup",
      supplierId: "seller_glowup",
      brand: "GlowUp Hub",
      tags: ["script"],
      mediaType: "document",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "admin_review",
      lastUpdatedLabel: "Yesterday",
      previewUrl: "https://example.com/assets/glowup-script.pdf",
      role: "script"
    },
    {
      id: "asset_clip_gadgetmart",
      userId,
      title: "Hook clip",
      subtitle: "Tech Friday Mega Live - GadgetMart Africa",
      campaignId: "camp_gadgetmart",
      supplierId: "seller_gadgetmart",
      brand: "GadgetMart Africa",
      tags: ["clip", "tech"],
      mediaType: "video",
      source: "creator",
      ownerLabel: "Owner: Creator",
      status: "changes_requested",
      lastUpdatedLabel: "2 days ago",
      previewUrl: "https://example.com/assets/gadgetmart-hook.mp4",
      role: "item_video"
    }
  ];

  const liveSessions = [
    {
      id: "live_beauty_flash",
      userId,
      title: "Beauty Flash - Serum launch",
      campaignId: "camp_glowup",
      campaign: "Autumn Beauty Flash",
      sellerId: "seller_glowup",
      seller: "GlowUp Hub",
      weekday: "Thu",
      dateLabel: "Thu 10 Oct",
      scheduledFor: "2026-03-02T18:00:00.000Z",
      time: "6:00 PM EAT",
      location: "Remote studio",
      simulcast: ["TikTok Live", "Instagram Live"],
      status: "scheduled",
      role: "Host",
      durationMin: 60,
      scriptsReady: true,
      assetsReady: true,
      productsCount: 3,
      workloadScore: 74,
      conflict: false,
      studio: {
        mode: "lobby",
        micOn: true,
        camOn: true,
        screenShareOn: false,
        activeSceneId: "scene_intro",
        scenes: [
          { id: "scene_intro", label: "Intro Card" },
          { id: "scene_main", label: "Main Cam" },
          { id: "scene_split", label: "Split View" }
        ],
        products: [
          { id: "prod_serum", name: "Glow Serum", price: "$19", stock: "150 left", tag: "Best Seller" },
          { id: "prod_lipstick", name: "Matte Lipstick", price: "$12", stock: "85 left", tag: "Low Stock" },
          { id: "prod_spray", name: "Setting Spray", price: "$14", stock: "200 left", tag: "Fresh" }
        ],
        coHosts: [
          { id: 1, name: "Jessica M.", status: "Ready" },
          { id: 2, name: "David K.", status: "Standby" }
        ],
        chat: [
          { id: 1, from: "@Sarah99", body: "Can you show the texture again?", time: "18:02", system: false },
          { id: 2, from: "@MikeD", body: "Product Q", time: "18:03", system: false }
        ],
        momentMarkers: [
          { id: 1, time: "00:03:12", label: "Hook + serum demo" }
        ],
        commerceGoal: { soldUnits: 34, targetUnits: 120, cartCount: 19, last5MinSales: 7 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_beauty_flash",
          title: "Beauty Flash - Serum launch",
          status: "Scheduled",
          supplierId: "pt_glowup",
          campaignId: "cp_autumn_beauty",
          products: [
            { id: "it_serum", name: "GlowUp Vitamin C Serum" },
            { id: "it_cleanser", name: "Barrier Repair Cleanser" }
          ],
          giveaways: [
            {
              id: "gw_seed_beauty_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_autumn_beauty_it_serum",
              linkedItemId: "it_serum",
              quantity: 50,
              showOnPromo: true
            },
            {
              id: "gw_seed_beauty_custom",
              source: "custom",
              campaignGiveawayId: "sgw_beauty_kit",
              title: "GlowUp Night Routine Kit",
              quantity: 1,
              showOnPromo: true
            }
          ]
        }
      }
    },
    {
      id: "live_tech_friday",
      userId,
      title: "Tech Friday - Gadgets Q&A",
      campaignId: "camp_gadgetmart",
      campaign: "Tech Friday Mega Live",
      sellerId: "seller_gadgetmart",
      seller: "GadgetMart Africa",
      weekday: "Fri",
      dateLabel: "Fri 11 Oct",
      scheduledFor: "2026-03-08T18:00:00.000Z",
      time: "6:00 PM EAT",
      location: "Remote studio",
      simulcast: ["YouTube Live", "Facebook Live"],
      status: "draft",
      role: "Host",
      durationMin: 75,
      scriptsReady: false,
      assetsReady: true,
      productsCount: 4,
      workloadScore: 81,
      conflict: false,
      studio: {
        mode: "builder",
        micOn: true,
        camOn: true,
        screenShareOn: true,
        activeSceneId: "scene_main",
        scenes: [
          { id: "scene_main", label: "Main Cam" },
          { id: "scene_product", label: "Product Focus" }
        ],
        products: [],
        coHosts: [],
        chat: [],
        momentMarkers: [],
        commerceGoal: { soldUnits: 0, targetUnits: 80, cartCount: 0, last5MinSales: 0 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_tech_friday",
          title: "Tech Friday - Gadgets Q&A",
          status: "Draft",
          supplierId: "pt_gadget",
          campaignId: "cp_tech_friday",
          products: [
            { id: "it_powerbank", name: "VoltMax Pro - 30,000mAh" },
            { id: "it_cam", name: "SnapCam 4K Action - Creator Kit" }
          ],
          giveaways: [
            {
              id: "gw_seed_tech_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_tech_friday_it_powerbank",
              linkedItemId: "it_powerbank",
              quantity: 18,
              showOnPromo: true
            },
            {
              id: "gw_seed_tech_custom",
              source: "custom",
              campaignGiveawayId: "sgw_gift_card",
              title: "Tech Friday Gift Card",
              quantity: 1,
              showOnPromo: true
            }
          ]
        }
      }
    },
    {
      id: "live_faith_morning",
      userId,
      title: "Faith & Wellness Morning Dealz",
      campaignId: "camp_grace",
      campaign: "Faith & Wellness Morning Dealz",
      sellerId: "seller_grace",
      seller: "Grace Living Store",
      weekday: "Sat",
      dateLabel: "Sat 12 Oct",
      scheduledFor: "2026-03-09T08:00:00.000Z",
      time: "8:00 AM EAT",
      location: "Remote studio",
      simulcast: ["Instagram Live"],
      status: "scheduled",
      role: "Host",
      durationMin: 45,
      scriptsReady: true,
      assetsReady: false,
      productsCount: 2,
      workloadScore: 52,
      conflict: false,
      studio: {
        mode: "lobby",
        micOn: true,
        camOn: true,
        screenShareOn: false,
        activeSceneId: "scene_intro",
        scenes: [{ id: "scene_intro", label: "Intro Card" }],
        products: [],
        coHosts: [],
        chat: [],
        momentMarkers: [],
        commerceGoal: { soldUnits: 0, targetUnits: 60, cartCount: 0, last5MinSales: 0 }
      },
      builderState: {
        step: "featured-items",
        savedAt: now,
        draft: {
          id: "live_faith_morning",
          title: "Faith & Wellness Morning Dealz",
          status: "Scheduled",
          supplierId: "pt_grace",
          campaignId: "cp_wellness",
          products: [
            { id: "it_consult", name: "Live Consultation - Gadget Setup" }
          ],
          giveaways: [
            {
              id: "gw_seed_wellness_featured",
              source: "featured",
              campaignGiveawayId: "cg_cp_wellness_it_consult",
              linkedItemId: "it_consult",
              quantity: 4,
              showOnPromo: true
            }
          ]
        }
      }
    }
  ];

  const campaignGiveaways = [
    {
      id: "cg_cp_autumn_beauty_it_serum",
      campaignId: "cp_autumn_beauty",
      type: "featured",
      itemId: "it_serum",
      title: "GlowUp Vitamin C Serum",
      imageUrl: "https://example.com/assets/serum.jpg",
      notes: "Supplier-set giveaway quantity for the featured serum.",
      totalQuantity: 100
    },
    {
      id: "cg_cp_autumn_beauty_it_cleanser",
      campaignId: "cp_autumn_beauty",
      type: "featured",
      itemId: "it_cleanser",
      title: "Barrier Repair Cleanser",
      imageUrl: "https://example.com/assets/cleanser.jpg",
      notes: "Supplier-set giveaway quantity for cleanser winners.",
      totalQuantity: 40
    },
    {
      id: "sgw_beauty_kit",
      campaignId: "cp_autumn_beauty",
      type: "custom",
      title: "GlowUp Night Routine Kit",
      imageUrl: "https://example.com/assets/beauty-kit.jpg",
      notes: "Supplier custom giveaway kit.",
      totalQuantity: 6
    },
    {
      id: "sgw_vanity_pouch",
      campaignId: "cp_autumn_beauty",
      type: "custom",
      title: "Premium Vanity Pouch",
      imageUrl: "https://example.com/assets/vanity-pouch.jpg",
      notes: "Gift pouch supplied for live winners.",
      totalQuantity: 8
    },
    {
      id: "cg_cp_tech_friday_it_powerbank",
      campaignId: "cp_tech_friday",
      type: "featured",
      itemId: "it_powerbank",
      title: "VoltMax Pro - 30,000mAh",
      imageUrl: "https://example.com/assets/powerbank-item.jpg",
      notes: "Supplier-set giveaway quantity for the power bank offer.",
      totalQuantity: 60
    },
    {
      id: "cg_cp_tech_friday_it_cam",
      campaignId: "cp_tech_friday",
      type: "featured",
      itemId: "it_cam",
      title: "SnapCam 4K Action - Creator Kit",
      imageUrl: "https://example.com/assets/camera.jpg",
      notes: "Supplier-set giveaway quantity for camera creators.",
      totalQuantity: 12
    },
    {
      id: "sgw_ring_light",
      campaignId: "cp_tech_friday",
      type: "custom",
      title: "Creator Ring Light Kit",
      imageUrl: "https://example.com/assets/ring-light.jpg",
      notes: "Supplier-approved creator kit giveaway.",
      totalQuantity: 4
    },
    {
      id: "sgw_gift_card",
      campaignId: "cp_tech_friday",
      type: "custom",
      title: "Tech Friday Gift Card",
      imageUrl: "https://example.com/assets/gift-card.jpg",
      notes: "Digital voucher for live-session winners.",
      totalQuantity: 5
    },
    {
      id: "cg_cp_wellness_it_consult",
      campaignId: "cp_wellness",
      type: "featured",
      itemId: "it_consult",
      title: "Live Consultation - Gadget Setup",
      imageUrl: "https://example.com/assets/consultation.jpg",
      notes: "Supplier-set consultation giveaway slots.",
      totalQuantity: 15
    },
    {
      id: "cg_cp_wellness_it_repair",
      campaignId: "cp_wellness",
      type: "featured",
      itemId: "it_repair",
      title: "On-site Device Repair Quote",
      imageUrl: "https://example.com/assets/repair.jpg",
      notes: "Supplier-set quote giveaway capacity.",
      totalQuantity: 10
    },
    {
      id: "sgw_consult_credit",
      campaignId: "cp_wellness",
      type: "custom",
      title: "Wellness Consultation Credit",
      imageUrl: "https://example.com/assets/consult-credit.jpg",
      notes: "Supplier-set service credit for booked attendees.",
      totalQuantity: 3
    }
  ];

  const replays = [
    {
      id: "replay_glowup",
      sessionId: "live_beauty_flash",
      title: "Autumn Beauty Flash - Serum launch",
      date: "2026-02-28T18:30:00.000Z",
      hook: "Strong hook",
      retention: "High retention",
      notes: ["Serum focus", "High comment volume", "Flash deal countdown"],
      published: true,
      replayUrl: "https://mylivedealz.com/replay/live_beauty_flash",
      coverUrl: "https://example.com/assets/replay-glowup-cover.jpg",
      allowComments: true,
      showProductStrip: true,
      clips: [
        { id: "clip_glowup_hook", title: "Hook + first demo", startSec: 15, endSec: 75, format: "9:16", status: "Ready" },
        { id: "clip_glowup_offer", title: "Flash deal countdown", startSec: 900, endSec: 945, format: "1:1", status: "Ready" }
      ],
      updatedAt: now,
      publishedAt: now,
      scheduledPublishAt: null,
      views: 1543,
      sales: 62,
      durationSec: 4365
    },
    {
      id: "replay_gadgetmart",
      sessionId: "live_tech_friday",
      title: "Tech Friday Mega Live - Gadgets Q&A",
      date: "2026-02-27T20:00:00.000Z",
      hook: "Q&A heavy",
      retention: "Late peak",
      notes: ["Bundle upsells", "Replay available"],
      published: false,
      replayUrl: "https://mylivedealz.com/replay/live_tech_friday",
      coverUrl: "https://example.com/assets/replay-tech-cover.jpg",
      allowComments: true,
      showProductStrip: true,
      clips: [
        { id: "clip_tech_unboxing", title: "Gadget unboxing", startSec: 120, endSec: 180, format: "9:16", status: "Draft" }
      ],
      updatedAt: now,
      publishedAt: null,
      scheduledPublishAt: null,
      views: 2310,
      sales: 87,
      durationSec: 5283
    },
    {
      id: "replay_grace",
      sessionId: "live_faith_morning",
      title: "Faith & Wellness Morning Dealz",
      date: "2026-02-26T08:00:00.000Z",
      hook: "Soft opener",
      retention: "High replay",
      notes: ["Community chat", "High trust tone"],
      published: true,
      replayUrl: "https://mylivedealz.com/replay/live_faith_morning",
      coverUrl: "https://example.com/assets/replay-faith-cover.jpg",
      allowComments: true,
      showProductStrip: false,
      clips: [
        { id: "clip_faith_intro", title: "Warm welcome", startSec: 30, endSec: 90, format: "9:16", status: "Ready" }
      ],
      updatedAt: now,
      publishedAt: now,
      scheduledPublishAt: null,
      views: 987,
      sales: 29,
      durationSec: 3250
    }
  ];

  const reviews = [
    {
      id: "review_beauty_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_beauty_flash",
      sessionTitle: "GlowUp Beauty Flash Live",
      endedAt: "2026-03-02T19:00:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 5,
        helpfulness: 5,
        productKnowledge: 4.8,
        interaction: 4.9,
        trust: 4.9
      },
      quickTags: ["Clear demos", "Great pacing", "Trustworthy"],
      issueTags: ["Wanted more Q&A"],
      reviewText: "Loved the way the routine was explained and the checkout prompt felt natural.",
      note: "Loved the way the routine was explained and the checkout prompt felt natural.",
      dimension: "Overall experience",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "bought",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-03-02T19:18:00.000Z"
    },
    {
      id: "review_beauty_2",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_beauty_flash",
      sessionTitle: "GlowUp Beauty Flash Live",
      endedAt: "2026-03-02T19:00:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.2,
        helpfulness: 4.4,
        productKnowledge: 4.1,
        interaction: 3.8,
        trust: 4.5
      },
      quickTags: ["Good offer timing"],
      issueTags: ["Volume dips", "Wanted ingredient recap"],
      reviewText: "The live was strong overall, but I missed some details when the audio dipped near the middle.",
      note: "Strong overall, but the audio dipped near the middle.",
      dimension: "Trust & clarity",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "added_to_cart",
      publicReview: false,
      anonymous: true,
      createdAt: "2026-03-02T19:24:00.000Z"
    },
    {
      id: "review_tech_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_tech_friday",
      sessionTitle: "Tech Friday Deals Live",
      endedAt: "2026-02-28T18:30:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.8,
        helpfulness: 4.9,
        productKnowledge: 5,
        interaction: 4.7,
        trust: 4.8
      },
      quickTags: ["Very knowledgeable", "Answered fast"],
      issueTags: [],
      reviewText: "Best explanation of battery life and shipping timelines I have heard on a gadget live.",
      note: "Excellent product knowledge and shipping clarity.",
      dimension: "Product / service knowledge",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "requested_quote",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-28T18:44:00.000Z"
    },
    {
      id: "review_tech_2",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_tech_friday",
      sessionTitle: "Tech Friday Deals Live",
      endedAt: "2026-02-28T18:30:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.1,
        helpfulness: 4.2,
        productKnowledge: 4.5,
        interaction: 4,
        trust: 4.2
      },
      quickTags: ["Helpful comparison"],
      issueTags: ["Too fast at the end"],
      reviewText: "The comparison was useful, but the closing bundle summary moved a bit too fast.",
      note: "Helpful comparison but the closing summary was rushed.",
      dimension: "Presentation & energy",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "just_watched",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-28T18:51:00.000Z"
    },
    {
      id: "review_faith_1",
      userId,
      creatorId,
      creatorName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      memberId: "member_1",
      sessionId: "live_faith_morning",
      sessionTitle: "Faith & Wellness Morning Live",
      endedAt: "2026-02-24T09:00:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.9,
        helpfulness: 4.8,
        productKnowledge: 4.7,
        interaction: 5,
        trust: 5
      },
      quickTags: ["Warm tone", "Community feel", "Trustworthy"],
      issueTags: [],
      reviewText: "Very calming but still clear on the offer and why it mattered. Felt safe to buy from.",
      note: "Warm, clear, and safe buying experience.",
      dimension: "Audience interaction",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "bought",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-02-24T09:15:00.000Z"
    },
    {
      id: "review_team_amina_1",
      userId: "user_amina",
      creatorId: "creator_amina",
      creatorName: "Amina K.",
      creatorHandle: "@amina.live",
      memberId: "member_2",
      sessionId: "session_amina_highlights",
      sessionTitle: "Amina Highlight Reel Review",
      endedAt: "2026-03-01T17:30:00.000Z",
      overallRating: 4,
      categoryRatings: {
        presentation: 4.4,
        helpfulness: 4.2,
        productKnowledge: 4.1,
        interaction: 4,
        trust: 4.3
      },
      quickTags: ["Clean transitions", "Professional"],
      issueTags: ["Wanted more product depth"],
      reviewText: "Amina handled the flow professionally and kept transitions clean, but more product detail would help conversions.",
      note: "Professional flow with room for deeper product detail.",
      dimension: "Presentation & energy",
      score: 4,
      wouldJoinAgain: true,
      transactionIntent: "added_to_cart",
      publicReview: false,
      anonymous: true,
      createdAt: "2026-03-01T17:46:00.000Z"
    },
    {
      id: "review_team_amina_2",
      userId: "user_amina",
      creatorId: "creator_amina",
      creatorName: "Amina K.",
      creatorHandle: "@amina.live",
      memberId: "member_2",
      sessionId: "session_amina_highlights",
      sessionTitle: "Amina Highlight Reel Review",
      endedAt: "2026-03-01T17:30:00.000Z",
      overallRating: 5,
      categoryRatings: {
        presentation: 4.8,
        helpfulness: 4.7,
        productKnowledge: 4.6,
        interaction: 4.8,
        trust: 4.9
      },
      quickTags: ["Confident delivery", "Good CTA timing"],
      issueTags: [],
      reviewText: "Confident delivery and excellent CTA timing. Felt like a polished co-host segment.",
      note: "Confident delivery with strong CTA timing.",
      dimension: "Trust & clarity",
      score: 5,
      wouldJoinAgain: true,
      transactionIntent: "booked",
      publicReview: true,
      anonymous: false,
      createdAt: "2026-03-01T18:05:00.000Z"
    }
  ];

  const adzCampaigns = [
    {
      id: "adz_glowup_serum",
      userId,
      campaignId: "camp_glowup",
      campaignName: "Autumn Beauty Flash - Serum Promo",
      campaignSubtitle: "Limited-time drops - Host-first",
      sellerId: "seller_glowup",
      supplier: { name: "GlowUp Hub", category: "Beauty", logoUrl: "" },
      creator: { name: "Ronald Isabirye", handle: "@ronald.creates", avatarUrl: "", verified: true },
      status: "pending_approval",
      platforms: ["Instagram Story", "TikTok profile"],
      startISO: "2026-03-02T12:00:00.000Z",
      endISO: "2026-03-05T22:00:00.000Z",
      timezone: "Africa/Kampala",
      heroImageUrl: "https://example.com/assets/serum-hero.jpg",
      heroIntroVideoUrl: "",
      compensation: { model: "flat_fee_plus_commission", flatFee: 200, commissionPct: 5, currency: "USD" },
      offers: [
        { id: "offer_serum", type: "product", name: "GlowUp Serum Bundle", currency: "USD", price: 19, stockLeft: 150, posterUrl: "https://example.com/assets/serum.jpg" }
      ],
      generated: true,
      hasBrokenLink: false,
      lowStock: false,
      performance: {
        period: "7d",
        clicks: 832,
        purchases: 74,
        conversionPct: 8.9,
        earnings: 238,
        byPlatform: [
          { platform: "Instagram Story", clicks: 420, purchases: 38 },
          { platform: "TikTok profile", clicks: 412, purchases: 36 }
        ]
      }
    },
    {
      id: "adz_powerbank",
      userId,
      campaignId: "camp_gadgetmart",
      campaignName: "Flash Dealz: Power Bank",
      campaignSubtitle: "Limited-time drops",
      sellerId: "seller_gadgetmart",
      supplier: { name: "GadgetMart Africa", category: "Tech", logoUrl: "" },
      creator: { name: "Ronald Isabirye", handle: "@ronald.creates", avatarUrl: "", verified: true },
      status: "live",
      platforms: ["Instagram Feed", "WhatsApp"],
      startISO: "2026-03-01T08:00:00.000Z",
      endISO: "2026-03-03T18:00:00.000Z",
      timezone: "Africa/Kampala",
      heroImageUrl: "https://example.com/assets/powerbank.jpg",
      heroIntroVideoUrl: "",
      compensation: { model: "flat_fee", flatFee: 180, commissionPct: 0, currency: "USD" },
      offers: [
        { id: "offer_powerbank", type: "product", name: "20,000mAh Power Bank", currency: "USD", price: 22, stockLeft: 64, posterUrl: "https://example.com/assets/powerbank-item.jpg" }
      ],
      generated: true,
      hasBrokenLink: false,
      lowStock: true,
      performance: {
        period: "7d",
        clicks: 1240,
        purchases: 96,
        conversionPct: 7.7,
        earnings: 180,
        byPlatform: [
          { platform: "Instagram Feed", clicks: 700, purchases: 52 },
          { platform: "WhatsApp", clicks: 540, purchases: 44 }
        ]
      }
    }
  ];

  const links = [
    {
      id: "link_beauty_story",
      userId,
      tab: "live",
      title: "LIVE TODAY: Beauty Flash Dealz",
      subtitle: "Limited stock + live-only discounts",
      status: "scheduled",
      createdAt: "2026-02-28T09:00:00.000Z",
      updatedAt: now,
      expiresAt: "2026-03-05T23:59:59.000Z",
      campaign: { id: "camp_glowup", name: "Beauty Flash Dealz" },
      supplier: { name: "GlowUp Hub", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/live/live_beauty_flash?creator=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/bf1",
      channels: [
        { name: "Instagram Story", url: "https://go.mylivedealz.com/bf1?ch=ig_story", hint: "Best for Stories" },
        { name: "YouTube Shorts", url: "https://go.mylivedealz.com/bf1?ch=yt_shorts", hint: "Best for replay discovery" },
        { name: "WhatsApp", url: "https://go.mylivedealz.com/bf1?ch=whatsapp", hint: "Best for broadcasts" }
      ],
      metrics: { clicks: 842, purchases: 73, conversionPct: 8.7, earnings: 238, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/bf1", note: "Default" },
        { region: "Africa", url: "https://go.mylivedealz.com/bf1?rg=af", note: "Regional targeting" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 842, purchases: 73, conversionPct: 8.7, earnings: 238, currency: "USD" },
        { region: "Africa", clicks: 610, purchases: 55, conversionPct: 9.0, earnings: 188, currency: "USD" }
      ],
      sharePack: {
        headline: "LIVE TODAY: Beauty Flash Dealz",
        bullets: ["Live-only discounts", "Verified seller inventory", "Tracked link supports creator earnings"],
        captions: [
          { platform: "Instagram", text: "Going live today. Join and shop with my tracked link: {LINK}" },
          { platform: "WhatsApp", text: "Join today's Beauty Flash Dealz live here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#BeautyDealz", "#ShopLive"]
      },
      pinned: true,
      note: "Primary launch link"
    },
    {
      id: "link_tech_replay",
      userId,
      tab: "live",
      title: "REPLAY: Tech Friday Mega Live",
      subtitle: "Watch the demo, then shop",
      status: "active",
      createdAt: "2026-02-25T10:00:00.000Z",
      updatedAt: now,
      campaign: { id: "camp_gadgetmart", name: "Tech Friday Mega" },
      supplier: { name: "GadgetMart Africa", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/replay/live_tech_friday?creator=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/tf1",
      channels: [
        { name: "Instagram Feed", url: "https://go.mylivedealz.com/tf1?ch=ig_feed", hint: "Best for evergreen" },
        { name: "Telegram", url: "https://go.mylivedealz.com/tf1?ch=telegram", hint: "Best for communities" }
      ],
      metrics: { clicks: 640, purchases: 41, conversionPct: 6.4, earnings: 172, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/tf1", note: "Default" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 640, purchases: 41, conversionPct: 6.4, earnings: 172, currency: "USD" }
      ],
      sharePack: {
        headline: "REPLAY: Tech Friday Mega Live",
        bullets: ["Watch the demo", "Track conversions", "Keep replay traffic measurable"],
        captions: [
          { platform: "Instagram", text: "Replay is live. Watch and shop here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#Replay", "#TechDealz"]
      },
      pinned: true,
      note: "Evergreen replay link"
    },
    {
      id: "link_adz_serum",
      userId,
      tab: "shoppable",
      title: "Shoppable Ad: GlowUp Serum Bundle",
      subtitle: "Limited-time host-first promo",
      status: "active",
      createdAt: "2026-03-01T08:00:00.000Z",
      updatedAt: now,
      campaign: { id: "adz_glowup_serum", name: "Autumn Beauty Flash - Serum Promo" },
      supplier: { name: "GlowUp Hub", type: "Seller" },
      primaryUrl: "https://mylivedealz.com/a/adz_glowup_serum?ref=ronald.creates",
      shortUrl: "https://go.mylivedealz.com/serum1",
      channels: [
        { name: "Instagram Story", url: "https://go.mylivedealz.com/serum1?ch=ig_story", hint: "Swipe-up traffic" },
        { name: "TikTok Profile", url: "https://go.mylivedealz.com/serum1?ch=tiktok", hint: "Best for reach" }
      ],
      metrics: { clicks: 832, purchases: 74, conversionPct: 8.9, earnings: 238, currency: "USD" },
      regionVariants: [
        { region: "Global", url: "https://go.mylivedealz.com/serum1", note: "Default" },
        { region: "EU/UK", url: "https://go.mylivedealz.com/serum1?rg=eu", note: "Price test" }
      ],
      regionMetrics: [
        { region: "Global", clicks: 832, purchases: 74, conversionPct: 8.9, earnings: 238, currency: "USD" },
        { region: "EU/UK", clicks: 162, purchases: 16, conversionPct: 9.9, earnings: 51, currency: "USD" }
      ],
      sharePack: {
        headline: "GlowUp Serum Bundle",
        bullets: ["Tracked short link", "Attribution-ready", "Supports ad reporting"],
        captions: [
          { platform: "TikTok", text: "Shop the GlowUp Serum bundle from my tracked link: {LINK}" },
          { platform: "Instagram", text: "Flash promo now live. Shop here: {LINK}" }
        ],
        hashtags: ["#MyLiveDealz", "#GlowUp", "#ShoppableAd"]
      },
      pinned: false,
      note: "Primary shoppable ad link"
    }
  ];

  const earnings = {
    userId,
    summary: { available: 1430, pending: 680, projected: 1710, lifetime: 12840, currency: "USD" },
    composition: {
      flatFees: 4800,
      commission: 2800,
      bonuses: 600
    },
    byCampaign: [
      { label: "Autumn Beauty Flash", total: 540, category: "Beauty", seller: "GlowUp Hub" },
      { label: "Tech Friday Mega Live", total: 720, category: "Tech", seller: "GadgetMart Africa" },
      { label: "Faith & Wellness Morning", total: 170, category: "Faith", seller: "Grace Living Store" }
    ],
    bySeller: [
      { label: "GlowUp Hub", total: 540 },
      { label: "GadgetMart Africa", total: 720 },
      { label: "Grace Living Store", total: 170 }
    ],
    byMonth: [
      { label: "Jan 2026", total: 1120, projected: 1180, growth: 5 },
      { label: "Feb 2026", total: 1360, projected: 1440, growth: 7 },
      { label: "Mar 2026", total: 1430, projected: 1710, growth: 12 }
    ],
    forecast: {
      month: "Mar 2026",
      current: 1430,
      projected: 1710,
      growth: 12
    },
    payoutPolicy: {
      feeLabel: "$0.00 (Free for Silver Tier)",
      settlementWindow: "Within 48 Hours"
    },
    notes: [
      "Commission is driving most of your upside this month.",
      "Tech Friday is your strongest live-to-sale converter right now.",
      "Keeping payout details verified helps avoid review holds."
    ],
    lastUpdatedAt: "2026-03-03T09:15:00.000Z"
  };

  const payouts = [
    {
      id: "payout_1",
      userId,
      date: "2026-02-28",
      requestedAt: "2026-02-27T13:10:00.000Z",
      amount: 520,
      currency: "USD",
      status: "Paid",
      method: "Bank transfer",
      recipient: "MyLive Bank • Ronald Isabirye • ****1024",
      estimatedSettlement: "Paid in 1 business day",
      fee: 0,
      netAmount: 520,
      notes: "Completed to verified bank account.",
      reference: "MLDZ-P-1001"
    },
    {
      id: "payout_2",
      userId,
      date: "2026-02-21",
      requestedAt: "2026-02-20T16:25:00.000Z",
      amount: 300,
      currency: "USD",
      status: "Paid",
      method: "Mobile money",
      recipient: "MTN ****222",
      estimatedSettlement: "Paid same day",
      fee: 0,
      netAmount: 300,
      notes: "Processed to mobile money.",
      reference: "MLDZ-P-1000"
    },
    {
      id: "payout_3",
      userId,
      date: "2026-03-03",
      requestedAt: "2026-03-03T08:45:00.000Z",
      amount: 250,
      currency: "USD",
      status: "Scheduled",
      method: "Bank transfer",
      recipient: "MyLive Bank • Ronald Isabirye • ****1024",
      estimatedSettlement: "Within 48 Hours",
      fee: 0,
      netAmount: 250,
      notes: "Queued for next payout run.",
      reference: "MLDZ-P-1002"
    }
  ];

  const analytics = {
    userId,
    availableRanges: ["7", "30", "90"],
    availableCategories: ["All", "Beauty", "Tech", "Faith"],
    rank: {
      currentTier: "Silver",
      nextTier: "Gold",
      progressPercent: 68,
      pointsCurrent: 2040,
      pointsToNext: 3000,
      benefits: {
        Bronze: ["Basic access to campaigns", "Standard support"],
        Silver: ["Priority placement in campaign searches", "Access to mid-tier budgets", "Basic analytics & reporting"],
        Gold: ["Priority support", "High-budget campaigns & early invites", "Deeper analytics & training"]
      }
    },
    benchmarks: {
      viewersPercentile: 78,
      ctrPercentile: 72,
      conversionPercentile: 83,
      salesPercentile: 80
    },
    metricsByCategory: {
      All: {
        "7": { avgViewers: 2380, ctr: 5.4, conversion: 4.6, salesDriven: 4380 },
        "30": { avgViewers: 2300, ctr: 5.1, conversion: 4.8, salesDriven: 4200 },
        "90": { avgViewers: 2210, ctr: 4.9, conversion: 4.5, salesDriven: 3980 }
      },
      Beauty: {
        "7": { avgViewers: 2520, ctr: 5.8, conversion: 5.1, salesDriven: 4720 },
        "30": { avgViewers: 2440, ctr: 5.5, conversion: 5.0, salesDriven: 4510 },
        "90": { avgViewers: 2360, ctr: 5.2, conversion: 4.8, salesDriven: 4300 }
      },
      Tech: {
        "7": { avgViewers: 2420, ctr: 5.6, conversion: 4.4, salesDriven: 4590 },
        "30": { avgViewers: 2350, ctr: 5.3, conversion: 4.2, salesDriven: 4380 },
        "90": { avgViewers: 2280, ctr: 5.0, conversion: 4.0, salesDriven: 4120 }
      },
      Faith: {
        "7": { avgViewers: 1950, ctr: 4.8, conversion: 4.0, salesDriven: 3120 },
        "30": { avgViewers: 1880, ctr: 4.5, conversion: 3.9, salesDriven: 2960 },
        "90": { avgViewers: 1810, ctr: 4.3, conversion: 3.7, salesDriven: 2810 }
      }
    },
    campaigns: [
      { id: "analytics_camp_1", name: "Autumn Beauty Flash", seller: "GlowUp Hub", category: "Beauty", sales: 2600, engagements: 4300, convRate: 4.8 },
      { id: "analytics_camp_2", name: "Tech Friday Mega Live", seller: "GadgetMart Africa", category: "Tech", sales: 3100, engagements: 5200, convRate: 4.2 },
      { id: "analytics_camp_3", name: "Faith & Wellness Morning Dealz", seller: "Grace Living Store", category: "Faith", sales: 1200, engagements: 2100, convRate: 3.9 },
      { id: "analytics_camp_4", name: "Gadget Unboxing Marathon", seller: "GadgetMart Africa", category: "Tech", sales: 1800, engagements: 4800, convRate: 3.1 },
      { id: "analytics_camp_5", name: "Beauty Flash + Night Care", seller: "GlowUp Hub", category: "Beauty", sales: 900, engagements: 1600, convRate: 4.5 }
    ],
    trend: Array.from({ length: 90 }, (_, index) => {
      const day = index + 1;
      const beautyBoost = day % 3 === 0 ? 1.12 : 1;
      const techBoost = day % 5 === 0 ? 1.15 : 1;
      const faithBoost = day % 7 === 0 ? 1.08 : 1;
      return {
        label: `Day ${day}`,
        views: Math.round(1800 + day * 7 + Math.sin(day / 4) * 120),
        clicks: Math.round(250 + day * 1.8 + Math.cos(day / 5) * 25),
        conversions: Math.round(16 + day * 0.08 + Math.sin(day / 6) * 2),
        sales: Math.round(420 + day * 9 + Math.sin(day / 7) * 55),
        categories: {
          Beauty: { sales: Math.round((420 + day * 9) * 0.42 * beautyBoost), conversions: Math.round((16 + day * 0.08) * 0.4 * beautyBoost) },
          Tech: { sales: Math.round((420 + day * 9) * 0.38 * techBoost), conversions: Math.round((16 + day * 0.08) * 0.34 * techBoost) },
          Faith: { sales: Math.round((420 + day * 9) * 0.2 * faithBoost), conversions: Math.round((16 + day * 0.08) * 0.26 * faithBoost) }
        }
      };
    }),
    goals: [
      { id: "goal_1", label: "Average viewers per live", current: 2300, target: 2600, unit: "viewers" },
      { id: "goal_2", label: "Conversion rate", current: 4.8, target: 5.2, unit: "%" },
      { id: "goal_3", label: "Monthly sales driven", current: 4200, target: 6000, unit: "USD" }
    ],
    recommendations: [
      "Open Beauty lives with the strongest supplier hero product in the first 90 seconds.",
      "Add a mid-live CTA reminder in Tech sessions after the second demo block.",
      "Bundle replay clips with tracked links within one hour of ending the live."
    ],
    leaderboard: [
      { creator: "Amina K.", score: 95, tier: "Gold" },
      { creator: "Ronald Isabirye", score: 92, tier: "Silver" },
      { creator: "Noah K.", score: 88, tier: "Silver" }
    ],
    lastUpdatedAt: "2026-03-03T09:10:00.000Z"
  };

  const notifications = [
    {
      id: "notif_1",
      userId,
      type: "proposal",
      title: "New proposal from GlowUp Hub",
      message: "Review proposal",
      brand: "GlowUp Hub",
      campaign: "Autumn Beauty Flash",
      createdAt: "2026-03-01T08:00:00.000Z",
      read: false,
      link: "/proposals"
    },
    {
      id: "notif_2",
      userId,
      type: "contract",
      title: "Invite accepted - contract draft ready",
      message: "Open contract",
      brand: "GadgetMart Africa",
      campaign: "Tech Friday Mega Live",
      createdAt: "2026-02-28T18:00:00.000Z",
      read: false,
      link: "/contracts"
    },
    {
      id: "notif_3",
      userId,
      type: "live",
      title: "Live starts in 45 minutes",
      message: "Open Live Studio",
      brand: "GlowUp Hub",
      campaign: "Beauty Flash Live",
      createdAt: "2026-03-01T09:00:00.000Z",
      read: false,
      link: "/live-studio"
    },
    {
      id: "notif_4",
      userId,
      type: "payout",
      title: "Payout scheduled",
      message: "View payouts",
      brand: "Finance",
      campaign: "Payout",
      createdAt: "2026-02-27T12:00:00.000Z",
      read: true,
      link: "/payout-history"
    },
    {
      id: "notif_5",
      userId,
      type: "media",
      title: "Clips from your last live are ready",
      message: "Review clips",
      brand: "Media",
      campaign: "Autumn Beauty",
      createdAt: "2026-02-26T14:00:00.000Z",
      read: true,
      link: "/live-history"
    }
  ];

  const settings = {
    userId,
    profile: {
      name: creatorProfile.name,
      handle: creatorProfile.handle,
      tagline: creatorProfile.tagline,
      country: "Uganda",
      timezone: "Africa/Kampala",
      currency: "USD",
      bio: creatorProfile.bio,
      email: "creator@mylivedealz.com",
      phone: "+256700000000",
      whatsapp: "+256700000000",
      contentLanguages: creatorProfile.languages,
      audienceRegions: creatorProfile.regions,
      creatorType: "Individual"
    },
    preferences: {
      lines: ["Beauty", "Tech", "Faith"],
      models: ["Flat fee", "Flat fee + commission"],
      formats: ["Live Sessionz", "Shoppable Adz", "Replay clips", "UGC"],
      inviteRules: "Auto-allow open collaboration invites, review invite-only manually.",
      supplierType: "Seller + Provider",
      availability: {
        days: ["Mon", "Tue", "Thu", "Fri", "Sun"],
        timeWindow: "08:00 - 20:00 EAT"
      }
    },
    socials: {
      instagram: "@ronald.creates",
      tiktok: "@ronald.creates.live",
      youtube: "https://youtube.com/@ronaldcreates",
      primaryPlatform: "instagram",
      primaryOtherPlatform: "",
      primaryOtherCustomName: "",
      primaryOtherHandle: "",
      primaryOtherFollowers: "",
      extra: []
    },
    review: {
      seenPolicies: { platform: true, content: true, payout: true },
      scrolledToBottom: true,
      confirmMultiUserCompliance: false,
      acceptTerms: true,
      acceptedAt: "2026-02-20T09:15:00.000Z"
    },
    settings: {
      calendar: {
        shareAvailability: true,
        visibility: "Admins only",
        googleConnected: false
      },
      notifications: {
        proposals: true,
        liveReminders: true,
        payouts: true,
        securityAlerts: true,
        calendarUpdates: true,
        platformNews: false
      },
      privacy: {
        profileVisibility: "Public",
        allowDMsFrom: "All suppliers",
        allowExternalGuests: true,
        blockedSellers: ["Fake Dealz Ltd"]
      },
      devices: [
        { id: "device_1", name: "Chrome on MacBook", lastActive: "Today" },
        { id: "device_2", name: "Safari on iPhone", lastActive: "Yesterday" }
      ],
      audit: [
        { id: "audit_settings_seed", when: "2026-02-24T08:30:00.000Z", what: "Settings initialized", meta: "Seed settings profile" }
      ]
    },
    kyc: {
      status: "verified",
      documentType: "Passport",
      idUploaded: true,
      selfieUploaded: true,
      addressUploaded: true
    },
    payout: {
      method: "Bank transfer",
      methodType: "bank",
      detail: "MyLive Bank • Ronald Isabirye • ****1024",
      currency: "USD",
      schedule: "Weekly",
      minThreshold: 50,
      bank: {
        accountName: "Ronald Isabirye",
        bankName: "MyLive Bank",
        accountNumberMasked: "****1024"
      },
      mobile: { provider: "MTN", numberMasked: "****222" },
      verification: { status: "verified" },
      tax: { tinMasked: "TIN-***-118" },
      acceptPayoutPolicy: true
    },
    notifications: {
      proposals: true,
      liveReminders: true,
      payouts: true,
      securityAlerts: true,
      calendarUpdates: true,
      platformNews: false
    },
    security: {
      twoFactorEnabled: true,
      devices: [
        { id: "device_1", name: "Chrome on MacBook", lastActive: "Today" },
        { id: "device_2", name: "Safari on iPhone", lastActive: "Yesterday" }
      ]
    }
  };

  const uploads = [
    {
      id: "upload_seed_media_kit",
      userId,
      name: "ronald-media-kit.pdf",
      fileName: "ronald-media-kit.pdf",
      mimeType: "application/pdf",
      kind: "document",
      size: 1488896,
      purpose: "settings_media_kit",
      relatedEntityType: "settings",
      relatedEntityId: userId,
      status: "stored",
      createdAt: "2026-02-24T08:30:00.000Z",
      url: "mldz://upload/upload_seed_media_kit/ronald-media-kit.pdf"
    }
  ];

  const onboardingWorkflows = [
    {
      userId,
      stepIndex: 5,
      maxUnlocked: 5,
      savedAt: "2026-02-20T09:00:00.000Z",
      submittedAt: "2026-02-20T09:15:00.000Z",
      approvalApplicationId: "approval_seed_ronald",
      form: {
        profile: {
          name: creatorProfile.name,
          handle: `@${creatorProfile.handle}`,
          tagline: creatorProfile.tagline,
          country: "Uganda",
          timezone: "Africa/Kampala",
          currency: "USD",
          bio: creatorProfile.bio,
          contentLanguages: creatorProfile.languages,
          audienceRegions: creatorProfile.regions,
          creatorType: "Individual",
          email: "creator@mylivedealz.com",
          phone: "+256700000000",
          whatsapp: "+256700000000",
          profilePhotoName: "ronald-avatar.png",
          mediaKitName: "ronald-media-kit.pdf",
          team: { name: "", type: "", size: "", website: "", logoName: "" },
          agency: { name: "", type: "", website: "", logoName: "" }
        },
        socials: {
          instagram: "@ronald.creates",
          tiktok: "@ronald.creates.live",
          youtube: "https://youtube.com/@ronaldcreates",
          primaryPlatform: "Instagram",
          primaryOtherPlatform: "",
          primaryOtherCustomName: "",
          primaryOtherHandle: "",
          primaryOtherFollowers: "",
          extra: []
        },
        kyc: {
          status: "verified",
          documentType: "Passport",
          idFileName: "passport.pdf",
          selfieFileName: "selfie.png",
          addressFileName: "utility-bill.pdf",
          idUploaded: true,
          selfieUploaded: true,
          addressUploaded: true,
          org: {
            registrationFileName: "",
            taxFileName: "",
            authorizationFileName: "",
            registrationUploaded: false,
            taxUploaded: false,
            authorizationUploaded: false
          }
        },
        payout: {
          method: "Bank transfer",
          currency: "USD",
          schedule: "Weekly",
          minThreshold: 50,
          acceptPayoutPolicy: true,
          verificationDeliveryMethod: "Email",
          verificationContactValue: "creator@mylivedealz.com",
          verification: { status: "verified", code: "" },
          bank: {
            bankName: "MyLive Bank",
            accountName: creatorProfile.name,
            accountNumber: "1024",
            swift: "MLDZUGKA"
          },
          mobile: { provider: "MTN", phone: "+256700000000" },
          wallet: { email: "creator@mylivedealz.com" },
          alipay: { name: "", account: "" },
          wechat: { name: "", wechatId: "", phone: "" },
          tax: { residencyCountry: "Uganda", taxId: "TIN-118" },
          scrolledToBottomPayout: true
        },
        preferences: {
          lines: ["Beauty & Skincare", "Tech & Gadgets", "Faith & Wellness"],
          formats: ["Live Sessionz", "Shoppable Adz", "Replay clips"],
          models: ["Flat fee", "Commission", "Hybrid"],
          availability: { days: ["Mon", "Tue", "Thu", "Fri"], timeWindow: "08:00 - 20:00 EAT" },
          rateCard: { minFlatFee: "150", preferredCommissionPct: "12", notes: "Open to hybrid deals." },
          inviteRules: "Auto-allow open collaboration invites, review invite-only manually.",
          supplierType: "Seller + Provider"
        },
        review: {
          seenPolicies: { platform: true, content: true, payout: true },
          scrolledToBottom: true,
          confirmMultiUserCompliance: false,
          acceptTerms: true
        }
      }
    }
  ];

  const accountApprovals = [
    {
      id: "approval_seed_ronald",
      userId,
      status: "Approved",
      etaMin: 0,
      submittedAt: "2026-02-20T09:15:00.000Z",
      creatorId,
      displayName: creatorProfile.name,
      creatorHandle: `@${creatorProfile.handle}`,
      primaryLine: creatorProfile.categories[0],
      adminReason: "",
      adminDocs: [],
      items: [],
      note: "",
      attachments: [],
      preferences: { email: true, inApp: true },
      history: [
        { atISO: "2026-02-20T09:15:00.000Z", status: "UnderReview", msg: "Application submitted" },
        { atISO: "2026-02-20T11:45:00.000Z", status: "Approved", msg: "Creator account approved." }
      ],
      onboardingSnapshot: onboardingWorkflows[0].form
    }
  ];

  const contentApprovals = [
    {
      id: "submission_glowup_reel",
      userId,
      title: "IG Reel Draft — Serum Promo",
      campaign: "GlowUp Serum Promo",
      supplier: { name: "GlowUp Hub", type: "Seller" },
      channel: "Instagram",
      type: "Video",
      desk: "General",
      status: "Under Review",
      riskScore: 28,
      submittedAtISO: "2026-03-01T08:40:00.000Z",
      dueAtISO: "2026-03-03T01:00:00.000Z",
      notesFromCreator: "Short 15s hook + benefits + CTA. Please confirm compliance wording.",
      caption: "GlowUp Serum Dealz now live. Limited stock. Tap to shop with my link. #MyLiveDealz #ShoppableAdz #ad",
      assets: [
        { name: "ig-reel-draft.mp4", type: "Video", size: "14.8 MB" },
        { name: "cover-4x5.png", type: "Image", size: "1.2 MB" }
      ],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T08:58:00.000Z",
      audit: [
        { atISO: "2026-03-01T08:40:00.000Z", msg: "Submitted" },
        { atISO: "2026-03-01T08:58:00.000Z", msg: "Moved to Under Review" }
      ]
    },
    {
      id: "submission_gadget_script",
      userId,
      title: "TikTok Script — Tech Friday Mega",
      campaign: "Tech Friday Mega",
      supplier: { name: "GadgetMart Africa", type: "Seller" },
      channel: "TikTok",
      type: "Caption",
      desk: "General",
      status: "Changes Requested",
      riskScore: 52,
      submittedAtISO: "2026-02-28T15:20:00.000Z",
      dueAtISO: "2026-03-01T10:30:00.000Z",
      notesFromCreator: "Script focuses on unboxing + quick price anchor + bundle CTA.",
      caption: "Tech Friday Mega Live: gadgets bundles + fast checkout. Join live and shop. {LINK}",
      assets: [{ name: "tiktok-script.txt", type: "Doc", size: "12 KB" }],
      flags: { missingDisclosure: true, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T10:30:00.000Z",
      audit: [
        { atISO: "2026-02-28T15:20:00.000Z", msg: "Submitted" },
        { atISO: "2026-02-28T16:25:00.000Z", msg: "Changes requested: add #ad disclosure" }
      ]
    },
    {
      id: "submission_faith_clip",
      userId,
      title: "YouTube Short — Grace bundle clip",
      campaign: "Grace Wellness Bundle",
      supplier: { name: "Grace Living Store", type: "Seller" },
      channel: "YouTube",
      type: "Video",
      desk: "Faith",
      status: "Escalated",
      riskScore: 78,
      submittedAtISO: "2026-03-01T10:20:00.000Z",
      dueAtISO: "2026-03-02T18:30:00.000Z",
      notesFromCreator: "45s cut, includes pricing overlay and CTA.",
      caption: "Grace bundle now available on MyLiveDealz. Tap to view details and order. #ad",
      assets: [{ name: "grace-short-v2.mp4", type: "Video", size: "19.4 MB" }],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: true },
      lastUpdatedISO: "2026-03-01T10:42:00.000Z",
      audit: [
        { atISO: "2026-03-01T10:20:00.000Z", msg: "Submitted" },
        { atISO: "2026-03-01T10:42:00.000Z", msg: "Escalated to Faith Desk" }
      ]
    },
    {
      id: "submission_whatsapp_broadcast",
      userId,
      title: "WhatsApp Broadcast — Service Package",
      campaign: "Care Plus Service Pack",
      supplier: { name: "Care Plus Providers", type: "Provider" },
      channel: "WhatsApp",
      type: "Caption",
      desk: "Medical",
      status: "Approved",
      riskScore: 18,
      submittedAtISO: "2026-02-27T06:30:00.000Z",
      dueAtISO: "2026-02-28T10:30:00.000Z",
      notesFromCreator: "Simple broadcast message and CTA to book.",
      caption: "Care Plus service package is now open for bookings on MyLiveDealz. #ad",
      assets: [{ name: "careplus-copy.docx", type: "Doc", size: "18 KB" }],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-02-27T08:00:00.000Z",
      audit: [
        { atISO: "2026-02-27T06:30:00.000Z", msg: "Submitted" },
        { atISO: "2026-02-27T08:00:00.000Z", msg: "Approved" }
      ]
    },
    {
      id: "submission_faith_story",
      userId,
      title: "IG Story Set — Faith Offer",
      campaign: "Sunday Grace Picks",
      supplier: { name: "Grace Living Store", type: "Seller" },
      channel: "Instagram",
      type: "Image",
      desk: "Faith",
      status: "Pending",
      riskScore: 35,
      submittedAtISO: "2026-03-01T07:00:00.000Z",
      dueAtISO: "2026-03-02T13:00:00.000Z",
      notesFromCreator: "Please validate tone and desk guidelines.",
      caption: "Sunday Grace Picks are now live in my storefront. #ad",
      assets: [
        { name: "faith-story-1.png", type: "Image", size: "640 KB" },
        { name: "faith-story-2.png", type: "Image", size: "612 KB" }
      ],
      flags: { missingDisclosure: false, sensitiveClaim: false, brandRestriction: false },
      lastUpdatedISO: "2026-03-01T07:00:00.000Z",
      audit: [{ atISO: "2026-03-01T07:00:00.000Z", msg: "Submitted" }]
    }
  ];

  const subscription = {
    userId,
    plan: "pro",
    cycle: "monthly",
    status: "active",
    renewsAt: "2026-03-30",
    cancelAtPeriodEnd: false,
    billingEmail: "creator@mylivedealz.com",
    billingMethod: {
      type: "card",
      label: "Visa ending in 4242",
      brand: "Visa",
      last4: "4242",
      holderName: creatorProfile.name,
      expMonth: 12,
      expYear: 2028
    },
    support: {
      contactEmail: "support@mylivedealz.com",
      salesEmail: "sales@mylivedealz.com",
      helpCenterUrl: "https://support.mylivedealz.com/hc",
      managerName: "Creator Support"
    },
    notes: [
      "Subscriptions unlock creator tools like multi-platform streaming, Pro overlays, automation, and deeper analytics.",
      "Subscription access is still controlled by Roles & Permissions for the workspace.",
      "Creator rank is performance-based and is not changed by the subscription plan."
    ],
    limits: {
      liveSessionz: "Unlimited",
      shoppableAdz: "Unlimited",
      livePlusShoppables: "Unlimited",
      crewPerLive: "Unlimited",
      streamDestinations: "Unlimited",
      storage: "50 GB",
      analyticsHistory: "12 months",
      notifications: "Unlimited"
    },
    updatedAt: now
  };

  const roles = [
    {
      id: "role_creator_owner",
      name: "Creator Owner",
      badge: "System",
      description: "Full workspace access.",
      perms: {
        "dealz.view": true,
        "dealz.create": true,
        "dealz.edit": true,
        "dealz.publish_links": true,
        "analytics.view": true,
        "reviews.view": true,
        "subscription.view": true,
        "crew.manage_assignments": true,
        "roles.manage": true,
        "admin.manage_roles": true,
        "admin.manage_team": true,
        "admin.security": true,
        "admin.audit": true
      }
    },
    {
      id: "role_producer",
      name: "Producer",
      badge: "System",
      description: "Can operate live production surfaces.",
      perms: {
        "studio.switch_scenes": true,
        "dealz.pin": true,
        "chat.mute": true,
        "chat.timeout": true,
        "analytics.view": false,
        "roles.manage": false
      }
    },
    {
      id: "role_moderator",
      name: "Moderator",
      badge: "System",
      description: "Can manage audience and comment safety.",
      perms: {
        "chat.mute": true,
        "chat.timeout": true,
        "chat.delete": true,
        "studio.switch_scenes": false
      }
    }
  ];

  const members = [
    {
      id: "member_1",
      userId,
      name: "Ronald Isabirye",
      email: "creator@mylivedealz.com",
      roleId: "role_creator_owner",
      status: "active",
      seat: "Owner",
      lastActiveLabel: "Now",
      twoFA: "On"
    },
    {
      id: "member_2",
      name: "Amina K.",
      email: "amina@studio.test",
      roleId: "role_producer",
      status: "active",
      seat: "Team",
      lastActiveLabel: "2h ago",
      twoFA: "On"
    },
    {
      id: "member_3",
      name: "Noah K.",
      email: "noah@studio.test",
      roleId: "role_moderator",
      status: "invited",
      seat: "Team",
      lastActiveLabel: "Pending",
      twoFA: "Off",
      createdAtLabel: "Yesterday",
      expiresAtLabel: "In 6 days"
    }
  ];

  // Workspace-wide security & invite policies consumed by /roles-permissions.
  // These are intentionally separate from per-user settings (e.g. /api/settings).
  const workspaceSecurity = {
    require2FA: true,
    allowExternalInvites: false,
    supplierGuestExpiryHours: 24,
    inviteDomainAllowlist: ["creator.com", "studio.com", "mylivedealz.com", "studio.test"]
  };

  const crew = {
    userId,
    sessions: liveSessions.map((session) => ({
      sessionId: session.id,
      assignments: [
        { memberId: "member_2", roleId: "role_producer" },
        { memberId: "member_3", roleId: "role_moderator" }
      ]
    })),
    availabilityByMember: {
      member_2: [{ id: "evt_1", startISO: "2026-03-02T16:00:00.000Z", endISO: "2026-03-02T20:00:00.000Z", title: "GlowUp production block" }],
      member_3: [{ id: "evt_2", startISO: "2026-03-02T17:00:00.000Z", endISO: "2026-03-02T19:00:00.000Z", title: "Moderation slot" }]
    }
  };

  const toolConfigs = {
    audienceNotifications: {
      userId,
      sessionId: "live_beauty_flash",
      enabledChannels: ["WhatsApp", "SMS", "Push"],
      enabledReminders: ["T-24h", "T-1h", "Live Now", "Deal Drop"],
      replayDelayMinutes: 45
    },
    liveAlerts: {
      userId,
      sessionId: "live_beauty_flash",
      enabledDestinations: ["WhatsApp", "Telegram"],
      draftText: "We're live. Join the Beauty Flash now.",
      frequencyCapMinutes: 15
    },
    overlays: {
      userId,
      variant: "Variant B",
      qrEnabled: true,
      qrLabel: "Scan to shop",
      qrUrl: "https://go.mylivedealz.com/bf1",
      destUrl: "https://mldz.link/beautyflash"
    },
    postLive: {
      userId,
      sessionId: "live_beauty_flash",
      published: false,
      allowComments: true,
      showProductStrip: true
    },
    streaming: {
      userId,
      sessionId: "live_beauty_flash",
      selectedDestinations: ["TikTok Live", "Instagram Live"],
      advancedOpen: true,
      recordMaster: true,
      autoReplay: true,
      autoHighlights: true
    },
    safety: {
      userId,
      roleMode: "moderator",
      muteChat: false,
      slowMode: true,
      linkBlocking: true,
      keywordRules: ["spam", "scam", "external checkout"]
    }
  };

  const auditLogs = [
    { id: "audit_seed_1", at: now, actor: "System", action: "Workspace seeded", detail: "Initial demo data loaded.", severity: "info" },
    { id: "audit_seed_2", at: now, actor: "EVzone Admin", action: "KYC verified", detail: "Creator account verified.", severity: "info" },
    { id: "audit_seed_3", at: "2026-03-02T15:40:00.000Z", actor: "creator@mylivedealz.com", action: "Invite response recorded", detail: "GlowUp Hub -> negotiating", severity: "info" },
    { id: "audit_seed_4", at: "2026-03-02T16:20:00.000Z", actor: "Owner", action: "Role updated", detail: "Producer permissions adjusted.", severity: "warn" },
    { id: "audit_seed_5", at: "2026-03-02T17:05:00.000Z", actor: "Security Monitor", action: "Destination key rotation required", detail: "Reconnect TikTok destination token.", severity: "error" }
  ];

  return {
    meta: { version: 1, seededAt: now, updatedAt: now },
    users: [
      {
        id: userId,
        email: "creator@mylivedealz.com",
        passwordHash: hashPassword("Password123!"),
        roles: ["creator", "seller", "buyer", "provider"],
        currentRole: "Creator",
        approvalStatus: "APPROVED",
        onboardingCompleted: true
      }
    ],
    sessions: [],
    creatorProfiles: [creatorProfile],
    sellers,
    opportunities,
    invites,
    proposals,
    campaigns,
    contracts,
    tasks,
    assets,
    liveSessions,
    campaignGiveaways,
    replays,
    reviews,
    adzCampaigns,
    links,
    earnings,
    payouts,
    analytics,
    notifications,
    settings,
    uploads,
    onboardingWorkflows,
    accountApprovals,
    contentApprovals,
    subscription,
    workspaceSecurity,
    roles,
    members,
    crew,
    toolConfigs,
    auditLogs
  };
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

const isExecutedDirectly =
  process.argv[1] != null && import.meta.url === new URL(process.argv[1], 'file:').href;

if (isExecutedDirectly) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
