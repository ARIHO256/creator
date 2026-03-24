import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sellerListingWizardConfig = {
  markets: [
    { id: 'market-ug', name: 'Uganda' },
    { id: 'market-ke', name: 'Kenya' },
    { id: 'market-rw', name: 'Rwanda' },
    { id: 'market-tz', name: 'Tanzania' }
  ],
  steps: [
    { id: 'core', label: 'Core Features', type: 'form' },
    { id: 'preOwned', label: 'Pre-Owned Info', type: 'form', conditional: true },
    { id: 'bev', label: 'BEV Data', type: 'form', conditional: true },
    { id: 'extras', label: 'Extras', type: 'form' },
    { id: 'gallery', label: 'Gallery', type: 'form' },
    { id: 'pricing', label: 'Pricing', type: 'pricing' },
    { id: 'warranty', label: 'Warranty', type: 'warranty', conditional: true },
    { id: 'inventory', label: 'Inventory', type: 'inventory' },
    { id: 'delivery', label: 'Markets & Delivery', type: 'delivery' },
    { id: 'seo', label: 'Search & Discovery', type: 'seo' }
  ],
  variantOptions: {
    colors: [
      { value: 'white', label: 'White' },
      { value: 'black', label: 'Black' },
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' },
      { value: 'silver', label: 'Silver' }
    ],
    trims: [
      { value: 'standard', label: 'Standard' },
      { value: 'long_range', label: 'Long Range' },
      { value: 'performance', label: 'Performance' }
    ],
    batteries: [
      { value: '60', label: '60 kWh' },
      { value: '75', label: '75 kWh' },
      { value: '90', label: '90 kWh' }
    ],
    wheelSizes: [
      { value: '17', label: '17"' },
      { value: '18', label: '18"' },
      { value: '19', label: '19"' }
    ],
    interiorColors: [
      { value: 'black', label: 'Black' },
      { value: 'beige', label: 'Beige' },
      { value: 'white', label: 'White' }
    ]
  },
  initialForm: {
    title: '',
    brand: '',
    model: '',
    bodyType: '',
    keySellingPoint: '',
    isUsed: false,
    mileage: '',
    owners: '',
    serviceHistory: '',
    powertrainType: 'BEV',
    batteryCapacity: '',
    range: '',
    connectorType: '',
    numPorts: '',
    extras: {
      fastCharger: false,
      floorMats: false,
      roofRack: false,
      extendedWarranty: false
    },
    heroImageUploaded: false,
    price: '',
    currency: 'USD',
    enableWholesale: false,
    hasWarranty: false,
    warrantyMonths: '',
    warrantyDetails: '',
    markets: {
      allActive: true,
      selectedIds: ['market-ug', 'market-ke', 'market-rw', 'market-tz']
    },
    allowPickup: true,
    allowDelivery: true,
    deliveryRegions: {
      local: true,
      upcountry: false,
      crossBorder: false
    },
    deliverToBuyerWarehouse: false,
    seoTitle: '',
    seoDescription: '',
    seoAudience: '',
    seoKeywords: '',
    variants: [
      {
        id: 'v1',
        name: 'Standard Range',
        color: 'White',
        trim: 'Standard',
        batteryPack: '60 kWh',
        wheelSize: '17"',
        interiorColor: 'Black',
        description: 'Base configuration for daily city driving.',
        specs: '60 kWh · 350 km range · Color: White · Trim: Standard',
        price: '',
        stockQty: '',
        sku: '',
        warrantyMonths: '',
        wholesaleTiers: [
          {
            id: 'v1-t1',
            minQty: '1',
            maxQty: '',
            price: '',
            isFinal: false
          }
        ]
      },
      {
        id: 'v2',
        name: 'Long Range',
        color: 'Black',
        trim: 'Long Range',
        batteryPack: '75 kWh',
        wheelSize: '18"',
        interiorColor: 'Beige',
        description: 'Larger battery for longer trips.',
        specs: '75 kWh · 450 km range · Color: Black · Trim: Long Range',
        price: '',
        stockQty: '',
        sku: '',
        warrantyMonths: '',
        wholesaleTiers: [
          {
            id: 'v2-t1',
            minQty: '1',
            maxQty: '',
            price: '',
            isFinal: false
          }
        ]
      },
      {
        id: 'v3',
        name: 'Performance',
        color: 'Red',
        trim: 'Performance',
        batteryPack: '90 kWh',
        wheelSize: '19"',
        interiorColor: 'Black',
        description: 'High performance with stronger acceleration.',
        specs: '90 kWh · Sport mode · Color: Red · Trim: Performance',
        price: '',
        stockQty: '',
        sku: '',
        warrantyMonths: '',
        wholesaleTiers: [
          {
            id: 'v3-t1',
            minQty: '1',
            maxQty: '',
            price: '',
            isFinal: false
          }
        ]
      }
    ]
  }
};

