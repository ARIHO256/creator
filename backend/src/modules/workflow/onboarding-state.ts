import { BadRequestException } from '@nestjs/common';
import {
  KYC_STATUSES,
  ONBOARDING_PROFILE_TYPES,
  ONBOARDING_STATUSES,
  OTP_STATUSES,
  UpdateOnboardingDto
} from './dto/update-onboarding.dto.js';

export type OnboardingProfileType = (typeof ONBOARDING_PROFILE_TYPES)[number];
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

type JsonRecord = Record<string, unknown>;

export type OnboardingState = {
  profileType: OnboardingProfileType;
  status: OnboardingStatus;
  owner: string;
  storeName: string;
  storeSlug: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  brandColor: string;
  logoUrl: string;
  coverUrl: string;
  support: {
    whatsapp: string;
    email: string;
    phone: string;
  };
  shipFrom: {
    country: string;
    province: string;
    city: string;
    address1: string;
    address2: string;
    postalCode: string;
  };
  channels: string[];
  languages: string[];
  taxonomySelection: JsonRecord | null;
  taxonomySelections: JsonRecord[];
  docs: {
    list: JsonRecord[];
  };
  shipping: {
    profileId: string;
    expressReady: boolean;
    handlingTimeDays: number | null;
  };
  policies: {
    returnsDays: number | null;
    warrantyDays: number | null;
    termsUrl: string;
    privacyUrl: string;
    policyNotes: string;
  };
  payout: {
    method: string;
    currency: string;
    rhythm: string;
    thresholdAmount: number | null;
    bankName: string;
    bankCountry: string;
    bankBranch: string;
    accountName: string;
    accountNo: string;
    swiftBic: string;
    iban: string;
    mobileProvider: string;
    mobileCountryCode: string;
    mobileNo: string;
    mobileIdType: string;
    mobileIdNumber: string;
    alipayRegion: string;
    alipayLogin: string;
    wechatRegion: string;
    wechatId: string;
    otherMethod: string;
    otherProvider: string;
    otherCountry: string;
    otherNotes: string;
    notificationsEmail: string;
    notificationsWhatsApp: string;
    confirmDetails: boolean;
    otherDetails: string;
    otherDescription: string;
  };
  tax: {
    taxpayerType: string;
    legalName: string;
    taxCountry: string;
    taxId: string;
    vatNumber: string;
    legalAddress: string;
    contact: string;
    contactEmail: string;
    contactSameAsOwner: boolean;
  };
  acceptance: {
    sellerTerms: boolean;
    contentPolicy: boolean;
    dataProcessing: boolean;
  };
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
    verificationPhone: string;
    verificationEmail: string;
    kycStatus: (typeof KYC_STATUSES)[number];
    otpStatus: (typeof OTP_STATUSES)[number];
    kycReference: string;
  };
  progress: {
    totalSteps: number;
    completedSteps: number;
    completionPercent: number;
    lastCompletedStepId: string;
  };
  steps: Array<{
    id: string;
    title: string;
    status: string;
    required: boolean;
    completedAt?: string;
  }>;
  providerServices: string[];
  bookingModes: string[];
  metadata: JsonRecord;
  submittedAt: string | null;
  updatedAt: string;
};

export const RESERVED_SELLER_SLUGS = new Set([
  'admin',
  'support',
  'help',
  'market',
  'marketplace',
  'seller',
  'buyers',
  'checkout',
  'evzone',
  'evzonepay',
  'terms',
  'privacy',
  'policies',
  'settings',
  'billing'
]);

