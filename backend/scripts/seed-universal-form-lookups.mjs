import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const payload = {
  languages: [
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Swahili' },
    { code: 'fr', label: 'French' },
    { code: 'ar', label: 'Arabic' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'es', label: 'Spanish' },
    { code: 'de', label: 'German' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' }
  ],
  taxpayerTypes: [
    { value: 'business', label: 'Business / company' },
    { value: 'individual', label: 'Individual' }
  ],
  payoutMethods: [
    { value: 'bank_account', label: 'Bank account', helper: 'Local or international bank settlement.' },
    { value: 'mobile_money', label: 'Mobile money', helper: 'MTN, Airtel and other wallet providers.' },
    { value: 'alipay', label: 'Alipay', helper: 'For payouts to Mainland China or Hong Kong.' },
    { value: 'wechat_pay', label: 'WeChat Pay (Weixin Pay)', helper: 'For payouts to WeChat wallets.' },
    { value: 'other_local', label: 'Other payout method', helper: 'Cheque, local wallet or regional solution.' }
  ],
  payoutCurrencies: ['USD', 'EUR', 'CNY', 'UGX', 'KES', 'TZS', 'RWF', 'ZAR'],
  payoutRhythms: [
    { value: 'daily', label: 'Daily', helper: 'Payouts generated every business day.' },
    { value: 'weekly', label: 'Weekly', helper: 'Payouts grouped once per week.' },
    { value: 'biweekly', label: 'Biweekly', helper: 'Payouts grouped every two weeks.' },
    { value: 'monthly', label: 'Monthly', helper: 'Payouts grouped at month end.' },
    {
      value: 'on_threshold',
      label: 'When balance reaches a threshold',
      helper: 'We pay out once your balance reaches a minimum amount.'
    }
  ],
  mobileMoneyProviders: [
    { value: 'MTN Mobile Money', label: 'MTN Mobile Money' },
    { value: 'Airtel Money', label: 'Airtel Money' },
    { value: 'M-Pesa', label: 'M-Pesa' },
    { value: 'Safaricom', label: 'Safaricom' },
    { value: 'Orange Money', label: 'Orange Money' },
    { value: 'Wave', label: 'Wave' }
  ],
  mobileIdTypes: [
    { value: 'national_id', label: 'National ID' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_license', label: "Driver's License" },
    { value: 'tax_id', label: 'Tax ID' },
    { value: 'residence_permit', label: 'Residence Permit' },
    { value: 'voter_id', label: 'Voter ID' }
  ],
  payoutRegions: {
    alipay: [
      { value: 'mainland', label: 'Mainland China' },
      { value: 'hong_kong', label: 'Hong Kong SAR' },
      { value: 'other', label: 'Other region' }
    ],
    wechat: [
      { value: 'mainland', label: 'Mainland China' },
      { value: 'hong_kong', label: 'Hong Kong SAR' },
      { value: 'other', label: 'Other region' }
    ]
  },
  providerRegions: [
    { value: 'UG', label: 'Uganda' },
    { value: 'KE', label: 'Kenya' },
    { value: 'TZ', label: 'Tanzania' },
    { value: 'RW', label: 'Rwanda' },
    { value: 'NG', label: 'Nigeria' },
    { value: 'GH', label: 'Ghana' },
    { value: 'ZA', label: 'Southern Africa' },
    { value: 'AE', label: 'UAE' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'US', label: 'United States' }
  ],
  supplierModels: ['Seller', 'Provider', 'Seller + Provider'],
  supplierTargetRegions: [
    'East Africa',
    'Southern Africa',
    'West Africa',
    'North Africa',
    'Asia',
    'Europe',
    'North America'
  ],
  productCategories: [
    'Electronics',
    'Fashion & Beauty',
    'Food & Groceries',
    'Home & Living',
    'General Supplies',
    'EV & Mobility',
    'Medical & Health',
    'Education',
    'Travel & Tourism',
    'Properties & Supplies'
  ],
  serviceCategories: [
    'Consultations',
    'Installation Services',
    'Maintenance',
    'Digital Marketing',
    'Construction & Engineering',
    'Creative & Design',
    'Education & Training',
    'Freelance & On-Demand'
  ],
  contentFormats: [
    'Live Sessionz',
    'Shoppable Adz',
    'Replays & Clips',
    'UGC (Brand Content)',
    'Short-form (Reels/Shorts)',
    'Long-form (YouTube)'
  ],
  creatorUsageDecisions: [
    'I will use a Creator',
    'I will NOT use a Creator',
    'I am NOT SURE yet'
  ],
  collabModes: ['Open for Collabs', 'Invite-only'],
  approvalModes: ['Manual Content Approval', 'Auto Approval'],
  payoutMethodCards: [
    { key: 'Bank', title: 'Bank', desc: 'Best for stable settlements and high volume.' },
    { key: 'Mobile Money', title: 'Mobile Money', desc: 'Fast and popular across Africa.' },
    { key: 'PayPal / Wallet', title: 'PayPal / Wallet', desc: 'Use existing wallets in supported regions.' },
    { key: 'AliPay', title: 'AliPay', desc: 'China payment method for cross-border payments.' },
    { key: 'WeChat Pay', title: 'WeChat Pay', desc: 'China payment method for cross-border payments.' }
  ],
  policyPresets: [
    {
      id: 'standard',
      label: 'Standard',
      desc: 'Balanced defaults for most sellers.',
      patch: { returnsDays: '7', warrantyDays: '90', handlingTimeDays: '2' }
    },
    {
      id: 'fast',
      label: 'Fast',
      desc: 'Optimized for high conversion (quick dispatch).',
      patch: { returnsDays: '7', warrantyDays: '30', handlingTimeDays: '1' }
    },
    {
      id: 'strict',
      label: 'Strict',
      desc: 'Lower returns risk (use carefully by category).',
      patch: { returnsDays: '3', warrantyDays: '0', handlingTimeDays: '3' }
    }
  ]
};

async function main() {
  const record = await prisma.systemContent.upsert({
    where: { key: 'onboarding_lookups' },
    update: { payload },
    create: {
      key: 'onboarding_lookups',
      payload
    }
  });

  console.log(`Seeded onboarding_lookups with ${Object.keys(payload).length} top-level keys`);
  console.log(record.key);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
