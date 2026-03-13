import { BadRequestException } from '@nestjs/common';
import { CreateWholesaleQuoteDto, WHOLESALE_QUOTE_STATUSES } from './dto/create-wholesale-quote.dto.js';
import { UpdateWholesaleQuoteDto } from './dto/update-wholesale-quote.dto.js';

type JsonRecord = Record<string, unknown>;

export type WholesaleQuote = {
  id: string;
  rfqId: string | null;
  title: string;
  buyer: string;
  buyerType: string;
  contact: string;
  origin: string;
  destination: string;
  paymentRail: string;
  incotermCode: string;
  paymentTerms: string;
  validUntil: string | null;
  status: (typeof WHOLESALE_QUOTE_STATUSES)[number];
  currency: string;
  winChance: number;
  discount: number;
  shipping: number;
  taxRate: number;
  terms: string;
  notes: string;
  nextFollowUpAt: string | null;
  lines: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    leadTimeDays: number | null;
    notes: string;
    lineSubtotal: number;
    lineCostSubtotal: number;
    marginPercent: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    totalCost: number;
    grossMarginPercent: number;
  };
  approvals: {
    thresholdPct: number;
    required: boolean;
    requests: Array<{
      id: string;
      at: string;
      status: string;
      actor: string;
      requester: string;
      approver: string;
      note: string;
      reason: string;
      decidedAt: string | null;
    }>;
  };
  activity: Array<{
    id: string;
    at: string;
    actor: string;
    text: string;
  }>;
  createdAt: string;
  updatedAt: string;
  metadata: JsonRecord;
};

export function normalizeWholesaleHome(payload: unknown) {
  const source = isRecord(payload) ? payload : {};
  const summary = isRecord(source.summary) ? source.summary : {};

  return {
    summary: {
      openRfqs: pickNumber(summary.openRfqs, 0),
      activeQuotes: pickNumber(summary.activeQuotes, 0),
      priceLists: pickNumber(summary.priceLists, 0)
    }
  };
}

export function normalizeWholesalePriceLists(payload: unknown) {
  const source = isRecord(payload) ? payload : {};
  const entries = Array.isArray(source.priceLists) ? source.priceLists.filter(isRecord) : [];

  return {
    priceLists: entries.map((entry, index) => ({
      id: pickString(entry.id, `price_list_${index + 1}`),
      sku: pickString(entry.sku, ''),
      name: pickString(entry.name, pickString(entry.title, 'Untitled Price List')),
      currency: pickString(entry.currency, 'USD'),
      baseCost: pickNumber(entry.baseCost, 0),
      status: pickString(entry.status, 'draft'),
      updatedAt: pickString(entry.updatedAt, new Date().toISOString()),
      tiers: normalizePriceTiers(entry.tiers),
      segments: stringArray(entry.segments),
      entryCount: pickNumber(entry.lines, Array.isArray(entry.tiers) ? entry.tiers.length : 0)
    }))
  };
}

export function normalizeWholesaleRfqs(payload: unknown) {
  const source = isRecord(payload) ? payload : {};
  const entries = Array.isArray(source.rfqs) ? source.rfqs.filter(isRecord) : [];

  return {
    rfqs: entries.map((entry, index) => ({
      id: pickString(entry.id, `rfq_${index + 1}`),
      title: pickString(entry.title, `${pickString(entry.buyer, 'Buyer')} RFQ`),
      status: pickString(entry.status, 'new'),
      urgency: pickString(entry.urgency, 'standard'),
      createdAt: pickString(entry.createdAt, new Date().toISOString()),
      dueAt: pickString(entry.dueAt, ''),
      buyerType: pickString(entry.buyerType, 'Distributor'),
      origin: pickString(entry.origin, ''),
      paymentRail: pickString(entry.paymentRail, ''),
      approvalRequired: pickBoolean(entry.approvalRequired, false),
      attachments: pickNumber(entry.attachments, 0),
      destination: pickString(entry.destination, ''),
      category: pickString(entry.category, ''),
      notes: pickString(entry.notes, ''),
      score: pickNumber(entry.score, 0),
      buyerName: pickString(entry.buyerName, pickString(entry.buyer, '')),
      competitorPressure: pickString(entry.competitorPressure, ''),
      paymentRisk: pickString(entry.paymentRisk, ''),
      marginPotential: pickNumber(entry.marginPotential, 0),
      quantity: pickNumber(entry.quantity, 0)
    }))
  };
}

