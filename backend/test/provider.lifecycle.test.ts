import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderService } from '../src/modules/provider/provider.service.js';

test('ProviderService.transitionQuote enforces transitions', async () => {
  const prisma = {
    providerQuote: {
      async findFirst() { return { id: 'q1', userId: 'u1', status: 'draft', data: {} }; },
      async update({ data }: any) { return { id: 'q1', status: data.status, data: data.data, createdAt: new Date(), updatedAt: new Date() }; }
    }
  };
  const audit = { async log() {} };
  const service = new ProviderService(prisma as any, audit as any);

  const updated = await service.transitionQuote('u1', 'q1', { status: 'sent' } as any);
  assert.equal(updated.status, 'sent');

  await assert.rejects(
    () => service.transitionQuote('u1', 'q1', { status: 'completed' } as any),
    /Quote status cannot transition/
  );
});

test('ProviderService.transitionBooking enforces transitions', async () => {
  const prisma = {
    providerBooking: {
      async findFirst() { return { id: 'b1', userId: 'u1', status: 'requested', data: {} }; },
      async update({ data }: any) {
        return {
          id: 'b1',
          status: data.status,
          data: data.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          fulfillment: null
        };
      }
    },
    providerFulfillment: {
      async findUnique() { return null; },
      async create() { return { id: 'f1', status: 'OPEN' }; },
      async update() { return { id: 'f1', status: 'OPEN' }; }
    }
  };
  const audit = { async log() {} };
  const service = new ProviderService(prisma as any, audit as any);

  const updated = await service.transitionBooking('u1', 'b1', { status: 'confirmed' } as any);
  assert.equal(updated.status, 'confirmed');

  await assert.rejects(
    () => service.transitionBooking('u1', 'b1', { status: 'completed' } as any),
    /Booking status cannot transition/
  );
});

test('ProviderService.createQuote rejects providers without quote capability from onboarding', async () => {
  const prisma = {
    providerRecord: {
      async findUnique() {
        return {
          payload: {
            bookingModes: ['instant']
          }
        };
      }
    },
    providerQuote: {
      async create() {
        throw new Error('should not create');
      }
    },
    workspaceSetting: {
      async findUnique() {
        return null;
      }
    }
  };
  const audit = { async log() {} };
  const service = new ProviderService(prisma as any, audit as any);

  await assert.rejects(
    () => service.createQuote('u1', { title: 'Quote' } as any),
    /does not currently allow quotes/
  );
});

test('ProviderService.requestBooking creates a provider-owned booking request when booking capability is enabled', async () => {
  let createInput: any = null;
  const prisma = {
    seller: {
      async findFirst() {
        return { id: 'seller-provider-1', userId: 'provider-1', handle: 'service-pro' };
      }
    },
    providerRecord: {
      async findUnique() {
        return {
          payload: {
            bookingModes: ['bookings']
          }
        };
      }
    },
    providerBooking: {
      async create({ data }: any) {
        createInput = data;
        return {
          id: 'booking-1',
          status: data.status,
          scheduledAt: data.scheduledAt,
          durationMinutes: data.durationMinutes,
          amount: data.amount,
          currency: data.currency,
          data: data.data,
          fulfillment: null,
          createdAt: new Date('2026-03-15T10:00:00.000Z'),
          updatedAt: new Date('2026-03-15T10:00:00.000Z')
        };
      }
    }
  };
  const audit = { async log() {} };
  const service = new ProviderService(prisma as any, audit as any);

  const created = await service.requestBooking(
    { sub: 'buyer-1', email: 'buyer@example.com', role: 'SELLER', roles: ['SELLER'] },
    {
      providerHandle: '@service-pro',
      title: 'Need a product shoot',
      note: 'Two locations',
      scheduledAt: '2026-04-01T09:00:00.000Z',
      durationMinutes: 90,
      amount: 500,
      currency: 'USD',
      data: { briefId: 'brief-22' }
    } as any
  );

  assert.equal(created.status, 'requested');
  assert.equal(createInput.userId, 'provider-1');
  assert.equal(createInput.data.requester.userId, 'buyer-1');
  assert.equal(createInput.data.provider.handle, 'service-pro');
  assert.equal(createInput.data.briefId, 'brief-22');
});

test('ProviderService.requestConsultation rejects providers without consultation capability', async () => {
  const prisma = {
    seller: {
      async findFirst() {
        return { id: 'seller-provider-1', userId: 'provider-1', handle: 'service-pro' };
      }
    },
    providerRecord: {
      async findUnique() {
        return {
          payload: {
            bookingModes: ['quotes']
          }
        };
      }
    },
    providerConsultation: {
      async create() {
        throw new Error('should not create');
      }
    }
  };
  const audit = { async log() {} };
  const service = new ProviderService(prisma as any, audit as any);

  await assert.rejects(
    () =>
      service.requestConsultation(
        { sub: 'buyer-1', email: 'buyer@example.com', role: 'SELLER', roles: ['SELLER'] },
        { providerHandle: 'service-pro', title: 'Consultation' } as any
      ),
    /does not currently allow consultations/
  );
});
