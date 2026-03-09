import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const scale = Number(process.env.SEED_SCALE ?? '1');
const sellerCount = Number(process.env.SEED_SELLERS ?? 10 * scale);
const creatorCount = Number(process.env.SEED_CREATORS ?? 10 * scale);
const listingsPerSeller = Number(process.env.SEED_LISTINGS_PER_SELLER ?? 5 * scale);
const ordersPerSeller = Number(process.env.SEED_ORDERS_PER_SELLER ?? 10 * scale);
const reviewsPerSeller = Number(process.env.SEED_REVIEWS_PER_SELLER ?? 5 * scale);
const reset = ['1', 'true', 'yes', 'on'].includes(String(process.env.SEED_RESET ?? '').toLowerCase());

const now = new Date();

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

async function main() {
  if (reset) {
    await prisma.reviewReply.deleteMany();
    await prisma.review.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.marketplaceListing.deleteMany();
    await prisma.creatorProfile.deleteMany();
    await prisma.seller.deleteMany();
    await prisma.user.deleteMany();
  }

  const sellerUsers = Array.from({ length: sellerCount }, (_, index) => ({
    id: buildId(`seller_user_${index}`),
    email: `seller${index}@load.test`,
    passwordHash: 'seed',
    role: 'SELLER',
    approvalStatus: 'APPROVED',
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now
  }));

  const creatorUsers = Array.from({ length: creatorCount }, (_, index) => ({
    id: buildId(`creator_user_${index}`),
    email: `creator${index}@load.test`,
    passwordHash: 'seed',
    role: 'CREATOR',
    approvalStatus: 'APPROVED',
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now
  }));

  await prisma.user.createMany({
    data: [...sellerUsers, ...creatorUsers],
    skipDuplicates: true
  });

  const sellers = sellerUsers.map((user, index) => ({
    id: buildId(`seller_${index}`),
    userId: user.id,
    handle: `seller-${index}-${randomUUID().slice(0, 8)}`,
    name: `Seller ${index}`,
    displayName: `Seller ${index}`,
    kind: 'SELLER',
    rating: 4.2,
    isVerified: index % 2 === 0,
    createdAt: now,
    updatedAt: now
  }));

  await prisma.seller.createMany({ data: sellers, skipDuplicates: true });

  const creators = creatorUsers.map((user, index) => ({
    id: buildId(`creator_${index}`),
    userId: user.id,
    name: `Creator ${index}`,
    handle: `creator-${index}-${randomUUID().slice(0, 8)}`,
    tier: 'SILVER',
    rating: 4.5,
    createdAt: now,
    updatedAt: now
  }));

  await prisma.creatorProfile.createMany({ data: creators, skipDuplicates: true });

  const listings = [];
  const listingsBySeller = new Map();
  for (const seller of sellers) {
    const sellerListings = [];
    for (let i = 0; i < listingsPerSeller; i += 1) {
      const listing = {
        id: buildId(`listing_${seller.id}_${i}`),
        userId: seller.userId,
        sellerId: seller.id,
        title: `Listing ${i} for ${seller.displayName}`,
        description: 'Load test listing',
        marketplace: i % 2 === 0 ? 'ExpressMart' : 'Marketplace',
        price: 49 + i,
        currency: 'USD',
        inventoryCount: 100,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      };
      listings.push(listing);
      sellerListings.push(listing);
    }
    listingsBySeller.set(seller.id, sellerListings);
  }

  await prisma.marketplaceListing.createMany({ data: listings, skipDuplicates: true });

  const orders = [];
  const orderItems = [];
  const transactions = [];
  const reviews = [];

  for (const seller of sellers) {
    const sellerListings = listingsBySeller.get(seller.id) ?? [];
    for (let i = 0; i < ordersPerSeller; i += 1) {
      const buyer = pick(creatorUsers);
      const listing = pick(sellerListings);
      const qty = 1 + (i % 3);
      const total = Number(listing?.price ?? 50) * qty;
      const orderId = buildId(`order_${seller.id}_${i}`);

      orders.push({
        id: orderId,
        sellerId: seller.id,
        buyerUserId: buyer?.id ?? null,
        channel: i % 3 === 0 ? 'ExpressMart' : 'Marketplace',
        currency: 'USD',
        total,
        itemCount: qty,
        status: 'CONFIRMED',
        createdAt: now,
        updatedAt: now
      });

      if (listing) {
        orderItems.push({
          id: buildId(`order_item_${orderId}`),
          orderId,
          listingId: listing.id,
          name: listing.title,
          qty,
          unitPrice: Number(listing.price ?? 50),
          currency: 'USD'
        });
      }

      transactions.push({
        id: buildId(`txn_${orderId}`),
        userId: seller.userId,
        sellerId: seller.id,
        orderId,
        type: 'ORDER_PAYMENT',
        status: 'AVAILABLE',
        amount: total,
        currency: 'USD',
        createdAt: now,
        updatedAt: now
      });

      if (i < reviewsPerSeller && buyer) {
        reviews.push({
          id: buildId(`review_${orderId}`),
          reviewerUserId: buyer.id,
          subjectType: 'SELLER',
          subjectId: seller.id,
          subjectUserId: seller.userId,
          ratingOverall: 4 + (i % 2) * 0.5,
          status: 'PUBLISHED',
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  if (orders.length) {
    await prisma.order.createMany({ data: orders, skipDuplicates: true });
  }
  if (orderItems.length) {
    await prisma.orderItem.createMany({ data: orderItems, skipDuplicates: true });
  }
  if (transactions.length) {
    await prisma.transaction.createMany({ data: transactions, skipDuplicates: true });
  }
  if (reviews.length) {
    await prisma.review.createMany({ data: reviews, skipDuplicates: true });
  }

  console.log('Load test seed complete', {
    sellers: sellers.length,
    creators: creators.length,
    listings: listings.length,
    orders: orders.length,
    transactions: transactions.length,
    reviews: reviews.length
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
