import assert from 'node:assert/strict';
import test from 'node:test';
import { ExpressmartController } from '../src/modules/commerce/expressmart.controller.js';

test('ExpressmartController passes ExpressMart channel filters', () => {
  const calls: any[] = [];
  const service = {
    dashboardSummary: (...args: any[]) => {
      calls.push(['summary', ...args]);
      return { ok: true };
    },
    orders: (...args: any[]) => {
      calls.push(['orders', ...args]);
      return { ok: true };
    },
    orderDetail: (...args: any[]) => {
      calls.push(['orderDetail', ...args]);
      return { ok: true };
    },
    updateOrder: (...args: any[]) => {
      calls.push(['updateOrder', ...args]);
      return { ok: true };
    },
    returns: (...args: any[]) => {
      calls.push(['returns', ...args]);
      return { ok: true };
    },
    disputes: (...args: any[]) => {
      calls.push(['disputes', ...args]);
      return { ok: true };
    }
  };

  const controller = new ExpressmartController(service as any);
  controller.summary({ sub: 'user-1' } as any, {});
  controller.orders({ sub: 'user-1' } as any, {});
  controller.order({ sub: 'user-1' } as any, 'order-1');
  controller.updateOrder({ sub: 'user-1' } as any, 'order-1', { status: 'CONFIRMED' } as any);
  controller.returns({ sub: 'user-1' } as any);
  controller.disputes({ sub: 'user-1' } as any);

  const updateCall = calls.find((entry) => entry[0] === 'updateOrder');
  assert.equal(updateCall?.[4], 'ExpressMart');
});
