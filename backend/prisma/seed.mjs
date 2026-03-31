import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Password123!';

async function upsertUser({ email, role }) {
  const passwordHash = await hash(DEFAULT_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role,
      passwordHash
    },
    create: {
      email,
      passwordHash,
      role
    }
  });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_role: {
        userId: user.id,
        role
      }
    },
    update: {},
    create: {
      userId: user.id,
      role
    }
  });

  return user;
}

async function main() {
  const creator = await upsertUser({
    email: 'creator@mylivedealz.com',
    role: UserRole.CREATOR
  });

  const seller = await upsertUser({
    email: 'seller@mylivedealz.com',
    role: UserRole.SELLER
  });

  console.log('Seed complete');
  console.log(`creator: ${creator.email} / ${DEFAULT_PASSWORD}`);
  console.log(`seller: ${seller.email} / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
