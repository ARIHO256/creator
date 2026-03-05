import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.mediaAsset.deleteMany();
  await prisma.appRecord.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.marketplaceListing.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const creator = await prisma.user.create({
    data: {
      email: 'creator@mylivedealz.com',
      passwordHash,
      role: 'CREATOR',
      approvalStatus: 'APPROVED',
      onboardingCompleted: true,
      creatorProfile: {
        create: {
          name: 'Ronald Isabirye',
          handle: 'ronald.creates',
          tier: 'SILVER',
          tagline: 'Live commerce host for Beauty, Tech, and Faith-compatible offers.',
          bio: 'Creator focused on trusted live selling and conversion-ready campaigns.',
          categories: JSON.stringify(['Beauty & Skincare', 'Tech & Gadgets']),
          regions: JSON.stringify(['East Africa']),
          languages: JSON.stringify(['English', 'Luganda']),
          followers: 18200,
          rating: 4.8,
          totalSalesDriven: 31240,
          isKycVerified: true
        }
      }
    }
  });

  const sellers = await Promise.all([
    prisma.seller.create({
      data: {
        name: 'GlowUp Hub',
        type: 'Seller',
        category: 'Beauty & Skincare',
        region: 'East Africa',
        rating: 4.9,
        isVerified: true
      }
    }),
    prisma.seller.create({
      data: {
        name: 'GadgetMart Africa',
        type: 'Seller',
        category: 'Tech & Gadgets',
        region: 'East Africa',
        rating: 4.7,
        isVerified: true
      }
    })
  ]);

  await prisma.opportunity.createMany({
    data: [
      {
        sellerId: sellers[0].id,
        title: 'Autumn Beauty Flash',
        description: 'Two-part Beauty Flash live plus supporting clips and tracked links.',
        payBand: '$400 - $700 + commission',
        status: 'OPEN'
      },
      {
        sellerId: sellers[1].id,
        title: 'Tech Friday Mega Live',
        description: 'Series focused on EV-friendly gadgets and accessories.',
        payBand: '$900 - $1,400 flat',
        status: 'OPEN'
      }
    ]
  });

  const deal = await prisma.deal.create({
    data: {
      userId: creator.id,
      title: 'Creator Intro Deal',
      description: 'Kickoff deal prepared for marketplace publishing',
      category: 'Beauty & Skincare',
      price: 29,
      currency: 'USD',
      status: 'ACTIVE'
    }
  });

  await prisma.marketplaceListing.create({
    data: {
      userId: creator.id,
      dealId: deal.id,
      title: 'GlowUp Starter Bundle',
      description: 'Live-ready bundle with promo routing support',
      price: 29,
      currency: 'USD',
      status: 'ACTIVE'
    }
  });

  await prisma.analyticsEvent.createMany({
    data: [
      { userId: creator.id, eventType: 'VIEW', value: 1200, meta: JSON.stringify({ surface: 'home' }) },
      { userId: creator.id, eventType: 'CLICK', value: 320, meta: JSON.stringify({ surface: 'dealz-marketplace' }) },
      { userId: creator.id, eventType: 'PURCHASE', value: 42, meta: JSON.stringify({ surface: 'promo-ad' }) }
    ]
  });

  await prisma.mediaAsset.create({
    data: {
      userId: creator.id,
      name: 'Hero Promo Poster',
      kind: 'image',
      url: 'https://cdn.mylivedealz.com/assets/hero-poster.jpg'
    }
  });

  await prisma.appRecord.createMany({
    data: [
      { userId: creator.id, domain: 'dashboard', entityType: 'bootstrap', entityId: 'default', payload: { featureFlags: { liveStudio: true }, navBadges: { notifications: 2 } } },
      { userId: creator.id, domain: 'dashboard', entityType: 'feed', entityId: 'home', payload: { hero: { title: 'Welcome back, Ronald' }, quickStats: [{ label: 'Active deals', value: 1 }] } },
      { userId: creator.id, domain: 'dashboard', entityType: 'my_day', entityId: 'today', payload: { agenda: [], tasks: [] } },
      { userId: null, domain: 'dashboard', entityType: 'landing', entityId: 'public', payload: { title: 'MyLiveDealz Creator', subtitle: 'Run live shopping, pitches, and payouts' } },

      { userId: creator.id, domain: 'discovery', entityType: 'invite', entityId: 'invite_1', payload: { seller: 'GlowUp Hub', campaign: 'Autumn Beauty Flash', status: 'pending' } },
      { userId: creator.id, domain: 'discovery', entityType: 'campaign_board', entityId: 'cb_1', payload: { title: 'Autumn Beauty Flash', stage: 'negotiating' } },
      { userId: creator.id, domain: 'discovery', entityType: 'dealz_marketplace', entityId: 'dm_1', payload: { title: 'GlowUp Starter Bundle', type: 'live_plus_adz', status: 'active' } },

      { userId: creator.id, domain: 'collaboration', entityType: 'campaign', entityId: 'camp_1', payload: { title: 'GlowUp Flash', stage: 'active' } },
      { userId: creator.id, domain: 'collaboration', entityType: 'proposal', entityId: 'prop_1', payload: { brand: 'GlowUp Hub', status: 'in_negotiation', messages: [] } },
      { userId: creator.id, domain: 'collaboration', entityType: 'contract', entityId: 'contract_1', payload: { title: 'GlowUp Contract', status: 'active' } },
      { userId: creator.id, domain: 'collaboration', entityType: 'task', entityId: 'task_1', payload: { title: 'Prepare promo script', column: 'todo', comments: [] } },
      { userId: creator.id, domain: 'collaboration', entityType: 'asset', entityId: 'asset_1', payload: { title: 'Product teaser clip', status: 'draft' } },

      { userId: creator.id, domain: 'live', entityType: 'session', entityId: 'live_1', payload: { title: 'Friday Live Session', status: 'scheduled' } },
      { userId: creator.id, domain: 'live', entityType: 'studio', entityId: 'live_1', payload: { mode: 'builder', status: 'ready', moments: [] } },
      { userId: creator.id, domain: 'live', entityType: 'replay', entityId: 'live_1', payload: { sessionId: 'live_1', published: false } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'audience-notifications', payload: { enabled: true } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'live-alerts', payload: { enabled: true } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'overlays', payload: { style: 'default' } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'post-live', payload: { autoPublish: false } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'streaming', payload: { destinations: [] } },
      { userId: creator.id, domain: 'live', entityType: 'tool_config', entityId: 'safety', payload: { strictMode: false } },

      { userId: creator.id, domain: 'adz', entityType: 'campaign', entityId: 'adz_1', payload: { title: 'GlowUp Shoppable Ad', status: 'draft' } },
      { userId: creator.id, domain: 'adz', entityType: 'performance', entityId: 'adz_1', payload: { clicks: 120, purchases: 8, earnings: 240 } },
      { userId: creator.id, domain: 'adz', entityType: 'link', entityId: 'link_1', payload: { title: 'GlowUp promo link', shortUrl: 'https://mldz.link/glowup' } },

      { userId: creator.id, domain: 'finance', entityType: 'earnings_summary', entityId: 'main', payload: { available: 1240, pending: 320, lifetime: 8140 } },
      { userId: creator.id, domain: 'finance', entityType: 'analytics_overview', entityId: 'main', payload: { rank: 'Silver', score: 82 } },
      { userId: creator.id, domain: 'finance', entityType: 'subscription', entityId: 'main', payload: { plan: 'pro', cycle: 'monthly' } },

      { userId: creator.id, domain: 'settings', entityType: 'profile', entityId: 'main', payload: { timezone: 'Africa/Kampala', language: 'en' } },
      { userId: creator.id, domain: 'settings', entityType: 'notification', entityId: 'notif_1', payload: { title: 'New invite', read: false } },
      { userId: creator.id, domain: 'settings', entityType: 'role', entityId: 'owner', payload: { name: 'Owner', perms: { '*': true } } },
      { userId: creator.id, domain: 'settings', entityType: 'member', entityId: 'member_1', payload: { email: 'creator@mylivedealz.com', roleId: 'owner' } },
      { userId: creator.id, domain: 'settings', entityType: 'crew_session', entityId: 'live_1', payload: { members: [] } },
      { userId: creator.id, domain: 'settings', entityType: 'audit_log', entityId: 'log_1', payload: { action: 'Seed initialized', at: new Date().toISOString() } },

      { userId: creator.id, domain: 'workflow', entityType: 'onboarding', entityId: 'main', payload: { status: 'completed' } },
      { userId: creator.id, domain: 'workflow', entityType: 'account_approval', entityId: 'main', payload: { status: 'approved' } },
      { userId: creator.id, domain: 'workflow', entityType: 'content_approval', entityId: 'content_1', payload: { title: 'Intro clip', status: 'pending' } },

      { userId: creator.id, domain: 'reviews', entityType: 'dashboard', entityId: 'main', payload: { score: 4.8, trends: [] } },
      { userId: creator.id, domain: 'reviews', entityType: 'live_review', entityId: 'lr_1', payload: { sessionId: 'live_1', score: 4.7 } }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete. Login: creator@mylivedealz.com / Password123!');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
