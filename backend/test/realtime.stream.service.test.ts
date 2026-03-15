import assert from 'node:assert/strict';
import test from 'node:test';
import { RealtimeStreamService } from '../src/platform/realtime/realtime.stream.service.js';

function createConfigService() {
  return {
    get(key: string) {
      if (key === 'realtime.enabled') return true;
      if (key === 'realtime.streamServerEnabled') return true;
      if (key === 'realtime.streamPingMs') return 25000;
      if (key === 'realtime.streamPresenceTtlMs') return 90000;
      if (key === 'realtime.streamHistorySize') return 50;
      if (key === 'realtime.streamHistoryTtlMs') return 300000;
      if (key === 'realtime.streamMaxClientsPerUser') return 3;
      if (key === 'realtime.streamMaxClientsTotal') return 5000;
      return undefined;
    }
  };
}

function createDisabledConfigService() {
  return {
    get(key: string) {
      if (key === 'realtime.enabled') return true;
      if (key === 'realtime.streamServerEnabled') return false;
      return undefined;
    }
  };
}

function createReply() {
  const writes: string[] = [];
  const handlers: Record<string, () => void> = {};
  return {
    handlers,
    reply: {
      raw: {
        destroy() {
          return undefined;
        },
        flushHeaders() {
          return undefined;
        },
        on(event: string, handler: () => void) {
          handlers[event] = handler;
        },
        setHeader() {
          return undefined;
        },
        write(chunk: string) {
          writes.push(chunk);
        }
      }
    },
    writes
  };
}

test('RealtimeStreamService replays buffered events with stable stream ids', async () => {
  const service = new RealtimeStreamService(createConfigService() as any);
  const now = Date.now();
  const streamId = `${now}-1`;
  await service.emitToUser(
    'user-1',
    { type: 'ping', value: 1 },
    { persistDistributedHistory: false, streamId }
  );

  const { reply, writes } = createReply();
  await (service as any).replayFromHistory('user-1', `${now - 1}-0`, reply as any);

  assert.match(writes.join(''), new RegExp(`id: ${streamId}`));
  assert.match(writes.join(''), /event: ping/);
});

test('RealtimeStreamService tracks local clients for open and close lifecycles', async () => {
  const service = new RealtimeStreamService(createConfigService() as any);
  const { reply, handlers } = createReply();

  await service.open('user-1', reply as any);
  assert.equal(await service.hasClient('user-1'), true);

  handlers.close?.();
  assert.equal(await service.hasClient('user-1'), false);
});

test('RealtimeStreamService rejects stream opens on non-gateway nodes', async () => {
  const service = new RealtimeStreamService(createDisabledConfigService() as any);
  const { reply } = createReply();

  await assert.rejects(() => service.open('user-1', reply as any), /Realtime stream is disabled/);
  assert.equal(service.acceptsConnections(), false);
});
