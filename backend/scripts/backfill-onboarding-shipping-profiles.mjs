import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readHandlingDays(value, fallback = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function buildShippingProfileData(onboarding, seller) {
  const shipping = asRecord(onboarding.shipping);
  const policies = asRecord(onboarding.policies);
  const shipFrom = asRecord(onboarding.shipFrom);
  const tax = asRecord(onboarding.tax);
  const payout = asRecord(onboarding.payout);
  const regions = Array.from(
    new Set([readString(shipFrom.country), readString(tax.taxCountry)].filter(Boolean))
  );

  return {
    name: 'Default shipping profile',
    description:
      readString(policies.policyNotes) ||
      `Default shipping profile for ${readString(onboarding.storeName) || readString(seller.displayName) || 'seller'}.`,
    status: 'ACTIVE',
    carrier: null,
    serviceLevel: shipping.expressReady ? 'Express' : 'Standard',
    handlingTimeDays: readHandlingDays(shipping.handlingTimeDays, 2),
    regions,
    isDefault: true,
    metadata: {
      source: 'onboarding',
      onboardingRecordKey: 'main',
      profileType: readString(onboarding.profileType) || 'SELLER',
      shipFromCountry: readString(shipFrom.country) || null,
      expressReady: Boolean(shipping.expressReady),
      returnsDays: readNullableNumber(policies.returnsDays),
      warrantyDays: readNullableNumber(policies.warrantyDays),
      payoutCurrency: readString(payout.currency) || null,
    },
  };
}

function profileHasOnboardingSource(profile) {
  const metadata = asRecord(profile?.metadata);
  return readString(metadata.source) === 'onboarding';
}

async function main() {
  const records = await prisma.workflowRecord.findMany({
    where: { recordType: 'onboarding', recordKey: 'main' },
    orderBy: { updatedAt: 'desc' },
  });

  const userIds = Array.from(new Set(records.map((record) => record.userId)));
  const sellers = await prisma.seller.findMany({
    where: { userId: { in: userIds } },
    include: { shippingProfiles: true },
  });
  const sellerByUserId = new Map(sellers.map((seller) => [seller.userId, seller]));

  let profilesTouched = 0;
  let onboardingUpdated = 0;

  for (const record of records) {
    const seller = sellerByUserId.get(record.userId);
    if (!seller) {
      continue;
    }

    const onboarding = asRecord(record.payload);
    const shipping = asRecord(onboarding.shipping);
    const requestedProfileId = readString(shipping.profileId);
    const requestedProfile = requestedProfileId
      ? seller.shippingProfiles.find((profile) => profile.id === requestedProfileId) ?? null
      : null;
    const onboardingProfile =
      seller.shippingProfiles.find(
        (profile) =>
          readString(profile.name) === 'Default shipping profile' || profileHasOnboardingSource(profile)
      ) ?? null;

    const shippingData = buildShippingProfileData(onboarding, seller);

    await prisma.shippingProfile.updateMany({
      where: { sellerId: seller.id },
      data: { isDefault: false },
    });

    const chosenProfile = requestedProfile ?? onboardingProfile;
    const savedProfile = chosenProfile
      ? await prisma.shippingProfile.update({
          where: { id: chosenProfile.id },
          data: shippingData,
        })
      : await prisma.shippingProfile.create({
          data: {
            sellerId: seller.id,
            ...shippingData,
          },
        });

    profilesTouched += 1;

    if (requestedProfileId !== savedProfile.id) {
      await prisma.workflowRecord.update({
        where: {
          userId_recordType_recordKey: {
            userId: record.userId,
            recordType: 'onboarding',
            recordKey: 'main',
          },
        },
        data: {
          payload: {
            ...onboarding,
            shipping: {
              ...shipping,
              profileId: savedProfile.id,
            },
          },
        },
      });
      onboardingUpdated += 1;
    }
  }

  console.log(`Backfilled ${profilesTouched} onboarding shipping profile(s); updated ${onboardingUpdated} onboarding record(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