export function normalizeWholesaleIncoterms(payload: unknown) {
  const source = isRecord(payload) ? payload : {};
  const terms = Array.isArray(source.terms) ? source.terms.filter(isRecord) : [];

  return {
    terms: terms.map((term) => ({
      code: pickString(term.code, ''),
      description: pickString(term.description, ''),
      riskTransferPoint: pickString(term.riskTransferPoint, ''),
      sellerObligation: pickString(term.sellerObligation, ''),
      buyerObligation: pickString(term.buyerObligation, '')
    }))
  };
}

export function normalizeWholesaleQuotes(payload: unknown) {
  const source = isRecord(payload) ? payload : {};
  const entries = Array.isArray(source.quotes) ? source.quotes.filter(isRecord) : [];
  return {
    quotes: entries.map((entry, index) => normalizeStoredQuote(entry, `quote_${index + 1}`))
  };
}

export function createWholesaleQuote(input: CreateWholesaleQuoteDto, rfqPayload?: unknown) {
  const rfq = isRecord(rfqPayload) ? rfqPayload : null;
  const createdAt = new Date().toISOString();
  const normalized = buildWholesaleQuote(input as CreateWholesaleQuoteDto & JsonRecord, {
    id: pickString(input.id, ''),
    createdAt,
    updatedAt: createdAt,
    rfq
  });

  if (rfq && normalized.rfqId && normalized.rfqId !== pickString(rfq.id, normalized.rfqId)) {
    throw new BadRequestException('Quote RFQ does not match the selected RFQ');
  }

  return normalized;
}

export function updateWholesaleQuote(current: WholesaleQuote, patch: UpdateWholesaleQuoteDto) {
  return buildWholesaleQuote({ ...current, ...patch } as CreateWholesaleQuoteDto & JsonRecord, {
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  });
}

function normalizeStoredQuote(value: JsonRecord, defaultValueId: string) {
  return buildWholesaleQuote(value as CreateWholesaleQuoteDto & JsonRecord, {
    id: pickString(value.id, defaultValueId),
    createdAt: pickString(value.createdAt, new Date().toISOString()),
    updatedAt: pickString(value.updatedAt, pickString(value.createdAt, new Date().toISOString()))
  });
}

