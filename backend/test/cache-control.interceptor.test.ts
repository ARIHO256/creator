import assert from 'node:assert/strict';
import test from 'node:test';
import { firstValueFrom, of } from 'rxjs';
import { CacheControlInterceptor } from '../src/common/interceptors/cache-control.interceptor.js';

test('CacheControlInterceptor applies CDN-friendly headers for decorated GET routes', async () => {
  const headers = new Map<string, string>();
  const reflector = {
    getAllAndOverride: () => ({
      maxAge: 60,
      sMaxAge: 300,
      staleWhileRevalidate: 120,
      staleIfError: 600,
      visibility: 'public',
      vary: ['accept-encoding']
    })
  };
  const config = {
    get: () => true
  };
  const interceptor = new CacheControlInterceptor(reflector as any, config as any);
  const result = await firstValueFrom(
    interceptor.intercept(
      {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET' }),
          getResponse: () => ({
            header: (name: string, value: string) => headers.set(name, value)
          })
        }),
        getHandler: () => ({}),
        getClass: () => ({})
      } as any,
      { handle: () => of({ ok: true }) } as any
    )
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(
    headers.get('cache-control'),
    'public, max-age=60, s-maxage=300, stale-while-revalidate=120, stale-if-error=600'
  );
  assert.equal(headers.get('vary'), 'accept-encoding');
});
