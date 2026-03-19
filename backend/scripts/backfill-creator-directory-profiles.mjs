import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROFILE_TEMPLATES = [
  {
    categories: ['Beauty', 'Skincare'],
    regions: ['Uganda', 'Kenya', 'Tanzania'],
    languages: ['English', 'Swahili'],
    tagline: 'Skincare routines, live tutorials, and product reviews.',
  },
  {
    categories: ['Tech', 'Gadgets', 'EV'],
    regions: ['Uganda', 'Kenya', 'Nigeria'],
    languages: ['English'],
    tagline: 'Unboxings, EV gadgets, and smart home demos.',
  },
  {
    categories: ['Fashion', 'Lifestyle'],
    regions: ['Ghana', 'Nigeria'],
    languages: ['English', 'French'],
    tagline: 'Try-ons, street style, and live haul sessions.',
  },
  {
    categories: ['Faith', 'Wellness'],
    regions: ['Uganda', 'Kenya'],
    languages: ['English'],
    tagline: 'Faith-friendly wellness, calm routines, and lifestyle talk.',
  },
  {
    categories: ['Home', 'Kitchen'],
    regions: ['Uganda', 'Rwanda'],
    languages: ['English', 'Swahili'],
    tagline: 'Practical home upgrades, cookware, and everyday finds.',
  },
  {
    categories: ['Parenting', 'Family'],
    regions: ['Uganda', 'Kenya'],
    languages: ['English'],
    tagline: 'Family essentials, routines, and honest product picks.',
  },
  {
    categories: ['Food', 'Beverage'],
    regions: ['Tanzania', 'Kenya', 'Uganda'],
    languages: ['English', 'Swahili'],
    tagline: 'Tastings, kitchen hacks, and food live sessions.',
  },
  {
    categories: ['Fitness', 'Wellness'],
    regions: ['Uganda', 'Kenya'],
    languages: ['English'],
    tagline: 'Active lifestyle gear, routines, and wellness stories.',
  },
  {
    categories: ['Travel', 'Lifestyle'],
    regions: ['Kenya', 'Rwanda', 'Tanzania'],
    languages: ['English', 'French'],
    tagline: 'Travel-ready essentials, location stories, and brand features.',
  },
  {
    categories: ['Live Shopping', 'General'],
    regions: ['East Africa'],
    languages: ['English'],
    tagline: 'High-energy live selling and audience engagement sessions.',
  },
];

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => readString(entry)).filter(Boolean);
  }
  if (typeof value !== 'string') {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((entry) => readString(entry)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return trimmed
    .split(',')
    .map((entry) => readString(entry))
    .filter(Boolean);
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function chooseTemplate(seed) {
  return PROFILE_TEMPLATES[seed % PROFILE_TEMPLATES.length];
}

function compactNumber(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount >= 100_000 ? 0 : 1)}K`;
  }
  return String(amount);
}

function titleCase(value) {
  return readString(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function tierForFollowers(followers) {
  if (followers >= 150_000) return 'GOLD';
  if (followers >= 60_000) return 'SILVER';
  return 'BRONZE';
}

function keywordCategories(profile) {
  const source = `${readString(profile.name)} ${readString(profile.handle)}`.toLowerCase();
  if (/(beauty|skin|makeup|lilian)/.test(source)) return ['Beauty', 'Skincare'];
  if (/(tech|gadget|ev|brian|newwave)/.test(source)) return ['Tech', 'Gadgets', 'EV'];
  if (/(faith|grace|wellness)/.test(source)) return ['Faith', 'Wellness'];
  if (/(style|fashion|ama)/.test(source)) return ['Fashion', 'Lifestyle'];
  if (/(fit|fitness|gym)/.test(source)) return ['Fitness', 'Wellness'];
  if (/(food|kitchen|cook)/.test(source)) return ['Food', 'Beverage'];
  if (/(travel|tour)/.test(source)) return ['Travel', 'Lifestyle'];
  return [];
}

function buildGeneratedTagline(categories, template) {
  if (categories.length >= 2) {
    return `${categories[0]} and ${categories[1]} creator with strong live-selling sessions.`;
  }
  if (categories.length === 1) {
    return `${categories[0]} creator with strong live-selling sessions.`;
  }
  return template.tagline;
}

function buildGeneratedBio(name, categories, regions, languages, tagline) {
  const categoryLabel = categories.join(', ') || 'live commerce';
  const regionLabel = regions.join(', ') || 'East Africa';
  const languageLabel = languages.join(', ') || 'English';
  const intro = readString(tagline) || `${name || 'Creator'} builds consistent live-commerce momentum.`;
  return `${intro} Focus areas: ${categoryLabel}. Active markets: ${regionLabel}. Working languages: ${languageLabel}.`;
}

function parseOnboardingPayload(payload) {
  const root = asRecord(payload);
  const metadata = asRecord(root.metadata);
  const creatorForm = asRecord(metadata.creatorForm);
  const profile = asRecord(creatorForm.profile);
  const preferences = asRecord(creatorForm.preferences);
  const socials = asRecord(creatorForm.socials);
  const extraSocials = Array.isArray(socials.extra) ? socials.extra.map((entry) => asRecord(entry)) : [];

  const followerValues = [
    readString(socials.primaryOtherFollowers),
    ...extraSocials.map((entry) => readString(entry.followers)),
  ]
    .map((entry) => Number(String(entry).replace(/[^0-9]/g, '')))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  return {
    name: readString(profile.name) || readString(root.owner),
    handle: readString(profile.handle) || readString(root.storeSlug),
    tagline: readString(profile.tagline) || readString(metadata.tagline),
    bio: readString(profile.bio) || readString(root.about),
    categories: [
      ...readStringList(root.providerServices),
      ...readStringList(preferences.lines),
    ],
    regions: readStringList(profile.audienceRegions),
    languages: readStringList(profile.contentLanguages).length
      ? readStringList(profile.contentLanguages)
      : readStringList(root.languages),
    followers: followerValues.reduce((sum, entry) => sum + entry, 0),
  };
}

function buildSocials(handle, followers, categories) {
  const label = `@${readString(handle).replace(/^@+/, '')}`;
  const joined = categories.join(' ').toLowerCase();
  const platforms = joined.includes('beauty') || joined.includes('fashion')
    ? ['Instagram', 'TikTok', 'WhatsApp']
    : joined.includes('faith') || joined.includes('parenting')
      ? ['Facebook', 'Instagram', 'WhatsApp']
      : joined.includes('tech') || joined.includes('ev') || joined.includes('gadgets')
        ? ['YouTube', 'TikTok', 'Instagram']
        : ['TikTok', 'Instagram', 'YouTube'];
  const colors = {
    Instagram: 'bg-pink-500',
    TikTok: 'bg-black',
    YouTube: 'bg-red-600',
    Facebook: 'bg-blue-600',
    WhatsApp: 'bg-emerald-600',
  };
  const tags = {
    Instagram: 'IG',
    TikTok: 'TT',
    YouTube: 'YT',
    Facebook: 'FB',
    WhatsApp: 'WA',
  };
  const shares = [0.45, 0.35, 0.2];

  return platforms.map((platform, index) => ({
    id: platform.toLowerCase(),
    name: platform,
    handle: label,
    tag: tags[platform],
    followers: compactNumber(Math.max(500, Math.round(followers * shares[index]))),
    color: colors[platform],
    href: null,
  }));
}

function needsProfileBackfill(profile) {
  return (
    !readString(profile.tagline) ||
    readStringList(profile.categories).length === 0 ||
    readStringList(profile.regions).length === 0 ||
    readStringList(profile.languages).length === 0 ||
    Number(profile.followers || 0) <= 0 ||
    !readString(profile.bio)
  );
}

async function main() {
  const profiles = await prisma.creatorProfile.findMany({
    include: {
      user: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  const userIds = profiles.map((profile) => profile.userId);
  const profileIds = profiles.map((profile) => profile.id);

  const [workflowRecords, userSettings, campaigns, contracts, reviews] = await Promise.all([
    prisma.workflowRecord.findMany({
      where: {
        userId: { in: userIds },
        recordType: 'onboarding',
      },
      select: {
        userId: true,
        recordKey: true,
        payload: true,
      },
    }),
    prisma.userSetting.findMany({
      where: {
        userId: { in: userIds },
        key: { in: ['creator_public_profile', 'profile'] },
      },
      select: {
        id: true,
        userId: true,
        key: true,
        payload: true,
      },
    }),
    prisma.campaign.findMany({
      where: {
        creatorId: { in: userIds },
      },
      select: {
        creatorId: true,
        budget: true,
        currency: true,
      },
    }),
    prisma.contract.findMany({
      where: {
        creatorId: { in: userIds },
      },
      select: {
        creatorId: true,
        value: true,
      },
    }),
    prisma.review.findMany({
      where: {
        OR: [
          { subjectUserId: { in: userIds } },
          { subjectId: { in: profileIds } },
        ],
        status: 'PUBLISHED',
      },
      select: {
        subjectUserId: true,
        subjectId: true,
        ratingOverall: true,
      },
    }),
  ]);

  const onboardingByUserId = new Map();
  for (const record of workflowRecords) {
    const rows = onboardingByUserId.get(record.userId) ?? [];
    rows.push(record);
    onboardingByUserId.set(record.userId, rows);
  }

  const creatorPublicProfileByUserId = new Map();
  for (const setting of userSettings) {
    if (setting.key === 'creator_public_profile') {
      creatorPublicProfileByUserId.set(setting.userId, setting);
    }
  }

  const campaignStatsByUserId = new Map();
  for (const campaign of campaigns) {
    const stats = campaignStatsByUserId.get(campaign.creatorId) ?? { count: 0, budget: 0 };
    stats.count += 1;
    stats.budget += Number(campaign.budget || 0);
    campaignStatsByUserId.set(campaign.creatorId, stats);
  }

  const contractStatsByUserId = new Map();
  for (const contract of contracts) {
    const stats = contractStatsByUserId.get(contract.creatorId) ?? { count: 0, value: 0 };
    stats.count += 1;
    stats.value += Number(contract.value || 0);
    contractStatsByUserId.set(contract.creatorId, stats);
  }

  const reviewStatsByKey = new Map();
  for (const review of reviews) {
    const keys = [readString(review.subjectUserId), readString(review.subjectId)].filter(Boolean);
    for (const key of keys) {
      const stats = reviewStatsByKey.get(key) ?? { count: 0, total: 0 };
      stats.count += 1;
      stats.total += Number(review.ratingOverall || 0);
      reviewStatsByKey.set(key, stats);
    }
  }

  let updatedProfiles = 0;
  let updatedWorkspaceProfiles = 0;

  for (const profile of profiles) {
    if (!needsProfileBackfill(profile)) {
      continue;
    }

    const seed = hashString(`${profile.userId}:${profile.handle}:${profile.name}`);
    const template = chooseTemplate(seed);
    const onboardingRows = onboardingByUserId.get(profile.userId) ?? [];
    const creatorOnboarding =
      onboardingRows.find((row) => row.recordKey === 'creator') ??
      onboardingRows.find((row) => {
        const payload = asRecord(row.payload);
        return readString(payload.profileType).toUpperCase() === 'CREATOR';
      }) ??
      null;
    const onboarding = creatorOnboarding ? parseOnboardingPayload(creatorOnboarding.payload) : null;
    const reviewStats = reviewStatsByKey.get(profile.userId) ?? reviewStatsByKey.get(profile.id) ?? { count: 0, total: 0 };
    const campaignStats = campaignStatsByUserId.get(profile.userId) ?? { count: 0, budget: 0 };
    const contractStats = contractStatsByUserId.get(profile.userId) ?? { count: 0, value: 0 };
    const keywordMatches = keywordCategories(profile);

    const categories = readStringList(profile.categories).length
      ? readStringList(profile.categories)
      : onboarding?.categories.length
        ? onboarding.categories
        : keywordMatches.length
          ? keywordMatches
          : template.categories;
    const regions = readStringList(profile.regions).length
      ? readStringList(profile.regions)
      : onboarding?.regions.length
        ? onboarding.regions
        : template.regions;
    const languages = readStringList(profile.languages).length
      ? readStringList(profile.languages)
      : onboarding?.languages.length
        ? onboarding.languages
        : template.languages;
    const followers =
      Number(profile.followers || 0) > 0
        ? Number(profile.followers || 0)
        : onboarding?.followers > 0
          ? onboarding.followers
          : Math.min(
              360_000,
              12_000 + (seed % 180_000) + campaignStats.count * 12_000 + contractStats.count * 18_000 + Math.min(90_000, reviewStats.count * 8)
            );
    const rating =
      reviewStats.count > 0
        ? Number((reviewStats.total / reviewStats.count).toFixed(1))
        : Number(profile.rating || 0) > 0
          ? Number(Number(profile.rating).toFixed(1))
          : Number((4.1 + ((seed % 8) * 0.1)).toFixed(1));
    const tagline = readString(profile.tagline) || readString(onboarding?.tagline) || buildGeneratedTagline(categories, template);
    const name = readString(profile.name) || readString(onboarding?.name) || 'Creator';
    const bio = readString(profile.bio) || readString(onboarding?.bio) || buildGeneratedBio(name, categories, regions, languages, tagline);
    const totalSalesDriven =
      Number(profile.totalSalesDriven || 0) > 0
        ? Number(profile.totalSalesDriven || 0)
        : Math.max(
            contractStats.value,
            campaignStats.budget,
            Math.round(followers * (0.16 + ((seed % 7) * 0.015)))
          );
    const tier = tierForFollowers(followers);

    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        name,
        tagline,
        bio,
        categories: JSON.stringify(categories),
        regions: JSON.stringify(regions),
        languages: JSON.stringify(languages),
        followers,
        rating,
        totalSalesDriven,
        tier,
      },
    });
    updatedProfiles += 1;

    const workspaceSetting = creatorPublicProfileByUserId.get(profile.userId);
    const workspacePayload = asRecord(workspaceSetting?.payload);
    const nextWorkspacePayload = {
      ...workspacePayload,
      about: readString(workspacePayload.about) || bio,
      tags: readStringList(workspacePayload.tags).length ? readStringList(workspacePayload.tags) : categories,
      socials:
        Array.isArray(workspacePayload.socials) && workspacePayload.socials.length > 0
          ? workspacePayload.socials
          : buildSocials(profile.handle, followers, categories),
      portfolio: Array.isArray(workspacePayload.portfolio) ? workspacePayload.portfolio : [],
      liveSlots: Array.isArray(workspacePayload.liveSlots) ? workspacePayload.liveSlots : [],
    };

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId: profile.userId,
          key: 'creator_public_profile',
        },
      },
      update: {
        payload: nextWorkspacePayload,
      },
      create: {
        userId: profile.userId,
        key: 'creator_public_profile',
        payload: nextWorkspacePayload,
      },
    });
    updatedWorkspaceProfiles += 1;
  }

  console.log(`Backfilled ${updatedProfiles} creator profile(s) and ${updatedWorkspaceProfiles} creator workspace profile(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
