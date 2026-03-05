import { PrismaClient } from '@prisma/client';
import { buildSeedData } from '../src/legacy/seed/buildSeedData.js';

const prisma = new PrismaClient();
const snapshotId = process.env.APP_STATE_SNAPSHOT_ID ?? 'creator-app-main';

try {
  const payload = buildSeedData();
  await prisma.creatorAppState.upsert({
    where: { id: snapshotId },
    update: { payload },
    create: { id: snapshotId, payload }
  });
  console.log(`Seeded CreatorAppState(${snapshotId}) with MyLiveDealz Creator App data.`);
} finally {
  await prisma.$disconnect();
}
