import assert from 'node:assert/strict';
import test from 'node:test';
import { lastValueFrom, of } from 'rxjs';
import { AuditInterceptor } from '../src/common/interceptors/audit.interceptor.js';

test('AuditInterceptor logs write actions', async () => {
  const events: any[] = [];
  const auditService = {
    log: async (event: any) => {
      events.push(event);
    }
  };

  const interceptor = new AuditInterceptor(auditService as any);
  const request: any = {
    method: 'POST',
    routeOptions: { url: '/api/test' },
    url: '/api/test',
    user: { sub: 'user-1', role: 'SELLER' },
    params: { id: 'record-1' },
    id: 'req-1',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test' }
  };
  const response: any = { statusCode: 201 };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    })
  };

  const handler = {
    handle: () => of({ ok: true })
  };

  await lastValueFrom(interceptor.intercept(context as any, handler as any));
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'POST /api/test');
  assert.equal(events[0].entityId, 'record-1');
});
