import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultOnboardingState,
  mergeOnboardingState,
  prepareSubmittedOnboarding,
  sellerSlugToHandle
} from '../src/modules/workflow/onboarding-state.js';
import { createWholesaleQuote, normalizeWholesaleQuotes } from '../src/modules/wholesale/wholesale-state.js';

test('seller onboarding normalization sanitizes slug and computes progress', () => {
  const base = createDefaultOnboardingState('SELLER');
  const state = mergeOnboardingState(base, {
    storeName: 'EV Hub Kampala',
    storeSlug: ' EV Hub Kampala ',
    channels: ['Marketplace', 'Marketplace', 'Wholesale'],
    steps: [
      { id: 'store', title: 'Store', status: 'completed', required: true },
      { id: 'tax', title: 'Tax', status: 'active', required: true }
    ]
  });

  assert.equal(state.storeSlug, 'ev-hub-kampala');
  assert.deepEqual(state.channels, ['Marketplace', 'Wholesale']);
  assert.equal(state.progress.totalSteps, 2);
  assert.equal(state.progress.completedSteps, 1);
  assert.equal(state.progress.completionPercent, 50);
  assert.equal(sellerSlugToHandle('Hello There'), 'hello-there');
});

test('seller onboarding submit requires production-critical sections', () => {
  const base = createDefaultOnboardingState('SELLER');
  const complete = mergeOnboardingState(base, {
    storeName: 'EV Hub',
    storeSlug: 'ev-hub',
    email: 'ops@evhub.com',
    phone: '+256700000000',
    tax: {
      taxpayerType: 'COMPANY',
      legalName: 'EV Hub Limited',
      taxCountry: 'UG'
    },
    payout: {
      method: 'BANK',
      currency: 'USD'
    },
    shipFrom: {
      country: 'UG',
      city: 'Kampala'
    },
    docs: {
      list: [{ type: 'Business License' }]
    },
    acceptance: {
      sellerTerms: true,
      contentPolicy: true,
      dataProcessing: true
    }
  });

  const submitted = prepareSubmittedOnboarding(complete);
  assert.equal(submitted.status, 'submitted');
  assert.ok(submitted.submittedAt);
});

test('wholesale quote creation computes totals and approval state', () => {
  const quote = createWholesaleQuote({
    buyer: 'Urban Mobility Ltd',
    rfqId: 'rfq_1',
    currency: 'USD',
    discount: 200,
    shipping: 50,
    taxRate: 18,
    approvalThresholdPct: 5,
    lines: [
      { name: '7kW Wallbox', quantity: 4, unitPrice: 600, unitCost: 420 },
      { name: 'Install Kit', quantity: 4, unitPrice: 50, unitCost: 25 }
    ]
  });

  assert.equal(quote.totals.subtotal, 2600);
  assert.equal(quote.totals.tax, 441);
  assert.equal(quote.totals.total, 2891);
  assert.equal(quote.approvals.required, true);
  assert.equal(quote.lines[0].marginPercent, 30);
});

test('wholesale quote normalization upgrades legacy records to strong contract shape', () => {
  const normalized = normalizeWholesaleQuotes({
    quotes: [{ id: 'quote_1', buyer: 'Urban Mobility Ltd', status: 'sent', amount: 22800, currency: 'USD', createdAt: '2026-03-08T00:00:00.000Z', lines: [{ name: 'Legacy', qty: 2, unit: 300 }] }]
  });

  assert.equal(normalized.quotes.length, 1);
  assert.equal(normalized.quotes[0].status, 'sent');
  assert.equal(normalized.quotes[0].lines[0].quantity, 2);
  assert.equal(normalized.quotes[0].totals.subtotal, 600);
});
