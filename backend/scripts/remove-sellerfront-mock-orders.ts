import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SELLERFRONT_COMPAT_RECORD_IDS = ['sellerfront_mockdb_seed', 'sellerfront_mockdb_live'];

function extractOrderIds(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  const orders = Array.isArray((payload as { orders?: unknown[] }).orders)
    ? (payload as { orders: unknown[] }).orders
    : [];

  return orders
    .map((entry) =>
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? String((entry as { id?: unknown }).id ?? '')
        : ''
    )
    .filter(Boolean);
}

async function main() {
  const records = await prisma.appRecord.findMany({
    where: { id: { in: SELLERFRONT_COMPAT_RECORD_IDS } },
    select: { id: true, payload: true }
  });

  const orderIds = Array.from(
    new Set(records.flatMap((record) => extractOrderIds(record.payload)))
  );

  if (orderIds.length === 0) {
    console.log('No sellerfront compatibility orders were found in AppRecord snapshots.');
    return;
  }

  const [items, returns, disputes, transactions, orders] = await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.sellerReturn.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.sellerDispute.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.transaction.deleteMany({ where: { orderId: { in: orderIds } } }),
    prisma.order.deleteMany({ where: { id: { in: orderIds } } })
  ]);

  console.log(
    `Removed sellerfront compatibility orders: ${orders.count} orders, ${items.count} items, ${returns.count} returns, ${disputes.count} disputes, ${transactions.count} transactions.`
  );
}

main()
  .catch((error) => {
    console.error('Failed to remove sellerfront compatibility orders.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
