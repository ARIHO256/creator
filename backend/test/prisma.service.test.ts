import assert from 'node:assert/strict';
import test from 'node:test';
import { ReadPrismaService } from '../src/platform/prisma/prisma.service.js';

function createConfig(overrides: Record<string, unknown>) {
  return {
    get(key: string) {
      return overrides[key];
    }
  };
}

test('ReadPrismaService falls back to the write DSN when the replica is unavailable', async () => {
  const circuitStates: Array<{ dependency: string; open: boolean }> = [];
  const service = new ReadPrismaService(
    createConfig({
      'database.readUrl': 'mysql://replica.invalid/app',
      'database.writeUrl': 'mysql://primary.local/app',
      'database.readFallbackEnabled': true
    }) as any,
    {
      setDependencyCircuit(dependency: string, open: boolean) {
        circuitStates.push({ dependency, open });
      },
      recordDbQuery() {},
      recordDbSlowQuery() {}
    } as any
  );

  let connectCalls = 0;
  const fallbackClient = {
    async $connect() {
      return undefined;
    },
    async $disconnect() {
      return undefined;
    },
    $on() {
      return undefined;
    }
  };

  (service as any).connectClient = async () => {
    connectCalls += 1;
    if (connectCalls === 1) {
      throw new Error('replica down');
    }
  };
  (service as any).createClient = () => fallbackClient;

  await service.onModuleInit();

  const status = service.readConnectionStatus();
  assert.equal(connectCalls, 2);
  assert.equal(status.configured, true);
  assert.equal(status.healthy, false);
  assert.equal(status.usingWriteFallback, true);
  assert.match(status.lastError ?? '', /replica down/);
  assert.deepEqual(circuitStates, [{ dependency: 'db_read_replica', open: true }]);

  await service.onModuleDestroy();
});