export function sellerSlugToHandle(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function createDefaultOnboardingState(profileType: OnboardingProfileType): OnboardingState {
  return {
    profileType,
    status: 'draft',
    owner: '',
    storeName: '',
    storeSlug: '',
    email: '',
    phone: '',
    website: '',
    about: '',
    brandColor: '',
    logoUrl: '',
    coverUrl: '',
    support: { whatsapp: '', email: '', phone: '' },
    shipFrom: { country: '', province: '', city: '', address1: '', address2: '', postalCode: '' },
    channels: [],
    languages: [],
    taxonomySelection: null,
    taxonomySelections: [],
    docs: { list: [] },
    shipping: { profileId: '', expressReady: false, handlingTimeDays: null },
    policies: { returnsDays: null, warrantyDays: null, termsUrl: '', privacyUrl: '', policyNotes: '' },
    payout: {
      method: '',
      currency: '',
      rhythm: '',
      thresholdAmount: null,
      bankName: '',
      bankCountry: '',
      bankBranch: '',
      accountName: '',
      accountNo: '',
      swiftBic: '',
      iban: '',
      mobileProvider: '',
      mobileCountryCode: '',
      mobileNo: '',
      mobileIdType: '',
      mobileIdNumber: '',
      alipayRegion: '',
      alipayLogin: '',
      wechatRegion: '',
      wechatId: '',
      otherMethod: '',
      otherProvider: '',
      otherCountry: '',
      otherNotes: '',
      notificationsEmail: '',
      notificationsWhatsApp: '',
      confirmDetails: false,
      otherDetails: '',
      otherDescription: ''
    },
    tax: {
      taxpayerType: '',
      legalName: '',
      taxCountry: '',
      taxId: '',
      vatNumber: '',
      legalAddress: '',
      contact: '',
      contactEmail: '',
      contactSameAsOwner: false
    },
    acceptance: { sellerTerms: false, contentPolicy: false, dataProcessing: false },
    verification: {
      emailVerified: false,
      phoneVerified: false,
      verificationPhone: '',
      verificationEmail: '',
      kycStatus: 'PENDING',
      otpStatus: 'NOT_STARTED',
      kycReference: ''
    },
    progress: { totalSteps: 0, completedSteps: 0, completionPercent: 0, lastCompletedStepId: '' },
    steps: [],
    providerServices: [],
    bookingModes: [],
    metadata: {},
    submittedAt: null,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeStoredOnboardingState(payload: unknown, fallbackProfileType: OnboardingProfileType) {
  const source = isRecord(payload) ? payload : {};
  return mergeOnboardingState(createDefaultOnboardingState(inferProfileType(source, fallbackProfileType)), source);
}

export function mergeOnboardingState(current: OnboardingState, patch: UpdateOnboardingDto | JsonRecord) {
  const source = isRecord(patch) ? patch : {};
  const next: OnboardingState = {
    ...current,
    profileType: inferProfileType(source, current.profileType),
    status: inferStatus(source, current.status),
    owner: pickString(source.owner, current.owner),
    storeName: pickString(source.storeName, current.storeName),
    storeSlug: normalizeSlug(pickString(source.storeSlug, current.storeSlug)),
    email: pickString(source.email, current.email).toLowerCase(),
    phone: pickString(source.phone, current.phone),
    website: pickString(source.website, current.website),
    about: pickString(source.about, current.about),
    brandColor: pickString(source.brandColor, current.brandColor),
    logoUrl: pickString(source.logoUrl, current.logoUrl),
    coverUrl: pickString(source.coverUrl, current.coverUrl),
    support: {
      whatsapp: pickString(readNested(source, 'support', 'whatsapp'), current.support.whatsapp),
      email: pickString(readNested(source, 'support', 'email'), current.support.email).toLowerCase(),
      phone: pickString(readNested(source, 'support', 'phone'), current.support.phone)
    },
    shipFrom: {
      country: pickString(readNested(source, 'shipFrom', 'country'), current.shipFrom.country),
      province: pickString(readNested(source, 'shipFrom', 'province'), current.shipFrom.province),
      city: pickString(readNested(source, 'shipFrom', 'city'), current.shipFrom.city),
      address1: pickString(readNested(source, 'shipFrom', 'address1'), current.shipFrom.address1),
      address2: pickString(readNested(source, 'shipFrom', 'address2'), current.shipFrom.address2),
      postalCode: pickString(readNested(source, 'shipFrom', 'postalCode'), current.shipFrom.postalCode)
    },
    channels: uniqStringArray(source.channels, current.channels),
    languages: uniqStringArray(source.languages, current.languages),
    taxonomySelection: normalizeObject(readMaybe(source.taxonomySelection), current.taxonomySelection),
    taxonomySelections: normalizeObjectArray(source.taxonomySelections, current.taxonomySelections),
    docs: {
      list: normalizeDocumentList(readNested(source, 'docs', 'list'), current.docs.list)
    },
    shipping: {
      profileId: pickString(readNested(source, 'shipping', 'profileId'), current.shipping.profileId),
      expressReady: pickBoolean(readNested(source, 'shipping', 'expressReady'), current.shipping.expressReady),
      handlingTimeDays: pickNullableNumber(readNested(source, 'shipping', 'handlingTimeDays'), current.shipping.handlingTimeDays)
    },
    policies: {
      returnsDays: pickNullableNumber(readNested(source, 'policies', 'returnsDays'), current.policies.returnsDays),
      warrantyDays: pickNullableNumber(readNested(source, 'policies', 'warrantyDays'), current.policies.warrantyDays),
      termsUrl: pickString(readNested(source, 'policies', 'termsUrl'), current.policies.termsUrl),
      privacyUrl: pickString(readNested(source, 'policies', 'privacyUrl'), current.policies.privacyUrl),
      policyNotes: pickString(readNested(source, 'policies', 'policyNotes'), current.policies.policyNotes)
    },
    payout: {
      method: pickString(readNested(source, 'payout', 'method'), current.payout.method),
      currency: pickString(readNested(source, 'payout', 'currency'), current.payout.currency),
      rhythm: pickString(readNested(source, 'payout', 'rhythm'), current.payout.rhythm),
      thresholdAmount: pickNullableNumber(readNested(source, 'payout', 'thresholdAmount'), current.payout.thresholdAmount),
      bankName: pickString(readNested(source, 'payout', 'bankName'), current.payout.bankName),
      bankCountry: pickString(readNested(source, 'payout', 'bankCountry'), current.payout.bankCountry),
      bankBranch: pickString(readNested(source, 'payout', 'bankBranch'), current.payout.bankBranch),
      accountName: pickString(readNested(source, 'payout', 'accountName'), current.payout.accountName),
      accountNo: pickString(readNested(source, 'payout', 'accountNo'), current.payout.accountNo),
      swiftBic: pickString(readNested(source, 'payout', 'swiftBic'), current.payout.swiftBic),
      iban: pickString(readNested(source, 'payout', 'iban'), current.payout.iban),
      mobileProvider: pickString(readNested(source, 'payout', 'mobileProvider'), current.payout.mobileProvider),
      mobileCountryCode: pickString(readNested(source, 'payout', 'mobileCountryCode'), current.payout.mobileCountryCode),
      mobileNo: pickString(readNested(source, 'payout', 'mobileNo'), current.payout.mobileNo),
      mobileIdType: pickString(readNested(source, 'payout', 'mobileIdType'), current.payout.mobileIdType),
      mobileIdNumber: pickString(readNested(source, 'payout', 'mobileIdNumber'), current.payout.mobileIdNumber),
      alipayRegion: pickString(readNested(source, 'payout', 'alipayRegion'), current.payout.alipayRegion),
      alipayLogin: pickString(readNested(source, 'payout', 'alipayLogin'), current.payout.alipayLogin),
      wechatRegion: pickString(readNested(source, 'payout', 'wechatRegion'), current.payout.wechatRegion),
      wechatId: pickString(readNested(source, 'payout', 'wechatId'), current.payout.wechatId),
      otherMethod: pickString(readNested(source, 'payout', 'otherMethod'), current.payout.otherMethod),
      otherProvider: pickString(readNested(source, 'payout', 'otherProvider'), current.payout.otherProvider),
      otherCountry: pickString(readNested(source, 'payout', 'otherCountry'), current.payout.otherCountry),
      otherNotes: pickString(readNested(source, 'payout', 'otherNotes'), current.payout.otherNotes),
      notificationsEmail: pickString(readNested(source, 'payout', 'notificationsEmail'), current.payout.notificationsEmail).toLowerCase(),
      notificationsWhatsApp: pickString(readNested(source, 'payout', 'notificationsWhatsApp'), current.payout.notificationsWhatsApp),
      confirmDetails: pickBoolean(readNested(source, 'payout', 'confirmDetails'), current.payout.confirmDetails),
      otherDetails: pickString(readNested(source, 'payout', 'otherDetails'), current.payout.otherDetails),
      otherDescription: pickString(readNested(source, 'payout', 'otherDescription'), current.payout.otherDescription)
    },
    tax: {
      taxpayerType: pickString(readNested(source, 'tax', 'taxpayerType'), current.tax.taxpayerType),
      legalName: pickString(readNested(source, 'tax', 'legalName'), current.tax.legalName),
      taxCountry: pickString(readNested(source, 'tax', 'taxCountry'), current.tax.taxCountry),
      taxId: pickString(readNested(source, 'tax', 'taxId'), current.tax.taxId),
      vatNumber: pickString(readNested(source, 'tax', 'vatNumber'), current.tax.vatNumber),
      legalAddress: pickString(readNested(source, 'tax', 'legalAddress'), current.tax.legalAddress),
      contact: pickString(readNested(source, 'tax', 'contact'), current.tax.contact),
      contactEmail: pickString(readNested(source, 'tax', 'contactEmail'), current.tax.contactEmail).toLowerCase(),
      contactSameAsOwner: pickBoolean(readNested(source, 'tax', 'contactSameAsOwner'), current.tax.contactSameAsOwner)
    },
    acceptance: {
      sellerTerms: pickBoolean(readNested(source, 'acceptance', 'sellerTerms'), current.acceptance.sellerTerms),
      contentPolicy: pickBoolean(readNested(source, 'acceptance', 'contentPolicy'), current.acceptance.contentPolicy),
      dataProcessing: pickBoolean(readNested(source, 'acceptance', 'dataProcessing'), current.acceptance.dataProcessing)
    },
    verification: {
      emailVerified: pickBoolean(readNested(source, 'verification', 'emailVerified'), current.verification.emailVerified),
      phoneVerified: pickBoolean(readNested(source, 'verification', 'phoneVerified'), current.verification.phoneVerified),
      verificationPhone: pickString(readNested(source, 'verification', 'verificationPhone'), current.verification.verificationPhone),
      verificationEmail: pickString(readNested(source, 'verification', 'verificationEmail'), current.verification.verificationEmail).toLowerCase(),
      kycStatus: pickStatus(readNested(source, 'verification', 'kycStatus'), KYC_STATUSES, current.verification.kycStatus),
      otpStatus: pickStatus(readNested(source, 'verification', 'otpStatus'), OTP_STATUSES, current.verification.otpStatus),
      kycReference: pickString(readNested(source, 'verification', 'kycReference'), current.verification.kycReference)
    },
    progress: { ...current.progress },
    steps: normalizeSteps(source.steps, current.steps),
    providerServices: uniqStringArray(source.providerServices, current.providerServices),
    bookingModes: uniqStringArray(source.bookingModes, current.bookingModes),
    metadata: normalizeObject(source.metadata, current.metadata) ?? {},
    submittedAt: current.submittedAt,
    updatedAt: new Date().toISOString()
  };

  next.progress = computeProgress(next.steps, next.progress);
  if (source.progress && isRecord(source.progress)) {
    next.progress = {
      totalSteps: pickNumber(source.progress.totalSteps, next.progress.totalSteps),
      completedSteps: pickNumber(source.progress.completedSteps, next.progress.completedSteps),
      completionPercent: pickNumber(source.progress.completionPercent, next.progress.completionPercent),
      lastCompletedStepId: pickString(source.progress.lastCompletedStepId, next.progress.lastCompletedStepId)
    };
  }

  if (next.status === 'draft' && hasOnboardingProgress(next)) {
    next.status = 'in_progress';
  }

  return next;
}

export function prepareSubmittedOnboarding(state: OnboardingState): OnboardingState {
  assertSubmittableOnboarding(state);
  const submittedAt = new Date().toISOString();
  return {
    ...state,
    status: state.status === 'approved' ? 'approved' : 'submitted',
    submittedAt,
    updatedAt: submittedAt,
    progress: computeProgress(state.steps, state.progress)
  };
}

export function assertSubmittableOnboarding(state: OnboardingState) {
  if (state.profileType === 'SELLER' || state.profileType === 'PROVIDER') {
    const missing = [
      ['storeName', state.storeName],
      ['storeSlug', state.storeSlug],
      ['email', state.email],
      ['phone', state.phone],
      ['tax.taxpayerType', state.tax.taxpayerType],
      ['tax.legalName', state.tax.legalName],
      ['tax.taxCountry', state.tax.taxCountry],
      ['payout.method', state.payout.method],
      ['payout.currency', state.payout.currency],
      ['shipFrom.country', state.shipFrom.country],
      ['shipFrom.city', state.shipFrom.city]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new BadRequestException(`Onboarding is missing required fields: ${missing.join(', ')}`);
    }

    if (state.docs.list.length === 0) {
      throw new BadRequestException('Onboarding requires at least one verification document');
    }

    if (!state.acceptance.sellerTerms || !state.acceptance.contentPolicy || !state.acceptance.dataProcessing) {
      throw new BadRequestException('Onboarding terms, content policy, and data processing must all be accepted');
    }
  }
}

function inferProfileType(source: JsonRecord, fallback: OnboardingProfileType): OnboardingProfileType {
  const value = pickString(source.profileType, fallback).toUpperCase();
  return ONBOARDING_PROFILE_TYPES.includes(value as OnboardingProfileType)
    ? (value as OnboardingProfileType)
    : fallback;
}

function inferStatus(source: JsonRecord, fallback: OnboardingStatus): OnboardingStatus {
  const value = pickString(source.status, fallback).toLowerCase();
  return ONBOARDING_STATUSES.includes(value as OnboardingStatus) ? (value as OnboardingStatus) : fallback;
}

function normalizeSlug(value: string) {
  const slug = sellerSlugToHandle(value);
  if (slug && RESERVED_SELLER_SLUGS.has(slug)) {
    throw new BadRequestException(`Seller slug "${slug}" is reserved`);
  }
  return slug;
}

function normalizeSteps(value: unknown, fallback: OnboardingState['steps']) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter(isRecord)
    .map((entry) => ({
      id: pickString(entry.id, ''),
      title: pickString(entry.title, ''),
      status: pickString(entry.status, 'pending').toLowerCase(),
      required: pickBoolean(entry.required, true),
      completedAt: pickString(entry.completedAt, '')
    }))
    .filter((entry) => entry.id && entry.title)
    .map((entry) => ({
      ...entry,
      completedAt: entry.completedAt || undefined
    }));
}

function normalizeDocumentList(value: unknown, fallback: JsonRecord[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter(isRecord)
    .map((entry) => ({
      id: pickString(entry.id, cryptoRandomId()),
      type: pickString(entry.type, ''),
      name: pickString(entry.name, ''),
      file: pickString(entry.file, ''),
      fileUrl: pickString(entry.fileUrl, ''),
      status: pickString(entry.status, 'uploaded'),
      expiry: pickString(entry.expiry, ''),
      uploadedAt: pickString(entry.uploadedAt, new Date().toISOString()),
      notes: pickString(entry.notes, ''),
      storageKey: pickString(entry.storageKey, ''),
      mimeType: pickString(entry.mimeType, '')
    }))
    .filter((entry) => entry.type);
}

function computeProgress(steps: OnboardingState['steps'], current: OnboardingState['progress']) {
  const totalSteps = steps.length || current.totalSteps;
  const completed = steps.filter((step) => step.status === 'completed').length;
  const completionPercent =
    totalSteps > 0 ? Math.max(0, Math.min(100, Math.round((completed / totalSteps) * 100))) : current.completionPercent;
  const lastCompletedStepId = [...steps].reverse().find((step) => step.status === 'completed')?.id ?? current.lastCompletedStepId;

  return {
    totalSteps,
    completedSteps: completed,
    completionPercent,
    lastCompletedStepId
  };
}

function hasOnboardingProgress(state: OnboardingState) {
  return Boolean(
    state.storeName ||
      state.storeSlug ||
      state.docs.list.length ||
      state.channels.length ||
      state.languages.length ||
      state.steps.length
  );
}

function uniqStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return [...new Set(value.map((entry) => pickString(entry, '')).filter(Boolean))];
}

function normalizeObject(value: unknown, fallback: JsonRecord | null) {
  return isRecord(value) ? { ...value } : fallback;
}

function normalizeObjectArray(value: unknown, fallback: JsonRecord[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter(isRecord).map((entry) => ({ ...entry }));
}

function readNested(source: JsonRecord, key: string, nestedKey: string) {
  const value = source[key];
  if (!isRecord(value)) {
    return undefined;
  }

  return value[nestedKey];
}

function readMaybe(value: unknown) {
  return value === null ? null : value;
}

function pickString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value.trim() : fallback;
}

function pickBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function pickNullableNumber(value: unknown, fallback: number | null) {
  if (value === null) {
    return null;
  }

  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickStatus<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  const normalized = pickString(value, fallback).toUpperCase();
  return allowed.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}
