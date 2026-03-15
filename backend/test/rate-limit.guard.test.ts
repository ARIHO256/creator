import assert from 'node:assert/strict';
import test from 'node:test';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';

function createContext() {
  const headers: Record<string, string | number> = {};
  const request: any = {
    method: 'POST',
    routeOptions: { url: '/api/test' },
    url: '/api/test',
    headers: {},
    user: { sub: 'user-1' }
  };
  const response: any = {
    header(name: string, value: string | number) {
      headers[name] = value;
    }
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      }),
      getHandler: () => ({}),
      getClass: () => ({})
    },
    headers
  };
}

test('RateLimitGuard enforces per-route limits', async () => {
  const reflector = {
    getAllAndOverride: () => ({ limit: 1, windowMs: 60_000 })
  };
  const configService = {
    get: () => undefined
  };

  const guard = new RateLimitGuard(reflector as any, configService as any);
  const { context } = createContext();

  await assert.doesNotReject(() => guard.canActivate(context as any));
  await assert.rejects(() => guard.canActivate(context as any), /Rate limit exceeded/);
});

test('RateLimitGuard uses Redis-backed distributed buckets when configured', async () => {
  const reflector = {
    getAllAndOverride: () => ({ limit: 2, windowMs: 60_000 })
  };
  const configService = {
    get(key: string) {
      if (key === 'rateLimit.redisPrefix') return 'test:ratelimit:';
      return undefined;
    }
  };

  const calls: string[] = [];
  const guard = new RateLimitGuard(reflector as any, configService as any);
  (guard as any).redis = {
    on() {
      return undefined;
    },
    async eval(_script: string, _numKeys: number, _key: string) {
      calls.push('eval');
      return calls.length === 1 ? [1, 1, Date.now()] : [0, 2, Date.now()];
    },
    async quit() {
      return 'OK';
    }
  };

  const { context, headers } = createContext();
  await assert.doesNotReject(() => guard.canActivate(context as any));
  await assert.rejects(() => guard.canActivate(context as any), /Rate limit exceeded/);
  assert.equal(calls.length, 2);
  assert.equal(headers['x-ratelimit-limit'], 2);
});
