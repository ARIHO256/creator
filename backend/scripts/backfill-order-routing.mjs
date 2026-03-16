import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatAddress(parts) {
  return parts.map((entry) => readString(entry)).filter(Boolean).join(', ');
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickProfile(profilePayload) {
  const profile = asRecord(asRecord(profilePayload).profile);
  const identity = asRecord(profile.identity);
  const addresses = Array.isArray(profile.addresses)
    ? profile.addresses.map((entry) => asRecord(entry))
    : [];
  const address = addresses.find((entry) => Boolean(entry.isDefault)) ?? addresses[0] ?? {};

  return {
    displayName: readString(identity.displayName),
    email: readString(identity.email),
    phone: readString(identity.phone),
    address: formatAddress([
      address.line1,
      address.line2,
      address.city,
      address.region,
      address.country,
    ]),
  };
}

function describeWarehouse(warehouse) {
  const address = asRecord(warehouse?.address);
  const contact = asRecord(warehouse?.contact);
  return {
    name: readString(warehouse?.name),
    address: formatAddress([
      warehouse?.name,
      address.line1,
      address.line2,
      address.city,
      address.region,
      address.country,
    ]),
    phone: readString(contact.phone),
  };
}

function buildSyntheticBuyerRoute(orderId, buyerEmail) {
  const seed = hashString(`${orderId}:${buyerEmail || 'buyer'}`);
  const streets = ['Market Street', 'Riverside Drive', 'Palm Avenue', 'Transport Close'];
  const cities = ['Kampala, Uganda', 'Nairobi, Kenya', 'Kigali, Rwanda', 'Dar es Salaam, Tanzania'];
  const localPart = readString(buyerEmail).split('@')[0] || `Buyer ${String((seed % 900) + 100)}`;

  return {
    name: localPart.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    address: `${(seed % 800) + 100} ${streets[seed % streets.length]}, ${cities[seed % cities.length]}`,
    phone: `+2567${String(seed % 100000000).padStart(8, '0')}`,
  };
}

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      seller: {
        include: {
          user: {
            select: { email: true, phone: true },
          },
        },
      },
      buyer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const sellerIds = [...new Set(orders.map((order) => order.sellerId))];
  const userIds = [
    ...new Set(
      orders.flatMap((order) => [order.seller.userId, order.buyerUserId].filter(Boolean))
    ),
  ];

  const [warehouses, settings] = await Promise.all([
    prisma.sellerWarehouse.findMany({
      where: { sellerId: { in: sellerIds } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.userSetting.findMany({
      where: { userId: { in: userIds }, key: 'profile' },
      select: { userId: true, payload: true },
    }),
  ]);

  const warehouseBySellerId = new Map();
  for (const warehouse of warehouses) {
    if (!warehouseBySellerId.has(warehouse.sellerId)) {
      warehouseBySellerId.set(warehouse.sellerId, warehouse);
    }
  }

  const settingByUserId = new Map(
    settings.map((entry) => [entry.userId, entry.payload])
  );

  let updated = 0;

  for (const order of orders) {
    const current = asRecord(order.metadata);
    const sellerProfile = pickProfile(settingByUserId.get(order.seller.userId) || {});
    const buyerProfile = pickProfile(settingByUserId.get(order.buyerUserId) || {});
    const warehouse = describeWarehouse(warehouseBySellerId.get(order.sellerId));
    const buyerFallback = buildSyntheticBuyerRoute(order.id, order.buyer?.email || '');

    const nextMetadata = {
      ...current,
      customer: readString(current.customer) || readString(current.shippingName) || buyerProfile.displayName || buyerFallback.name,
      shippingName: readString(current.shippingName) || readString(current.customer) || buyerProfile.displayName || buyerFallback.name,
      shippingAddress: readString(current.shippingAddress) || readString(current.billingAddress) || buyerProfile.address || buyerFallback.address,
      buyerPhone: readString(current.buyerPhone) || buyerProfile.phone || buyerFallback.phone,
      buyerEmail: readString(current.buyerEmail) || buyerProfile.email || readString(order.buyer?.email),
      sellerName:
        readString(current.sellerName) ||
        readString(order.seller.storefrontName) ||
        readString(order.seller.displayName) ||
        readString(order.seller.name),
      sellerAddress: readString(current.sellerAddress) || sellerProfile.address || warehouse.address,
      sellerPhone:
        readString(current.sellerPhone) ||
        sellerProfile.phone ||
        warehouse.phone ||
        readString(order.seller.user?.phone) ||
        '',
      sellerEmail:
        readString(current.sellerEmail) ||
        sellerProfile.email ||
        readString(order.seller.user?.email) ||
        '',
      warehouseName: readString(current.warehouseName) || warehouse.name,
    };

    const nextWarehouse = readString(order.warehouse) || readString(nextMetadata.warehouseName) || null;
    const metadataChanged = JSON.stringify(current) !== JSON.stringify(nextMetadata);
    const warehouseChanged = nextWarehouse !== order.warehouse;

    if (!metadataChanged && !warehouseChanged) {
      continue;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        metadata: nextMetadata,
        warehouse: nextWarehouse,
      },
    });
    updated += 1;
  }

  console.log(`Backfilled routing metadata for ${updated} order(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
