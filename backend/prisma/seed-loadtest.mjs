import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const scale = Number(process.env.SEED_SCALE ?? '1');
const sellerCount = Number(process.env.SEED_SELLERS ?? 10 * scale);
const creatorCount = Number(process.env.SEED_CREATORS ?? 10 * scale);
const providerCount = Number(process.env.SEED_PROVIDERS ?? Math.max(1, Math.floor(sellerCount / 4)));
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
    await prisma.userRoleAssignment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.sellerFollow.deleteMany();
    await prisma.savedOpportunity.deleteMany();
    await prisma.message.deleteMany();
    await prisma.messageThread.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.regulatoryDeskItem.deleteMany();
    await prisma.regulatoryDesk.deleteMany();
    await prisma.regulatoryComplianceItem.deleteMany();
    await prisma.adzPerformance.deleteMany();
    await prisma.adzLink.deleteMany();
    await prisma.adzCampaign.deleteMany();
    await prisma.adzBuilder.deleteMany();
    await prisma.promoAd.deleteMany();
    await prisma.liveMoment.deleteMany();
    await prisma.liveStudio.deleteMany();
    await prisma.liveReplay.deleteMany();
    await prisma.liveSession.deleteMany();
    await prisma.liveBuilder.deleteMany();
    await prisma.liveToolConfig.deleteMany();
    await prisma.liveCampaignGiveaway.deleteMany();
    await prisma.wholesaleQuote.deleteMany();
    await prisma.wholesaleRfq.deleteMany();
    await prisma.wholesalePriceList.deleteMany();
    await prisma.providerQuote.deleteMany();
    await prisma.providerBooking.deleteMany();
    await prisma.providerConsultation.deleteMany();
    await prisma.providerPortfolioItem.deleteMany();
    await prisma.storefrontTaxonomyLink.deleteMany();
    await prisma.storefront.deleteMany();
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

  const providerUsers = Array.from({ length: providerCount }, (_, index) => ({
    id: buildId(`provider_user_${index}`),
    email: `provider${index}@load.test`,
    passwordHash: 'seed',
    role: 'PROVIDER',
    approvalStatus: 'APPROVED',
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now
  }));

  await prisma.user.createMany({
    data: [...sellerUsers, ...creatorUsers, ...providerUsers],
    skipDuplicates: true
  });

  await prisma.userRoleAssignment.createMany({
    data: [
      ...sellerUsers.map((user) => ({ userId: user.id, role: 'SELLER' })),
      ...creatorUsers.map((user) => ({ userId: user.id, role: 'CREATOR' })),
      ...providerUsers.map((user) => ({ userId: user.id, role: 'PROVIDER' }))
    ],
    skipDuplicates: true
  });

  const supportContentCount = await prisma.supportContent.count();
  if (supportContentCount === 0) {
    await prisma.supportContent.createMany({
      data: [
        { contentType: 'KB', title: 'Getting Started', body: 'Welcome to the knowledge base.' },
        { contentType: 'FAQ', title: 'How to publish?', body: 'Use the publish button in your dashboard.' },
        { contentType: 'STATUS', title: 'API', status: 'operational', metadata: { uptime: '99.9%' } }
      ],
      skipDuplicates: true
    });
  }

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

  const providers = providerUsers.map((user, index) => ({
    id: buildId(`provider_${index}`),
    userId: user.id,
    handle: `provider-${index}-${randomUUID().slice(0, 8)}`,
    name: `Provider ${index}`,
    displayName: `Provider ${index}`,
    type: 'Provider',
    kind: 'PROVIDER',
    rating: 4.6,
    isVerified: true,
    createdAt: now,
    updatedAt: now
  }));

  await prisma.seller.createMany({ data: [...sellers, ...providers], skipDuplicates: true });

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

  const notifications = [...sellerUsers, ...creatorUsers, ...providerUsers]
    .slice(0, 40)
    .map((user, index) => ({
      id: buildId(`notification_${user.id}_${index}`),
      userId: user.id,
      title: index % 2 === 0 ? 'Welcome to MyLiveDealz' : 'Action required',
      body: 'Your workspace is ready for live operations.',
      kind: index % 2 === 0 ? 'info' : 'action',
      createdAt: now,
      updatedAt: now
    }));

  if (notifications.length) {
    await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
  }

  const messageThreads = [];
  const messages = [];
  for (const user of sellerUsers.slice(0, Math.min(20, sellerUsers.length))) {
    const threadId = buildId(`thread_${user.id}`);
    messageThreads.push({
      id: threadId,
      userId: user.id,
      subject: 'Welcome thread',
      status: 'open',
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now
    });
    messages.push({
      id: buildId(`message_${threadId}_1`),
      threadId,
      senderUserId: user.id,
      senderRole: 'owner',
      body: 'Welcome to your inbox',
      lang: 'en',
      createdAt: now
    });
  }
  if (messageThreads.length) {
    await prisma.messageThread.createMany({ data: messageThreads, skipDuplicates: true });
  }
  if (messages.length) {
    await prisma.message.createMany({ data: messages, skipDuplicates: true });
  }

  const supportTickets = sellerUsers.slice(0, Math.min(20, sellerUsers.length)).map((user, index) => ({
    id: buildId(`ticket_${user.id}`),
    userId: user.id,
    status: 'Open',
    marketplace: 'General',
    category: 'Support',
    subject: `Support ticket ${index + 1}`,
    severity: 'medium',
    createdAt: now,
    updatedAt: now
  }));
  if (supportTickets.length) {
    await prisma.supportTicket.createMany({ data: supportTickets, skipDuplicates: true });
  }

  const regulatoryDesks = sellers.slice(0, Math.min(15, sellers.length)).map((seller, index) => ({
    id: buildId(`desk_${seller.id}`),
    userId: seller.userId,
    slug: `desk-${index + 1}`,
    title: `Compliance Desk ${index + 1}`,
    status: index % 2 === 0 ? 'active' : 'pending',
    createdAt: now,
    updatedAt: now
  }));
  if (regulatoryDesks.length) {
    await prisma.regulatoryDesk.createMany({ data: regulatoryDesks, skipDuplicates: true });
  }

  const regulatoryDeskItems = regulatoryDesks.map((desk, index) => ({
    id: buildId(`desk_item_${desk.id}`),
    deskId: desk.id,
    title: `Desk item ${index + 1}`,
    status: index % 2 === 0 ? 'open' : 'review',
    severity: index % 2 === 0 ? 'high' : 'medium',
    createdAt: now,
    updatedAt: now
  }));
  if (regulatoryDeskItems.length) {
    await prisma.regulatoryDeskItem.createMany({ data: regulatoryDeskItems, skipDuplicates: true });
  }

  const complianceItems = sellers.slice(0, Math.min(15, sellers.length)).map((seller, index) => ({
    id: buildId(`compliance_${seller.id}`),
    userId: seller.userId,
    itemType: index % 3 === 0 ? 'RULE' : index % 2 === 0 ? 'DOC' : 'QUEUE',
    title: index % 2 === 0 ? 'KYC Document' : 'Policy Check',
    status: index % 2 === 0 ? 'pending' : 'active',
    createdAt: now,
    updatedAt: now
  }));
  if (complianceItems.length) {
    await prisma.regulatoryComplianceItem.createMany({ data: complianceItems, skipDuplicates: true });
  }

  const wholesaleQuotes = [];
  const wholesaleRfqs = [];
  const wholesalePriceLists = [];
  for (const seller of sellers.slice(0, Math.min(20, sellers.length))) {
    const rfqId = buildId(`rfq_${seller.id}`);
    wholesaleRfqs.push({
      id: rfqId,
      userId: seller.userId,
      status: 'new',
      title: `RFQ for ${seller.displayName}`,
      buyerName: 'Buyer Co',
      buyerType: 'Distributor',
      createdAt: now,
      updatedAt: now,
      data: { id: rfqId, title: `RFQ for ${seller.displayName}` }
    });
    const quoteId = buildId(`quote_${seller.id}`);
    wholesaleQuotes.push({
      id: quoteId,
      userId: seller.userId,
      rfqId,
      status: 'sent',
      title: `Quote for ${seller.displayName}`,
      buyer: 'Buyer Co',
      buyerType: 'Distributor',
      currency: 'USD',
      total: 1000,
      approvalsRequired: false,
      createdAt: now,
      updatedAt: now,
      data: { id: quoteId, title: `Quote for ${seller.displayName}`, status: 'sent', totals: { total: 1000 } }
    });
    wholesalePriceLists.push({
      id: buildId(`pricelist_${seller.id}`),
      userId: seller.userId,
      name: `Base Price List ${seller.displayName}`,
      currency: 'USD',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      data: { name: `Base Price List ${seller.displayName}` }
    });
  }
  if (wholesaleRfqs.length) {
    await prisma.wholesaleRfq.createMany({ data: wholesaleRfqs, skipDuplicates: true });
  }
  if (wholesaleQuotes.length) {
    await prisma.wholesaleQuote.createMany({ data: wholesaleQuotes, skipDuplicates: true });
  }
  if (wholesalePriceLists.length) {
    await prisma.wholesalePriceList.createMany({ data: wholesalePriceLists, skipDuplicates: true });
  }

  const providerQuotes = [];
  const providerBookings = [];
  const providerConsultations = [];
  const providerPortfolioItems = [];
  for (const provider of providerUsers.slice(0, Math.min(20, providerUsers.length))) {
    const quoteId = buildId(`provider_quote_${provider.id}`);
    providerQuotes.push({
      id: quoteId,
      userId: provider.id,
      status: 'sent',
      title: `Provider quote ${provider.id}`,
      buyer: 'Buyer Co',
      amount: 1500,
      currency: 'USD',
      data: { id: quoteId, status: 'sent', amount: 1500 }
    });
    providerBookings.push({
      id: buildId(`provider_booking_${provider.id}`),
      userId: provider.id,
      status: 'requested',
      scheduledAt: now,
      durationMinutes: 90,
      amount: 500,
      currency: 'USD',
      data: { scheduledAt: now.toISOString() }
    });
    providerConsultations.push({
      id: buildId(`provider_consult_${provider.id}`),
      userId: provider.id,
      status: 'open',
      scheduledAt: now,
      data: { topic: 'Live ops review' }
    });
    providerPortfolioItems.push({
      id: buildId(`provider_portfolio_${provider.id}`),
      userId: provider.id,
      title: `Portfolio item ${provider.id}`,
      description: 'Showcase of recent provider work',
      status: 'published',
      data: { tags: ['studio', 'live'] }
    });
  }
  if (providerQuotes.length) {
    await prisma.providerQuote.createMany({ data: providerQuotes, skipDuplicates: true });
  }
  if (providerBookings.length) {
    await prisma.providerBooking.createMany({ data: providerBookings, skipDuplicates: true });
  }
  if (providerConsultations.length) {
    await prisma.providerConsultation.createMany({ data: providerConsultations, skipDuplicates: true });
  }
  if (providerPortfolioItems.length) {
    await prisma.providerPortfolioItem.createMany({ data: providerPortfolioItems, skipDuplicates: true });
  }

  const liveSessions = [];
  const adzCampaigns = [];
  for (const creator of creatorUsers.slice(0, Math.min(20, creatorUsers.length))) {
    const sessionId = buildId(`live_session_${creator.id}`);
    liveSessions.push({
      id: sessionId,
      userId: creator.id,
      status: 'draft',
      title: `Live session ${creator.id}`,
      createdAt: now,
      updatedAt: now,
      data: { title: `Live session ${creator.id}` }
    });
    const campaignId = buildId(`adz_campaign_${creator.id}`);
    adzCampaigns.push({
      id: campaignId,
      userId: creator.id,
      status: 'draft',
      title: `Campaign ${creator.id}`,
      currency: 'USD',
      createdAt: now,
      updatedAt: now,
      data: { title: `Campaign ${creator.id}` }
    });
  }
  if (liveSessions.length) {
    await prisma.liveSession.createMany({ data: liveSessions, skipDuplicates: true });
  }
  if (adzCampaigns.length) {
    await prisma.adzCampaign.createMany({ data: adzCampaigns, skipDuplicates: true });
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
