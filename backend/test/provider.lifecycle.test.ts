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