function buildWholesaleQuote(
  input: CreateWholesaleQuoteDto & JsonRecord,
  options: { id: string; createdAt: string; updatedAt: string; rfq?: JsonRecord | null }
) {
  const lines = normalizeQuoteLines(Array.isArray(input.lines) ? input.lines : []);
  if (lines.length === 0) {
    throw new BadRequestException('Wholesale quote requires at least one line item');
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const totalCost = lines.reduce((sum, line) => sum + line.lineCostSubtotal, 0);
  const discount = pickNumber(input.discount, 0);
  const shipping = pickNumber(input.shipping, 0);
  const taxRate = pickNumber(input.taxRate, 0);
  const taxableAmount = Math.max(0, subtotal - discount + shipping);
  const tax = roundCurrency(taxableAmount * (taxRate / 100));
  const total = roundCurrency(taxableAmount + tax);
  const grossMarginPercent = total > 0 ? roundCurrency(((total - totalCost) / total) * 100) : 0;
  const thresholdPct = pickNumber(input.approvalThresholdPct, 10);
  const requiresApproval = pickBoolean(
    input.requiresApproval,
    thresholdPct > 0 && discount > 0 && subtotal > 0 ? (discount / subtotal) * 100 >= thresholdPct : false
  );

  return {
    id: options.id || randomId('quote'),
    rfqId: nullableString(input.rfqId),
    title: pickString(input.title, `${pickString(input.buyer, options.rfq ? pickString(options.rfq.buyerName, 'Buyer') : 'Buyer')} quote`),
    buyer: pickString(input.buyer, options.rfq ? pickString(options.rfq.buyerName, '') : ''),
    buyerType: pickString(input.buyerType, options.rfq ? pickString(options.rfq.buyerType, '') : ''),
    contact: pickString(input.contact, ''),
    origin: pickString(input.origin, options.rfq ? pickString(options.rfq.origin, '') : ''),
    destination: pickString(input.destination, options.rfq ? pickString(options.rfq.destination, '') : ''),
    paymentRail: pickString(input.paymentRail, options.rfq ? pickString(options.rfq.paymentRail, '') : ''),
    incotermCode: pickString(input.incotermCode, ''),
    paymentTerms: pickString(input.paymentTerms, ''),
    validUntil: nullableString(input.validUntil),
    status: normalizeQuoteStatus(input.status),
    currency: pickString(input.currency, 'USD'),
    winChance: clamp(pickNumber(input.winChance, 50), 0, 100),
    discount,
    shipping,
    taxRate,
    terms: pickString(input.terms, ''),
    notes: pickString(input.notes, ''),
    nextFollowUpAt: nullableString(input.nextFollowUpAt),
    lines,
    totals: {
      subtotal: roundCurrency(subtotal),
      tax,
      total,
      totalCost: roundCurrency(totalCost),
      grossMarginPercent
    },
    approvals: {
      thresholdPct,
      required: requiresApproval,
      requests: normalizeApprovalRequests(input.approvalRequest, options.updatedAt)
    },
    activity: normalizeActivity(input.activity, options.updatedAt),
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    metadata: isRecord(input.metadata) ? { ...input.metadata } : {}
  };
}

function normalizeQuoteLines(lines: unknown[]) {
  return lines
    .filter(isRecord)
    .map((line, index) => {
      const quantity = Math.max(1, pickNumber(line.quantity ?? line.qty, 1));
      const unitPrice = Math.max(0, pickNumber(line.unitPrice ?? line.unit, 0));
      const unitCost = Math.max(0, pickNumber(line.unitCost, 0));
      const lineSubtotal = roundCurrency(quantity * unitPrice);
      const lineCostSubtotal = roundCurrency(quantity * unitCost);
      const marginPercent = lineSubtotal > 0 ? roundCurrency(((lineSubtotal - lineCostSubtotal) / lineSubtotal) * 100) : 0;

      return {
        id: pickString(line.id, randomId(`line_${index + 1}`)),
        sku: pickString(line.sku, ''),
        name: pickString(line.name, `Line ${index + 1}`),
        quantity,
        unitPrice,
        unitCost,
        leadTimeDays: nullableNumber(line.leadTimeDays),
        notes: pickString(line.notes, ''),
        lineSubtotal,
        lineCostSubtotal,
        marginPercent
      };
    });
}

function normalizeApprovalRequests(value: unknown, at: string) {
  const requests = isRecord(value) ? [value] : [];
  return requests.map((request) => ({
    id: pickString(request.id, randomId('approval')),
    at: pickString(request.at, at),
    status: pickString(request.status, 'Pending'),
    actor: pickString(request.actor, ''),
    requester: pickString(request.requester, ''),
    approver: pickString(request.approver, ''),
    note: pickString(request.note, ''),
    reason: pickString(request.reason, ''),
    decidedAt: nullableString(request.decidedAt)
  }));
}

function normalizeActivity(value: unknown, at: string) {
  if (!Array.isArray(value)) {
    return [
      {
        id: randomId('activity'),
        at,
        actor: 'system',
        text: 'Quote normalized by backend'
      }
    ];
  }

  return value
    .filter(isRecord)
    .map((entry) => ({
      id: pickString(entry.id, randomId('activity')),
      at: pickString(entry.at, at),
      actor: pickString(entry.actor, 'system'),
      text: pickString(entry.text, '')
    }))
    .filter((entry) => entry.text);
}

function normalizePriceTiers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((tier, index) => ({
    id: pickString(tier.id, `tier_${index + 1}`),
    minQty: pickNumber(tier.minQty ?? tier.qty, 1),
    price: pickNumber(tier.price, 0)
  }));
}

function normalizeQuoteStatus(value: unknown) {
  const status = pickString(value, 'draft').toLowerCase();
  return WHOLESALE_QUOTE_STATUSES.includes(status as (typeof WHOLESALE_QUOTE_STATUSES)[number])
    ? (status as (typeof WHOLESALE_QUOTE_STATUSES)[number])
    : 'draft';
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => pickString(entry, '')).filter(Boolean) : [];
}

function pickString(value: unknown, defaultValue: string) {
  return typeof value === 'string' ? value.trim() : defaultValue;
}

function pickNumber(value: unknown, defaultValue: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function pickBoolean(value: unknown, defaultValue: boolean) {
  return typeof value === 'boolean' ? value : defaultValue;
}

function nullableString(value: unknown) {
  const normalized = pickString(value, '');
  return normalized || null;
}

function nullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
