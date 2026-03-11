import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearSession, useSession } from '../../auth/session';
import { recordOnboardingStatus } from '../misc/onboardingStatus';
import { sellerBackendApi } from '../../lib/backendApi';
import { authClient } from '../../lib/authApi';
import { useLocalization } from '../../localization/LocalizationProvider';
import { useThemeMode } from '../../theme/themeMode';
import { useProviderServiceTaxonomy } from '../../data/taxonomy';
import type { Session } from '../../types/session';
import SellerOnboardingTaxonomyNavigator from '../misc/SellerOnboardingTaxonomyNavigator';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Autocomplete,
  Divider,
  Radio,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@mui/material';

// Provider Onboarding (EVzone ServiceMart) - Super Premium (v4)
// Route: /provider/onboarding
// Focus: Premium UX, clear step completion, strong validation, service capability + pricing, coverage + availability,
// compliance documents, payout + tax, and a final review submission.
// Notes:
// - UI-first: connect your backend for verification, file uploads, admin approvals, and service catalog publishing.
// - Reads legacy draft key (provider_onb_pro_v31) and writes to v4 key. Keeps review timeline key (provider_onb_review_v1).

function ts() {
  const d = new Date();
  return d.toLocaleTimeString().slice(0, 5);
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const BRAND = {
  green: '#03CD8C',
  orange: '#F77F00',
  slate900: '#0F172A',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate300: '#CBD5E1',
  bg0: '#F6FFFB',
  bg1: '#F5F7FF',
  surface: '#FFFFFF',
};

const EV_COLORS = {
  primary: BRAND.green,
  primarySoft: 'rgba(3, 205, 140, 0.10)',
  primaryStrong: '#059669',
  accent: BRAND.orange,
  accentSoft: 'rgba(247, 127, 0, 0.12)',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FBFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textSubtle: '#64748B',
  textMuted: '#94A3B8',
};

const STORAGE = {
  form: 'provider_onb_pro_v4',
  legacy: 'provider_onb_pro_v31',
  review: 'provider_onb_review_v1',
  ui: 'provider_onb_ui_v1',
};

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '中文 (简体)' },
  { code: 'fr', label: 'Français' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
  { code: 'sw', label: 'Swahili' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
];

type CountryDialOption = {
  value: string;
  label: string;
  name: string;
  code: string;
  search: string;
};

type SupportInfo = {
  whatsapp: string;
  email: string;
  phone: string;
};

type HeadquartersInfo = {
  country: string;
  city: string;
  address1: string;
  address2: string;
};

type ServiceLine = {
  id?: string;
  title?: string;
  category?: string;
  pricingModel?: string;
  currency?: string;
  basePrice?: string;
  unit?: string;
  durationMins?: string;
  requiresSiteVisit?: boolean;
  emergencySupport?: boolean;
  remoteAvailable?: boolean;
  assessmentMode?: string;
  notes?: string;
  materialsIncluded?: boolean;
  warrantyDays?: string;
  [key: string]: unknown;
};

type TeamInfo = {
  teamSize: string;
  yearsExperience: string;
  tools: string[];
  notes: string;
};

type ServicePolicies = {
  responseSlaHours: string;
  cancellationWindowHours: string;
  serviceWarrantyDays: string;
  afterServiceSupportDays: string;
  disputeNotes: string;
};

type CoverageInfo = {
  cities: string;
  travelRadiusKm: string;
  onsiteAvailable: boolean;
  remoteAvailable: boolean;
  coverageNotes: string;
  bookingLink: string;
  leadTimeHours: string;
  emergencyAvailable: boolean;
};

type AvailabilityDay = {
  open: string;
  close: string;
  closed: boolean;
};

type AvailabilityInfo = {
  timezone: string;
  days: Record<string, AvailabilityDay>;
};

type ProviderDoc = {
  id: string;
  type: string;
  name?: string;
  file?: string;
  fileUrl?: string;
  status?: string;
  expiry?: string;
  [key: string]: unknown;
};

type PayoutForm = {
  method: string;
  currency: string;
  rhythm: string;
  thresholdAmount: string;
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
  otherDetails?: string;
  otherDescription?: string;
  notificationsEmail: string;
  notificationsWhatsApp: string;
  confirmDetails: boolean;
  [key: string]: unknown;
};

type TaxForm = {
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

type AcceptanceForm = {
  providerTerms: boolean;
  servicePolicy: boolean;
  dataProcessing: boolean;
  qualityStandards: boolean;
};

type ProviderProfile = {
  owner: string;
  status: string;
  providerType: string;
  displayName: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  brandColor: string;
  logoUrl: string;
  coverUrl: string;
  support: SupportInfo;
  hq: HeadquartersInfo;
  categories: string[];
  otherCategory: string;
  languages: string[];
  serviceCurrency: string;
  serviceLines: ServiceLine[];
  team: TeamInfo;
  servicePolicies: ServicePolicies;
  regions: string[];
  coverage: CoverageInfo;
  availability: AvailabilityInfo;
  docs: { list: ProviderDoc[] };
  payout: PayoutForm;
  tax: TaxForm;
  acceptance: AcceptanceForm;
};

type TaxonomySelection = {
  nodeId: string;
  path?: string[];
  pathNodes?: Array<{ id: string; name: string; type: string }>;
  marketplace?: string;
  marketplaceId?: string;
};

type ToastState = {
  tone?: 'success' | 'error' | 'info';
  title: string;
  message?: string;
};

const DEFAULT_DIAL_CODE = '+256';

const COUNTRY_DIAL_CODES = [
  { code: 'AF', name: 'Afghanistan (‫افغانستان‬‎)', dial: '+93', flag: '🇦🇫' },
  { code: 'AX', name: 'Åland Islands', dial: '+358', flag: '🇦🇽' },
  { code: 'AL', name: 'Albania (Shqipëri)', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria (‫الجزائر‬‎)', dial: '+213', flag: '🇩🇿' },
  { code: 'AS', name: 'American Samoa', dial: '+1684', flag: '🇦🇸' },
  { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
  { code: 'AI', name: 'Anguilla', dial: '+1264', flag: '🇦🇮' },
  { code: 'AQ', name: 'Antarctica', dial: '+672', flag: '🇦🇶' },
  { code: 'AG', name: 'Antigua and Barbuda', dial: '+1268', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia (Հայաստան)', dial: '+374', flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', dial: '+297', flag: '🇦🇼' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria (Österreich)', dial: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan (Azərbaycan)', dial: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dial: '+1242', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain (‫البحرين‬‎)', dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh (বাংলাদেশ)', dial: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dial: '+1246', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus (Беларусь)', dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium (België)', dial: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin (Bénin)', dial: '+229', flag: '🇧🇯' },
  { code: 'BM', name: 'Bermuda', dial: '+1441', flag: '🇧🇲' },
  { code: 'BT', name: 'Bhutan (འབྲུག)', dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina (Босна и Херцеговина)', dial: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
  { code: 'BV', name: 'Bouvet Island', dial: '+47', flag: '🇧🇻' },
  { code: 'BR', name: 'Brazil (Brasil)', dial: '+55', flag: '🇧🇷' },
  { code: 'IO', name: 'British Indian Ocean Territory', dial: '+246', flag: '🇮🇴' },
  { code: 'VG', name: 'British Virgin Islands', dial: '+1284', flag: '🇻🇬' },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria (България)', dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi (Uburundi)', dial: '+257', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia (កម្ពុជា)', dial: '+855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon (Cameroun)', dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde (Kabu Verdi)', dial: '+238', flag: '🇨🇻' },
  { code: 'BQ', name: 'Caribbean Netherlands', dial: '+599', flag: '🇧🇶' },
  { code: 'KY', name: 'Cayman Islands', dial: '+1345', flag: '🇰🇾' },
  {
    code: 'CF',
    name: 'Central African Republic (République centrafricaine)',
    dial: '+236',
    flag: '🇨🇫',
  },
  { code: 'TD', name: 'Chad (Tchad)', dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China (中国)', dial: '+86', flag: '🇨🇳' },
  { code: 'CX', name: 'Christmas Island', dial: '+61', flag: '🇨🇽' },
  { code: 'CC', name: 'Cocos (Keeling) Islands', dial: '+61', flag: '🇨🇨' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros (‫جزر القمر‬‎)', dial: '+269', flag: '🇰🇲' },
  { code: 'CD', name: 'Congo (DRC) (Jamhuri ya Kidemokrasia ya Kongo)', dial: '+243', flag: '🇨🇩' },
  { code: 'CG', name: 'Congo (Republic) (Congo-Brazzaville)', dial: '+242', flag: '🇨🇬' },
  { code: 'CK', name: 'Cook Islands', dial: '+682', flag: '🇨🇰' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia (Hrvatska)', dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
  { code: 'CW', name: 'Curaçao', dial: '+599', flag: '🇨🇼' },
  { code: 'CY', name: 'Cyprus (Κύπρος)', dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic (Česká republika)', dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark (Danmark)', dial: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dial: '+1767', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic (República Dominicana)', dial: '+1', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt (‫مصر‬‎)', dial: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea (Guinea Ecuatorial)', dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia (Eesti)', dial: '+372', flag: '🇪🇪' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'FK', name: 'Falkland Islands (Islas Malvinas)', dial: '+500', flag: '🇫🇰' },
  { code: 'FO', name: 'Faroe Islands (Føroyar)', dial: '+298', flag: '🇫🇴' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland (Suomi)', dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'GF', name: 'French Guiana (Guyane française)', dial: '+594', flag: '🇬🇫' },
  { code: 'PF', name: 'French Polynesia (Polynésie française)', dial: '+689', flag: '🇵🇫' },
  { code: 'TF', name: 'French Southern and Antarctic Lands', dial: '+262', flag: '🇹🇫' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia (საქართველო)', dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany (Deutschland)', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana (Gaana)', dial: '+233', flag: '🇬🇭' },
  { code: 'GI', name: 'Gibraltar', dial: '+350', flag: '🇬🇮' },
  { code: 'GR', name: 'Greece (Ελλάδα)', dial: '+30', flag: '🇬🇷' },
  { code: 'GL', name: 'Greenland (Kalaallit Nunaat)', dial: '+299', flag: '🇬🇱' },
  { code: 'GD', name: 'Grenada', dial: '+1473', flag: '🇬🇩' },
  { code: 'GP', name: 'Guadeloupe', dial: '+590', flag: '🇬🇵' },
  { code: 'GU', name: 'Guam', dial: '+1671', flag: '🇬🇺' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'GG', name: 'Guernsey', dial: '+44', flag: '🇬🇬' },
  { code: 'GN', name: 'Guinea (Guinée)', dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau (Guiné Bissau)', dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { code: 'HM', name: 'Heard Island and McDonald Islands', dial: '+672', flag: '🇭🇲' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong (香港)', dial: '+852', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary (Magyarország)', dial: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland (Ísland)', dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India (भारत)', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran (‫ایران‬‎)', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq (‫العراق‬‎)', dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IM', name: 'Isle of Man', dial: '+44', flag: '🇮🇲' },
  { code: 'IL', name: 'Israel (‫ישראל‬‎)', dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy (Italia)', dial: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial: '+1876', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan (日本)', dial: '+81', flag: '🇯🇵' },
  { code: 'JE', name: 'Jersey', dial: '+44', flag: '🇯🇪' },
  { code: 'JO', name: 'Jordan (‫الأردن‬‎)', dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan (Казахстан)', dial: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', dial: '+686', flag: '🇰🇮' },
  { code: 'XK', name: 'Kosovo', dial: '+383', flag: '🇽🇰' },
  { code: 'KW', name: 'Kuwait (‫الكويت‬‎)', dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan (Кыргызстан)', dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos (ລາວ)', dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia (Latvija)', dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon (‫لبنان‬‎)', dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya (‫ليبيا‬‎)', dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania (Lietuva)', dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MO', name: 'Macau (澳門)', dial: '+853', flag: '🇲🇴' },
  { code: 'MK', name: 'Macedonia (FYROM) (Македонија)', dial: '+389', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar (Madagasikara)', dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', dial: '+692', flag: '🇲🇭' },
  { code: 'MQ', name: 'Martinique', dial: '+596', flag: '🇲🇶' },
  { code: 'MR', name: 'Mauritania (‫موريتانيا‬‎)', dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius (Moris)', dial: '+230', flag: '🇲🇺' },
  { code: 'YT', name: 'Mayotte', dial: '+262', flag: '🇾🇹' },
  { code: 'MX', name: 'Mexico (México)', dial: '+52', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', dial: '+691', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova (Republica Moldova)', dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia (Монгол)', dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro (Crna Gora)', dial: '+382', flag: '🇲🇪' },
  { code: 'MS', name: 'Montserrat', dial: '+1664', flag: '🇲🇸' },
  { code: 'MA', name: 'Morocco (‫المغرب‬‎)', dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique (Moçambique)', dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar (Burma) (မြန်မာ)', dial: '+95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia (Namibië)', dial: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', dial: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal (नेपाल)', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands (Nederland)', dial: '+31', flag: '🇳🇱' },
  { code: 'NC', name: 'New Caledonia (Nouvelle-Calédonie)', dial: '+687', flag: '🇳🇨' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger (Nijar)', dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'NU', name: 'Niue', dial: '+683', flag: '🇳🇺' },
  { code: 'NF', name: 'Norfolk Island', dial: '+672', flag: '🇳🇫' },
  { code: 'KP', name: 'North Korea (조선 민주주의 인민 공화국)', dial: '+850', flag: '🇰🇵' },
  { code: 'MP', name: 'Northern Mariana Islands', dial: '+1670', flag: '🇲🇵' },
  { code: 'NO', name: 'Norway (Norge)', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman (‫عُمان‬‎)', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan (‫پاکستان‬‎)', dial: '+92', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', dial: '+680', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine (‫فلسطين‬‎)', dial: '+970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama (Panamá)', dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru (Perú)', dial: '+51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PN', name: 'Pitcairn Islands', dial: '+64', flag: '🇵🇳' },
  { code: 'PL', name: 'Poland (Polska)', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷' },
  { code: 'QA', name: 'Qatar (‫قطر‬‎)', dial: '+974', flag: '🇶🇦' },
  { code: 'RE', name: 'Réunion (La Réunion)', dial: '+262', flag: '🇷🇪' },
  { code: 'RO', name: 'Romania (România)', dial: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia (Россия)', dial: '+7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'BL', name: 'Saint Barthélemy (Saint-Barthélemy)', dial: '+590', flag: '🇧🇱' },
  { code: 'SH', name: 'Saint Helena', dial: '+290', flag: '🇸🇭' },
  { code: 'KN', name: 'Saint Kitts and Nevis', dial: '+1869', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1758', flag: '🇱🇨' },
  { code: 'MF', name: 'Saint Martin (Saint-Martin (partie française))', dial: '+590', flag: '🇲🇫' },
  {
    code: 'PM',
    name: 'Saint Pierre and Miquelon (Saint-Pierre-et-Miquelon)',
    dial: '+508',
    flag: '🇵🇲',
  },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', dial: '+1784', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', dial: '+685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', dial: '+378', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé and Príncipe (São Tomé e Príncipe)', dial: '+239', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia (‫المملكة العربية السعودية‬‎)', dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal (Sénégal)', dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia (Србија)', dial: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'SX', name: 'Sint Maarten', dial: '+1721', flag: '🇸🇽' },
  { code: 'SK', name: 'Slovakia (Slovensko)', dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia (Slovenija)', dial: '+386', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia (Soomaaliya)', dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', dial: '+500', flag: '🇬🇸' },
  { code: 'KR', name: 'South Korea (대한민국)', dial: '+82', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan (‫جنوب السودان‬‎)', dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain (España)', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka (ශ්‍රී ලංකාව)', dial: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan (‫السودان‬‎)', dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', dial: '+597', flag: '🇸🇷' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', dial: '+47', flag: '🇸🇯' },
  { code: 'SZ', name: 'Swaziland', dial: '+268', flag: '🇸🇿' },
  { code: 'SE', name: 'Sweden (Sverige)', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland (Schweiz)', dial: '+41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria (‫سوريا‬‎)', dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan (台灣)', dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand (ไทย)', dial: '+66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'TK', name: 'Tokelau', dial: '+690', flag: '🇹🇰' },
  { code: 'TO', name: 'Tonga', dial: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', dial: '+1868', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia (‫تونس‬‎)', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey (Türkiye)', dial: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993', flag: '🇹🇲' },
  { code: 'TC', name: 'Turks and Caicos Islands', dial: '+1649', flag: '🇹🇨' },
  { code: 'TV', name: 'Tuvalu', dial: '+688', flag: '🇹🇻' },
  { code: 'VI', name: 'U.S. Virgin Islands', dial: '+1340', flag: '🇻🇮' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine (Україна)', dial: '+380', flag: '🇺🇦' },
  {
    code: 'AE',
    name: 'United Arab Emirates (‫الإمارات العربية المتحدة‬‎)',
    dial: '+971',
    flag: '🇦🇪',
  },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UM', name: 'United States Minor Outlying Islands', dial: '+1', flag: '🇺🇲' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan (Oʻzbekiston)', dial: '+998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', dial: '+678', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City (Città del Vaticano)', dial: '+39', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam (Việt Nam)', dial: '+84', flag: '🇻🇳' },
  { code: 'WF', name: 'Wallis and Futuna', dial: '+681', flag: '🇼🇫' },
  { code: 'EH', name: 'Western Sahara', dial: '+212', flag: '🇪🇭' },
  { code: 'YE', name: 'Yemen (‫اليمن‬‎)', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
];

const COUNTRY_DIAL_OPTIONS = COUNTRY_DIAL_CODES.map((item) => ({
  value: item.dial,
  label: `${item.flag} ${item.dial}`,
  name: item.name,
  code: item.code,
  search: `${item.name} ${item.dial} ${item.code}`.toLowerCase(),
}));

const REGION_OPTIONS = [
  { code: 'UG', label: 'Uganda' },
  { code: 'KE', label: 'Kenya' },
  { code: 'TZ', label: 'Tanzania' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'GH', label: 'Ghana' },
  { code: 'ZA', label: 'Southern Africa' },
  { code: 'AE', label: 'UAE' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
];

type ServiceCategoryOption = {
  id: string;
  label: string;
  desc: string;
  flags: {
    fieldWork?: boolean;
    electrical?: boolean;
    regulated?: boolean;
    training?: boolean;
    remoteOk?: boolean;
  };
};

function collectServiceCategories(nodes: Array<{ id: string; name: string; description?: string; metadata?: Record<string, unknown> | null; children?: any[] }>) {
  const items: ServiceCategoryOption[] = [];
  const seen = new Set<string>();

  const visit = (node) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    const metadata =
      node?.metadata && typeof node.metadata === 'object'
        ? (node.metadata as Record<string, unknown>)
        : null;
    const categoryId = typeof metadata?.categoryId === 'string' ? metadata.categoryId : null;
    const flags =
      metadata?.flags && typeof metadata.flags === 'object'
        ? (metadata.flags as ServiceCategoryOption['flags'])
        : {};

    if (categoryId && !seen.has(categoryId)) {
      seen.add(categoryId);
      items.push({
        id: categoryId,
        label: String(node?.name || categoryId),
        desc: String(node?.description || ''),
        flags,
      });
    }

    children.forEach(visit);
  };

  nodes.forEach(visit);
  return items;
}

const PRICING_MODELS = [
  { id: 'quote', label: 'Quote required' },
  { id: 'fixed', label: 'Fixed price' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'daily', label: 'Daily' },
  { id: 'distance', label: 'Distance based' },
  { id: 'subscription', label: 'Subscription' },
];

const ASSESSMENT_MODES = [
  { id: 'none', label: 'No assessment needed' },
  { id: 'remote_video', label: 'Remote assessment (video call)' },
  { id: 'onsite_free', label: 'Onsite assessment (free)' },
  { id: 'onsite_paid', label: 'Onsite assessment (paid)' },
  { id: 'onsite_paid_credited', label: 'Onsite assessment (paid, credited if hired)' },
];

const TOOL_OPTIONS = [
  'Electrical safety PPE',
  'Multimeter and clamp meter',
  'Insulation resistance tester',
  'EVSE/charger test kit',
  'Networking tools',
  'OCPP knowledge',
  'Mobile diagnostic tools',
  'Vehicle lifting tools',
];

const PROVIDER_DOC_TYPES = [
  'Business Registration',
  'Tax Certificate/VAT',
  'National ID/Passport',
  'Proof of Address',
  'Professional License',
  'Public Liability Insurance',
  'Safety/Compliance Certificate',
  'Training/Academic Certificate',
  'Brand Authorization',
  'Other',
];

const PAYOUT_METHODS = [
  {
    value: 'bank_account',
    label: 'Bank account',
    icon: '🏦',
    helper: 'Local or international bank settlement.',
  },
  {
    value: 'mobile_money',
    label: 'Mobile money',
    icon: '📱',
    helper: 'MTN, Airtel and other wallet providers.',
  },
  {
    value: 'alipay',
    label: 'Alipay',
    icon: '🌐',
    helper: 'For payouts to Mainland China or Hong Kong.',
  },
  {
    value: 'wechat_pay',
    label: 'WeChat Pay (Weixin Pay)',
    icon: '🌐',
    helper: 'For payouts to WeChat wallets.',
  },
  {
    value: 'other_local',
    label: 'Other payout method',
    icon: '📱',
    helper: 'Cheque, local wallet or regional solution.',
  },
];

const PAYOUT_CURRENCIES = ['USD', 'EUR', 'CNY', 'UGX', 'KES', 'TZS', 'ZAR'];

const PAYOUT_RHYTHMS = [
  { value: 'daily', label: 'Daily', helper: 'Payouts generated every business day.' },
  { value: 'weekly', label: 'Weekly', helper: 'Payouts grouped once per week.' },
  { value: 'monthly', label: 'Monthly', helper: 'Payouts grouped at month end.' },
  {
    value: 'on_threshold',
    label: 'When balance reaches a threshold',
    helper: 'We pay out once your balance reaches a minimum amount.',
  },
];

const PAYOUT_METHOD_LABELS = {
  bank_account: 'Bank account',
  mobile_money: 'Mobile money',
  alipay: 'Alipay',
  wechat_pay: 'WeChat Pay',
  other_local: 'Other method',
};

const LEGACY_PAYOUT_METHOD_MAP = {
  bank: 'bank_account',
  mobile: 'mobile_money',
  other: 'other_local',
  wechat: 'wechat_pay',
};

function safeJsonParse<T = any>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

function readStoredDraft<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<T>(window.localStorage.getItem(key));
}

function writeStoredDraft(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function clearStoredDraft(keys: string[]) {
  if (typeof window === 'undefined') return;
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  });
}

function draftMatchesActiveUser(draft: Record<string, unknown> | null, activeUserId: string) {
  if (!draft || typeof draft !== 'object') return false;
  if (!activeUserId) return true;
  const owner = String(draft.owner || draft.email || '').toLowerCase();
  return !owner || owner === activeUserId;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function kebab(v: unknown) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isEmail(v: unknown) {
  const s = String(v || '').trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isExpired(expiry?: string) {
  if (!expiry) return false;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

function isExpiringSoon(expiry?: string, days = 30) {
  if (!expiry) return false;
  const d = new Date(expiry);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function splitPhoneNumber(value: unknown, fallbackCode = DEFAULT_DIAL_CODE) {
  const raw = String(value || '').trim();
  if (!raw) return { code: fallbackCode, number: '' };
  const match = COUNTRY_DIAL_CODES.find((item) => raw.startsWith(item.dial));
  if (match) {
    return { code: match.dial, number: raw.slice(match.dial.length).trim() };
  }
  return { code: fallbackCode, number: raw };
}

function combinePhoneNumber(code: unknown, number: unknown) {
  const safeCode = String(code || '').trim() || DEFAULT_DIAL_CODE;
  const safeNumber = String(number || '').trim();
  return safeNumber ? `${safeCode} ${safeNumber}` : safeCode;
}

function hydratePayoutData(
  basePayout: PayoutForm,
  parsedPayout: Partial<PayoutForm> & Record<string, unknown> = {}
): PayoutForm {
  const result = { ...basePayout, ...parsedPayout };
  const normalizedMethod =
    LEGACY_PAYOUT_METHOD_MAP[result.method] || result.method || basePayout.method;
  result.method = normalizedMethod;

  result.otherProvider = result.otherProvider || result.otherDetails || '';
  result.otherNotes = result.otherNotes || result.otherDescription || '';
  result.mobileCountryCode = result.mobileCountryCode || '+256';
  result.rhythm = result.rhythm || '';
  result.thresholdAmount = String(result.thresholdAmount || '');

  result.alipayRegion = result.alipayRegion || '';
  result.alipayLogin = result.alipayLogin || '';
  result.wechatRegion = result.wechatRegion || '';
  result.wechatId = result.wechatId || '';

  result.bankCountry = result.bankCountry || '';
  result.bankBranch = result.bankBranch || '';
  result.swiftBic = result.swiftBic || '';
  result.iban = result.iban || '';

  result.mobileIdType = result.mobileIdType || '';
  result.mobileIdNumber = result.mobileIdNumber || '';

  result.otherCountry = result.otherCountry || '';
  result.confirmDetails = result.confirmDetails ?? false;
  result.currency = result.currency || '';

  result.notificationsEmail = result.notificationsEmail || '';
  result.notificationsWhatsApp = result.notificationsWhatsApp || '';

  return result;
}

function buildRequiredProviderDocTypes({
  taxpayerType,
  categories = [],
  serviceLines = [],
  categoryMap = {},
}: {
  taxpayerType?: string;
  categories?: string[];
  serviceLines?: ServiceLine[];
  categoryMap?: Record<string, ServiceCategoryOption>;
}) {
  const required = new Set<string>();

  // Core
  required.add('Tax Certificate/VAT');
  required.add('National ID/Passport');
  required.add('Proof of Address');

  if (taxpayerType !== 'individual') required.add('Business Registration');

  const catFlags = new Set();
  const cats = Array.isArray(categories) ? categories : [];
  cats.forEach((id) => {
    const c = categoryMap[id];
    if (c?.flags?.fieldWork) catFlags.add('fieldWork');
    if (c?.flags?.electrical) catFlags.add('electrical');
    if (c?.flags?.regulated) catFlags.add('regulated');
    if (c?.flags?.training) catFlags.add('training');
  });

  const joined = [
    ...cats.map((x) => String(x)),
    ...(Array.isArray(serviceLines) ? serviceLines : []).map((l) =>
      [l?.title, l?.category, l?.pricingModel].filter(Boolean).join(' ')
    ),
  ]
    .join(' | ')
    .toLowerCase();

  const looksRegulated =
    joined.includes('battery') ||
    joined.includes('bms') ||
    joined.includes('charger') ||
    joined.includes('charging') ||
    joined.includes('high voltage') ||
    joined.includes('evse');

  const fieldWorkLikely = catFlags.has('fieldWork');

  if (fieldWorkLikely || looksRegulated || catFlags.has('electrical')) {
    required.add('Professional License');
    required.add('Public Liability Insurance');
    required.add('Safety/Compliance Certificate');
  }

  if (catFlags.has('training')) {
    required.add('Training/Academic Certificate');
  }

  return Array.from(required);
}

function formatCategoryLabel(id: string, categoryMap: Record<string, ServiceCategoryOption>) {
  const c = categoryMap[id];
  return c ? c.label : id;
}

const IconShell = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="span"
    className="inline-flex items-center justify-center"
    sx={{ fontSize: '0.9rem', lineHeight: 1 }}
  >
    {children}
  </Box>
);

const IconSparkles = () => <IconShell>✨</IconShell>;
const IconShield = () => <IconShell>🛡️</IconShell>;
const IconClock = () => <IconShell>⏱</IconShell>;
const IconCheck = () => <IconShell>✅</IconShell>;
const IconWarn = () => <IconShell>⚠️</IconShell>;

function StatusChip({ s }: { s?: string }) {
  const { t } = useLocalization();
  const map: Record<string, string> = {
    DRAFT: t('Draft'),
    SUBMITTED: t('Submitted'),
    APPROVED: t('Approved'),
    REJECTED: t('Rejected'),
  };
  const label = (s ? map[s] : undefined) || s || 'N/A';
  const cls =
    s === 'APPROVED'
      ? 'chip chip-ok'
      : s === 'SUBMITTED'
        ? 'chip chip-info'
        : s === 'REJECTED'
          ? 'chip chip-bad'
          : 'chip chip-neutral';
  return <span className={cls}>{label}</span>;
}

const Req = ({ ok }: { ok: boolean }) => {
  const { t } = useLocalization();
  return (
    <span
      className={`ml-2 rounded-full px-1.5 py-[1px] text-[10px] font-bold ${
        ok ? 'bg-[#e8fff7] text-[var(--ev-green)]' : 'bg-red-50 text-red-600'
      }`}
    >
      {ok ? t('OK') : t('REQ')}
    </span>
  );
};

function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const tone = toast.tone || 'info';
  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div className="toast-title">
        <span className="toast-icon" aria-hidden>
          {tone === 'success' ? '✅' : tone === 'error' ? '⚠️' : 'ℹ️'}
        </span>
        <div className="min-w-0">
          <div className="toast-head">{toast.title}</div>
          {toast.message ? <div className="toast-msg">{toast.message}</div> : null}
        </div>
      </div>
      <button className="toast-x" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
  lastSaved,
  right,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  lastSaved?: string;
  right?: React.ReactNode;
}) {
  const { t } = useLocalization();
  return (
    <div className="onboard-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--ev-text)] flex items-center gap-2">
            {title}
          </div>
          {sub ? <div className="text-xs text-[var(--ev-subtle)] mt-0.5">{sub}</div> : null}
        </div>
        <div className="flex items-center gap-3">
          {right}
          <div className="text-[11px] text-[var(--ev-muted)] whitespace-nowrap">
            {t('Autosaved at')} {lastSaved || 'N/A'}
          </div>
        </div>
        <button type="button" className="btn-primary" disabled={disabled} onClick={addLine}>
          {t('Add service line')}
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  required = false,
  helper,
  error,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-[var(--ev-subtle)]">
          {label}
          {required ? <span className="ml-1 text-red-600 font-bold">*</span> : null}
        </div>
        {error ? <span className="text-[11px] font-bold text-red-600">{error}</span> : null}
      </div>
      {children}
      {helper ? <div className="text-[11px] text-[var(--ev-muted)]">{helper}</div> : null}
    </div>
  );
}

function CountryCodeAutocomplete({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (nextCode: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useLocalization();
  const selected = COUNTRY_DIAL_OPTIONS.find((option) => option.value === value);

  return (
    <Autocomplete
      options={COUNTRY_DIAL_OPTIONS}
      value={selected}
      onChange={(_, option) => onChange(option?.value || '')}
      getOptionLabel={(option) => option.label}
      filterOptions={(options, state) => {
        const q = state.inputValue.trim().toLowerCase();
        if (!q) return options;
        return options.filter((option) => option.search.includes(q));
      }}
      isOptionEqualToValue={(option, current) => option.value === current.value}
      autoHighlight
      disableClearable
      disabled={disabled}
      renderInput={(params) => (
        <TextField {...params} label={label || t('Country code')} size="small" fullWidth />
      )}
    />
  );
}

function ChipButton({
  active,
  children,
  onClick,
  disabled = false,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`chipbtn ${active ? 'chipbtn-on' : 'chipbtn-off'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

function AvailabilityPresetBar({
  onApply,
  disabled,
}: {
  onApply: (preset: string) => void;
  disabled?: boolean;
}) {
  const { t } = useLocalization();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-ghost"
        disabled={disabled}
        onClick={() => onApply('weekdays')}
      >
        {t('Weekdays')}
      </button>
      <button
        type="button"
        className="btn-ghost"
        disabled={disabled}
        onClick={() => onApply('weekdays_weekend')}
      >
        {t('Weekdays + Weekend')}
      </button>
      <button
        type="button"
        className="btn-ghost"
        disabled={disabled}
        onClick={() => onApply('always')}
      >
        {t('24/7')}
      </button>
    </div>
  );
}

function ServiceLinesEditor({
  value,
  onChange,
  disabled,
  defaultCurrency,
  showErrors,
  categoryOptions,
  categoryMap,
}: {
  value: ServiceLine[];
  onChange: (next: ServiceLine[]) => void;
  disabled?: boolean;
  defaultCurrency?: string;
  showErrors?: boolean;
  categoryOptions: ServiceCategoryOption[];
  categoryMap: Record<string, ServiceCategoryOption>;
}) {
  const { t } = useLocalization();
  const lines = Array.isArray(value) ? value : [];

  const addLine = () => {
    if (disabled) return;
    const id = `SL-${Date.now()}-${Math.floor(Math.random() * 999)}`;
    const next = [
      ...lines,
      {
        id,
        title: '',
        category: '',
        pricingModel: 'quote',
        currency: defaultCurrency || '',
        basePrice: '',
        unit: 'job',
        requiresAssessment: false,
        assessmentMode: 'none',
        materialsIncluded: false,
        materialsNotes: '',
        remoteAvailable: true,
        onsiteAvailable: true,
        minLeadTimeHours: '24',
        durationMins: '60',
      },
    ];
    onChange(next);
  };

  const upd = (idx, patch) => {
    if (disabled) return;
    onChange(lines.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const del = (idx) => {
    if (disabled) return;
    onChange(lines.filter((_, i) => i !== idx));
  };

  const currency = (c) => (c ? String(c).toUpperCase() : '');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-black">{t('Service lines')}</div>
          <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
            {t(
              'Add specific services you offer. Buyers can request bookings, quotes, or consultations based on these lines.'
            )}
          </div>
          {showErrors && !lines.length ? (
            <div className="mt-1 text-xs font-semibold text-red-600">
              {t('Add at least one service line.')}
            </div>
          ) : null}
        </div>
        <button type="button" className="btn-primary" disabled={disabled} onClick={addLine}>
          {t('Add service line')}
        </button>
      </div>

      {lines.length ? (
        <div className="grid grid-cols-1 gap-3">
          {lines.map((l, idx) => {
            const pm = l.pricingModel || 'quote';
            const showPrice = pm !== 'quote';
            const showDistance = pm === 'distance';
            const showSubscription = pm === 'subscription';
            const titleMissing = showErrors && !String(l?.title || '').trim();
            const categoryMissing = showErrors && !String(l?.category || '').trim();
            const priceMissing = showErrors && showPrice && !String(l?.basePrice || '').trim();
            return (
              <div key={l.id || idx} className="card-mini">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate">{l.title || t('New service')}</div>
                    <div className="text-xs text-[var(--ev-subtle)]">
                      {l.category ? t(formatCategoryLabel(l.category, categoryMap)) : t('Pick a category')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={disabled}
                    onClick={() => del(idx)}
                  >
                    {t('Remove')}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={t('Service title')}
                    required
                    error={titleMissing ? t('Required') : null}
                  >
                    <input
                      value={l.title || ''}
                      onChange={(e) => upd(idx, { title: e.target.value })}
                      className={`input w-full ${titleMissing ? 'input-error' : ''}`}
                      disabled={disabled}
                      placeholder={t('e.g. Home EV charger installation')}
                    />
                  </Field>

                  <Field
                    label={t('Category')}
                    required
                    error={categoryMissing ? t('Required') : null}
                  >
                    <select
                      value={l.category || ''}
                      onChange={(e) => upd(idx, { category: e.target.value })}
                      className={`input w-full ${categoryMissing ? 'input-error' : ''}`}
                      disabled={disabled}
                    >
                      <option value="">{t('Select')}</option>
                      {categoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {t(c.label)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('Pricing model')} required>
                    <select
                      value={pm}
                      onChange={(e) => upd(idx, { pricingModel: e.target.value })}
                      className="input w-full"
                      disabled={disabled}
                    >
                      {PRICING_MODELS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {t(p.label)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={t('Currency')}
                    helper={t('If blank, we use your default service currency')}
                  >
                    <input
                      value={currency(l.currency) || ''}
                      onChange={(e) => upd(idx, { currency: currency(e.target.value) })}
                      className="input w-full"
                      disabled={disabled}
                      placeholder={defaultCurrency || 'USD'}
                    />
                  </Field>

                  {showPrice ? (
                    <Field
                      label={t(
                        pm === 'hourly'
                          ? 'Rate per hour'
                          : pm === 'daily'
                            ? 'Rate per day'
                            : pm === 'fixed'
                              ? 'Fixed price'
                              : pm === 'distance'
                                ? 'Rate per km'
                                : 'Base price'
                      )}
                      required
                      error={priceMissing ? t('Required') : null}
                      helper={showDistance ? t('Travel fees can be configured in quote notes') : ''}
                    >
                      <input
                        value={String(l.basePrice || '')}
                        onChange={(e) => upd(idx, { basePrice: e.target.value })}
                        className={`input w-full ${priceMissing ? 'input-error' : ''}`}
                        disabled={disabled}
                        placeholder={t('e.g. 150')}
                      />
                    </Field>
                  ) : (
                    <Field
                      label={t('Pricing')}
                      helper={t('This service will be handled by quotation')}
                    >
                      <div className="text-xs text-[var(--ev-subtle)]">
                        {t(
                          'Buyers request a quote. You can include labor, materials, and travel cost.'
                        )}
                      </div>
                    </Field>
                  )}

                  {showSubscription ? (
                    <Field label={t('Subscription notes')}>
                      <input
                        value={String(l.unit || '')}
                        onChange={(e) => upd(idx, { unit: e.target.value })}
                        className="input w-full"
                        disabled={disabled}
                        placeholder={t('e.g. monthly maintenance')}
                      />
                    </Field>
                  ) : (
                    <Field label={t('Estimated duration (minutes)')}>
                      <select
                        value={String(l.durationMins || '60')}
                        onChange={(e) => upd(idx, { durationMins: e.target.value })}
                        className="input w-full"
                        disabled={disabled}
                      >
                        {['30', '60', '90', '120', '180', '240'].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}

                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                        <input
                          type="checkbox"
                          checked={!!l.remoteAvailable}
                          onChange={(e) => upd(idx, { remoteAvailable: e.target.checked })}
                          disabled={disabled}
                        />
                        {t('Remote possible')}
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                        <input
                          type="checkbox"
                          checked={!!l.onsiteAvailable}
                          onChange={(e) => upd(idx, { onsiteAvailable: e.target.checked })}
                          disabled={disabled}
                        />
                        {t('Onsite possible')}
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                        <input
                          type="checkbox"
                          checked={!!l.requiresAssessment}
                          onChange={(e) => {
                            const next = e.target.checked;
                            upd(idx, {
                              requiresAssessment: next,
                              assessmentMode: next ? l.assessmentMode || 'remote_video' : 'none',
                            });
                          }}
                          disabled={disabled}
                        />
                        {t('Requires assessment')}
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                        <input
                          type="checkbox"
                          checked={!!l.materialsIncluded}
                          onChange={(e) => upd(idx, { materialsIncluded: e.target.checked })}
                          disabled={disabled}
                        />
                        {t('Materials included')}
                      </label>
                    </div>

                    {l.requiresAssessment ? (
                      <div className="mt-2">
                        <Field
                          label={t('Assessment mode')}
                          helper={t(
                            'Use onsite assessment when a quotation needs site inspection, photos, or measurements'
                          )}
                        >
                          <select
                            value={l.assessmentMode || 'remote_video'}
                            onChange={(e) => upd(idx, { assessmentMode: e.target.value })}
                            className="input w-full"
                            disabled={disabled}
                          >
                            {ASSESSMENT_MODES.map((m) => (
                              <option key={m.id} value={m.id}>
                                {t(m.label)}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    ) : null}

                    {l.materialsIncluded ? (
                      <div className="mt-2">
                        <Field
                          label={t('Materials notes')}
                          helper={t(
                            'Example: cables included up to 10m. Additional length billed separately'
                          )}
                        >
                          <textarea
                            rows={2}
                            value={l.materialsNotes || ''}
                            onChange={(e) => upd(idx, { materialsNotes: e.target.value })}
                            className="input w-full"
                            disabled={disabled}
                          />
                        </Field>
                      </div>
                    ) : null}

                    <div className="mt-2">
                      <Field
                        label={t('Minimum lead time (hours)')}
                        helper={t('How soon you can take the next job')}
                      >
                        <select
                          value={String(l.minLeadTimeHours || '24')}
                          onChange={(e) => upd(idx, { minLeadTimeHours: e.target.value })}
                          className="input w-full"
                          disabled={disabled}
                        >
                          {['0', '2', '4', '8', '12', '24', '48', '72'].map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-mini">
          <div className="text-sm font-black">{t('No service lines yet')}</div>
          <div className="mt-1 text-xs text-[var(--ev-subtle)]">
            {t('Add at least one service line so buyers can discover and request your services.')}
          </div>
        </div>
      )}
    </div>
  );
}

function DocsManager({
  docs,
  onAdd,
  onUpd,
  onDel,
  locked,
  docTypes = PROVIDER_DOC_TYPES,
  requiredTypes = [],
}: {
  docs: ProviderDoc[];
  onAdd: (doc: ProviderDoc) => void;
  onUpd: (index: number, patch: Partial<ProviderDoc>) => void;
  onDel: (index: number) => void;
  locked?: boolean;
  docTypes?: string[];
  requiredTypes?: string[];
}) {
  const { t } = useLocalization();

  const [type, setType] = useState(docTypes[0] || 'Business Registration');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [docError, setDocError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dzRef = useRef<HTMLDivElement | null>(null);

  const allow = useCallback((f: File) => {
    const okType =
      f.type.startsWith('image/') || f.type === 'application/pdf' || /\.(doc|docx)$/i.test(f.name);
    const okSize = f.size <= MAX_FILE_SIZE;
    return okType && okSize ? null : !okType ? 'Unsupported type' : 'Too large';
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      const arr = Array.from(fileList || []) as File[];
      let errorMsg = '';
      arr.forEach((f: File) => {
        const err = allow(f);
        if (err) {
          errorMsg = `File "${f.name}" skipped: ${err}`;
          return;
        }
        const id = 'DOC-' + (1000 + (docs.length || 0) + Math.floor(Math.random() * 999));
        onAdd({
          id,
          type,
          name: name || f.name,
          file: f.name,
          fileUrl: URL.createObjectURL(f),
          status: 'Uploaded',
          expiry,
        });
      });
      setName('');
      setExpiry('');
      setDocError(errorMsg);
    },
    [allow, docs.length, expiry, name, onAdd, type]
  );

  useEffect(() => {
    const el = dzRef.current;
    if (!el) return;
    const over = (e: DragEvent) => {
      e.preventDefault();
      el.classList.add('drag');
    };
    const leave = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove('drag');
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      el.classList.remove('drag');
      const files = e.dataTransfer?.files;
      if (files) handleFiles(files);
    };
    el.addEventListener('dragover', over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop', drop);
    return () => {
      el.removeEventListener('dragover', over);
      el.removeEventListener('dragleave', leave);
      el.removeEventListener('drop', drop);
    };
  }, [handleFiles]);

  const isMissingType = (docType: string) => {
    if (!requiredTypes.includes(docType)) return false;
    const matches = (docs || []).filter((d) => String(d?.type || '').trim() === docType);
    return matches.length === 0 || matches.every((d) => isExpired(d?.expiry));
  };

  const deleteWithRevoke = (idx: number) => {
    const d = docs[idx];
    if (d?.fileUrl && typeof d.fileUrl === 'string' && d.fileUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(d.fileUrl);
      } catch {
        // ignore
      }
    }
    onDel(idx);
  };

  return (
    <div className="card-mini">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-black">{t('Upload documents')}</div>
          <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
            {t('Accepted: PDF, images, DOC/DOCX. Max size 25MB per file.')}
          </div>
        </div>
        <div className="text-xs text-[var(--ev-subtle)]">
          {requiredTypes.length ? (
            <b>
              {t('Required types')}: {requiredTypes.length}
            </b>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5 text-sm">
        <div className="sm:col-span-2">
          <div className="text-xs text-[var(--ev-subtle)]">{t('Document name')}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input w-full"
            disabled={locked}
            placeholder={t('Optional (defaults to filename)')}
          />
        </div>

        <div>
          <div className="text-xs text-[var(--ev-subtle)]">{t('Type')}</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`input w-full ${isMissingType(type) ? 'border-red-300' : ''}`}
            disabled={locked}
          >
            {docTypes.map((x) => (
              <option key={x} value={x}>
                {t(x)}
                {requiredTypes.includes(x) ? ' *' : ''}
              </option>
            ))}
          </select>
          {isMissingType(type) ? (
            <div className="text-[11px] font-bold text-red-600 mt-1">
              {t('This type is required')}
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-xs text-[var(--ev-subtle)]">{t('Expiry')}</div>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input w-full"
            disabled={locked}
          />
        </div>

        <div>
          <div className="text-xs text-[var(--ev-subtle)]">{t('Upload files')}</div>
          <div
            ref={dzRef}
            className="dz dz-compact"
            aria-label={t('Upload area')}
            style={{
              border: '1.5px dashed rgba(3,205,140,.35)',
              borderRadius: 18,
              padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(3,205,140,.06), rgba(255,255,255,.90))',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(3,205,140,.12)', color: '#047857' }}
                  aria-hidden
                >
                  ⬆️
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{t('Drag and drop')}</div>
                  <div className="text-[11px] text-[var(--ev-subtle)] truncate">
                    {t('or browse files')}
                  </div>
                </div>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  disabled={locked}
                  onChange={(e) => {
                    const f = e.target.files;
                    if (f) handleFiles(f);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary"
                  disabled={locked}
                >
                  {t('Browse')}
                </button>
              </div>
            </div>
            {docError ? (
              <div className="text-[11px] font-bold text-red-600 mt-2">{docError}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F2F2F2] text-gray-700">
            <tr className="text-left">
              <th className="px-3 py-2">{t('Name')}</th>
              <th className="px-3 py-2">{t('Type')}</th>
              <th className="px-3 py-2">{t('File')}</th>
              <th className="px-3 py-2">{t('Expiry')}</th>
              <th className="px-3 py-2">{t('Status')}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(docs || []).map((d, i) => {
              const expired = isExpired(d.expiry);
              const soon = isExpiringSoon(d.expiry, 30);
              const status = d.status || 'Uploaded';

              const chipCls =
                status === 'Verified'
                  ? 'chip chip-ok'
                  : status === 'Submitted'
                    ? 'chip chip-info'
                    : status === 'Rejected'
                      ? 'chip chip-bad'
                      : expired
                        ? 'chip chip-bad'
                        : soon
                          ? 'chip chip-neutral'
                          : 'chip chip-neutral';

              return (
                <tr key={d.id || i} className={i % 2 ? 'bg-white' : 'bg-[#fcfcfc]'}>
                  <td className="px-3 py-2">
                    <div className="font-bold text-[var(--ev-text)]">{d.name}</div>
                    {requiredTypes.includes(d.type) ? (
                      <div className="text-[11px] text-[var(--ev-orange)] font-bold">
                        {t('Required')}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={d.type}
                      onChange={(e) => onUpd(i, { type: e.target.value })}
                      className={`input w-64 ${isMissingType(d.type) ? 'border-red-300' : ''}`}
                      disabled={locked}
                    >
                      {docTypes.map((x) => (
                        <option key={x} value={x}>
                          {t(x)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--ev-subtle)]">{d.file || 'N/A'}</span>
                      {d.fileUrl ? (
                        <a
                          className="underline text-xs font-bold"
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('View')}
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={d.expiry || ''}
                      onChange={(e) => onUpd(i, { expiry: e.target.value })}
                      className="input w-44"
                      disabled={locked}
                    />
                    {expired ? (
                      <div className="text-[11px] font-bold text-red-600 mt-1">{t('Expired')}</div>
                    ) : null}
                    {!expired && soon ? (
                      <div className="text-[11px] font-bold text-amber-700 mt-1">
                        {t('Expiring soon')}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className={chipCls}>{t(status)}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) => onUpd(i, { status: e.target.value })}
                        className="input w-36"
                        disabled={locked}
                      >
                        {['Uploaded', 'Submitted', 'Verified', 'Rejected'].map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteWithRevoke(i)}
                        className="btn-ghost"
                        disabled={locked}
                      >
                        {t('Delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {(docs || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-gray-500">
                  {t('No documents yet.')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayoutTaxStep({
  profile,
  setF,
  isLocked,
  ownerContactName,
  ownerContactEmail,
  showPayoutErrors,
  payoutErrors,
  taxErrors,
}) {
  const { t } = useLocalization();
  const payout = (profile.payout || {}) as PayoutForm;
  const tax = (profile.tax || {}) as TaxForm;

  const updatePayout = (patch: Partial<PayoutForm>) =>
    setF((prev) => ({
      payout: { ...(prev.payout || {}), ...patch },
    }));
  const updateTax = (patch: Partial<TaxForm>) =>
    setF((prev) => ({
      tax: { ...(prev.tax || {}), ...patch },
    }));

  const handleMethodChange = (value) => {
    if (isLocked) return;
    updatePayout({ method: value });
  };

  const payoutUsesAccount = (method) => ['bank_account', 'alipay', 'wechat_pay'].includes(method);

  const renderAccountFields = () => {
    switch (payout.method) {
      case 'bank_account':
        return (
          <Stack spacing={2}>
            <TextField
              label={t('Account holder name')}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={
                showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ''
              }
            />
            <TextField
              label={t('Bank country')}
              fullWidth
              size="small"
              value={payout.bankCountry}
              onChange={(e) => updatePayout({ bankCountry: e.target.value })}
              placeholder={t('e.g. Uganda, Kenya, China')}
              disabled={isLocked}
            />
            <Stack direction="column" spacing={2}>
              <TextField
                label={t('Bank name')}
                fullWidth
                size="small"
                value={payout.bankName}
                onChange={(e) => updatePayout({ bankName: e.target.value })}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.bankName}
                helperText={showPayoutErrors && payoutErrors.bankName ? payoutErrors.bankName : ''}
              />
              <TextField
                label={t('Branch')}
                fullWidth
                size="small"
                value={payout.bankBranch}
                onChange={(e) => updatePayout({ bankBranch: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label={t('Account number / IBAN')}
                fullWidth
                size="small"
                value={payout.accountNo}
                onChange={(e) => updatePayout({ accountNo: e.target.value })}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.accountNo}
                helperText={
                  showPayoutErrors && payoutErrors.accountNo ? payoutErrors.accountNo : ''
                }
              />
              <TextField
                label={t('SWIFT / BIC (optional)')}
                fullWidth
                size="small"
                value={payout.swiftBic}
                onChange={(e) => updatePayout({ swiftBic: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
          </Stack>
        );

      case 'mobile_money':
        return (
          <Stack spacing={2}>
            <TextField
              label={t('Account holder name')}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={
                showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ''
              }
            />
            <Stack direction="column" spacing={2}>
              <TextField
                label={t('Wallet provider')}
                fullWidth
                size="small"
                value={payout.mobileProvider}
                onChange={(e) => updatePayout({ mobileProvider: e.target.value })}
                placeholder={t('e.g. MTN, Airtel')}
                disabled={isLocked}
                error={showPayoutErrors && !!payoutErrors.mobileProvider}
                helperText={
                  showPayoutErrors && payoutErrors.mobileProvider ? payoutErrors.mobileProvider : ''
                }
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Box sx={{ minWidth: 180, width: '100%' }}>
                  <CountryCodeAutocomplete
                    value={payout.mobileCountryCode}
                    onChange={(nextCode) => updatePayout({ mobileCountryCode: nextCode })}
                    disabled={isLocked}
                  />
                </Box>
                <TextField
                  label={t('Wallet / mobile number')}
                  fullWidth
                  size="small"
                  value={payout.mobileNo}
                  onChange={(e) => updatePayout({ mobileNo: e.target.value })}
                  placeholder={t('Do not include leading zeros or spaces')}
                  disabled={isLocked}
                  error={showPayoutErrors && !!payoutErrors.mobileNo}
                  helperText={
                    showPayoutErrors && payoutErrors.mobileNo ? payoutErrors.mobileNo : ''
                  }
                />
              </Stack>
            </Stack>
            <Stack direction="column" spacing={2}>
              <TextField
                label={t('ID type (for KYC)')}
                select
                fullWidth
                size="small"
                value={payout.mobileIdType}
                onChange={(e) => updatePayout({ mobileIdType: e.target.value })}
                disabled={isLocked}
              >
                <MenuItem value="">{t('Select ID type')}</MenuItem>
                <MenuItem value="national_id">{t('National ID')}</MenuItem>
                <MenuItem value="passport">{t('Passport')}</MenuItem>
                <MenuItem value="drivers_license">{t("Driver's License")}</MenuItem>
                <MenuItem value="tax_id">{t('Tax ID')}</MenuItem>
                <MenuItem value="residence_permit">{t('Residence Permit')}</MenuItem>
                <MenuItem value="voter_id">{t('Voter ID')}</MenuItem>
              </TextField>
              <TextField
                label={t('ID number')}
                fullWidth
                size="small"
                value={payout.mobileIdNumber}
                onChange={(e) => updatePayout({ mobileIdNumber: e.target.value })}
                disabled={isLocked}
              />
            </Stack>
          </Stack>
        );

      case 'alipay':
        return (
          <Stack spacing={2}>
            <TextField
              label={t('Account holder name')}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={
                showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ''
              }
            />
            <TextField
              select
              label={t('Alipay region')}
              fullWidth
              size="small"
              value={payout.alipayRegion}
              onChange={(e) => updatePayout({ alipayRegion: e.target.value })}
              disabled={isLocked}
            >
              <MenuItem value="mainland">{t('Mainland China')}</MenuItem>
              <MenuItem value="hong_kong">{t('Hong Kong SAR')}</MenuItem>
              <MenuItem value="other">{t('Other region')}</MenuItem>
            </TextField>
            <TextField
              label={t('Alipay login (phone or email)')}
              fullWidth
              size="small"
              value={payout.alipayLogin}
              onChange={(e) => updatePayout({ alipayLogin: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.alipayLogin}
              helperText={
                showPayoutErrors && payoutErrors.alipayLogin ? payoutErrors.alipayLogin : ''
              }
            />
            <TextField
              label={t('Alipay account ID (optional)')}
              fullWidth
              size="small"
              value={payout.accountNo}
              onChange={(e) => updatePayout({ accountNo: e.target.value })}
              disabled={isLocked}
            />
          </Stack>
        );

      case 'wechat_pay':
        return (
          <Stack spacing={2}>
            <TextField
              label={t('Account holder name')}
              fullWidth
              size="small"
              value={payout.accountName}
              onChange={(e) => updatePayout({ accountName: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.accountName}
              helperText={
                showPayoutErrors && payoutErrors.accountName ? payoutErrors.accountName : ''
              }
            />
            <TextField
              select
              label={t('WeChat region')}
              fullWidth
              size="small"
              value={payout.wechatRegion}
              onChange={(e) => updatePayout({ wechatRegion: e.target.value })}
              disabled={isLocked}
            >
              <MenuItem value="mainland">{t('Mainland China')}</MenuItem>
              <MenuItem value="hong_kong">{t('Hong Kong SAR')}</MenuItem>
              <MenuItem value="other">{t('Other region')}</MenuItem>
            </TextField>
            <TextField
              label={t('WeChat ID')}
              fullWidth
              size="small"
              value={payout.wechatId}
              onChange={(e) => updatePayout({ wechatId: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.wechatId}
              helperText={showPayoutErrors && payoutErrors.wechatId ? payoutErrors.wechatId : ''}
            />
            {(() => {
              const wechatPhoneParts = splitPhoneNumber(payout.accountNo);
              const wechatPhoneError = showPayoutErrors && payoutErrors.accountNo;
              return (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Box sx={{ minWidth: 180, width: '100%' }}>
                    <CountryCodeAutocomplete
                      value={wechatPhoneParts.code}
                      onChange={(nextCode) =>
                        updatePayout({
                          accountNo: combinePhoneNumber(nextCode, wechatPhoneParts.number),
                        })
                      }
                      disabled={isLocked}
                    />
                  </Box>
                  <TextField
                    label={t('Linked phone number')}
                    fullWidth
                    size="small"
                    value={wechatPhoneParts.number}
                    onChange={(e) =>
                      updatePayout({
                        accountNo: combinePhoneNumber(wechatPhoneParts.code, e.target.value),
                      })
                    }
                    disabled={isLocked}
                    placeholder={t('700 000 000')}
                    error={!!wechatPhoneError}
                    helperText={wechatPhoneError ? payoutErrors.accountNo : ''}
                  />
                </Stack>
              );
            })()}
          </Stack>
        );

      case 'other_local':
      default:
        return (
          <Stack spacing={2}>
            <TextField
              label={t('Payout method name')}
              fullWidth
              size="small"
              value={payout.otherMethod}
              onChange={(e) => updatePayout({ otherMethod: e.target.value })}
              placeholder={t('e.g. Payoneer, Flutterwave, local wallet')}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.otherMethod}
              helperText={
                showPayoutErrors && payoutErrors.otherMethod ? payoutErrors.otherMethod : ''
              }
            />
            <TextField
              label={t('Provider / bank')}
              fullWidth
              size="small"
              value={payout.otherProvider}
              onChange={(e) => updatePayout({ otherProvider: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!payoutErrors.otherProvider}
              helperText={
                showPayoutErrors && payoutErrors.otherProvider ? payoutErrors.otherProvider : ''
              }
            />
            <TextField
              label={t('Country or region')}
              fullWidth
              size="small"
              value={payout.otherCountry}
              onChange={(e) => updatePayout({ otherCountry: e.target.value })}
              disabled={isLocked}
            />
            <TextField
              label={t('Account or reference ID')}
              fullWidth
              size="small"
              value={payout.accountNo}
              onChange={(e) => updatePayout({ accountNo: e.target.value })}
              disabled={isLocked}
            />
            <TextField
              label={t('Additional payout instructions (optional)')}
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={payout.otherNotes}
              onChange={(e) => updatePayout({ otherNotes: e.target.value })}
              disabled={isLocked}
            />
          </Stack>
        );
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <Box className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${EV_COLORS.border}`,
            backgroundColor: EV_COLORS.surface,
            p: 3,
          }}
        >
          <Box className="flex items-center justify-between mb-2">
            <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 800 }}>
              {t('Payout method')}
            </Typography>
            <IconShield />
          </Box>
          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
            {t(
              'Choose how you would like to receive payouts from EVzone services, consultations and tips.'
            )}
          </Typography>

          <Stack spacing={1.2}>
            {PAYOUT_METHODS.map((method) => {
              const selected = payout.method === method.value;
              return (
                <Paper
                  key={method.value}
                  onClick={() => handleMethodChange(method.value)}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: selected
                      ? `2px solid ${EV_COLORS.primary}`
                      : `1px solid ${EV_COLORS.border}`,
                    backgroundColor: selected ? EV_COLORS.primarySoft : EV_COLORS.surfaceAlt,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    px: 1,
                  }}
                >
                  <Box className="flex items-center gap-2 px-2 py-1.5">
                    <Radio
                      checked={selected}
                      onChange={() => handleMethodChange(method.value)}
                      value={method.value}
                      size="small"
                      disabled={isLocked}
                    />
                    <span
                      aria-hidden
                      style={{ width: 22, display: 'inline-flex', justifyContent: 'center' }}
                    >
                      {method.icon}
                    </span>
                    <Box className="flex flex-col flex-1 min-w-0">
                      <Typography
                        variant="body2"
                        sx={{ color: EV_COLORS.textMain, fontWeight: selected ? 800 : 600 }}
                      >
                        {t(method.label)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: EV_COLORS.textSubtle,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {t(method.helper)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 1, fontWeight: 700 }}>
            {t('Payout currency')}
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            placeholder={t('Choose currency')}
            value={payout.currency}
            onChange={(e) => updatePayout({ currency: e.target.value })}
            disabled={isLocked}
            error={showPayoutErrors && !!payoutErrors.currency}
            helperText={showPayoutErrors && payoutErrors.currency ? payoutErrors.currency : ''}
          >
            <MenuItem value="">
              <em>{t('Choose currency')}</em>
            </MenuItem>
            {PAYOUT_CURRENCIES.map((cur) => (
              <MenuItem key={cur} value={cur}>
                {cur}
              </MenuItem>
            ))}
          </TextField>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 1, fontWeight: 700 }}>
            {t('Payout notifications')}
          </Typography>
          <Stack spacing={1.6}>
            <TextField
              label={t('Notification email')}
              fullWidth
              size="small"
              value={payout.notificationsEmail}
              onChange={(e) => updatePayout({ notificationsEmail: e.target.value })}
              disabled={isLocked}
              placeholder={ownerContactEmail || ''}
            />
            {(() => {
              const notifWhatsAppParts = splitPhoneNumber(payout.notificationsWhatsApp);
              return (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Box sx={{ minWidth: 180, width: '100%' }}>
                    <CountryCodeAutocomplete
                      value={notifWhatsAppParts.code}
                      onChange={(nextCode) =>
                        updatePayout({
                          notificationsWhatsApp: combinePhoneNumber(
                            nextCode,
                            notifWhatsAppParts.number
                          ),
                        })
                      }
                      disabled={isLocked}
                    />
                  </Box>
                  <TextField
                    label={t('Notification WhatsApp (optional)')}
                    fullWidth
                    size="small"
                    value={notifWhatsAppParts.number}
                    onChange={(e) =>
                      updatePayout({
                        notificationsWhatsApp: combinePhoneNumber(
                          notifWhatsAppParts.code,
                          e.target.value
                        ),
                      })
                    }
                    disabled={isLocked}
                    placeholder={t('700 000 000')}
                  />
                </Stack>
              );
            })()}
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px solid ${EV_COLORS.border}`,
            backgroundColor: EV_COLORS.surface,
            p: 3,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ color: EV_COLORS.textMain, fontWeight: 800, mb: 1 }}
          >
            {t('Account details')}
          </Typography>

          <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2 }}>
            {t('Provide payout account information for the selected payout method.')}
          </Typography>

          <Stack spacing={2}>{renderAccountFields()}</Stack>

          <Box className="mt-3">
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!payout.confirmDetails}
                  onChange={(e) => updatePayout({ confirmDetails: e.target.checked })}
                  size="small"
                  disabled={isLocked}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: EV_COLORS.textSubtle, fontWeight: 700 }}>
                  {t('I confirm that the payout details provided are correct.')}
                </Typography>
              }
            />
            {showPayoutErrors && payoutErrors.confirmDetails ? (
              <div className="mt-1 text-xs font-semibold text-red-600">
                {payoutErrors.confirmDetails}
              </div>
            ) : null}
          </Box>

          {payoutUsesAccount(payout.method) ? (
            <Typography variant="caption" sx={{ color: EV_COLORS.textMuted }}>
              {t('Tip: Use the exact account holder name to reduce payout failures.')}
            </Typography>
          ) : null}
        </Paper>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${EV_COLORS.border}`,
          backgroundColor: EV_COLORS.surface,
          p: 3,
        }}
      >
        <Box className="flex items-center gap-1 mb-1">
          <IconClock />
          <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 800 }}>
            {t('Payout rhythm')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              ml: 1,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              border: `1px solid ${EV_COLORS.border}`,
              color: EV_COLORS.textSubtle,
              backgroundColor: EV_COLORS.surfaceAlt,
              fontWeight: 800,
            }}
          >
            {t('Optional')}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2, maxWidth: 760 }}>
          {t(
            'Payouts are grouped by settlement schedule. Depending on your region, you may receive payouts daily, weekly, monthly or by threshold.'
          )}
        </Typography>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
        >
          {PAYOUT_RHYTHMS.map((rhythm) => {
            const selected = payout.rhythm === rhythm.value;
            return (
              <Paper
                key={rhythm.value}
                elevation={0}
                onClick={() => {
                  if (isLocked) return;
                  updatePayout({ rhythm: rhythm.value });
                }}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  border: selected
                    ? `2px solid ${EV_COLORS.primary}`
                    : `1px solid ${EV_COLORS.border}`,
                  backgroundColor: selected ? EV_COLORS.primarySoft : EV_COLORS.surfaceAlt,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  p: 2,
                }}
              >
                <Box className="flex items-center gap-1 mb-0.5">
                  <Radio
                    checked={selected}
                    size="small"
                    onChange={() => {
                      if (isLocked) return;
                      updatePayout({ rhythm: rhythm.value });
                    }}
                    disabled={isLocked}
                  />
                  <Typography
                    variant="body2"
                    sx={{ color: EV_COLORS.textMain, fontWeight: selected ? 800 : 600 }}
                  >
                    {t(rhythm.label)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: EV_COLORS.textSubtle }}>
                  {t(rhythm.helper)}
                </Typography>
              </Paper>
            );
          })}
        </Stack>

        {payout.rhythm === 'on_threshold' ? (
          <Box className="mt-3" sx={{ maxWidth: 420 }}>
            <TextField
              label={t('Threshold amount')}
              fullWidth
              size="small"
              value={payout.thresholdAmount || ''}
              onChange={(e) => updatePayout({ thresholdAmount: e.target.value })}
              disabled={isLocked}
              placeholder={t('e.g. 100')}
            />
          </Box>
        ) : null}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${EV_COLORS.border}`,
          backgroundColor: EV_COLORS.surface,
          p: 3,
        }}
      >
        <Box className="flex items-center gap-1 mb-1">
          <IconShield />
          <Typography variant="subtitle1" sx={{ color: EV_COLORS.textMain, fontWeight: 800 }}>
            {t('Tax information')}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: EV_COLORS.textSubtle, mb: 2, maxWidth: 820 }}>
          {t(
            'We use these details for invoicing, reporting and to comply with local tax regulations.'
          )}
        </Typography>

        <Stack spacing={2}>
          <TextField
            select
            label={t('Provider type')}
            fullWidth
            size="small"
            value={tax.taxpayerType || 'business'}
            onChange={(e) => updateTax({ taxpayerType: e.target.value })}
            disabled={isLocked}
          >
            <MenuItem value="business">{t('Business / company')}</MenuItem>
            <MenuItem value="individual">{t('Individual')}</MenuItem>
          </TextField>

          <TextField
            label={t('Legal name (as on tax registration)')}
            fullWidth
            size="small"
            value={tax.legalName}
            onChange={(e) => updateTax({ legalName: e.target.value })}
            disabled={isLocked}
            error={showPayoutErrors && !!taxErrors.legalName}
            helperText={showPayoutErrors && taxErrors.legalName ? taxErrors.legalName : ''}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('Tax country / region')}
              fullWidth
              size="small"
              value={tax.taxCountry}
              onChange={(e) => updateTax({ taxCountry: e.target.value })}
              placeholder={t('e.g. Uganda, Kenya, China')}
              disabled={isLocked}
              error={showPayoutErrors && !!taxErrors.taxCountry}
              helperText={showPayoutErrors && taxErrors.taxCountry ? taxErrors.taxCountry : ''}
            />
            <TextField
              label={t('Tax ID / TIN')}
              fullWidth
              size="small"
              value={tax.taxId}
              onChange={(e) => updateTax({ taxId: e.target.value })}
              disabled={isLocked}
              error={showPayoutErrors && !!taxErrors.taxId}
              helperText={showPayoutErrors && taxErrors.taxId ? taxErrors.taxId : ''}
            />
          </Stack>

          <TextField
            label={t('VAT / GST number (optional)')}
            fullWidth
            size="small"
            value={tax.vatNumber}
            onChange={(e) => updateTax({ vatNumber: e.target.value })}
            disabled={isLocked}
          />

          <TextField
            label={t('Legal address')}
            fullWidth
            size="small"
            value={tax.legalAddress}
            onChange={(e) => updateTax({ legalAddress: e.target.value })}
            disabled={isLocked}
            placeholder={t('Street, city, country')}
          />

          <Divider />

          <Box className="flex items-center justify-between gap-2">
            <Typography variant="subtitle2" sx={{ color: EV_COLORS.textMain, fontWeight: 800 }}>
              {t('Tax contact')}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!tax.contactSameAsOwner}
                  onChange={(e) =>
                    updateTax({
                      contactSameAsOwner: e.target.checked,
                      contact: e.target.checked ? ownerContactName : tax.contact,
                      contactEmail: e.target.checked ? ownerContactEmail : tax.contactEmail,
                    })
                  }
                  size="small"
                  disabled={isLocked}
                />
              }
              label={
                <Typography variant="caption" sx={{ color: EV_COLORS.textSubtle, fontWeight: 700 }}>
                  {t('Same as owner')}
                </Typography>
              }
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('Contact person')}
              fullWidth
              size="small"
              value={tax.contact}
              onChange={(e) => updateTax({ contact: e.target.value })}
              disabled={isLocked || !!tax.contactSameAsOwner}
              placeholder={ownerContactName || ''}
            />
            <TextField
              label={t('Contact email')}
              fullWidth
              size="small"
              value={tax.contactEmail}
              onChange={(e) => updateTax({ contactEmail: e.target.value })}
              disabled={isLocked || !!tax.contactSameAsOwner}
              placeholder={ownerContactEmail || ''}
              error={showPayoutErrors && !!taxErrors.contactEmail}
              helperText={showPayoutErrors && taxErrors.contactEmail ? taxErrors.contactEmail : ''}
            />
          </Stack>

          <Typography variant="caption" sx={{ color: EV_COLORS.textMuted, mt: 0.5 }}>
            {t(
              'By continuing, you confirm that the information provided here is accurate and up to date.'
            )}
          </Typography>
        </Stack>
      </Paper>
    </div>
  );
}

export default function ProviderOnboardingProV4_JS() {
  const { t, language, setLanguage } = useLocalization();
  const { resolvedMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const serviceTaxonomy = useProviderServiceTaxonomy();
  const sessionUser = useSession();

  const [ui, setUi] = useState<{ step: number }>(() => {
    return {
      step: 1,
    };
  });

  const activeUserId = useMemo(() => {
    const val = sessionUser?.userId || sessionUser?.email || sessionUser?.phone || '';
    return String(val || '').toLowerCase();
  }, [sessionUser]);

  const serviceCategories = useMemo<ServiceCategoryOption[]>(
    () => collectServiceCategories(serviceTaxonomy),
    [serviceTaxonomy]
  );
  const serviceCategoryMap = useMemo<Record<string, ServiceCategoryOption>>(
    () => Object.fromEntries(serviceCategories.map((entry) => [entry.id, entry])),
    [serviceCategories]
  );

  const createEmptyProfile = useCallback(
    (): ProviderProfile => ({
      owner: activeUserId,
      status: 'DRAFT',

      // Step 1: Profile
      providerType: 'business', // business | individual
      displayName: '',
      legalName: '',
      email: '',
      phone: '',
      website: '',
      about: '',
      brandColor: BRAND.green,
      logoUrl: '',
      coverUrl: '',
      support: { whatsapp: '', email: '', phone: '' },
      hq: { country: '', city: '', address1: '', address2: '' },

      // Step 2: Services & Pricing
      categories: [],
      otherCategory: '',
      languages: ['en'],
      serviceCurrency: 'USD',
      serviceLines: [],
      team: {
        teamSize: '1',
        yearsExperience: '1',
        tools: [],
        notes: '',
      },
      servicePolicies: {
        responseSlaHours: '4',
        cancellationWindowHours: '24',
        serviceWarrantyDays: '30',
        afterServiceSupportDays: '7',
        disputeNotes: '',
      },

      // Step 3: Coverage & Availability
      regions: ['UG'],
      coverage: {
        cities: '',
        travelRadiusKm: '50',
        onsiteAvailable: true,
        remoteAvailable: true,
        coverageNotes: '',
        bookingLink: '',
        leadTimeHours: '24',
        emergencyAvailable: false,
      },
      availability: {
        timezone: 'Africa/Kampala',
        days: {
          mon: { open: '08:00', close: '17:00', closed: false },
          tue: { open: '08:00', close: '17:00', closed: false },
          wed: { open: '08:00', close: '17:00', closed: false },
          thu: { open: '08:00', close: '17:00', closed: false },
          fri: { open: '08:00', close: '17:00', closed: false },
          sat: { open: '09:00', close: '14:00', closed: true },
          sun: { open: '09:00', close: '14:00', closed: true },
        },
      },

      // Step 4: Docs
      docs: { list: [] },

      // Step 5: Payout & Tax
      payout: {
        method: 'bank_account',
        currency: '',
        rhythm: '',
        thresholdAmount: '',

        bankName: '',
        bankCountry: '',
        bankBranch: '',
        accountName: '',
        accountNo: '',
        swiftBic: '',
        iban: '',

        mobileProvider: '',
        mobileCountryCode: '+256',
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
      },
      tax: {
        taxpayerType: 'business',
        legalName: '',
        taxCountry: '',
        taxId: '',
        vatNumber: '',
        legalAddress: '',
        contact: '',
        contactEmail: '',
        contactSameAsOwner: false,
      },

      // Step 6: Legal
      acceptance: {
        providerTerms: false,
        servicePolicy: false,
        dataProcessing: false,
        qualityStandards: false,
      },
    }),
    [activeUserId]
  );

  const [profile, setProfile] = useState<ProviderProfile>(() => createEmptyProfile());
  const [lastSaved, setLastSaved] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const saveReadyRef = useRef(false);

  const setF = (
    patch:
      | Partial<ProviderProfile>
      | ((prev: ProviderProfile) => Partial<ProviderProfile> | null | undefined)
  ) =>
    setProfile((prev) => {
      const nextPatch = typeof patch === 'function' ? patch(prev) : patch;
      if (!nextPatch) return prev;
      const next = { ...prev, ...nextPatch };
      return next;
    });

  const [review, setReview] = useState(() => {
    return { submittedAt: null, inReviewAt: null, approvedAt: null, slaHours: 48 };
  });

  useEffect(() => {
    if (profile.status === 'SUBMITTED' && location.pathname === '/provider/onboarding') {
      navigate('/provider/onboarding', { replace: true });
    }
  }, [profile.status, navigate, location.pathname]);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;

    const hydrate = async () => {
      try {
        const storedProfile = readStoredDraft<Record<string, unknown>>(STORAGE.form);
        const storedUi = readStoredDraft<{ step?: number }>(STORAGE.ui);
        const storedReview = readStoredDraft<Record<string, unknown>>(STORAGE.review);
        const [payload, accountApproval] = await Promise.all([
          sellerBackendApi.getWorkflowScreenState('provider-onboarding').catch(() => null),
          sellerBackendApi.getAccountApproval().catch(() => null),
        ]);
        if (cancelled) return;
        const sourcePayload =
          payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

        const nextProfile =
          sourcePayload.form && typeof sourcePayload.form === 'object'
            ? (sourcePayload.form as Partial<ProviderProfile>)
            : null;
        const nextUi =
          sourcePayload.ui && typeof sourcePayload.ui === 'object'
            ? (sourcePayload.ui as { step?: number })
            : null;
        const nextReview =
          sourcePayload.review && typeof sourcePayload.review === 'object'
            ? sourcePayload.review
            : null;
        const approvalPayload =
          accountApproval && typeof accountApproval === 'object'
            ? (accountApproval as Record<string, unknown>)
            : null;

        if (nextProfile) {
          const base = createEmptyProfile();
          const owner = String(nextProfile.owner || nextProfile.email || '').toLowerCase();
          if (!activeUserId || !owner || owner === activeUserId) {
            const mergedBackendProfile = {
              ...base,
              ...nextProfile,
              owner: activeUserId || owner || base.owner,
              support: { ...base.support, ...(nextProfile.support || {}) },
              hq: { ...base.hq, ...(nextProfile.hq || {}) },
              team: { ...base.team, ...(nextProfile.team || {}) },
              servicePolicies: { ...base.servicePolicies, ...(nextProfile.servicePolicies || {}) },
              coverage: { ...base.coverage, ...(nextProfile.coverage || {}) },
              availability: { ...base.availability, ...(nextProfile.availability || {}) },
              docs: { list: Array.isArray(nextProfile?.docs?.list) ? nextProfile.docs.list : base.docs.list },
              payout: hydratePayoutData(base.payout, nextProfile.payout || {}),
              tax: { ...base.tax, ...(nextProfile.tax || {}) },
              acceptance: { ...base.acceptance, ...(nextProfile.acceptance || {}) },
            };
            const resolvedProfile = draftMatchesActiveUser(storedProfile, activeUserId)
              ? {
                  ...mergedBackendProfile,
                  ...(storedProfile as object),
                  owner:
                    activeUserId ||
                    String((storedProfile as Record<string, unknown>).owner || mergedBackendProfile.owner || ''),
                  support: {
                    ...mergedBackendProfile.support,
                    ...(((storedProfile as Record<string, unknown>).support as object) || {}),
                  },
                  hq: {
                    ...mergedBackendProfile.hq,
                    ...(((storedProfile as Record<string, unknown>).hq as object) || {}),
                  },
                  team: {
                    ...mergedBackendProfile.team,
                    ...(((storedProfile as Record<string, unknown>).team as object) || {}),
                  },
                  servicePolicies: {
                    ...mergedBackendProfile.servicePolicies,
                    ...(((storedProfile as Record<string, unknown>).servicePolicies as object) || {}),
                  },
                  coverage: {
                    ...mergedBackendProfile.coverage,
                    ...(((storedProfile as Record<string, unknown>).coverage as object) || {}),
                  },
                  availability: {
                    ...mergedBackendProfile.availability,
                    ...(((storedProfile as Record<string, unknown>).availability as object) || {}),
                  },
                  docs: {
                    list: Array.isArray(
                      ((storedProfile as Record<string, unknown>).docs as { list?: unknown[] } | undefined)?.list
                    )
                      ? ((((storedProfile as Record<string, unknown>).docs as { list?: unknown[] }).list ??
                          []) as typeof mergedBackendProfile.docs.list)
                      : mergedBackendProfile.docs.list,
                  },
                  payout: hydratePayoutData(
                    mergedBackendProfile.payout,
                    (((storedProfile as Record<string, unknown>).payout as object) || {}) as Partial<
                      typeof mergedBackendProfile.payout
                    >
                  ),
                  tax: {
                    ...mergedBackendProfile.tax,
                    ...(((storedProfile as Record<string, unknown>).tax as object) || {}),
                  },
                  acceptance: {
                    ...mergedBackendProfile.acceptance,
                    ...(((storedProfile as Record<string, unknown>).acceptance as object) || {}),
                  },
                }
              : mergedBackendProfile;
            setProfile(resolvedProfile);
          }
        } else if (draftMatchesActiveUser(storedProfile, activeUserId)) {
          const base = createEmptyProfile();
          setProfile({
            ...base,
            ...(storedProfile as object),
            owner:
              activeUserId ||
              String((storedProfile as Record<string, unknown>).owner || base.owner || ''),
            support: { ...base.support, ...(((storedProfile as Record<string, unknown>).support as object) || {}) },
            hq: { ...base.hq, ...(((storedProfile as Record<string, unknown>).hq as object) || {}) },
            team: { ...base.team, ...(((storedProfile as Record<string, unknown>).team as object) || {}) },
            servicePolicies: {
              ...base.servicePolicies,
              ...(((storedProfile as Record<string, unknown>).servicePolicies as object) || {}),
            },
            coverage: {
              ...base.coverage,
              ...(((storedProfile as Record<string, unknown>).coverage as object) || {}),
            },
            availability: {
              ...base.availability,
              ...(((storedProfile as Record<string, unknown>).availability as object) || {}),
            },
            docs: {
              list: Array.isArray(
                ((storedProfile as Record<string, unknown>).docs as { list?: unknown[] } | undefined)?.list
              )
                ? ((((storedProfile as Record<string, unknown>).docs as { list?: unknown[] }).list ??
                    []) as ProviderProfile['docs']['list'])
                : base.docs.list,
            },
            payout: hydratePayoutData(
              base.payout,
              (((storedProfile as Record<string, unknown>).payout as object) || {}) as Partial<
                ProviderProfile['payout']
              >
            ),
            tax: { ...base.tax, ...(((storedProfile as Record<string, unknown>).tax as object) || {}) },
            acceptance: {
              ...base.acceptance,
              ...(((storedProfile as Record<string, unknown>).acceptance as object) || {}),
            },
          });
        }
        if (nextUi) {
          setUi({
            step:
              storedUi && typeof storedUi === 'object'
                ? Number(storedUi.step || nextUi.step || 1) || 1
                : Number(nextUi.step || 1) || 1,
          });
        }
        if (nextReview && typeof nextReview === 'object') {
          const normalizedReview = { ...(nextReview as object) } as Record<string, unknown>;
          if (
            String(approvalPayload?.status || '').toLowerCase() === 'approved' &&
            !normalizedReview.approvedAt
          ) {
            normalizedReview.inReviewAt = null;
            normalizedReview.approvedAt =
              String(approvalPayload?.approvedAt || approvalPayload?.submittedAt || new Date().toISOString()) || null;
          }
          setReview((prev) => ({
            ...prev,
            ...(normalizedReview as object),
            ...(storedReview && typeof storedReview === 'object' ? (storedReview as object) : {}),
          }));
        }
      } catch {
        if (!cancelled) {
          setToast({
            tone: 'error',
            title: t('Backend sync failed'),
            message: t('We could not load your provider onboarding draft from the backend.'),
          });
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
          window.setTimeout(() => {
            saveReadyRef.current = true;
          }, 0);
        }
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, createEmptyProfile, hydrated, t]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredDraft(STORAGE.form, profile);
    writeStoredDraft(STORAGE.ui, ui);
    writeStoredDraft(STORAGE.review, review);
  }, [hydrated, profile, review, ui]);

  useEffect(() => {
    if (!hydrated || !saveReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      void sellerBackendApi
        .patchWorkflowScreenState('provider-onboarding', {
          form: profile,
          ui,
          review,
        })
        .then(() => setLastSaved(ts()))
        .catch(() => {
          setToast({
            tone: 'error',
            title: t('Autosave failed'),
            message: t('Changes are not syncing to the backend right now.'),
          });
        });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [hydrated, profile, review, t, ui]);

  const step = clamp(ui.step || 1, 1, 6);
  const setStep = (n) => setUi((p) => ({ ...p, step: clamp(Number(n) || 1, 1, 6) }));

  const isLocked = profile.status !== 'DRAFT';

  const ownerContactName = useMemo(
    () => {
      const candidate =
        sessionUser?.name ||
        sessionUser?.fullName ||
        sessionUser?.displayName ||
        sessionUser?.userId ||
        sessionUser?.email ||
        sessionUser?.phone ||
        profile.displayName ||
        '';
      return String(candidate || '');
    },
    [sessionUser, profile.displayName]
  );

  const ownerContactEmail = useMemo(
    () => String(sessionUser?.email || profile.email || sessionUser?.userId || sessionUser?.phone || ''),
    [sessionUser, profile.email]
  );

  useEffect(() => {
    if (!profile.tax?.contactSameAsOwner) return;
    const desiredContact = ownerContactName;
    const desiredEmail = ownerContactEmail;
    if (profile.tax.contact === desiredContact && profile.tax.contactEmail === desiredEmail) return;
    setF((prev) => ({
      tax: { ...prev.tax, contact: desiredContact, contactEmail: desiredEmail },
    }));
  }, [
    profile.tax?.contactSameAsOwner,
    ownerContactName,
    ownerContactEmail,
    profile.tax.contact,
    profile.tax.contactEmail,
  ]);

  // Keep owner consistent
  useEffect(() => {
    if (!activeUserId) return;
    const owner = String(profile.owner || profile.email || '').toLowerCase();
    if (owner && owner !== activeUserId) {
      clearStoredDraft([STORAGE.form, STORAGE.ui, STORAGE.review, STORAGE.legacy]);
      const fresh = createEmptyProfile();
      setProfile(fresh);
      recordOnboardingStatus(
        'provider',
        sessionUser || { userId: activeUserId || '', email: activeUserId || '' },
        'DRAFT'
      );
      setToast({
        tone: 'info',
        title: t('Switched user context'),
        message: t('We loaded a fresh draft for the current session user.'),
      });
      return;
    }
    if (!profile.owner && activeUserId) {
      setProfile((prev) => (prev.owner ? prev : { ...prev, owner: activeUserId }));
    }
  }, [activeUserId, createEmptyProfile, profile.email, profile.owner, sessionUser, t]);

  const replaceBlobUrl = (oldUrl, nextUrl) => {
    if (oldUrl && typeof oldUrl === 'string' && oldUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        // ignore
      }
    }
    return nextUrl;
  };

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const handleImagePick = useCallback(
    (field, file) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      setF((prev) => {
        if (field === 'logoUrl') return { logoUrl: replaceBlobUrl(prev.logoUrl, url) };
        if (field === 'coverUrl') return { coverUrl: replaceBlobUrl(prev.coverUrl, url) };
        return null;
      });
    },
    [setF]
  );

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'provider_onboarding.json';
    a.click();
    setToast({
      tone: 'success',
      title: t('Exported'),
      message: t('Provider onboarding JSON downloaded.'),
    });
  };

  const importRef = useRef<HTMLInputElement | null>(null);
  const importJSON = (f) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result || '{}'));
        setProfile({ ...createEmptyProfile(), ...obj });
        setToast({
          tone: 'success',
          title: t('Imported'),
          message: t('Your JSON draft has been loaded.'),
        });
      } catch {
        setToast({
          tone: 'error',
          title: t('Invalid JSON'),
          message: t('Please choose a valid JSON file.'),
        });
      }
    };
    r.readAsText(f);
  };

  const resetDraft = async () => {
    if (
      !window.confirm(
        t('Reset this onboarding draft? This clears the saved draft on this device and the backend draft for this workspace.')
      )
    )
      return;
    const fresh = createEmptyProfile();
    setProfile(fresh);
    setReview({ submittedAt: null, inReviewAt: null, approvedAt: null, slaHours: 48 });
    setStep(1);
    clearStoredDraft([STORAGE.form, STORAGE.ui, STORAGE.review, STORAGE.legacy]);
    try {
      await sellerBackendApi.patchWorkflowScreenState('provider-onboarding', {
        form: fresh,
        ui: { step: 1 },
        review: { submittedAt: null, inReviewAt: null, approvedAt: null, slaHours: 48 },
      });
    } catch {
      setToast({
        tone: 'error',
        title: t('Reset failed'),
        message: t('We could not reset the provider onboarding draft from the backend.'),
      });
      return;
    }
    recordOnboardingStatus(
      'provider',
      sessionUser || { userId: activeUserId || '', email: activeUserId || '' },
      'DRAFT'
    );
    setToast({
      tone: 'success',
      title: t('Reset complete'),
      message: t('A fresh draft has been created.'),
    });
  };

  const withdraw = async () => {
    setF({ status: 'DRAFT' });
    setReview((r) => ({ ...r, submittedAt: null, inReviewAt: null, approvedAt: null }));
    try {
      await sellerBackendApi.patchWorkflowScreenState('provider-onboarding', {
        review: { submittedAt: null, inReviewAt: null, approvedAt: null, slaHours: 48 },
      });
    } catch {
      setToast({
        tone: 'error',
        title: t('Withdraw failed'),
        message: t('We could not reopen the provider onboarding draft from the backend.'),
      });
      return;
    }
    recordOnboardingStatus(
      'provider',
      sessionUser || {
        userId: activeUserId || profile.email,
        email: activeUserId || profile.email,
      },
      'DRAFT'
    );
    setToast({
      tone: 'info',
      title: t('Withdrawn'),
      message: t('Your application is now editable again.'),
    });
  };

  const toggleInArray = <T,>(arr: T[] | undefined, val: T) => {
    const list: T[] = Array.isArray(arr) ? arr : [];
    return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
  };

  const toggleCategory = (id) => {
    if (isLocked) return;
    setF((prev) => ({ categories: toggleInArray(prev.categories, id) }));
  };

  const toggleLanguage = (code) => {
    if (isLocked) return;
    setF((prev) => {
      const cur = Array.isArray(prev.languages) ? prev.languages : [];
      const next = toggleInArray(cur, code);
      return { languages: next.length ? next : ['en'] };
    });
  };

  const toggleRegion = (code) => {
    if (isLocked) return;
    setF((prev) => {
      const cur = Array.isArray(prev.regions) ? prev.regions : [];
      const next = toggleInArray(cur, code);
      return { regions: next.length ? next : ['UG'] };
    });
  };

  const requiredDocTypes = useMemo(
    () =>
      buildRequiredProviderDocTypes({
        taxpayerType: profile.tax?.taxpayerType,
        categories: profile.categories,
        serviceLines: profile.serviceLines,
        categoryMap: serviceCategoryMap,
      }),
    [profile.tax?.taxpayerType, profile.categories, profile.serviceLines, serviceCategoryMap]
  );

  const docsStats = useMemo(() => {
    const list = Array.isArray(profile.docs?.list) ? profile.docs.list : [];

    const byType = (type) => list.filter((d) => String(d?.type || '').trim() === type);

    const reqRows = requiredDocTypes.map((type) => {
      const matches = byType(type);
      const hasValid = matches.some((d) => !isExpired(d?.expiry));
      const expSoon = matches.some((d) => isExpiringSoon(d?.expiry, 30));
      const hasExpired = matches.some((d) => isExpired(d?.expiry));
      return { type, count: matches.length, ok: hasValid, expSoon, hasExpired };
    });

    const missing = reqRows.filter((r) => !r.ok);

    return { reqRows, missing, allOk: missing.length === 0, total: list.length };
  }, [profile.docs?.list, requiredDocTypes]);

  const docTypeRows = useMemo(() => {
    const list = Array.isArray(profile.docs?.list) ? profile.docs.list : [];
    const rows = PROVIDER_DOC_TYPES.map((type) => {
      const matches = list.filter((d) => String(d?.type || '').trim() === type);
      const hasValid = matches.some((d) => !isExpired(d?.expiry));
      const expSoon = matches.some((d) => isExpiringSoon(d?.expiry, 30));
      const hasExpired = matches.some((d) => isExpired(d?.expiry));
      return {
        type,
        count: matches.length,
        ok: hasValid,
        expSoon,
        hasExpired,
        required: requiredDocTypes.includes(type),
      };
    });
    return rows.sort((a, b) => Number(b.required) - Number(a.required));
  }, [profile.docs?.list, requiredDocTypes]);

  const hasMissingRequiredDocs = useMemo(
    () => docTypeRows.some((r) => r.required && !r.ok),
    [docTypeRows]
  );

  const profileErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!String(profile.displayName || '').trim()) e.displayName = t('Required');
    if (!String(profile.legalName || '').trim()) e.legalName = t('Required');
    if (!String(profile.email || '').trim()) e.email = t('Required');
    else if (!isEmail(profile.email)) e.email = t('Invalid');
    return e;
  }, [profile.displayName, profile.legalName, profile.email, t]);

  const servicesErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!Array.isArray(profile.categories) || profile.categories.length === 0)
      e.categories = t('Required');
    if ((profile.categories || []).includes('other') && !String(profile.otherCategory || '').trim())
      e.otherCategory = t('Required');
    if (!Array.isArray(profile.serviceLines) || profile.serviceLines.length === 0)
      e.serviceLines = t('Required');
    return e;
  }, [profile.categories, profile.otherCategory, profile.serviceLines, t]);

  const coverageErrors = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!Array.isArray(profile.regions) || profile.regions.length === 0) e.regions = t('Required');
    if (String(profile.coverage?.leadTimeHours ?? '').trim() === '')
      e.leadTimeHours = t('Required');
    return e;
  }, [profile.coverage?.leadTimeHours, profile.regions, t]);

  const servicesOk = useMemo(() => {
    const catsOk = Array.isArray(profile.categories) && profile.categories.length > 0;
    const otherOk =
      !profile.categories?.includes('other') || !!String(profile.otherCategory || '').trim();
    const lines = Array.isArray(profile.serviceLines) ? profile.serviceLines : [];
    const hasLine = lines.length > 0;
    const lineOk = lines.every((l) => {
      const titleOk = !!String(l?.title || '').trim();
      const catOk = !!String(l?.category || '').trim();
      const pm = l?.pricingModel || 'quote';
      const priceOk = pm === 'quote' ? true : !!String(l?.basePrice || '').trim();
      return titleOk && catOk && priceOk;
    });
    return catsOk && otherOk && hasLine && lineOk;
  }, [profile.categories, profile.otherCategory, profile.serviceLines]);

  const coverageOk = useMemo(() => {
    const regionsOk = Array.isArray(profile.regions) && profile.regions.length > 0;
    const lead = String(profile.coverage?.leadTimeHours ?? '').trim();
    const leadOk = lead !== '';
    return regionsOk && leadOk;
  }, [profile.regions, profile.coverage?.leadTimeHours]);

  const payoutUsesAccount = (method) => ['bank_account', 'alipay', 'wechat_pay'].includes(method);
  const payoutUsesMobile = (method) => method === 'mobile_money';

  const payoutOk = useMemo(() => {
    const p: PayoutForm = profile.payout || createEmptyProfile().payout;
    const baseOk = p.currency && p.confirmDetails;
    if (!baseOk) return false;

    if (payoutUsesAccount(p.method)) {
      return (
        !!String(p.bankName || '').trim() &&
        !!String(p.accountName || '').trim() &&
        !!String(p.accountNo || '').trim()
      );
    }

    if (payoutUsesMobile(p.method)) {
      return (
        !!String(p.mobileProvider || '').trim() &&
        !!String(p.mobileNo || '').trim() &&
        !!String(p.accountName || '').trim()
      );
    }

    return !!String(p.otherMethod || '').trim() && !!String(p.otherProvider || '').trim();
  }, [profile.payout]);

  const payoutErrors = useMemo<Record<string, string>>(() => {
    const p: PayoutForm = profile.payout || createEmptyProfile().payout;
    const e: Record<string, string> = {};
    if (!p.currency) e.currency = t('Required');
    if (!p.confirmDetails) e.confirmDetails = t('Required');

    if (payoutUsesAccount(p.method)) {
      if (!String(p.accountName || '').trim()) e.accountName = t('Required');
      if (p.method === 'bank_account') {
        if (!String(p.bankName || '').trim()) e.bankName = t('Required');
        if (!String(p.accountNo || '').trim()) e.accountNo = t('Required');
      }
      if (p.method === 'alipay') {
        if (!String(p.alipayLogin || '').trim()) e.alipayLogin = t('Required');
      }
      if (p.method === 'wechat_pay') {
        if (!String(p.wechatId || '').trim()) e.wechatId = t('Required');
        if (!String(p.accountNo || '').trim()) e.accountNo = t('Required');
      }
    } else if (payoutUsesMobile(p.method)) {
      if (!String(p.accountName || '').trim()) e.accountName = t('Required');
      if (!String(p.mobileProvider || '').trim()) e.mobileProvider = t('Required');
      if (!String(p.mobileNo || '').trim()) e.mobileNo = t('Required');
    } else {
      if (!String(p.otherMethod || '').trim()) e.otherMethod = t('Required');
      if (!String(p.otherProvider || '').trim()) e.otherProvider = t('Required');
    }
    return e;
  }, [profile.payout, t]);

  const taxOk = useMemo(() => {
    const tax: TaxForm = profile.tax || createEmptyProfile().tax;
    return (
      !!String(tax.legalName || '').trim() &&
      !!String(tax.taxCountry || '').trim() &&
      !!String(tax.taxId || '').trim() &&
      (!!String(tax.contactEmail || '').trim() ? isEmail(tax.contactEmail) : false)
    );
  }, [profile.tax]);

  const taxErrors = useMemo<Record<string, string>>(() => {
    const tax: TaxForm = profile.tax || createEmptyProfile().tax;
    const e: Record<string, string> = {};
    if (!String(tax.legalName || '').trim()) e.legalName = t('Required');
    if (!String(tax.taxCountry || '').trim()) e.taxCountry = t('Required');
    if (!String(tax.taxId || '').trim()) e.taxId = t('Required');
    if (!String(tax.contactEmail || '').trim()) e.contactEmail = t('Required');
    else if (!isEmail(tax.contactEmail)) e.contactEmail = t('Invalid');
    return e;
  }, [profile.tax, t]);

  const legalOk = useMemo(() => {
    const a: AcceptanceForm = profile.acceptance || createEmptyProfile().acceptance;
    return !!a.providerTerms && !!a.servicePolicy && !!a.dataProcessing && !!a.qualityStandards;
  }, [profile.acceptance]);

  const legalErrors = useMemo<Record<string, string>>(() => {
    const a: AcceptanceForm = profile.acceptance || createEmptyProfile().acceptance;
    const e: Record<string, string> = {};
    if (!a.providerTerms) e.providerTerms = t('Required');
    if (!a.servicePolicy) e.servicePolicy = t('Required');
    if (!a.dataProcessing) e.dataProcessing = t('Required');
    if (!a.qualityStandards) e.qualityStandards = t('Required');
    return e;
  }, [profile.acceptance, t]);

  const requiredOk = useMemo(
    () => ({
      profile: Object.keys(profileErrors).length === 0,
      services: servicesOk,
      coverage: coverageOk,
      docs: docsStats.allOk,
      payout: payoutOk,
      tax: taxOk,
      legal: legalOk,
    }),
    [profileErrors, servicesOk, coverageOk, docsStats.allOk, payoutOk, taxOk, legalOk]
  );

  const taxonomySelections = useMemo<TaxonomySelection[]>(
    () => (Array.isArray(profile.categories) ? profile.categories.map((nodeId) => ({ nodeId })) : []),
    [profile.categories]
  );

  const steps = useMemo(
    () => [
      {
        n: 1,
        key: 'profile',
        title: t('Profile'),
        subtitle: t('Identity, branding and contacts'),
        ok: requiredOk.profile,
      },
      {
        n: 2,
        key: 'services',
        title: t('Services & Pricing'),
        subtitle: t('What you offer and how you charge'),
        ok: requiredOk.services,
      },
      {
        n: 3,
        key: 'coverage',
        title: t('Coverage & Availability'),
        subtitle: t('Where and when you can deliver'),
        ok: requiredOk.coverage,
      },
      {
        n: 4,
        key: 'docs',
        title: t('Compliance & Documents'),
        subtitle: t('Required documents for review'),
        ok: requiredOk.docs,
      },
      {
        n: 5,
        key: 'payout',
        title: t('Payout & Tax'),
        subtitle: t('Payout method and tax details'),
        ok: requiredOk.payout && requiredOk.tax,
      },
      {
        n: 6,
        key: 'review',
        title: t('Review & Submit'),
        subtitle: t('Confirm and submit'),
        ok: Object.values(requiredOk).every(Boolean),
      },
    ],
    [t, requiredOk]
  );

  const showProfileErrors = !!stepErrors[1];
  const showServicesErrors = !!stepErrors[2];
  const showCoverageErrors = !!stepErrors[3];
  const showDocsErrors = !!stepErrors[4];
  const showPayoutErrors = !!stepErrors[5];
  const showLegalErrors = !!stepErrors[6];

  const markStepError = useCallback((n) => setStepErrors((prev) => ({ ...prev, [n]: true })), []);

  const goStep = useCallback(
    (target) => {
      if (target <= step) {
        setStep(target);
        return;
      }
      const current = steps.find((s) => s.n === step);
      if (current && !current.ok) {
        markStepError(current.n);
        setToast({
          tone: 'error',
          title: t('Step required'),
          message: t(`Complete Step ${current.n}: ${current.title} before continuing.`),
        });
        return;
      }
      const missing = steps.find((s) => s.n < target && !s.ok);
      if (missing) {
        markStepError(missing.n);
        setToast({
          tone: 'error',
          title: t('Step required'),
          message: t(`Complete Step ${missing.n}: ${missing.title} before continuing.`),
        });
        setStep(missing.n);
        return;
      }
      setStep(target);
    },
    [setStep, setToast, step, steps, t]
  );

  const completion = useMemo(() => {
    const okCount = Object.values(requiredOk).filter(Boolean).length;
    const total = Object.keys(requiredOk).length;
    return Math.round((okCount / total) * 100);
  }, [requiredOk]);

  const applyAvailabilityPreset = (preset) => {
    if (isLocked) return;
    const nextDays = { ...profile.availability?.days };
    const setDay = (k, open, close, closed) => {
      nextDays[k] = { open, close, closed };
    };

    if (preset === 'weekdays') {
      setDay('mon', '08:00', '17:00', false);
      setDay('tue', '08:00', '17:00', false);
      setDay('wed', '08:00', '17:00', false);
      setDay('thu', '08:00', '17:00', false);
      setDay('fri', '08:00', '17:00', false);
      setDay('sat', '09:00', '14:00', true);
      setDay('sun', '09:00', '14:00', true);
    }

    if (preset === 'weekdays_weekend') {
      setDay('mon', '08:00', '17:00', false);
      setDay('tue', '08:00', '17:00', false);
      setDay('wed', '08:00', '17:00', false);
      setDay('thu', '08:00', '17:00', false);
      setDay('fri', '08:00', '17:00', false);
      setDay('sat', '09:00', '14:00', false);
      setDay('sun', '09:00', '14:00', false);
    }

    if (preset === 'always') {
      setDay('mon', '00:00', '23:59', false);
      setDay('tue', '00:00', '23:59', false);
      setDay('wed', '00:00', '23:59', false);
      setDay('thu', '00:00', '23:59', false);
      setDay('fri', '00:00', '23:59', false);
      setDay('sat', '00:00', '23:59', false);
      setDay('sun', '00:00', '23:59', false);
    }

    setF({ availability: { ...profile.availability, days: nextDays } });
    setToast({ tone: 'success', title: t('Preset applied'), message: t('Availability updated') });
  };

  // Helper function to get specific missing fields
  const getMissingFields = useCallback(() => {
    const missingFields: string[] = [];

    // Profile fields
    if (!requiredOk.profile) {
      if (!String(profile.displayName || '').trim()) missingFields.push(t('Display name'));
      if (!String(profile.legalName || '').trim()) missingFields.push(t('Legal name'));
      if (!String(profile.email || '').trim()) missingFields.push(t('Email'));
      else if (profile.email && !isEmail(profile.email))
        missingFields.push(t('Email') + ' (' + t('Invalid') + ')');
    }

    // Services fields
    if (!requiredOk.services) {
      if (!Array.isArray(profile.categories) || profile.categories.length === 0) {
        missingFields.push(t('Service Categories'));
      }
      if (profile.categories?.includes('other') && !String(profile.otherCategory || '').trim()) {
        missingFields.push(t('Other category'));
      }
      const lines = Array.isArray(profile.serviceLines) ? profile.serviceLines : [];
      if (lines.length === 0) {
        missingFields.push(t('Service Lines'));
      } else {
        lines.forEach((l, idx) => {
          if (!String(l?.title || '').trim())
            missingFields.push(t('Service title') + ` #${idx + 1}`);
          if (!String(l?.category || '').trim()) missingFields.push(t('Category') + ` #${idx + 1}`);
          const pm = l?.pricingModel || 'quote';
          if (pm !== 'quote' && !String(l?.basePrice || '').trim()) {
            const priceLabel =
              pm === 'hourly'
                ? t('Rate per hour')
                : pm === 'daily'
                  ? t('Rate per day')
                  : pm === 'fixed'
                    ? t('Fixed price')
                    : pm === 'distance'
                      ? t('Rate per km')
                      : t('Base price');
            missingFields.push(priceLabel + ` #${idx + 1}`);
          }
        });
      }
    }

    // Coverage fields
    if (!requiredOk.coverage) {
      if (!Array.isArray(profile.regions) || profile.regions.length === 0) {
        missingFields.push(t('Service Regions'));
      }
      if (String(profile.coverage?.leadTimeHours ?? '').trim() === '') {
        missingFields.push(t('Minimum lead time (hours)'));
      }
    }

    // Documents
    if (!requiredOk.docs) {
      missingFields.push(t('Compliance & Documents'));
    }

    // Payout fields
    if (!requiredOk.payout) {
      const p: PayoutForm = profile.payout || createEmptyProfile().payout;
      if (!p.currency) missingFields.push(t('Payout Currency'));
      if (!p.confirmDetails) missingFields.push(t('Payout Details Confirmation'));
      if (payoutUsesAccount(p.method)) {
        if (!String(p.bankName || '').trim()) missingFields.push(t('Bank name'));
        if (!String(p.accountName || '').trim()) missingFields.push(t('Account holder name'));
        if (!String(p.accountNo || '').trim()) missingFields.push(t('Account number / IBAN'));
      } else if (payoutUsesMobile(p.method)) {
        if (!String(p.mobileProvider || '').trim()) missingFields.push(t('Wallet provider'));
        if (!String(p.mobileNo || '').trim()) missingFields.push(t('Wallet / mobile number'));
        if (!String(p.accountName || '').trim()) missingFields.push(t('Account holder name'));
      } else {
        if (!String(p.otherMethod || '').trim()) missingFields.push(t('Payment Method'));
        if (!String(p.otherProvider || '').trim()) missingFields.push(t('Payment Provider'));
      }
    }

    // Tax fields
    if (!requiredOk.tax) {
      const tax: TaxForm = profile.tax || createEmptyProfile().tax;
      if (!String(tax.legalName || '').trim()) missingFields.push(t('Legal name'));
      if (!String(tax.taxCountry || '').trim()) missingFields.push(t('Tax Country'));
      if (!String(tax.taxId || '').trim()) missingFields.push(t('Tax ID'));
      if (String(tax.contactEmail || '').trim() && !isEmail(tax.contactEmail)) {
        missingFields.push(t('Tax Contact Email') + ' (' + t('Invalid') + ')');
      }
    }

    // Legal acceptance
    if (!requiredOk.legal) {
      const a: AcceptanceForm = profile.acceptance || createEmptyProfile().acceptance;
      if (!a.providerTerms) missingFields.push(t('Provider Terms'));
      if (!a.servicePolicy) missingFields.push(t('Service Policy'));
      if (!a.dataProcessing) missingFields.push(t('Data Processing Agreement'));
      if (!a.qualityStandards) missingFields.push(t('Quality Standards'));
    }

    return missingFields;
  }, [profile, requiredOk, t]);

  const submit = async () => {
    const blockers = {
      profile: requiredOk.profile,
      services: requiredOk.services,
      coverage: requiredOk.coverage,
      docs: requiredOk.docs,
      payout: requiredOk.payout,
      tax: requiredOk.tax,
      legal: requiredOk.legal,
    };

    if (Object.values(blockers).some((ok) => !ok)) {
      setStepErrors((prev) => ({
        ...prev,
        1: prev[1] || !requiredOk.profile,
        2: prev[2] || !requiredOk.services,
        3: prev[3] || !requiredOk.coverage,
        4: prev[4] || !requiredOk.docs,
        5: prev[5] || !requiredOk.payout || !requiredOk.tax,
        6: prev[6] || !requiredOk.legal,
      }));
      const missingFields = getMissingFields();
      setToast({
        tone: 'error',
        title: t('Complete required items'),
        message:
          missingFields.length > 0
            ? `${t('Missing required fields')}: ${missingFields.join(', ')}.`
            : `${t('Missing')}: ${Object.entries(blockers)
                .filter(([, ok]) => !ok)
                .map(([k]) => k)
                .join(', ')}. ${t('Check REQ markers and the checklist on the right.')}`,
      });
      return;
    }

    const submittedDocs = (profile.docs.list || []).map((d) => ({ ...d, status: 'Submitted' }));
    const submittedAt = new Date().toISOString();

    try {
      await Promise.all([
        sellerBackendApi.submitOnboarding({
          profileType: 'PROVIDER',
          status: 'submitted',
          owner: profile.owner,
          storeName: profile.displayName,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          about: profile.about,
          brandColor: profile.brandColor,
          logoUrl: profile.logoUrl,
          coverUrl: profile.coverUrl,
          support: profile.support,
          languages: profile.languages,
          docs: { list: submittedDocs },
          payout: profile.payout,
          tax: profile.tax,
          acceptance: {
            sellerTerms: profile.acceptance.providerTerms,
            contentPolicy: profile.acceptance.servicePolicy,
            dataProcessing: profile.acceptance.dataProcessing,
          },
          providerServices: profile.categories,
          metadata: {
            providerProfile: {
              ...profile,
              docs: { list: submittedDocs },
            },
            qualityStandards: profile.acceptance.qualityStandards,
            regions: profile.regions,
            coverage: profile.coverage,
            availability: profile.availability,
            team: profile.team,
            servicePolicies: profile.servicePolicies,
            serviceLines: profile.serviceLines,
          },
        }),
        sellerBackendApi.patchWorkflowScreenState('provider-onboarding', {
          form: {
            ...profile,
            status: 'SUBMITTED',
            docs: { list: submittedDocs },
          },
          ui,
          review: {
            ...review,
            submittedAt,
            inReviewAt: null,
            approvedAt: submittedAt,
          },
        }),
      ]);
    } catch {
      setToast({
        tone: 'error',
        title: t('Submit failed'),
        message: t('Your onboarding could not be submitted to the backend.'),
      });
      return;
    }

    setF({
      status: 'SUBMITTED',
      docs: { list: submittedDocs },
    });
    setReview((r) => ({
      ...r,
      submittedAt,
      inReviewAt: null,
      approvedAt: submittedAt,
    }));
    recordOnboardingStatus(
      'provider',
      sessionUser || {
        userId: activeUserId || profile.email,
        email: activeUserId || profile.email,
      },
      'SUBMITTED'
    );

    setToast({
      tone: 'success',
      title: t('Submitted'),
      message: t('Your onboarding is active. Please sign in again to continue.'),
    });
    await authClient.signOut(
      typeof sessionUser?.refreshToken === 'string' ? sessionUser.refreshToken : undefined,
      typeof sessionUser?.accessToken === 'string' ? sessionUser.accessToken : undefined
    );
    clearSession();
    navigate('/auth?intent=signin', { replace: true, state: { defaultTab: 'signin' } });
  };

  const asideTips = useMemo(() => {
    if (step === 1) {
      return {
        title: 'Pro tips',
        items: [
          'Use a clear display name that customers can remember.',
          'Add a logo to improve trust.',
          'If you provide onsite services, make your contact easy to reach.',
        ],
      };
    }
    if (step === 2) {
      return {
        title: 'Services and pricing',
        items: [
          'Add at least one service line with a clear title and category.',
          'Use Quote required for jobs that need site inspection or materials.',
          'Set a realistic response SLA to improve conversion.',
        ],
      };
    }
    if (step === 3) {
      return {
        title: 'Coverage and availability',
        items: [
          'Add regions and a travel radius if you offer onsite service.',
          'Set lead time so buyers know how soon you can start.',
          'Use a booking link if you already use a scheduling tool.',
        ],
      };
    }
    if (step === 4) {
      return {
        title: 'Compliance and trust',
        items: [
          'Upload clear documents with valid expiry dates.',
          'If you do electrical work, licenses and insurance speed up approval.',
          'Use the required documents panel to see what is missing.',
        ],
      };
    }
    if (step === 5) {
      return {
        title: 'Payout and tax',
        items: [
          'Double-check payout details before submitting.',
          'Use your legal name exactly as it appears on registration documents.',
          'Add a valid tax contact email for invoicing.',
        ],
      };
    }
    return {
      title: 'Final review',
      items: [
        'Confirm everything is accurate to avoid review delays.',
        'Accept provider terms, service policy, data processing and quality standards.',
        'Submit when all checklist items show OK.',
      ],
    };
  }, [step]);

  // Provider preview card text
  const providerPreview = useMemo(() => {
    const cats = (profile.categories || []).filter((x) => x !== 'other').map(formatCategoryLabel);
    const other = profile.categories?.includes('other') ? profile.otherCategory : '';
    const list = [...cats, other].filter(Boolean);
    const regions = (profile.regions || []).slice(0, 4).join(', ');
    const lines = Array.isArray(profile.serviceLines) ? profile.serviceLines : [];
    const starts = lines
      .filter((l) => (l?.pricingModel || 'quote') !== 'quote' && String(l?.basePrice || '').trim())
      .map((l) => Number(l.basePrice))
      .filter((n) => Number.isFinite(n) && n > 0);
    const min = starts.length ? Math.min(...starts) : null;
    const currency = profile.serviceCurrency || profile.payout?.currency || '';

    const bits: string[] = [];
    if (list.length) bits.push(`${t('Services')}: ${list.join(', ')}`);
    if (regions) bits.push(`${t('Regions')}: ${regions}`);
    if (min != null && currency) bits.push(`${t('From')}: ${currency} ${min}`);
    if (profile.servicePolicies?.responseSlaHours)
      bits.push(`${t('Response')}: ${profile.servicePolicies.responseSlaHours}h`);
    return bits.length
      ? bits.join(' | ')
      : t('Complete your profile to preview how buyers will see you.');
  }, [
    profile.categories,
    profile.otherCategory,
    profile.regions,
    profile.serviceLines,
    profile.serviceCurrency,
    profile.payout?.currency,
    profile.servicePolicies?.responseSlaHours,
    t,
  ]);

  const logoLetter = (profile.displayName || 'P').slice(0, 1).toUpperCase();

  return (
    <div className="onboard-shell" data-theme={resolvedMode}>
      <style>{`
        :root{ --ev-green:${BRAND.green}; --ev-orange:${BRAND.orange}; --ev-text:${BRAND.slate900}; --ev-subtle:${BRAND.slate600}; --ev-muted:${BRAND.slate500}; --ev-border:${BRAND.slate300}; }

        .onboard-shell{ min-height:100vh; padding-bottom:36px;
          background:
            radial-gradient(1100px 640px at 10% 0%, rgba(3,205,140,.18), transparent 55%),
            radial-gradient(900px 520px at 92% 8%, rgba(247,127,0,.16), transparent 55%),
            linear-gradient(180deg, ${BRAND.bg0} 0%, ${BRAND.bg1} 55%, #ffffff 100%);
          color:var(--ev-text);
        }

        .onboard-shell[data-theme="dark"]{
          --ev-text: #E5E7EB;
          --ev-subtle: #CBD5E1;
          --ev-muted: #94A3B8;
          --ev-border: rgba(148,163,184,.22);
          background:
            radial-gradient(1100px 640px at 10% 0%, rgba(3,205,140,.16), transparent 55%),
            radial-gradient(900px 520px at 92% 8%, rgba(247,127,0,.14), transparent 55%),
            linear-gradient(180deg, #07111b 0%, #070a12 55%, #05060a 100%);
        }

        .btn-primary{ background:linear-gradient(135deg,var(--ev-green), ${EV_COLORS.primaryStrong}); color:#fff; border-radius:14px; padding:8px 12px; font-weight:900; box-shadow:0 16px 40px -26px rgba(3,205,140,.65); }
        .btn-primary:disabled{ opacity:.6; cursor:not-allowed; box-shadow:none; }

        .btn-ghost{ background:rgba(255,255,255,.96); border:1px solid rgba(3,205,140,.22); border-radius:14px; padding:7px 10px; font-weight:800; color:#047857; font-size:13px; }
        .onboard-shell[data-theme="dark"] .btn-ghost{ background:rgba(15,23,42,.55); color:#bbf7d0; border-color: rgba(3,205,140,.22); }

        .btn-outline-orange{ background:transparent; border:1.5px solid var(--ev-orange); color:var(--ev-orange); border-radius:14px; padding:8px 12px; font-weight:900; }

        .input{ border:1px solid rgba(3,205,140,.18); border-radius:14px; padding:10px 14px; background:rgba(3,205,140,.03); color:inherit; }
        .onboard-shell[data-theme="dark"] .input{ background: rgba(3,205,140,.06); border-color: rgba(3,205,140,.18); }
        .input:focus{ outline:none; border-color:var(--ev-green); box-shadow:0 0 0 3px rgba(3,205,140,.16); background:rgba(255,255,255,.98); }
        .onboard-shell[data-theme="dark"] .input:focus{ background: rgba(10,12,18,.85); }
        .input-error{ border-color: rgba(239,68,68,.55) !important; box-shadow:0 0 0 3px rgba(239,68,68,.12); background:rgba(255,255,255,.98); }
        .onboard-shell[data-theme="dark"] .input-error{ background: rgba(10,12,18,.85); }

        .chip{ border-radius:9999px; padding:4px 10px; font-weight:900; font-size:11px; }
        .chip-neutral{ background:rgba(148,163,184,.18); color:var(--ev-muted); border:1px solid rgba(148,163,184,.28); }
        .chip-ok{ background:rgba(3,205,140,.18); color:#065f46; border:1px solid rgba(3,205,140,.28); }
        .chip-info{ background:rgba(37,99,235,.16); color:#1d4ed8; border:1px solid rgba(37,99,235,.22); }
        .chip-bad{ background:rgba(239,68,68,.16); color:#b91c1c; border:1px solid rgba(239,68,68,.22); }

        .chipbtn{ border-radius:9999px; padding:7px 10px; font-weight:900; font-size:12px; border:1px solid rgba(203,213,225,.7); background: rgba(255,255,255,.84); }
        .onboard-shell[data-theme="dark"] .chipbtn{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.22); }
        .chipbtn-on{ border-color: rgba(3,205,140,.55); box-shadow:0 10px 22px -18px rgba(3,205,140,.65); color: var(--ev-green); }
        .chipbtn-off{ color: var(--ev-subtle); }

        .bar{ height:8px; border-radius:9999px; background:rgba(3,205,140,.14); overflow:hidden; }
        .bar>span{ display:block; height:100%; background:linear-gradient(90deg, var(--ev-green), var(--ev-orange)); }

        .onboard-hero{ position:sticky; top:0; z-index:40; background:rgba(255,255,255,.86); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
          border-bottom:1px solid rgba(203,213,225,.65);
          box-shadow:0 24px 70px -55px rgba(15,23,42,.55);
        }
        .onboard-shell[data-theme="dark"] .onboard-hero{ background: rgba(2,6,23,.70); border-bottom-color: rgba(148,163,184,.18); }

        .hero-inner{ max-width:1180px; margin:0 auto; padding:8px 12px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
        .hero-copy{ flex:1 1 520px; display:flex; flex-direction:column; gap:6px; min-width:260px; }
        .hero-headline{ display:flex; flex-wrap:wrap; align-items:baseline; gap:10px; }
        .hero-label{ font-size:10px; letter-spacing:.26em; text-transform:uppercase; color:var(--ev-muted); font-weight:900; }
        .hero-title{ font-size:20px; font-weight:1000; color:var(--ev-text); margin:0; line-height:1; }
        .hero-sub{ font-size:12px; color:var(--ev-subtle); margin:0; max-width:none; }

        .hero-actions{ display:flex; flex-wrap:nowrap; gap:8px; align-items:center; justify-content:flex-start; flex:1 1 520px; min-width:520px; }
        .hero-metrics{ display:flex; align-items:center; gap:6px; margin:0; flex-wrap:nowrap; }
        .metric{ border-radius:14px; padding:6px 10px; background:rgba(255,255,255,.84); border:1px solid rgba(203,213,225,.65); box-shadow:0 14px 30px -28px rgba(15,23,42,.35); min-height:34px; }
        .onboard-shell[data-theme="dark"] .metric{ background: rgba(10,12,18,.75); border-color: rgba(148,163,184,.18); box-shadow:none; }
        .metric span{ font-size:8px; letter-spacing:.14em; text-transform:uppercase; color:var(--ev-muted); font-weight:900; }
        .metric strong{ display:block; margin-top:2px; font-size:14px; color:var(--ev-text); }

        .onboard-card{ border-radius:26px; border:1px solid rgba(3,205,140,.18); background:rgba(255,255,255,.90);
          box-shadow:0 34px 90px -68px rgba(15,23,42,.75);
          padding:22px;
        }
        .onboard-shell[data-theme="dark"] .onboard-card{ background: rgba(10,12,18,.78); border-color: rgba(3,205,140,.18); box-shadow:none; }

        .stepper{ display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:14px; }
        .stepbtn{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:18px; border:1px solid rgba(203,213,225,.7);
          background: rgba(255,255,255,.86); cursor:pointer; transition: transform .12s ease;
        }
        .stepbtn:hover{ transform: translateY(-1px); }
        .onboard-shell[data-theme="dark"] .stepbtn{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.18); }
        .stepdot{ width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:1000; font-size:12px; }
        .stepdot-on{ background: linear-gradient(135deg, var(--ev-green), var(--ev-orange)); color: white; }
        .stepdot-off{ background: rgba(3,205,140,.16); color: #047857; }
        .steptxt{ display:flex; flex-direction:column; min-width:0; }
        .steptxt b{ font-size:13px; font-weight:1000; color: var(--ev-text); line-height:1.1; }
        .steptxt span{ font-size:11px; color: var(--ev-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }

        .toast{ position: fixed; z-index: 9999; right: 14px; top: 14px; width: min(420px, calc(100vw - 28px));
          border-radius: 18px; padding: 12px 12px; border: 1px solid rgba(203,213,225,.7);
          background: rgba(255,255,255,.92); box-shadow: 0 22px 60px -42px rgba(15,23,42,.85);
          display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
          animation: pop .16s ease;
        }
        @keyframes pop{ from{ transform: translateY(-6px); opacity:.2 } to{ transform: translateY(0); opacity:1 } }
        .onboard-shell[data-theme="dark"] .toast{ background: rgba(10,12,18,.86); border-color: rgba(148,163,184,.18); box-shadow:none; }

        .toast-title{ display:flex; gap:10px; min-width:0; }
        .toast-icon{ width:34px; height:34px; border-radius:14px; display:flex; align-items:center; justify-content:center;
          background: rgba(3,205,140,.12); color: var(--ev-green);
        }
        .toast-head{ font-weight:1000; color: var(--ev-text); font-size:13px; }
        .toast-msg{ font-size:12px; color: var(--ev-subtle); margin-top:2px; }
        .toast-x{ border:none; background: transparent; font-weight:1000; color: var(--ev-muted); cursor:pointer; }

        .toast-success{ border-color: rgba(3,205,140,.26); }
        .toast-error{ border-color: rgba(239,68,68,.26); }
        .toast-info{ border-color: rgba(37,99,235,.22); }

        .card-mini{ border-radius:18px; border:1px solid rgba(203,213,225,.65); background: rgba(255,255,255,.88); padding:14px; }
        .onboard-shell[data-theme="dark"] .card-mini{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.18); }

        .pill{ border-radius:9999px; padding:4px 8px; font-size:11px; font-weight:900; border:1px solid rgba(3,205,140,.22); background: rgba(3,205,140,.10); color:#047857; }
        .onboard-shell[data-theme="dark"] .pill{ background: rgba(3,205,140,.12); color:#bbf7d0; }

        .docRow{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 10px; border-radius:14px; border:1px solid rgba(203,213,225,.65); background: rgba(255,255,255,.86); }
        .onboard-shell[data-theme="dark"] .docRow{ background: rgba(15,23,42,.55); border-color: rgba(148,163,184,.18); }
        .docOk{ border-color: rgba(3,205,140,.35); }
        .docMiss{ border-color: rgba(239,68,68,.28); }

        .footerNav{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }

        .avatar{ height:44px; width:44px; border-radius:16px; display:flex; align-items:center; justify-content:center; font-weight:1000; color:#fff; }
      `}</style>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="onboard-hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-headline">
              <h1 className="hero-title">{t('Bring your services to EVzone buyers')}</h1>
              <span className="hero-sub">
                {t(
                  'Complete these steps to unlock jobs, consultations, quotes, bookings, and payouts on EVzone.'
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="pill">
                {t('Status:')} <StatusChip s={profile.status} />
              </span>
              <span className="pill">
                {t('Checklist')} {completion}%
              </span>
              <span className="pill">
                {t('Services')} {(profile.serviceLines || []).length}
              </span>
              <span className="pill">
                {t('Docs')} {docsStats.total}
              </span>
            </div>
          </div>

          <div className="hero-actions">
            <div className="flex flex-wrap items-center gap-2">
              <div className="hero-metrics">
                <div className="metric">
                  <span>{t('Autosaved')}</span>
                  <strong>{lastSaved || 'N/A'}</strong>
                </div>
                <div className="metric">
                  <span>{t('Regions')}</span>
                  <strong>{(profile.regions || []).length}</strong>
                </div>
                <div className="metric">
                  <span>{t('Readiness')}</span>
                  <strong>{completion}%</strong>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="btn-ghost"
                aria-label="Language"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>

              <button type="button" onClick={resetDraft} className="btn-ghost">
                {t('Reset')}
              </button>
              {profile.status === 'SUBMITTED' ? (
                <button type="button" onClick={withdraw} className="btn-ghost">
                  {t('Withdraw')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={submit}
                className="btn-primary"
                disabled={profile.status !== 'DRAFT'}
              >
                {t('Submit')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {profile.status === 'SUBMITTED' ? (
        <div className="mx-auto mt-4 w-full max-w-none px-4">
          <div className="card-mini">
            <div className="flex items-center justify-between gap-2">
              <div className="font-black text-sm">{t('Submitted - Pending Review')}</div>
              <div className="text-xs text-[var(--ev-subtle)]">
                {t('SLA:')} <b>{review.slaHours}h</b>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
              <div className="card-mini">
                <div className="font-bold">{t('Submitted')}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.submittedAt ? new Date(review.submittedAt).toLocaleString() : 'N/A'}
                </div>
              </div>
              <div className="card-mini">
                <div className="font-bold">{t('In Review')}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.inReviewAt ? new Date(review.inReviewAt).toLocaleString() : t('Pending')}
                </div>
              </div>
              <div className="card-mini">
                <div className="font-bold">{t('Approved')}</div>
                <div className="text-[var(--ev-subtle)]">
                  {review.approvedAt ? new Date(review.approvedAt).toLocaleString() : t('Pending')}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="bar">
                <span
                  style={{
                    width: review.approvedAt
                      ? '100%'
                      : review.inReviewAt
                        ? '66%'
                        : review.submittedAt
                          ? '33%'
                          : '0%',
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-[var(--ev-subtle)]">
                {t('Timeline: Submitted -> In Review -> Approved')}
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--ev-subtle)]">
              {t('Track detailed approvals in')}{' '}
              <a href="/compliance" className="underline">
                {t('Compliance Center')}
              </a>
              .
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-none px-3 sm:px-4 py-6">
        <div className="stepper">
          {steps.map((s) => (
            <button key={s.n} type="button" className="stepbtn" onClick={() => goStep(s.n)}>
              <span className={`stepdot ${step === s.n ? 'stepdot-on' : 'stepdot-off'}`}>
                {s.n}
              </span>
              <span className="steptxt">
                <b className="truncate">{s.title}</b>
                <span className="truncate">{s.subtitle}</span>
              </span>
              <span className={`chip ${s.ok ? 'chip-ok' : 'chip-neutral'}`}>
                {s.ok ? 'OK' : 'REQ'}
              </span>
            </button>
          ))}
        </div>

        <div className="bar mb-4">
          <span style={{ width: `${completion}%` }} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-4">
            {step === 1 ? (
              <Section
                title={
                  <span>
                    {t('Profile')} <Req ok={requiredOk.profile} />
                  </span>
                }
                sub={t('Identity, branding, contact, and headquarters')}
                lastSaved={lastSaved}
                right={
                  <span className="chip chip-neutral">
                    <IconSparkles /> {t('Premium setup')}
                  </span>
                }
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <Field label={t('Provider type')} required>
                    <select
                      value={profile.providerType || 'business'}
                      onChange={(e) =>
                        setF({
                          providerType: e.target.value,
                          tax: {
                            ...profile.tax,
                            taxpayerType:
                              e.target.value === 'individual' ? 'individual' : 'business',
                          },
                        })
                      }
                      className="input w-full"
                      disabled={isLocked}
                    >
                      <option value="business">{t('Business / company')}</option>
                      <option value="individual">{t('Individual')}</option>
                    </select>
                  </Field>

                  <Field
                    label={t('Brand color')}
                    helper={t('Used for your provider page highlights')}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={profile.brandColor || BRAND.green}
                        onChange={(e) => setF({ brandColor: e.target.value })}
                        disabled={isLocked}
                        className="h-10 w-10 cursor-pointer rounded border border-gray-200 p-0"
                      />
                      <input
                        value={profile.brandColor || BRAND.green}
                        onChange={(e) => setF({ brandColor: e.target.value })}
                        className="input w-full"
                        disabled={isLocked}
                      />
                    </div>
                  </Field>

                  <Field label={t('Display name')} required error={profileErrors.displayName}>
                    <input
                      value={profile.displayName}
                      onChange={(e) => setF({ displayName: e.target.value })}
                      className={`input w-full ${showProfileErrors && profileErrors.displayName ? 'input-error' : ''}`}
                      disabled={isLocked}
                      placeholder={t('e.g. EV Tech Services')}
                    />
                  </Field>

                  <Field label={t('Legal name')} required error={profileErrors.legalName}>
                    <input
                      value={profile.legalName}
                      onChange={(e) =>
                        setF({
                          legalName: e.target.value,
                          tax: {
                            ...profile.tax,
                            legalName: e.target.value || profile.tax.legalName,
                          },
                        })
                      }
                      className={`input w-full ${showProfileErrors && profileErrors.legalName ? 'input-error' : ''}`}
                      disabled={isLocked}
                      placeholder={t('As on registration documents')}
                    />
                  </Field>

                  <Field label={t('Email')} required error={profileErrors.email}>
                    <input
                      value={profile.email}
                      onChange={(e) => setF({ email: e.target.value })}
                      className={`input w-full ${showProfileErrors && profileErrors.email ? 'input-error' : ''}`}
                      disabled={isLocked}
                      placeholder={t('you@company.com')}
                    />
                  </Field>

                  <Field
                    label={t('Phone')}
                    helper={t('Select a country code and enter the number')}
                  >
                    {(() => {
                      const phoneParts = splitPhoneNumber(profile.phone);
                      return (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Box className="w-full sm:w-44">
                            <CountryCodeAutocomplete
                              value={phoneParts.code}
                              onChange={(nextCode) =>
                                setF({ phone: combinePhoneNumber(nextCode, phoneParts.number) })
                              }
                              disabled={isLocked}
                            />
                          </Box>
                          <input
                            value={phoneParts.number}
                            onChange={(e) =>
                              setF({ phone: combinePhoneNumber(phoneParts.code, e.target.value) })
                            }
                            className="input w-full"
                            disabled={isLocked}
                            placeholder={t('700 000 000')}
                          />
                        </div>
                      );
                    })()}
                  </Field>

                  <Field label={t('Website (optional)')}>
                    <input
                      value={profile.website}
                      onChange={(e) => setF({ website: e.target.value })}
                      className="input w-full"
                      disabled={isLocked}
                      placeholder={t('https://')}
                    />
                  </Field>

                  <Field
                    label={t('Support WhatsApp (optional)')}
                    helper={t('Shown to customers as a support contact')}
                  >
                    {(() => {
                      const whatsappParts = splitPhoneNumber(profile.support?.whatsapp || '');
                      return (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Box className="w-full sm:w-44">
                            <CountryCodeAutocomplete
                              value={whatsappParts.code}
                              onChange={(nextCode) =>
                                setF({
                                  support: {
                                    ...profile.support,
                                    whatsapp: combinePhoneNumber(nextCode, whatsappParts.number),
                                  },
                                })
                              }
                              disabled={isLocked}
                            />
                          </Box>
                          <input
                            value={whatsappParts.number}
                            onChange={(e) =>
                              setF({
                                support: {
                                  ...profile.support,
                                  whatsapp: combinePhoneNumber(whatsappParts.code, e.target.value),
                                },
                              })
                            }
                            className="input w-full"
                            disabled={isLocked}
                            placeholder={t('700 000 000')}
                          />
                        </div>
                      );
                    })()}
                  </Field>

                  <div className="sm:col-span-2">
                    <Field
                      label={t('About')}
                      helper={t('A short, customer-friendly description of what you do')}
                    >
                      <textarea
                        rows={3}
                        value={profile.about}
                        onChange={(e) => setF({ about: e.target.value })}
                        className="input w-full"
                        disabled={isLocked}
                        placeholder={t(
                          'We install and maintain EV chargers, provide diagnostics, and offer training...'
                        )}
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold text-[var(--ev-subtle)]">
                          {t('Logo')}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={isLocked}
                            onClick={() => logoInputRef.current && logoInputRef.current.click()}
                          >
                            {t('Upload')}
                          </button>
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isLocked}
                            onChange={(e) => {
                              const f = e.target.files && e.target.files[0];
                              if (f) handleImagePick('logoUrl', f);
                              if (logoInputRef.current) logoInputRef.current.value = '';
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-[var(--ev-subtle)]">
                          {t('Cover (optional)')}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={isLocked}
                            onClick={() => coverInputRef.current && coverInputRef.current.click()}
                          >
                            {t('Upload')}
                          </button>
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isLocked}
                            onChange={(e) => {
                              const f = e.target.files && e.target.files[0];
                              if (f) handleImagePick('coverUrl', f);
                              if (coverInputRef.current) coverInputRef.current.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Field
                      label={t('Headquarters')}
                      helper={t('Used for compliance and customer trust')}
                    >
                      <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={profile.hq?.country || ''}
                          onChange={(e) =>
                            setF({ hq: { ...profile.hq, country: e.target.value } })
                          }
                          className="input w-full"
                          disabled={isLocked}
                          placeholder={t('Country')}
                        />
                        <input
                          value={profile.hq?.city || ''}
                          onChange={(e) =>
                            setF({ hq: { ...profile.hq, city: e.target.value } })
                          }
                          className="input w-full"
                          disabled={isLocked}
                          placeholder={t('City')}
                        />
                        <input
                          value={profile.hq?.address1 || ''}
                          onChange={(e) =>
                            setF({ hq: { ...profile.hq, address1: e.target.value } })
                          }
                          className="input w-full sm:col-span-2"
                          disabled={isLocked}
                          placeholder={t('Address line 1')}
                        />
                        <input
                          value={profile.hq?.address2 || ''}
                          onChange={(e) =>
                            setF({ hq: { ...profile.hq, address2: e.target.value } })
                          }
                          className="input w-full sm:col-span-2"
                          disabled={isLocked}
                          placeholder={t('Address line 2 (optional)')}
                        />
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="mt-4 card-mini">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-black">{t('Provider preview')}</div>
                    <span className="chip chip-neutral">{t('Preview')}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
                    <div
                      className="rounded-2xl border overflow-hidden"
                      style={{
                        borderColor: 'rgba(203,213,225,.65)',
                        background: profile.coverUrl
                          ? `url(${profile.coverUrl}) center/cover no-repeat`
                          : `linear-gradient(135deg, rgba(3,205,140,.16), rgba(247,127,0,.12))`,
                        minHeight: 120,
                      }}
                    >
                      <div
                        className="p-3 flex items-end justify-between h-full"
                        style={{ background: profile.coverUrl ? 'rgba(0,0,0,.18)' : 'transparent' }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="avatar"
                            style={{ background: profile.brandColor || BRAND.green }}
                          >
                            {profile.logoUrl ? (
                              <img
                                alt="logo"
                                src={profile.logoUrl}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{logoLetter}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-black text-sm truncate">
                              {profile.displayName || t('Your Provider')}
                            </div>
                            <div className="text-white/90 text-[11px] truncate">
                              {profile.email || t('Add email')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--ev-subtle)]">
                        {t('What buyers will see')}
                      </div>
                      <div className="text-sm font-black">
                        {profile.displayName || t('Your Provider')}
                      </div>
                      <div className="text-xs text-[var(--ev-subtle)]">{providerPreview}</div>
                      <div className="flex flex-wrap gap-2">
                        <span className="chip chip-ok">
                          {t('Brand')}: {profile.brandColor || BRAND.green}
                        </span>
                        <span className="chip chip-neutral">
                          {t('Type')}: {profile.providerType || 'business'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 2 ? (
              <Section
                title={
                  <span>
                    {t('Services & Pricing')} <Req ok={requiredOk.services} />
                  </span>
                }
                sub={t('Select categories, define service lines, and configure service policies')}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t('Services & Quotes')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('Installation, maintenance, delivery and field services.')}
                        </div>
                      </div>
                      <span className="chip chip-ok">ON</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[var(--ev-subtle)] mb-2">
                      {t('Service taxonomy')}
                    </div>
                    <div
                      style={
                        showServicesErrors && servicesErrors.categories
                          ? {
                              border: '1px solid rgba(239,68,68,.55)',
                              borderRadius: 16,
                              boxShadow: '0 0 0 3px rgba(239,68,68,.12)',
                            }
                          : undefined
                      }
                      >
                      <SellerOnboardingTaxonomyNavigator
                        selections={taxonomySelections}
                        onChange={(next) => setF({ categories: next.map((entry) => entry.nodeId) })}
                        disabled={isLocked}
                        taxonomyData={serviceTaxonomy}
                        types={{
                          marketplace: 'Service Marketplace',
                          family: 'Service Family',
                          category: 'Service Category',
                          subcategory: 'Service',
                        }}
                        labels={{
                          marketplace: t('Service marketplace'),
                          family: t('Service family'),
                          category: t('Service category'),
                          subcategory: t('Service'),
                        }}
                        copy={{
                          title: t('Tell us what you deliver'),
                          subtitle: t(
                            'Select the taxonomy paths that describe the services you plan to offer on EVzone.'
                          ),
                          treeTitle: t('Service taxonomy'),
                          searchPlaceholder: t('Search by service'),
                          quickTitle: t('Quick selection'),
                          quickSubtitle: t(
                            'Use these menus to jump directly to the service family, category, or service you want.'
                          ),
                          selectedTitle: t('Selected service path'),
                          selectedHelper: t(
                            'Add this service path to your service list if it describes what you offer.'
                          ),
                          selectedEmpty: t(
                            'Pick a service path from the tree or the menus above to add it to your list.'
                          ),
                          addButtonLabel: t('Add to service list'),
                          listTitle: t('Your service list (taxonomy coverage)'),
                          listEmpty: t(
                            'No service paths have been added yet. Add all the services that represent what you deliver.'
                          ),
                          finishTitle: t('Finish your service coverage'),
                          finishSubtitle: t(
                            'Add every service path that describes what you deliver so EVzone can route bookings and approvals correctly.'
                          ),
                          saveLabel: t('Save'),
                          saveMessageSingle: t('1 service path saved.'),
                          saveMessageMulti: t('{count} service paths saved.'),
                          selectionCountLabel: t('{count} path{suffix} selected'),
                          duplicateMessage: t('Service path already exists'),
                        }}
                      />
                    </div>

                    {showServicesErrors && servicesErrors.categories ? (
                      <div className="mt-2 text-xs font-semibold text-red-600">
                        {t('Select at least one service category.')}
                      </div>
                    ) : null}

                    {profile.categories?.includes('other') ? (
                      <div className="mt-2">
                        <Field
                          label={t('Other category')}
                          required
                          error={showServicesErrors ? servicesErrors.otherCategory : ''}
                        >
                          <input
                            value={profile.otherCategory}
                            onChange={(e) => setF({ otherCategory: e.target.value })}
                            className={`input w-full ${showServicesErrors && servicesErrors.otherCategory ? 'input-error' : ''}`}
                            disabled={isLocked}
                            placeholder={t('e.g. Renewable energy consulting')}
                          />
                        </Field>
                      </div>
                    ) : null}
                  </div>

                  <Divider />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t('Supported languages')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('Select languages you can support in chat and during service')}
                        </div>
                      </div>
                      <span className="chip chip-neutral">
                        {(profile.languages || []).length} {t('selected')}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((l) => (
                        <ChipButton
                          key={l.code}
                          active={(profile.languages || []).includes(l.code)}
                          onClick={() => toggleLanguage(l.code)}
                          disabled={isLocked}
                        >
                          {(profile.languages || []).includes(l.code) ? '✓ ' : ''}
                          {l.label}
                        </ChipButton>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={t('Default service currency')} required>
                      <select
                        value={profile.serviceCurrency || 'USD'}
                        onChange={(e) => setF({ serviceCurrency: e.target.value })}
                        className="input w-full"
                        disabled={isLocked}
                      >
                        {PAYOUT_CURRENCIES.map((cur) => (
                          <option key={cur} value={cur}>
                            {cur}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field
                      label={t('Response SLA (hours)')}
                      required
                      helper={t('How quickly you respond to new requests')}
                    >
                      <select
                        value={String(profile.servicePolicies?.responseSlaHours ?? '4')}
                        onChange={(e) =>
                          setF({
                            servicePolicies: {
                              ...profile.servicePolicies,
                              responseSlaHours: e.target.value,
                            },
                          })
                        }
                        className="input w-full"
                        disabled={isLocked}
                      >
                        {['1', '2', '4', '8', '12', '24', '48'].map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <ServiceLinesEditor
                    value={profile.serviceLines}
                    onChange={(next) => setF({ serviceLines: next })}
                    disabled={isLocked}
                    defaultCurrency={profile.serviceCurrency}
                    showErrors={showServicesErrors}
                    categoryOptions={serviceCategories}
                    categoryMap={serviceCategoryMap}
                  />

                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t('Service policies')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('These settings influence disputes and conversion')}
                        </div>
                      </div>
                      <span className="chip chip-neutral">{t('Recommended')}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label={t('Cancellation window (hours)')}
                        helper={t('Buyers can cancel within this window')}
                      >
                        <select
                          value={String(profile.servicePolicies?.cancellationWindowHours ?? '24')}
                          onChange={(e) =>
                            setF({
                              servicePolicies: {
                                ...profile.servicePolicies,
                                cancellationWindowHours: e.target.value,
                              },
                            })
                          }
                          className="input w-full"
                          disabled={isLocked}
                        >
                          {['0', '6', '12', '24', '48', '72'].map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label={t('Service warranty (days)')}
                        helper={t('Warranty on workmanship where applicable')}
                      >
                        <select
                          value={String(profile.servicePolicies?.serviceWarrantyDays ?? '30')}
                          onChange={(e) =>
                            setF({
                              servicePolicies: {
                                ...profile.servicePolicies,
                                serviceWarrantyDays: e.target.value,
                              },
                            })
                          }
                          className="input w-full"
                          disabled={isLocked}
                        >
                          {['0', '7', '14', '30', '60', '90'].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field
                        label={t('After-service support (days)')}
                        helper={t('How long you provide basic follow-up support')}
                      >
                        <select
                          value={String(profile.servicePolicies?.afterServiceSupportDays ?? '7')}
                          onChange={(e) =>
                            setF({
                              servicePolicies: {
                                ...profile.servicePolicies,
                                afterServiceSupportDays: e.target.value,
                              },
                            })
                          }
                          className="input w-full"
                          disabled={isLocked}
                        >
                          {['0', '3', '7', '14', '30'].map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label={t('Dispute notes (optional)')}>
                        <textarea
                          rows={2}
                          value={profile.servicePolicies?.disputeNotes || ''}
                          onChange={(e) =>
                            setF({
                              servicePolicies: {
                                ...profile.servicePolicies,
                                disputeNotes: e.target.value,
                              },
                            })
                          }
                          className="input w-full"
                          disabled={isLocked}
                          placeholder={t('Any rules about materials, travel fees, or conditions')}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t('Team and tools')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('Helps buyers trust your ability to deliver')}
                        </div>
                      </div>
                      <span className="chip chip-neutral">{t('Optional')}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label={t('Team size')}>
                        <select
                          value={String(profile.team?.teamSize ?? '1')}
                          onChange={(e) =>
                            setF({ team: { ...profile.team, teamSize: e.target.value } })
                          }
                          className="input w-full"
                          disabled={isLocked}
                        >
                          {['1', '2-3', '4-6', '7-10', '10+'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label={t('Years of experience')}>
                        <select
                          value={String(profile.team?.yearsExperience ?? '1')}
                          onChange={(e) =>
                            setF({ team: { ...profile.team, yearsExperience: e.target.value } })
                          }
                          className="input w-full"
                          disabled={isLocked}
                        >
                          {['0-1', '2-3', '4-6', '7-10', '10+'].map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold text-[var(--ev-subtle)]">
                          {t('Tools and capabilities')}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {TOOL_OPTIONS.map((tool) => (
                            <ChipButton
                              key={tool}
                              active={(profile.team?.tools || []).includes(tool)}
                              onClick={() => {
                                if (isLocked) return;
                                const cur = Array.isArray(profile.team?.tools)
                                  ? profile.team.tools
                                  : [];
                                const next = toggleInArray(cur, tool);
                                setF({ team: { ...profile.team, tools: next } });
                              }}
                              disabled={isLocked}
                            >
                              {(profile.team?.tools || []).includes(tool) ? '✓ ' : ''}
                              {t(tool)}
                            </ChipButton>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <Field label={t('Team notes (optional)')}>
                          <textarea
                            rows={2}
                            value={profile.team?.notes || ''}
                            onChange={(e) =>
                              setF({ team: { ...profile.team, notes: e.target.value } })
                            }
                            className="input w-full"
                            disabled={isLocked}
                            placeholder={t('Certifications, past projects, equipment list')}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 3 ? (
              <Section
                title={
                  <span>
                    {t('Coverage & Availability')} <Req ok={requiredOk.coverage} />
                  </span>
                }
                sub={t(
                  'Set your operating regions, service radius, lead time, and weekly schedule'
                )}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div
                      className="card-mini"
                      style={
                        showCoverageErrors && coverageErrors.regions
                          ? {
                              borderColor: 'rgba(239,68,68,.55)',
                              boxShadow: '0 0 0 3px rgba(239,68,68,.12)',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black">{t('Regions')}</div>
                          <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                            {t('Where you can accept jobs')}
                          </div>
                        </div>
                        <span className="chip chip-neutral">
                          {(profile.regions || []).length} {t('selected')}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        {REGION_OPTIONS.map((r) => (
                          <label key={r.code} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(profile.regions || []).includes(r.code)}
                              onChange={() => toggleRegion(r.code)}
                              disabled={isLocked}
                            />
                            {r.code}
                            <span className="text-[11px] text-[var(--ev-subtle)]">
                              {t(r.label)}
                            </span>
                          </label>
                        ))}
                      </div>
                      {showCoverageErrors && coverageErrors.regions ? (
                        <div className="mt-2 text-xs font-semibold text-red-600">
                          {t('Select at least one region.')}
                        </div>
                      ) : null}
                    </div>

                    <div className="card-mini">
                      <div className="text-sm font-black">{t('Coverage settings')}</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                          <input
                            type="checkbox"
                            checked={!!profile.coverage?.onsiteAvailable}
                            onChange={(e) =>
                              setF({
                                coverage: {
                                  ...profile.coverage,
                                  onsiteAvailable: e.target.checked,
                                },
                              })
                            }
                            disabled={isLocked}
                          />
                          {t('Onsite service')}
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                          <input
                            type="checkbox"
                            checked={!!profile.coverage?.remoteAvailable}
                            onChange={(e) =>
                              setF({
                                coverage: {
                                  ...profile.coverage,
                                  remoteAvailable: e.target.checked,
                                },
                              })
                            }
                            disabled={isLocked}
                          />
                          {t('Remote service')}
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--ev-subtle)]">
                          <input
                            type="checkbox"
                            checked={!!profile.coverage?.emergencyAvailable}
                            onChange={(e) =>
                              setF({
                                coverage: {
                                  ...profile.coverage,
                                  emergencyAvailable: e.target.checked,
                                },
                              })
                            }
                            disabled={isLocked}
                          />
                          {t('Emergency support')}
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label={t('Travel radius (km)')}>
                          <input
                            value={String(profile.coverage?.travelRadiusKm ?? '')}
                            onChange={(e) =>
                              setF({
                                coverage: { ...profile.coverage, travelRadiusKm: e.target.value },
                              })
                            }
                            className="input w-full"
                            disabled={isLocked || !profile.coverage?.onsiteAvailable}
                            placeholder={t('e.g. 50')}
                          />
                        </Field>
                        <Field
                          label={t('Lead time (hours)')}
                          required
                          error={showCoverageErrors ? coverageErrors.leadTimeHours : ''}
                        >
                          <select
                            value={String(profile.coverage?.leadTimeHours ?? '24')}
                            onChange={(e) =>
                              setF({
                                coverage: { ...profile.coverage, leadTimeHours: e.target.value },
                              })
                            }
                            className={`input w-full ${showCoverageErrors && coverageErrors.leadTimeHours ? 'input-error' : ''}`}
                            disabled={isLocked}
                          >
                            {['0', '2', '4', '8', '12', '24', '48', '72'].map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field
                      label={t('Cities / areas (optional)')}
                      helper={t('Comma-separated list of major cities you cover')}
                    >
                      <input
                        value={profile.coverage?.cities || ''}
                        onChange={(e) =>
                          setF({ coverage: { ...profile.coverage, cities: e.target.value } })
                        }
                        className="input w-full"
                        disabled={isLocked}
                        placeholder={t('Kampala, Entebbe, Jinja')}
                      />
                    </Field>

                    <Field
                      label={t('Booking link (optional)')}
                      helper={t('Paste a booking link if you use a scheduling tool')}
                    >
                      <input
                        value={profile.coverage?.bookingLink || ''}
                        onChange={(e) =>
                          setF({ coverage: { ...profile.coverage, bookingLink: e.target.value } })
                        }
                        className="input w-full"
                        disabled={isLocked}
                        placeholder={t('https://...')}
                      />
                    </Field>
                  </div>

                  <Field
                    label={t('Coverage notes (optional)')}
                    helper={t('Travel fees, availability constraints, or remote-only rules')}
                  >
                    <textarea
                      rows={2}
                      value={profile.coverage?.coverageNotes || ''}
                      onChange={(e) =>
                        setF({ coverage: { ...profile.coverage, coverageNotes: e.target.value } })
                      }
                      className="input w-full"
                      disabled={isLocked}
                    />
                  </Field>

                  <Divider />

                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-black">{t('Weekly schedule')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('Set your typical operating hours')}
                        </div>
                      </div>
                      <AvailabilityPresetBar
                        onApply={applyAvailabilityPreset}
                        disabled={isLocked}
                      />
                    </div>

                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-[#F2F2F2] text-gray-700">
                          <tr className="text-left">
                            <th className="px-3 py-2">{t('Day')}</th>
                            <th className="px-3 py-2">{t('Open')}</th>
                            <th className="px-3 py-2">{t('Close')}</th>
                            <th className="px-3 py-2">{t('Closed')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['mon', t('Mon')],
                            ['tue', t('Tue')],
                            ['wed', t('Wed')],
                            ['thu', t('Thu')],
                            ['fri', t('Fri')],
                            ['sat', t('Sat')],
                            ['sun', t('Sun')],
                          ].map(([k, label], idx) => {
                            const day = profile.availability?.days?.[k] || {
                              open: '08:00',
                              close: '17:00',
                              closed: false,
                            };
                            return (
                              <tr key={k} className={idx % 2 ? 'bg-white' : 'bg-[#fcfcfc]'}>
                                <td className="px-3 py-2 font-bold">{label}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="time"
                                    value={day.open}
                                    onChange={(e) => {
                                      const next = {
                                        ...profile.availability.days,
                                        [k]: { ...day, open: e.target.value },
                                      };
                                      setF({
                                        availability: { ...profile.availability, days: next },
                                      });
                                    }}
                                    className="input w-40"
                                    disabled={isLocked || !!day.closed}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="time"
                                    value={day.close}
                                    onChange={(e) => {
                                      const next = {
                                        ...profile.availability.days,
                                        [k]: { ...day, close: e.target.value },
                                      };
                                      setF({
                                        availability: { ...profile.availability, days: next },
                                      });
                                    }}
                                    className="input w-40"
                                    disabled={isLocked || !!day.closed}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={!!day.closed}
                                    onChange={(e) => {
                                      const next = {
                                        ...profile.availability.days,
                                        [k]: { ...day, closed: e.target.checked },
                                      };
                                      setF({
                                        availability: { ...profile.availability, days: next },
                                      });
                                    }}
                                    disabled={isLocked}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                      {t('Timezone')}: <b>{profile.availability?.timezone || 'Africa/Kampala'}</b>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 4 ? (
              <Section
                title={
                  <span>
                    {t('Compliance & Documents')} <Req ok={requiredOk.docs} />
                  </span>
                }
                sub={t('Upload required documents. Approval speed depends on document quality.')}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="card-mini">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black">{t('Documents checklist')}</div>
                        <div className="text-xs text-[var(--ev-subtle)] mt-0.5">
                          {t('All document types are listed; required items are marked REQ.')}
                        </div>
                      </div>
                      <span className={`chip ${hasMissingRequiredDocs ? 'chip-bad' : 'chip-ok'}`}>
                        {hasMissingRequiredDocs ? 'REQ' : 'OK'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {docTypeRows.map((r) => (
                        <div
                          key={r.type}
                          className={`docRow ${r.ok ? 'docOk' : r.required ? 'docMiss' : ''}`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate">{t(r.type)}</div>
                            <div className="text-[11px] text-[var(--ev-subtle)]">
                              {r.ok ? t('Uploaded') : t('Missing')}
                              {r.expSoon ? ` • ${t('Expiring soon')}` : ''}
                              {r.hasExpired ? ` • ${t('Expired')}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`chip ${r.required ? (r.ok ? 'chip-ok' : 'chip-bad') : 'chip-neutral'}`}
                            >
                              {r.required ? (r.ok ? 'OK' : 'REQ') : 'OPT'}
                            </span>
                            <span className="chip chip-neutral">{r.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {showDocsErrors && hasMissingRequiredDocs ? (
                      <div className="mt-3 text-xs font-semibold text-red-600">
                        {t('Upload all required documents marked REQ before continuing.')}
                      </div>
                    ) : null}
                  </div>

                  <DocsManager
                    docs={profile.docs?.list || []}
                    locked={isLocked}
                    docTypes={PROVIDER_DOC_TYPES}
                    requiredTypes={requiredDocTypes}
                    onAdd={(d) => setF({ docs: { list: [...(profile.docs.list || []), d] } })}
                    onUpd={(i, patch) =>
                      setF({
                        docs: {
                          list: (profile.docs.list || []).map((x, idx) =>
                            idx === i ? { ...x, ...patch } : x
                          ),
                        },
                      })
                    }
                    onDel={(i) =>
                      setF({
                        docs: {
                          list: (profile.docs.list || []).filter((_, idx) => idx !== i),
                        },
                      })
                    }
                  />

                  <div className="flex items-center gap-2 text-xs text-[var(--ev-subtle)] flex-wrap">
                    <a href="/compliance" className="underline">
                      {t('Track approvals in Compliance Center')}
                    </a>
                    <span className="text-[var(--ev-muted)]">•</span>
                    <a href="/market-panel/approvals" className="underline">
                      {t('Market Panel (Admin)')}
                    </a>
                  </div>
                </div>
              </Section>
            ) : null}

            {step === 5 ? (
              <Section
                title={
                  <span>
                    {t('Payout & Tax')} <Req ok={requiredOk.payout && requiredOk.tax} />
                  </span>
                }
                sub={t('Add payout method, currency, and tax details')}
                lastSaved={lastSaved}
              >
                <PayoutTaxStep
                  profile={profile}
                  setF={setF}
                  isLocked={isLocked}
                  ownerContactName={ownerContactName}
                  ownerContactEmail={ownerContactEmail}
                  showPayoutErrors={showPayoutErrors}
                  payoutErrors={payoutErrors}
                  taxErrors={taxErrors}
                />
              </Section>
            ) : null}

            {step === 6 ? (
              <Section
                title={
                  <span>
                    {t('Review & Submit')} <Req ok={Object.values(requiredOk).every(Boolean)} />
                  </span>
                }
                sub={t('Confirm everything before submission')}
                lastSaved={lastSaved}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t('Profile')}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(1)}>
                          {t('Edit')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t('Name')}:{' '}
                        <b className="text-[var(--ev-text)]">{profile.displayName || 'N/A'}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Email')}:{' '}
                        <b className="text-[var(--ev-text)]">{profile.email || 'N/A'}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Type')}:{' '}
                        <b className="text-[var(--ev-text)]">
                          {profile.providerType || 'business'}
                        </b>
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t('Services')}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(2)}>
                          {t('Edit')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t('Categories')}:{' '}
                        <b className="text-[var(--ev-text)]">{(profile.categories || []).length}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Service lines')}:{' '}
                        <b className="text-[var(--ev-text)]">
                          {(profile.serviceLines || []).length}
                        </b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Default currency')}:{' '}
                        <b className="text-[var(--ev-text)]">{profile.serviceCurrency || 'N/A'}</b>
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t('Coverage')}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(3)}>
                          {t('Edit')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t('Regions')}:{' '}
                        <b className="text-[var(--ev-text)]">
                          {(profile.regions || []).join(', ') || 'N/A'}
                        </b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Lead time')}:{' '}
                        <b className="text-[var(--ev-text)]">
                          {profile.coverage?.leadTimeHours ?? 'N/A'}h
                        </b>
                      </div>
                    </div>

                    <div className="card-mini">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t('Documents')}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(4)}>
                          {t('Edit')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t('Uploaded')}: <b className="text-[var(--ev-text)]">{docsStats.total}</b>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {docTypeRows.map((r) => (
                          <div
                            key={r.type}
                            className={`docRow ${r.ok ? 'docOk' : r.required ? 'docMiss' : ''}`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-black truncate">{t(r.type)}</div>
                              <div className="text-[11px] text-[var(--ev-subtle)]">
                                {r.ok ? t('OK') : t('Missing')}
                              </div>
                            </div>
                            <span
                              className={`chip ${r.required ? (r.ok ? 'chip-ok' : 'chip-bad') : 'chip-neutral'}`}
                            >
                              {r.required ? (r.ok ? 'OK' : 'REQ') : 'OPT'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card-mini md:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="font-black">{t('Payout & Tax')}</div>
                        <button type="button" className="btn-ghost" onClick={() => goStep(5)}>
                          {t('Edit')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                        {t('Payout')}:{' '}
                        <b className="text-[var(--ev-text)]">
                          {t(PAYOUT_METHOD_LABELS[profile.payout?.method] || 'N/A')}
                        </b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Currency')}:{' '}
                        <b className="text-[var(--ev-text)]">{profile.payout?.currency || 'N/A'}</b>
                      </div>
                      <div className="mt-1 text-xs text-[var(--ev-subtle)]">
                        {t('Tax ID')}:{' '}
                        <b className="text-[var(--ev-text)]">{profile.tax?.taxId || 'N/A'}</b>
                      </div>
                    </div>
                  </div>

                  <div className="card-mini">
                    <div className="text-sm font-black">{t('Agreements')}</div>
                    <div className="mt-2 space-y-2 text-sm">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!profile.acceptance?.providerTerms}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({
                              acceptance: {
                                ...profile.acceptance,
                                providerTerms: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t('I agree to the "EVzone Provider Terms" and payout terms.')}
                        </span>
                        {showLegalErrors && legalErrors.providerTerms ? (
                          <span className="text-xs font-semibold text-red-600">
                            {t('Required')}
                          </span>
                        ) : null}
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!profile.acceptance?.servicePolicy}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({
                              acceptance: {
                                ...profile.acceptance,
                                servicePolicy: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t('I agree to the "Service Quality and Cancellation Policy".')}
                        </span>
                        {showLegalErrors && legalErrors.servicePolicy ? (
                          <span className="text-xs font-semibold text-red-600">
                            {t('Required')}
                          </span>
                        ) : null}
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!profile.acceptance?.dataProcessing}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({
                              acceptance: {
                                ...profile.acceptance,
                                dataProcessing: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t(
                            'I agree to "Data Processing" for verification, fraud prevention and payouts.'
                          )}
                        </span>
                        {showLegalErrors && legalErrors.dataProcessing ? (
                          <span className="text-xs font-semibold text-red-600">
                            {t('Required')}
                          </span>
                        ) : null}
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!profile.acceptance?.qualityStandards}
                          disabled={isLocked}
                          onChange={(e) =>
                            setF({
                              acceptance: {
                                ...profile.acceptance,
                                qualityStandards: e.target.checked,
                              },
                            })
                          }
                        />
                        <span className="text-xs text-[var(--ev-subtle)]">
                          {t(
                            'I commit to "Quality Standards" (safe work, accurate quotes, and professional conduct).'
                          )}
                        </span>
                        {showLegalErrors && legalErrors.qualityStandards ? (
                          <span className="text-xs font-semibold text-red-600">
                            {t('Required')}
                          </span>
                        ) : null}
                      </label>
                    </div>

                    {showLegalErrors && !requiredOk.legal ? (
                      <div className="mt-3 text-xs font-bold text-red-600">
                        {t('All agreements must be accepted before submission.')}
                      </div>
                    ) : null}
                  </div>

                  <div className="footerNav">
                    <button type="button" className="btn-outline-orange" onClick={() => goStep(5)}>
                      {t('Back')}
                    </button>
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip ${Object.values(requiredOk).every(Boolean) ? 'chip-ok' : 'chip-bad'}`}
                      >
                        {Object.values(requiredOk).every(Boolean)
                          ? t('Ready to submit')
                          : t('Not ready')}
                      </span>
                      <button
                        type="button"
                        onClick={submit}
                        className="btn-primary"
                        disabled={profile.status !== 'DRAFT'}
                      >
                        {t('Submit')}
                      </button>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            <div className="footerNav">
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                className="btn-outline-orange"
                disabled={step === 1}
              >
                {t('Back')}
              </button>

              {step < 6 ? (
                <button type="button" onClick={() => goStep(step + 1)} className="btn-primary">
                  {t('Next')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  className="btn-primary"
                  disabled={profile.status !== 'DRAFT'}
                >
                  {t('Submit')}
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card-mini">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-black">{t('Checklist')}</div>
                <span className="chip chip-neutral">{completion}%</span>
              </div>

              <ul className="mt-3 space-y-2 text-xs">
                {steps.slice(0, 6).map((s) => (
                  <li key={`chk-${s.key}`} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="underline font-bold"
                      onClick={() => goStep(s.n)}
                    >
                      {s.title}
                    </button>
                    <Req ok={s.ok} />
                  </li>
                ))}
              </ul>

              <div className="mt-3">
                <div className="bar">
                  <span style={{ width: `${completion}%` }} />
                </div>
                <div className="mt-2 text-xs text-[var(--ev-subtle)]">
                  {t('Complete all required items to submit.')}
                </div>
              </div>
            </div>

            <div className="card-mini">
              <div className="text-sm font-black">{t(asideTips.title)}</div>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-[var(--ev-subtle)]">
                {asideTips.items.map((x, idx) => (
                  <li key={`${idx}-${x}`}>{t(x)}</li>
                ))}
              </ol>
            </div>

            <div className="card-mini">
              <div className="text-sm font-black">{t('After submission')}</div>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-xs text-[var(--ev-subtle)]">
                <li>{t('Our team reviews your profile and documents.')}</li>
                <li>{t('We may request clarifications before approval.')}</li>
                <li>{t('Once approved, quoting, bookings, and payouts unlock.')}</li>
              </ol>
              <div className="mt-3 text-xs">
                <a href="/compliance" className="underline font-bold">
                  {t('Compliance Center')}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
