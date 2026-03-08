import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

export const ONBOARDING_PROFILE_TYPES = ['CREATOR', 'SELLER', 'PROVIDER'] as const;
export const ONBOARDING_STATUSES = ['draft', 'in_progress', 'submitted', 'resubmitted', 'approved', 'rejected'] as const;
export const ONBOARDING_STEP_STATUSES = ['pending', 'active', 'completed', 'blocked'] as const;
export const KYC_STATUSES = ['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'] as const;
export const OTP_STATUSES = ['NOT_STARTED', 'SENT', 'VERIFIED', 'FAILED'] as const;

export class OnboardingSupportDto {
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class OnboardingAddressDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address1?: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class OnboardingTaxonomyPathNodeDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  type!: string;
}

export class OnboardingTaxonomySelectionDto {
  @IsString()
  nodeId!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  path?: string[];

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaxonomyPathNodeDto)
  pathNodes?: OnboardingTaxonomyPathNodeDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class OnboardingDocumentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  file?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  fileUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  expiry?: string;

  @IsOptional()
  @IsString()
  uploadedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class OnboardingDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingDocumentDto)
  list!: OnboardingDocumentDto[];
}

export class OnboardingShippingDto {
  @IsOptional()
  @IsString()
  profileId?: string;

  @IsOptional()
  @IsBoolean()
  expressReady?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  handlingTimeDays?: number;
}

export class OnboardingPoliciesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  returnsDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  warrantyDays?: number;

  @IsOptional()
  @IsUrl({ require_tld: false })
  termsUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  privacyUrl?: string;

  @IsOptional()
  @IsString()
  policyNotes?: string;
}

export class OnboardingPayoutDto {
  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  rhythm?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  thresholdAmount?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankCountry?: string;

  @IsOptional()
  @IsString()
  bankBranch?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNo?: string;

  @IsOptional()
  @IsString()
  swiftBic?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  mobileProvider?: string;

  @IsOptional()
  @IsString()
  mobileCountryCode?: string;

  @IsOptional()
  @IsString()
  mobileNo?: string;

  @IsOptional()
  @IsString()
  mobileIdType?: string;

  @IsOptional()
  @IsString()
  mobileIdNumber?: string;

  @IsOptional()
  @IsString()
  alipayRegion?: string;

  @IsOptional()
  @IsString()
  alipayLogin?: string;

  @IsOptional()
  @IsString()
  wechatRegion?: string;

  @IsOptional()
  @IsString()
  wechatId?: string;

  @IsOptional()
  @IsString()
  otherMethod?: string;

  @IsOptional()
  @IsString()
  otherProvider?: string;

  @IsOptional()
  @IsString()
  otherCountry?: string;

  @IsOptional()
  @IsString()
  otherNotes?: string;

  @IsOptional()
  @IsEmail()
  notificationsEmail?: string;

  @IsOptional()
  @IsString()
  notificationsWhatsApp?: string;

  @IsOptional()
  @IsBoolean()
  confirmDetails?: boolean;

  @IsOptional()
  @IsString()
  otherDetails?: string;

  @IsOptional()
  @IsString()
  otherDescription?: string;
}

export class OnboardingTaxDto {
  @IsOptional()
  @IsString()
  taxpayerType?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  taxCountry?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  vatNumber?: string;

  @IsOptional()
  @IsString()
  legalAddress?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsBoolean()
  contactSameAsOwner?: boolean;
}

export class OnboardingAcceptanceDto {
  @IsOptional()
  @IsBoolean()
  sellerTerms?: boolean;

  @IsOptional()
  @IsBoolean()
  contentPolicy?: boolean;

  @IsOptional()
  @IsBoolean()
  dataProcessing?: boolean;
}

export class OnboardingVerificationDto {
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  @IsOptional()
  @IsString()
  verificationPhone?: string;

  @IsOptional()
  @IsString()
  verificationEmail?: string;

  @IsOptional()
  @IsIn(KYC_STATUSES)
  kycStatus?: (typeof KYC_STATUSES)[number];

  @IsOptional()
  @IsIn(OTP_STATUSES)
  otpStatus?: (typeof OTP_STATUSES)[number];

  @IsOptional()
  @IsString()
  kycReference?: string;
}

export class OnboardingProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalSteps!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  completedSteps!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  completionPercent!: number;

  @IsOptional()
  @IsString()
  lastCompletedStepId?: string;
}

export class OnboardingStepDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsIn(ONBOARDING_STEP_STATUSES)
  status!: (typeof ONBOARDING_STEP_STATUSES)[number];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsString()
  completedAt?: string;
}

export class UpdateOnboardingDto {
  @IsOptional()
  @IsIn(ONBOARDING_PROFILE_TYPES)
  profileType?: (typeof ONBOARDING_PROFILE_TYPES)[number];

  @IsOptional()
  @IsIn(ONBOARDING_STATUSES)
  status?: (typeof ONBOARDING_STATUSES)[number];

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  storeSlug?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  brandColor?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingSupportDto)
  support?: OnboardingSupportDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingAddressDto)
  shipFrom?: OnboardingAddressDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingTaxonomySelectionDto)
  taxonomySelection?: OnboardingTaxonomySelectionDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingTaxonomySelectionDto)
  taxonomySelections?: OnboardingTaxonomySelectionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingDocumentsDto)
  docs?: OnboardingDocumentsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingShippingDto)
  shipping?: OnboardingShippingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingPoliciesDto)
  policies?: OnboardingPoliciesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingPayoutDto)
  payout?: OnboardingPayoutDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingTaxDto)
  tax?: OnboardingTaxDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingAcceptanceDto)
  acceptance?: OnboardingAcceptanceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingVerificationDto)
  verification?: OnboardingVerificationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingProgressDto)
  progress?: OnboardingProgressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingStepDto)
  steps?: OnboardingStepDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  providerServices?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  bookingModes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
