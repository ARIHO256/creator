import assert from 'node:assert/strict';
import test from 'node:test';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';

test('RateLimitGuard enforces per-route limits', () => {
  const reflector = {
    getAllAndOverride: () => ({ limit: 1, windowMs: 60_000 })
  };
  const configService = {
    get: () => undefined
  };

  const guard = new RateLimitGuard(reflector as any, configService as any);
  const headers: Record<string, string> = {};
  const request: any = {
    method: 'POST',
    routeOptions: { url: '/api/test' },
    url: '/api/test',
    headers,
    user: { sub: 'user-1' }
  };
  const response: any = {
    header: () => undefined
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    }),
    getHandler: () => ({}),
    getClass: () => ({})
  };

  assert.equal(guard.canActivate(context as any), true);
  assert.throws(() => guard.canActivate(context as any), /Rate limit exceeded/);
});
