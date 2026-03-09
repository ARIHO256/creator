import assert from 'node:assert/strict';
import test from 'node:test';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

test('RolesGuard blocks insufficient roles', () => {
  const reflector = {
    getAllAndOverride: () => ['ADMIN']
  };
  const configService = {
    get: (key: string) => (key === 'auth.disabled' ? false : undefined)
  };
  const guard = new RolesGuard(reflector as any, configService as any);

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: 'CREATOR' } })
    }),
    getHandler: () => ({}),
    getClass: () => ({})
  };

  assert.throws(() => guard.canActivate(context as any), /Insufficient role privileges/);
});

test('RolesGuard allows required roles', () => {
  const reflector = {
    getAllAndOverride: () => ['ADMIN']
  };
  const configService = {
    get: (key: string) => (key === 'auth.disabled' ? false : undefined)
  };
  const guard = new RolesGuard(reflector as any, configService as any);

  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: 'ADMIN' } })
    }),
    getHandler: () => ({}),
    getClass: () => ({})
  };

  assert.equal(guard.canActivate(context as any), true);
});
