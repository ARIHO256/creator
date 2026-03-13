import assert from 'node:assert/strict';
import test from 'node:test';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';

test('JwtAuthGuard uses bearer token even when auth disabled', () => {
  const jwtService = new JwtService();
  const token = jwtService.sign(
    {
      sub: 'user_new_seller',
      role: 'SELLER',
      roles: ['SELLER'],
      email: 'new-seller@example.com'
    },
    { secret: 'test-access-secret' }
  );

  const reflector = {
    getAllAndOverride: () => false
  };
  const configService = {
    get: (key: string) => {
      if (key === 'auth.disabled') return true;
      if (key === 'auth.accessSecret') return 'test-access-secret';
      if (key === 'auth.devUserId') return 'user_seller_evhub';
      if (key === 'auth.devUserRole') return 'SELLER';
      return undefined;
    }
  };
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };

  const guard = new JwtAuthGuard(reflector as any, jwtService as any, configService as any);
  const context = {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => ({}),
    getClass: () => ({})
  };

  assert.equal(guard.canActivate(context as any), true);
  assert.equal((request.user as any).sub, 'user_new_seller');
  assert.equal((request.user as any).role, 'SELLER');
  assert.deepEqual((request.user as any).roles, ['SELLER']);
  assert.equal((request.user as any).email, 'new-seller@example.com');
  assert.equal(typeof (request.user as any).iat, 'number');
});

test('JwtAuthGuard falls back to dev identity only when auth is disabled and no token is present', () => {
  const reflector = {
    getAllAndOverride: () => false
  };
  const configService = {
    get: (key: string) => {
      if (key === 'auth.disabled') return true;
      if (key === 'auth.devUserId') return 'user_seller_evhub';
      if (key === 'auth.devUserRole') return 'SELLER';
      return undefined;
    }
  };
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: {}
  };

  const guard = new JwtAuthGuard(reflector as any, {} as any, configService as any);
  const context = {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => ({}),
    getClass: () => ({})
  };

  assert.equal(guard.canActivate(context as any), true);
  assert.deepEqual(request.user, {
    sub: 'user_seller_evhub',
    role: 'SELLER',
    roles: ['SELLER'],
    email: null
  });
});
