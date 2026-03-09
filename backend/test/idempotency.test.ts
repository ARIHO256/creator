import assert from 'node:assert/strict';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import { IdempotencyService } from '../src/platform/idempotency/idempotency.service.js';

test('IdempotencyService rejects duplicate keys', async () => {
  const store = new Map<string, any>();
  const prisma = {
    idempotencyKey: {
      async create({ data }: any) {
        const key = `${data.userId}:${data.key}`;
        if (store.has(key)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test'
          });
        }
        store.set(key, { id: key, ...data });
        return store.get(key);
      },
      async findUnique({ where }: any) {
        const key = `${where.userId_key.userId}:${where.userId_key.key}`;
        return store.get(key) ?? null;
      },
      async deleteMany() {
        return { count: 0 };
      }
    }
  };

  const config = {
    get: (key: string) => (key === 'idempotency.ttlMs' ? 10_000 : undefined)
  };

  const service = new IdempotencyService(prisma as any, config as any);

  await service.claim({
    userId: 'user-1',
    key: 'key-1',
    method: 'POST',
    route: '/api/test',
    requestHash: 'hash-1'
  });

  await assert.rejects(
    () =>
      service.claim({
        userId: 'user-1',
        key: 'key-1',
        method: 'POST',
        route: '/api/test',
        requestHash: 'hash-1'
      }),
    /Duplicate request/
  );
});