const providerQuoteTemplatesDefault = {
  templates: [
    {
      id: 'tpl_standard',
      name: 'Standard Service Proposal',
      badge: 'Most used',
      desc: 'Balanced scope, milestones, and standard terms.',
      draftPatch: {
        meta: { title: 'Standard service quote' },
        timeline: { durationDays: 14 },
        terms: { payment: { model: 'milestones' }, revisions: { included: 2 } },
        pricingPolicy: { minMarginPct: 18 }
      }
    },
    {
      id: 'tpl_install',
      name: 'Installation Quote',
      badge: 'Field work',
      desc: 'Site survey, install, testing, handover.',
      draftPatch: {
        meta: { title: 'Installation quote' },
        scope: {
          deliverables: [
            { title: 'Site survey', detail: 'Assess site, safety, routing, and materials.' },
            { title: 'Installation', detail: 'Install equipment and verify compliance.' },
            { title: 'Testing and handover', detail: 'Functional tests and handover documents.' }
          ]
        },
        lines: [
          { name: 'Survey', qty: 1, unitCost: 80, priceMode: 'markup', markupPct: 60, unitPrice: 0, notes: '' },
          { name: 'Installation labor', qty: 1, unitCost: 260, priceMode: 'markup', markupPct: 35, unitPrice: 0, notes: '' },
          { name: 'Testing and commissioning', qty: 1, unitCost: 120, priceMode: 'markup', markupPct: 35, unitPrice: 0, notes: '' }
        ],
        timeline: {
          durationDays: 7,
          milestones: [
            { title: 'Survey', dueInDays: 1, percent: 25 },
            { title: 'Install', dueInDays: 5, percent: 50 },
            { title: 'Handover', dueInDays: 7, percent: 25 }
          ]
        },
        pricingPolicy: { minMarginPct: 20 },
        terms: { revisions: { included: 1 } }
      }
    },
    {
      id: 'tpl_consult',
      name: 'Consultation Quote',
      badge: 'Calls',
      desc: 'Fixed price consultation with clear boundaries.',
      draftPatch: {
        meta: { title: 'Consultation quote' },
        scope: {
          deliverables: [
            { title: 'Consultation call', detail: '60-90 minutes deep dive with summary.' },
            { title: 'Follow-up', detail: 'One follow-up Q&A within 7 days.' }
          ]
        },
        lines: [{ name: 'Consultation', qty: 1, unitCost: 40, priceMode: 'fixed', markupPct: 0, unitPrice: 120, notes: '' }],
        timeline: {
          durationDays: 3,
          milestones: [
            { title: 'Call', dueInDays: 2, percent: 70 },
            { title: 'Summary', dueInDays: 3, percent: 30 }
          ]
        },
        pricingPolicy: { minMarginPct: 15 },
        terms: { payment: { model: 'upfront', upfrontPct: 100 } }
      }
    },
    {
      id: 'tpl_retainer',
      name: 'Monthly Retainer',
      badge: 'Premium',
      desc: 'Recurring support with SLA and monthly billing.',
      draftPatch: {
        meta: { title: 'Monthly retainer quote' },
        scope: {
          deliverables: [
            { title: 'Monthly support', detail: 'Up to 20 hours support monthly.' },
            { title: 'SLA', detail: 'Response within 4 business hours.' }
          ]
        },
        lines: [{ name: 'Retainer (monthly)', qty: 1, unitCost: 600, priceMode: 'markup', markupPct: 35, unitPrice: 0, notes: 'Billed monthly' }],
        timeline: {
          durationDays: 30,
          milestones: [{ title: 'Month start', dueInDays: 1, percent: 100 }]
        },
        pricingPolicy: { minMarginPct: 22 },
        terms: { payment: { model: 'upfront', upfrontPct: 100 }, support: { windowDays: 30 } }
      }
    }
  ]
};

async function main() {
  await prisma.systemContent.upsert({
    where: { key: 'seller_listing_wizard_config' },
    update: { payload: sellerListingWizardConfig },
    create: {
      key: 'seller_listing_wizard_config',
      payload: sellerListingWizardConfig
    }
  });

  await prisma.systemContent.upsert({
    where: { key: 'provider_quote_templates_default' },
    update: { payload: providerQuoteTemplatesDefault },
    create: {
      key: 'provider_quote_templates_default',
      payload: providerQuoteTemplatesDefault
    }
  });

  console.log('Seeded seller_listing_wizard_config and provider_quote_templates_default');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
